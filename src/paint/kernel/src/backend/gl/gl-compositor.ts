// GLCompositor —— WebGL2 图层合成器（ai-docs/20260614-perf-webgl-memory-clip.md §3 模块 4）。
//
// 算法：ping-pong 两张直值累积器，**一层一 pass**——每 pass 全屏，shader 按 doc 坐标查 tile-index
//   采源 + 累积器 → W3C blend + source-over → 写另一张、交换。clip = 源α×基底α（无 2D dst-in）。
// S9 起本类只剩 **pass 原语**（begin/newAcc/pass/floatPass/finishAcc/end/present/warp）——
//   树递归执行器归档进 test/gl-smoke/reference-gl-compositor.ts（smoke 对拍参照），
//   生产唯一执行器 = render-tree（render-plan 驱动；T6 起与 raster-service 共享 gl-room）。
// C8 起全部 GL 状态经 Gl2Port 动词（draw spec 自带状态；sampler 单元/占位归实现体）——
//   本类零 gl.* 调用，pass 原语 = 「组 spec + 计数」。

import { COMPOSITE_VERT, compositeFragSource, compositeProgramKey } from "./blend-glsl.ts";
import type { BlendMode, SourceKind } from "./blend-glsl.ts";
import type { IndexTexture } from "./gpu-tile-pool.ts";
import type { Gl2Port, Gl2Texture, Gl2TexSource, Gl2TileArena, PooledFBO, FBOPrec } from "../../common/gl2-port.ts";

// live 描边 overlay（活动叶层叠加）：直值纹理 + doc 坐标 bbox + 不透明度/擦除/锁α/选区蒙版。
export interface OverlayDesc {
  tex: Gl2TexSource;
  opacity: number;
  erase: boolean;
  blendMode: BlendMode;   // 笔刷混合模式（overlay 合到 base 用；erase 时忽略）
  ox: number; oy: number; ow: number; oh: number;   // doc 坐标 bbox（shader 按此映射，bbox 外透明）
  lockAlpha?: boolean;    // 锁α：overlay 裁到 base 现有 alpha
  selMask?: { tex: Gl2Texture; ox: number; oy: number; ow: number; oh: number } | null;
  replace?: boolean;      // 区域 overlay（2026-09-18）：bbox 内直接替换 base（W 已含一切；opacity/erase/lockAlpha/sel 均忽略）
}
// 自由变换浮层 = GPU warp 输入：未 warp 源纹理 + 逆单应性 Hinv（doc→源单位方格）+ sampleMode。
//   在源层 z 之上 source-over α=1，忽略源层 mode/opacity（与 overlay 不同——overlay 随层）。
export interface FloatDesc {
  tex: Gl2Texture;        // 源纹理（未 warp，直值，srcW×srcH，常驻——拖动中只换 hinv）
  srcW: number; srcH: number;
  hinv: number[];         // 9，row-major，doc(x,y,1)→源 (u,v,w) 透视除
  mode: number;           // 0=nearest 1=bilinear 2=bicubic
}

// 文档背景接缝（对齐 2D compositeLayers 的 bg + board._drawCheckerboard）：
//   undefined = 透明（present 时 void 色透出）；[r,g,b,a] = 预乘纯色（doc 背景色）；"checker" = 透明棋盘。
export type Background = [number, number, number, number] | "checker";

// 可变 ping-pong 对（pass-through 组要在同一累积器上续 pass，故按引用传递）。
export interface Acc { read: PooledFBO; write: PooledFBO; }

// 棋盘背景（doc 空间，16px 格，#fff/#c8c8c8）——逐位匹配 board._drawCheckerboard。预乘不透明。
//   docPos = v_uv·docSize（与 composite frag 的层采样同约定 → 自动对齐）。
const CHECKER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_docSize;
out vec4 o;
void main(){
  vec2 d = v_uv * u_docSize;
  float c = mod(floor(d.x / 16.0) + floor(d.y / 16.0), 2.0);
  vec3 col = (c >= 1.0) ? vec3(0.784314) : vec3(1.0);   // #c8c8c8 / #ffffff
  o = vec4(col, 1.0);
}`;

// GPU warp 共用 GLSL：逐 dst 像素逆单应性 gather + 手写采样器（nearest/bilinear/bicubic），**逐位复刻
//   floating-transform 的 CPU 采样器**（golden 对拍）。WARP_FRAG（live 合成）与 WARP_BAKE_FRAG（commit 烤定，
//   输出 straight）共用，零漂移。源纹理存**直值**（typed array verbatim 上传），texelFetch 整数 texel。
export const WARP_FUNCS = `   // 2026-09-19 export：region-programs 的 liquify-warp 复用 sampleSpline（B 样条保锐核）
float cubicK(float t){
  float a = -0.5;
  float at = abs(t);
  if (at < 1.0) return (a+2.0)*at*at*at - (a+3.0)*at*at + 1.0;
  if (at < 2.0) return a*at*at*at - 5.0*a*at*at + 8.0*a*at - 4.0*a;
  return 0.0;
}
// 三次 B 样条核（mode 3 预滤波样条；逐位对齐 src/bspline.ts 的 b3）
float bsp3(float t){
  float at = abs(t);
  if (at < 1.0) return 2.0/3.0 - at*at + at*at*at*0.5;
  if (at < 2.0) { float u = 2.0 - at; return u*u*u/6.0; }
  return 0.0;
}
// mode 3：预滤波 B 样条采样。tex = 系数纹理（RGBA16F，premult、0..255 尺度、PAD=8 边距，
//   见 src/bspline.ts prefilterToSplinePlane）；size = 逻辑源尺寸。系数已 premult → 直接累加。
vec4 sampleSpline(sampler2D tex, vec2 size, float sx, float sy){
  const float PAD = 8.0;   // = BSPLINE_PAD
  int PW = int(size.x) + 16, PH = int(size.y) + 16;
  float cx = sx + PAD, cy = sy + PAD;
  int ix = int(floor(cx)), iy = int(floor(cy));
  float kx[4], ky[4];
  for (int i=0;i<4;i++){ kx[i]=bsp3(float(ix-1+i)-cx); ky[i]=bsp3(float(iy-1+i)-cy); }
  float r=0.0,g=0.0,b=0.0,a=0.0;
  float ca[16];
  for (int t=0;t<16;t++) ca[t]=0.0;
  for (int j=0;j<4;j++){
    int yy = iy-1+j; if (yy<0||yy>=PH) continue;
    for (int i=0;i<4;i++){
      int xx = ix-1+i; if (xx<0||xx>=PW) continue;
      vec4 c = texelFetch(tex, ivec2(xx,yy), 0);
      float ww = kx[i]*ky[j];
      r += c.r*ww; g += c.g*ww; b += c.b*ww; a += c.a*ww;
      ca[j*4+i] = c.a;
    }
  }
  if (a < 1.0e-4) return vec4(0.0);            // 0..255 尺度阈值（对齐 CPU）
  // 反振铃限幅（v0.6.43，user 方案 A）：源 α 在中央 2×2 整点的值 = 系数 3×3 × B3 整点权 [1,4,1]/6
  //   重建；α clamp 进 [min,max]，premult RGB 等比缩 → C=r/α 比值不动（零色偏），只杀负瓣过冲
  //   （半透明笔画旋转边缘"变深"病根）。整点采样时 a=整点值 ∈ 域内 → 恒 no-op，identity 无损保持。
  float na[4];
  for (int v=0; v<2; v++) for (int u=0; u<2; u++) {
    float acc = 0.0;
    for (int dv=-1; dv<=1; dv++) for (int du=-1; du<=1; du++) {
      acc += ca[(v+1+dv)*4 + (u+1+du)] * ((du==0?4.0:1.0)/6.0) * ((dv==0?4.0:1.0)/6.0);
    }
    na[v*2+u] = acc;
  }
  float amin = min(min(na[0],na[1]),min(na[2],na[3]));
  float amax = max(max(na[0],na[1]),max(na[2],na[3]));
  float acl = clamp(a, amin, amax);
  if (acl != a) { float sc = acl / a; r*=sc; g*=sc; b*=sc; a=acl; }
  if (a < 1.0e-4) return vec4(0.0);
  // 系数尺度：rgb=C·α(0..255·α)、a=255α → r/a = 归一直值，a/255 = 归一 alpha
  return vec4(clamp(r/a,0.0,1.0), clamp(g/a,0.0,1.0), clamp(b/a,0.0,1.0), clamp(a/255.0,0.0,1.0));
}
// 返回**直值** RGBA（与 CPU 采样器输出同：rgb 反预乘、a 钳）。sampler/size/mode 参数化 → 源与基底共用。
vec4 sampleSrc(sampler2D tex, vec2 size, int mode, float sx, float sy){
  if (mode == 3) return sampleSpline(tex, size, sx, sy);
  int W = int(size.x), H = int(size.y);
  int ix = int(floor(sx)), iy = int(floor(sy));
  if (mode == 0){                                    // nearest：越界透明
    if (ix < 0 || ix >= W || iy < 0 || iy >= H) return vec4(0.0);
    return texelFetch(tex, ivec2(ix, iy), 0);
  } else if (mode == 1){                             // bilinear：replicate-edge clamp，premult 插值
    float fx = sx - float(ix), fy = sy - float(iy);
    if (ix < -1 || ix >= W || iy < -1 || iy >= H) return vec4(0.0);
    int x0 = clamp(ix, 0, W-1), x1 = clamp(ix+1, 0, W-1);
    int y0 = clamp(iy, 0, H-1), y1 = clamp(iy+1, 0, H-1);
    vec4 c00 = texelFetch(tex, ivec2(x0,y0), 0), c10 = texelFetch(tex, ivec2(x1,y0), 0);
    vec4 c01 = texelFetch(tex, ivec2(x0,y1), 0), c11 = texelFetch(tex, ivec2(x1,y1), 0);
    float w00=(1.0-fx)*(1.0-fy), w10=fx*(1.0-fy), w01=(1.0-fx)*fy, w11=fx*fy;
    float a = c00.a*w00 + c10.a*w10 + c01.a*w01 + c11.a*w11;
    if (a < 4.0e-7) return vec4(0.0);                // CPU a<1e-4(0..255 尺) ≈ a<3.9e-7(0..1)
    vec3 pm = c00.rgb*c00.a*w00 + c10.rgb*c10.a*w10 + c01.rgb*c01.a*w01 + c11.rgb*c11.a*w11;
    return vec4(pm / a, a);
  }
  // bicubic：4×4 Catmull-Rom，越界 tap 丢弃（贡献 0），premult 累加 → 反预乘
  float kx[4], ky[4];
  for (int i=0;i<4;i++){ kx[i]=cubicK(float(ix-1+i)-sx); ky[i]=cubicK(float(iy-1+i)-sy); }
  float r=0.0,g=0.0,b=0.0,a=0.0;
  for (int j=0;j<4;j++){
    int yy = iy-1+j; if (yy<0||yy>=H) continue;
    for (int i=0;i<4;i++){
      int xx = ix-1+i; if (xx<0||xx>=W) continue;
      vec4 c = texelFetch(tex, ivec2(xx,yy), 0);
      float av = c.a, ww = kx[i]*ky[j];
      r += c.r*av*ww; g += c.g*av*ww; b += c.b*av*ww; a += av*ww;
    }
  }
  // 反振铃限幅（v0.6.43，user 方案 A）：α clamp 进中央 2×2 texel [min,max]（越界=0），
  //   premult RGB 等比缩 → 零色偏，只杀 Catmull-Rom 负瓣过冲。
  float n00 = (ix  >=0&&ix  <W&&iy  >=0&&iy  <H) ? texelFetch(tex, ivec2(ix,  iy  ), 0).a : 0.0;
  float n10 = (ix+1>=0&&ix+1<W&&iy  >=0&&iy  <H) ? texelFetch(tex, ivec2(ix+1,iy  ), 0).a : 0.0;
  float n01 = (ix  >=0&&ix  <W&&iy+1>=0&&iy+1<H) ? texelFetch(tex, ivec2(ix,  iy+1), 0).a : 0.0;
  float n11 = (ix+1>=0&&ix+1<W&&iy+1>=0&&iy+1<H) ? texelFetch(tex, ivec2(ix+1,iy+1), 0).a : 0.0;
  float acl = clamp(a, min(min(n00,n10),min(n01,n11)), max(max(n00,n10),max(n01,n11)));
  if (acl != a && a > 4.0e-7) { float sc = acl / a; r*=sc; g*=sc; b*=sc; a=acl; }
  float aOut = clamp(a, 0.0, 1.0);
  if (a < 4.0e-7) return vec4(0.0);
  return vec4(clamp(r/a,0.0,1.0), clamp(g/a,0.0,1.0), clamp(b/a,0.0,1.0), aOut);
}
// doc 像素 → 某浮层源 (u,v)，落 [0,1]² 采样直值，否则透明（quad 外）。
// u*size 是 edge 约定（texel i 占 [i,i+1)）：nearest 的 floor(sx) 天然吻合；bilinear/bicubic 内核
// 按 center 约定（texel 中心在整数）插值 → 喂 sx-0.5，否则 identity 时 fx=0.5 = 半 texel 相位错
// （lift 一瞬间就糊 + 0.5px 左上移的根因）。修后 identity/整数平移下三种模式都逐 texel 精确。
vec4 warpSample(sampler2D tex, vec2 size, mat3 hinv, int mode, vec2 docXY){
  vec3 uvw = hinv * vec3(docXY, 1.0);
  if (abs(uvw.z) < 1.0e-9) return vec4(0.0);
  float u = uvw.x / uvw.z, v = uvw.y / uvw.z;
  if (u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0) return vec4(0.0);
  float off = (mode == 0) ? 0.0 : 0.5;
  return sampleSrc(tex, size, mode, u * size.x - off, v * size.y - off);
}`;

// live 浮层 pass（合成到累积器）。clip 浮层裁到基底浮层 warp 后 alpha（in-shader gather，ai-docs/20260628-transform-clip-gpu-warp.md）。
const WARP_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_docSize;
uniform sampler2D u_dst;        // 累积器（预乘）
uniform sampler2D u_src;        // 源纹理（未 warp，直值），尺寸 u_srcSize
uniform vec2 u_srcSize;
uniform mat3 u_Hinv;            // doc(x,y,1) → 源单位方格（row-major，实现体自转置）
uniform int u_mode;            // 0=nearest 1=bilinear 2=bicubic
uniform int u_clip;            // 1=裁到基底浮层
uniform sampler2D u_baseTex;   // 基底浮层源纹理（已驻留）
uniform vec2 u_baseSize;
uniform mat3 u_baseHinv;
uniform int u_baseMode;
out vec4 o;
${WARP_FUNCS}
void main(){
  vec4 dst = texture(u_dst, v_uv);                   // 直值 (Cd, ad)（S7：累积器 straight）
  vec2 docXY = v_uv * u_docSize;                     // dst 像素中心（fragment 中心 → +0.5 自带）
  vec4 s = warpSample(u_src, u_srcSize, u_Hinv, u_mode, docXY);   // 直值
  if (u_clip == 1 && s.a > 0.0){                     // 裁到基底浮层 warp 后 alpha（clip 链共基底也对）
    // 早退：s.a==0（quad 外/透明）时 s.a*=baseA 恒 0，无须算基底 16-tap bicubic gather（perf-optimization-backlog §3）。
    float baseA = warpSample(u_baseTex, u_baseSize, u_baseHinv, u_baseMode, docXY).a;
    s.a *= baseA;
  }
  float ao = s.a + dst.a * (1.0 - s.a);              // source-over（直值存储：预乘空间合成后归一）
  vec3 Po = s.rgb * s.a + dst.rgb * dst.a * (1.0 - s.a);
  o = vec4((ao > 0.0) ? (Po / ao) : vec3(0.0), ao);
}`;

// commit 烤定：warp 源 → **straight** RGBA 进 bbox FBO（readback→字节→editRegion）。FBO 像素 → doc 坐标
//   = bakeOrigin + v_uv·bakeSize；无 clip（commit 烤回各层不裁，clip 在 commit 后正常合成里复活）。
const WARP_BAKE_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec2 u_bakeOrigin;     // bbox 左上 doc 坐标 (bx,by)
uniform vec2 u_bakeSize;       // bbox 尺寸 (bw,bh)
uniform sampler2D u_src;
uniform vec2 u_srcSize;
uniform mat3 u_Hinv;
uniform int u_mode;
out vec4 o;
${WARP_FUNCS}
void main(){
  o = warpSample(u_src, u_srcSize, u_Hinv, u_mode, u_bakeOrigin + v_uv * u_bakeSize);   // 直值（不预乘、不合成）
}`;

// 透明显示模式（v0.10.5，Procreate 式）：透明不画棋盘，present 时 doc 以真透明叠在
//   「主题底色 + 屏幕空间点网格」上（点网格钉在屏幕坐标 → 拖动画布时内容滑过静止的点，
//   透明区一眼可辨）。参数由 board 从 CSS 主题变量（--void / --void-dot）+ dpr 算好递入。
export interface ScreenGridBg {
  bg: [number, number, number];    // 底色（= 主题 void 色，doc 内外无缝）
  dot: [number, number, number];   // 点色（微不可见的低对比）
  stepPx: number;                  // 点距（device px）
  radiusPx: number;                // 点半径（device px）
}

// 整屏底 pass：主题底色 + 点网格（gl_FragCoord = device px → 屏幕空间，pan/zoom 不动）。
const SCREEN_BG_FRAG = `#version 300 es
precision highp float;
uniform vec3 u_bgColor;
uniform vec3 u_dotColor;
uniform float u_dotStep;      // device px
uniform float u_dotRadius;    // device px
out vec4 o;
void main(){
  vec2 p = mod(gl_FragCoord.xy, u_dotStep) - 0.5 * u_dotStep;
  float m = 1.0 - smoothstep(u_dotRadius - 0.75, u_dotRadius + 0.75, length(p));
  o = vec4(mix(u_bgColor, u_dotColor, m), 1.0);
}`;

// present 的叠加变体：源（直值累积器）预乘输出，配 premult-over blend 叠到已画好的屏幕底上
//   （透明显示模式的 doc 四边形；朝向由 PRESENT_AFFINE_VERT 顶点处理，无 flip/unpremult 参数）。
const PRESENT_OVER_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
out vec4 o;
void main(){
  vec4 p = texture(u_src, v_uv);
  o = vec4(p.rgb * p.a, p.a);
}`;

const PRESENT_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_src;
uniform int u_flipY;        // 屏显=1（clip y+1=画布顶=accum v=N-1=doc 底 → 需翻）；FBO readback=0
uniform int u_unpremult;    // 1=源是预乘（stamp 栅格器中间 FBO）→ 解预乘；0=源已直值（累积器，S7 起）
out vec4 o;
void main(){
  vec2 uv = (u_flipY == 1) ? vec2(v_uv.x, 1.0 - v_uv.y) : v_uv;
  vec4 p = texture(u_src, uv);
  vec3 c = (u_unpremult == 1 && p.a > 0.0) ? (p.rgb / p.a) : p.rgb;
  o = vec4(c, p.a);
}`;

// 视口感知 present 的顶点：doc px → device px（board 的 _applyDocTransform 同一仿射）→ clip。
//   clip.y = 1 - 2·py/ch（device-py 下增 → clip-y 上增）自带朝向：a_pos.y=0=doc 顶=texture v0=doc 顶数据 → 屏顶。
const PRESENT_AFFINE_VERT = `#version 300 es
layout(location=0) in vec2 a_pos;        // [0,1]²
uniform vec2 u_docSize;
uniform mat3 u_affine;                    // doc px → device px（row-major，实现体自转置）
uniform vec2 u_canvas;                    // device px 画布尺寸
out vec2 v_uv;
void main(){
  v_uv = a_pos;
  vec3 dev = u_affine * vec3(a_pos * u_docSize, 1.0);
  gl_Position = vec4(2.0 * dev.x / u_canvas.x - 1.0, 1.0 - 2.0 * dev.y / u_canvas.y, 0.0, 1.0);
}`;

export class GLCompositor {
  private _glctx: Gl2Port;
  private _prec: FBOPrec;
  // 性能计数（dev HUD 用，零成本——只在 pass/floatPass 自增整数）。composite() 入口清零，调用方读 stats。
  //   passes = blend pass 数（≈ 可见层/组单元数，§2 layer-count 假说的直读量）；floatPasses = 浮层 warp pass 数。
  readonly stats = { passes: 0, floatPasses: 0 };
  constructor(glctx: Gl2Port, accumPrec: FBOPrec = "u8") {
    this._glctx = glctx;
    this._prec = accumPrec;
  }

  private _ensureProgram(mode: BlendMode, src: SourceKind, overlayMode: BlendMode = "source-over"): string {
    const key = compositeProgramKey(mode, src, overlayMode);
    this._glctx.program(key, COMPOSITE_VERT, compositeFragSource(mode, src, overlayMode));
    return key;
  }

  // ---- 执行器原语（render-tree / raster-service / 对拍 harness 驱动） ----

  // 帧作用域：C8 起 GL 状态归 draw spec（每 draw 自带），begin/end 只剩 stats 语义。
  begin(_docW: number, _docH: number, resetStats = true): void {
    if (resetStats) { this.stats.passes = 0; this.stats.floatPasses = 0; }
  }
  end(): void { /* 状态还原归 Gl2Port draw；保留成对调用点位 */ }

  // 借一对累积器并铺底（bg 缺省=透明；"checker"=棋盘）。
  newAcc(docW: number, docH: number, bg?: Background): Acc {
    const acc: Acc = {
      read: this._glctx.borrowFBO(docW, docH, this._prec),
      write: this._glctx.borrowFBO(docW, docH, this._prec),
    };
    if (bg === "checker") this._drawChecker(acc.read, docW, docH);
    else this._glctx.clearFBO(acc.read, bg ?? [0, 0, 0, 0]);
    return acc;
  }
  // 收口：还 write，交出 read（caller 负责 returnFBO(read)）。
  finishAcc(acc: Acc): PooledFBO {
    this._glctx.returnFBO(acc.write);
    return acc.read;
  }

  // FBO 归还公共透传（执行器/对拍 harness 归还 finishAcc / 隔离组结果用）。
  returnFBO(f: PooledFBO): void { this._glctx.returnFBO(f); }

  // 棋盘背景 pass → 填进累积器（doc 空间）。
  private _drawChecker(f: PooledFBO, docW: number, docH: number): void {
    this._glctx.program("checker", COMPOSITE_VERT, CHECKER_FRAG);
    this._glctx.draw({
      program: "checker", target: f,
      uniforms: { u_docSize: [docW, docH] },
    });
  }

  // 一个 blend pass：src(tiled 叶或段 / group 直值纹理) 与 acc.read 合 → acc.write，交换。
  pass(
    arena: Gl2TileArena, srcKind: SourceKind,
    srcIndex: IndexTexture | null, groupTex: Gl2TexSource | null,
    mode: BlendMode, opacity: number, clipIndex: IndexTexture | null,
    acc: Acc, docW: number, docH: number, overlay: OverlayDesc | null = null,
    clipTex: Gl2TexSource | null = null,   // 非空 = clip 蒙版改采这张 doc 尺寸 2D 纹理（live 中的 merged 基底）
  ): void {
    this.stats.passes++;
    const key = this._ensureProgram(mode, srcKind, overlay && !overlay.erase ? overlay.blendMode : "source-over");
    const sel = overlay?.selMask ?? null;
    const textures: NonNullable<Parameters<Gl2Port["draw"]>[0]["textures"]> = {
      u_arr: arena,
      u_dst: acc.read,
    };
    if (srcIndex) textures.u_srcIndex = srcIndex.tex;
    const ci = clipIndex ?? srcIndex;
    if (ci) textures.u_clipIndex = ci.tex;
    if (groupTex) textures.u_groupSrc = groupTex;
    if (overlay) textures.u_overlay = overlay.tex;
    if (sel) textures.u_ovSel = sel.tex;
    if (clipTex) textures.u_clipTex = clipTex;
    this._glctx.draw({
      program: key, target: acc.write,
      uniforms: {
        u_docSize: [docW, docH],
        u_opacity: opacity,
        u_hasClip: (clipIndex || clipTex) ? 1 : 0,
        u_clipMode: clipTex ? 1 : 0,
        u_overlayOpacity: overlay ? overlay.opacity : 1,
        u_overlayErase: overlay && overlay.erase ? 1 : 0,
        u_ovOrigin: [overlay ? overlay.ox : 0, overlay ? overlay.oy : 0],
        u_ovSize: [overlay ? overlay.ow : 1, overlay ? overlay.oh : 1],
        u_ovLockAlpha: overlay && overlay.lockAlpha ? 1 : 0,
        u_ovReplace: overlay && overlay.replace ? 1 : 0,
        u_ovHasSel: sel ? 1 : 0,
        u_ovSelOrigin: [sel ? sel.ox : 0, sel ? sel.oy : 0],
        u_ovSelSize: [sel ? sel.ow : 1, sel ? sel.oh : 1],
      },
      textures,
    });
    const tmp = acc.read; acc.read = acc.write; acc.write = tmp;   // 交换
  }

  // 浮层 pass = GPU warp（gather）：源纹理 + Hinv → 逐 dst 像素逆映射采样 → source-over α=1 → acc.write，交换。
  //   全屏 quad（按 doc 像素 gather，剔除 quad 外）；blend 关、预乘 source-over 在 fragment 手算。
  //   clipBase 非空（组变换里 clip 浮层的基底浮层）→ shader 里 clipα ×= gather 基底 alpha（零额外内存）。
  floatPass(f: FloatDesc, acc: Acc, docW: number, docH: number, clipBase: FloatDesc | null = null): void {
    this.stats.floatPasses++;
    this._glctx.program("warp", COMPOSITE_VERT, WARP_FRAG);
    const uniforms: NonNullable<Parameters<Gl2Port["draw"]>[0]["uniforms"]> = {
      u_docSize: [docW, docH],
      u_srcSize: [f.srcW, f.srcH],
      u_Hinv: f.hinv,
      u_mode: f.mode,
      u_clip: clipBase ? 1 : 0,
    };
    if (clipBase) {
      uniforms.u_baseSize = [clipBase.srcW, clipBase.srcH];
      uniforms.u_baseHinv = clipBase.hinv;
      uniforms.u_baseMode = clipBase.mode;
    }
    const textures: NonNullable<Parameters<Gl2Port["draw"]>[0]["textures"]> = {
      u_dst: acc.read,
      u_src: f.tex,
    };
    if (clipBase) textures.u_baseTex = clipBase.tex;
    this._glctx.draw({ program: "warp", target: acc.write, uniforms, textures });
    const tmp = acc.read; acc.read = acc.write; acc.write = tmp;
  }

  // 任意纹理 → 直值 RGBA8 目标 FBO（不翻 Y）。unpremult=true 时源按预乘解（stamp 栅格器中间 FBO 用）；
  //   累积器（S7 起直值）传 false = 纯拷贝。
  presentTo(srcTex: Gl2TexSource, target: PooledFBO, w: number, h: number, unpremult = false): void {
    this._glctx.program("present", COMPOSITE_VERT, PRESENT_FRAG);
    this._glctx.draw({
      program: "present", target,
      viewport: [0, 0, w, h],
      uniforms: { u_flipY: 0, u_unpremult: unpremult ? 1 : 0 },
      textures: { u_src: srcTex },
    });
  }

  // 视口感知 present：用 board 的 device-px 仿射把 doc 纹理摆到屏幕（pan/zoom/rot/dpr 一致）。
  // affine = [a,b,c,d,e,f]（board _applyDocTransform 的 setTransform 参数）；canvasW/H = device px。
  // smooth = 缩小(scale<1)用 LINEAR 抗锯齿；放大(scale>1)用 NEAREST 看像素（对齐 2D board imageSmoothing 策略）。
  // clearColor 非空 = 先清整画布（render-tree 的 void 底色）；doc 之外的画布区不被本 draw 覆盖。
  // over = 透明显示模式：doc 预乘输出 + premult-over blend 叠到已画好的屏幕底（drawScreenBg）上，不 clear。
  //   ⚠已知小账：累积器是直值存储，scale<1 的 LINEAR 采样在描边边缘会向透明 texel 的 rgb=0 略偏
  //   （缩小视图下极淡的暗边；不透明底模式无此项）。真机验收盯一眼，重了再上预乘中间面。
  presentToScreenAffine(srcTex: Gl2TexSource, docW: number, docH: number, affine: number[], canvasW: number, canvasH: number, smooth = true, clearColor: [number, number, number, number] | null = null, over = false): void {
    const prog = over ? "present-affine-over" : "present-affine";
    this._glctx.program(prog, PRESENT_AFFINE_VERT, over ? PRESENT_OVER_FRAG : PRESENT_FRAG);
    const [a, b, c, d, e, f] = affine;
    const uniforms: NonNullable<Parameters<Gl2Port["draw"]>[0]["uniforms"]> = {
      u_docSize: [docW, docH],
      u_canvas: [canvasW, canvasH],
      // setTransform 6 参 [[a,c,e],[b,d,f],[0,0,1]] 的 row-major 排布（契约：mat3 一律 row-major）。
      u_affine: [a, c, e, b, d, f, 0, 0, 1],
    };
    if (!over) { uniforms.u_flipY = 0; uniforms.u_unpremult = 0; }   // 朝向由顶点 clip-y 处理
    this._glctx.draw({
      program: prog,
      target: "screen",
      viewport: [0, 0, canvasW, canvasH],
      clear: over ? undefined : (clearColor ?? undefined),
      blend: over ? "premult-over" : undefined,
      uniforms,
      textures: { u_src: { src: srcTex, filter: smooth ? "linear" : "nearest" } },
    });
  }

  // 透明显示模式的整屏底：主题底色 + 屏幕空间点网格（present doc 之前画，代替 void clear）。
  drawScreenBg(grid: ScreenGridBg, canvasW: number, canvasH: number): void {
    this._glctx.program("screen-bg", COMPOSITE_VERT, SCREEN_BG_FRAG);
    this._glctx.draw({
      program: "screen-bg",
      target: "screen",
      viewport: [0, 0, canvasW, canvasH],
      uniforms: { u_bgColor: grid.bg, u_dotColor: grid.dot, u_dotStep: grid.stepPx, u_dotRadius: grid.radiusPx },
    });
  }

  // commit 烤定（产品路径 v0.6.38）：warp 源 → **straight** RGBA bbox FBO → readback 直接返回**字节**
  //   （floating-transform._bakeDown 用 typed-array source-over 落层——零 canvas premult 往返）。
  //   复用 live 同一套 warp 采样器 = preview/commit 零漂移。源纹理临时上传（commit 一次性，可忽略）。
  //   mode 3（spline）源 = 系数平面（Float32Array，PAD 边距）→ RGBA16F；u8 平面（源字节/EPX 放大）→ u8。
  warpToBytes(srcCanvas: { data: Float32Array; w: number; h: number } | { data: Uint8ClampedArray; w: number; h: number }, srcW: number, srcH: number, hinv: number[], mode: number, bx: number, by: number, bw: number, bh: number): { data: Uint8ClampedArray; w: number; h: number; dstX: number; dstY: number } | null {
    if (bw <= 0 || bh <= 0) return null;
    const port = this._glctx;
    const tex = port.createTexture();
    // 只收 typed-array 平面（v0.6.38 审计锁死：canvas 源 texImage2D 的 UNPACK_PREMULTIPLY 转换
    // 在 Safari 不可靠 = 柔边黑边根源，该分支已整树拔除，别加回来）。
    if (srcCanvas.data instanceof Float32Array) {
      const p = srcCanvas as { data: Float32Array; w: number; h: number };
      port.uploadTexture(tex, "rgba16f", p.w + 16, p.h + 16, p.data);
    } else {
      // u8 直值平面（源字节 / rotsprite EPX 放大；srcW/srcH 与平面尺寸一致由调用方保证）
      const p = srcCanvas as { data: Uint8ClampedArray; w: number; h: number };
      port.uploadTexture(tex, "rgba8", p.w, p.h, p.data);
    }
    const fbo = port.borrowFBO(bw, bh, "u8");
    port.program("warpbake", COMPOSITE_VERT, WARP_BAKE_FRAG);
    port.draw({
      program: "warpbake", target: fbo,
      uniforms: {
        u_bakeOrigin: [bx, by], u_bakeSize: [bw, bh],
        u_srcSize: [srcW, srcH], u_Hinv: hinv, u_mode: mode,
      },
      textures: { u_src: tex },
    });
    const px = port.readPixels(fbo, 0, 0, bw, bh);
    port.returnFBO(fbo);
    port.deleteTexture(tex);
    return { data: new Uint8ClampedArray(px.buffer), w: bw, h: bh, dstX: bx, dstY: by };
  }
}

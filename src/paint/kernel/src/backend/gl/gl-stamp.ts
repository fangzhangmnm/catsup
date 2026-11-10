// GLStampRasterizer —— GPU 栅格化一条 stroke 的 stamp 列表（Stage 3：「改成 webgl」primary）。
//
// 切法（手感红线安全）：CPU 仍出 stamp 列表（brush.ts 的 _walkStamps 间距 + _stampParams 压感/taper，
//   手感数学一字不动）；本模块只接管**逐像素 falloff + buildup/wash 累积** → 一张 bbox 预乘 RGBA 纹理
//   （= live overlay / commit 的源）。falloff/累积逐位匹配 brush.ts（_getStamp:221 / _washMaxInto:867 /
//   _buildupOverInto:802），golden 对拍现 CPU 笔刷。
//
// 累积模型（与 CPU 对齐）：
//   - dab α = stampAlpha × shapeA；shapeA = falloff(dist)。
//   - Wash（Alpha-Darken）：accum.a = max(accum.a, dabA)（max-alpha blend）→ 末了上色 = premult(color, a)。
//   - Build-Up（source-over）：accum = premult(color, dabA) over（premult-over blend）。
//   - Π-outer 的 user.opacity **不在这里**（commit/overlay 时一次性乘，对齐 brush.ts:24-26）。
//
// 椭圆 stamp：fragment 对 doc 偏移做旋转(-rotation)+1/aspect 逆变换再算 dist（逐位匹配 _washMaxInto:838-856）；
//   圆形 = aspect=1/rotation=0 的退化（同一路径）。quad 用 radius·max(1,aspect) 外接盒 over-cover，frag discard 出界。
//
// C8：GL 状态/VAO/draw 全走 Gl2Port 动词（drawInstanced 契约 = loc0 单位 quad + loc1 vec4/实例）；
//   本类只剩 shader 源 + 实例打包 + 两个 draw spec。

import type { Gl2Port, PooledFBO } from "../../common/gl2-port.ts";

// 一个 stamp：doc 坐标中心 + 直径 + 该 dab 的 α（= _stampParams.stampAlpha）。
export interface Stamp { x: number; y: number; size: number; alpha: number; }

export interface StrokeShape {
  hardness: number;                  // 0..0.999（硬芯比例）
  color: [number, number, number];   // 0..1（线性前的 sRGB 字节/255；与 CPU 同域）
  buildup: boolean;                   // true=Build-Up(source-over) / false=Wash(max)
  aspect?: number;                    // 椭圆纵横比（默认 1=圆）
  rotation?: number;                  // 椭圆旋转弧度（默认 0）
}

// 累积 stamp 的顶点 shader（**instanced**：整条 stroke 一次 drawArraysInstanced，替逐 stamp 一 draw call）。
//   loc0 = 单位 quad（每实例共用）；loc1 = 每 stamp 实例属性 (cx,cy,radius,alpha)，divisor=1。
const ACCUM_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_quad;        // [0,1]²（per-vertex）
layout(location=1) in vec4 a_inst;        // (cx, cy, radius, alpha)（per-instance）
uniform vec2 u_bboxOrigin;                // bbox 左上 doc 坐标
uniform vec2 u_bboxSize;                  // bbox 像素尺寸
uniform float u_aspect;                   // 椭圆纵横比（1=圆）
out vec2 v_local;                         // 相对中心像素偏移（doc 轴对齐）
out float v_radius;                       // 该 stamp 半径（size/2）
out float v_alpha;                        // 该 dab 的 α
void main() {
  float radius = a_inst.z;
  float rext = radius * max(1.0, u_aspect);        // 椭圆外接盒半边（over-cover，frag discard 出界）
  vec2 corner = (a_quad * 2.0 - 1.0) * rext;       // [-rext,rext]²
  vec2 docPos = a_inst.xy + corner;
  v_local = corner; v_radius = radius; v_alpha = a_inst.w;
  vec2 uv = (docPos - u_bboxOrigin) / u_bboxSize;  // 0..1 in bbox
  gl_Position = vec4(uv * 2.0 - 1.0, 0.0, 1.0);    // bbox 左上=clip(-1,1)（present 时 y 由 caller 约定）
}`;

// falloff（逐位匹配 brush.ts:217-221 / 862-867）+ 输出该 dab 贡献。
// Wash：frag 出 (0,0,0,dabA)，外部 MAX blend。Build-Up：出 premult(color,dabA)，外部 over blend。
//   实例顺序 = stamp 顺序（gl_InstanceID 单调）→ build-up source-over 累积次序与逐 draw call 逐位等价。
const ACCUM_FRAG = `#version 300 es
precision highp float;
in vec2 v_local;
in float v_radius;            // 该 stamp 半径
in float v_alpha;             // 该 dab 的 α（0..1）
uniform float u_hardness;     // 0..0.999
uniform vec3 u_color;         // 0..1
uniform bool u_buildup;
uniform float u_aspect;       // 椭圆纵横比（1=圆）
uniform float u_rotation;     // 椭圆旋转弧度（0=不旋）
out vec4 o;
void main() {
  // 旋转(-rotation)+1/aspect 逆变换（匹配 _washMaxInto:854-856）；圆=退化(c=1,s=0,ia=1)。
  float c = cos(u_rotation), s = sin(u_rotation);
  float ia = 1.0 / max(0.01, u_aspect);
  float dxR = c * v_local.x + s * v_local.y;
  float dyR = (-s * v_local.x + c * v_local.y) * ia;
  float dist = length(vec2(dxR, dyR));
  float innerR = u_hardness * v_radius;
  float decayLen = v_radius - innerR;
  float shapeA;
  if (dist >= v_radius) { discard; }
  if (decayLen <= 0.0 || dist <= innerR) shapeA = 1.0;
  else { float u = (dist - innerR) / decayLen; shapeA = 1.0 - u*u*(3.0 - 2.0*u); }
  float dabA = v_alpha * shapeA;
  if (u_buildup) o = vec4(u_color * dabA, dabA);   // premult, over
  else           o = vec4(0.0, 0.0, 0.0, dabA);    // wash: 累积 α (MAX)
}`;

// 把 wash 的累积 α 上色 → premult RGBA：premult(color, a)。全屏 quad。
const COLOR_VERT = `#version 300 es
precision highp float;
layout(location=0) in vec2 a_quad;
out vec2 v_uv;
void main() { v_uv = a_quad; gl_Position = vec4(a_quad * 2.0 - 1.0, 0.0, 1.0); }`;
const COLOR_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform sampler2D u_accum;
uniform vec3 u_color;
out vec4 o;
void main() { float a = texture(u_accum, v_uv).a; o = vec4(u_color * a, a); }`;

export class GLStampRasterizer {
  private _glctx: Gl2Port;
  private _instData = new Float32Array(0);   // 复用，按 stamp 数增长（不每帧新分配）
  constructor(glctx: Gl2Port) { this._glctx = glctx; }

  // 栅格化 stamps → 一张**预乘 RGBA** FBO（caller returnFBO）。
  //   (ox,oy,ow,oh) = 输出 FBO 覆盖的 doc 区域（= FBO 像素尺寸 ow×oh）。stamps 用 doc 坐标。
  //   scissor（可选）= 只着色该 doc 子矩形（FBO 像素 = doc-区域偏移；doc-y 1:1 不翻），FBO 其余区清透明。
  //     overlay 路径传 (0,0,docW,docH)+scissor=stamp bbox → **整屏 FBO 复用**(尺寸恒定→池命中,零重复 malloc)，
  //     GPU 着色仍限 bbox。commit 路径传 (bx,by,bw,bh)+无 scissor → bbox FBO（一次性，旧行为）。
  rasterize(stamps: Stamp[], shape: StrokeShape, ox: number, oy: number, ow: number, oh: number, scissor?: { x: number; y: number; w: number; h: number } | null): PooledFBO {
    const port = this._glctx;
    const accum = port.borrowFBO(ow, oh, "u8");

    // 1) 累积 pass：先全屏清透明（clear 无视 scissor）→ scissor 限着色 → dab 实例批。
    port.program("stamp-accum", ACCUM_VERT, ACCUM_FRAG);
    const n = stamps.length;
    if (this._instData.length < n * 4) this._instData = new Float32Array(n * 4);
    const data = this._instData;
    for (let i = 0; i < n; i++) { const s = stamps[i]; const o = i * 4; data[o] = s.x; data[o + 1] = s.y; data[o + 2] = s.size / 2; data[o + 3] = s.alpha; }
    port.drawInstanced({
      program: "stamp-accum",
      target: accum,
      clear: [0, 0, 0, 0],
      scissor: scissor ?? undefined,
      blend: shape.buildup ? "premult-over" : "max-alpha",
      uniforms: {
        u_bboxOrigin: [ox, oy], u_bboxSize: [ow, oh],
        u_hardness: Math.max(0, Math.min(0.999, shape.hardness)),
        u_color: shape.color, u_buildup: shape.buildup,
        u_aspect: shape.aspect ?? 1, u_rotation: shape.rotation ?? 0,
      },
    }, data, n);
    if (shape.buildup) return accum;   // 已是 premult colored

    // 2) wash 上色 pass：accum.a → premult(color,a) 到另一张 FBO。同样先全屏清、再 scissor 限着色。
    const out = port.borrowFBO(ow, oh, "u8");
    port.program("stamp-color", COLOR_VERT, COLOR_FRAG);
    port.draw({
      program: "stamp-color",
      target: out,
      clear: [0, 0, 0, 0],
      scissor: scissor ?? undefined,
      uniforms: { u_color: shape.color },
      textures: { u_accum: accum },
    });
    port.returnFBO(accum);
    return out;
  }
}

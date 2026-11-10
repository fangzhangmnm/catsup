// 12 个可分离 blend 模式的 GLSL（W3C Compositing and Blending L1 §10.1 逐字实现）。
// 这 12 个 = WeebPaint UI 实际可选的全部（layers-panel.ts:71 LAYER_MODE_LABEL）；非可分离的
//   hue/sat/color/luminosity UI 选不到（只在 PSD 互转），故不实现。
//
// 正确性策略：Canvas2D 的原生 blend = 同一份 W3C 规范 → GL 输出必须逐像素匹配 Canvas2D。
//   blend 公式生成（本文件）node 可测（断言每模式含对的式子）；像素匹配由 smoke harness 的
//   同引擎 2D-vs-GL 自 diff 验（ai-docs/20260614-perf-webgl-memory-clip.md §5 Stage 2）。
//
// 约定：bfn(Cb,Cs) 在**直值**(unpremultiplied, [0,1]) 上算，逐通道。源/背景的预乘与合成在主 shader。

// 我们支持的 12 个 canvas blend mode（值即 globalCompositeOperation / layer.mode）。
// C8 起枚举+CPU 公式住 common/blend-modes.ts（SoftGl2Port 共用）；此处 re-export 保住既有消费面。
import type { BlendMode } from "../../common/blend-modes.ts";
export { BLEND_MODES } from "../../common/blend-modes.ts";
export type { BlendMode } from "../../common/blend-modes.ts";

// 每模式：bfn(float Cb, float Cs) 的**函数体**（return 一个 float）。W3C §10.1 逐条。
const BLEND_BODY: Record<BlendMode, string> = {
  // 正常：源直接覆盖（B=Cs）。
  "source-over": `return Cs;`,
  "multiply": `return Cb * Cs;`,
  "screen": `return Cb + Cs - Cb * Cs;`,
  // overlay(Cb,Cs) = hard-light(Cs,Cb)
  "overlay": `return (Cb <= 0.5) ? (2.0*Cb*Cs) : (1.0 - 2.0*(1.0-Cb)*(1.0-Cs));`,
  "darken": `return min(Cb, Cs);`,
  "lighten": `return max(Cb, Cs);`,
  // color-dodge：Cb==0→0；Cs==1→1；else min(1, Cb/(1-Cs))
  "color-dodge": `if (Cb == 0.0) return 0.0; if (Cs >= 1.0) return 1.0; return min(1.0, Cb/(1.0-Cs));`,
  // color-burn：Cb==1→1；Cs==0→0；else 1-min(1,(1-Cb)/Cs)
  "color-burn": `if (Cb >= 1.0) return 1.0; if (Cs == 0.0) return 0.0; return 1.0 - min(1.0, (1.0-Cb)/Cs);`,
  "hard-light": `return (Cs <= 0.5) ? (2.0*Cb*Cs) : (1.0 - 2.0*(1.0-Cb)*(1.0-Cs));`,
  // soft-light：W3C 分段（D(Cb) 分支）。
  "soft-light":
    `float D = (Cb <= 0.25) ? (((16.0*Cb - 12.0)*Cb + 4.0)*Cb) : sqrt(Cb);
     return (Cs <= 0.5) ? (Cb - (1.0 - 2.0*Cs)*Cb*(1.0-Cb)) : (Cb + (2.0*Cs - 1.0)*(D - Cb));`,
  "difference": `return abs(Cb - Cs);`,
  "exclusion": `return Cb + Cs - 2.0*Cb*Cs;`,
};

// 全屏 quad 顶点（attr location 0 = [0,1]² 位置即 uv；Gl2Port draw 动词内部提供该 buffer）。
export const COMPOSITE_VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main(){ v_uv = a_pos; gl_Position = vec4(a_pos * 2.0 - 1.0, 0.0, 1.0); }`;

// 源种类：tiled = 叶层（查 tile-index 采稀疏 tile 池）；group = 隔离组的预乘 sub-accumulator 纹理；
//   overlay = 活动叶层 ⊕ live 描边 overlay（doc 尺寸直值纹理，source-over/erase；blendMode-overlay 暂缓）。
export type SourceKind = "tiled" | "group" | "overlay";

// 一个 (blend 模式, 源种类) 的 fragment 源：取源直值 + 累积器（预乘）→ W3C blend + source-over → 预乘输出。
//   u_arr：稀疏 tile 池；u_srcIndex：叶层 tile-index（tiled 用）；u_groupSrc：组预乘纹理（group 用）；
//   u_clipIndex：剪裁基底 tile-index；u_docSize：doc 像素尺寸；u_dst：累积器（预乘）；
//   u_opacity：层不透明度（Π 外那份，§4.3）；u_hasClip：1 时源 alpha × 基底 alpha = clip 蒙版。
//   sampleTiled：doc 坐标 → tile 坐标 → index 查 slice（空则透明）→ tile 内局部 uv 采 array。
export function compositeFragSource(mode: BlendMode, src: SourceKind = "tiled", overlayMode: BlendMode = "source-over"): string {
  // 源取值片段：算出 srcA（源 alpha 直值）+ Cs（源直值色）。
  const srcSnippet =
    src === "group"
      ? `vec4 sp = texture(u_groupSrc, v_uv);
         float srcA = sp.a;
         vec3 Cs = sp.rgb;   // sub-accumulator 也是直值（S7 起全链 straight）`
    : src === "overlay"
      // 活动叶 ⊕ overlay：overlay 是 **bbox 尺寸**纹理（doc 坐标 u_ovOrigin 起、u_ovSize 大）——按 bbox 映射，
      //   bbox 外透明（避免每帧传 doc 尺寸纹理）。erase = destination-out（叶 alpha 削减）；否则按 **brush blendMode**
      //   把 overlay（源）合到 base（背景）——W3C §10.2，与 2D layer-composite.ts:212 的 globalCompositeOperation 等价。
      ? `vec4 base = sampleTiled(u_srcIndex, docPos);
         vec2 ovUv = (docPos - u_ovOrigin) / u_ovSize;
         vec4 ov = (any(lessThan(ovUv, vec2(0.0))) || any(greaterThan(ovUv, vec2(1.0)))) ? vec4(0.0) : texture(u_overlay, ovUv);
         float srcA; vec3 Cs;
         if (u_ovReplace == 1) {                                   // 区域 overlay（2026-09-18）：bbox 内 = W 直值，bbox 外 = base
           bool ovInside = !(any(lessThan(ovUv, vec2(0.0))) || any(greaterThan(ovUv, vec2(1.0))));
           srcA = ovInside ? ov.a : base.a; Cs = ovInside ? ov.rgb : base.rgb;
         } else {
         float ovA = ov.a * u_overlayOpacity;
         if (u_ovHasSel == 1) {                                    // 选区：裁到 mask（dst-in 选区）
           vec2 suv = (docPos - u_ovSelOrigin) / u_ovSelSize;
           ovA *= (any(lessThan(suv, vec2(0.0))) || any(greaterThan(suv, vec2(1.0)))) ? 0.0 : texture(u_ovSel, suv).r;   // R8 gray8 直传（v0.4.6）
         }
         if (u_overlayErase == 1) {
           srcA = base.a * (1.0 - ovA); Cs = base.rgb;             // erase 不受锁α影响（v242 CPU 像素笔：erase 分支优先）
         } else if (u_ovLockAlpha == 1) {
           // 锁α = 真 source-atop（v0.9.12，对齐 CPU 像素笔 brush.ts _pixelBlendSpan "atop"）：
           //   α 逐字节不动、α=0 处像素完全不变（不写隐形色——贴图防黑边走导出 defringe）。
           //   旧公式 ovA*=base.a 再 source-over 会让半透明 α → α(2−α)，AA 边反复填/画越来越硬。
           vec3 ovBlend = (1.0 - base.a) * ov.rgb + base.a * blendRGB_ov(base.rgb, ov.rgb);
           srcA = base.a;
           Cs = (base.a > 0.0) ? mix(base.rgb, ovBlend, ovA) : base.rgb;
         } else {
           vec3 ovBlend = (1.0 - base.a) * ov.rgb + base.a * blendRGB_ov(base.rgb, ov.rgb);   // W3C blend 只在 base 存在处
           srcA = ovA + base.a * (1.0 - ovA);
           Cs = (srcA > 0.0) ? (ovBlend * ovA + base.rgb * base.a * (1.0 - ovA)) / srcA : vec3(0.0);
         }
         }`
      : `vec4 s = sampleTiled(u_srcIndex, docPos);
         float srcA = s.a;
         vec3 Cs = s.rgb;`;
  // overlay 专属：brush blendMode 的第二个 blend 函数（ov 合到 base 用，与层 mode 正交）。
  const ovBlendFns = src === "overlay"
    ? `float bfn_ov(float Cb, float Cs){ ${BLEND_BODY[overlayMode]} }
       vec3 blendRGB_ov(vec3 b, vec3 s){ return vec3(bfn_ov(b.r,s.r), bfn_ov(b.g,s.g), bfn_ov(b.b,s.b)); }`
    : "";
  // S7：累积器改 **straight rgba8**（spec:246-247，省一半显存）——u_dst 读直值、输出直值。
  //   数学不变（W3C 直值公式），只挪「预乘↔直值」转换点：过去每 pass 解/回预乘，现在直存直读，
  //   仅输出时按 ao 归一（ao=0 出 0）。u8 直值的量化误差在预乘空间 ≤ 预乘 u8（误差×ao），
  //   与 Canvas2D（内部预乘 u8）同量级——smoke 拿 compositeLayers 当 golden 对拍兜视觉回归。
  return `#version 300 es
precision highp float;
precision highp sampler2DArray;
in vec2 v_uv;
uniform sampler2DArray u_arr;
uniform highp sampler2D u_srcIndex;
uniform highp sampler2D u_clipIndex;
uniform sampler2D u_groupSrc;
uniform sampler2D u_overlay;
uniform sampler2D u_dst;
uniform vec2 u_docSize;
uniform float u_opacity;
uniform int u_hasClip;
uniform int u_clipMode;         // 0=clip 采基底 tile-index；1=采 u_clipTex（doc 尺寸 2D，live 描边中的 merged 基底）
uniform sampler2D u_clipTex;
uniform float u_overlayOpacity;
uniform int u_overlayErase;
uniform vec2 u_ovOrigin;
uniform vec2 u_ovSize;
uniform int u_ovLockAlpha;      // 1=锁α（overlay 裁到 base 现有 alpha，对齐 2D _clipOverlayMasks dst-in 层）
uniform int u_ovReplace;        // 1=区域 overlay：bbox 内直接替换（W 已含一切），bbox 外 base（2026-09-18）
uniform int u_ovHasSel;         // 1=有选区蒙版
uniform sampler2D u_ovSel;      // 选区 mask（R8 gray8，bbox 直值；采 .r）
uniform vec2 u_ovSelOrigin;     // 选区 mask 的 doc bbox 左上
uniform vec2 u_ovSelSize;       // 选区 mask 的 doc bbox 尺寸
out vec4 o;

float bfn(float Cb, float Cs){ ${BLEND_BODY[mode]} }
vec3 blendRGB(vec3 b, vec3 s){ return vec3(bfn(b.r,s.r), bfn(b.g,s.g), bfn(b.b,s.b)); }
${ovBlendFns}

vec4 sampleTiled(highp sampler2D index, vec2 docPos){
  ivec2 tc = ivec2(floor(docPos / 256.0));
  float slice = texelFetch(index, tc, 0).r;     // R32F：slice 或 -1
  if (slice < 0.0) return vec4(0.0);             // 空 tile = 透明
  vec2 local = (docPos - vec2(tc) * 256.0) / 256.0;
  return texture(u_arr, vec3(local, slice));
}

void main(){
  vec2 docPos = v_uv * u_docSize;
  ${srcSnippet}
  float as = srcA * u_opacity;
  // clip 蒙版：常规采基底 tile-index；基底正被 live 描边时采 merged(base⊕stroke) 整幅纹理
  //   （u_clipMode=1，v0.4.11——修「clip 层不实时跟随基底 live 笔迹」）。
  if (u_hasClip == 1) as *= (u_clipMode == 1) ? texture(u_clipTex, v_uv).a : sampleTiled(u_clipIndex, docPos).a;

  vec4 dst = texture(u_dst, v_uv);    // 直值 (Cb, ab)
  float ab = dst.a;
  vec3 Cb = dst.rgb;

  vec3 Csb = (1.0 - ab) * Cs + ab * blendRGB(Cb, Cs);  // W3C §10.2：blend 只在背景存在处生效
  vec3 Po = as * Csb + Cb * ab * (1.0 - as);           // 合成（预乘空间瞬时值）
  float ao = as + ab * (1.0 - as);
  o = vec4((ao > 0.0) ? (Po / ao) : vec3(0.0), ao);    // 归一回直值存储
}`;
}

// program 缓存键（Gl2Port.program 用）。
export function compositeProgramKey(mode: BlendMode, src: SourceKind = "tiled", overlayMode: BlendMode = "source-over"): string {
  return src === "overlay" ? `composite:${mode}:${src}:${overlayMode}` : `composite:${mode}:${src}`;
}

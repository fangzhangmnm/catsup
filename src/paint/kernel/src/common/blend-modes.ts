// blend-modes —— 图层混合模式契约（W3C Compositing and Blending L1 §10.1；C8 抽入 common）。
//
// 这 12 个 = WeebPaint UI 实际可选的全部（layers-panel.ts LAYER_MODE_LABEL）；非可分离的
//   hue/sat/color/luminosity UI 选不到（只在 PSD 互转），故不实现。
// 双实现对表：GLSL 版在 src/gl/blend-glsl.ts（BLEND_BODY，逐模式字符串）、CPU 版在本文件
//   （blendChannel，SoftGl2Port 与任何字节域合成共用）。**改公式两边必须同步**——
//   锚：gl-smoke 的 2D-vs-GL 自 diff + soft 对拍（test:full 三方 golden）。

export const BLEND_MODES = [
  "source-over", "multiply", "screen", "overlay", "darken", "lighten",
  "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion",
] as const;
export type BlendMode = (typeof BLEND_MODES)[number];

// bfn(Cb, Cs)：直值 [0,1] 单通道（W3C §10.1 逐条；与 BLEND_BODY GLSL 逐分支同构）。
export function blendChannel(mode: BlendMode, Cb: number, Cs: number): number {
  switch (mode) {
    case "source-over": return Cs;
    case "multiply": return Cb * Cs;
    case "screen": return Cb + Cs - Cb * Cs;
    case "overlay": return (Cb <= 0.5) ? (2 * Cb * Cs) : (1 - 2 * (1 - Cb) * (1 - Cs));
    case "darken": return Math.min(Cb, Cs);
    case "lighten": return Math.max(Cb, Cs);
    case "color-dodge": {
      if (Cb === 0) return 0;
      if (Cs >= 1) return 1;
      return Math.min(1, Cb / (1 - Cs));
    }
    case "color-burn": {
      if (Cb >= 1) return 1;
      if (Cs === 0) return 0;
      return 1 - Math.min(1, (1 - Cb) / Cs);
    }
    case "hard-light": return (Cs <= 0.5) ? (2 * Cb * Cs) : (1 - 2 * (1 - Cb) * (1 - Cs));
    case "soft-light": {
      const D = (Cb <= 0.25) ? (((16 * Cb - 12) * Cb + 4) * Cb) : Math.sqrt(Cb);
      return (Cs <= 0.5) ? (Cb - (1 - 2 * Cs) * Cb * (1 - Cb)) : (Cb + (2 * Cs - 1) * (D - Cb));
    }
    case "difference": return Math.abs(Cb - Cs);
    case "exclusion": return Cb + Cs - 2 * Cb * Cs;
  }
}

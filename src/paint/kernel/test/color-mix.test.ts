// color-mix 契约测（created 2026-09-05 by Claude Fable 5.1）：
//   端点恒等 / alpha 权重（透明像素颜色不参与）/ oklab 保色度不穿灰 / spectral 黄+蓝→绿 / 往返精度。
import { describe, it, eq, assert } from "./runner.mjs";
import { mixPremultInto, mixStraightRgb, srgbToLinear, linearToSrgb, linearRgbToOklab, oklabToLinearRgb, linearRgbToSpectral, spectralToLinearRgb } from "../src/backend/algorithms/color-mix.ts";

const near = (a: number, b: number, eps: number, msg: string) => assert(Math.abs(a - b) <= eps, `${msg}: ${a} vs ${b}`);
const chroma = (rgb: readonly number[]) => Math.max(...rgb) - Math.min(...rgb);   // 粗糙的饱和度代理

describe("color-mix · 端点 / alpha 权重", () => {
  it("t=0 → a，t=1 → b（三空间）", () => {
    const a = new Float32Array([0.8, 0.1, 0.1, 1]), b = new Float32Array([0.1, 0.1, 0.9, 1]), o = new Float32Array(4);
    for (const sp of ["srgb", "oklab", "spectral"] as const) {
      mixPremultInto(o, 0, a, 0, b, 0, 0, sp); eq(o[0], a[0], `${sp} t=0`);
      mixPremultInto(o, 0, a, 0, b, 0, 1, sp); eq(o[2], b[2], `${sp} t=1`);
    }
  });
  it("不透明红 × 全透明（RGB 随便）：颜色仍是红，alpha 减半——透明像素的颜色不参与", () => {
    const red = new Float32Array([1, 0, 0, 1]), ghost = new Float32Array([0, 0, 0, 0]), o = new Float32Array(4);
    for (const sp of ["srgb", "oklab", "spectral"] as const) {
      mixPremultInto(o, 0, red, 0, ghost, 0, 0.5, sp);
      near(o[3], 0.5, 1e-6, `${sp} alpha`);
      near(o[0] / o[3], 1, 0.02, `${sp} 去预乘后仍纯红`);
      near(o[1], 0, 0.02, `${sp} 绿`); near(o[2], 0, 0.02, `${sp} 蓝`);
    }
  });
  it("两个全透明 → 全 0；就地混（out === a）安全", () => {
    const a = new Float32Array([0.3, 0.2, 0.1, 0]), b = new Float32Array([0.5, 0.5, 0.5, 0]);
    mixPremultInto(a, 0, a, 0, b, 0, 0.5, "oklab");
    eq(a[0], 0); eq(a[3], 0);
    const c = new Float32Array([0.2, 0.4, 0.6, 1]), d = new Float32Array([0.6, 0.4, 0.2, 1]);
    mixPremultInto(c, 0, c, 0, d, 0, 0.5, "srgb");
    near(c[0], 0.4, 1e-6, "就地 srgb");
  });
});

describe("color-mix · 传递函数与空间往返", () => {
  it("sRGB ↔ 线性 往返", () => {
    for (const v of [0, 0.01, 0.2, 0.5, 0.9, 1]) near(linearToSrgb(srgbToLinear(v)), v, 1e-6, "srgb 往返");
  });
  it("OKLab 往返", () => {
    const lab = new Float32Array(3), rgb = new Float32Array(3);
    for (const [r, g, b] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.2, 0.5, 0.7], [1, 1, 1]]) {
      linearRgbToOklab(r, g, b, lab); oklabToLinearRgb(lab[0], lab[1], lab[2], rgb);
      near(rgb[0], r, 1e-4, "R"); near(rgb[1], g, 1e-4, "G"); near(rgb[2], b, 1e-4, "B");
    }
  });
  it("反射谱往返（基底是最小二乘近似，容差放宽）", () => {
    const sp = new Float32Array(10), rgb = new Float32Array(3);
    for (const [r, g, b] of [[1, 0, 0], [0, 1, 0], [0, 0, 1], [0.5, 0.5, 0.5], [1, 1, 0], [0.2, 0.6, 0.3]]) {
      linearRgbToSpectral(r, g, b, sp); spectralToLinearRgb(sp, 0, rgb);
      near(rgb[0], r, 0.06, "R"); near(rgb[1], g, 0.06, "G"); near(rgb[2], b, 0.06, "B");
    }
  });
});

describe("color-mix · 越混越脏 的两个解法", () => {
  const yellow = [1, 1, 0], blue = [0, 0, 1];
  it("srgb 基线：黄+蓝 中点 = 灰（对照组，这就是「脏」）", () => {
    const m = mixStraightRgb(yellow, blue, 0.5, "srgb");
    assert(chroma(m) < 0.02, `srgb 中点应发灰: ${m}`);
  });
  it("oklab 保色度：黄+蓝 中点仍有明显色度（≥ 端点色度的 60%）", () => {
    const m = mixStraightRgb(yellow, blue, 0.5, "oklab");
    assert(chroma(m) >= 0.6, `oklab 中点色度: ${m}`);
  });
  it("spectral 颜料谱：黄+蓝 → 绿（g 是三通道最大）", () => {
    const m = mixStraightRgb(yellow, blue, 0.5, "spectral");
    assert(m[1] > m[0] && m[1] > m[2], `spectral 黄+蓝应偏绿: ${m}`);
  });
  it("同色自混恒等（三空间）", () => {
    const c = [0.3, 0.6, 0.2];
    for (const sp of ["srgb", "oklab", "spectral"] as const) {
      const m = mixStraightRgb(c, c, 0.5, sp);
      near(m[0], c[0], 0.03, `${sp} R`); near(m[1], c[1], 0.03, `${sp} G`); near(m[2], c[2], 0.03, `${sp} B`);
    }
  });
});

// 颜色距离核（v0.7.21）——魔棒 flood / 同色全图选区共用的相似度判据；色名系统共用 OKLab 转换。
// 纯函数无 DOM（node 直测）。字节进出不走 canvas（家规）。
//
// 度量二选一（user 2026-07-30 拍板：默认 OKLab，扳手可切回 RGB）：
//   · "oklab"：感知均匀欧氏 ΔE（Björn Ottosson 2020）。淡色作业（二次元肤/发/衣）差异集中在
//     微小 a/b，感知均匀让同一容差值跨明暗/色域行为一致；α 不进 Lab，独立通道取 max。
//   · "rgb"：v242 经典语义——逐通道 max 差（含 α），像素画/精确匹配直觉。
// 两种度量都归一化到 [0,1]（1 = 黑↔白全程），容差滑条 0..100 → t/100 直比，跨度量可换算。
// OKLab 极端色对 ΔE 可 >1（蓝↔黄 ~1.17）→ clamp 到 1，保「容差拉满=全放行」不变量。

export type ColorMetric = "oklab" | "rgb";

// sRGB→linear 256 项 LUT：输入恒 8-bit → 查表**精确**（非近似）；flood/全图扫每像素一次，pow 太贵。
const LIN = new Float64Array(256);
for (let i = 0; i < 256; i++) {
  const c = i / 255;
  LIN[i] = c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** 8-bit sRGB → OKLab（标准系数）。色名/距离共用一份（原 color-name.ts 私有实现收拢至此）。 */
export function srgbToOklab(r8: number, g8: number, b8: number): [number, number, number] {
  const r = LIN[r8 & 255], g = LIN[g8 & 255], b = LIN[b8 & 255];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s,
  ];
}

/** OKLab → 8-bit sRGB（srgbToOklab 的逆；Ottosson 标准系数）。色带 OKLab 插值用（2026-09-05，color-ramp.ts）。
 *  出 gamut 的分量钳到 0..255；端点回归原色由 test/color-ramp.test.mjs 锁。edited by Claude Fable 5.1 */
export function oklabToSrgb(L: number, a: number, b: number): [number, number, number] {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  const rl = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  const gl = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  const bl = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;
  const enc = (c: number): number => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(Math.max(c, 0), 1 / 2.4) - 0.055;
    const x = v * 255;
    return x < 0 ? 0 : x > 255 ? 255 : x;
  };
  return [enc(rl), enc(gl), enc(bl)];
}

/**
 * 以种子色为锚的距离闭包：`(r,g,b,a) => [0,1]`。flood barrier / 同色全图逐像素调用。
 * 直读 tiles 的 RGBA 是 straight alpha（v0.6.39）；α=0 处 RGB 可能是烂值，但 α 差先顶满 → 不受污染
 * （与经典 max 通道语义一致：透明↔不透明恒 barrier，除非容差极大）。
 */
export function makeSeedDist(
  metric: ColorMetric, sr: number, sg: number, sb: number, sa: number,
): (r: number, g: number, b: number, a: number) => number {
  if (metric === "rgb") {
    return (r, g, b, a) =>
      Math.max(Math.abs(r - sr), Math.abs(g - sg), Math.abs(b - sb), Math.abs(a - sa)) / 255;
  }
  const [sL, sA, sB] = srgbToOklab(sr, sg, sb);
  return (r, g, b, a) => {
    const lab = srgbToOklab(r, g, b);
    const dL = lab[0] - sL, dA = lab[1] - sA, dB = lab[2] - sB;
    const dE = Math.sqrt(dL * dL + dA * dA + dB * dB);
    return Math.max(dE > 1 ? 1 : dE, Math.abs(a - sa) / 255);
  };
}

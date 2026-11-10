// color-mix —— 混色空间（纯函数，零 DOM）。created 2026-09-05 by Claude Fable 5.1。
// 首消费者 = 手指/涂抹引擎（plugins/smudge-engine.ts）；将来湿画笔（画笔带 pull）同用。
//
// 三种 mix(a, b, t)（a、b 是 **premult** RGBA，0..1 浮点（字节/255），t = b 的权重）：
//   srgb     直接在 app 的合成空间（sRGB 字节值、premult）lerp——与全 app 其它混合一致，是基线。
//   oklab    去预乘 → sRGB→线性→OKLab，按 alpha 加权 lerp，再**保色度**（色度取两端 lerp，防互补色一混就穿灰）
//            → 回线性→sRGB→重预乘。user 2026-09-05「混的时候可以选不同的插值方案…解决越混越脏」。
//   spectral 去预乘 → 线性 RGB → 10 段反射谱 → 按 alpha 加权**几何平均**（WGM，减色混合：黄+蓝→绿）
//            → 回线性 RGB。基底与 T 矩阵移植自 libmypaint（ISC License，Copyright (c) 2014-2020 MyPaint
//            Development Team；helpers.c / helpers.h；本地只读参考 ~/jupyter/third-party/libmypaint/）。
//            user 2026-09-05「颜料谱听起来很有趣，也做进去探索一下」。
// alpha 权重（三种同式，同 MyPaint mix_colors 的 sfac）：w_a = (1−t)·α_a，w_b = t·α_b，α_out = w_a + w_b，
//   颜色权 f = w_b / α_out。α_out = 0 → 输出全 0。透明像素的 RGB 永远不参与——这正是黑边病根的反面。
//   srgb 档在 premult 域直接 lerp 数学上等价于上式（premult 已内含 alpha 权），所以它不需要去预乘。

export type MixSpace = "srgb" | "oklab" | "spectral";
export const MIX_SPACES: readonly MixSpace[] = ["srgb", "oklab", "spectral"];
export function isMixSpace(v: unknown): v is MixSpace { return typeof v === "string" && (MIX_SPACES as readonly string[]).includes(v); }

// ---- sRGB 传递函数 ----
export function srgbToLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function linearToSrgb(c: number): number {
  const v = c <= 0 ? 0 : c >= 1 ? 1 : c;
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}
// 2026-09-06 LUT 层 1（议程 §H；smudge-engine.ts:22「每像素十几个超越函数」）：4096 段查表 + 线性插值替代 pow。
//   误差 < 1/255（test/color-mix-lut.test.mjs 锁）；mixPremultInto 热路径用 fast 版，精确版留给测试/离线。
const LUT_N = 4096;
const _toLin = new Float32Array(LUT_N + 1), _toSrgb = new Float32Array(LUT_N + 1);
for (let i = 0; i <= LUT_N; i++) { _toLin[i] = srgbToLinear(i / LUT_N); _toSrgb[i] = linearToSrgb(i / LUT_N); }
function _lut(t: Float32Array, c: number): number {
  const x = (c <= 0 ? 0 : c >= 1 ? 1 : c) * LUT_N;
  const i = x | 0;
  if (i >= LUT_N) return t[LUT_N];
  const f = x - i;
  return t[i] + (t[i + 1] - t[i]) * f;
}
export function srgbToLinearFast(c: number): number { return _lut(_toLin, c); }
export function linearToSrgbFast(c: number): number { return _lut(_toSrgb, c); }

// ---- OKLab（Björn Ottosson 2020；输入线性 sRGB）----
export function linearRgbToOklab(r: number, g: number, b: number, out: Float32Array | number[], oi = 0): void {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[oi]     = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  out[oi + 1] = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  out[oi + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
}
export function oklabToLinearRgb(L: number, a: number, b: number, out: Float32Array | number[], oi = 0): void {
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  out[oi]     = clamp01(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  out[oi + 1] = clamp01(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  out[oi + 2] = clamp01(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s);
}

// ---- 10 段反射谱（libmypaint helpers.c：spectral_*_small / T_MATRIX_SMALL / WGM_EPSILON）----
const WGM_EPSILON = 0.001;
const SPECTRAL_R = [0.009281362787953, 0.009732627042016, 0.011254252737167, 0.015105578649573, 0.024797924177217, 0.083622585502406, 0.977865045723212, 1.000000000000000, 0.999961046144372, 0.999999992756822];
const SPECTRAL_G = [0.002854127435775, 0.003917589679914, 0.012132151699187, 0.748259205918013, 1.000000000000000, 0.865695937531795, 0.037477469241101, 0.022816789725717, 0.021747419446456, 0.021384940572308];
const SPECTRAL_B = [0.537052150373386, 0.546646402401469, 0.575501819073983, 0.258778829633924, 0.041709923751716, 0.012662638828324, 0.007485593127390, 0.006766900622462, 0.006699764779016, 0.006676219883241];
const T_MATRIX = [
  [0.026595621243689, 0.049779426257903, 0.022449850859496, -0.218453689278271, -0.256894883201278, 0.445881722194840, 0.772365886289756, 0.194498761382537, 0.014038157587820, 0.007687264480513],
  [-0.032601672674412, -0.061021043498478, -0.052490001018404, 0.206659098273522, 0.572496335158169, 0.317837248815438, -0.021216624031211, -0.019387668756117, -0.001521339050858, -0.000835181622534],
  [0.339475473216284, 0.635401374177222, 0.771520797089589, 0.113222640692379, -0.055251113343776, -0.048222578468680, -0.012966666339586, -0.001523814504223, -0.000094718948810, -0.000051604594741],
];
/** 线性 RGB（0..1）→ 10 段反射谱（含 WGM_EPSILON 地板，保证可取对数）。 */
export function linearRgbToSpectral(r: number, g: number, b: number, out: Float32Array | number[], oi = 0): void {
  const off = 1 - WGM_EPSILON;
  const rr = r * off + WGM_EPSILON, gg = g * off + WGM_EPSILON, bb = b * off + WGM_EPSILON;
  for (let i = 0; i < 10; i++) out[oi + i] = SPECTRAL_R[i] * rr + SPECTRAL_G[i] * gg + SPECTRAL_B[i] * bb;
}
/** 10 段反射谱 → 线性 RGB（夹 0..1）。 */
export function spectralToLinearRgb(spec: Float32Array | number[], si: number, out: Float32Array | number[], oi = 0): void {
  const off = 1 - WGM_EPSILON;
  let r = 0, g = 0, b = 0;
  for (let i = 0; i < 10; i++) { const s = spec[si + i]; r += T_MATRIX[0][i] * s; g += T_MATRIX[1][i] * s; b += T_MATRIX[2][i] * s; }
  out[oi] = clamp01((r - WGM_EPSILON) / off);
  out[oi + 1] = clamp01((g - WGM_EPSILON) / off);
  out[oi + 2] = clamp01((b - WGM_EPSILON) / off);
}

function clamp01(v: number): number { return v <= 0 ? 0 : v >= 1 ? 1 : v; }

// 每次调用复用的 scratch（单线程；调用方不得持有引用）
const _la = new Float32Array(3), _lb = new Float32Array(3), _lab = new Float32Array(3), _lab2 = new Float32Array(3);
const _sa = new Float32Array(10), _sb = new Float32Array(10), _sm = new Float32Array(10), _lin = new Float32Array(3);

/**
 * out[oi..oi+3] = mix(a[ai..], b[bi..], t)，全 premult RGBA 0..1。t = b 的权重（0 → a，1 → b）。
 * out 可以与 a 或 b 同一数组同一下标（就地混）。
 */
export function mixPremultInto(
  out: Float32Array, oi: number,
  a: ArrayLike<number>, ai: number,
  b: ArrayLike<number>, bi: number,
  t: number, space: MixSpace,
): void {
  _mixPremultInto(out, oi, a, ai, b, bi, t, space, srgbToLinearFast, linearToSrgbFast);
}
/**
 * 精确传递函数版（pow，不走 4096 段 LUT）：GPU 区域程序的 CPU 孪生用——soft-shaders.ts 逐行镜像 region-programs.ts 的
 * GLSL mixPremult（GLSL 直接 pow）。与 LUT 版差 < 1/255（test/color-mix-lut.test.mjs 锁）。2026-09-18 Claude Fable 5.1。
 */
export function mixPremultIntoExact(
  out: Float32Array, oi: number,
  a: ArrayLike<number>, ai: number,
  b: ArrayLike<number>, bi: number,
  t: number, space: MixSpace,
): void {
  _mixPremultInto(out, oi, a, ai, b, bi, t, space, srgbToLinear, linearToSrgb);
}
function _mixPremultInto(
  out: Float32Array, oi: number,
  a: ArrayLike<number>, ai: number,
  b: ArrayLike<number>, bi: number,
  t: number, space: MixSpace,
  toLin: (c: number) => number, toSrgb: (c: number) => number,
): void {
  if (t <= 0) { out[oi] = a[ai]; out[oi + 1] = a[ai + 1]; out[oi + 2] = a[ai + 2]; out[oi + 3] = a[ai + 3]; return; }
  if (t >= 1) { out[oi] = b[bi]; out[oi + 1] = b[bi + 1]; out[oi + 2] = b[bi + 2]; out[oi + 3] = b[bi + 3]; return; }
  if (space === "srgb") {
    const u = 1 - t;
    out[oi]     = a[ai] * u + b[bi] * t;
    out[oi + 1] = a[ai + 1] * u + b[bi + 1] * t;
    out[oi + 2] = a[ai + 2] * u + b[bi + 2] * t;
    out[oi + 3] = a[ai + 3] * u + b[bi + 3] * t;
    return;
  }
  const aa = a[ai + 3], ab = b[bi + 3];
  const wa = (1 - t) * aa, wb = t * ab;
  const A = wa + wb;
  if (A <= 1e-6) { out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0; return; }
  const f = wb / A;   // b 的颜色权
  // 去预乘 → 线性
  if (aa > 1e-6) { _la[0] = toLin(a[ai] / aa); _la[1] = toLin(a[ai + 1] / aa); _la[2] = toLin(a[ai + 2] / aa); }
  else { _la[0] = _la[1] = _la[2] = 0; }
  if (ab > 1e-6) { _lb[0] = toLin(b[bi] / ab); _lb[1] = toLin(b[bi + 1] / ab); _lb[2] = toLin(b[bi + 2] / ab); }
  else { _lb[0] = _lb[1] = _lb[2] = 0; }
  if (f <= 1e-6) { _lin[0] = _la[0]; _lin[1] = _la[1]; _lin[2] = _la[2]; }
  else if (f >= 1 - 1e-6) { _lin[0] = _lb[0]; _lin[1] = _lb[1]; _lin[2] = _lb[2]; }
  else if (space === "oklab") {
    linearRgbToOklab(_la[0], _la[1], _la[2], _lab);
    linearRgbToOklab(_lb[0], _lb[1], _lb[2], _lab2);
    const u = 1 - f;
    const L = _lab[0] * u + _lab2[0] * f;
    let ca = _lab[1] * u + _lab2[1] * f;
    let cb = _lab[2] * u + _lab2[2] * f;
    // 保色度：目标色度 = 两端色度的 lerp；混出来的色度若被抵消（互补色）就按目标放大回去。
    const Ca = Math.hypot(_lab[1], _lab[2]), Cb = Math.hypot(_lab2[1], _lab2[2]);
    const Ct = Ca * u + Cb * f;
    const Cm = Math.hypot(ca, cb);
    if (Cm > 1e-5 && Ct > Cm) { const k = Ct / Cm; ca *= k; cb *= k; }
    oklabToLinearRgb(L, ca, cb, _lin);
  } else {
    // spectral：反射谱加权几何平均（减色）
    linearRgbToSpectral(_la[0], _la[1], _la[2], _sa);
    linearRgbToSpectral(_lb[0], _lb[1], _lb[2], _sb);
    const u = 1 - f;
    for (let i = 0; i < 10; i++) _sm[i] = Math.exp(u * Math.log(_sa[i]) + f * Math.log(_sb[i]));
    spectralToLinearRgb(_sm, 0, _lin);
  }
  // 线性 → sRGB → 重预乘
  out[oi]     = toSrgb(_lin[0]) * A;
  out[oi + 1] = toSrgb(_lin[1]) * A;
  out[oi + 2] = toSrgb(_lin[2]) * A;
  out[oi + 3] = A;
}

/** 便利：straight sRGB（0..1）两色按 t 混，返回 straight sRGB（测试/UI 预览用；alpha 视为 1）。 */
export function mixStraightRgb(a: readonly number[], b: readonly number[], t: number, space: MixSpace): [number, number, number] {
  const pa = new Float32Array([a[0], a[1], a[2], 1]);
  const pb = new Float32Array([b[0], b[1], b[2], 1]);
  const o = new Float32Array(4);
  mixPremultInto(o, 0, pa, 0, pb, 0, t, space);
  return [o[0], o[1], o[2]];
}

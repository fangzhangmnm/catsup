// 预滤波三次 B 样条插值（Thévenaz/Unser 广义插值）深模块。v0.6.35。
//
// 为什么（deletion test）：任意插值核每次重采样 = 频谱乘一次 K(f)，n 次 commit = Kⁿ——
// Catmull-Rom 中频 ~0.85/次，5 次改图后线稿明显发软。插值 B 样条（先解逆滤波求系数，
// 采样时用全正的 B3 核）的等效频响远贴 1，是图像配准领域「反复重采样不糊」的标准解
// （经典 benchmark：连转 15 次，CR 糊成一团、B 样条几乎无损）。采样成本与 bicubic 同价
// （4×4=16 tap）；额外代价 = 每个源一次性 O(n) 可分离递归预滤波 + 系数要浮点存储。
//
// 约定：
// - 输入 straight RGBA u8；内部转 premult float（与 GPU warp 采样器的 premult 累加口径一致）。
// - 系数平面带 PAD=8 透明边距：零延拓边界（rect 外=透明的语义，对齐 bicubic 的越界 tap 丢弃），
//   IIR 用朴素初值，误差经 8px 衰减 |z1|^8≈3e-5，低于 u8 量化。
// - GPU 侧（gl-compositor WARP_FUNCS mode 3）逐位复刻本文件的 b3/坐标约定（golden 对拍）。
//
// 消费者：floating-transform（变换 live+commit 源）、liquify（保锐采样模式）、
//         test/bspline.test.mjs + gl-smoke harness（CPU golden 参照）。

export const BSPLINE_PAD = 8;
const Z1 = Math.sqrt(3) - 2;   // 三次 B 样条逆滤波极点 ≈ −0.2679

/** 系数平面：data = premult float RGBA，尺寸 (w+2·PAD)×(h+2·PAD)；w/h = 逻辑（源）尺寸。 */
export interface SplinePlane { data: Float32Array; w: number; h: number }

// 三次 B 样条核 B3(t)（全正，支撑 4）。
export function b3(t: number): number {
  const at = Math.abs(t);
  if (at < 1) return 2 / 3 - at * at + at * at * at / 2;
  if (at < 2) { const u = 2 - at; return u * u * u / 6; }
  return 0;
}

// 一维就地 IIR（causal + anticausal + 增益 6）：arr 上按 (offset + i·stride) 访问 n 个元素。
// 零延拓边界（数组两端 PAD 内已是 0，朴素初值误差衰减进不了内容区）。
function iir1d(arr: Float32Array, offset: number, stride: number, n: number) {
  // causal: c⁺(k) = f(k) + z1·c⁺(k−1)
  let prev = arr[offset];
  for (let k = 1; k < n; k++) {
    const idx = offset + k * stride;
    prev = arr[idx] + Z1 * prev;
    arr[idx] = prev;
  }
  // anticausal: c(k) = z1·(c(k+1) − c⁺(k))；末端朴素初值 c(n−1) = −z1·c⁺(n−1)
  let next = -Z1 * arr[offset + (n - 1) * stride];
  arr[offset + (n - 1) * stride] = next;
  for (let k = n - 2; k >= 0; k--) {
    const idx = offset + k * stride;
    next = Z1 * (next - arr[idx]);
    arr[idx] = next;
  }
  // 增益 6（6/(z+4+z⁻¹) 的分子）
  for (let k = 0; k < n; k++) arr[offset + k * stride] *= 6;
}

/** straight RGBA u8 (w×h) → 预滤波 B 样条系数平面（premult float，PAD 边距，4 通道独立）。
 *  一次性 O(n)；调用方按源身份缓存（源不可变期间复用）。 */
export function prefilterToSplinePlane(rgba: Uint8ClampedArray, w: number, h: number): SplinePlane {
  const P = BSPLINE_PAD;
  const pw = w + 2 * P, ph = h + 2 * P;
  const data = new Float32Array(pw * ph * 4);
  // premult float 填充（pad 区留 0 = 透明零延拓）
  for (let y = 0; y < h; y++) {
    let si = (y * w) * 4;
    let di = ((y + P) * pw + P) * 4;
    for (let x = 0; x < w; x++, si += 4, di += 4) {
      const a = rgba[si + 3] / 255;
      data[di] = rgba[si] * a; data[di + 1] = rgba[si + 1] * a; data[di + 2] = rgba[si + 2] * a;
      data[di + 3] = rgba[si + 3];
    }
  }
  // 可分离 IIR：先行后列，4 通道各跑
  for (let y = 0; y < ph; y++) {
    for (let c = 0; c < 4; c++) iir1d(data, (y * pw) * 4 + c, 4, pw);
  }
  for (let x = 0; x < pw; x++) {
    for (let c = 0; c < 4; c++) iir1d(data, x * 4 + c, pw * 4, ph);
  }
  return { data, w, h };
}

/** CPU 采样（GPU shader mode 3 的逐位参照；液化保锐模式直接用）。
 *  (sx,sy) = center 约定源坐标（texel i 中心在 i；调用方已做 −0.5 相位）。
 *  写 straight RGBA 到 out[oi..oi+3]。越出系数平面的 tap 视 0（pad 外已衰减到 0）。 */
const SAMPLE_CA = new Float32Array(16);   // 采样期 α 系数暂存（限幅域重建用；单线程复用零分配）

export function sampleSplinePremult(plane: SplinePlane, sx: number, sy: number, out: Uint8ClampedArray | Float32Array, oi: number) {
  const P = BSPLINE_PAD;
  const pw = plane.w + 2 * P, ph = plane.h + 2 * P;
  const cx = sx + P, cy = sy + P;
  const ix = Math.floor(cx), iy = Math.floor(cy);
  const kx = [b3(ix - 1 - cx), b3(ix - cx), b3(ix + 1 - cx), b3(ix + 2 - cx)];
  const ky = [b3(iy - 1 - cy), b3(iy - cy), b3(iy + 1 - cy), b3(iy + 2 - cy)];
  let r = 0, g = 0, b = 0, a = 0;
  const d = plane.data;
  const ca = SAMPLE_CA; ca.fill(0);
  for (let j = 0; j < 4; j++) {
    const yy = iy - 1 + j;
    if (yy < 0 || yy >= ph) continue;
    const wy = ky[j];
    for (let i = 0; i < 4; i++) {
      const xx = ix - 1 + i;
      if (xx < 0 || xx >= pw) continue;
      const ww = kx[i] * wy;
      const p = (yy * pw + xx) * 4;
      r += d[p] * ww; g += d[p + 1] * ww; b += d[p + 2] * ww; a += d[p + 3] * ww;
      ca[j * 4 + i] = d[p + 3];
    }
  }
  if (a < 1e-4) { out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0; return; }
  // 反振铃限幅（v0.6.43，与 GPU shader 逐位同步）：源 α 在中央 2×2 整点的重建值（系数 3×3 ×
  // B3 整点权 [1,4,1]/6）张成 [min,max]，α clamp 进去、premult RGB 等比缩 → 零色偏，只杀负瓣过冲。
  let amin = Infinity, amax = -Infinity;
  for (let v = 0; v < 2; v++) {
    for (let u = 0; u < 2; u++) {
      let acc = 0;
      for (let dv = -1; dv <= 1; dv++) {
        for (let du = -1; du <= 1; du++) {
          acc += ca[(v + 1 + dv) * 4 + (u + 1 + du)] * ((du === 0 ? 4 : 1) / 6) * ((dv === 0 ? 4 : 1) / 6);
        }
      }
      if (acc < amin) amin = acc;
      if (acc > amax) amax = acc;
    }
  }
  const acl = Math.max(amin, Math.min(amax, a));
  if (acl !== a) { const sc = acl / a; r *= sc; g *= sc; b *= sc; a = acl; }
  if (a < 1e-4) { out[oi] = out[oi + 1] = out[oi + 2] = out[oi + 3] = 0; return; }
  const af = a / 255;   // premult → straight（透明 tap 不拖暗，同 warp 采样器口径）
  const clamp = (v: number) => v < 0 ? 0 : v > 255 ? 255 : v;
  out[oi] = clamp(r / af); out[oi + 1] = clamp(g / af); out[oi + 2] = clamp(b / af);
  out[oi + 3] = clamp(a);
}

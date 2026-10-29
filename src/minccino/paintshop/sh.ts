// 涂装车间 · 球谐投影：等距柱状图（RGBA 浮点、按行）→ 9 个系数，系数里乘好余弦卷积和 1/π（实验室 lab/app.js projectSH 原式；Ramamoorthi & Hanrahan 2001）。纯函数。
// created 2026-10-29 by Claude Opus 5.5（从 backend/three/env-sky.ts 拆出来）
/** 9 个球谐系数（实验室 projectSH 原式）。px = RGBA 浮点、w × h、按行；第 j 行 = θ (j + 0.5)π/h。 */
export function projectSH(px: Float32Array, w: number, h: number): Float32Array {
  const c = new Float32Array(27), A = [Math.PI, 2 * Math.PI / 3, 2 * Math.PI / 3, 2 * Math.PI / 3, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4, Math.PI / 4];
  const dPhi = 2 * Math.PI / w, dTh = Math.PI / h;
  for (let j = 0; j < h; j++) {
    const th = (j + 0.5) * dTh, st = Math.sin(th), y = Math.cos(th), dw = st * dTh * dPhi;
    for (let i = 0; i < w; i++) {
      const ph = ((i + 0.5) / w - 0.5) * 2 * Math.PI, x = st * Math.sin(ph), z = -st * Math.cos(ph);
      const Y = [0.282095, 0.488603 * y, 0.488603 * z, 0.488603 * x, 1.092548 * x * y, 1.092548 * y * z, 0.315392 * (3 * z * z - 1), 1.092548 * x * z, 0.546274 * (x * x - y * y)];
      const k = (j * w + i) * 4;
      for (let b = 0; b < 9; b++) for (let ch = 0; ch < 3; ch++) c[b * 3 + ch] += px[k + ch] * Y[b] * dw;
    }
  }
  for (let b = 0; b < 9; b++) for (let ch = 0; ch < 3; ch++) c[b * 3 + ch] *= A[b] / Math.PI;
  return c;
}

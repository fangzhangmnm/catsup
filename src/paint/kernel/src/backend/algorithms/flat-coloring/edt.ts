// 线稿填色（论文 Fourey–Tschumperlé–Revoy 2018，paper_references/）配套工具：
// 精确欧氏距离平方变换（Meijster 线性算法）。feature 非 0 处距离 0，
// 其余像素 = 到最近 feature 像素（中心到中心）的距离平方。
// 用途：笔画半宽估计（feature=背景）+ 粗笔画细化腐蚀。纯函数无 DOM，node 直测。
export function edtSquared(feature: Uint8Array, w: number, h: number): Int32Array {
  const INF = w + h; // 列内距离上界；平方后 (w+h)² 仍在 Int32 内（doc ≤ 8192 级）
  const g = new Int32Array(w * h);
  // 阶段 1：每列上下两遍 → 列内最近 feature 的 |Δy|
  for (let x = 0; x < w; x++) {
    g[x] = feature[x] ? 0 : INF;
    for (let y = 1; y < h; y++) {
      const i = y * w + x;
      g[i] = feature[i] ? 0 : Math.min(INF, g[i - w] + 1);
    }
    for (let y = h - 2; y >= 0; y--) {
      const i = y * w + x;
      if (g[i + w] + 1 < g[i]) g[i] = g[i + w] + 1;
    }
  }
  // 阶段 2：每行抛物线下包络（Meijster 的 s/t 栈扫描）
  const out = new Int32Array(w * h);
  const s = new Int32Array(w);
  const t = new Int32Array(w);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    let q = 0;
    s[0] = 0;
    t[0] = 0;
    for (let u = 1; u < w; u++) {
      const gu = g[row + u];
      while (q >= 0) {
        const tq = t[q], sq = s[q], gs = g[row + sq];
        if ((tq - sq) * (tq - sq) + gs * gs <= (tq - u) * (tq - u) + gu * gu) break;
        q--;
      }
      if (q < 0) {
        q = 0;
        s[0] = u;
      } else {
        const sq = s[q], gs = g[row + sq];
        const sep = Math.floor((u * u - sq * sq + gu * gu - gs * gs) / (2 * (u - sq))) + 1;
        if (sep < w) {
          q++;
          s[q] = u;
          t[q] = sep;
        }
      }
    }
    for (let x = w - 1; x >= 0; x--) {
      const sq = s[q], gs = g[row + sq];
      out[row + x] = (x - sq) * (x - sq) + gs * gs;
      if (x === t[q]) q--;
    }
  }
  return out;
}

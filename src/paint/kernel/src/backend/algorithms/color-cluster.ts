// 职责（单一）：RGBA 字节的颜色聚类（k-means）+ 硬分配拆分。纯数学、零 canvas / 零 DOM
//   （家规：字节进出不走 canvas）。消费方 = explode-layers（按颜色拆分图层 sheet）。
//
// 语义拍板（2026-07-30，user：「explode 的时候非黑即白」）：**硬分配**——每个像素整体归入
//   最近中心色的那一层，不做羽化/权重摊分。分片两两互斥、并集 = 原层（连 alpha 原样带走），
//   所以 source-over 堆叠与原层逐字节一致；其他混合模式下因分片互斥、空像素透明=恒等，
//   逐像素也等价。透明像素（a=0）不属于任何簇。
//
// 确定性：不用 Math.random——maximin 播种（首心 = 距全体均值最远的样本，之后每次取
//   「离已有中心最近距离」最大的样本）+ Lloyd 迭代。同输入同 k 必同输出（sheet 预览可复现）。

export interface ColorCluster {
  center: [number, number, number];   // 0-255 RGB（四舍五入后的簇心）
  share: number;                      // 样本占比 0..1（按 alpha 加权；预览显示用）
}

// 采样收集：步进抽样把参与迭代的像素压到 maxSamples 级（4M px 的层也毫秒级收敛）。
// 距离在直 RGB 空间；样本按 alpha/255 加权（半透明边缘像素少数服从多数，不把簇心拽偏）。
function collectSamples(rgba: Uint8ClampedArray, maxSamples: number) {
  const nPx = rgba.length >> 2;
  const step = Math.max(1, Math.floor(nPx / maxSamples));
  const pts: number[] = [];   // 扁平 [r,g,b,w, ...]
  for (let i = 0; i < nPx; i += step) {
    const o = i << 2;
    const a = rgba[o + 3];
    if (a === 0) continue;
    pts.push(rgba[o], rgba[o + 1], rgba[o + 2], a / 255);
  }
  return pts;
}

function dist2(r: number, g: number, b: number, c: Float64Array, ci: number) {
  const dr = r - c[ci], dg = g - c[ci + 1], db = b - c[ci + 2];
  return dr * dr + dg * dg + db * db;
}

// k-means（Lloyd）。返回按 share 降序的簇（share=0 的空簇已丢弃，长度可能 < k）。
// 全透明输入 → []。
export function clusterColors(
  rgba: Uint8ClampedArray, k: number,
  { maxSamples = 50_000, iters = 24 }: { maxSamples?: number; iters?: number } = {},
): ColorCluster[] {
  if (k < 1) return [];
  const pts = collectSamples(rgba, maxSamples);
  const n = pts.length / 4;
  if (n === 0) return [];
  const kk = Math.min(k, n);

  // maximin 播种：c0 = 离加权均值最远的样本；其后每轮取 min-dist 最大的样本。
  const centers = new Float64Array(kk * 3);
  {
    let mr = 0, mg = 0, mb = 0, mw = 0;
    for (let i = 0; i < n; i++) {
      const w = pts[i * 4 + 3];
      mr += pts[i * 4] * w; mg += pts[i * 4 + 1] * w; mb += pts[i * 4 + 2] * w; mw += w;
    }
    mr /= mw; mg /= mw; mb /= mw;
    const minD = new Float64Array(n).fill(Infinity);
    let seedR = mr, seedG = mg, seedB = mb;   // 首轮「已有中心」= 均值（本身不入列）
    for (let c = 0; c < kk; c++) {
      let best = 0, bestD = -1;
      for (let i = 0; i < n; i++) {
        const dr = pts[i * 4] - seedR, dg = pts[i * 4 + 1] - seedG, db = pts[i * 4 + 2] - seedB;
        const d = dr * dr + dg * dg + db * db;
        if (d < minD[i]) minD[i] = d;
        if (minD[i] > bestD) { bestD = minD[i]; best = i; }
      }
      centers[c * 3] = seedR = pts[best * 4];
      centers[c * 3 + 1] = seedG = pts[best * 4 + 1];
      centers[c * 3 + 2] = seedB = pts[best * 4 + 2];
      minD[best] = 0;
    }
  }

  // Lloyd 迭代：assign → 加权均值更新；空簇 reseed 到当前最远样本；簇心移动 < 0.5 提前收敛。
  const sum = new Float64Array(kk * 4);   // [Σwr, Σwg, Σwb, Σw] × kk
  const assign = new Int32Array(n);
  for (let it = 0; it < iters; it++) {
    sum.fill(0);
    let worst = 0, worstD = -1;
    for (let i = 0; i < n; i++) {
      const r = pts[i * 4], g = pts[i * 4 + 1], b = pts[i * 4 + 2], w = pts[i * 4 + 3];
      let bi = 0, bd = Infinity;
      for (let c = 0; c < kk; c++) {
        const d = dist2(r, g, b, centers, c * 3);
        if (d < bd) { bd = d; bi = c; }
      }
      assign[i] = bi;
      if (bd > worstD) { worstD = bd; worst = i; }
      const s = bi * 4;
      sum[s] += r * w; sum[s + 1] += g * w; sum[s + 2] += b * w; sum[s + 3] += w;
    }
    let moved = 0;
    for (let c = 0; c < kk; c++) {
      let nr: number, ng: number, nb: number;
      if (sum[c * 4 + 3] === 0) {   // 空簇 → reseed 到最远样本
        nr = pts[worst * 4]; ng = pts[worst * 4 + 1]; nb = pts[worst * 4 + 2];
      } else {
        nr = sum[c * 4] / sum[c * 4 + 3]; ng = sum[c * 4 + 1] / sum[c * 4 + 3]; nb = sum[c * 4 + 2] / sum[c * 4 + 3];
      }
      moved = Math.max(moved, Math.abs(nr - centers[c * 3]), Math.abs(ng - centers[c * 3 + 1]), Math.abs(nb - centers[c * 3 + 2]));
      centers[c * 3] = nr; centers[c * 3 + 1] = ng; centers[c * 3 + 2] = nb;
    }
    if (moved < 0.5) break;
  }

  // share：末次 assign 的加权占比。空簇丢弃，按 share 降序。
  const wsum = new Float64Array(kk);
  let wtot = 0;
  for (let i = 0; i < n; i++) { wsum[assign[i]] += pts[i * 4 + 3]; wtot += pts[i * 4 + 3]; }
  const out: ColorCluster[] = [];
  for (let c = 0; c < kk; c++) {
    if (wsum[c] === 0) continue;
    out.push({
      center: [Math.round(centers[c * 3]), Math.round(centers[c * 3 + 1]), Math.round(centers[c * 3 + 2])],
      share: wsum[c] / wtot,
    });
  }
  out.sort((a, b) => b.share - a.share);
  return out;
}

// 硬分配拆分：每个非透明像素整体（原 RGBA 一字不改）落进最近中心色的分片；其余分片该处全 0。
// 返回每簇分片字节 + 全分辨率像素计数。分片互斥、∪ = 原字节。
export function partitionByNearest(
  rgba: Uint8ClampedArray, centers: [number, number, number][],
): { parts: Uint8ClampedArray[]; counts: number[] } {
  const kk = centers.length;
  const flat = new Float64Array(kk * 3);
  for (let c = 0; c < kk; c++) { flat[c * 3] = centers[c][0]; flat[c * 3 + 1] = centers[c][1]; flat[c * 3 + 2] = centers[c][2]; }
  const parts: Uint8ClampedArray[] = [];
  for (let c = 0; c < kk; c++) parts.push(new Uint8ClampedArray(rgba.length));
  const counts = new Array<number>(kk).fill(0);
  const nPx = rgba.length >> 2;
  for (let i = 0; i < nPx; i++) {
    const o = i << 2;
    const a = rgba[o + 3];
    if (a === 0) continue;
    const r = rgba[o], g = rgba[o + 1], b = rgba[o + 2];
    let bi = 0, bd = Infinity;
    for (let c = 0; c < kk; c++) {
      const d = dist2(r, g, b, flat, c * 3);
      if (d < bd) { bd = d; bi = c; }
    }
    const p = parts[bi];
    p[o] = r; p[o + 1] = g; p[o + 2] = b; p[o + 3] = a;
    counts[bi]++;
  }
  return { parts, counts };
}

export function hexOf(c: [number, number, number]): string {
  return "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");
}

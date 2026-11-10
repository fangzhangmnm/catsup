// 线稿分区总管线（论文 Fourey–Tschumperlé–Revoy 2018）：
//   RGBA → 白底亮度二值化 → 笔画半宽估计（EDT 中位数）+ 粗笔细化腐蚀（§3）
//   → 端点检测（border.ts，§4）→ 笔画闭合（closing.ts，§5）
//   → 背景 4-连通区 label（§6.1）→ 洋葱剥皮把 label 推进笔画像素（多源 BFS
//     ≈ 论文的 watershed onion-peel，城市距离代替精确 EDT，逐层确定性传播）。
// 产物 = 全图 label map：每个像素属于哪个「闭合区域」，笔画像素也被两侧区域
// 瓜分到中线——魔棒 tap 查表即得区域 mask，颜色自然填到线条下面（消 AA 白边）。
// 纯函数无 DOM，node 直测；app 侧接缝（缓存/Selection 转换）在 src/ 顶层，不进本目录。

import { edtSquared } from "./edt.ts";
import { keypointsFromBinary } from "./border.ts";
import { closeStrokes } from "./closing.ts";
import type { Keypoint } from "./border.ts";
import type { BridgeDebug } from "./closing.ts";

export interface FlatColoringParams {
  /** 白底合成亮度 ≤ 此值（0..255）判为笔画 */
  binarizeThreshold: number;
  /** 法线平滑核半径 L */
  kernelL: number;
  /** 端点曲率阈值 θκ */
  thetaKappa: number;
  /** 样条配对最大距离 px（≤0 关闭） */
  dmax: number;
  /** 法线对置容差角（度） */
  alphaDeg: number;
  /** 样条切线系数 ρ */
  rho: number;
  /** 最小允许背景区面积 */
  amin: number;
  /** 补段最大长度 px（≤0 关闭） */
  smax: number;
  /** 每端点最多闭合笔画数 */
  cmax: number;
  /** 粗笔自动细化（腐蚀到几 px 再分析；论文 §3） */
  erode: boolean;
}

// 论文声称同一组默认参数跑遍全部实验图；这里的数值按同精神取，测试图上调定。
export const DEFAULT_FLAT_COLORING_PARAMS: FlatColoringParams = {
  binarizeThreshold: 128,
  kernelL: 5,
  thetaKappa: 0.24,
  dmax: 64,
  alphaDeg: 90,
  rho: 1.0,
  amin: 32,
  smax: 48,
  cmax: 2,
  erode: true,
};

export interface FlatColoringPartition {
  w: number;
  h: number;
  /** 每像素区域号 1..regionCount；0 = 无区域（仅整图全笔画的病态情形） */
  labels: Int32Array;
  regionCount: number;
  /** 每区 tight bbox，[label-1] 起 4 元 (x0,y0,x1,y1) 闭区间 */
  bboxes: Int32Array;
  /** 估出的笔画半宽（px），调参/诊断用 */
  strokeHalfWidth: number;
  /** 调试视图（v0.7.4）：检出的端点（腐蚀后坐标）+ 候选桥（含被守卫毙的） */
  keypoints: Keypoint[];
  bridges: BridgeDebug[];
  /** 每像素「陷进真墨水多深」：0=非墨水（背景或虚拟闭合桥）；≥1=原始二值墨水像素到最近
   *  背景的欧氏距离（ceil，封顶 255）。蔓延过滤基底（v0.7.17 像素画模式）：按**原始**墨水算
   *  （非腐蚀后）——粗线腐蚀掉的表皮仍是可见墨水，蔓延小时不该被填。
   *  v0.7.19 懒构建（user：自动档吃灰内存省下来）：build 不算（null），第一次 bleed≥0 查询时
   *  由 oracle 用 attachInkDepth 补算挂上（2K 图省 4MB 常驻）。 */
  inkDepth: Uint8Array | null;
}

/** 懒补 inkDepth（v0.7.19）：Ib0 = 原始二值墨水（oracle 按同一墨线判定重新 binarize）。 */
export function attachInkDepth(part: FlatColoringPartition, Ib0: Uint8Array): void {
  const { w, h } = part;
  const bg = new Uint8Array(w * h);
  for (let i = 0; i < bg.length; i++) bg[i] = Ib0[i] ? 0 : 1;
  const distSq = edtSquared(bg, w, h);
  const depth = new Uint8Array(w * h);
  for (let i = 0; i < depth.length; i++) {
    if (Ib0[i]) depth[i] = Math.min(255, Math.ceil(Math.sqrt(distSq[i])));
  }
  part.inkDepth = depth;
}

/** RGBA（straight alpha）→ 二值笔画图：合成到白底的亮度 ≤ θ 判为笔画。透明 = 白 = 背景。 */
export function binarizeLuma(
  rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, threshold: number,
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0, o = 0; i < out.length; i++, o += 4) {
    const a = rgba[o + 3] / 255;
    const gray = 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2];
    const lum = 255 + (gray - 255) * a;
    if (lum <= threshold) out[i] = 1;
  }
  return out;
}

/** alpha 二值化：落了笔（alpha ≥ minAlpha）即墨线，亮度无关——透明底线稿层的正解
 *  （淡色线稿在亮度判定下只剩最深的芯，整张成虚线；见 resolveInkBinarization）。 */
export function binarizeAlpha(
  rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, minAlpha = 26,
): Uint8Array {
  const out = new Uint8Array(w * h);
  for (let i = 0, o = 3; i < out.length; i++, o += 4) {
    if (rgba[o] >= minAlpha) out[i] = 1;
  }
  return out;
}

/** 动态墨线判定的分派结果：mode 供 UI 提示/诊断；thresholdLuma 仅 luma 系模式有值。 */
export interface InkResolution {
  /** alpha=透明底线稿层；otsu=稠密图（扫描/带填色）自动定阈；manual=手动百分比 */
  mode: "alpha" | "otsu" | "manual";
  /** 白底合成亮度阈值（0..255）；alpha 模式 = null */
  thresholdLuma: number | null;
  /** 落笔（alpha≥10%）覆盖率 0..1，稀疏/稠密分派依据 */
  coverage: number;
  Ib: Uint8Array;
}

/** 墨线判定分派（v0.10.11 动态档，user 2026-08-20 拍板动态为默认）：
 *  inkPct ≥ 0 → 手动档，白底亮度 ≤ pct·2.55（原有行为）。
 *  inkPct < 0 → 动态档：落笔覆盖率 ≤25% 判为透明底线稿层 → alpha 档（落笔即墨线，
 *    淡线稿救星——实案：亮度中位数 190 的线稿在默认 50% 手动档下只剩 13% 笔迹，全图漏成一区）；
 *  覆盖率 >25%（白底扫描/带填色）→ 白底亮度 Otsu 自动定阈，夹在 [30%,90%]·2.55。
 *  注意带填色图的固有语义：浅色填充=可穿背景、深色填充=墙——lineart 算法契约是线稿参考层，
 *  稠密源由 oracle 出 UI 提示引导换 classic 魔棒。 */
export function resolveInkBinarization(
  rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, inkPct: number,
): InkResolution {
  const n = w * h;
  if (inkPct >= 0) {
    const th = Math.max(0, Math.min(100, inkPct)) * 2.55;
    return { mode: "manual", thresholdLuma: th, coverage: -1, Ib: binarizeLuma(rgba, w, h, th) };
  }
  let drawn = 0;
  for (let i = 0, o = 3; i < n; i++, o += 4) if (rgba[o] >= 26) drawn++;
  const coverage = drawn / n;
  if (coverage <= 0.25) {
    return { mode: "alpha", thresholdLuma: null, coverage, Ib: binarizeAlpha(rgba, w, h) };
  }
  // 白底合成亮度直方图 → Otsu（类间方差最大）
  const hist = new Float64Array(256);
  for (let i = 0, o = 0; i < n; i++, o += 4) {
    const a = rgba[o + 3] / 255;
    const gray = 0.2126 * rgba[o] + 0.7152 * rgba[o + 1] + 0.0722 * rgba[o + 2];
    const lum = Math.round(255 + (gray - 255) * a);
    hist[lum < 0 ? 0 : lum > 255 ? 255 : lum]++;
  }
  let sumAll = 0;
  for (let t = 0; t < 256; t++) sumAll += t * hist[t];
  let sumB = 0, wB = 0, best = -1, bestT = 128;
  for (let t = 0; t < 256; t++) {
    wB += hist[t];
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += t * hist[t];
    const mB = sumB / wB, mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) { best = between; bestT = t; }
  }
  const th = Math.max(30 * 2.55, Math.min(90 * 2.55, bestT));
  return { mode: "otsu", thresholdLuma: th, coverage, Ib: binarizeLuma(rgba, w, h, th) };
}

/** 笔画半宽估计：EDT 脊线（距离场 8-邻域局部极大）像素取「到背景距离」的中位数。
 *
 *  论文 §3 原式是「每个 8-连通组件取最大距离，跨组件取中位数」——它假设笔画散成许多独立
 *  组件。全连通线稿（粗线互相勾连成 1 个组件）会把中位数退化成全局最大值：组件里只要有
 *  一坨实心填充（如铅笔笔尖），估出的"半宽"= 那坨的内切半径，腐蚀随即把真实 2-3px 的线条
 *  整张蒸发（2026-08-20 铅笔图标实案：估 10、实 2，6747px 腐蚀余 266px → 全图一区）。
 *  脊线中位数按「骨架长度」加权采样：长线条贡献海量脊点、实心坨只贡献中心几点，对两种
 *  病态（全连通、实心块）都稳健；纯粗笔图（如厚 8 圆环）脊线距离 ≈ 真半宽，行为不变。 */
export function strokeHalfWidthMedian(Ib: Uint8Array, w: number, h: number, distSq: Int32Array): number {
  const ridge: number[] = [];
  for (let p = 0; p < Ib.length; p++) {
    if (!Ib[p]) continue;
    const d = distSq[p];
    const px = p % w, py = (p / w) | 0;
    let isMax = true;
    for (let dy = -1; dy <= 1 && isMax; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const qx = px + dx, qy = py + dy;
        if (qx < 0 || qx >= w || qy < 0 || qy >= h) continue;
        if (distSq[qy * w + qx] > d) { isMax = false; break; }
      }
    }
    if (isMax) ridge.push(Math.sqrt(d));
  }
  if (ridge.length === 0) return 0;
  ridge.sort((a, b) => a - b);
  return ridge[ridge.length >> 1];
}

/** 背景（Ic==0）4-连通区 label，1 起编号；顺带记 tight bbox。 */
function labelRegions(Ic: Uint8Array, w: number, h: number): { labels: Int32Array; count: number; bboxes: number[] } {
  const labels = new Int32Array(w * h);
  const bboxes: number[] = [];
  const stack: number[] = [];
  let count = 0;
  for (let p0 = 0; p0 < Ic.length; p0++) {
    if (Ic[p0] !== 0 || labels[p0] !== 0) continue;
    count++;
    let x0 = w, y0 = h, x1 = -1, y1 = -1;
    stack.length = 0;
    stack.push(p0);
    labels[p0] = count;
    while (stack.length) {
      const p = stack.pop()!;
      const px = p % w, py = (p / w) | 0;
      if (px < x0) x0 = px; if (px > x1) x1 = px;
      if (py < y0) y0 = py; if (py > y1) y1 = py;
      if (px > 0 && Ic[p - 1] === 0 && labels[p - 1] === 0) { labels[p - 1] = count; stack.push(p - 1); }
      if (px < w - 1 && Ic[p + 1] === 0 && labels[p + 1] === 0) { labels[p + 1] = count; stack.push(p + 1); }
      if (py > 0 && Ic[p - w] === 0 && labels[p - w] === 0) { labels[p - w] = count; stack.push(p - w); }
      if (py < h - 1 && Ic[p + w] === 0 && labels[p + w] === 0) { labels[p + w] = count; stack.push(p + w); }
    }
    bboxes.push(x0, y0, x1, y1);
  }
  return { labels, count, bboxes };
}

/** 洋葱剥皮：多源 BFS 把区域 label 逐层推进笔画像素（含闭合虚线），bbox 同步扩。 */
function propagateUnderStrokes(labels: Int32Array, w: number, h: number, bboxes: number[]): void {
  const queue = new Int32Array(w * h);
  let head = 0, tail = 0;
  // 种子 = 已 label 像素（都是背景区），向 4 邻的未 label（笔画）像素扩
  for (let p = 0; p < labels.length; p++) if (labels[p] !== 0) queue[tail++] = p;
  while (head < tail) {
    const p = queue[head++];
    const lab = labels[p];
    const px = p % w, py = (p / w) | 0;
    for (let d = 0; d < 4; d++) {
      const qx = px + (d === 1 ? 1 : d === 3 ? -1 : 0);
      const qy = py + (d === 2 ? 1 : d === 0 ? -1 : 0);
      if (qx < 0 || qx >= w || qy < 0 || qy >= h) continue;
      const q = qy * w + qx;
      if (labels[q] !== 0) continue;
      labels[q] = lab;
      const b = (lab - 1) * 4;
      if (qx < bboxes[b]) bboxes[b] = qx;
      if (qy < bboxes[b + 1]) bboxes[b + 1] = qy;
      if (qx > bboxes[b + 2]) bboxes[b + 2] = qx;
      if (qy > bboxes[b + 3]) bboxes[b + 3] = qy;
      queue[tail++] = q;
    }
  }
}

/** 二值笔画图 → 分区（测试与调参入口；buildFlatColoringPartition 的后半段）。 */
export function buildPartitionFromBinary(
  Ib0: Uint8Array, w: number, h: number, params: FlatColoringParams = DEFAULT_FLAT_COLORING_PARAMS,
): FlatColoringPartition {
  let Ib = Ib0;
  let halfW = 0;
  let hasStroke = false;
  for (let i = 0; i < Ib.length; i++) if (Ib[i]) { hasStroke = true; break; }

  if (hasStroke) {
    // EDT（feature=背景）→ 半宽估计 → 必要时腐蚀细化
    const bg = new Uint8Array(w * h);
    for (let i = 0; i < bg.length; i++) bg[i] = Ib[i] ? 0 : 1;
    const distSq = edtSquared(bg, w, h);
    halfW = strokeHalfWidthMedian(Ib, w, h, distSq);
    if (params.erode && halfW > 3) {
      // 目标：细化到 2-3px 半宽；腐蚀半径封顶防细线整段蒸发（断口交给闭合步骤修，论文 §3）
      const r = Math.min(Math.floor(halfW) - 2, 4);
      const rSq = r * r;
      const eroded = new Uint8Array(w * h);
      let before = 0, after = 0;
      for (let i = 0; i < Ib.length; i++) {
        if (!Ib[i]) continue;
        before++;
        if (distSq[i] > rSq) { eroded[i] = 1; after++; }
      }
      // 存活率护栏：细化 ≠ 歼灭。合法腐蚀（半宽 5..10+ 的真粗笔，r≤4）至少留 ~1/3 截面核；
      //   掉到 1/4 以下只能是半宽估计被骗（细线图被重腐蚀）→ 放弃腐蚀按原图分析。
      //   脊线估计下几乎不可能触发（细线一多中位数自稳），纯 backstop——腐蚀只是优化，跳过恒安全。
      if (after * 4 >= before) Ib = eroded;
    }
  }

  const kps = hasStroke
    ? keypointsFromBinary(Ib, w, h, { kernelL: params.kernelL, thetaKappa: params.thetaKappa })
    : [];
  const closed = hasStroke ? closeStrokes(Ib, w, h, kps, params) : null;
  const Ic = closed ? closed.Ic : Ib;

  const { labels, count, bboxes } = labelRegions(Ic, w, h);
  if (count > 0) propagateUnderStrokes(labels, w, h, bboxes);
  return {
    w, h, labels, regionCount: count, bboxes: Int32Array.from(bboxes), strokeHalfWidth: halfW,
    keypoints: kps, bridges: closed ? closed.bridges : [],
    inkDepth: null,   // 懒构建：bleed≥0 首查时 attachInkDepth（自动档不花这块内存）
  };
}

/** 总入口：RGBA → 分区。 */
export function buildFlatColoringPartition(
  rgba: Uint8Array | Uint8ClampedArray, w: number, h: number, params: FlatColoringParams = DEFAULT_FLAT_COLORING_PARAMS,
): FlatColoringPartition {
  return buildPartitionFromBinary(binarizeLuma(rgba, w, h, params.binarizeThreshold), w, h, params);
}

/** tap 查表：(x,y) 所在区域的 tight-bbox gray8 mask（255/0）。无区域 → null。
 *  bleedPx（v0.7.17 蔓延距离，query-time 参数不碰缓存）：-1=自动（填到中线，现行为）；
 *  ≥0 = 最多陷进真墨水 bleedPx（0=像素画模式，真墨水一个不碰；虚拟闭合桥不是墨水，恒可跨）。 */
export function regionMaskAt(
  part: FlatColoringPartition, x: number, y: number, bleedPx = -1,
): { x: number; y: number; w: number; h: number; mask: Uint8Array } | null {
  const xi = Math.floor(x), yi = Math.floor(y);
  if (xi < 0 || xi >= part.w || yi < 0 || yi >= part.h) return null;
  const lab = part.labels[yi * part.w + xi];
  if (lab === 0) return null;
  const b = (lab - 1) * 4;
  const x0 = part.bboxes[b], y0 = part.bboxes[b + 1];
  const bw = part.bboxes[b + 2] - x0 + 1, bh = part.bboxes[b + 3] - y0 + 1;
  const mask = new Uint8Array(bw * bh);
  const capped = bleedPx >= 0 ? Math.min(255, bleedPx) : -1;
  if (capped >= 0 && !part.inkDepth) {
    // 调用方 bug（oracle 该先 attachInkDepth）——响亮抛，别静默按自动放行
    throw new Error("regionMaskAt: bleed>=0 but inkDepth not built (call attachInkDepth first)");
  }
  const inkDepth = part.inkDepth;
  for (let ry = 0; ry < bh; ry++) {
    const row = (y0 + ry) * part.w;
    for (let rx = 0; rx < bw; rx++) {
      const p = row + x0 + rx;
      if (part.labels[p] !== lab) continue;
      if (capped >= 0 && inkDepth![p] > capped) continue;
      mask[ry * bw + rx] = 255;
    }
  }
  return { x: x0, y: y0, w: bw, h: bh, mask };
}

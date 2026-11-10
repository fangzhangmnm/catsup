// 魔棒算法内核（C3 从 lasso.ts 析出；窄 I/O：像素平面进 → gray8 region 出，零 Selection/UI 知识）。
// 三个算法（同一 makeSeedDist 判据族，行为逐字保留 v242 起的历史语义——出口包装在 lasso.ts）：
//   - floodRegionFrom：四连通泛洪（贴 AA 边缘半透明处停，不 bake 膨胀）
//   - 容隙（gapPx>0）：形态学开运算切主体/细部，细部整块归属种子侧（v0.7.24 立，2026-09-06 升级）
//   - similarRegionFrom：同色全图（同判据不要求连通，v0.7.21）
//
// 经典 bug（v66 + v69 又犯）：iteration 局限在 layer.bbox 内 → 点空白只选到 bbox 矩形。
// 修：迭代**整 doc 尺寸**，layer.bbox 外当 (0,0,0,0) 透明像素。
// 历史「容隙」v71→v79 撤掉过（barrier dilate 会盖住 tap 点），详 ai-docs/20260528-lessons-magic-wand-gap-closing.md。
// 内存（2048² doc）：layerData 16MB + combined buffer 4MB（0=未访问 1=进mask 2=barrier，三数组合一省 8MB）。

import { makeSeedDist } from "../../common/color-dist.ts";
import type { ColorMetric } from "../../common/color-dist.ts";
import { edtSquared } from "./flat-coloring/edt.ts";

interface Point { x: number; y: number; }

// 源层的结构化最小面（app 侧传 ViewLeaf；node 测试传 mock——tiles 直读，
//   旧 ctx.getImageData 的 premult 往返会歪低 α 处 RGB → 魔棒容差边缘漂，v0.6.39）。
export interface WandSourceLayer {
  readonly bboxX: number; readonly bboxY: number;
  readonly bboxW: number; readonly bboxH: number;
  getImageData(x: number, y: number, w: number, h: number): { data: Uint8ClampedArray };
}

// 产出：doc 坐标 bbox + gray8 掩码（255=入选；恒二值——选区二值不变量，user 2026-07-29）。
export interface Gray8Region { x: number; y: number; w: number; h: number; gray8: Uint8Array }

// v0.7.23 选区当墙（user 2026-07-30：「add模式下已经选中的区域应该也记作stop」）：
//   bbox 对齐 gray8 平面，>0 处 flood 不能进。种子豁免在内核里：tap 点已在墙里 → 整面墙忽略
//   （fill 默认 union 且选区到 ✓ 前一直累积——调容差后**原地重 tap** 是核心调参循环，不豁免则第二下必哑）。
export interface FloodStopMask { x: number; y: number; w: number; h: number; data: Uint8Array }

// mark 平面（1=入选）→ 裁 bbox 的 Gray8Region；无入选 → null。
function markToRegion(mark: Uint8Array, docW: number, mnx: number, mny: number, mxx: number, mxy: number): Gray8Region | null {
  if (mxx < 0) return null;
  const tw = mxx - mnx + 1, th = mxy - mny + 1;
  const g = new Uint8Array(tw * th);
  for (let y = 0; y < th; y++) for (let x = 0; x < tw; x++) {
    if (mark[(mny + y) * docW + (mnx + x)] === 1) g[y * tw + x] = 255;
  }
  return { x: mnx, y: mny, w: tw, h: th, gray8: g };
}

export function floodRegionFrom(
  doc: { width: number; height: number },
  start: Point | null,
  sourceLayer: WandSourceLayer | null,
  thresholdPct: number,
  metric: ColorMetric = "rgb",   // v0.7.21：默认 rgb = v242 逐字语义；app 侧灌 desk 的度量
  stopMask: FloodStopMask | null = null,
  gapPx = 0,                     // v0.7.24 容隙：>0 = 缺口宽 <gapPx 处 flood 过不去（0=关）
): Gray8Region | null {
  if (!start) return null;
  const docW = doc.width, docH = doc.height;
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  if (sx < 0 || sx >= docW || sy < 0 || sy >= docH) return null;

  const lbX = sourceLayer?.bboxX ?? 0;
  const lbY = sourceLayer?.bboxY ?? 0;
  const lbW = sourceLayer?.bboxW ?? 0;
  const lbH = sourceLayer?.bboxH ?? 0;
  let layerData: Uint8ClampedArray | null = null;
  if (sourceLayer && lbW > 0 && lbH > 0) {
    layerData = sourceLayer.getImageData(lbX, lbY, lbW, lbH).data;
  }
  // tap 点颜色（layer 外 → 透明）
  let sr = 0, sg = 0, sb = 0, sa = 0;
  if (layerData && sx >= lbX && sx < lbX + lbW && sy >= lbY && sy < lbY + lbH) {
    const idx = ((sy - lbY) * lbW + (sx - lbX)) * 4;
    sr = layerData[idx]; sg = layerData[idx + 1]; sb = layerData[idx + 2]; sa = layerData[idx + 3];
  }
  // 判据 = color-dist.makeSeedDist（rgb=原 max 通道语义逐字等价；oklab=感知 ΔE，α 独立通道）。
  const dist = makeSeedDist(metric, sr, sg, sb, sa);
  const tFrac = thresholdPct / 100;
  const total = docW * docH;

  // 「layer 外」的 barrier 算一次：透明 (0,0,0,0) 跟 tap 色的距离
  const outsideIsBarrier = dist(0, 0, 0, 0) > tFrac;
  // v0.7.23 选区墙：种子豁免（tap 点已选 → 本次忽略墙；union 调容差后原地重 tap 不许哑）
  let stop = stopMask;
  if (stop) {
    const ix = sx - stop.x, iy = sy - stop.y;
    if (ix >= 0 && iy >= 0 && ix < stop.w && iy < stop.h && stop.data[iy * stop.w + ix] > 0) stop = null;
  }
  // inline barrier 检查：返回 true = 是 barrier = flood 不能进
  const isBarrier = (p: number) => {
    const py = (p / docW) | 0;
    const px = p - py * docW;
    if (stop) {
      const ix = px - stop.x, iy = py - stop.y;
      if (ix >= 0 && iy >= 0 && ix < stop.w && iy < stop.h && stop.data[iy * stop.w + ix] > 0) return true;
    }
    if (!layerData || px < lbX || px >= lbX + lbW || py < lbY || py >= lbY + lbH) {
      return outsideIsBarrier;
    }
    const i4 = ((py - lbY) * lbW + (px - lbX)) * 4;
    return dist(layerData[i4], layerData[i4 + 1], layerData[i4 + 2], layerData[i4 + 3]) > tFrac;
  };

  const startIdx = sx + sy * docW;
  if (isBarrier(startIdx)) return null;

  // v0.7.24 容隙（2026-09-06 升级为「细部整块归属」，见 _gapFloodMask 头注释）——不是 v71 的 barrier dilate（会盖死 tap 点）。
  if (gapPx > 0) {
    const mark = _gapFloodMask(docW, docH, startIdx, gapPx, isBarrier);
    if (mark) {
      let mnx = docW, mny = docH, mxx = -1, mxy = -1;
      for (let p = 0; p < total; p++) {
        if (mark[p] !== 1) continue;
        const px = p % docW, py = (p - px) / docW;
        if (px < mnx) mnx = px; if (px > mxx) mxx = px;
        if (py < mny) mny = py; if (py > mxy) mxy = py;
      }
      return markToRegion(mark, docW, mnx, mny, mxx, mxy);
    }
    // mark=null → 种子 r 步内摸不到开阔区（整个可达区都窄）→ 诚实降级普通 flood（不吞 tap）
  }

  const combined = new Uint8Array(total);
  const stack = [startIdx];
  let mnx = docW, mny = docH, mxx = -1, mxy = -1;
  while (stack.length) {
    const p = stack.pop()!;
    if (combined[p] !== 0) continue;
    if (isBarrier(p)) { combined[p] = 2; continue; }
    combined[p] = 1;
    const px = p % docW;
    const py = (p - px) / docW;
    if (px < mnx) mnx = px; if (px > mxx) mxx = px;
    if (py < mny) mny = py; if (py > mxy) mxy = py;
    if (px > 0        && combined[p - 1]    === 0) stack.push(p - 1);
    if (px < docW - 1 && combined[p + 1]    === 0) stack.push(p + 1);
    if (py > 0        && combined[p - docW] === 0) stack.push(p - docW);
    if (py < docH - 1 && combined[p + docW] === 0) stack.push(p + docW);
  }
  return markToRegion(combined, docW, mnx, mny, mxx, mxy);
}

// ---- 容隙内核（v0.7.24 立；2026-09-06 升级「细部整块归属」，handoff ai-docs/20260906-gap-closing-morphological-handoff.md §3）----
// 形态学开运算切分主体与细部：r = gapPx/2；N = 非 barrier；E = N 中离 barrier ≥ r（腐蚀核，Meijster 精确 EDT）；
// O = E 沿欧氏球 < r 膨胀（开运算；对全图所有 E 连通块做，不只种子那块）；T = N \ O = 细部（宽 < 2r 的通道、比圆盘尖的角、
// 细颈、缺口口部）。结果 = 种子所在的 O 连通块 ∪ 所有贴着它的 T 连通块（整块，不管多长——发梢填到尖端、走廊归先点的一侧），
// 绝不进入别的 O 连通块（缺口另一边的房间永远不漏）。
// 膨胀取**严格** < r：erosion 取 ≥ r、dilation 取 < r 才是连续开运算的离散对应——缺口口部离房间 E 恰好 r 的那一格是相切点，
// 取 ≤ 会把缺口两头各补一格接通（2 px 厚的墙留 3 px 缺口 r=3 就漏）。
// 旧版（v0.7.24）第 ③ 步只沿非 barrier 回贴膨胀 r 步，于是比 r 长的细尖填不到头、走廊只进 r 像素、缺口只填到中线。
// 种子在 T（画师爱贴线点，v71 教训）→ ≤ceil(r) 步口袋 BFS 找 O 接种；摸不到 / 全图无 E → 返 null 让调用方降级普通 flood。
// O(N)：两次 EDT + 一次 flood；2048² 百 ms 级（worker 化在 parked 单）。
function _gapFloodMask(
  docW: number, docH: number, startIdx: number, gapPx: number,
  isBarrier: (p: number) => boolean,
): Uint8Array | null {
  const total = docW * docH;
  const bar = new Uint8Array(total);
  for (let p = 0; p < total; p++) if (isBarrier(p)) bar[p] = 1;
  const edt2 = edtSquared(bar, docW, docH);
  const r = gapPx / 2;
  const r2 = r * r;
  const rCeil = Math.ceil(r);
  const forNeighbors = (p: number, fn: (q: number) => void) => {
    const px = p % docW, py = (p - px) / docW;
    if (px > 0) fn(p - 1);
    if (px < docW - 1) fn(p + 1);
    if (py > 0) fn(p - docW);
    if (py < docH - 1) fn(p + docW);
  };
  // ① E（腐蚀核）→ O（开运算：离 E 严格 < r 的非 barrier 像素）
  const E = new Uint8Array(total);
  let anyE = false;
  for (let p = 0; p < total; p++) if (!bar[p] && edt2[p] >= r2) { E[p] = 1; anyE = true; }
  if (!anyE) return null;   // 整图没有开阔区（r 大于一切房间半宽）→ 调用方降级普通 flood
  const edtE2 = edtSquared(E, docW, docH);
  const inO = new Uint8Array(total);
  for (let p = 0; p < total; p++) if (!bar[p] && edtE2[p] < r2) inO[p] = 1;
  // ② 种子：在 O 里直接开花；在 T 里 → ≤rCeil 步口袋 BFS 找 O 接种；摸不到 → null 降级
  const seeds: number[] = [];
  if (inO[startIdx]) seeds.push(startIdx);
  else {
    const seen = new Uint8Array(total);
    seen[startIdx] = 1;
    let frontier = [startIdx];
    for (let depth = 0; depth < rCeil && frontier.length && !seeds.length; depth++) {
      const next: number[] = [];
      for (const p of frontier) forNeighbors(p, (q) => {
        if (seen[q] || bar[q]) return;
        seen[q] = 1;
        if (inO[q]) seeds.push(q);
        next.push(q);
      });
      frontier = next;
    }
    if (!seeds.length) return null;
  }
  // ③ flood：O 内自由走（可进 T）；T 只进不出（从 T 只能继续走 T）→ 种子的 O 连通块 ∪ 贴着它的 T 连通块整块
  const mark = new Uint8Array(total);
  const stack = seeds.slice();
  while (stack.length) {
    const p = stack.pop()!;
    if (mark[p]) continue;
    mark[p] = 1;
    const fromO = inO[p] === 1;
    forNeighbors(p, (q) => { if (mark[q] || bar[q]) return; if (fromO || !inO[q]) stack.push(q); });
  }
  return mark;
}

// ---- 同色全图内核（v0.7.21 第三算法模式，user 2026-07-30 拍板）----
// 与 flood 同一判据（makeSeedDist）但**不要求连通**：tap 色的相似像素全 doc 入选。
// 用途 = 批量改色：同色选完直接走 fill 预览换色（ADR-0004 fill=选区消费视图，零新管线）。
// 语义与 floodRegionFrom 逐字对齐：迭代整 doc 尺寸、layer bbox 外当透明像素、出界 tap → null、
// 产出恒二值（选区二值不变量）。O(N) 单遍扫，无 prepare 缓存。
export function similarRegionFrom(
  doc: { width: number; height: number },
  start: Point | null,
  sourceLayer: WandSourceLayer | null,
  thresholdPct: number,
  metric: ColorMetric = "rgb",
): Gray8Region | null {
  if (!start) return null;
  const docW = doc.width, docH = doc.height;
  const sx = Math.floor(start.x);
  const sy = Math.floor(start.y);
  if (sx < 0 || sx >= docW || sy < 0 || sy >= docH) return null;

  const lbX = sourceLayer?.bboxX ?? 0;
  const lbY = sourceLayer?.bboxY ?? 0;
  const lbW = sourceLayer?.bboxW ?? 0;
  const lbH = sourceLayer?.bboxH ?? 0;
  let layerData: Uint8ClampedArray | null = null;
  if (sourceLayer && lbW > 0 && lbH > 0) {
    layerData = sourceLayer.getImageData(lbX, lbY, lbW, lbH).data;   // tiles 直读（v0.6.39 同 flood）
  }
  // tap 点颜色（layer 外 → 透明）
  let sr = 0, sg = 0, sb = 0, sa = 0;
  if (layerData && sx >= lbX && sx < lbX + lbW && sy >= lbY && sy < lbY + lbH) {
    const idx = ((sy - lbY) * lbW + (sx - lbX)) * 4;
    sr = layerData[idx]; sg = layerData[idx + 1]; sb = layerData[idx + 2]; sa = layerData[idx + 3];
  }
  const dist = makeSeedDist(metric, sr, sg, sb, sa);
  const tFrac = thresholdPct / 100;
  // 「layer 外」判一次（外面全是同一个透明像素）；tap 点自身 dist=0 恒入选 → 结果非空
  const outsideIn = !(dist(0, 0, 0, 0) > tFrac);

  const mark = new Uint8Array(docW * docH);
  let mnx = docW, mny = docH, mxx = -1, mxy = -1;
  for (let y = 0; y < docH; y++) {
    const rowIn = !!layerData && y >= lbY && y < lbY + lbH;
    const rowBase = y * docW;
    for (let x = 0; x < docW; x++) {
      let inSel: boolean;
      if (rowIn && x >= lbX && x < lbX + lbW) {
        const i4 = ((y - lbY) * lbW + (x - lbX)) * 4;
        inSel = !(dist(layerData![i4], layerData![i4 + 1], layerData![i4 + 2], layerData![i4 + 3]) > tFrac);
      } else {
        inSel = outsideIn;
      }
      if (inSel) {
        mark[rowBase + x] = 1;
        if (x < mnx) mnx = x; if (x > mxx) mxx = x;
        if (y < mny) mny = y; if (y > mxy) mxy = y;
      }
    }
  }
  return markToRegion(mark, docW, mnx, mny, mxx, mxy);
}

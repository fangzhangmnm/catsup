// paint/freed.ts —— 空出来的地方（施工单十八第 2 刀，现行版 + 统筹 11-13 深夜侦察之后补的三处）。created 2026-11-13 by Claude Opus 5.5
// 守的是：排法表一行里的 freed ∪ 现在有面占着的格 ⊇ 所有可能留着旧画的格。多记无害（补面时当占着、不往上放），少记不行（新面会落在旧画上 = 不变量 2）。
// 判法（不靠每个操作各自报：收尾在每一步的边界上拿这一步之前那份和现在比）：
//   同一个编号之前在某套排法上有位置；之后这个编号上的面不在了 / 没有位置 / 换了一套 / 坐标和之前不一样 → 旧位置（cornersRect）可能空出来了；
//   但它整个被「这一步动过的面现在占着的格」合起来盖住 = 不记（长方形被几个长方形盖住，精确判）。「占着」全仓只有 layout.ts cellRect 一个算法。
// 清单：一个框被另一个整个包住、两个框拼起来正好是一个长方形 = 随时并（不丢地方）；超过 FREED_MAX 个框才做会多占地方的并（多出面积最少的两个换成外包框）。
//   剪：清单里一个框整个被这一步动过的面现在占着的格盖住 = 拿掉（那张面以后丢了位置，第一条会把它的框再记进来）。
//   新记的框已经被清单合起来盖住 = 不加（同一步里多跑一次结果一样：收尾每次补面之前先记一次，整步最后再记一次）。
//   花的时间不随框数的平方涨（统筹预审第 2 条）：框多（> COARSE_AT）先按粗格子归拢（外包框切 COARSE_GRID × COARSE_GRID 格，每格落着的那几段合成一个外包框——只并大、不漏），
//   再挑最省的并（每个框记着和谁并最省，并完只重算受牵连的）。
// freed 的意思（统筹 11-13 钉死）：框可以盖到现在还有面占着的格，有面占着的格归那张面。读它只有两种读法，各一个函数、全仓共用：
//   补面 = freed 加上占着的（placementBlocked）；小窗、提示里说的「空出来的地方」、以后的重排和清空 = freed 减去占着的（freedOpenAreas；数「几块」= openPieces）。
import type { Guid } from "../format/guid.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { DefId, Scene } from "../scene/scene.ts";
import { hasUvColumns, uvAt, uvBoxes, uvSetOfFace } from "../scene/uv.ts";   // 贴图坐标只经 scene/uv.ts 问（守卫 paint-start-guard ⑦）
import { cellRect, cornersRect } from "./layout.ts";

/** [x0, y0, x1, y1)，单位格。 */
export type Rect = readonly [number, number, number, number];
/** 一份网格体：内核 + 速查表（代号 → 排法 GUID）。 */
export interface MeshSide { readonly k: MeshKernel; readonly slots: readonly Guid[] }
/** 会多占地方的并从多少个框以上才做（统筹 11-13 深夜：256）。 */
export const FREED_MAX = 256;
/** 框比这个多 = 先按粗格子归拢，再挑最省的并（挑最省的并每一下要看所有的框：框数要先压下来）。 */
export const COARSE_AT = 2 * FREED_MAX;
/** 粗格子每边几格（22 × 22 = 484 ≤ COARSE_AT）。 */
const COARSE_GRID = 22;

/** 一张面在一份网格体上的位置（没有 = null）。 */
function placeOf(m: MeshSide, f: number): { g: Guid; v: Float32Array } | null {
  if (!m.k.hasF(f)) return null;
  const g = uvSetOfFace(m.k, m.slots, f), v = g === null ? null : uvAt(m.k, m.slots, f, g);
  return g !== null && v ? { g, v } : null;
}
const sameCorners = (a: Float32Array, b: Float32Array): boolean => { if (a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false; return true; };

/**
 * 这一步要拿哪些面来比：现在的改动日志给的这一步动过的面；日志说不知道 / 贴图坐标那两列这一步加了或删了（removeColumn 不逐张面进日志）/ 定义没了 = null = 之前那份的全部面。
 */
export function candidatesFor(before: MeshSide, now: MeshSide | null, seq: number | null): Iterable<number> | null {
  if (!now || seq === null || hasUvColumns(before.k) !== hasUvColumns(now.k)) return null;
  return now.k.changes.since(seq)?.faces ?? null;
}

/**
 * 一份网格体这一步的前后：每一套排法上，可能空出来的旧位置（还没按「盖住」筛）和这一步动过的面现在占着的格。
 * candidates = null = 之前那份的全部面加上现在的全部面。
 */
export function lostPlaces(before: MeshSide, now: MeshSide | null, candidates: Iterable<number> | null): Map<Guid, { lost: Rect[]; held: Rect[] }> {
  const out = new Map<Guid, { lost: Rect[]; held: Rect[] }>(), at = (g: Guid) => { let e = out.get(g); if (!e) { e = { lost: [], held: [] }; out.set(g, e); } return e; };
  const faces = candidates ? new Set(candidates) : new Set([...before.k.faces(), ...(now ? now.k.faces() : [])]);
  for (const f of faces) {
    const p0 = placeOf(before, f), p1 = now ? placeOf(now, f) : null;
    if (p1) at(p1.g).held.push(cornersRect(p1.v));
    if (!p0) continue;
    if (p1 && p1.g === p0.g && sameCorners(p0.v, p1.v)) continue;
    at(p0.g).lost.push(cornersRect(p0.v));
  }
  return out;
}

/** 一份网格体所有有位置的面现在占着的格（按排法分）：这一步新出现的定义整个算「现在占着的」（统筹预审第 3 条：面带着位置搬进新定义，旧定义那边的框要剪得掉）。 */
export function heldAll(m: MeshSide): Map<Guid, Rect[]> {
  const out = new Map<Guid, Rect[]>();
  if (!hasUvColumns(m.k)) return out;
  for (const f of m.k.faces()) { const p = placeOf(m, f); if (p) { const l = out.get(p.g); if (l) l.push(cornersRect(p.v)); else out.set(p.g, [cornersRect(p.v)]); } }
  return out;
}

const area = (r: Rect): number => (r[2] - r[0]) * (r[3] - r[1]);
const contains = (a: Rect, b: Rect): boolean => a[0] <= b[0] && a[1] <= b[1] && a[2] >= b[2] && a[3] >= b[3];
const meets = (a: Rect, b: Rect): boolean => a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3];

/** 一堆框的格子索引（只取和目标相交的那几个；精确判「盖住」用）。 */
export class RectIndex {
  private readonly cell = 64;
  private readonly bins = new Map<number, number[]>();
  readonly rects: readonly Rect[];
  constructor(rects: readonly Rect[]) {
    this.rects = rects;
    rects.forEach((r, i) => { for (const key of this.keys(r)) { const l = this.bins.get(key); if (l) l.push(i); else this.bins.set(key, [i]); } });
  }
  private *keys(r: Rect): Iterable<number> {
    const c = this.cell, i0 = Math.floor(r[0] / c), i1 = Math.floor((r[2] - 1) / c), j0 = Math.floor(r[1] / c), j1 = Math.floor((r[3] - 1) / c);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) yield (j + 1024) * 4096 + (i + 1024);
  }
  /** 和 r 相交的框（不重复）。 */
  hits(r: Rect): Rect[] { const seen = new Set<number>(), out: Rect[] = []; for (const key of this.keys(r)) for (const i of this.bins.get(key) ?? []) if (!seen.has(i)) { seen.add(i); if (meets(this.rects[i], r)) out.push(this.rects[i]); } return out; }
  /** r 整个被这些框合起来盖住吗（精确：按 x 切条，每条看 y 方向的并）。 */
  covers(r: Rect): boolean {
    const hs = this.hits(r);
    if (!hs.length) return false;
    const xs = [...new Set([r[0], r[2], ...hs.flatMap((h) => [Math.max(r[0], h[0]), Math.min(r[2], h[2])])])].sort((a, b) => a - b);
    for (let s = 0; s + 1 < xs.length; s++) {
      const xa = xs[s], xb = xs[s + 1];
      if (xa >= xb) continue;
      const ys = hs.filter((h) => h[0] <= xa && h[2] >= xb).map((h) => [Math.max(r[1], h[1]), Math.min(r[3], h[3])] as const).filter(([a, b]) => a < b).sort((p, q) => p[0] - q[0]);
      let y = r[1];
      for (const [a, b] of ys) { if (a > y) break; y = Math.max(y, b); }
      if (y < r[3]) return false;
    }
    return true;
  }
}

/** 两个框拼起来正好是一个长方形（含一个包住另一个）→ 那个长方形；不是 = null。 */
function exactUnion(a: Rect, b: Rect): Rect | null {
  if (contains(a, b)) return a;
  if (contains(b, a)) return b;
  if (a[0] === b[0] && a[2] === b[2] && a[1] <= b[3] && b[1] <= a[3]) return [a[0], Math.min(a[1], b[1]), a[2], Math.max(a[3], b[3])];
  if (a[1] === b[1] && a[3] === b[3] && a[0] <= b[2] && b[0] <= a[2]) return [Math.min(a[0], b[0]), a[1], Math.max(a[2], b[2]), a[3]];
  return null;
}
/** 并到没有可以不丢地方地并的为止（一遍一遍扫：并了一对接着往下看，不从头来；一遍里没并过就停）。 */
function mergeExact(rs: Rect[]): Rect[] {
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length;) {
      const u = exactUnion(rs[i], rs[j]);
      if (!u) { j++; continue; }
      rs[i] = u; rs.splice(j, 1); changed = true; j = i + 1;   // rs[i] 变大了：它后面的再看一遍
    }
  }
  return rs;
}
const hull = (a: Rect, b: Rect): Rect => [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
/** 两个框换成外包框多出来的面积。 */
function extraOf(a: Rect, b: Rect): number {
  const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  return area(hull(a, b)) - (area(a) + area(b) - ix * iy);
}
/** 按粗格子归拢：外包框切 g × g 格，每个框按格切成段，每格里的段合成一个外包框（每一段都在它那格的外包框里 = 只并大、不漏）。花的时间 = 框数 × 每个框跨几格。 */
function coarsen(rs: readonly Rect[], g: number): Rect[] {
  let X0 = Infinity, Y0 = Infinity, X1 = -Infinity, Y1 = -Infinity;
  for (const r of rs) { X0 = Math.min(X0, r[0]); Y0 = Math.min(Y0, r[1]); X1 = Math.max(X1, r[2]); Y1 = Math.max(Y1, r[3]); }
  const tw = Math.max(1, Math.ceil((X1 - X0) / g)), th = Math.max(1, Math.ceil((Y1 - Y0) / g)), cells = new Map<number, Rect>();
  for (const r of rs) {
    const i0 = Math.floor((r[0] - X0) / tw), i1 = Math.floor((r[2] - 1 - X0) / tw), j0 = Math.floor((r[1] - Y0) / th), j1 = Math.floor((r[3] - 1 - Y0) / th);
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) {
      const piece: Rect = [Math.max(r[0], X0 + i * tw), Math.max(r[1], Y0 + j * th), Math.min(r[2], X0 + (i + 1) * tw), Math.min(r[3], Y0 + (j + 1) * th)];
      const key = j * g + i, c = cells.get(key);
      cells.set(key, c ? hull(c, piece) : piece);
    }
  }
  return [...cells.keys()].sort((a, b) => a - b).map((k) => cells.get(k)!);
}
/**
 * 挑最省的并，并到不超过 max 个：每次把多出面积最少的两个换成外包框（一样省的取编号小的）。
 * 每个框记着和谁并最省；并完只重算新框和原来指着这两个的，别的只和新框比一下 → 通常随框数的平方涨，不是三次方（框数先由 coarsen 压到 COARSE_AT 以内）。
 */
function shrinkTo(rs: readonly Rect[], max: number): Rect[] {
  const n = rs.length;
  if (n <= max) return [...rs];
  const R = [...rs], alive = new Uint8Array(n).fill(1), best = new Int32Array(n).fill(-1), cost = new Float64Array(n).fill(Infinity);
  const findBest = (i: number): void => {
    let bj = -1, bc = Infinity;
    for (let j = 0; j < n; j++) if (j !== i && alive[j]) { const c = extraOf(R[i], R[j]); if (c < bc) { bc = c; bj = j; } }
    best[i] = bj; cost[i] = bc;
  };
  for (let i = 0; i < n; i++) findBest(i);
  for (let count = n; count > max; count--) {
    let bi = -1, bc = Infinity;
    for (let i = 0; i < n; i++) if (alive[i] && cost[i] < bc) { bc = cost[i]; bi = i; }
    const a = Math.min(bi, best[bi]), b = Math.max(bi, best[bi]);
    R[a] = hull(R[a], R[b]); alive[b] = 0;
    findBest(a);
    for (let k = 0; k < n; k++) {
      if (!alive[k] || k === a) continue;
      if (best[k] === a || best[k] === b) { findBest(k); continue; }
      const c = extraOf(R[k], R[a]);
      if (c < cost[k] || (c === cost[k] && a < best[k])) { cost[k] = c; best[k] = a; }
    }
  }
  return R.filter((_, i) => alive[i]);
}

/**
 * 一行的清单加上这一步记的框：先剪（整个被 held 盖住的拿掉）；新框已经被清单合起来盖住就不加（多跑一次结果一样）；
 * 框少：被包住的不加、包住别的就换掉，再不丢地方地并；框多（> COARSE_AT）：先按粗格子归拢；最后超过 FREED_MAX 个才挑最省的并。
 * 返回新的清单（按 y、x 排，四个一组）；和原来一样 = null（不用改那一行）。
 */
export function mergeFreed(old: readonly number[] | undefined, add: readonly Rect[], held: readonly Rect[]): number[] | null {
  const was: Rect[] = [];
  for (let i = 0; old && i + 3 < old.length; i += 4) was.push([old[i], old[i + 1], old[i + 2], old[i + 3]]);
  const hIdx = held.length ? new RectIndex(held) : null;
  const kept = was.filter((r) => !hIdx || !hIdx.covers(r));
  const wIdx = kept.length ? new RectIndex(kept) : null;
  const fresh = add.filter((a) => area(a) > 0 && (!wIdx || !wIdx.covers(a)));
  let rs: Rect[];
  if (kept.length + fresh.length > COARSE_AT) rs = coarsen([...kept, ...fresh], COARSE_GRID);
  else {
    rs = [...kept];
    for (const a of fresh) {
      if (rs.some((r) => contains(r, a))) continue;
      rs = rs.filter((r) => !contains(a, r));
      rs.push(a);
    }
  }
  rs = mergeExact(rs);
  if (rs.length > FREED_MAX) rs = mergeExact(shrinkTo(rs, FREED_MAX));
  rs.sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[3] - b[3] || a[2] - b[2]);
  const flat = rs.flatMap((r) => [...r]);
  if (old && old.length === flat.length && old.every((x, i) => x === flat[i])) return null;
  if (!old?.length && !flat.length) return null;
  return flat;
}

/** 一套排法上，一个定义的面现在占着的格（layout.ts cellRect；全仓「占着」只有这一个算法）。 */
function heldBy(b: { kernel: MeshKernel; uvSetSlots: readonly Guid[] }, g: Guid): Rect[] {
  const bx = uvBoxes(b.kernel, b.uvSetSlots, g), out: Rect[] = [];
  for (let i = 0; i + 3 < bx.length; i += 4) out.push(cellRect(bx[i], bx[i + 1], bx[i + 2], bx[i + 3]));
  return out;
}
/** 这套排法上所有定义（except 除外）的面现在占着的格（按排法看所有物件，没有摆放的定义也算）。 */
function heldOn(s: Scene, g: Guid, except: DefId | null): Rect[] {
  const out: Rect[] = [];
  for (const d of s.defs.values()) {
    if (d.id === except || d.body.kind !== "mesh" || !d.body.uvSetSlots.includes(g)) continue;   // 速查表里没有这一套 = 没有一张面的代号指着它（只是快筛）
    out.push(...heldBy(d.body, g));
  }
  return out;
}

/**
 * 补面时这套排法上当占着的格（读法一：freed 加上占着的）：空出来的地方 + 别的定义在这一套上有位置的面（这个定义自己的面 layoutAppend 自己看）。
 * 四个一组，给 layoutAppend 的 blocked。真补面（editor/paint-ops.ts）和「加进已有的画」的试铺（app/canvas-size-picker.ts）都用这一个。
 */
export function placementBlocked(s: Scene, def: DefId, g: Guid): number[] {
  const out = [...(s.uvSets.get(g)?.freed ?? [])];
  for (const r of heldOn(s, g, def)) out.push(r[0], r[1], r[2], r[3]);
  return out;
}

/** 一个框减去一堆框（按 x 切条，每条里 y 方向没被盖住的段 = 一块）。 */
function subtract(r: Rect, hs: readonly Rect[]): Rect[] {
  if (!hs.length) return [r];
  const xs = [...new Set([r[0], r[2], ...hs.flatMap((h) => [Math.max(r[0], h[0]), Math.min(r[2], h[2])])])].filter((x) => x >= r[0] && x <= r[2]).sort((a, b) => a - b), out: Rect[] = [];
  for (let s = 0; s + 1 < xs.length; s++) {
    const xa = xs[s], xb = xs[s + 1];
    if (xa >= xb) continue;
    const ys = hs.filter((h) => h[0] <= xa && h[2] >= xb).map((h) => [Math.max(r[1], h[1]), Math.min(r[3], h[3])] as const).filter(([a, b]) => a < b).sort((p, q) => p[0] - q[0]);
    let y = r[1];
    for (const [a, b] of ys) { if (a > y) out.push([xa, y, xb, a]); y = Math.max(y, b); }
    if (y < r[3]) out.push([xa, y, xb, r[3]]);
  }
  return out;
}
/**
 * 读法二：真正空着的地方 = freed 减去现在有面占着的格（所有定义在这一套上的面）。小窗标空地、提示里说「空出来的地方」、以后的重排和清空都用这一个。
 * 返回的是切开的长方形（切法不唯一：要数「几块」用 openPieces）。
 */
export function freedOpenAreas(s: Scene, g: Guid): Rect[] {
  const f = s.uvSets.get(g)?.freed;
  if (!f?.length) return [];
  const held = heldOn(s, g, null), idx = held.length ? new RectIndex(held) : null, out: Rect[] = [];
  for (let i = 0; i + 3 < f.length; i += 4) { const r: Rect = [f[i], f[i + 1], f[i + 2], f[i + 3]]; out.push(...subtract(r, idx ? idx.hits(r) : [])); }
  return out;
}
/** 一堆长方形连成几块（边挨着或者叠着算连着；只碰到角不算）。和怎么切的无关。 */
export function openPieces(rs: readonly Rect[]): number {
  if (!rs.length) return 0;
  const parent = rs.map((_, i) => i), find = (i: number): number => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const idx = new RectIndex(rs.map((r) => [r[0] - 1, r[1] - 1, r[2] + 1, r[3] + 1] as Rect));
  const ix = new Map(idx.rects.map((r, i) => [r, i]));
  const joined = (a: Rect, b: Rect): boolean => {
    const ox = Math.min(a[2], b[2]) - Math.max(a[0], b[0]), oy = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    return (ox > 0 && oy >= 0) || (oy > 0 && ox >= 0);   // 叠着或者共一段边
  };
  rs.forEach((r, i) => { for (const h of idx.hits(r)) { const j = ix.get(h)!; if (j !== i && joined(r, rs[j])) parent[find(i)] = find(j); } });
  let n = 0;
  for (let i = 0; i < rs.length; i++) if (find(i) === i) n++;
  return n;
}

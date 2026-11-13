// paint/freed.ts —— 空出来的地方（施工单十八第 2 刀，现行版 + 统筹 11-13 深夜侦察之后补的三处）。created 2026-11-13 by Claude Opus 5.5
// 守的是：排法表一行里的 freed ∪ 现在有面占着的格 ⊇ 所有可能留着旧画的格。多记无害（补面时当占着、不往上放），少记不行（新面会落在旧画上 = 不变量 2）。
// 判法（不靠每个操作各自报：收尾在每一步的边界上拿这一步之前那份和现在比）：
//   同一个编号之前在某套排法上有位置；之后这个编号上的面不在了 / 没有位置 / 换了一套 / 坐标和之前不一样 → 旧位置（cornersRect）可能空出来了；
//   但它整个被「这一步动过的面现在占着的格」合起来盖住 = 不记（长方形被几个长方形盖住，精确判）。「占着」全仓只有 layout.ts cellRect 一个算法。
// 清单：一个框被另一个整个包住、两个框拼起来正好是一个长方形 = 随时并（不丢地方）；超过 FREED_MAX 个框才做会多占地方的并（多出面积最少的两个换成外包框）。
//   剪：清单里一个框整个被这一步动过的面现在占着的格盖住 = 拿掉（那张面以后丢了位置，第一条会把它的框再记进来）。
import type { Guid } from "../format/guid.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { UV_AT_COL, hasUvColumns, uvCodeOf } from "../scene/uv.ts";
import { cornersRect } from "./layout.ts";

/** [x0, y0, x1, y1)，单位格。 */
export type Rect = readonly [number, number, number, number];
/** 一份网格体：内核 + 速查表（代号 → 排法 GUID）。 */
export interface MeshSide { readonly k: MeshKernel; readonly slots: readonly Guid[] }
/** 会多占地方的并从多少个框以上才做（统筹 11-13 深夜：256）。 */
export const FREED_MAX = 256;

/** 一张面在一份网格体上的位置（没有 = null）。 */
function placeOf(m: MeshSide, f: number): { g: Guid; v: Float32Array } | null {
  if (!m.k.hasF(f)) return null;
  const c = uvCodeOf(m.k, f), g = c >= 0 ? m.slots[c] : undefined;
  if (g === undefined) return null;
  const v = m.k.cornerValues(f, UV_AT_COL.id);
  return v ? { g, v } : null;
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
/** 并到没有可以不丢地方地并的为止。 */
function mergeExact(rs: Rect[]): Rect[] {
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const u = exactUnion(rs[i], rs[j]);
      if (!u) continue;
      rs[i] = u; rs.splice(j, 1); changed = true; break outer;
    }
  }
  return rs;
}

/**
 * 一行的清单加上这一步记的框：先剪（整个被 held 盖住的拿掉），新框被已有的包住就不加，再不丢地方地并；超过 FREED_MAX 个才做会多占地方的并。
 * 返回新的清单（按 y、x 排，四个一组）；和原来一样 = null（不用改那一行）。
 */
export function mergeFreed(old: readonly number[] | undefined, add: readonly Rect[], held: readonly Rect[]): number[] | null {
  const was: Rect[] = [];
  for (let i = 0; old && i + 3 < old.length; i += 4) was.push([old[i], old[i + 1], old[i + 2], old[i + 3]]);
  const idx = held.length ? new RectIndex(held) : null;
  let rs = was.filter((r) => !idx || !idx.covers(r));
  for (const a of add) {
    if (area(a) <= 0 || rs.some((r) => contains(r, a))) continue;
    rs = rs.filter((r) => !contains(a, r));
    rs.push(a);
  }
  rs = mergeExact(rs);
  while (rs.length > FREED_MAX) {   // 会多占地方的并：多出面积最少的两个换成外包框
    let bi = 0, bj = 1, best = Infinity;
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i], b = rs[j], u: Rect = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])];
      const ix = Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])), iy = Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
      const extra = area(u) - (area(a) + area(b) - ix * iy);
      if (extra < best) { best = extra; bi = i; bj = j; }
    }
    const a = rs[bi], b = rs[bj];
    rs[bi] = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[2], b[2]), Math.max(a[3], b[3])]; rs.splice(bj, 1);
    rs = mergeExact(rs);
  }
  rs.sort((a, b) => a[1] - b[1] || a[0] - b[0] || a[3] - b[3] || a[2] - b[2]);
  const flat = rs.flatMap((r) => [...r]);
  if (old && old.length === flat.length && old.every((x, i) => x === flat[i])) return null;
  if (!old?.length && !flat.length) return null;
  return flat;
}

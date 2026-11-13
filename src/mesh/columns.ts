// mesh/columns.ts —— 网格体上挂的通用的列 + 面的旧样子 + 面的来历（五种）。created 2026-11-10 by Claude Opus 5.5（原名 corner-columns.ts）
// 2026-11-13 施工单十八第 1½ 刀改写（user 11-13：「几何内核对属性无感，只知道是面、点还是角，不知道它们是什么意思」；规程 = ai-docs/20261112-attribute-protocol.md，
//   接口 = 它的第七½节 E，统筹 11-13 批）：内核只知道一列数挂在哪一类东西上、是什么类型的数、连续还是离散、并成时怎么取、新长的跟不跟旁边。
//   这列数是什么意思、什么时候算坏了，归用它的那一层。内核只如实报告每张新面是怎么来的、哪几列在来源之间对不上。
//
// · 一列 = 一份声明 ColumnDef（一个形状）。挂在哪（on）五类都能声明；这一刀只实现两种：角上的浮点（每角 floats 个 32 位浮点，和 loopVert 平行）、
//   面上的整数（每面一个 Int32）。别的组合加列时抛「还没做」。
// · continuous：连续 = 「之间」按权重混（重心坐标插值，quantum = 格子多细，插出来的数取整到这一格）；离散 = 取权重最大的那个旧角的值（一样大取角号小的）。
//   面上的整数一定离散。
// · fill = 缺省值：新长出来、凭空来但调用方没给的，填它。
// · merge = 并成时怎么取：first = 排在最前的来源；firstNonDefault = 第一个不是缺省值的来源；defaultIfMixed = 来源之间不一样就回缺省值。
//   不管哪一种，来源之间不一样都记进报告（面上的列带各来源的值；角上的列记「对不上」，哪张来源都没有这个点记「取不到」）。
// · followNeighbor：新长的面（grown 带 neighbor）照抄旁边那张面的值。这一刀只做面上的列（角上的声明了抛「还没做」）。
// · 面的旧样子（FaceShape）：改一张面之前先记下它现在的样子（环、环上各点当时的位置、每一列的值、材质，以及它身上还没交出去的「对不上」的标记）。内核一列都没有时只记材质。
// · 五种来历（FaceOrigin）对应规程第四节的七种：原样 = 不申报（面没被动）；一块 = piece（「之间」= piece.from 里写位置）；一份 = copy；并成 = joined；
//   新长 = grown（可带 neighbor）；给定 = fresh；删除不走这里。**给角上的数取值的代码全仓只有这里一份**（守卫 test/corner-columns.test.ts）：
//     piece  是它的一块：面上的列 = 原面的值；角上的列：新角正好是原来的角 → 原值；不是 → 在原来那张面「显示时用的那套三角形」（format/triangulate.ts triangulateFace，
//            用旧位置算）上找离这个点最近的点，连续的按三角形里的位置插值、离散的取权重最大的那个角。可以带一张取样处的表 from：第 i 个角写「原来第 j 个角」= 照抄（逐位相同），
//            写一个位置 = 在那套三角形上取那个位置；空着 = 默认规矩（点现在的位置）。旧面切不出三角形 = 这一列填 fill、报告「取不到」。
//            取样处表里写的角号不在旧环里 = 调用的地方写错了 → 抛。
//     copy   是它的一份：面上的列 = 原面的值；角上的列：新环第 i 个角 = 原来第 corners[i] 个角，照抄。角号不在旧环里 = 抛。
//     grown  新长出来的：每一列填 fill；带 neighbor（一张活面）时 followNeighbor 的列照抄它。neighbor 不是活面 = 抛。
//     joined 几张面并成的：面上的列按 merge 取；角上的列：每个点在有这个点的来源里按 merge 取。不一样 / 没有 = 记进报告。
//     fresh  凭空来的：调用方给值（装载、整张面原样搬到另一个内核）；没给的列填 fill——只许出现在白名单里的文件（守卫）。
// · 「对不上」的标记跟着来历往下传：一张面身上带着标记、又被切开 / 照抄 / 并进别的面，新面也带上（同一列、同一组来源的值），直到用的那一层拿走（MeshKernel.takeReport）。
//   编辑器每一步开头调一次 takeReport() 丢掉上一步没人取的（规程第六节的寿命）。
import type { Pt3 } from "../kernel/geom.ts";
import { triangulateFace } from "../format/triangulate.ts";

/** 列挂在哪一类东西上（规程第三节的五类）。这一刀只实现 corner、face。 */
export type Domain = "vertex" | "edge" | "face" | "corner" | "faceEdge";
/** 每个东西上几个什么数：floats = 几个 32 位浮点；int = 一个 32 位整数。 */
export type ColumnType = { readonly floats: number } | "int";
/** 并成时怎么取。 */
export type MergeRule = "first" | "firstNonDefault" | "defaultIfMixed";
/** 一列的声明（规程第七½节 E）。内核只把 id 当名字；kind / extra 不透明。 */
export interface ColumnDef {
  readonly id: string;
  readonly on: Domain;
  readonly type: ColumnType;
  /** 连续 = 「之间」按权重混；离散 = 取权重最大的来源。int 一定离散。 */
  readonly continuous: boolean;
  /** 缺省值（floats 每个分量同一个数）。 */
  readonly fill: number;
  /** 格子多细（只对连续的 floats）：值是 1/quantum 的整数倍，插出来的数取整到这一格（MeshKernel.check M7½）。 */
  readonly quantum?: number;
  /** 新长的跟不跟旁边（grown 带 neighbor 时照抄它）。 */
  readonly followNeighbor?: boolean;
  readonly merge: MergeRule;
  readonly kind?: string;
  readonly extra?: unknown;
}
/** 角上的一列（内核里的）：data 和 loopVert 平行，长度 ≥ 角的槽数 × arity。 */
export interface CornerColumn { readonly def: ColumnDef; readonly id: string; readonly arity: number; data: Float32Array }
/** 面上的一列（内核里的）：data[面编号]，长度 ≥ 面的槽数。 */
export interface FaceColumn { readonly def: ColumnDef; readonly id: string; data: Int32Array }

/** 一份声明这一刀做不做得了、合不合规矩：不合 = 抛（人话里带 id）；做得了 = 角上的返回每角几个数，面上的返回 0。 */
export function checkColumnDef(d: ColumnDef): number {
  const where = `column ${d.id}`;
  if (typeof d.id !== "string" || !d.id) throw new Error(`column def: id must be a non-empty string`);
  if (!Number.isFinite(d.fill)) throw new Error(`${where}: fill must be a finite number`);
  if (!["first", "firstNonDefault", "defaultIfMixed"].includes(d.merge)) throw new Error(`${where}: merge ${String(d.merge)} is not one of first / firstNonDefault / defaultIfMixed`);
  if (d.quantum !== undefined && !(d.quantum > 0 && Number.isFinite(d.quantum))) throw new Error(`${where}: quantum must be a positive number`);
  if (d.on === "corner") {
    if (d.type === "int") throw new Error(`${where}: int columns on corners are not implemented yet`);
    const n = d.type.floats;
    if (!(Number.isInteger(n) && n >= 1)) throw new Error(`${where}: floats must be a positive integer`);
    if (d.quantum !== undefined && !d.continuous) throw new Error(`${where}: quantum is only for continuous columns`);
    if (d.followNeighbor) throw new Error(`${where}: followNeighbor on corner columns is not implemented yet`);
    return n;
  }
  if (d.on === "face") {
    if (d.type !== "int") throw new Error(`${where}: float columns on faces are not implemented yet`);
    if (d.continuous) throw new Error(`${where}: int columns are discrete (continuous must be false)`);
    if (d.quantum !== undefined) throw new Error(`${where}: quantum is only for continuous float columns`);
    if (!Number.isInteger(d.fill)) throw new Error(`${where}: fill of an int column must be an integer`);
    return 0;
  }
  throw new Error(`${where}: columns on ${String(d.on)} are not implemented yet`);
}
/** 两份声明是不是同一列（逐项；extra 不透明，按引用比）。 */
export function sameColumnDef(a: ColumnDef, b: ColumnDef): boolean {
  const ta = a.type === "int" ? "int" : `f${a.type.floats}`, tb = b.type === "int" ? "int" : `f${b.type.floats}`;
  return a.id === b.id && a.on === b.on && ta === tb && a.continuous === b.continuous && a.fill === b.fill && a.quantum === b.quantum
    && !!a.followNeighbor === !!b.followNeighbor && a.merge === b.merge && a.kind === b.kind && a.extra === b.extra;
}

/** 角上的列这一次对不上的样子：mixed = 并成时来源之间不一样；missing = 取不到（哪张来源都没有这个点 / 旧面切不出三角形）。两样都有记 missing。 */
export type CornerOdd = "mixed" | "missing";
/** 一张面在一次来历里「对不上」的列：面上的列 → 各个来源的值（来源的先后 = 来历里的先后）；角上的列 → 对不上 / 取不到。 */
export interface OddFace {
  readonly face: ReadonlyMap<string, readonly number[]>;
  readonly corner: ReadonlyMap<string, CornerOdd>;
}
/** 这一步里没了的面（被操作明着删的不进）：为什么（原因由调用方给，比如塌了 / 重叠 / 夹层；内核不认它）、和哪张重叠、没了之前的样子。 */
/**
 * 面为什么没了（报告「没了的面」的原因；调用方给）：collapsed = 合并点之后不同的点不到三个；overlap = 合并点之后和另一张面是同一圈点（with = 留下的那张）；
 * seam-wall = 强行对称删掉的躺在镜像面上的夹层面。新加一种 = 这里加一个值，收尾那一层（editor/paint-upkeep.ts GONE_WORDS）不填说法编译不过。
 */
export type GoneWhy = "collapsed" | "overlap" | "seam-wall";
export interface GoneFace { readonly why: GoneWhy; readonly with?: number; readonly shape: FaceShape }
/**
 * 内核的报告：这段时间里新面 / 改过的面当中「有列对不上」的那些（面编号 → 哪几列）；面已经不在了的不报。
 * gone = 这段时间里没了的面（列表，不拿面编号当键：编号同一步里可能被新面复用）。
 */
export interface FaceReport { readonly odd: ReadonlyMap<number, OddFace>; readonly gone: readonly GoneFace[] }

/** 面的旧样子。没有列的内核：ring / pts / corner / face 都是 null（只记材质，几乎不花时间）。 */
export interface FaceShape {
  readonly mat: number;
  readonly ring: readonly number[] | null;
  /** 环上各点当时的位置（x y z × 角）。 */
  readonly pts: Float64Array | null;
  /** 角上的每一列在各角上的值（id → 角数 × arity）。 */
  readonly corner: ReadonlyMap<string, Float32Array> | null;
  /** 面上的每一列的值（id → 值）。 */
  readonly face: ReadonlyMap<string, number> | null;
  /** 它身上还没交出去的「对不上」（跟着来历传给新面）。 */
  readonly odd?: OddFace;
  /** 显示时用的那套三角形（懒算、记在这里，一张旧面只算一次）。 */
  tris?: [number, number, number][];
}

/** 取样处：原来第几个角（照抄）/ 一个位置（在旧样子的三角形上取）/ 空着（默认规矩）。 */
export type SampleAt = number | Pt3 | undefined;
export type FaceOrigin =
  | { readonly kind: "piece"; readonly of: FaceShape; readonly from?: readonly SampleAt[] }
  | { readonly kind: "copy"; readonly of: FaceShape; readonly corners: readonly number[] }
  | { readonly kind: "grown"; readonly neighbor?: number }
  | { readonly kind: "joined"; readonly of: readonly FaceShape[] }
  | { readonly kind: "fresh"; readonly corner?: ReadonlyMap<string, Float32Array>; readonly face?: ReadonlyMap<string, number> };
export const GROWN: FaceOrigin = Object.freeze({ kind: "grown" });
export const FRESH: FaceOrigin = Object.freeze({ kind: "fresh" });

/** 内核那边给这一段代码看的窄接口（不让这里认识整个内核）。 */
export interface ColumnHost {
  readonly cornerCols: readonly CornerColumn[];
  readonly faceCols: readonly FaceColumn[];
  pt(v: number): Pt3;
  hasF(f: number): boolean;
}

/** 收集「对不上」：面上的列带各来源的值，角上的列记对不上 / 取不到。 */
class OddBuilder {
  face = new Map<string, readonly number[]>(); corner = new Map<string, CornerOdd>();
  mark(id: string, how: CornerOdd): void { if (how === "missing" || !this.corner.has(id)) this.corner.set(id, how); }
  /** 并进来源身上带着的标记（面上的列已经有就留先来的那一份来源值）。 */
  inherit(o: OddFace | undefined): void { if (!o) return; for (const [k, v] of o.face) if (!this.face.has(k)) this.face.set(k, v); for (const [k, v] of o.corner) this.mark(k, v); }
  done(): OddFace | null { return this.face.size || this.corner.size ? { face: this.face, corner: this.corner } : null; }
}

/** 并成时一列在几个来源上的值怎么取（面上的列一个数一组；角上的列一个点的 arity 个数一组）。返回取哪一个来源（−1 = 回缺省值）和来源之间是不是不一样。 */
function pickMerged(rule: MergeRule, groups: readonly ArrayLike<number>[], fill: number): { at: number; mixed: boolean } {
  const same = (a: ArrayLike<number>, b: ArrayLike<number>): boolean => { for (let c = 0; c < a.length; c++) if (!Object.is(a[c], b[c])) return false; return true; };   // 逐位比
  const mixed = groups.some((g) => !same(g, groups[0]));
  if (rule === "first") return { at: 0, mixed };
  if (rule === "defaultIfMixed") return { at: mixed ? -1 : 0, mixed };
  const isFill = (g: ArrayLike<number>): boolean => { for (let c = 0; c < g.length; c++) if (!Object.is(g[c], fill)) return false; return true; };
  const i = groups.findIndex((g) => !isFill(g));
  return { at: i < 0 ? 0 : i, mixed };
}

/** 一个数的并成：几个来源上的值按规则名取一个（回缺省值 = fill）。和列走的是同一个 pickMerged；合并点的边标记按位用它（merge-points.ts EDGE_FLAG_RULES）。 */
export function mergeScalar(rule: MergeRule, values: readonly number[], fill: number): number {
  const { at } = pickMerged(rule, values.map((v) => [v]), fill);
  return at < 0 ? fill : values[at];
}

/**
 * 算一张新面 / 新环上的数：面上的列写进 data[f]，角上的列写进 data[slot × arity …]（slot = 这个环在 loopVert 里的起点）。
 * 返回这张面「对不上」的列（没有 = null）。调用方（MeshKernel.addFace / setFaceRing）保证数组已经长到能装下。
 */
export function writeColumns(h: ColumnHost, origin: FaceOrigin, f: number, ring: readonly number[], slot: number): OddFace | null {
  const odd = new OddBuilder();
  if (origin.kind === "piece" && origin.from && origin.of.ring) {
    const m = origin.of.ring.length;
    origin.from.forEach((at, i) => { if (typeof at === "number" && !(Number.isInteger(at) && at >= 0 && at < m)) throw new Error(`writeColumns: piece.from[${i}] = ${at} is not a corner of the old ring (length ${m})`); });
  }
  if (origin.kind === "copy" && origin.of.ring) {
    const m = origin.of.ring.length;
    origin.corners.forEach((j, i) => { if (!(Number.isInteger(j) && j >= 0 && j < m)) throw new Error(`writeColumns: copy.corners[${i}] = ${j} is not a corner of the old ring (length ${m})`); });
  }
  if (origin.kind === "grown" && origin.neighbor !== undefined && !h.hasF(origin.neighbor)) throw new Error(`writeColumns: grown.neighbor ${origin.neighbor} is not a live face`);
  if (origin.kind === "piece" || origin.kind === "copy") odd.inherit(origin.of.odd);
  if (origin.kind === "joined") for (const p of origin.of) odd.inherit(p.odd);
  // —— 面上的列
  for (const col of h.faceCols) {
    const d = col.def;
    let v = d.fill;
    switch (origin.kind) {
      case "grown": if (d.followNeighbor && origin.neighbor !== undefined) v = col.data[origin.neighbor]; break;
      case "fresh": { const g = origin.face?.get(col.id); if (g !== undefined) v = g; break; }
      case "piece": case "copy": { const g = origin.of.face?.get(col.id); if (g !== undefined) v = g; break; }
      case "joined": {
        const vals = origin.of.map((p) => p.face?.get(col.id) ?? d.fill);
        if (!vals.length) break;
        const r = pickMerged(d.merge, vals.map((x) => [x]), d.fill);
        v = r.at < 0 ? d.fill : vals[r.at];
        if (r.mixed && !odd.face.has(col.id)) odd.face.set(col.id, vals);
        break;
      }
    }
    col.data[f] = v;
  }
  // —— 角上的列
  for (const col of h.cornerCols) {
    const d = col.def, A = col.arity, out = col.data, base = slot * A, n = ring.length;
    const fill = (): void => { out.fill(d.fill, base, base + n * A); };
    switch (origin.kind) {
      case "grown": fill(); break;
      case "fresh": {
        const v = origin.corner?.get(col.id);
        if (!v) { fill(); break; }
        if (v.length !== n * A) throw new Error(`writeColumns: fresh values for column ${col.id} have ${v.length} numbers, need ${n * A}`);
        out.set(v, base);
        break;
      }
      case "copy": {
        const v = origin.of.corner?.get(col.id);
        if (!v) { fill(); break; }
        for (let i = 0; i < n; i++) { const j = origin.corners[i]; for (let c = 0; c < A; c++) out[base + i * A + c] = v[j * A + c]; }
        break;
      }
      case "piece": {
        const of = origin.of, v = of.corner?.get(col.id);
        if (!v || !of.ring || !of.pts) { fill(); break; }
        for (let i = 0; i < n; i++) {
          const at = origin.from?.[i];
          const j = typeof at === "number" ? at : at === undefined ? of.ring.indexOf(ring[i]) : -1;
          if (j >= 0) { for (let c = 0; c < A; c++) out[base + i * A + c] = v[j * A + c]; continue; }
          if (!sampleAt(of, v, A, typeof at === "object" ? at : h.pt(ring[i]), out, base + i * A, d)) { for (let c = 0; c < A; c++) out[base + i * A + c] = d.fill; odd.mark(col.id, "missing"); }
        }
        break;
      }
      case "joined": {
        const parts = origin.of;
        for (let i = 0; i < n; i++) {
          const groups: Float32Array[] = [];
          for (const p of parts) {
            const j = p.ring ? p.ring.indexOf(ring[i]) : -1;
            const pv = j >= 0 ? p.corner?.get(col.id) : undefined;
            if (pv) groups.push(pv.subarray(j * A, j * A + A));
          }
          if (!groups.length) { for (let c = 0; c < A; c++) out[base + i * A + c] = d.fill; odd.mark(col.id, "missing"); continue; }   // 哪张来源都没有这个点
          const r = pickMerged(d.merge, groups, d.fill);
          if (r.mixed) odd.mark(col.id, "mixed");   // 共用的点上值不一样（逐位比）：照 merge 取，记一笔
          for (let c = 0; c < A; c++) out[base + i * A + c] = r.at < 0 ? d.fill : groups[r.at][c];
        }
        break;
      }
    }
  }
  return odd.done();
}

/** 在旧样子显示时用的那套三角形上找离 p 最近的点，写进 out[o …]：连续的列按那个三角形里的位置插值（quantum = 格子：插出来的值取整到 1/quantum）；
 *  离散的列取权重最大的那个角（一样大取角号小的），逐位照抄。全仓唯一一处取值（守卫）。
 *  旧面切不出三角形 = 取不到，返回 false（调用方填 fill、报告）。 */
function sampleAt(of: FaceShape, v: Float32Array, A: number, p: Pt3, out: Float32Array, o: number, d: ColumnDef): boolean {
  const P = of.pts!, n = P.length / 3;
  const tris = (of.tris ??= triangulateFace(Array.from({ length: n }, (_, i) => ({ x: P[3 * i], y: P[3 * i + 1], z: P[3 * i + 2] }))));
  let best = Infinity, bt = -1, bu = 0, bv = 0, bw = 0;
  for (let t = 0; t < tris.length; t++) {
    const [a, b, c] = tris[t];
    const r = closestOnTriangle(p, P, a, b, c);
    if (r.d2 < best) { best = r.d2; bt = t; bu = r.u; bv = r.v; bw = r.w; }
  }
  if (bt < 0) return false;
  const [a, b, c] = tris[bt];
  if (!d.continuous) {   // 离散：权重最大的那个角（一样大取角号小的）
    const w: [number, number][] = [[bu, a], [bv, b], [bw, c]];
    w.sort((x, y) => y[0] - x[0] || x[1] - y[1]);
    const j = w[0][1];
    for (let k = 0; k < A; k++) out[o + k] = v[j * A + k];
    return true;
  }
  const quantum = d.quantum;
  for (let k = 0; k < A; k++) { const x = bu * v[a * A + k] + bv * v[b * A + k] + bw * v[c * A + k]; out[o + k] = quantum ? Math.round(x * quantum) / quantum : x; }
  return true;
}

/** 点到三角形 (a, b, c) 的最近点：重心坐标 (u, v, w)（和 = 1、都 ≥ 0）+ 距离平方。Ericson《Real-Time Collision Detection》5.1.5。 */
function closestOnTriangle(p: Pt3, P: Float64Array, ia: number, ib: number, ic: number): { u: number; v: number; w: number; d2: number } {
  const ax = P[3 * ia], ay = P[3 * ia + 1], az = P[3 * ia + 2], bx = P[3 * ib], by = P[3 * ib + 1], bz = P[3 * ib + 2], cx = P[3 * ic], cy = P[3 * ic + 1], cz = P[3 * ic + 2];
  const abx = bx - ax, aby = by - ay, abz = bz - az, acx = cx - ax, acy = cy - ay, acz = cz - az, apx = p.x - ax, apy = p.y - ay, apz = p.z - az;
  const at = (u: number, v: number, w: number): { u: number; v: number; w: number; d2: number } => {
    const qx = u * ax + v * bx + w * cx - p.x, qy = u * ay + v * by + w * cy - p.y, qz = u * az + v * bz + w * cz - p.z;
    return { u, v, w, d2: qx * qx + qy * qy + qz * qz };
  };
  const d1 = abx * apx + aby * apy + abz * apz, d2 = acx * apx + acy * apy + acz * apz;
  if (d1 <= 0 && d2 <= 0) return at(1, 0, 0);
  const bpx = p.x - bx, bpy = p.y - by, bpz = p.z - bz, d3 = abx * bpx + aby * bpy + abz * bpz, d4 = acx * bpx + acy * bpy + acz * bpz;
  if (d3 >= 0 && d4 <= d3) return at(0, 1, 0);
  const vc = d1 * d4 - d3 * d2;
  if (vc <= 0 && d1 >= 0 && d3 <= 0) { const t = d1 / (d1 - d3); return at(1 - t, t, 0); }
  const cpx = p.x - cx, cpy = p.y - cy, cpz = p.z - cz, d5 = abx * cpx + aby * cpy + abz * cpz, d6 = acx * cpx + acy * cpy + acz * cpz;
  if (d6 >= 0 && d5 <= d6) return at(0, 0, 1);
  const vb = d5 * d2 - d1 * d6;
  if (vb <= 0 && d2 >= 0 && d6 <= 0) { const t = d2 / (d2 - d6); return at(1 - t, 0, t); }
  const va = d3 * d6 - d5 * d4;
  if (va <= 0 && d4 - d3 >= 0 && d5 - d6 >= 0) { const t = (d4 - d3) / ((d4 - d3) + (d5 - d6)); return at(0, 1 - t, t); }
  const den = 1 / (va + vb + vc), sv = vb * den, sw = vc * den;
  return at(1 - sv - sw, sv, sw);
}

// ---------------------------------------------------------------- 合并点时角上的数（属性地基轮第二步；规程第七¾节第 3 条「一伙角一起走」）
/** 合并点一张面的输入：合并之前的样子 + 挤过之后的环（每个角 = 原环里哪几个角挤成的，连续一段）。 */
export interface MergeCornerInput { readonly shape: FaceShape; readonly corners: readonly { readonly src: readonly number[] }[] }
/**
 * 合并点之后每张面挤过的环上每个角在每一列角上的列的值（面的下标 → 列 → 角数 × arity）。不管拓扑，只算数；全仓取值只在这个文件（守卫）。
 * 连续的列：一伙 = 同一个点上、这一列的值逐位相同的那些角；环上相邻、合并到同一个点的两个角（挤成一个的那一段）各自的伙并成一大伙，一路传下去。
 *   每一大伙取一个值：每个点上先把这一伙在那个点上的几个值等权平均（按值的字节排好再加），再按点的权重混（点按编号从小到大加；大伙里的点权重都是 0 = 等权）；
 *   有格子的取整到格子。没并进大伙的角不动。加的先后都固定，和组的先后、面的先后无关（结果逐位相同）。
 * 离散的列不并伙：挤成一个的角取权重最大的那个点的角（一样大取原环里靠前的）。
 * weight = 组里每个点的权重（不在任何组里的点没有）。
 */
export function mergeCornerValues(cols: readonly CornerColumn[], faces: readonly MergeCornerInput[], weight: ReadonlyMap<number, number>): Map<string, Float32Array>[] {
  const out = faces.map(() => new Map<string, Float32Array>());
  for (const col of cols) {
    const A = col.arity, d = col.def;
    if (!faces.every((x) => x.shape.corner?.has(col.id) && x.shape.ring)) continue;   // 没有列的内核：shapeOf 不记值
    const valOf = (fi: number, i: number): Float32Array => faces[fi].shape.corner!.get(col.id)!.subarray(i * A, i * A + A);
    const vOf = (fi: number, i: number): number => faces[fi].shape.ring![i];
    if (!d.continuous) {
      faces.forEach((x, fi) => {
        const o = new Float32Array(x.corners.length * A);
        x.corners.forEach((c, k) => {
          let best = c.src[0];
          for (const i of c.src) { const wi = weight.get(vOf(fi, i)) ?? 0, wb = weight.get(vOf(fi, best)) ?? 0; if (wi > wb || (wi === wb && i < best)) best = i; }
          o.set(valOf(fi, best), k * A);
        });
        out[fi].set(col.id, o);
      });
      continue;
    }
    // 连续的列：一伙的键 = 点 + 值的字节
    const keyOf = (fi: number, i: number): string | null => {
      const v = vOf(fi, i);
      if (!weight.has(v)) return null;
      return `${v}:${Array.from(new Uint32Array(Float32Array.from(valOf(fi, i)).buffer)).join(",")}`;
    };
    const parent = new Map<string, string>(), find = (a: string): string => { let r = a; while (parent.get(r) !== r) r = parent.get(r)!; let x = a; while (x !== r) { const n = parent.get(x)!; parent.set(x, r); x = n; } return r; };
    const val = new Map<string, Float32Array>();
    faces.forEach((x, fi) => x.shape.ring!.forEach((_, i) => { const key = keyOf(fi, i); if (key !== null && !parent.has(key)) { parent.set(key, key); val.set(key, Float32Array.from(valOf(fi, i))); } }));
    faces.forEach((x, fi) => x.corners.forEach((c) => {
      if (c.src.length < 2) return;
      const keys = c.src.map((i) => keyOf(fi, i)!).sort();
      for (let j = 1; j < keys.length; j++) { const a = find(keys[0]), b = find(keys[j]); if (a !== b) parent.set(a < b ? b : a, a < b ? a : b); }
    }));
    const members = new Map<string, string[]>();
    for (const key of [...parent.keys()].sort()) { const r = find(key); (members.get(r) ?? members.set(r, []).get(r)!).push(key); }
    const big = new Map<string, Float32Array>();
    for (const [root, keys] of members) {
      if (keys.length < 2) continue;
      const byPoint = new Map<number, string[]>();
      for (const key of keys) { const v = Number(key.slice(0, key.indexOf(":"))); (byPoint.get(v) ?? byPoint.set(v, []).get(v)!).push(key); }
      const pts = [...byPoint.keys()].sort((a, b) => a - b);
      const wsum = pts.reduce((s, v) => s + (weight.get(v) ?? 0), 0), acc = new Float64Array(A);
      for (const v of pts) {
        const w = wsum > 0 ? (weight.get(v) ?? 0) / wsum : 1 / pts.length, ks = byPoint.get(v)!;   // 已按字节排好（keys 排过序）
        for (let c = 0; c < A; c++) { let m = 0; for (const key of ks) m += val.get(key)![c]; acc[c] += w * (m / ks.length); }
      }
      const q = d.quantum, o = new Float32Array(A);
      for (let c = 0; c < A; c++) o[c] = q ? Math.round(acc[c] * q) / q : acc[c];
      big.set(root, o);
    }
    faces.forEach((x, fi) => {
      const o = new Float32Array(x.corners.length * A);
      x.corners.forEach((c, k) => {
        const key = keyOf(fi, c.src[0]), b = key !== null ? big.get(find(key)) : undefined;
        o.set(b ?? valOf(fi, c.src[0]), k * A);
      });
      out[fi].set(col.id, o);
    });
  }
  return out;
}


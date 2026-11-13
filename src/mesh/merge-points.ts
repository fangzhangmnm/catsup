// mesh/merge-points.ts —— 合并点这个原子的规划（属性地基轮第二步；规程 ai-docs/20261112-attribute-protocol.md 第七¾节第二稿）。created 2026-11-13 by Claude Opus 5.5
// 只读内核、算出要做什么；真正改拓扑在 MeshKernel.mergePoints（要摘环、改边的端点这些内核里面的口）。角上的数怎么取在 columns.ts mergeCornerValues（全仓取值只在那一处）。
//
// 输入：若干组点，每组合并成一个；每组合并到「排在第一的那个点」或「一组权重」（等权 = 中心）。不收任意位置。同一个点出现在两组里 = 调用方写错了 → 抛。
// 所有组一次做完，结果和组的先后无关（组按幸存点〔每组第一个点〕的编号排好再做；面、边都按编号从小到大处理）。
//   1 点：一组剩第一个点（幸存点），位置 = 第一个点的位置 / 按权重的位置。
//   2 边：两头合并成同一个点的 = 删；只换了一头的 = 还是那条边（改端点，标记原样）；几条合并成同一对点 = 留编号最小的，别的删，标记按下面那张小表并。
//   3 角：「一伙角一起走」，见 columns.ts。
//   4 环：相邻几个角合并到同一个点 = 挤成一个角；同一个点出现两次 = 在这个点把环剪成几圈：够三个角的各成一张面（原来的编号给角最多的一圈，一样多取环上靠前的），
//        两个角的一圈（刺）= 那条边留成不挂面的线（打上裸线位），刺尖的点不删。不同的点不到三个 = 塌了（删，进报告「没了的面」）。
//   5 合并完之后两张面是同一圈点（同向或反向）：留编号最小的，别的删、进报告（原因 = 和哪张重叠）。点集相同环不同的不算。
import type { Pt3 } from "../kernel/geom.ts";
import { mergeScalar, type FaceShape, type MergeRule } from "./columns.ts";
import { F_HIDDEN, F_SEAM, F_SHARP, F_SMOOTH, F_SOFT, F_WIRE } from "./edge-bits.ts";

/** 合并到哪：排在第一的那个点，或一组权重（和 verts 一一对应、非负、和 > 0）。 */
export type MergeTo = "first" | { readonly weights: readonly number[] };
export interface MergeGroup { readonly verts: readonly number[]; readonly to: MergeTo }

/**
 * 边的标记怎么并（几条边合并成同一对点时；第七¾节第 2 条）：「标记 → 规则名」的纯数据（user 11-13：「抽象成规则，而不是让引擎通过语义来判断」），
 * 规则名就是列的那三个（columns.ts MergeRule），缺省值都是 0（没这个标记）。合并的代码只按规则名办（mergeScalar），不认识哪一位是什么意思。
 *   defaultIfMixed = 都一样才留、不一样回 0 = 都有才留：手标的棱、平滑、不画线、隐藏（一条藏一条看得见 = 看得见的赢，统筹 11-13，和硬表面 kernel/layers.ts 第④条一致）；
 *   firstNonDefault = 有一个不是 0 就取它 = 有一个就留：接缝、裸线（裸线是「这条边可以不挂面」的结构位，不是属性）。
 * 和 edge-mark-rules.ts 的 JOIN 表必须一致（both ↔ defaultIfMixed、either ↔ firstNonDefault、structural ↔ firstNonDefault；那张 import 内核、这里不能 import 它），由 test/edge-mark-rules.test.ts 守。
 * 第三步边的标记搬上属性表之后，这张表换成每一列自己的声明。
 */
export const EDGE_FLAG_RULES: Readonly<Record<number, MergeRule>> = Object.freeze({
  [F_SHARP]: "defaultIfMixed", [F_SMOOTH]: "defaultIfMixed", [F_SOFT]: "defaultIfMixed", [F_HIDDEN]: "defaultIfMixed",
  [F_SEAM]: "firstNonDefault", [F_WIRE]: "firstNonDefault",
});
export const mergeEdgeFlags = (flags: readonly number[]): number => {
  let out = 0;
  for (const [bit, rule] of Object.entries(EDGE_FLAG_RULES)) { const b = Number(bit); out |= mergeScalar(rule, flags.map((f) => f & b), 0); }
  return out;
};

/** 规划要读的内核（MeshKernel 满足）。 */
export interface MergeMesh {
  hasV(v: number): boolean;
  pt(v: number): Pt3;
  vEdges(v: number): ArrayLike<number>;
  eFaces(e: number): ArrayLike<number>;
  faceVerts(f: number): number[];
  shapeOf(f: number): FaceShape;
  readonly edgeA: ArrayLike<number>;
  readonly edgeB: ArrayLike<number>;
  readonly edgeFlags: ArrayLike<number>;
}

/** 挤过之后环上的一个角：落在哪个点、由原环里哪几个角挤成（原环的角号，连续一段）。 */
export interface MergeCorner { readonly v: number; readonly src: readonly number[] }
export interface MergeFacePlan {
  readonly f: number;
  /** 合并之前的样子（环、各列的值、身上的标记）。 */
  readonly shape: FaceShape;
  /** 挤过之后的环（剪圈之前）。 */
  readonly corners: readonly MergeCorner[];
  /** 剪出来的几圈（每圈 = corners 的下标）：够三个角的成面；两个角的是刺。塌了 = 空。 */
  readonly loops: readonly (readonly number[])[];
  /** 原来的编号给哪一圈（loops 的下标）；塌了 = −1（不同的点不到三个；或剪完没有一圈够三个角——这时 loops 里的刺照样留成线）。 */
  readonly main: number;
}
export interface MergeEdgePlan { readonly keep: number; readonly a: number; readonly b: number; readonly flags: number; readonly drop: readonly number[] }
export interface MergePlan {
  /** 点 → 它合并到的幸存点（不在任何组里的点不在表里）。 */
  readonly rep: ReadonlyMap<number, number>;
  /** 组里每个点的权重（同一组里归一；合并到第一个点 = 第一个 1、别的 0）。 */
  readonly weight: ReadonlyMap<number, number>;
  /** 幸存点 → 最后的位置。 */
  readonly pos: ReadonlyMap<number, Pt3>;
  /** 被合并掉的点（编号从小到大）。 */
  readonly gone: readonly number[];
  /** 受影响的面（编号从小到大）。 */
  readonly faces: readonly MergeFacePlan[];
  /** 两头合并成同一个点的边（删）。 */
  readonly collapsed: readonly number[];
  /** 要留的边（改端点 / 并标记）和跟它并掉的边。 */
  readonly edges: readonly MergeEdgePlan[];
  /** 每组的幸存点（照传进来的组的先后）。 */
  readonly survivors: readonly number[];
}

/** 一圈点的身份（同向或反向算同一圈）：从最小的点起转，两个方向里取字典序小的。 */
export function ringKey(ring: readonly number[]): string {
  const n = ring.length;
  let m = 0; for (let i = 1; i < n; i++) if (ring[i] < ring[m]) m = i;
  const fwd = Array.from({ length: n }, (_, i) => ring[(m + i) % n]), bwd = Array.from({ length: n }, (_, i) => ring[(m - i + n) % n]);
  for (let i = 0; i < n; i++) if (fwd[i] !== bwd[i]) return (fwd[i] < bwd[i] ? fwd : bwd).join(",");
  return fwd.join(",");
}

/** 在重复的点上把一圈剪开（递归）：返回每一圈（corners 的下标）。 */
function cutLoops(corners: readonly MergeCorner[], idx: readonly number[]): number[][] {
  for (let i = 0; i < idx.length; i++) for (let j = i + 1; j < idx.length; j++) {
    if (corners[idx[i]].v !== corners[idx[j]].v) continue;
    return [...cutLoops(corners, idx.slice(i, j)), ...cutLoops(corners, [...idx.slice(j), ...idx.slice(0, i)])];
  }
  return [idx.slice()];
}

export function planMerge(k: MergeMesh, groups: readonly MergeGroup[]): MergePlan {
  const rep = new Map<number, number>(), weight = new Map<number, number>(), pos = new Map<number, Pt3>(), survivors: number[] = [];
  const canon = groups.map((g, gi) => {
    const verts = g.verts;
    if (verts.length < 2 || new Set(verts).size !== verts.length) throw new Error(`mergePoints: group ${gi} needs ≥ 2 distinct vertices`);
    for (const v of verts) if (!k.hasV(v)) throw new Error(`mergePoints: vertex ${v} is not alive`);
    let w: number[];
    if (g.to === "first") w = verts.map((_, i) => (i === 0 ? 1 : 0));
    else {
      const ws = g.to.weights;
      if (ws.length !== verts.length || !ws.every((x) => Number.isFinite(x) && x >= 0)) throw new Error(`mergePoints: group ${gi} weights must be ${verts.length} non-negative numbers`);
      const sum = ws.reduce((s, x) => s + x, 0);
      if (!(sum > 0)) throw new Error(`mergePoints: group ${gi} weights sum to 0`);
      w = ws.map((x) => x / sum);
    }
    return { verts, w, to: g.to };
  });
  for (const g of canon) for (const v of g.verts) { if (rep.has(v)) throw new Error(`mergePoints: vertex ${v} is in two groups`); rep.set(v, g.verts[0]); }
  for (const g of canon) {
    survivors.push(g.verts[0]);
    g.verts.forEach((v, i) => weight.set(v, g.w[i]));
    let x = 0, y = 0, z = 0;
    const order = g.verts.map((v, i) => i).sort((a, b) => g.verts[a] - g.verts[b]);   // 加的先后固定（按点的编号），和组里的先后无关
    const equal = g.w.every((w) => w === g.w[0]);
    if (equal) { for (const i of order) { const p = k.pt(g.verts[i]); x += p.x; y += p.y; z += p.z; } const n = g.verts.length; x /= n; y /= n; z /= n; }   // 等权（中心）= 先加再除（和以前的「到中心」同一个算法；从小到大传进来的逐位一样）
    else for (const i of order) { const p = k.pt(g.verts[i]); x += g.w[i] * p.x; y += g.w[i] * p.y; z += g.w[i] * p.z; }
    pos.set(g.verts[0], g.to === "first" ? k.pt(g.verts[0]) : { x, y, z });
  }
  const R = (v: number): number => rep.get(v) ?? v;
  const gone = [...rep.keys()].filter((v) => rep.get(v) !== v).sort((a, b) => a - b);
  // 受影响的面和边
  const faceSet = new Set<number>(), edgeSet = new Set<number>();
  for (const v of rep.keys()) for (const e of Array.from(k.vEdges(v))) { edgeSet.add(e); for (const f of Array.from(k.eFaces(e))) faceSet.add(f); }
  const faces: MergeFacePlan[] = [];
  for (const f of [...faceSet].sort((a, b) => a - b)) {
    const shape = k.shapeOf(f), ring = k.faceVerts(f), corners: { v: number; src: number[] }[] = [];
    ring.forEach((v0, i) => { const v = R(v0), last = corners[corners.length - 1]; if (last && last.v === v) last.src.push(i); else corners.push({ v, src: [i] }); });
    while (corners.length > 1 && corners[0].v === corners[corners.length - 1].v) { const last = corners.pop()!; corners[0].src = [...last.src, ...corners[0].src]; }
    if (new Set(corners.map((c) => c.v)).size < 3) { faces.push({ f, shape, corners, loops: [], main: -1 }); continue; }   // 塌了
    const firstSrc = (c: number): number => Math.min(...corners[c].src);
    const loops = cutLoops(corners, corners.map((_, i) => i)).map((l) => {   // 每圈从原环里最靠前的那个角起（剪圈不改面的第一个角）
      let m = 0; for (let i = 1; i < l.length; i++) if (firstSrc(l[i]) < firstSrc(l[m])) m = i;
      return [...l.slice(m), ...l.slice(0, m)];
    });
    let main = -1;
    loops.forEach((l, i) => {
      if (l.length < 3) return;
      if (main < 0) { main = i; return; }
      const a = loops[main], first = (x: readonly number[]): number => Math.min(...x.flatMap((c) => corners[c].src));
      if (l.length > a.length || (l.length === a.length && first(l) < first(a))) main = i;
    });
    faces.push({ f, shape, corners, loops, main });
  }
  // 边：两头合并成同一个点的删；按合并完的那一对点分桶，桶里编号最小的留下
  const collapsed: number[] = [], buckets = new Map<string, number[]>();
  for (const e of [...edgeSet].sort((a, b) => a - b)) {
    const a = R(k.edgeA[e]), b = R(k.edgeB[e]);
    if (a === b) { collapsed.push(e); continue; }
    const key = a < b ? `${a},${b}` : `${b},${a}`;
    (buckets.get(key) ?? buckets.set(key, []).get(key)!).push(e);
  }
  const edges: MergeEdgePlan[] = [];
  for (const [key, es] of buckets) {
    const [a, b] = key.split(",").map(Number);
    edges.push({ keep: es[0], a, b, flags: es.length > 1 ? mergeEdgeFlags(es.map((e) => k.edgeFlags[e])) : k.edgeFlags[es[0]], drop: es.slice(1) });
  }
  edges.sort((x, y) => x.keep - y.keep);
  return { rep, weight, pos, gone, faces, collapsed, edges, survivors };
}

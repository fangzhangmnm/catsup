// mesh/mirror.ts —— 网格体的镜像（编辑方式那一层；纪元账本 FM23 / FM39 / FM134 / FM136）。created 2026-10-28 by Claude Opus 5.5
// user：「所以镜像还是用我一开始那个颠覆的思路，就是不是存一半然后推导，而是按照blender的镜像编辑那么做。然后可以选择是镜像编辑，对歪的地方有容差，还是强行删一半保持对称 两种」
// 「然后可以只对选择区域修复镜像snap吗」。两半都是真几何（不是后处理器）；镜像面 = 网格体自己坐标的 axis = 0 平面；中缝上的点钉在镜像面上；哪边动了哪边说了算。
// 纯函数（只读 / 改传进来的内核），编辑器在提交和预演两处各调一次（editor.ts mirrorRewrite / mirrorAfter）。
import { MeshKernel, type EdgeShape } from "./mesh-kernel.ts";
import { HIDE_EDGE, faceMaterial } from "./reserved-columns.ts";
import { declareRingEdges, fromShapes, pairKey } from "./ops/ring-edges.ts";
import { splitEdge, splitFace } from "./ops/split.ts";
import type { Pt3 } from "../kernel/kernel.ts";

export type MirrorAxis = 0 | 1 | 2;
/** 镜像编辑（找得到对面的点一起改）/ 强行对称（每一步删掉另一半、照这一半镜回来）。 */
export type MirrorMode = "edit" | "force";
export interface MirrorSetting { readonly mode: MirrorMode; readonly axis: MirrorAxis }
/** 镜像编辑找对面的点的容差、算「在中缝上」的容差（米；调参纪律：物理长度单独定）。 */
export const MIRROR_TOL = 0.001;

export const coordOf = (p: Pt3, a: MirrorAxis): number => (a === 0 ? p.x : a === 1 ? p.y : p.z);
export const withCoord = (p: Pt3, a: MirrorAxis, c: number): Pt3 => (a === 0 ? { x: c, y: p.y, z: p.z } : a === 1 ? { x: p.x, y: c, z: p.z } : { x: p.x, y: p.y, z: c });
export const mirrorPt = (p: Pt3, a: MirrorAxis): Pt3 => withCoord(p, a, -coordOf(p, a));
const sideOf = (c: number, tol: number): -1 | 0 | 1 => (c > tol ? 1 : c < -tol ? -1 : 0);
const dist = (p: Pt3, q: Pt3): number => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);

/** 每个点对面的点（中缝上的 = 自己；对面在容差里找不到 = -1）。空间散列，O(点数)。 */
export function mirrorPairs(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): Map<number, number> {
  const cell = Math.max(tol * 4, 1e-6), key = (p: Pt3): string => `${Math.floor(p.x / cell)},${Math.floor(p.y / cell)},${Math.floor(p.z / cell)}`;
  const grid = new Map<string, number[]>();
  for (const v of m.verts()) { const k = key(m.pt(v)); (grid.get(k) ?? grid.set(k, []).get(k)!).push(v); }
  const out = new Map<number, number>();
  for (const v of m.verts()) {
    const p = m.pt(v);
    if (sideOf(coordOf(p, axis), tol) === 0) { out.set(v, v); continue; }
    const q = mirrorPt(p, axis), cx = Math.floor(q.x / cell), cy = Math.floor(q.y / cell), cz = Math.floor(q.z / cell);
    let best = -1, bd = tol;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (let k = -1; k <= 1; k++) for (const w of grid.get(`${cx + i},${cy + j},${cz + k}`) ?? []) {
      if (w === v) continue;
      const d = dist(m.pt(w), q);
      if (d <= bd && (best < 0 || d < bd || w < best)) { bd = d; best = w; }
    }
    out.set(v, best);
  }
  return out;
}

export interface MirrorMovesResult {
  moves: { v: number; to: Pt3 }[];
  /** 落到中缝上的点并成一个（keep 留；drop = 它的孪生点 + 落点处本来就有的中缝点，一起并进去；at = 并到哪；split = 落点在一条中缝边的中间：先在 t 处劈开它、劈出来的点一起并）。两种模式都有，调用方提交 meshMerge。 */
  merges: { keep: number; drop: number[]; at: Pt3; split?: { edge: number; t: number } }[];
  mirrored: number; unpaired: number; pinned: number;
  /** 想穿过镜像面被夹住的点数（R3）。 */
  clamped: number;
}
/**
 * 挪点在镜像下的纪律（设计稿 `ai-docs/20261028-mirror-redo-design.md` §1，user 10-28「中间的点往外拖不应该变成两个点，而是被吸附在中线上」「往中线拖也是collapse到中线，不要有double point，不要拖到对面去」）：
 * R1 钉：中缝上的点只在面内滑；R3 不穿：跑到对面的点夹在镜像面上；R2 并：落到中缝的点和孪生点并成一个（孪生点自己的目标作废）；
 * 镜像编辑另外补上对面的点（镜过去），两边都被挪了的一对：动得多的那一边说了算（哪边动了哪边为准）；强行对称只管住这一边，另一半事后由对称化重建。
 * m = 挪之前的内核（分边、配对都按挪之前的位置）。输出按点 id 升序（确定性）。
 */
export function mirrorMoves(m: MeshKernel, moves: readonly { v: number; to: Pt3 }[], axis: MirrorAxis, mode: MirrorMode = "edit", tol = MIRROR_TOL): MirrorMovesResult {
  const pairs = mirrorPairs(m, axis, tol), want = new Map<number, Pt3>();
  for (const mv of moves) if (m.hasV(mv.v)) want.set(mv.v, mv.to);
  // 哪边说了算：按两边各自挪了多远加权投票
  let vote = 0;
  for (const [v, to] of want) vote += sideOf(coordOf(m.pt(v), axis), tol) * dist(m.pt(v), to);
  const winner: -1 | 1 = vote < 0 ? -1 : 1;
  const out = new Map<number, Pt3>(), merges: MirrorMovesResult["merges"] = [], dropped = new Set<number>();
  // 落点处本来就有的中缝点（容差内）：一起并（不然落在中缝点上 = 两个重合的点）
  const seamAt = (at: Pt3, skip: number[]): number[] => m.verts().filter((u) => !skip.includes(u) && !dropped.has(u) && sideOf(coordOf(m.pt(u), axis), tol) === 0 && !want.has(u) && dist(m.pt(u), at) <= tol);
  // 落点在一条中缝边（两头都在中缝上）的中间：返回那条边和参数（不在端点附近）；没有 = null。设计稿 §5.5 的边角（不劈的话面会在那里捏一下）
  const seamEdgeAt = (at: Pt3): { edge: number; t: number } | null => {
    for (const e of m.edges()) {
      const a = m.edgeA[e], b = m.edgeB[e];
      if (want.has(a) || want.has(b) || sideOf(coordOf(m.pt(a), axis), tol) !== 0 || sideOf(coordOf(m.pt(b), axis), tol) !== 0) continue;
      const pa = m.pt(a), pb = m.pt(b), dx = pb.x - pa.x, dy = pb.y - pa.y, dz = pb.z - pa.z, L2 = dx * dx + dy * dy + dz * dz;
      if (L2 < 1e-18) continue;
      const t = ((at.x - pa.x) * dx + (at.y - pa.y) * dy + (at.z - pa.z) * dz) / L2;
      if (t * Math.sqrt(L2) <= tol || (1 - t) * Math.sqrt(L2) <= tol) continue;
      if (dist(at, { x: pa.x + dx * t, y: pa.y + dy * t, z: pa.z + dz * t }) <= tol) return { edge: e, t };
    }
    return null;
  };
  let mirrored = 0, unpaired = 0, pinned = 0, clamped = 0;
  for (const [v, to] of [...want].sort((a, b) => a[0] - b[0])) {
    if (dropped.has(v)) continue;                              // 孪生点已经落到中缝、把它并走了：它自己的目标作废
    const s = sideOf(coordOf(m.pt(v), axis), tol), w = pairs.get(v) ?? -1;
    if (s === 0) { out.set(v, withCoord(to, axis, 0)); pinned++; continue; }   // R1
    let t = to;
    if (sideOf(coordOf(t, axis), tol) === -s) { t = withCoord(t, axis, 0); clamped++; }   // R3
    const landed = sideOf(coordOf(t, axis), tol) === 0;
    if (landed) t = withCoord(t, axis, 0);
    if (landed) {   // R2：和孪生点（有的话）+ 落点处的中缝点并成一个
      const drop = [...(w >= 0 ? [w] : []), ...seamAt(t, [v, w])];
      const split = drop.length === (w >= 0 ? 1 : 0) ? seamEdgeAt(t) : null;   // 落点不在已有的中缝点上、而在一条中缝边的中间：先劈开它
      out.set(v, t);
      if (drop.length || split) { for (const d of drop) { out.delete(d); dropped.add(d); } merges.push({ keep: v, drop, at: t, ...(split ? { split } : {}) }); }
      if (w < 0) unpaired++;
      continue;
    }
    if (w < 0) { if (!out.has(v)) out.set(v, t); unpaired++; continue; }
    if (mode === "force") { out.set(v, t); continue; }
    if (want.has(w) && s !== winner) continue;               // 对面也被挪了、而且那边说了算：这个点跟着那边（下面会写）
    out.set(v, t);
    out.set(w, mirrorPt(t, axis)); mirrored++;
  }
  for (const d of dropped) out.delete(d);
  return { moves: [...out].sort((a, b) => a[0] - b[0]).map(([v, to]) => ({ v, to })), merges: merges.sort((a, b) => a.keep - b.keep), mirrored, unpaired, pinned, clamped };
}

/** 这一步动了哪一边（新长出来的点、删掉的点各按 1，挪过的点按挪的距离投票；挪到中缝上的点按它来的那一边算）：+1 / -1；看不出来 = 0。删掉的点 2026-11-09 补上（计划书第 5 层：以前不算删的 = 删一边看不出动的是哪边）。 */
export function sideOfChange(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): -1 | 0 | 1 {
  let vote = 0;
  for (const v of before.verts()) if (!after.hasV(v)) vote += sideOf(coordOf(before.pt(v), axis), tol);
  for (const v of after.verts()) {
    const p = after.pt(v), s = sideOf(coordOf(p, axis), tol);
    if (!before.hasV(v)) { if (s) vote += s; continue; }
    const d = dist(before.pt(v), p);
    if (d > 1e-9) { const s0 = s || sideOf(coordOf(before.pt(v), axis), tol); vote += s0 * d; }
  }
  return vote > 1e-12 ? 1 : vote < -1e-12 ? -1 : 0;
}

/**
 * 挪过的旧点在哪一边（只看这一步之前就在的点，按挪的距离投票；挪到中缝上的按它来的那一边算）：没有旧点挪过 = 0。
 * 强行对称选边的第一顺位（forceSide；2026-11-10 Claude Fable 5.2 审 v0.18.45 时从 sideOfChange 里分出来）：新长的 / 删掉的点不在这里算——
 * 把面朝镜像面挤出、穿过去时，新点落在对面，但人干活的是点名的那一半。
 */
export function sideOfMoved(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): -1 | 0 | 1 {
  let vote = 0;
  for (const v of after.verts()) {
    if (!before.hasV(v)) continue;
    const p = after.pt(v), d = dist(before.pt(v), p);
    if (d > 1e-9) vote += (sideOf(coordOf(p, axis), tol) || sideOf(coordOf(before.pt(v), axis), tol)) * d;
  }
  return vote > 1e-12 ? 1 : vote < -1e-12 ? -1 : 0;
}

/** 一组点 / 边 / 面（边、面按它们的点算）的坐标和在镜像面哪一边：正好在面上 / 一个都没有 = null（打开强行对称时按选区那边为准）。 */
export function sideOfElements(m: MeshKernel, verts: Iterable<number>, edges: Iterable<number>, faces: Iterable<number>, axis: MirrorAxis, tol = MIRROR_TOL): -1 | 1 | null {
  const vs = new Set<number>(verts);
  for (const e of edges) if (m.hasE(e)) { vs.add(m.edgeA[e]); vs.add(m.edgeB[e]); }
  for (const f of faces) if (m.hasF(f)) for (const v of m.faceVerts(f)) vs.add(v);
  let c = 0; for (const v of vs) if (m.hasV(v)) c += coordOf(m.pt(v), axis);
  return sideOf(c, tol) || null;
}

/** 这一半有面吗（有一个点在这一半的面；跨过镜像面的面两半都算：对称化会先把它切开）。 */
function sideHasFaces(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol: number): boolean {
  for (const f of m.faces()) for (const v of m.faceVerts(f)) if (sideOf(coordOf(m.pt(v), axis), tol) === side) return true;
  return false;
}
/** 这一半有没有对称化会带过去的东西：面，或者裸线 / 孤点（v0.18.45 起 symmetrize 也镜它们）——选边和对称化必须说的是同一件事。 */
function sideHasAnything(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol: number): boolean {
  for (const v of m.verts()) if (sideOf(coordOf(m.pt(v), axis), tol) === side) return true;
  return false;
}
/**
 * 强行对称以哪半为准的最后一道（计划书 §3 第 0 层；created 2026-11-09 by Claude Opus 5.5）：想要的那半（wanted）没有面、另一半有 → 换另一半；
 * 两半都没有面 → 有东西（裸线 / 孤点）的那半，wanted 优先；什么都没有 → null = 这一步不对称化（说出来）。
 * 面优先于线（v0.18.45，Opus 定的边界、待 Fable 审）：计划书原文是「没有任何面也没有裸线才换」，但那样「想要的那半只有一条线、另一半是整个模型」= 面全删；换过去最坏丢的是刚画的一条线（有提示、能撤销）。
 * 挡的是：「看不出动的是哪边，默认 + 那半」碰上「+ 那半是空的」= 删掉另一半、镜过来 0 张面 = 整个模型删光（11-09 真 app 里跑出来的：模型整个在 − 那半时打开强行对称，6 张面 → 0）。
 * 不变量：只要模型里有不躺在镜像面上的面，返回值就不是 null，而且按它对称化之后至少留着它那半原有的面。
 * 打开强行对称、每步之后、预演三处选边都必须过它。
 */
export function pickSide(m: MeshKernel, axis: MirrorAxis, wanted: -1 | 1, tol = MIRROR_TOL): -1 | 1 | null {
  const other = -wanted as -1 | 1;
  if (sideHasFaces(m, axis, wanted, tol)) return wanted;
  if (sideHasFaces(m, axis, other, tol)) return other;
  if (sideHasAnything(m, axis, wanted, tol)) return wanted;
  return sideHasAnything(m, axis, other, tol) ? other : null;
}
export interface ForceSide { readonly want: -1 | 1; readonly side: -1 | 1 | null; /** 动了哪边、点了谁都看不出来，用的是上一次的边（或 +）：提示行要说。 */ readonly guessed: boolean }
/**
 * 强行对称这一步以哪半为准（提交 / 预演共用；计划书 §3 第 5 层）= 「人这一步在哪半干活」：
 *   ① 挪了的旧点在哪边（按挪的距离；sideOfMoved）→ ② 指令点名的点 / 边 / 面在之前的哪边 → ③ 新长出来的 / 删掉的在哪边（sideOfChange）→ ④ 上一次的边 → +；最后过 pickSide。
 * 为什么是这个顺序（2026-11-10 Claude Fable 5.2 审 v0.18.45 定的边界规则，两头的反例都有测试 test/mirror-force-symmetric.test.ts）：
 *   · 点名的不能排第一：挪点时点名的就是被挪的点，软选择跨中缝会把坐标和带偏（左边一堆点各挪一点点、右边一个点挪很多 → 坐标和偏左）——所以挪了的按距离先看（Opus 11-09）。
 *   · 新长的不能排在点名的前面：把 + 那半的面朝镜像面挤出、穿过去（推拉一条指令），新点落在 − 那半；以 − 为准 = 挤出的那段和盒子脱开、盒子上那张面被镜回来。
 *     以点名的 + 为准 = 挤出的那段在中缝切开、和对面焊上（同 Blender 镜像修改器的 clipping）。之前是对称的，所以选「人干活的那半」另一半什么都不丢。
 * named 的 id 在 before 的 id 空间里（mirror-ops.ts namedElements 从指令里取）。
 */
export function forceSide(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, named: { verts: readonly number[]; edges: readonly number[]; faces: readonly number[] }, last: -1 | 1 | undefined, tol = MIRROR_TOL): ForceSide {
  const seen = sideOfMoved(before, after, axis, tol) || sideOfElements(before, named.verts, named.edges, named.faces, axis, tol) || sideOfChange(before, after, axis, tol);
  const want = seen || last || 1;
  return { want, side: pickSide(after, axis, want, tol), guessed: !seen };
}
/** 「+X」「−Z」这类说法（提示行里说以哪半为准）。 */
export const sideLabel = (side: -1 | 1, axis: MirrorAxis): string => `${side > 0 ? "+" : "−"}${"XYZ"[axis]}`;

/**
 * 点 / 边 / 面各自加上它们的镜像（找得到的才加；中缝上的 = 自己）：强行对称下「点了谁就对谁做」的操作（删、翻、标记）把对面的一起做（计划书 §3 第 3 层）——
 * 做完自然对称，另一半不用重建、编号不乱；也不用猜「哪边为准」（左边删 A、右边删 B 时，按一边为准会把其中一张镜回来）。
 * 点 = mirrorPairs；边 = 两头的孪生点之间那条边；面 = 点集是镜像点集的那张面。只处理传进来的字段；输出升序去重。
 */
export function withMirrorCounterparts(m: MeshKernel, axis: MirrorAxis, t: { readonly verts?: readonly number[]; readonly edges?: readonly number[]; readonly faces?: readonly number[] }, tol = MIRROR_TOL): { verts?: number[]; edges?: number[]; faces?: number[] } {
  const p = mirrorPairs(m, axis, tol), sorted = (xs: Set<number>): number[] => [...xs].sort((a, b) => a - b), out: { verts?: number[]; edges?: number[]; faces?: number[] } = {};
  if (t.verts) { const s = new Set(t.verts); for (const v of t.verts) { const w = p.get(v) ?? -1; if (w >= 0) s.add(w); } out.verts = sorted(s); }
  if (t.edges) {
    const s = new Set(t.edges);
    for (const e of t.edges) { if (!m.hasE(e)) continue; const a = p.get(m.edgeA[e]) ?? -1, b = p.get(m.edgeB[e]) ?? -1; if (a >= 0 && b >= 0 && a !== b) { const x = m.edgeOf(a, b); if (x >= 0) s.add(x); } }
    out.edges = sorted(s);
  }
  if (t.faces) {
    const setKey = (vs: readonly number[]): string => [...vs].sort((a, b) => a - b).join(","), byVerts = new Map<string, number>();
    for (const f of m.faces()) byVerts.set(setKey(m.faceVerts(f)), f);
    const s = new Set(t.faces);
    for (const f of t.faces) { if (!m.hasF(f)) continue; const ws = m.faceVerts(f).map((v) => p.get(v) ?? -1); if (ws.some((w) => w < 0)) continue; const g = byVerts.get(setKey(ws)); if (g !== undefined) s.add(g); }
    out.faces = sorted(s);
  }
  return out;
}

/** 这些点的镜像孪生点（不含自己 / 中缝上的点 / 对面找不到的）：镜像开着时拖它们，孪生点跟着动——吸附不该吸孪生点原来的位置（ToolCtx.mirrorFollowers；计划书 20261109-audit-fixes-plan 工单 3）。 */
export function mirrorTwins(m: MeshKernel, verts: Iterable<number>, axis: MirrorAxis, tol = MIRROR_TOL): Set<number> {
  const p = mirrorPairs(m, axis, tol), out = new Set<number>();
  for (const v of verts) { const w = p.get(v) ?? -1; if (w >= 0 && w !== v) out.add(w); }
  return out;
}

/**
 * 已经对称了吗（计划书 §3 定理，第 4 层；2026-11-09 Claude Opus 5.5 照条文重写——以前只查点、边存在和面的点集，漏了挖面 / 翻面 / 材质 / 边标记 / 裸线标记）：
 * 点（含孤点）一一对应；每条边（含裸线）的镜像是一条边、标记相同；每张面的镜像（点序倒过来 = 朝向相反）是一张面、材质槽相同；
 * 整张躺在镜像面上的面对应它自己；跨过镜像面的面 / 边镜过去是它自己（同一条查法自然成立）。「隐藏」是看法，不算。
 * 强行对称每步先查它：对称的就不重建另一半（另一半的 id 不乱换）；右上角方片、「开镜像时已经对称」也问它。
 */
export function isSymmetric(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): boolean {
  const p = mirrorPairs(m, axis, tol);
  for (const v of m.verts()) if ((p.get(v) ?? -1) < 0) return false;
  const cols = m.columnDefs().filter((d) => d.on === "edge" && d.id !== HIDE_EDGE.id).map((d) => d.id);   // 边上的每一列（隐藏是看法，不算）
  for (const e of m.edges()) {
    const t = m.edgeOf(p.get(m.edgeA[e])!, p.get(m.edgeB[e])!);
    if (t < 0 || m.isWire(e) !== m.isWire(t) || cols.some((id) => m.edgeValue(e, id) !== m.edgeValue(t, id))) return false;   // 孪生边：裸线位和每一列都一样才算对称
  }
  const ringKey = (r: readonly number[]): string => { let k = 0; for (let i = 1; i < r.length; i++) if (r[i] < r[k]) k = i; return [...r.slice(k), ...r.slice(0, k)].join(","); };
  const byRing = new Map<string, number>();
  for (const f of m.faces()) byRing.set(ringKey(m.faceVerts(f)), f);
  for (const f of m.faces()) {
    const r = m.faceVerts(f);
    if (r.every((v) => p.get(v) === v)) continue;   // 躺在镜像面上 = 它自己
    const g = byRing.get(ringKey(r.map((v) => p.get(v)!).reverse()));
    if (g === undefined || faceMaterial(m, g) !== faceMaterial(m, f)) return false;
  }
  return true;
}

/** 跨过镜像面的面（两侧都有点）有几张：强行对称做不了这种（先在中缝上切一刀）。 */
export function straddlingFaces(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): number {
  let n = 0;
  for (const f of m.faces()) { let pos = false, neg = false; for (const v of m.faceVerts(f)) { const s = sideOf(coordOf(m.pt(v), axis), tol); if (s > 0) pos = true; else if (s < 0) neg = true; } if (pos && neg) n++; }
  return n;
}

export interface BisectResult { cutEdges: number; splitFaces: number; left: number }
/**
 * 沿镜像面切开（Blender Symmetrize / 镜像修改器的 Bisect 同款；user 10-28「镜像你忘了做切割」）：两端在两侧的边在镜像面上劈开（新点钉在面上），
 * 再把跨过镜像面的面沿中缝上的两个点劈成两半。一张面里中缝上的点不止两个（凹多边形被镜像面切成好几段）= 劈不了，数进 left。
 */
export function bisectPlane(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): BisectResult {
  const c = (v: number): number => coordOf(m.pt(v), axis);
  let cutEdges = 0, splitFaces = 0, left = 0;
  for (const e of m.edges()) {
    if (!m.hasE(e)) continue;
    const ca = c(m.edgeA[e]), cb = c(m.edgeB[e]);
    if (!((ca > tol && cb < -tol) || (ca < -tol && cb > tol))) continue;
    const v = splitEdge(m, e, ca / (ca - cb));
    m.setPos(v, withCoord(m.pt(v), axis, 0));
    cutEdges++;
  }
  for (const f of m.faces()) {
    const r = m.faceVerts(f), sides = r.map((v) => sideOf(c(v), tol));
    if (!(sides.includes(1) && sides.includes(-1))) continue;
    const chords = planeChords(m, f, r, sides, axis);
    if (!chords) { left++; continue; }
    // 一刀一刀劈：每一刀找当前含这两个点（且不相邻）的那一块劈开（user 10-28「凹为什么劈不开，努力一下？」）
    const pieces = [f];
    let ok = true;
    for (const [a, b] of chords) {
      const g = pieces.find((x) => { const rr = m.faceVerts(x), ia = rr.indexOf(a), ib = rr.indexOf(b), n = rr.length; return ia >= 0 && ib >= 0 && (ib - ia + n) % n !== 1 && (ia - ib + n) % n !== 1; });
      if (g === undefined) { ok = false; break; }
      pieces.push(splitFace(m, g, a, b));
    }
    if (ok) splitFaces++; else left++;
  }
  return { cutEdges, splitFaces, left };
}

/**
 * 一张跨过镜像面的面要劈的几刀：中缝上「穿过去」的点（前后两侧不同；只碰一下又回同一侧的不算）沿面与镜像面的交线排好序、两两一组 = 一刀
 * （平面多边形被直线切开的标准做法：直线和多边形内部的交集 = 排序后相邻两个穿越点之间的那几段；凹的面就是不止一段）。
 * 有一条边整条贴在镜像面上、面又跨两侧（中缝上连着两个点）= null（少见；说出来不做）。
 */
function planeChords(m: MeshKernel, f: number, r: readonly number[], sides: readonly (-1 | 0 | 1)[], axis: MirrorAxis): [number, number][] | null {
  const n = r.length, cross: number[] = [];
  for (let i = 0; i < n; i++) {
    if (sides[i] !== 0) continue;
    const prev = sides[(i - 1 + n) % n], next = sides[(i + 1) % n];
    if (prev === 0 || next === 0) return null;
    if (prev !== next) cross.push(r[i]);
  }
  if (cross.length < 2 || cross.length % 2) return null;
  const fn = m.faceNormal(f), ax = withCoord({ x: 0, y: 0, z: 0 }, axis, 1);
  const d = { x: fn.y * ax.z - fn.z * ax.y, y: fn.z * ax.x - fn.x * ax.z, z: fn.x * ax.y - fn.y * ax.x };
  if (Math.hypot(d.x, d.y, d.z) < 1e-12) return null;
  const t = (v: number): number => { const p = m.pt(v); return p.x * d.x + p.y * d.y + p.z * d.z; };
  cross.sort((a, b) => t(a) - t(b) || a - b);
  const out: [number, number][] = [];
  for (let i = 0; i < cross.length; i += 2) out.push([cross[i], cross[i + 1]]);
  return out;
}

export interface SymmetrizeResult { removedFaces: number; removedVerts: number; added: number; pinned: number; cutEdges: number; walls: number; /** 镜过去的裸线 / 孤点（v0.18.45 起；T45）。 */ wires: number; points: number }
/**
 * 强行对称：先沿镜像面切开（bisectPlane）；中缝上的点钉回镜像面；删掉 side 的另一边全部面和点；把 side 这边的面镜过去
 * （绕向反过来 = 朝向一致，中缝上的点两边共用 = 焊上）。切开以后还有跨过镜像面的面（凹多边形劈不开）= 抛（调用方在副本上先试，说出来）。边的标记跟着镜过去。
 * 最后 R4：整张躺在镜像面上、镜完变成夹层的面（每条边都夹在 ≥ 3 张面之间）清掉（user 10-28「degenerate和中线上的面也许应该清」，读成「只清会变成夹层的」）。
 * v0.18.45（计划书 §3 第 5 层，2026-11-09 Claude Opus 5.5）：这一边的裸线、孤点也镜过去（T45：以前只镜面，留着的那边有裸线 = 每一步都把另一半整个重建）；
 * 镜过去的面 / 边连「隐藏」一起抄（隐藏不算对称，但不抄的话另一半每次重建都会重新露出来）。做完 isSymmetric 必为真（测试钉住：再对称化一次 = 删 0 加 0）。
 */
export function symmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol = MIRROR_TOL): SymmetrizeResult {
  const cut = bisectPlane(m, axis, tol);
  if (cut.left || straddlingFaces(m, axis, tol)) throw new Error("symmetrize: some faces cross the mirror plane and cannot be cut in two");
  const s = (v: number): -1 | 0 | 1 => sideOf(coordOf(m.pt(v), axis), tol);
  let pinned = 0;
  for (const v of m.verts()) if (s(v) === 0 && coordOf(m.pt(v), axis) !== 0) { m.setPos(v, withCoord(m.pt(v), axis, 0)); pinned++; }
  // 另一边：面（有一个点在另一边就算）删掉，再删没边的另一边的点
  const other = m.faces().filter((f) => m.faceVerts(f).some((v) => s(v) === -side));
  for (const f of other) m.removeFace(f);
  let removedVerts = 0;
  for (const v of m.verts()) if (s(v) === -side) { for (const e of [...m.vEdges(v)]) if (!m.eFaces(e).length) m.removeEdge(e); if (!m.vEdges(v).length) { m.removeVertex(v); removedVerts++; } }
  // 这一边的面镜过去（全在中缝上的面不镜，免得叠两张）；裸线 / 孤点先记下来（面镜完再镜它们）
  const src = m.faces().filter((f) => m.faceVerts(f).some((v) => s(v) === side));
  const wireSrc = m.edges().filter((e) => !m.eFaces(e).length && (s(m.edgeA[e]) === side || s(m.edgeB[e]) === side));
  const pointSrc = m.verts().filter((v) => s(v) === side && !m.vEdges(v).length);
  const twin = new Map<number, number>();
  const tw = (v: number): number => { if (s(v) === 0) return v; let t = twin.get(v); if (t === undefined) { t = m.addVertex(mirrorPt(m.pt(v), axis)); twin.set(v, t); } return t; };
  let added = 0;
  const mirrored = new Map<string, EdgeShape>();   // 镜过去的一对点 → 源边的旧样子（镜过去的边 = 它的一份，边上的列全照抄）
  for (const f of src) {
    const r = m.faceVerts(f), mr = r.map(tw).reverse();
    const wired: [number, number][] = [];   // 源边带着裸线位（以前是线、后来挂上了面）：镜过去的那条也带（结构位跟着一份走；以前整个字节照抄）
    for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], e = m.edgeOf(a, b); mirrored.set(pairKey(tw(a), tw(b)), m.edgeShape(e)); if (m.isWire(e)) wired.push([tw(a), tw(b)]); }
    declareRingEdges(m, mr, fromShapes(mirrored, "copy"));
    m.addFace(mr, { kind: "copy", of: m.shapeOf(f), corners: r.map((_, i) => r.length - 1 - i) }); added++;   // 镜过去的面 = 照抄（对应表倒过来）：两半在画布上是同一块；面上的列（材质、隐藏）一起照抄
    for (const [a, b] of wired) m.setWire(m.edgeOf(a, b), true);
  }
  for (const e of wireSrc) { const a = tw(m.edgeA[e]), b = tw(m.edgeB[e]); if (a !== b && m.edgeOf(a, b) < 0) { const ne = m.addEdge(a, b, { kind: "copy", of: m.edgeShape(e) }); if (m.isWire(e)) m.setWire(ne, true); } }   // 不挂面的边镜过去 = 一份，裸线位照抄（结构位；以前整个字节照抄）
  for (const v of pointSrc) tw(v);
  const walls = removeSeamWalls(m, axis, tol);
  return { removedFaces: other.length, removedVerts, added, pinned, cutEdges: cut.cutEdges, walls, wires: wireSrc.length, points: pointSrc.length };
}

/** 在副本上试一次对称化（会先沿镜像面切开）：成了 = 结果（切了几条边、删了 / 镜了几张面，说给人听），劈不开 = null。编辑器打开强行对称 / 每步之后用它先试。 */
export function trySymmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1): SymmetrizeResult | null { try { return symmetrize(m.clone(), axis, side); } catch { return null; } }

/** R4：整张躺在镜像面上、而且每条边都已经夹在 ≥ 3 张面之间的面（镜完变成两半中间的夹层）删掉；孤零零躺在镜像面上的平面（没有两侧）不碰。返回删了几张。 */
export function removeSeamWalls(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): number {
  let n = 0;
  for (const f of m.faces()) {
    if (!m.faceVerts(f).every((v) => sideOf(coordOf(m.pt(v), axis), tol) === 0)) continue;
    if (m.fEdges(f).every((e) => m.eFaces(e).length >= 3)) { m.removeFaceReported(f, "seam-wall"); n++; }   // 夹层面：删并进报告「没了的面」（属性地基轮第二步，规程第七¾节第 7 条）
  }
  return n;
}

export type SnapSide = "auto" | "flip" | "average";
export interface SnapResult { pairs: number; pinned: number; unpaired: number }
/**
 * 对称对齐（只对选区；Blender Snap to Symmetry）：选中的点在容差里找对面的点，对齐成严格的镜像；中缝附近的点钉到镜像面。
 * 以哪边为准：auto = 选区重心在哪边就以哪边为准（user「8同意」）/ flip = 另一边 / average = 两边取平均。对面找不到的不动、数出来。
 */
export function snapToSymmetry(m: MeshKernel, verts: readonly number[], axis: MirrorAxis, tol: number, mode: SnapSide = "auto"): SnapResult {
  const vs = [...new Set(verts)].filter((v) => m.hasV(v)).sort((a, b) => a - b);
  let c = 0; for (const v of vs) c += coordOf(m.pt(v), axis);
  const centroidSide: -1 | 1 = c < 0 ? -1 : 1, src: -1 | 1 = mode === "flip" ? (-centroidSide as -1 | 1) : centroidSide;
  const pairs = mirrorPairs(m, axis, tol), done = new Set<number>();
  let np = 0, pinned = 0, unpaired = 0;
  for (const v of vs) {
    if (done.has(v)) continue;
    const p = m.pt(v), sv = sideOf(coordOf(p, axis), tol);
    if (sv === 0) { m.setPos(v, withCoord(p, axis, 0)); done.add(v); pinned++; continue; }
    const w = pairs.get(v) ?? -1;
    if (w < 0 || w === v) { unpaired++; done.add(v); continue; }
    const q = m.pt(w);
    if (mode === "average") { const mq = mirrorPt(q, axis), a = { x: (p.x + mq.x) / 2, y: (p.y + mq.y) / 2, z: (p.z + mq.z) / 2 }; m.setPos(v, a); m.setPos(w, mirrorPt(a, axis)); }
    else if (sv === src) m.setPos(w, mirrorPt(p, axis));
    else m.setPos(v, mirrorPt(q, axis));
    done.add(v); done.add(w); np++;
  }
  return { pairs: np, pinned, unpaired };
}

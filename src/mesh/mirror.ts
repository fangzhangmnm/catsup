// mesh/mirror.ts —— 网格体的镜像（编辑方式那一层；纪元账本 FM23 / FM39 / FM134 / FM136）。created 2026-10-28 by Claude Opus 5.5
// user：「所以镜像还是用我一开始那个颠覆的思路，就是不是存一半然后推导，而是按照blender的镜像编辑那么做。然后可以选择是镜像编辑，对歪的地方有容差，还是强行删一半保持对称 两种」
// 「然后可以只对选择区域修复镜像snap吗」。两半都是真几何（不是后处理器）；镜像面 = 网格体自己坐标的 axis = 0 平面；中缝上的点钉在镜像面上；哪边动了哪边说了算。
// 纯函数（只读 / 改传进来的内核），编辑器在提交和预演两处各调一次（editor.ts mirrorRewrite / mirrorAfter）。
import { MeshKernel } from "./mesh-kernel.ts";
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

export interface MirrorMovesResult { moves: { v: number; to: Pt3 }[]; mirrored: number; unpaired: number; pinned: number }
/**
 * 镜像编辑：一组挪点 → 补上对面的点（镜过去）、中缝上的点钉回镜像面。两边都被挪了的一对：动得多的那一边说了算（哪边动了哪边为准）。
 * m = 挪之前的内核（配对按挪之前的位置找）。输出按点 id 升序（确定性）。
 */
export function mirrorMoves(m: MeshKernel, moves: readonly { v: number; to: Pt3 }[], axis: MirrorAxis, tol = MIRROR_TOL): MirrorMovesResult {
  const pairs = mirrorPairs(m, axis, tol), want = new Map<number, Pt3>();
  for (const mv of moves) if (m.hasV(mv.v)) want.set(mv.v, mv.to);
  // 哪边说了算：按两边各自挪了多远加权投票
  let vote = 0;
  for (const [v, to] of want) vote += sideOf(coordOf(m.pt(v), axis), tol) * dist(m.pt(v), to);
  const winner: -1 | 1 = vote < 0 ? -1 : 1;
  const out = new Map<number, Pt3>();
  let mirrored = 0, unpaired = 0, pinned = 0;
  for (const [v, to] of [...want].sort((a, b) => a[0] - b[0])) {
    const s = sideOf(coordOf(m.pt(v), axis), tol), w = pairs.get(v) ?? -1;
    if (s === 0) { out.set(v, withCoord(to, axis, 0)); pinned++; continue; }
    if (w < 0) { if (!out.has(v)) out.set(v, to); unpaired++; continue; }
    if (want.has(w) && s !== winner) continue;               // 对面也被挪了、而且那边说了算：这个点跟着那边（下面会写）
    out.set(v, to);
    out.set(w, mirrorPt(to, axis)); mirrored++;
  }
  return { moves: [...out].sort((a, b) => a[0] - b[0]).map(([v, to]) => ({ v, to })), mirrored, unpaired, pinned };
}

/** 这一步动了哪一边（新长出来的点按 1、挪过的点按挪的距离投票）：+1 / -1；看不出来 = 0。 */
export function sideOfChange(before: MeshKernel, after: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): -1 | 0 | 1 {
  let vote = 0;
  for (const v of after.verts()) {
    const p = after.pt(v), s = sideOf(coordOf(p, axis), tol);
    if (!s) continue;
    if (!before.hasV(v)) { vote += s; continue; }
    const d = dist(before.pt(v), p);
    if (d > 1e-9) vote += s * d;
  }
  return vote > 1e-12 ? 1 : vote < -1e-12 ? -1 : 0;
}

/** 已经对称了吗：每个点都找得到对面、每条边的镜像也是一条边（强行对称每步先查，对称的就不重建另一半 = 另一半的 id 不乱换）。 */
export function isSymmetric(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): boolean {
  const p = mirrorPairs(m, axis, tol);
  for (const v of m.verts()) if ((p.get(v) ?? -1) < 0) return false;
  for (const e of m.edges()) { const a = p.get(m.edgeA[e])!, b = p.get(m.edgeB[e])!; if (a === b || m.edgeOf(a, b) < 0) return false; }
  if (m.faces().length !== new Set(m.faces().map((f) => m.faceVerts(f).map((v) => p.get(v)!).sort((x, y) => x - y).join(","))).size) return false;
  return true;
}

/** 跨过镜像面的面（两侧都有点）有几张：强行对称做不了这种（先在中缝上切一刀）。 */
export function straddlingFaces(m: MeshKernel, axis: MirrorAxis, tol = MIRROR_TOL): number {
  let n = 0;
  for (const f of m.faces()) { let pos = false, neg = false; for (const v of m.faceVerts(f)) { const s = sideOf(coordOf(m.pt(v), axis), tol); if (s > 0) pos = true; else if (s < 0) neg = true; } if (pos && neg) n++; }
  return n;
}

export interface SymmetrizeResult { removedFaces: number; removedVerts: number; added: number; pinned: number }
/**
 * 强行对称：中缝上的点钉回镜像面；删掉 side 的另一边全部面和点；把 side 这边的面镜过去（绕向反过来 = 朝向一致，中缝上的点两边共用 = 焊上）。
 * 跨过镜像面的面 = 抛（调用方先用 straddlingFaces 查，跳过并说出来）。边的标记跟着镜过去。
 */
export function symmetrize(m: MeshKernel, axis: MirrorAxis, side: -1 | 1, tol = MIRROR_TOL): SymmetrizeResult {
  if (straddlingFaces(m, axis, tol)) throw new Error("symmetrize: some faces cross the mirror plane");
  const s = (v: number): -1 | 0 | 1 => sideOf(coordOf(m.pt(v), axis), tol);
  let pinned = 0;
  for (const v of m.verts()) if (s(v) === 0 && coordOf(m.pt(v), axis) !== 0) { m.setPos(v, withCoord(m.pt(v), axis, 0)); pinned++; }
  // 另一边：面（有一个点在另一边就算）删掉，再删没边的另一边的点
  const other = m.faces().filter((f) => m.faceVerts(f).some((v) => s(v) === -side));
  for (const f of other) m.removeFace(f);
  let removedVerts = 0;
  for (const v of m.verts()) if (s(v) === -side) { for (const e of [...m.vEdges(v)]) if (!m.eFaces(e).length) m.removeEdge(e); if (!m.vEdges(v).length) { m.removeVertex(v); removedVerts++; } }
  // 这一边的面镜过去（全在中缝上的面不镜，免得叠两张）
  const src = m.faces().filter((f) => m.faceVerts(f).some((v) => s(v) === side));
  const twin = new Map<number, number>();
  const tw = (v: number): number => { if (s(v) === 0) return v; let t = twin.get(v); if (t === undefined) { t = m.addVertex(mirrorPt(m.pt(v), axis)); twin.set(v, t); } return t; };
  let added = 0;
  const flagCopies: [number, number, number][] = [];
  for (const f of src) {
    const r = m.faceVerts(f), mr = r.map(tw).reverse();
    m.addFace(mr, m.faceMat[f]); added++;
    for (let i = 0; i < r.length; i++) { const e = m.edgeOf(r[i], r[(i + 1) % r.length]); if (e >= 0 && m.edgeFlags[e]) flagCopies.push([tw(r[i]), tw(r[(i + 1) % r.length]), m.edgeFlags[e]]); }
  }
  for (const [a, b, fl] of flagCopies) { const e = m.edgeOf(a, b); if (e >= 0 && a !== b) m.setEdgeFlags(e, fl); }
  return { removedFaces: other.length, removedVerts, added, pinned };
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

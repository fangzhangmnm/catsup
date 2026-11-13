// mesh/ops/make-face.ts —— 造面（Blender F；user 11-13 重做小屋子：「你选中一些东西，按 F 能创建一个面，和 Blender 一样」，统筹插队单）。created 2026-11-13 by Claude Opus 5.5
// 两半：
//   · planMakeFace（只读、纯函数）：选区说的是哪一种 → 补洞（交给现成的 fillOrBridge / meshFill）/ 一圈点（按这个点序造面）/ 两个点（连一条裸线）/ 做不了（人话原因）。
//     认的选法（照 Blender F 的常见用法，统筹单第 3 条）：
//       ① 一圈开口的边 / 这一圈上的点 = 补洞（现成的）；
//       ② 沿现成的边连成一条不闭合的链（三个点以上，或这些点之间的边）= 把链的两头接上；
//       ③ 两条不相邻的边 = 一张四边形（四个点按不交叉的那种排）；
//       ④ 三个以上互不相连的点（或别的散的选法）= 按最贴合的平面绕一圈排好；
//       ⑤ 两个点 = 连一条边（裸线）。
//     做不了要说原因（统筹单第 4 条）：点不够、会造出一条边挂三张面、点共线没有面积、这里已经有这张面 / 这条边。
//     朝向（统筹单第 5 条）：跟着旁边的面走（过共享的开口边和邻面反向；只沾到点 = 和这些点上的面大致同向）；旁边没有面 = 朝着眼睛（eye = 本地坐标里的眼睛位置，调用方给）。
//     朝向在计划里定死、写进点序，指令只照点序造（重放 / 撤销不依赖相机）。
//   · 造（指令 meshMakeFace 的本体 makeFaceRing）和「会坏吗」（faceBlocker）住 duplicate.ts，和补洞一家：新面的来历只许写在白名单文件里（corner-columns 守卫），这个文件只算不造。
import type { MeshKernel } from "../mesh-kernel.ts";
import { edgeLoops, faceBlocker, looseFrame, orientAsHole, ringNewell as newell, type MeshSel } from "./duplicate.ts";
import type { Pt3 } from "../../kernel/geom.ts";

export type FacePlan =
  | { readonly kind: "fill" }                                   // ① 交给 meshFill（补洞），选区原样
  | { readonly kind: "ring"; readonly ring: readonly number[]; readonly how: "chain" | "quad" | "points" | "strip" | "corner";
      /** 填完选区落在哪（顺着填：四边形 = 新的对边、从边来的三角 = 对着原边的点、从点来的三角 = 对着那个点的边）；缺 = 选新面。按点说（新边的编号造了才有）。 */
      readonly after?: { readonly edge: readonly [number, number] } | { readonly vert: number } }
  | { readonly kind: "edge"; readonly a: number; readonly b: number };

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const len = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
const d2 = (a: Pt3, b: Pt3): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;

/**
 * 顺着填（统筹 11-13，user「选中一条边F可以顺着边流往下填」）= 照抄 Blender「Face from Single Vertex or Edge」：
 * 手册（New Edge/Face from Vertices 那一页，projects.blender.org/blender/blender-manual 的 manual/modeling/meshes/editing/vertex/make_face_edge.rst）原文：
 * 「If only a single vertex or edge is selected on the boundary of a hole, Blender creates a face using the neighboring edges.」
 * 「In addition, only the new edge is selected afterwards, making it possible to create another face right away.」
 * 细则对着 Blender 源码 source/blender/editors/mesh/editmesh_tools.cc 的 edbm_add_edge_face_exec__tricky_extend_sel / edbm_add_edge_face_exec__vert_edge_lookup /
 * edbm_add_edge_face_exec__tricky_finalize_sel 三个函数核的：
 *   · 只选着一条边：两头各「除了这条边，正好一条」开口边或裸线、不和这条边挨同一张面 → 远端不同 = 四边形、同一个点 = 三角；填完四边形只选新的对边、三角只选对着原边的点。
 *   · 只选着一个点：正好两条开口边或裸线（两条同是裸线或同是开口边）、不挨同一张面 → 拐角三角；填完只选对着这个点的边。
 * 一头零条 / 两条以上 = 不顺着填，说哪一头怎么了（不说「点不够」）。
 * 「一个点」那一半 user 没点名、统筹转告后说不用拿掉 → 单独一个开关（FILL_CORNER_FROM_VERTEX），要关只关它。
 */
export const FILL_CORNER_FROM_VERTEX = true;
const openAt = (k: MeshKernel, v: number, not: number): number[] => [...k.vEdges(v)].filter((x) => x !== not && k.eFaces(x).length <= 1);
const shareFace = (k: MeshKernel, x: number, y: number): boolean => k.eFaces(x).some((f) => k.eFaces(y).includes(f));
const otherEnd = (k: MeshKernel, e: number, v: number): number => (k.edgeA[e] === v ? k.edgeB[e] : k.edgeA[e]);
function stripFromEdge(k: MeshKernel, e: number, eye: Pt3 | null): FacePlan | string {
  if (k.eFaces(e).length >= 2) return "顺着填：这条边两边都有面了，不在洞边上（选洞边上的一条边再按）";
  const a = k.edgeA[e], b = k.edgeB[e], na = openAt(k, a, e).filter((x) => !shareFace(k, x, e)), nb = openAt(k, b, e).filter((x) => !shareFace(k, x, e));
  const say = (n: number[]): string => (n.length === 0 ? "接不上开口边（不在洞边上）" : `分叉了（那个点上有 ${n.length} 条开口边，不知道往哪接）`);
  if (na.length !== 1 && nb.length !== 1) return `顺着填：这条边两头都${na.length === nb.length ? say(na) : `不行（一头${say(na)}，另一头${say(nb)}）`}`;
  if (na.length !== 1 || nb.length !== 1) return `顺着填：这条边有一头${say(na.length !== 1 ? na : nb)}`;
  const a2 = otherEnd(k, na[0], a), b2 = otherEnd(k, nb[0], b), ring = a2 === b2 ? [a, b, a2] : [a, b, b2, a2];
  const why = faceBlocker(k, ring);
  if (why) return `顺着填：${why}`;
  return { kind: "ring", ring: orient(k, ring, eye), how: "strip", after: a2 === b2 ? { vert: a2 } : { edge: [a2, b2] } };
}
function cornerFromVertex(k: MeshKernel, v: number, eye: Pt3 | null): FacePlan | string {
  const n = openAt(k, v, -1);
  if (n.length < 2) return "顺着填：这个点不在洞边上（接不上两条开口边）";
  if (n.length > 2) return `顺着填：这个点分叉了（有 ${n.length} 条开口边，不知道补哪个角）`;
  if (k.eFaces(n[0]).length !== k.eFaces(n[1]).length) return "顺着填：这个点的两条边一条是裸线、一条挨着面，不知道往哪补";
  if (shareFace(k, n[0], n[1])) return "顺着填：这个点的两条开口边挨着同一张面（是那张面的尖角，不是洞的拐角）";
  const p = otherEnd(k, n[0], v), q = otherEnd(k, n[1], v), ring = [v, p, q], why = faceBlocker(k, ring);
  if (why) return `顺着填：${why}`;
  return { kind: "ring", ring: orient(k, ring, eye), how: "corner", after: { edge: [p, q] } };
}

/** 选区说的是哪一种面（只读）。eye = 本地坐标的眼睛位置（旁边没有面时朝它）；null = 不管。 */
export function planMakeFace(k: MeshKernel, sel: MeshSel, eye: Pt3 | null): FacePlan | string {
  const selE = [...(sel.edges ?? [])].filter((e) => k.hasE(e)).sort((a, b) => a - b), selV = [...(sel.verts ?? [])].filter((v) => k.hasV(v));
  const V = [...new Set([...selV, ...selE.flatMap((e) => [k.edgeA[e], k.edgeB[e]])])].sort((a, b) => a - b);
  if (!V.length) return (sel.faces ?? []).length ? "选的是面——要选点或边（选一圈边 / 几个点）" : "先选点或边";
  // ⑥ 顺着填（Blender 单边 / 单点 F，见上）：只选着一条边（点只是它的两端）/ 只选着一个点，而且没选面
  if (!(sel.faces ?? []).length && selE.length === 1 && selV.every((v) => v === k.edgeA[selE[0]] || v === k.edgeB[selE[0]])) return stripFromEdge(k, selE[0], eye);
  if (FILL_CORNER_FROM_VERTEX && !(sel.faces ?? []).length && !selE.length && selV.length === 1) return cornerFromVertex(k, selV[0], eye);
  // ① 一圈开口的边（或这一圈上的点）= 补洞（现成的）
  const loops = edgeLoops(k, selE.length ? { edges: selE } : { verts: selV });
  if (typeof loops !== "string") {
    if (loops.length === 1 && loops[0].length === V.length) { const why = faceBlocker(k, loops[0]); return why ?? { kind: "fill" }; }   // 一张孤零零的面的三个点也是「一圈开口边」：补洞会叠一张反面上去 = 拒绝（已经有这张面）
    if (loops.length > 1) return `选了 ${loops.length} 圈——一次补一圈；两圈之间连一圈四边形用右键「补洞 / 桥接」`;
  }
  if (V.length < 2) return "点不够——至少要两个点（两个点 = 连一条边，三个以上 = 一张面）";
  // ⑤ 两个点 = 连一条边
  if (V.length === 2) {
    const [a, b] = V;
    if (k.edgeOf(a, b) >= 0) return selE.length ? "点不够——一条边造不出面，至少要三个点" : "这两个点之间已经有边了";
    return { kind: "edge", a, b };
  }
  let ring: number[] | null = null, how: "chain" | "quad" | "points" = "points";
  // ③ 两条不相邻的边 = 四边形：a0 → a1 → 离 a1 近的那个 b → 另一个 b（不交叉）
  if (selE.length === 2 && V.length === 4 && selV.every((v) => V.includes(v))) {
    const [ea, eb] = selE, a0 = k.edgeA[ea], a1 = k.edgeB[ea], b0 = k.edgeA[eb], b1 = k.edgeB[eb];
    const straight = d2(k.pt(a1), k.pt(b0)) + d2(k.pt(a0), k.pt(b1)) <= d2(k.pt(a1), k.pt(b1)) + d2(k.pt(a0), k.pt(b0));
    ring = straight ? [a0, a1, b0, b1] : [a0, a1, b1, b0]; how = "quad";
  }
  // ② 沿现成的边连成一条不闭合的链：选了边 = 只看选中的边；只选了点 = 这些点之间现成的边
  if (!ring) {
    const vs = new Set(V), es = selE.length ? selE : k.edges().filter((e) => vs.has(k.edgeA[e]) && vs.has(k.edgeB[e]));
    if (es.length === V.length - 1) {
      const adj = new Map<number, number[]>(V.map((v) => [v, []]));
      for (const e of es) { adj.get(k.edgeA[e])!.push(k.edgeB[e]); adj.get(k.edgeB[e])!.push(k.edgeA[e]); }
      const ends = V.filter((v) => adj.get(v)!.length === 1);
      if (ends.length === 2 && V.every((v) => adj.get(v)!.length <= 2)) {
        const path = [ends[0]]; let prev = -1, cur = ends[0];
        while (path.length < V.length) { const nx = adj.get(cur)!.find((x) => x !== prev); if (nx === undefined) break; prev = cur; cur = nx; path.push(cur); }
        if (path.length === V.length) { ring = path; how = "chain"; }
      }
    }
  }
  // ④ 散的点：按最贴合的平面绕一圈（先用 looseFrame 的法向排一遍，再用排好的环的 Newell 法向重排一遍）
  if (!ring) {
    const P = V.map((v) => k.pt(v)), fr = looseFrame(P);
    const order = (n: Pt3, u: Pt3, c: Pt3): number[] => { const W = cross(n, u); return V.map((v, i) => ({ v, t: Math.atan2(dot(sub(P[i], c), W), dot(sub(P[i], c), u)) })).sort((a, b) => a.t - b.t || a.v - b.v).map((x) => x.v); };
    if (fr) { ring = order(fr.n, fr.u, fr.c); const n1 = newell(k, ring), l1 = len(n1); if (l1 > 1e-18) ring = order({ x: n1.x / l1, y: n1.y / l1, z: n1.z / l1 }, fr.u, fr.c); }
    else ring = V;   // 全在一条线上：下面的检查说原因
    how = "points";
  }
  const why = faceBlocker(k, ring);
  if (why) return why;
  return { kind: "ring", ring: orient(k, ring, eye), how };
}


/** 朝向：有开口边挨着邻面 = 和邻面反向（同补洞）；只沾到点 = 和这些点上的面大致同向；都没有 = 朝着眼睛。 */
function orient(k: MeshKernel, ring: readonly number[], eye: Pt3 | null): number[] {
  for (let i = 0; i < ring.length; i++) { const e = k.edgeOf(ring[i], ring[(i + 1) % ring.length]); if (e >= 0 && k.eFaces(e).length === 1) return orientAsHole(k, [...ring]); }
  const n = newell(k, ring), seen = new Set<number>();
  let acc: Pt3 = { x: 0, y: 0, z: 0 };
  for (const v of ring) for (const e of k.vEdges(v)) for (const f of k.eFaces(e)) if (!seen.has(f)) { seen.add(f); const m = newell(k, k.faceVerts(f)), l = len(m); if (l > 0) acc = { x: acc.x + m.x / l, y: acc.y + m.y / l, z: acc.z + m.z / l }; }
  if (len(acc) > 1e-9) return dot(n, acc) >= 0 ? [...ring] : [...ring].reverse();
  if (eye) { const c = ring.reduce((s, v) => { const p = k.pt(v); return { x: s.x + p.x, y: s.y + p.y, z: s.z + p.z }; }, { x: 0, y: 0, z: 0 }), cc = { x: c.x / ring.length, y: c.y / ring.length, z: c.z / ring.length }; return dot(n, sub(eye, cc)) >= 0 ? [...ring] : [...ring].reverse(); }
  return [...ring];
}


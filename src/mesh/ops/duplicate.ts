// mesh/ops/duplicate.ts —— 复制选中的几何（Blender Shift+D）、补洞 / 桥接（Blender F / Bridge Edge Loops）。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「12做」（复制选中的几何；补洞和桥接）。纯算子：只按参数加点加面，确定性（同一份内核 + 同一组参数 = 同一批新 id，撤销 / 重放靠它）。
import type { EdgeShape, MeshKernel } from "../mesh-kernel.ts";
import { declareRingEdges, fromShapes, pairKey } from "./ring-edges.ts";
import { FRESH } from "../columns.ts";
import type { Pt3 } from "../../kernel/geom.ts";
import { ringCrossing } from "./split.ts";

export interface MeshSel { readonly faces?: readonly number[]; readonly edges?: readonly number[]; readonly verts?: readonly number[] }

/** 复制：选中的面（连它们的点）、选中的边、选中的点各来一份新的，叠在原处；面带材质槽。返回新的点 / 边 / 面（顺序跟原件的 id 升序）。 */
export function duplicateGeometry(k: MeshKernel, sel: MeshSel): { verts: number[]; edges: number[]; faces: number[] } {
  const faces = [...(sel.faces ?? [])].filter((f) => k.hasF(f)).sort((a, b) => a - b);
  const edges = [...(sel.edges ?? [])].filter((e) => k.hasE(e)).sort((a, b) => a - b);
  const vs = new Set<number>();
  for (const f of faces) for (const v of k.faceVerts(f)) vs.add(v);
  for (const e of edges) { vs.add(k.edgeA[e]); vs.add(k.edgeB[e]); }
  for (const v of sel.verts ?? []) if (k.hasV(v)) vs.add(v);
  const map = new Map<number, number>();
  for (const v of [...vs].sort((a, b) => a - b)) map.set(v, k.addVertex(k.pt(v)));
  const copies = new Map<number, EdgeShape>();   // 复制出来的边 = 原来那条的一份（边上的列全照抄；统筹 11-13：以前一律不带）
  for (const f of faces) { const r = k.faceVerts(f); for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; copies.set(pairKey(map.get(a)!, map.get(b)!), k.edgeShape(k.edgeOf(a, b))); } }
  for (const e of edges) copies.set(pairKey(map.get(k.edgeA[e])!, map.get(k.edgeB[e])!), k.edgeShape(e));
  const nf = faces.map((f) => { const r = k.faceVerts(f), ring = r.map((v) => map.get(v)!); declareRingEdges(k, ring, fromShapes(copies, "copy")); return k.addFace(ring, { kind: "copy", of: k.shapeOf(f), corners: r.map((_, i) => i) }); });   // 复制 = 是它的一份（角一一对应）
  const ne = edges.map((e) => { const a = map.get(k.edgeA[e])!, b = map.get(k.edgeB[e])!, have = k.edgeOf(a, b); if (have >= 0) return have; const x = k.addEdge(a, b, { kind: "copy", of: k.edgeShape(e) }); k.setWire(x, true); return x; });   // 选中的边：已经随面造了的就是它；单独复制出来的不挂面 = 裸线（结构位按拓扑定，和劈边、溶解一样；3c 以前这里留下不挂面又不是线的边，自检不过）
  return { verts: [...map.values()], edges: ne, faces: nf };
}

/** 选中的边（或只选了点时：选中点之间的开口边）连成的圈。每个点在圈里恰好连两条 = 合格；不合格 = 人话错误。 */
export function edgeLoops(k: MeshKernel, sel: MeshSel): number[][] | string {
  let es = [...(sel.edges ?? [])].filter((e) => k.hasE(e));
  if (!es.length && sel.verts?.length) {   // 只选了点：用选中点之间、开口的边（只挨一张面或没有面）
    const vs = new Set(sel.verts.filter((v) => k.hasV(v)));
    es = k.edges().filter((e) => vs.has(k.edgeA[e]) && vs.has(k.edgeB[e]) && k.eFaces(e).length <= 1);
  }
  if (es.length < 3) return "要先选一圈开口的边（至少三条），或者一圈点";
  const adj = new Map<number, number[]>();
  for (const e of es) for (const [a, b] of [[k.edgeA[e], k.edgeB[e]], [k.edgeB[e], k.edgeA[e]]]) { const l = adj.get(a) ?? []; l.push(b); adj.set(a, l); }
  for (const [, l] of adj) if (l.length !== 2) return "选的边要首尾相连成圈（每个点正好连两条）";
  const seen = new Set<number>(), loops: number[][] = [];
  for (const start of [...adj.keys()].sort((a, b) => a - b)) {
    if (seen.has(start)) continue;
    const ring = [start]; seen.add(start);
    let prev = start, cur = Math.min(...adj.get(start)!);
    while (cur !== start) { ring.push(cur); seen.add(cur); const nx = adj.get(cur)!.find((x) => x !== prev)!; prev = cur; cur = nx; }
    loops.push(ring);
  }
  return loops;
}

/** 让这一圈的方向和旁边已有的面一致：填出来的面过共享边要和邻面反向（单面网格的正面 = 环的绕向）。旁边没有面 = 原样。 */
export function orientAsHole(k: MeshKernel, ring: number[]): number[] {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length], e = k.edgeOf(a, b);
    if (e < 0) continue;
    const fs = k.eFaces(e);
    if (fs.length !== 1) continue;
    const fv = k.faceVerts(fs[0]), j = fv.indexOf(a);
    const forward = j >= 0 && fv[(j + 1) % fv.length] === b;   // 邻面走 a → b
    return forward ? [...ring].reverse() : ring;   // 新面要走 b → a
  }
  return ring;
}

/** 补洞 / 桥接：选中的边是一圈 = 补一张面；两圈点数一样 = 中间连一圈四边形（错位按距离挑最近的对齐）。返回新面；不合格 = 人话错误。 */
export function fillOrBridge(k: MeshKernel, sel: MeshSel): { kind: "fill" | "bridge"; faces: number[] } | string {
  const loops = edgeLoops(k, sel);
  if (typeof loops === "string") return loops;
  if (loops.length === 1) { if (faceExists(k, loops[0])) return "这里已经有这张面了（选的是一张面的边，不是洞）"; const ring = orientAsHole(k, loops[0]); return { kind: "fill", faces: [k.addFace(ring, FRESH)] }; }   // 补洞 = 凭空来的；孤零零一张面的一圈边也是「开口」的，不拦就在它背面叠一张（统筹 11-13）
  if (loops.length !== 2) return `选了 ${loops.length} 圈：补洞要一圈，桥接要两圈`;
  const A = orientAsHole(k, loops[0]), B = [...orientAsHole(k, loops[1])].reverse(), n = A.length;   // 桥上的四边形过 A 的边和 A 补洞同向、过 B 的边和 B 补洞反向
  if (B.length !== n) return `两圈的点数不一样（${n} 和 ${B.length}）：桥接要一样多`;
  const d2 = (p: Pt3, q: Pt3): number => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
  let best = 0, bestCost = Infinity;
  for (let o = 0; o < n; o++) { let c = 0; for (let i = 0; i < n; i++) c += d2(k.pt(A[i]), k.pt(B[(i + o) % n])); if (c < bestCost) { bestCost = c; best = o; } }
  const faces: number[] = [];
  for (let i = 0; i < n; i++) faces.push(k.addFace([A[i], A[(i + 1) % n], B[(i + 1 + best) % n], B[(i + best) % n]], FRESH));   // 桥接 = 凭空来的
  return { kind: "bridge", faces };
}

// ---------- 造面（Blender F；make-face.ts 定选区说的是哪一种面、点序和朝向，这里造）。added 2026-11-13 by Claude Opus 5.5 ----------
const len3 = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
const dist2 = (a: Pt3, b: Pt3): number => (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
/** 环的 Newell 法向（长度 = 面积的两倍）。造面（make-face.ts）也用。 */
export function ringNewell(k: MeshKernel, ring: readonly number[]): Pt3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < ring.length; i++) { const p = k.pt(ring[i]), q = k.pt(ring[(i + 1) % ring.length]); x += (p.y - q.y) * (p.z + q.z); y += (p.z - q.z) * (p.x + q.x); z += (p.x - q.x) * (p.y + q.y); }
  return { x, y, z };
}
/** 造这张面会坏的情况（人话）；没有 = null。计划和指令各核一遍。 */
/**
 * 一组点（不看点序）的平面：形心 c、离形心最远那个点的方向 u、和 u 张成面积最大的那个点定法向 n、w = n × u。蝴蝶结这种点序反着绕的也给得出平面（Newell 法会抵消成零）。
 * 全在一条线上（最大的那块面积 ≤ 1e-9 × 点距²）= null。造面排点（make-face.ts）和验点序（faceBlocker）共用。
 */
export function looseFrame(P: readonly Pt3[]): { c: Pt3; u: Pt3; w: Pt3; n: Pt3 } | null {
  if (P.length < 3) return null;
  const c = P.reduce((s, p) => ({ x: s.x + p.x / P.length, y: s.y + p.y / P.length, z: s.z + p.z / P.length }), { x: 0, y: 0, z: 0 });
  const d = (p: Pt3): Pt3 => ({ x: p.x - c.x, y: p.y - c.y, z: p.z - c.z }), X = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  let far = 0, scale = 0; for (let i = 0; i < P.length; i++) { if (dist2(P[i], c) > dist2(P[far], c)) far = i; for (const q of P) scale = Math.max(scale, dist2(P[i], q)); }
  let n: Pt3 = { x: 0, y: 0, z: 0 }; for (const p of P) { const m = X(d(P[far]), d(p)); if (len3(m) > len3(n)) n = m; }
  if (len3(n) <= 1e-9 * Math.max(scale, 1e-12)) return null;
  const lu = len3(d(P[far])), u = { x: d(P[far]).x / lu, y: d(P[far]).y / lu, z: d(P[far]).z / lu }, ln = len3(n), N = { x: n.x / ln, y: n.y / ln, z: n.z / ln };
  return { c, u, w: X(N, u), n: N };
}
export function faceBlocker(k: MeshKernel, ring: readonly number[]): string | null {
  if (ring.length < 3 || new Set(ring).size !== ring.length) return "点不够——至少要三个不同的点";
  const P = ring.map((v) => k.pt(v)), fr = looseFrame(P);
  if (!fr) return "这些点在一条线上，造不出有面积的面";
  // 投到这个平面上：按这个点序连起来自己交叉 = 打结（刀验刀线同一份 split.ts ringCrossing；统筹 11-13：以后按顺序点的「造面」笔第一个会撞上）
  const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z, q = P.map((p) => { const r = { x: p.x - fr.c.x, y: p.y - fr.c.y, z: p.z - fr.c.z }; return { x: dot(r, fr.u), y: dot(r, fr.w) }; });
  if (ringCrossing(q)) return "这些点按这个顺序连起来会自己交叉（打结了）";
  const n = ringNewell(k, ring);
  let scale = 0; for (const v of ring) for (const w of ring) scale = Math.max(scale, dist2(k.pt(v), k.pt(w)));
  if (len3(n) <= 1e-9 * Math.max(scale, 1e-12)) return "这些点围不出面积";
  for (let i = 0; i < ring.length; i++) { const e = k.edgeOf(ring[i], ring[(i + 1) % ring.length]); if (e >= 0 && k.eFaces(e).length >= 2) return "会造出一条边挂三张面（有一条边两边都已经有面了）"; }
  if (faceExists(k, ring)) return "这里已经有这张面了";
  return null;
}
/** 已经有一张面正好是这组点（不看顺序）。补洞和造面共用。 */
export function faceExists(k: MeshKernel, ring: readonly number[]): boolean {
  const want = [...ring].sort((a, b) => a - b).join(",");
  for (const e of k.vEdges(ring[0])) for (const f of k.eFaces(e)) if ([...k.faceVerts(f)].sort((a, b) => a - b).join(",") === want) return true;
  return false;
}
/** 指令 meshMakeFace 的本体：按点序造一张面（两点 = 一条裸线）。返回新面 / 新边；会坏 = 人话错误（什么都没动）。 */
export function makeFaceRing(k: MeshKernel, ring: readonly number[]): { face: number } | { edge: number } | string {
  for (const v of ring) if (!k.hasV(v)) return "选的点已经不在了";
  if (ring.length === 2) {
    const [a, b] = ring;
    if (a === b) return "点不够——至少要两个不同的点";
    if (k.edgeOf(a, b) >= 0) return "这两个点之间已经有边了";
    const e = k.addEdge(a, b, { kind: "fresh" }); k.setWire(e, true);   // 裸线位（结构位）：没有面 = 线
    return { edge: e };
  }
  const why = faceBlocker(k, ring);
  if (why) return why;
  return { face: k.addFace(ring, FRESH) };   // 凭空来的：没有材质、不带画
}

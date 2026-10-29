// mesh/ops/duplicate.ts —— 复制选中的几何（Blender Shift+D）、补洞 / 桥接（Blender F / Bridge Edge Loops）。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「12做」（复制选中的几何；补洞和桥接）。纯算子：只按参数加点加面，确定性（同一份内核 + 同一组参数 = 同一批新 id，撤销 / 重放靠它）。
import type { MeshKernel } from "../mesh-kernel.ts";
import type { Pt3 } from "../../kernel/geom.ts";

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
  const nf = faces.map((f) => k.addFace(k.faceVerts(f).map((v) => map.get(v)!), k.faceMat[f]));
  const ne = edges.map((e) => k.ensureEdge(map.get(k.edgeA[e])!, map.get(k.edgeB[e])!));
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
function orientAsHole(k: MeshKernel, ring: number[]): number[] {
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
  if (loops.length === 1) { const ring = orientAsHole(k, loops[0]); return { kind: "fill", faces: [k.addFace(ring)] }; }
  if (loops.length !== 2) return `选了 ${loops.length} 圈：补洞要一圈，桥接要两圈`;
  const A = orientAsHole(k, loops[0]), B = [...orientAsHole(k, loops[1])].reverse(), n = A.length;   // 桥上的四边形过 A 的边和 A 补洞同向、过 B 的边和 B 补洞反向
  if (B.length !== n) return `两圈的点数不一样（${n} 和 ${B.length}）：桥接要一样多`;
  const d2 = (p: Pt3, q: Pt3): number => (p.x - q.x) ** 2 + (p.y - q.y) ** 2 + (p.z - q.z) ** 2;
  let best = 0, bestCost = Infinity;
  for (let o = 0; o < n; o++) { let c = 0; for (let i = 0; i < n; i++) c += d2(k.pt(A[i]), k.pt(B[(i + o) % n])); if (c < bestCost) { bestCost = c; best = o; } }
  const faces: number[] = [];
  for (let i = 0; i < n; i++) faces.push(k.addFace([A[i], A[(i + 1) % n], B[(i + 1 + best) % n], B[(i + best) % n]]));
  return { kind: "bridge", faces };
}

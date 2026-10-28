// mesh/ops/join.ts —— 并：擦掉两面之间的边 → 一张 n 边形（不管平不平）；二度点溶解。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel, F_WIRE, F_SHARP, F_SMOOTH, F_SOFT } from "../mesh-kernel.ts";

const MARKS = F_SHARP | F_SMOOTH | F_SOFT;

/**
 * 并面（溶解边 e）：e 恰两张不同的面 → 合成一张（fa 保 id、fb 删、e 删）。
 * 合环：把两个环都旋到「以共享边结尾」[…, x, y]；两面绕向一致时 fb 走的是 y→x，fb 的中段 b0…bm 接在 x 后面、y 前面；绕向不一致（fb 也走 x→y）则中段倒着接。
 * 两面共享不止一条边（合出来的环有重复点）→ 抛，不悄悄做。
 */
export function joinFaces(k: MeshKernel, e: number): number {
  if (!k.hasE(e)) throw new Error(`joinFaces: edge ${e} is not alive`);
  const fl = k.eFaces(e);
  if (fl.length !== 2 || fl[0] === fl[1]) throw new Error(`joinFaces: edge ${e} must have exactly two distinct faces (has ${fl.length})`);
  const [fa, fb] = [fl[0], fl[1]];
  const a = k.edgeA[e], b = k.edgeB[e];
  const endWithEdge = (r: number[]): number[] => { const n = r.length; for (let i = 0; i < n; i++) { const p = r[i], q = r[(i + 1) % n]; if ((p === a && q === b) || (p === b && q === a)) { const j = (i + 2) % n; return [...r.slice(j), ...r.slice(0, j)]; } } throw new Error("joinFaces: edge not on ring"); };
  const A = endWithEdge(k.faceVerts(fa)), B = endWithEdge(k.faceVerts(fb));
  const x = A[A.length - 2], y = A[A.length - 1];
  const sameDir = B[B.length - 2] === x;           // fb 也走 x→y = 两面绕向不一致
  const mid = B.slice(0, B.length - 2);
  const ring = [...A.slice(0, A.length - 1), ...(sameDir ? [...mid].reverse() : mid), y];
  if (new Set(ring).size !== ring.length || ring.length < 3) throw new Error("joinFaces: the two faces share more than one edge (result would not be a simple ring)");
  k.setFaceRing(fa, ring);
  k.removeFace(fb);
  if (k.hasE(e)) { if (k.eFaces(e).length) throw new Error("joinFaces: internal: edge still used"); k.removeEdge(e); }
  return fa;
}

/** 溶解二度点 v（只连两条边）：从它所有的面的环里去掉、两邻居连一条边；某张面会少于 3 点 → 抛。返回新边。 */
export function dissolveVertex(k: MeshKernel, v: number): number {
  if (!k.hasV(v)) throw new Error(`dissolveVertex: vertex ${v} is not alive`);
  const es = [...k.vEdges(v)];
  if (es.length !== 2) throw new Error(`dissolveVertex: vertex ${v} has ${es.length} edges (need exactly 2)`);
  const other = (e: number): number => (k.edgeA[e] === v ? k.edgeB[e] : k.edgeA[e]);
  const a = other(es[0]), b = other(es[1]);
  // 手标（棱 / 平滑 / 不画线）两条都有才留（和 SU 体一致；硬软边设计稿 §6 第 3 问默认）；别的位（接缝 / 隐藏）有一条就留
  const f0 = k.edgeFlags[es[0]], f1 = k.edgeFlags[es[1]], flags = ((f0 | f1) & ~MARKS) | (f0 & f1 & MARKS);
  const faces = new Set<number>([...k.eFaces(es[0]), ...k.eFaces(es[1])]);
  for (const f of faces) if (k.faceVerts(f).length <= 3) throw new Error(`dissolveVertex: face ${f} would drop below 3 vertices`);
  for (const f of faces) k.setFaceRing(f, k.faceVerts(f).filter((x) => x !== v));
  const wire = !faces.size;
  for (const e of es) if (k.hasE(e)) { if (k.eFaces(e).length) throw new Error("dissolveVertex: internal"); k.removeEdge(e); }
  k.removeVertex(v);
  const ne = k.ensureEdge(a, b); k.setEdgeFlags(ne, (flags & ~F_WIRE) | (wire ? F_WIRE : 0));
  return ne;
}

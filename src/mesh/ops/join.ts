// mesh/ops/join.ts —— 并：擦掉两面之间的边 → 一张 n 边形（不管平不平）；二度点溶解。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel } from "../mesh-kernel.ts";


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
  k.setFaceRing(fa, ring, { kind: "joined", of: [k.shapeOf(fa), k.shapeOf(fb)] });   // 几张面并成的：公共点两边值一样才算数，不然整张没值（内核记「丢了几张」）
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
  // 两条边并成一条 = 并成：每一列照自己的 merge（棱 / 平滑 / 不画线 / 隐藏都有才留、接缝有一个就留——声明在 reserved-columns.ts）
  const from = [k.edgeShape(es[0]), k.edgeShape(es[1])], existing = k.edgeOf(a, b);
  const faces = new Set<number>([...k.eFaces(es[0]), ...k.eFaces(es[1])]);
  for (const f of faces) if (k.faceVerts(f).length <= 3) throw new Error(`dissolveVertex: face ${f} would drop below 3 vertices`);
  if (faces.size && existing < 0) k.addEdge(a, b, { kind: "joined", of: from });   // 先带着来历造边、再改面（统筹 11-13：不许改面时顺手造空边、回头补）
  for (const f of faces) { const r = k.faceVerts(f), keep = r.map((_, i) => i).filter((i) => r[i] !== v); k.setFaceRing(f, keep.map((i) => r[i]), { kind: "copy", of: k.shapeOf(f), corners: keep }); }   // 溶解点 = 是它的一份（少掉的那个角不在表里）
  const wire = !faces.size;
  for (const e of es) if (k.hasE(e)) { if (k.eFaces(e).length) throw new Error("dissolveVertex: internal"); k.removeEdge(e); }
  k.removeVertex(v);
  if (existing >= 0) k.absorbIntoEdge(existing, from);   // 两个邻居本来就连着 = 并进那条已经在的边（它排最前；以前是拿这两条的标记把它原来的盖掉）
  else if (wire) k.addEdge(a, b, { kind: "joined", of: from });   // 没有面：删掉之后再造（空出来的编号先用，和以前一样）
  const ne = k.edgeOf(a, b);
  if (wire) k.setWire(ne, true);   // 裸线位（结构位）：没有面 = 线
  return ne;
}

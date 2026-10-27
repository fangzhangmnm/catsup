// mesh/ops/delete.ts —— 删：面 / 边 / 点三档（Blender 同款）。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel, F_WIRE } from "../mesh-kernel.ts";

/** 删面。onlyFaces = true：只删面，留下的边成裸线、点留着（Blender「Only Faces」）；false：面独占的边和孤立的点一起删。 */
export function deleteFaces(k: MeshKernel, fs: readonly number[], onlyFaces = false): void {
  const set = [...new Set(fs)].filter((f) => k.hasF(f)).sort((a, b) => a - b);
  const verts = new Set<number>(), edges = new Set<number>();
  for (const f of set) { for (const v of k.faceVerts(f)) verts.add(v); for (const e of k.fEdges(f)) edges.add(e); }
  if (onlyFaces) for (const e of edges) k.setFlags(e, F_WIRE, true);   // 先标裸线，removeFace 就不会顺手删它们
  for (const f of set) k.removeFace(f);
  if (!onlyFaces) for (const v of verts) if (k.hasV(v) && k.vEdges(v).length === 0) k.removeVertex(v);
}

/** 删边：边所在的面一起删（Blender 同款），孤立的点一起删。 */
export function deleteEdges(k: MeshKernel, es: readonly number[]): void {
  const faces = new Set<number>(), verts = new Set<number>();
  for (const e of es) if (k.hasE(e)) { for (const f of k.eFaces(e)) faces.add(f); verts.add(k.edgeA[e]); verts.add(k.edgeB[e]); }
  for (const f of [...faces].sort((a, b) => a - b)) k.removeFace(f);
  for (const e of es) if (k.hasE(e)) k.removeEdge(e);
  for (const v of verts) if (k.hasV(v) && k.vEdges(v).length === 0) k.removeVertex(v);
}

/** 删点：点所在的面和边一起删。 */
export function deleteVerts(k: MeshKernel, vs: readonly number[]): void {
  const edges = new Set<number>();
  for (const v of vs) if (k.hasV(v)) for (const e of k.vEdges(v)) edges.add(e);
  deleteEdges(k, [...edges].sort((a, b) => a - b));
  for (const v of vs) if (k.hasV(v)) k.removeVertex(v);
}

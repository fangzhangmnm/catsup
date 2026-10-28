// mesh/ops/delete.ts —— 删：面 / 边 / 点三档（Blender 同款）。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel, F_WIRE } from "../mesh-kernel.ts";
import { joinFaces, dissolveVertex } from "./join.ts";

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

/**
 * 删一个选区（自由建模的 X / Delete / 删除工具；2026-10-27 Claude Opus 5.5）：先删面（面独占的边和孤立的点一起走）、再删边（连着的面一起）、再删点（连着的边和面一起）——
 * Blender 按选区类型删的三档合成一次。dissolve = 溶解（不开洞）：边 → 两侧的面并成一张（恰两张面才行）、点 → 二度点去掉（两边并成一条）；溶解不了的跳过，返回跳过几个。
 */
export function deleteSelection(k: MeshKernel, t: { verts?: readonly number[]; edges?: readonly number[]; faces?: readonly number[] }, dissolve = false): number {
  let skipped = 0;
  if (dissolve) {
    for (const e of [...new Set(t.edges ?? [])].sort((a, b) => a - b)) { if (!k.hasE(e)) continue; const fs = k.eFaces(e); if (fs.length === 2 && fs[0] !== fs[1]) { try { joinFaces(k, e); } catch { skipped++; } } else skipped++; }
    for (const v of [...new Set(t.verts ?? [])].sort((a, b) => a - b)) { if (!k.hasV(v)) continue; if (k.vEdges(v).length === 2) { try { dissolveVertex(k, v); } catch { skipped++; } } else skipped++; }
    if (t.faces?.length) deleteFaces(k, t.faces);
    return skipped;
  }
  if (t.faces?.length) deleteFaces(k, t.faces);
  if (t.edges?.length) deleteEdges(k, t.edges.filter((e) => k.hasE(e)));
  if (t.verts?.length) deleteVerts(k, t.verts.filter((v) => k.hasV(v)));
  return skipped;
}

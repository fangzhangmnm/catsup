// mesh/select-grow.ts —— 扩一圈 / 缩一圈选区（Blender Select More / Less）。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「4我不是说了是select按第二次的的gizmos吗，做」；设计 = ai-docs/20261027-gizmo-design.md §7（选择工具的手柄 = 扩 / 缩选区的拖动条）。纯函数。
// 规则（Blender 默认那一档）：点 = 沿边连着的点；边 = 共一个点的边；面 = 共一个点的面（Face Step）。缩 = 反过来：挨着没选的那一圈去掉。
import type { MeshKernel } from "./mesh-kernel.ts";

export interface SelSets { verts: Set<number>; edges: Set<number>; faces: Set<number> }
const clone = (s: SelSets): SelSets => ({ verts: new Set(s.verts), edges: new Set(s.edges), faces: new Set(s.faces) });

/** 面 → 它的点；点 → 挨着它的面（一次建好，扩 / 缩多圈共用）。 */
function vertFaces(m: MeshKernel): Map<number, number[]> {
  const out = new Map<number, number[]>();
  for (const f of m.faces()) for (const v of m.faceVerts(f)) { const l = out.get(v); if (l) l.push(f); else out.set(v, [f]); }
  return out;
}
const other = (m: MeshKernel, e: number, v: number): number => (m.edgeA[e] === v ? m.edgeB[e] : m.edgeA[e]);

/** 扩一圈。 */
export function growSelection(m: MeshKernel, s: SelSets): SelSets {
  const out = clone(s);
  for (const v of s.verts) if (m.hasV(v)) for (const e of m.vEdges(v)) out.verts.add(other(m, e, v));
  for (const e of s.edges) if (m.hasE(e)) for (const v of [m.edgeA[e], m.edgeB[e]]) for (const e2 of m.vEdges(v)) out.edges.add(e2);
  if (s.faces.size) { const vf = vertFaces(m); for (const f of s.faces) if (m.hasF(f)) for (const v of m.faceVerts(f)) for (const f2 of vf.get(v) ?? []) out.faces.add(f2); }
  return out;
}
/** 缩一圈：挨着没选的那一圈去掉。 */
export function shrinkSelection(m: MeshKernel, s: SelSets): SelSets {
  const out = clone(s);
  for (const v of s.verts) if (m.hasV(v) && [...m.vEdges(v)].some((e) => !s.verts.has(other(m, e, v)))) out.verts.delete(v);
  for (const e of s.edges) if (m.hasE(e) && [m.edgeA[e], m.edgeB[e]].some((v) => [...m.vEdges(v)].some((e2) => !s.edges.has(e2)))) out.edges.delete(e);
  if (s.faces.size) { const vf = vertFaces(m); for (const f of s.faces) if (m.hasF(f) && m.faceVerts(f).some((v) => (vf.get(v) ?? []).some((f2) => !s.faces.has(f2)))) out.faces.delete(f); }
  return out;
}
/** 从 base 走 steps 圈（正 = 扩、负 = 缩）。 */
export function stepSelection(m: MeshKernel, base: SelSets, steps: number): SelSets {
  let s = clone(base);
  for (let i = 0; i < Math.abs(steps); i++) s = steps > 0 ? growSelection(m, s) : shrinkSelection(m, s);
  return s;
}

// mesh/ops/geometry.ts —— 只改坐标的算子（挪 / 变换；软变换的权重由工具算，这里只收最终坐标）+ 标记。不碰拓扑、不碰邻接。created 2026-10-27 by Claude Fable 5.1
import type { Pt3 } from "../../kernel/geom.ts";
import { applyPt, type Xform } from "../../scene/xform.ts";
import { MeshKernel } from "../mesh-kernel.ts";

/** 选区 → 点集（点 = 自己、边 = 两端、面 = 环上的点；死的跳过、去重）。工具的轴心和「设置原点到选择中心」共用（2026-10-27 Opus 从 tools/mesh-transform.ts 搬下来）。 */
export function selectionVerts(m: MeshKernel, sel: { verts: Iterable<number>; edges: Iterable<number>; faces: Iterable<number> }): number[] {
  const out = new Set<number>();
  for (const v of sel.verts) if (m.hasV(v)) out.add(v);
  for (const e of sel.edges) if (m.hasE(e)) { out.add(m.edgeA[e]); out.add(m.edgeB[e]); }
  for (const f of sel.faces) if (m.hasF(f)) for (const v of m.faceVerts(f)) out.add(v);
  return [...out];
}
export function moveVerts(k: MeshKernel, moves: readonly { v: number; to: Pt3 }[]): void {
  for (const { v, to } of moves) { if (!k.hasV(v)) throw new Error(`moveVerts: vertex ${v} is not alive`); k.setPos(v, to); }
}
export function translateVerts(k: MeshKernel, ids: readonly number[], d: Pt3): void {
  for (const v of ids) { const p = k.pt(v); k.setPos(v, { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z }); }
}
export function transformVerts(k: MeshKernel, ids: readonly number[], X: Xform): void {
  for (const v of ids) k.setPos(v, applyPt(X, k.pt(v)));
}
export function setEdgeFlags(k: MeshKernel, es: readonly number[], mask: number, on: boolean): void {
  for (const e of es) k.setFlags(e, mask, on);
}
export function setFaceMaterial(k: MeshKernel, fs: readonly number[], slot: number): void {
  for (const f of fs) k.setFaceMat(f, slot);
}
/** 翻面：环倒过来（单面网格：朝向 = 环的绕向）。 */
export function flipFaces(k: MeshKernel, fs: readonly number[]): void {
  for (const f of fs) if (k.hasF(f)) k.setFaceRing(f, [...k.faceVerts(f)].reverse());
}

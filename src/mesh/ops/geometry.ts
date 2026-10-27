// mesh/ops/geometry.ts —— 只改坐标的算子（挪 / 变换；软变换的权重由工具算，这里只收最终坐标）+ 标记。不碰拓扑、不碰邻接。created 2026-10-27 by Claude Fable 5.1
import type { Pt3 } from "../../kernel/geom.ts";
import { applyPt, type Xform } from "../../scene/xform.ts";
import { MeshKernel } from "../mesh-kernel.ts";

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
  for (const f of fs) if (k.hasF(f)) { k.faceMat[f] = slot; k.rev++; }
}
/** 翻面：环倒过来（单面网格：朝向 = 环的绕向）。 */
export function flipFaces(k: MeshKernel, fs: readonly number[]): void {
  for (const f of fs) if (k.hasF(f)) k.setFaceRing(f, [...k.faceVerts(f)].reverse());
}

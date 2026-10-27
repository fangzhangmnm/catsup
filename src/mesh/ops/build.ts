// mesh/ops/build.ts —— 建：空处建 n 边形、既有顶点填面、一次性几何体（盒子）。created 2026-10-27 by Claude Fable 5.1
import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel } from "../mesh-kernel.ts";

/** 空处建多边形：新点 + 一张面。 */
export function addPolygon(k: MeshKernel, pts: readonly Pt3[], mat = -1): { face: number; verts: number[] } {
  const verts = pts.map((p) => k.addVertex(p));
  return { face: k.addFace(verts, mat), verts };
}
/** 既有顶点围成一张面（填洞）。 */
export function fillLoop(k: MeshKernel, verts: readonly number[], mat = -1): number { return k.addFace(verts, mat); }

/** 盒子（min, max 对角）：8 点 6 面，面朝外。 */
export function addBox(k: MeshKernel, min: Pt3, max: Pt3, mat = -1): { verts: number[]; faces: number[] } {
  const c = [
    { x: min.x, y: min.y, z: min.z }, { x: max.x, y: min.y, z: min.z }, { x: max.x, y: max.y, z: min.z }, { x: min.x, y: max.y, z: min.z },
    { x: min.x, y: min.y, z: max.z }, { x: max.x, y: min.y, z: max.z }, { x: max.x, y: max.y, z: max.z }, { x: min.x, y: max.y, z: max.z },
  ];
  const v = c.map((p) => k.addVertex(p));
  const F: number[][] = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return { verts: v, faces: F.map((r) => k.addFace(r.map((i) => v[i]), mat)) };
}

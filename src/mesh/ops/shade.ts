// mesh/ops/shade.ts —— 按角度平滑（导入外来网格 / 转换用）：恰两张面的边，两面法向夹角 ≤ deg → 软 + 平滑（共面的三角化内部边自然包含）。
// 用 |cos|：外来文件的绕向可能不一致（相邻两张面法向相反），不让它把本该平滑的边判成硬边。created 2026-10-27 by Claude Fable 5.1
import { MeshKernel, F_SOFT, F_SMOOTH } from "../mesh-kernel.ts";
import type { Pt3 } from "../../kernel/geom.ts";

/** 返回新标成软 + 平滑的边数。 */
export function smoothByAngle(k: MeshKernel, deg: number): number {
  const cos = Math.cos((deg * Math.PI) / 180);
  const normals = new Map<number, Pt3>();
  const nrm = (f: number): Pt3 => { let n = normals.get(f); if (!n) { n = k.faceNormal(f); normals.set(f, n); } return n; };
  let count = 0;
  for (const e of k.edges()) {
    const fl = k.eFaces(e);
    if (fl.length !== 2 || fl[0] === fl[1]) continue;
    const a = nrm(fl[0]), b = nrm(fl[1]);
    if (Math.abs(a.x * b.x + a.y * b.y + a.z * b.z) < cos) continue;
    if ((k.edgeFlags[e] & (F_SOFT | F_SMOOTH)) === (F_SOFT | F_SMOOTH)) continue;
    k.setEdgeFlags(e, k.edgeFlags[e] | F_SOFT | F_SMOOTH); count++;
  }
  return count;
}

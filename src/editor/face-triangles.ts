// face-triangles.ts —— 面的三角剖分（世界坐标；含洞）：选中高亮的世界坐标那条路（带贴图的面）和 OBJ 导出（字节出口）共用。
// Tron 第一刀 6c（v0.17.9，Claude Fable 5.1）：从 render3 搬出，并**不再借 three 的 earcut**（ShapeUtils.triangulateShape）——平的面也走
// format/triangulate.ts 的 triangulateRings（vendored earcut + 约束 Delaunay 翻边 = 显卡上画的、导出 glb 的同一份剖分）。
//   · 平的面（brep 的膜，离平面 ≤ τ）：三角的角抬回最佳拟合平面（字节出口不变：OBJ 里的点仍在平面上）。
//   · 不平的面（网格体的面可以扭；2026-10-27 Opus，user「面的预览也是坏的」）：角用顶点的真实 3D 坐标，剖分在平面基里做（定连接）——和主渲染
//     （pool-mesh.ts buildFaceRec）同一个剖分，高亮就是把这张面换个颜色（user「应该是替换」），不会有半张在真面底下被深度测试吃掉。
//   · 画面上的差别 = 0：平面上的平涂三角怎么切对角线都是同一块颜色（法向 = 平面法向、无插值）。OBJ 导出里带洞的面，三角形的对角线可能和以前不同
//     （以前 earcut、现在翻成 Delaunay），拓扑等价、顶点不变。
import type { GeomView } from "../scene/world-view.ts";
import type { FaceId, Pt3 } from "../kernel/kernel.ts";
import { triangulateRings } from "../format/triangulate.ts";

export function faceTriangles(k: GeomView, id: FaceId): [Pt3, Pt3, Pt3][] {
  const f = k.face(id), rec = k.planeOf(id);
  if (!f || !rec) return [];
  const rings = [f.outer, ...f.holes];
  const n = rec.plane.n, d = rec.plane.d, { u, v } = rec.basis;
  const lift = (q: { x: number; y: number }): Pt3 => ({ x: u.x * q.x + v.x * q.y + n.x * d, y: u.y * q.x + v.y * q.y + n.y * d, z: u.z * q.x + v.z * q.y + n.z * d });
  const flat = rings.flatMap((r) => r.pts);
  const pts3 = rings.flatMap((r) => r.vids.map((vid) => (k.graph.hasVertex(vid) ? k.graph.pt(vid) : null)));
  let off = 0;
  for (const p of pts3) { if (!p) { off = -1; break; } off = Math.max(off, Math.abs(n.x * p.x + n.y * p.y + n.z * p.z - d)); }
  const real = off > 1e-6 && pts3.length === flat.length;
  const P3: Pt3[] = real ? (pts3 as Pt3[]) : flat.map(lift);
  const idx: number[][] = [];
  let base = 0;
  for (const r of rings) { const len = real ? r.vids.length : r.pts.length; idx.push(Array.from({ length: len }, (_, i) => base + i)); base += len; }
  // 绕向统一成「绕 +n 逆时针」：两个表面（DT8）靠 gl_FrontFacing 分正反，三角的绕向必须一致
  return triangulateRings(P3, rec.plane, idx[0], idx.slice(1)).map(([a, b, c]) => {
    const A = P3[a], B = P3[b], C = P3[c];
    const cx = (B.y - A.y) * (C.z - A.z) - (B.z - A.z) * (C.y - A.y), cy = (B.z - A.z) * (C.x - A.x) - (B.x - A.x) * (C.z - A.z), cz = (B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x);
    return cx * n.x + cy * n.y + cz * n.z >= 0 ? [A, B, C] : [A, C, B];
  });
}

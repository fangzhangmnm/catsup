// marquee.ts —— 桌面框选（window 语义）。**桌面专属**：吃 OrbitCamera 的屏幕投影，是唯一合法看「屏」的拾取路径；
// 不在拾取层（pick.ts 零相机零屏幕，build.sh 0.65 护栏）。VR 框选 = 显式冻结投影平面（反省稿 §3.8），待做。
// created 2026-09-08 by Claude Fable 5.1（A17 虚拟屏 sunset 时从 pick.ts 搬出）
// 2026-10-28 Claude Opus 5.5：① X 光关着只框看得见的（纪元账本 FM44 / FM48 user「X 光关着时框选是不是只选看得见的当然啊，不然为什么要X ray」——
//   拍过但一直没落地，user 10-28 追问「不x光不会选背面吗？」）；遮挡和单击同一台（pick.ts occlusionTest）。
// ② 自由建模框点（FM139 user 10-28「同意」）：框里看得见的点进选区，两端都框进来的边、角全框进来的面跟着选上。

import type { EdgeId, FaceId, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
import { facesAtVertex, occlusionTest } from "./pick.ts";

/**
 * 屏幕空间框选（window 语义）。**桌面专属**（吃 OrbitCamera 的屏幕投影）。
 * verts = false（硬表面）：边 = 两端投影都在框内且中点看得见；面 = 外环全部顶点投影在框内且形心看得见。
 * verts = true（自由建模）：点 = 投影在框内且看得见；边 = 两端都框进来；面 = 角全框进来且形心看得见（侧着看的薄片不算）。
 * xray = true：不看遮挡（背面、被挡住的照样框进来）。
 */
export function marqueeScreen(
  k: GeomView,
  cam: OrbitCamera,
  vp: Viewport,
  m: { minX: number; minY: number; maxX: number; maxY: number },
  opts: { xray?: boolean; verts?: boolean } = {},
): { verts: Set<VertexId>; edges: Set<EdgeId>; faces: Set<FaceId> } {
  const inBox = (p: { x: number; y: number }): boolean => p.x >= m.minX && p.x <= m.maxX && p.y >= m.minY && p.y <= m.maxY;
  const hidden = occlusionTest(k, cam, vp, !!opts.xray);
  const sel = { verts: new Set<VertexId>(), edges: new Set<EdgeId>(), faces: new Set<FaceId>() };
  const boxed = new Set<VertexId>();
  for (const v of k.vertices()) if (inBox(cam.angularPx(v, vp))) boxed.add(v.id);
  if (opts.verts) for (const id of boxed) if (!hidden(k.graph.pt(id), facesAtVertex(k, id))) sel.verts.add(id);
  const pts = opts.verts ? sel.verts : boxed;
  for (const e of k.edges()) {
    if (!pts.has(e.a) || !pts.has(e.b)) continue;
    if (!opts.verts) {
      const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
      if (hidden({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }, new Set(e.faceLinks))) continue;
    }
    sel.edges.add(e.id);
  }
  for (const f of k.faces()) {
    if (!f.outer.vids.every((v) => pts.has(v))) continue;
    const rings = k.faceRings3(f.id);
    if (!rings) continue;
    let x = 0, y = 0, z = 0;
    for (const p of rings.outer) { x += p.x; y += p.y; z += p.z; }
    const n = rings.outer.length || 1;
    if (hidden({ x: x / n, y: y / n, z: z / n }, new Set([f.id]))) continue;
    sel.faces.add(f.id);
  }
  return sel;
}

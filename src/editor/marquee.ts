// marquee.ts —— 桌面框选（window 语义）。**桌面专属**：吃 OrbitCamera 的屏幕投影，是唯一合法看「屏」的拾取路径；
// 不在拾取层（pick.ts 零相机零屏幕，build.sh 0.65 护栏）。VR 框选 = 显式冻结投影平面（反省稿 §3.8），待做。
// created 2026-09-08 by Claude Fable 5.1（A17 虚拟屏 sunset 时从 pick.ts 搬出）

import type { EdgeId, FaceId, Kernel } from "../kernel/kernel.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";

/** 屏幕空间框选（window 语义）：边=两端投影都在框内；面=外环全部顶点投影在框内。**桌面专属**（吃 OrbitCamera 的屏幕投影）；
 *  VR 框选 = 显式冻结投影平面（反省稿 §3.8，唯一合法的「屏」），待做。 */
export function marqueeScreen(
  k: Kernel,
  cam: OrbitCamera,
  vp: Viewport,
  m: { minX: number; minY: number; maxX: number; maxY: number },
): { edges: Set<EdgeId>; faces: Set<FaceId> } {
  const inBox = (p: { x: number; y: number }): boolean => p.x >= m.minX && p.x <= m.maxX && p.y >= m.minY && p.y <= m.maxY;
  const sel = { edges: new Set<EdgeId>(), faces: new Set<FaceId>() };
  for (const e of k.edges()) {
    if (inBox(cam.angularPx(k.graph.pt(e.a), vp)) && inBox(cam.angularPx(k.graph.pt(e.b), vp))) sel.edges.add(e.id);
  }
  for (const f of k.faces()) {
    const rings = k.faceRings3(f.id);
    if (rings && rings.outer.every((p) => inBox(cam.angularPx(p, vp)))) sel.faces.add(f.id);
  }
  return sel;
}

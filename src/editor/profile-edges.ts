// profile-edges.ts —— SU 轮廓线的判定（粗线稿：轮廓边加粗）。纯函数，零 three；render3 的 edgeMat 顶点着色器是它的 GLSL 镜像——改一边必须改另一边。
// created 2026-10-26 by Claude Opus 5.5（家族周账 F-87：user 10-25 截图「圆柱正面那圈边线一段粗一段细」）
// 以前按两张面的法向判「一张朝镜头、一张背着」= 剪影；可膜存的是平面的**规范**法向，圆柱一圈有一半朝里 → 正面那圈一半判成剪影（粗）、
// 背面真正的剪影反而一半判成内边（细）。改成不看法向的判法：剪影 = 两张面伸向「过这条边和视线的那张平面」的同一侧。
import { type Pt3, cross3, dot3, sub3 } from "../kernel/geom.ts";
import type { EdgeId, FaceId, Kernel } from "../kernel/kernel.ts";
import { faceLeftSign } from "../kernel/flood.ts";

/** 面 fid 从边 eid（方向 a→b）往面里走的方向（在面的平面里、垂直于边；没长度要求）：σ·(n × (b − a))，σ = 沿 a→b 走面在左 +1 / 右 −1。和法向正负无关。 */
export function inwardAcrossEdge(k: Pick<Kernel, "face" | "planeOf">, fid: FaceId, eid: EdgeId, a: Pt3, b: Pt3): Pt3 {
  const rec = k.planeOf(fid), sg = faceLeftSign(k, fid, eid);
  if (!rec || sg === null) return { x: 0, y: 0, z: 0 };
  const w = cross3(rec.plane.n, sub3(b, a));
  return { x: w.x * sg, y: w.y * sg, z: w.z * sg };
}
/** 剪影：两张面（各自往面里走的方向 wA / wB）在过边 a→b 和视线 view 的平面的同一侧。view = 从眼睛到边上一点的方向（正交 = 视向）。GLSL 同式。 */
export function isSilhouette(wA: Pt3, wB: Pt3, a: Pt3, b: Pt3, view: Pt3): boolean {
  const m = cross3(sub3(b, a), view);
  return dot3(wA, m) * dot3(wB, m) > 0;
}

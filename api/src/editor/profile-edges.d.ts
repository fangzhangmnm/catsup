import { type Pt3 } from "../kernel/geom.ts";
import type { EdgeId, FaceId, Kernel } from "../kernel/kernel.ts";
/** 面 fid 从边 eid（方向 a→b）往面里走的方向（在面的平面里、垂直于边；没长度要求）：σ·(n × (b − a))，σ = 沿 a→b 走面在左 +1 / 右 −1。和法向正负无关。 */
export declare function inwardAcrossEdge(k: Pick<Kernel, "face" | "planeOf">, fid: FaceId, eid: EdgeId, a: Pt3, b: Pt3): Pt3;
/** 粗线旗：面数（0 悬空 / 1 边界 / 2 内边或剪影 / 3+ 非流形）+ 这个数 = 软边 / 折线，只在转成外轮廓时画（I12，2026-10-30 Opus；GLSL 同）。−1 = 由标记那份画。 */
export declare const CONTOUR_ONLY = 10;
/** 一条边这一眼怎么画（GLSL profile-line-shader 的镜像，改一边改另一边）：hidden = 不画（零宽）；profile = 加粗的轮廓；inner = 普通内边。silhouette = isSilhouette 的结果。 */
export declare function lineKind(flag: number, silhouette: boolean): "hidden" | "profile" | "inner";
/** 剪影：两张面（各自往面里走的方向 wA / wB）在过边 a→b 和视线 view 的平面的同一侧。view = 从眼睛到边上一点的方向（正交 = 视向）。GLSL 同式。 */
export declare function isSilhouette(wA: Pt3, wB: Pt3, a: Pt3, b: Pt3, view: Pt3): boolean;

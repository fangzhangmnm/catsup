import type { EdgeId, FaceId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
/** 屏幕空间框选（window 语义）：边=两端投影都在框内；面=外环全部顶点投影在框内。**桌面专属**（吃 OrbitCamera 的屏幕投影）；
 *  VR 框选 = 显式冻结投影平面（反省稿 §3.8，唯一合法的「屏」），待做。 */
export declare function marqueeScreen(k: GeomView, cam: OrbitCamera, vp: Viewport, m: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}): {
    edges: Set<EdgeId>;
    faces: Set<FaceId>;
};

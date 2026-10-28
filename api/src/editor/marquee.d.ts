import type { EdgeId, FaceId, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
/**
 * 屏幕空间框选（window 语义）。**桌面专属**（吃 OrbitCamera 的屏幕投影）。
 * verts = false（硬表面）：边 = 两端投影都在框内且中点看得见；面 = 外环全部顶点投影在框内且形心看得见。
 * verts = true（自由建模）：点 = 投影在框内且看得见；边 = 两端都框进来；面 = 角全框进来且形心看得见（侧着看的薄片不算）。
 * xray = true：不看遮挡（背面、被挡住的照样框进来）。
 */
export declare function marqueeScreen(k: GeomView, cam: OrbitCamera, vp: Viewport, m: {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}, opts?: {
    xray?: boolean;
    verts?: boolean;
}): {
    verts: Set<VertexId>;
    edges: Set<EdgeId>;
    faces: Set<FaceId>;
};

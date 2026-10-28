import type { EdgeId, FaceId, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "../scene/world-view.ts";
import type { OrbitCamera, Viewport } from "./camera.ts";
/** 屏幕上的一块区域（CSS px，canvas 本地）：框 = 矩形；套索 = 一圈折线（自动闭合；UX 账本 UX5 套索，2026-10-28 Claude Opus 5.5）。 */
export type ScreenArea = {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
} | {
    readonly pts: readonly {
        readonly x: number;
        readonly y: number;
    }[];
};
/** 点在不在区域里：框 = 含边界；套索 = 奇偶规则（射线法，先用包围盒筛）。 */
export declare function areaTest(a: ScreenArea): (p: {
    x: number;
    y: number;
}) => boolean;
/**
 * 屏幕空间框选 / 套索（window 语义：整个进区域才算）。**桌面专属**（吃 OrbitCamera 的屏幕投影）。
 * verts = false（硬表面）：边 = 两端投影都在框内且中点看得见；面 = 外环全部顶点投影在框内且形心看得见。
 * verts = true（自由建模）：点 = 投影在框内且看得见；边 = 两端都框进来；面 = 角全框进来且形心看得见（侧着看的薄片不算）。
 * xray = true：不看遮挡（背面、被挡住的照样框进来）。
 */
export declare function marqueeScreen(k: GeomView, cam: OrbitCamera, vp: Viewport, m: ScreenArea, opts?: {
    xray?: boolean;
    verts?: boolean;
}): {
    verts: Set<VertexId>;
    edges: Set<EdgeId>;
    faces: Set<FaceId>;
};

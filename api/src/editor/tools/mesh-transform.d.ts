import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
export type MeshXformKind = "move" | "rotate" | "scale";
/** 网格体选区 / 命中 → 点集（边 = 两端、面 = 环上的点）。 */
export declare function meshTargets(m: MeshKernel, sel: {
    verts: Iterable<number>;
    edges: Iterable<number>;
    faces: Iterable<number>;
}): number[];
export declare class MeshTransformTool implements ToolHandler {
    readonly grammar: "steps";
    readonly lock: "axis";
    readonly tool: MeshXformKind;
    private vids;
    private base;
    private pivotW;
    private grabW;
    private start;
    private cur;
    private shift;
    private handleW;
    private snapT;
    constructor(kind: MeshXformKind);
    active(): boolean;
    cancel(): void;
    sample(): Record<string, number>;
    live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
    describe(): Record<string, unknown>;
    down(ctx: ToolCtx, ev: ToolPointer): void;
    track(ctx: ToolCtx, s: {
        x: number;
        y: number;
    }): void;
    /** 挪的吸附目标（Shift）：光标吸附圈里最近的点 > 边上最近的点 > 光标射线打到的面；被挪的点、连着它们的边 / 面不算。O(网格)，几千面以内每帧零点几毫秒。 */
    private snapTarget;
    liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string;
    /** 当前拖动 → 每个点的新本地坐标 + 读数。 */
    private solve;
    private commit;
    private verb;
    /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。不用 pick.ts cameraPlane：那个是「最朝向镜头的轴平面」（SU 画图用），等轴视角下是地面，锁 Z 就挪不动了。 */
    private onPlane;
}

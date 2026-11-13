import type { Pt3 } from "../../kernel/kernel.ts";
import type { SnapKind } from "../solver.ts";
import type { ToolCtx } from "../tool-handler.ts";
/** 吸附目标：光标吸附圈里最近的点（含原点）> 线（边上最近的点、三根轴）> 光标射线打到的面；moving 里的点、连着它们的边 / 面不算。O(网格)，几千面以内每帧零点几毫秒。 */
export declare function meshSnapTarget(ctx: ToolCtx, s: {
    x: number;
    y: number;
}, moving: {
    has(v: number): boolean;
}): {
    p: Pt3;
    kind: SnapKind;
} | null;
/** 射线 × 三角形（Möller–Trumbore）：命中 = 射线参数 t（> 0）+ 重心坐标 u、v（点 = a + (b − a)·u + (c − a)·v）；没中 = null。刀在面里的点用重心坐标换回定义坐标。 */
export declare function rayTriHit(o: Pt3, d: Pt3, a: Pt3, b: Pt3, c: Pt3): {
    t: number;
    u: number;
    v: number;
} | null;

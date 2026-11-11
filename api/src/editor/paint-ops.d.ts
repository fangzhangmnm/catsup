import type { Op } from "./ops.ts";
import type { Scene } from "../scene/scene.ts";
export type PaintOutcome = null | {
    readonly rejected: string;
} | {
    readonly target: string;
};
type StartPaint = Extract<Op, {
    op: "startPaint";
}>;
type MeshPaintFaces = Extract<Op, {
    op: "meshPaintFaces";
}>;
type MeshLayoutPaint = Extract<Op, {
    op: "meshLayoutPaint";
}>;
/** 换别的定义的画上来的原因（startPaint / meshPaintFaces 共用）。 */
export declare const OTHER_DEF_PAINT = "\u8FD9\u5F20\u753B\u662F\u522B\u7684\u7269\u4EF6\u7684\uFF1A\u753B\u53EA\u80FD\u6362\u5230\u5B83\u81EA\u5DF1\u90A3\u4E2A\u7269\u4EF6\u7684\u9762\u4E0A";
export declare function applyMeshPaintFaces(s: Scene, op: MeshPaintFaces): PaintOutcome;
/**
 * 开始画（一步撤销）：uvSets 加一行 + 内核加同 GUID 的一列 → 用 1-3a 的铺法给这些面铺上（没给密度 = 1024 见方里找放得下的最大密度，记进这一行）
 * → 贴图表加一行（分层的、没有字节、value = 颜色、layout 指着这个定义和这一套）→ 材质表加一个（颜色那一槽指着它）→ 这些面换成它（paintMeshFaces）。
 * 拒绝（什么都不改）：不是网格体；一张活着的面都没有；三个 GUID 里有已经存在的；铺不下（1-3a 的原因）。
 */
export declare function applyStartPaint(s: Scene, op: StartPaint): PaintOutcome;
/**
 * 给走画但还没有位置的面补一块（1-3a 的「给新面补一块」，partial）：这个网格体上每一套被画用着的贴图坐标，找出走这张画、角上还没有值的面
 * （faces = 只看这些，收尾时 = 改动日志给的这一步动过的面；不给 = 全部），铺上；已经铺好的角一个数都不变。画布不够就往下加高（256 的倍数），那一行换成新的高。
 * 加到上限（4096）还放不下：不拒绝、不抛，放得下的照铺，放不下的面留着没有值（收尾那一步数出来、明着说）。同样的网格体 = 同样的结果（面按编号的先后铺）。
 */
export declare function applyMeshLayoutPaint(s: Scene, op: MeshLayoutPaint): PaintOutcome;
export {};

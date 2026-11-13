import { type TexelTable } from "./texel-table.ts";
import type { SpacePaintDeps } from "./space-paint.ts";
import type { SpaceProgram } from "./space-gpu.ts";
import type { Guid } from "../format/guid.ts";
/** 填色程序（一对）：一个实例 = 一个行段 [x, y, 长度, 1]（离屏图的格子坐标），整块写当前颜色、不透明。 */
export declare const SPACE_FILL: SpaceProgram;
/** 这张面能不能填：在哪块多边形 / 这张面没排进画布（走这张画、但角上没有贴图坐标）/ 那块多边形一格都没分到（太小，格都归了邻居）。 */
export type FillAim = {
    readonly poly: number;
    readonly cells: number;
} | {
    readonly why: "no-layout" | "no-cells";
};
/** 归属表里这张面的情况（不碰显卡、不开档口；画画控制器落下去之前先问）。 */
export declare function fillAimOf(t: TexelTable, face: number): FillAim;
export declare class SpaceFillStroke {
    private readonly d;
    private readonly color;
    private readonly board;
    private readonly gpu;
    /** 这张画（正在编辑的这一份摆放）的归属表（画画的准备里现成的，借来读）。 */
    readonly table: TexelTable;
    private frame;
    private session;
    private ext;
    private layerId;
    /** 已经填了的多边形 / 还没画进薄层的。 */
    private readonly done;
    private pending;
    /** 这一下到现在碰过的格（落层只读回这些格）/ 上一次准备之后变了的格（报给内核和显示那一侧）。 */
    private readonly all;
    private changed;
    private box;
    private finishing;
    private broken;
    private readonly unhook;
    private readonly untrack;
    constructor(d: SpacePaintDeps, texture: Guid, color: readonly [number, number, number]);
    /** 填这一块多边形（fillAimOf 给的号）。已经填过 = false。真画进去在下一次准备里。 */
    add(poly: number): boolean;
    /** 填了几块（探针 / 提示行）。 */
    get count(): number;
    /** 松手：没画进去的画进去 → 落层（内核一步）→ 交给三维的撤销栈（一步）。 */
    up(): void;
    cancel(): void;
    private prepare;
    /** 交给档口：这一下到现在的范围；松手那一次连碰过的格一起交（落层只读回这些格）。 */
    private hostLayers;
    private close;
}

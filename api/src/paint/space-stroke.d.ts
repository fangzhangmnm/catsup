import type { Pt3 } from "../kernel/geom.ts";
import type { ResolvedBrush } from "./kernel/src/common/resolved-brush.ts";
import { type PaintTarget, type TargetGeo } from "./space-target.ts";
import { type SpacePath } from "./space-path.ts";
import { type Reach } from "./tip-reach.ts";
export interface SpaceCamera {
    /** 屏幕一点 → 世界里的射线。 */
    ray(sx: number, sy: number): {
        readonly origin: Pt3;
        readonly dir: Pt3;
    };
    /** 世界里这一点那里，一个屏幕像素在空间里多大（世界长度）。 */
    pixelSize(p: Pt3): number;
    /** 名单之外的东西挡在这条射线 t 之前吗（不给 = 没有）。 */
    occluded?(origin: Pt3, dir: Pt3, t: number): boolean;
}
export interface SpaceTip {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    /** 直径（世界长度）。 */
    readonly size: number;
    readonly alpha: number;
    /** 这一颗落下时已经走了多远（路的长度，断开的那几段不算）。 */
    readonly strokeDist: number;
    /** 夹在路上第几段（−1 = 起点那一颗）。 */
    readonly seg: number;
    /** 碰到哪些三角形（tip-reach.ts）。 */
    readonly reach: Reach;
}
export interface SpaceStrokeOpts {
    readonly smooth?: {
        tau?: number;
        deadzone?: number;
        tailBow?: number;
    };
    /** 拐角选项（度；不给 = 不限）。 */
    readonly maxAngleDeg?: number;
    /** 现成的整份几何（和 targets 一一对应；画画的准备 space-prep.ts 缓存的）。不给 = 现建（测试）。 */
    readonly geos?: readonly TargetGeo[];
}
export declare class SpaceStroke {
    readonly geos: readonly TargetGeo[];
    private readonly cam;
    private readonly settings;
    private readonly opts;
    private pending;
    private core;
    private placer;
    private dead;
    /** 空间里的直径（第一次打中时定）。 */
    worldSize: number;
    constructor(targets: readonly PaintTarget[], camera: SpaceCamera, settings: ResolvedBrush, opts?: SpaceStrokeOpts);
    get started(): boolean;
    /** 打射线的统计（落成路那一层）。 */
    get stats(): {
        rays: number;
        capped: number;
    };
    /** 屏幕一点打中了什么（名单、遮挡都算上）。 */
    hitAt(sx: number, sy: number): import("./space-target.ts").Hit;
    down(x: number, y: number, p: number, t?: number | null): void;
    move(x: number, y: number, p: number, t?: number | null): void;
    up(): void;
    cancel(): void;
    private feed;
    /** 现在的路（没开始 = null）。 */
    path(): SpacePath | null;
    /** 现在的笔尖列表（从第 from 颗起；前面的不算碰到哪些三角形——定型画过的不再算，1-4b「每帧只随新增的笔尖涨」），每颗带着碰到哪些三角形。 */
    tips(from?: number): SpaceTip[];
    /** 现在有几颗笔尖（只数，不算碰到哪些三角形）。 */
    tipCount(): number;
}

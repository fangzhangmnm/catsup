import type { Pt3 } from "../kernel/kernel.ts";
import { type Xform } from "./xform.ts";
export interface GuideLine {
    readonly id: number;
    p: Pt3;
    dir: Pt3;
}
export interface GuidePoint {
    readonly id: number;
    p: Pt3;
}
export interface Guides {
    lines: GuideLine[];
    points: GuidePoint[];
    next: number;
}
/** 世界坐标视图（渲染 / 推断用，WorldView 按活动池的变换算出来）。 */
export interface GuidesWorld {
    lines: {
        id: number;
        p: Pt3;
        dir: Pt3;
    }[];
    points: {
        id: number;
        p: Pt3;
    }[];
}
export declare const emptyGuides: () => Guides;
export declare const cloneGuides: (g: Guides) => Guides;
export declare function guidesToWorld(g: Guides, m: Xform): GuidesWorld;
export declare function addGuideLine(g: Guides, p: Pt3, dir: Pt3): GuideLine;
export declare function addGuidePoint(g: Guides, p: Pt3): GuidePoint;
/** 删指定 id（线 / 点同一 id 空间）；返回删掉几个。 */
export declare function eraseGuides(g: Guides, ids: ReadonlySet<number>): number;
export declare function transformGuides(g: Guides, m: Xform): void;

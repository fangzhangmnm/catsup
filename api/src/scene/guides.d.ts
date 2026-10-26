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
export interface GuideCircle {
    readonly id: number;
    c: Pt3;
    n: Pt3;
    r: number;
}
export interface GuideSphere {
    readonly id: number;
    c: Pt3;
    r: number;
}
export interface Guides {
    lines: GuideLine[];
    points: GuidePoint[];
    circles: GuideCircle[];
    spheres: GuideSphere[];
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
    circles: {
        id: number;
        c: Pt3;
        n: Pt3;
        r: number;
    }[];
    spheres: {
        id: number;
        c: Pt3;
        r: number;
    }[];
}
export declare const emptyGuides: () => Guides;
export declare const cloneGuides: (g: Guides) => Guides;
export declare function guidesToWorld(g: Guides, m: Xform): GuidesWorld;
export declare function addGuideLine(g: Guides, p: Pt3, dir: Pt3): GuideLine;
export declare function addGuidePoint(g: Guides, p: Pt3): GuidePoint;
export declare function addGuideCircle(g: Guides, c: Pt3, n: Pt3, r: number): GuideCircle;
export declare function addGuideSphere(g: Guides, c: Pt3, r: number): GuideSphere;
/** 删指定 id（线 / 点 / 圆 / 球同一 id 空间）；返回删掉几个。 */
export declare function eraseGuides(g: Guides, ids: ReadonlySet<number>): number;
export declare function transformGuides(g: Guides, m: Xform): void;
/** 线 / 点 / 圆 / 球一共几个（「清空参考几何」等判空用）。 */
export declare const guideCount: (g: {
    lines: readonly unknown[];
    points: readonly unknown[];
    circles: readonly unknown[];
    spheres: readonly unknown[];
}) => number;

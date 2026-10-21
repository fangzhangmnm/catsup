import type { Pt3 } from "../kernel/kernel.ts";
export interface Viewport {
    w: number;
    h: number;
}
export interface Ray {
    origin: Pt3;
    dir: Pt3;
}
export interface ScreenPt {
    x: number;
    y: number;
}
/** 容差集（本帧自己的量纲）：point/edge/line/combo = 求解器候选 ε；hit = 实体拾取；snap = 取点基准；planeNear = 近擦膜；tap/drag = 手势判定。 */
export interface EpsSet {
    point: number;
    edge: number;
    line: number;
    combo: number;
    hit: number;
    snap: number;
    planeNear: number;
    tap: number;
    drag: number;
}
export interface PointerFrame {
    ray(x: number, y: number, vp: Viewport): Ray;
    distTo(x: number, y: number, p: Pt3, vp: Viewport): number;
    distToSeg(x: number, y: number, a: Pt3, b: Pt3, vp: Viewport, infinite?: boolean): {
        d: number;
        t: number;
    };
    distBetween(p: Pt3, q: Pt3, vp: Viewport): number;
    distToRing(x: number, y: number, ring: readonly Pt3[], vp: Viewport): number;
    dirCos(x: number, y: number, anchor: Pt3, dirs: readonly Pt3[], vp: Viewport): (number | null)[];
    viewDir(p: Pt3): Pt3;
    forward(): Pt3;
    eps?(vp: Viewport): EpsSet;
}

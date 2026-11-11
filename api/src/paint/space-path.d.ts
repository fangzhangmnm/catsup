import type { PathPlacer, StrokePath } from "./kernel/src/backend/stroke-core.ts";
import type { Hit } from "./space-target.ts";
export interface PlacerOpts {
    /** 屏幕上一点 → 打中了什么（一般 = space-target.ts rayHit 包一层相机）。 */
    hit(sx: number, sy: number): Hit;
    /** 路的单位（世界里一格多大）。 */
    readonly unit: number;
    /** 步长上限（世界长度）= 这一笔定下来的半径的一半和一个路的单位，两个里大的那个（调用方算）。 */
    readonly stepMax: number;
    readonly minPx?: number;
    readonly missPx?: number;
    readonly maxRays?: number;
}
/** 路上一点打中的是谁（第几项目标、格子里第几个三角形）：笔尖找起点用（tip-reach.ts）。 */
export interface PathHit {
    readonly ti: number;
    readonly tri: number;
}
export interface SpacePath extends StrokePath {
    hitAt(i: number): PathHit;
}
export declare class SpacePathPlacer implements PathPlacer {
    readonly dim = 3;
    readonly unit: number;
    /** rays = 一共打了多少条射线；capped = 有几对相邻点到了射线上限（剩下的当断开）。 */
    readonly stats: {
        rays: number;
        capped: number;
    };
    private readonly o;
    private readonly frozenHits;
    private readonly frozenOut;
    private frozenPairs;
    private frozenFirst;
    private readonly frozenState;
    constructor(o: PlacerOpts);
    private cast;
    place(cx: readonly number[], cy: readonly number[], cp: readonly number[], count: number, frozenCount: number): SpacePath;
    private emit;
    private first;
    /** 一对相邻的中心线点：对半分着落（见文件头）。 */
    private pair;
}

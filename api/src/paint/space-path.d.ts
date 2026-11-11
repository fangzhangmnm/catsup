import type { PathPlacer, StrokePath } from "./kernel/src/backend/stroke-core.ts";
import type { Hit } from "./space-target.ts";
export interface PlacerOpts {
    /** 屏幕上一点 → 打中了什么（一般 = space-target.ts rayHit 包一层相机）。 */
    hit(sx: number, sy: number): Hit;
    /**
     * 少打射线（1-4d 第 7 条）：两头打中的是同一个三角形时，中点不打整条射线、只和那个三角形所在的平面求交（便宜），交点还在这个三角形里 = 就是它；
     * 不在 = null（照旧打整条射线）。和整条射线打中同一个三角形时的结果在浮点误差以内相同（同一个平面、同一条射线）。不给 = 照旧每次打整条。
     * 不查的：同一个三角形上两点之间被别的东西挡住（原来对半分时顺带会撞上）——所以只在屏幕上两头不超过 SAME_TRI_MAX_PX 时用：漏看的只有比这还窄的东西。
     */
    hitSameTri?(sx: number, sy: number, like: Extract<Hit, {
        kind: "target";
    }>): Hit | null;
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
/** 少打射线只用在屏幕上两头不超过这么多像素的一对点（CSS 像素）：中间挡着的东西窄于它才会漏看。 */
export declare const SAME_TRI_MAX_PX = 2;
export declare class SpacePathPlacer implements PathPlacer {
    readonly dim = 3;
    readonly unit: number;
    /** rays = 一共打了多少条整条的射线；planes = 同一个三角形上只和平面求交的中点（没打射线）；capped = 有几对相邻点到了射线上限（剩下的当断开）。 */
    readonly stats: {
        rays: number;
        planes: number;
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
    private placeAll;
    private emit;
    private first;
    /** 一对相邻的中心线点：对半分着落（见文件头）。 */
    private pair;
}

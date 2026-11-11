import type { TargetGeo } from "./space-target.ts";
/** 点到三角形（三个角 a、b、c，各 3 个数，从 P 的 off 起）的最近距离（Ericson《Real-Time Collision Detection》5.1.5 那一段）。全仓只有这一处。 */
export declare function sphereTriDist(px: number, py: number, pz: number, P: ArrayLike<number>, off: number): number;
export interface Tip {
    readonly x: number;
    readonly y: number;
    readonly z: number;
    readonly r: number;
}
export interface ReachStart {
    readonly ti: number;
    readonly tri: number;
}
export interface ReachOpts {
    /** 拐角：和起点三角形的朝向差得比这个角度（度）多的不收、也不从它往外走。不给 = 不限。 */
    readonly maxAngleDeg?: number;
}
/** 这颗笔尖要画的：目标（第几项）→ 画布多边形 → 挂在它下面的空间三角形（格子里的编号，升序）。 */
export type Reach = Map<number, Map<number, number[]>>;
/** 一颗笔尖碰到哪些三角形（见文件头）。geos = 名单里各项算好的东西；starts = 起点（可以在不同的项里；同一份摆放里才连通）。 */
export declare function tipReach(geos: readonly TargetGeo[], tip: Tip, starts: readonly ReachStart[], o?: ReachOpts): Reach;

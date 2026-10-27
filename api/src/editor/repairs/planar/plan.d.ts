import type { EdgeId, FaceId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";
export type PlanarTarget = "mode" | "median" | "mean";
export interface PlanarOptions {
    deg: number;
    target: PlanarTarget; /** 已经平、只被软边 / 折线分开的面：这次要擦的软边超过这么多条就先不并（导入的三角网动辄上万条，擦边现在要重切全部平面、很慢）；缺 = 不限。 */
    flatSoftMax?: number; /** 拍完擦掉组里的候选边（两边并成一张面）。 */
    eraseInner: boolean;
}
export declare const PLANAR_DEFAULTS: PlanarOptions;
export interface PlanarPlan {
    /** 要拍平的组（每组 ≥ 2 张面）。 */
    groups: FaceId[][];
    /** 挪点（id → 新位置）；本来就在平面上的点不在里面。 */
    moves: {
        id: VertexId;
        to: Pt3;
    }[];
    /** 擦内线时要擦的边（拍平之前的 id + 两端点拍平之后的位置，执行时按位置找回）。 */
    erase: {
        id: EdgeId;
        a: Pt3;
        b: Pt3;
    }[];
    /** 整片弯得超过阈值、当曲面没拍的片数（按边连起来的那一层数）。 */
    curved: number;
    /** 已经平、只被软边 / 折线分开的面：因为超过 flatSoftMax 先没并的软边条数。 */
    flatSkipped: number;
}
/** 规划：scope = 只看这些面（null = 池里全部）。 */
export declare function planPlanar(k: Kernel, scope: readonly FaceId[] | null, opt: PlanarOptions): PlanarPlan;

import type { FaceId, Kernel } from "../../../kernel/kernel.ts";
type Side = 0 | 1;
/** 改法：flip = 两侧互换（朝向反了）；back = 这张面这一侧写默认背面（原来没朝向）。 */
export interface OrientPlan {
    flip: FaceId[];
    back: {
        face: FaceId;
        side: Side;
    }[]; /** 想定朝向但动不了的（那一侧涂了真材质 / 灌到了两侧）。 */
    stuck: number;
}
/** 统一朝向：以 seeds 里有朝向的面为准。noSeed = 选中的面都分不出哪侧是正面（两侧都不是默认背面）。 */
export declare function planUnify(k: Kernel, back: number, seeds: readonly FaceId[]): OrientPlan & {
    noSeed: boolean;
};
export interface OutwardOpts {
    minCurvature: number;
}
/** 自动朝外。scope = 看哪些面（null = 整个池）；sheets = 几块不够鼓、没动；shells = 几块按壳处理。 */
export declare function planOutward(k: Kernel, back: number, scope: Iterable<FaceId> | null, o: OutwardOpts): OrientPlan & {
    sheets: number;
    shells: number;
};
export {};

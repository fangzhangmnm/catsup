import type { Scene } from "../scene/scene.ts";
import type { History } from "./history.ts";
import type { Op } from "./ops.ts";
/** 一步开始时记的。 */
export interface FreedBase {
    readonly at: number;
    readonly seqs: ReadonlyMap<number, number>;
}
export declare function freedBaseline(s: Scene, h: History): FreedBase;
/** 这一步要补的 setFreed（没有要改的 = null）。 */
export declare function freedOp(s: Scene, h: History, base: FreedBase): Op | null;

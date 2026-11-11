import type { History } from "./history.ts";
import type { Op } from "./ops.ts";
import type { PoolRef, Scene } from "../scene/scene.ts";
import type { BrepSnapshot } from "../kernel/kernel.ts";
/** 没有 / 池不是 brep → null。按记录倒推，不重放指令流（v0.15.32）。 */
export declare function lastStepOf(history: History<unknown>, scene: Scene): {
    op: Op;
    brep: BrepSnapshot;
    pool: PoolRef;
} | null;

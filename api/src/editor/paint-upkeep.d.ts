import type { Op } from "./ops.ts";
import { type ForceEnv, type ForceSnaps } from "./mirror-force.ts";
import type { GoneFace } from "../mesh/mesh-kernel.ts";
/** 提交前记下的：强行对称那份 + 每个网格体内核的版本号和改动日志的号。 */
export interface UpkeepSnaps {
    readonly force: ForceSnaps | null;
    readonly paint: ReadonlyMap<number, {
        readonly rev: number;
        readonly seq: number;
    }>;
}
/** 报告里没了的面 → 提示行的话（按原因第一次出现的先后；没有 = 空）。 */
export declare function goneNotes(gone: readonly GoneFace[]): string[];
/** 提交前改写指令（和 prepareOp 同一处）：强行对称开着时「开始画」只铺留着的那半（边按点名的面选，同 forceAfter）。别的指令原样。 */
export declare function upkeepRewrite(env: ForceEnv, op: Op): Op;
/** 提交前记（取代原来只记强行对称的那一份）。 */
export declare function upkeepSnapshot(env: ForceEnv, op: Op): UpkeepSnaps | null;
/**
 * 提交后：强行对称（带画的钩子）→ 别的改过的网格体补位置 → 数放不下的、并面丢了画的。commit = 进同一步。返回要接在提示行后面的话（没有 = 空串）。
 */
export declare function upkeepAfter(env: ForceEnv, op: Op, snaps: UpkeepSnaps, commit0: (op: Op) => void): string;

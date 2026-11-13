import type { Guid } from "../format/guid.ts";
import type { Scene } from "../scene/scene.ts";
import type { History } from "./history.ts";
import type { Op } from "./ops.ts";
/**
 * 一步开始时记的：History 走到哪一条、每个网格体改动日志的号、每个网格体的速查表（拷一份，数组很短）。
 * 速查表一定用这一份翻「之前那份」的代号（统筹预审 C）：不假设速查表只往后加——以后删表项 / 重编代号（材质面板「拿掉、清理」那一轮）时，用现在的表翻会翻到别的排法上 = 漏记。
 * 只在一步里面有意义（编辑器 step 深度 0 → 1 时记；步结束后不清，下一步开始时换新的；ForceEnv.freedNow 只在 step 里被调）。
 */
export interface FreedBase {
    readonly at: number;
    readonly seqs: ReadonlyMap<number, number>;
    readonly slots: ReadonlyMap<number, readonly Guid[]>;
}
export declare function freedBaseline(s: Scene, h: History): FreedBase;
/** 这一步要补的 setFreed（没有要改的 = null）。 */
export declare function freedOp(s: Scene, h: History, base: FreedBase): Op | null;

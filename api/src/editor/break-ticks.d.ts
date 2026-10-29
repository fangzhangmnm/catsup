import type { Kernel, Pt3 } from "../kernel/kernel.ts";
import { type Xform } from "../scene/xform.ts";
import type { PoolSlot } from "../scene/world-view.ts";
export interface BreakTicksCache {
    kernel: Kernel;
    rev: number;
    xform: Xform;
    ticks: {
        p: Pt3;
        dir: Pt3;
    }[];
}
/** 活动池的断口刻度；c = 上次的缓存（同内核、同版本、同变换就原样返回）。活动池永远是 brep（enterPool 守门：网格体进不来）；断口刻度是 brep 的概念。 */
export declare function breakTicksOf(slot: PoolSlot, c: BreakTicksCache | null): BreakTicksCache;

import type { Pt3 } from "../kernel/geom.ts";
import type { LockAxis, PlaneLock } from "./locks.ts";
export interface LockValue {
    readonly axis: LockAxis | null;
    readonly plane: PlaneLock | null;
    /** 面锁的法向（世界、单位长）；没面锁 = null。 */
    readonly planeN: Pt3 | null;
}
export declare const NO_LOCK: LockValue;

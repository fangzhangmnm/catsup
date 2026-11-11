import type { Pt3 } from "../kernel/geom.ts";
import type { LockAxis, PlaneLock } from "./locks.ts";
export interface LockValue {
    readonly axis: LockAxis | null;
    readonly plane: PlaneLock | null;
    /** 面锁的法向（世界、单位长）；没面锁 = null。 */
    readonly planeN: Pt3 | null;
}
export declare const NO_LOCK: LockValue;
export declare class ToolLocks {
    private readonly mem;
    /** 这把工具现在锁着什么（没记过 = 不锁）。 */
    of(tool: string): LockValue;
    /** 记下这把工具的锁；都是空的 = 忘掉。 */
    set(tool: string, v: LockValue): void;
    clear(tool: string): void;
    clearAll(): void;
}

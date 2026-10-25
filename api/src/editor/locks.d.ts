export type LockAxis = "x" | "y" | "z";
export type PlaneLock = LockAxis | "face";
/** 面锁的人话名字：法向 X 的面 = YZ，依此类推；"face" = 面。 */
export declare function planeLockLabel(p: PlaneLock): string;

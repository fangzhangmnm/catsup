// locks.ts —— A9 轴锁 / 面锁的词汇（editor 与 app 层共用）。Claude Opus 5.5 2026-10-25
// 轴锁 = 点走在过锚点的一根上下文轴上；面锁 = 点 / 平面落在「法向是该轴」的面上（Blender Shift+X 语义），"face" = 光标下那张膜的面。
export type LockAxis = "x" | "y" | "z";
export type PlaneLock = LockAxis | "face";

/** 面锁的人话名字：法向 X 的面 = YZ，依此类推；"face" = 面。 */
export function planeLockLabel(p: PlaneLock): string {
  return p === "x" ? "YZ" : p === "y" ? "XZ" : p === "z" ? "XY" : "面";
}

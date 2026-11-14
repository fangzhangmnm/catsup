// tool-locks.ts —— 按钮点的锁长什么样（created 2026-11-10 by Claude Opus 5.5 = 白模第一批 W-4「每个工具各记各的」；
// 2026-11-13 锁的一轮第四步改：不再按工具记，编辑器只有一份 Editor.btnLock，管到放下这把工具——拿起任何工具（含借用、借完回去）、换文件都从没锁开始；
// 手势外 Esc 解、手势里 Esc 只取消这一下。快捷键按的轴键是另一份、只管这一下（axis-keys.ts）。统筹 11-13 读法，设计稿 ai-docs/20261113-axis-constraint-module-design.md 第 8 条）。
// 锁 = 方向锁（沿上下文的一根轴）或面锁（法向是那根轴的面 / "face" = 按的时候光标下那张膜的面），二者互斥。纯数据，不碰编辑器。
import type { Pt3 } from "../kernel/geom.ts";
import type { LockAxis, PlaneLock } from "./locks.ts";

export interface LockValue {
  readonly axis: LockAxis | null;
  readonly plane: PlaneLock | null;
  /** 面锁的法向（世界、单位长）；没面锁 = null。 */
  readonly planeN: Pt3 | null;
}
export const NO_LOCK: LockValue = { axis: null, plane: null, planeN: null };

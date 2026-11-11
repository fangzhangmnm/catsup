// tool-locks.ts —— 每个工具各记各的锁（白模第一批 W-4；created 2026-11-10 by Claude Opus 5.5；user 11-10「remember the axis lock for each tools」）。
// 锁 = 方向锁（沿上下文的一根轴）或面锁（法向是那根轴的面 / "face" = 按的时候光标下那张膜的面），二者互斥。
// 以前只有一份锁：手势落定就解（SketchUp 同款）、Esc 解、换工具时没在手势里先按好的锁跟着带过去。
// 现在：每个工具一份，手势落定不解、换工具不解（换回来还是它）；Esc 只解当前这把工具的（editor.clearToolLock，键盘 Esc 调）。
// 只记在这次打开期间，不进文件；换文件（Editor.loadScene）全清（Fable 11-10 审：新开一份文件手上应该是干净的）。纯数据，不碰编辑器。
import type { Pt3 } from "../kernel/geom.ts";
import type { LockAxis, PlaneLock } from "./locks.ts";

export interface LockValue {
  readonly axis: LockAxis | null;
  readonly plane: PlaneLock | null;
  /** 面锁的法向（世界、单位长）；没面锁 = null。 */
  readonly planeN: Pt3 | null;
}
export const NO_LOCK: LockValue = { axis: null, plane: null, planeN: null };

export class ToolLocks {
  private readonly mem = new Map<string, LockValue>();
  /** 这把工具现在锁着什么（没记过 = 不锁）。 */
  of(tool: string): LockValue { return this.mem.get(tool) ?? NO_LOCK; }
  /** 记下这把工具的锁；都是空的 = 忘掉。 */
  set(tool: string, v: LockValue): void { if (v.axis === null && v.plane === null) this.mem.delete(tool); else this.mem.set(tool, v); }
  clear(tool: string): void { this.mem.delete(tool); }
  clearAll(): void { this.mem.clear(); }
}

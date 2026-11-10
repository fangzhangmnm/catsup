// pending-fill —— workpiece v2 的「将要填的颜色」组件（ADR-0008 §3；T4c）。
// substrate = { color } | null（fill 工具期间非 null；不持久化）。
//
// 色板 target 切换（T4 蓝图）：fill 工具里色板编辑的是本组件，不再碰笔刷色（dials）——
// 「预览换色可撤（改的是将要落画布的东西）」而**笔刷色从此不被 undo 碰**（行为锚测试钉住）。
// 写纪律四轨：
//   - begin/clear = 显式声明的导航态写（进/出 fill 工具；同 setActive 类：无 token 不记账）。
//   - setColorLive = 预览直写（色轮拖拽中的中间值；防抖窗口内不记账）。
//   - commitPreApplied(before) = 记账写（token；防抖 flush 时一次入栈——v0.7.8 合并语义沿用）。
//   - clearRecorded = 记账清（token；fill commit 步内清 seed——ADR-0008 §6「commit =
//     [tiles+selection 清+PendingFill 清] 一步」，v0.8.29 对齐落地，user 2026-08-10「应该清」）。
// record = { v: {color}|null }（另一侧整包）；swap 纯引用交换自反（出 fill 后 undo 到换色步
// 只翻本组件 substrate，view 无人消费 → 无副作用；FillColorOp 的「undo 改笔刷色」行为死）。

import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";

interface PendingBox { color: string }
interface PendingRecord { v: PendingBox | null }

export class PendingFill implements CollectorComponent {
  readonly kind = "pendingFill";
  private _wp: Workpiece;
  private _cur: PendingBox | null = null;
  private _origin: PendingRecord | null = null;   // collector：本 token 的令牌前原件（首捕获赢）

  constructor(wp: Workpiece) { this._wp = wp; }

  view(): Readonly<PendingBox> | null { return this._cur; }

  /** 进 fill 工具（导航态，不记账）：以当前笔刷色起步。 */
  begin(initColor: string): void { this._cur = { color: initColor }; }

  /** 出 fill 工具（导航态，不记账）。 */
  clear(): void { this._cur = null; }

  /** 预览直写（拖拽中间值 / 无预览期换 seed，不记账；记账由防抖 flush 走 commitPreApplied）。 */
  setColorLive(hex: string): void {
    if (this._cur) this._cur = { color: hex };
  }

  /** 记账写（pre-applied）：当前值已上台，before = 防抖窗口起点的旧色。 */
  commitPreApplied(before: string): void {
    this._wp._componentWrite(this);
    if (!this._origin) this._origin = { v: { color: before } };
  }

  /** 记账清：fill commit 整点内清 seed（undo fill → seed 随 step 还原）。 */
  clearRecorded(): void {
    this._wp._componentWrite(this);
    if (!this._origin) this._origin = { v: this._cur };
    this._cur = null;
  }

  // ── CollectorComponent ──

  sealRecord(): RecordData | null {
    const o = this._origin;
    this._origin = null;
    if (!o) return null;
    if (o.v?.color === this._cur?.color) return null;   // 净变化为零 → 不占 undo 步
    return o;
  }

  swapRecord(data: RecordData): RecordData {
    const r = data as PendingRecord;
    const cur = this._cur;
    this._cur = r.v;
    return { v: cur };
  }

  recordBytes(): number { return 64; }
  disposeRecord(): void { /* 纯字符串，无资源 */ }
}

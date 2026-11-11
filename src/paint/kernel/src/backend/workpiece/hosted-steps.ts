// hosted-steps —— 把封好的步交给宿主的栈去存（贴图主线 0-2；施工单 CatsUp ai-docs/20261110-paint-workorders-4.md）。created 2026-11-10 by Claude Opus 5.5
// user 定的：画画和建模是一条撤销线——在模型上画了一笔、切了一刀、又画了一笔，按三下撤销就按相反的顺序退回去。所以内核封好的一步可以不进自己的栈，
// 而是交给宿主（三维）的栈；宿主的栈走到这一步，再叫内核把它翻过去。画画软件自己照旧用 UndoStack。
//
// 对 Workpiece 来说它和 UndoStack 长得一样（StepSink：收一步、报「现在停在哪一步」、清空）；区别是它自己不存步，只记着「活着的步」和它们各自的前一步：
//   · 每一步多记一个数：它前一步是谁（prevId）。同一件作品的步，撤销和重做一定一个接一个按顺序来，所以不看宿主的栈也知道现在停在哪：
//     撤销一步之后停在它的前一步，重做一步之后停在它自己。
//   · 方向内核自己认、顺序内核自己把关（ADR-0008 修订那两条撤销契约的第二条：乱用要在调用的地方响亮地报，不留到撤销时炸栈）：
//     这一步正是「现在停着的那一步」= 撤销；它的前一步是「现在停着的那一步」= 重做；都不是 = 宿主弄错了顺序 → StepOrderError，什么都不碰。
//     不是这件作品的步、已经 drop 过的、上一代的（clear 之前的）、有写令牌开着：同样在动手之前拦下、抛同一种错。
//   · 一个 HostedSteps 只服务一件作品；一个宿主的栈可以装很多件作品的步，中间夹着别的步——不同作品的步互不相干，同一件作品的必须按顺序。
//   · 翻的那段循环和 UndoStack 是同一份（undo-stack.ts applyStep）。翻完的顺序和 UndoStack 一样：先 hint，再告诉 Workpiece（版本号加一、发信号）。
// 本模块零 DOM，node 全可测。

import { applyStep, type StackWorkpieceHooks, type StepSink, type UndoStep, type UndoStepInput } from "./undo-stack.ts";

/** 宿主实现的两件事。 */
export interface StepHost {
  /** 内核封好了一步，交给宿主。宿主：先把自己还没重做的那一段丢掉（其中属于这件作品的，每一步都调 drop），再收下这一步。 */
  onStep(step: UndoStep): void;
  /** 这件作品以前的步全部作废了（装载了别的内容，或者状态不可信）。宿主把手上属于它的步都扔掉，不用再调 drop。 */
  onReset(): void;
}

/** 宿主翻步的顺序 / 对象不对（翻错顺序、别的作品的步、drop 过的、上一代的、令牌开着）。抛的时候什么都没碰过：不算不可恢复。 */
export class StepOrderError extends Error {
  constructor(msg: string) { super(`HostedSteps: ${msg}`); this.name = "StepOrderError"; }
}

export interface HostedStepsOpts {
  /** 收了一步 / 翻了一步 / 清空了（UndoStack 的 onChange 同义）。后端拿它数「真落了一步」；不问能不能撤销——那归宿主。 */
  onChange?: () => void;
}

export class HostedSteps implements StepSink {
  private _host: StepHost;
  private _opts: HostedStepsOpts;
  private _hooks: StackWorkpieceHooks | null = null;
  private _cursor = 0;                // 现在停在哪一步（step id；0 = 起点，和 UndoStack 的栈底同义）
  private _nextId = 1;                // 单调、永不复用（换一代也不重来：旧代的 id 永远对不上新的）
  private _live = new Map<number, { step: UndoStep; prevId: number }>();

  constructor(host: StepHost, opts: HostedStepsOpts = {}) { this._host = host; this._opts = opts; }

  // —— Workpiece 用的那一面（和 UndoStack 同形）——

  _bindWorkpiece(hooks: StackWorkpieceHooks): void {
    if (this._hooks) throw new Error("HostedSteps: already bound (one HostedSteps serves exactly one workpiece)");
    this._hooks = hooks;
  }

  /** 由 WriteToken.commit 调：编号、记下前一步、「现在停在哪」挪到它、交给宿主。 */
  push(input: UndoStepInput): void {
    const step: UndoStep = { ...input, id: this._nextId++ };
    this._live.set(step.id, { step, prevId: this._cursor });
    this._cursor = step.id;
    this._host.onStep(step);
    this._opts.onChange?.();
  }

  cursorStepId(): number { return this._cursor; }

  /** 换一代：手上记着的活步全部释放、「现在停在哪」回到 0、宿主收到 onReset。之后翻旧步 = StepOrderError。 */
  clear(): void {
    for (const { step } of this._live.values()) this._dispose(step);
    this._live.clear();
    this._cursor = 0;
    this._host.onReset();
    this._opts.onChange?.();
  }

  // —— 宿主用的那一面 ——

  /** 这一步现在翻的话是撤销还是重做；对不上就抛 StepOrderError（什么都不碰）。History.flip 先问它、再问写门。 */
  directionOf(step: UndoStep): "undo" | "redo" {
    const m = this._live.get(step.id);
    if (!m || m.step !== step) throw new StepOrderError(`step ${step.id} is not a live step of this workpiece (another workpiece's, dropped, or from before clear)`);
    if (step.id === this._cursor) return "undo";
    if (m.prevId === this._cursor) return "redo";
    throw new StepOrderError(`step ${step.id} is out of order (cursor at ${this._cursor}; it is neither the current step nor the one right after it)`);
  }

  /** 宿主的栈走到这一步时调：方向内核自己认。顺序不对 / 有写令牌开着 → StepOrderError（什么都不碰）；swapRecord 抛 → 原样传播（不可恢复，History 接）。 */
  flip(step: UndoStep): "undo" | "redo" {
    const dir = this.directionOf(step);
    try { this._hooks?.beforeApply(); }
    catch (e) { throw new StepOrderError(`cannot flip while a write token is open (${e instanceof Error ? e.message : String(e)})`); }
    applyStep(step, dir);
    this._cursor = dir === "undo" ? this._live.get(step.id)!.prevId : step.id;
    step.hint?.(dir);
    this._hooks?.afterApply(step, dir);
    this._opts.onChange?.();
    return dir;
  }

  /** 这一步占多少字节（宿主算配额用）。不是活步 = 0。 */
  bytes(step: UndoStep): number {
    const m = this._live.get(step.id);
    if (!m || m.step !== step) return 0;
    let sum = 0;
    for (const e of step.entries) sum += e.c.recordBytes(e.data);
    return sum;
  }

  /** 宿主不要这一步了（截断重做段、配额驱逐）：释放它的资源。同一步调第二次 / 不是活步 = 什么都不做。 */
  drop(step: UndoStep): void {
    const m = this._live.get(step.id);
    if (!m || m.step !== step) return;
    this._live.delete(step.id);
    this._dispose(step);
  }

  /** 还活着的步数（测试 / 调试）。 */
  liveCount(): number { return this._live.size; }

  private _dispose(s: UndoStep): void {
    for (const e of s.entries) { try { e.c.disposeRecord(e.data); } catch { /* dispose 尽力而为（同 UndoStack） */ } }
  }
}

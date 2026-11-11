// history —— v2 undo 编排器（T5 立；legacy-bridge/LegacyHistory 的 v2-native 后继，operator 流已死）。
//
// 职责（刻意窄）：
//   - **共享令牌的开/续/封**（withPoint）：checkpoint:false = 令牌留开聚合微步（层面板连点、
//     import 单整点、fill compound 的时序全靠它）；sealCheckpoint = 手势结束封口。
//     嵌套 withPoint 骑外层令牌（openedHere 才有回滚权——内层失败 throw 给外层统一 cancel）。
//   - undo/redo 门：顶端未封口 → 补封再翻；swap 抛异常 = 状态不可信 → 不可恢复协议。
//   - **写门每一步都问**（2026-11-09）：开令牌时 begin 自己问；并进已经开着的令牌的微步（checkpoint:false 留开的 / 嵌套的）在这里补问——
//     不然「先一个放行的操作留开令牌，后面不放行的搭车过门」。撤销 / 重做拿**要翻的那一步的标签**问：翻一步 = 再做一次那个操作的反面，
//     让不让翻和让不让做是同一个答案。几个不同名字的微步并成的一步，标签 = 各名字用 + 连起来（「addLayer+liftFloat」）——
//     它不等于其中任何一个单独的名字，门就不会把一个混着内容的步骤当成它开头那个操作放过去。
//   - 不可恢复协议（宁丢历史不留半坏）：cancel 自身失败 / swap 中途失败 → 弃整栈 +
//     onUnrecoverable（app 侧接 integrity 自愈 + 全量重绘 + error banner）。
// 组件 verb 的记账/回滚本体在各 collector（ADR-0008）；本类只管令牌与栈的编排，不碰 DOM/i18n。
//   - **第二种装法：步归宿主管**（2026-11-10 贴图主线 0-2，Claude Opus 5.5）：建的时候给一个 HostedSteps，就不自己建 UndoStack——封好的步交给宿主的栈，
//     宿主走到哪一步就调 flip(step)。这种装法下 undo / redo / canUndo… 抛错（「这份历史归宿主管」），不悄悄返回假。
//     flip 不替宿主封口：令牌开着 = StepOrderError（封口会往宿主的栈里推一步新的，而宿主正翻到一半；宿主开始撤销 / 重做前自己先 sealCheckpoint）。

import { UndoStack, type StepSink, type UndoStep } from "./undo-stack.ts";
import { HostedSteps, StepOrderError } from "./hosted-steps.ts";
import type { Workpiece, WriteToken } from "./workpiece.ts";

export interface HistoryOpts {
  maxQuotaBytes: number;
  /** 不可恢复失败（栈已被弃）。app 侧接：integrity 自愈 + 全量重绘 + error banner。
   *  **缺省 = 直接抛**（2026-10-13 Claude Fable 5.1）：不接就响亮红——10-10 案里 5 个测试文件把它接成空函数 / 只计数，
   *  explode 用例撞「layer gone at undo swap」整栈清空却一直绿。故意测不可恢复协议的用例显式传回调。 */
  onUnrecoverable?: (e: unknown) => void;
  /** 栈形状变化（push/undo/redo/clear/evict）。app 侧接 wp:histchange 派发。 */
  onChange?: () => void;
  /** 某步被应用（undo/redo；按 step entries 逐组件报）。app 侧接面板/画面刷新。 */
  onApplied?: (info: { kind: string; dir: "undo" | "redo" }) => void;
  /** 给了 = 步归宿主管（不建 UndoStack；宿主调 flip）。这种装法下 onUnrecoverable 必须给。HostedSteps 的 onChange 由建它的人接。 */
  hosted?: HostedSteps;
}

const HOSTED_MSG = "History: steps are hosted — the host's stack owns undo/redo (use flip(step))";

export class History {
  private _stack: UndoStack | null;
  private _hosted: HostedSteps | null;
  private _opts: HistoryOpts;
  private _wp: Workpiece | null = null;
  private _open: WriteToken | null = null;
  private _openLabels: string[] = [];   // 开着的这个令牌并进来过的操作名（去重、按先后）；封口时连成这一步的标签

  constructor(opts: HistoryOpts) {
    this._opts = opts;
    if (opts.hosted) {
      if (!opts.onUnrecoverable) throw new Error("History: hosted steps need onUnrecoverable (the host must hear when its steps for this workpiece are gone)");
      this._hosted = opts.hosted; this._stack = null;
    } else {
      this._hosted = null;
      this._stack = new UndoStack({
        maxQuotaBytes: opts.maxQuotaBytes,
        onChange: opts.onChange,
        onApplied: (step, dir) => this._translateApplied(step, dir),
      });
    }
  }

  /** 内核自带的栈（画画软件那条路）。步归宿主管时抛。 */
  get stack(): UndoStack { if (!this._stack) throw new Error(HOSTED_MSG); return this._stack; }
  /** 交给 Workpiece 的那一面（两种装法通用）。 */
  get steps(): StepSink { return (this._stack ?? this._hosted)!; }
  /** 步归宿主管吗。 */
  get hosted(): boolean { return this._hosted !== null; }

  /** 组合根装配（wp 的 ctor 需要 stack 先在 → late-bind）。 */
  attach(wp: Workpiece): void {
    if (this._wp) throw new Error("History: attached twice");
    this._wp = wp;
  }

  /** 一个 undo 整点：fn 里直写 v2 组件 verb；本方法只管共享令牌的开/续/封。
   *  checkpoint:false = 留开聚合微步（语义同旧 run/withPoint）；hint = step 的非权威附注。 */
  withPoint<T>(label: string | undefined, o: { checkpoint?: boolean; hint?: (dir: "undo" | "redo") => void } | undefined, fn: () => T): { ok: boolean; value?: T; msg?: string } {
    const wp = this._req();
    const openedHere = !this._open;
    if (!this._open) { this._open = wp.begin(label); this._openLabels = []; }   // begin 自己问门
    else wp.assertWritable(label);                                             // 并进开着的令牌：照样问（被拒 → 抛，嵌套的由外层回滚）
    if (label !== undefined && !this._openLabels.includes(label)) this._openLabels.push(label);
    let value: T;
    try {
      value = fn();
    } catch (e) {
      if (openedHere) {
        const tok = this._open;
        this._open = null; this._openLabels = [];
        try { tok?.cancel(); }
        catch (e2) { this._unrecoverable(e2); }   // 回滚自身失败 → 不可恢复
      } else {
        throw e;   // 外层开的令牌：让外层的 catch 统一回滚
      }
      return { ok: false, msg: String(e) };
    }
    if (o?.checkpoint !== false) this._commitOpen(o?.hint);
    return { ok: true, value };
  }

  /** 手势结束：把开着的微步令牌封口。 */
  sealCheckpoint(): void { this._commitOpen(); }

  undo(): boolean { return this._flip("undo"); }
  redo(): boolean { return this._flip("redo"); }
  /** 下一次撤销 / 重做要翻的是哪个操作（界面那一层预先问门用；没有可翻的 → undefined）。 */
  peekLabel(dir: "undo" | "redo"): string | undefined {
    if (this._hosted) throw new Error(HOSTED_MSG);
    if (dir === "undo" && this._open) return this._openLabel();   // 顶端还没封口的那一步
    return this.stack.peekLabel(dir);
  }

  /**
   * 步归宿主管：宿主的栈走到这一步时调。方向内核自己认（HostedSteps.directionOf）。
   * 令牌开着 / 顺序不对 / 不是这件作品的活步 → StepOrderError（什么都不碰，不算不可恢复，原样抛给宿主）；
   * 写门不让（这幅画锁着；拿这一步的标签问）→ false，什么都不碰；swapRecord 抛 → 不可恢复（弃令牌、HostedSteps.clear → 宿主收到 onReset、onUnrecoverable）→ false。
   */
  flip(step: UndoStep): boolean {
    const hs = this._hosted;
    if (!hs) throw new Error("History.flip: only for hosted steps (this history owns its own UndoStack — use undo/redo)");
    if (this._open) throw new StepOrderError("cannot flip while History has an open token — the host must call sealCheckpoint() before undo/redo");
    const dir = hs.directionOf(step);   // 顺序 / 归属不对 → StepOrderError，什么都没碰
    if (this._req().writeGate?.(step.label)) return false;
    try { hs.flip(step); }
    catch (e) { if (e instanceof StepOrderError) throw e; this._unrecoverable(e); return false; }
    this._translateApplied(step, dir);
    return true;
  }
  private _flip(dir: "undo" | "redo"): boolean {
    if (this._hosted) throw new Error(HOSTED_MSG);   // 先于封口：步归宿主管时什么都不碰
    this._commitOpen();                  // 顶端未封口 → 补封（封口不是写：只是把已经做了的记进栈）
    if (!(dir === "undo" ? this.stack.canUndo() : this.stack.canRedo())) return false;
    // 这幅画锁着（2026-11-08）：翻一步也是改——拿要翻的那一步的标签问门（2026-11-09：看法类的步骤锁着也能翻，内容类的不动）。
    if (this._req().writeGate?.(this.stack.peekLabel(dir))) return false;
    try { return dir === "undo" ? this.stack.undo() : this.stack.redo(); }
    catch (e) { this._unrecoverable(e); return false; }
  }

  canUndo(): boolean { return this.stack.canUndo(); }   // 步归宿主管时 stack 抛（不悄悄返回假）
  canRedo(): boolean { return this.stack.canRedo(); }
  get depth(): number { return this.stack.depth(); }
  quotaUsage(): number { return this.stack.quotaUsage(); }

  /** 弃整栈（换文档/不可恢复）。开着的令牌弃置（不回滚——load 流里层可能已换血）。 */
  clear(): void {
    if (this._open) { const t = this._open; this._open = null; this._openLabels = []; t.abandon(); }
    this.steps.clear();
  }

  // ---- 内部 ----

  private _req(): Workpiece {
    if (!this._wp) throw new Error("History: not attached (composition-root assembly-order bug)");
    return this._wp;
  }

  private _openLabel(): string | undefined { return this._openLabels.length ? this._openLabels.join("+") : undefined; }

  private _commitOpen(hint?: (dir: "undo" | "redo") => void): void {
    if (!this._open) return;
    const t = this._open, label = this._openLabel();
    this._open = null; this._openLabels = [];
    t.commit({ label, hint });
  }

  private _translateApplied(step: UndoStep, dir: "undo" | "redo"): void {
    if (!this._opts.onApplied) return;
    for (const e of step.entries) this._opts.onApplied({ kind: e.c.kind, dir });
  }

  private _unrecoverable(e: unknown): void {
    if (this._open) { const t = this._open; this._open = null; this._openLabels = []; try { t.abandon(); } catch { /* 已不可信 */ } }
    this.steps.clear();   // 步归宿主管时 = HostedSteps.clear → 宿主收到 onReset
    if (!this._opts.onUnrecoverable) throw e instanceof Error ? e : new Error(String(e));
    this._opts.onUnrecoverable(e);
  }
}

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

import { UndoStack, type UndoStep } from "./undo-stack.ts";
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
}

export class History {
  readonly stack: UndoStack;
  private _opts: HistoryOpts;
  private _wp: Workpiece | null = null;
  private _open: WriteToken | null = null;
  private _openLabels: string[] = [];   // 开着的这个令牌并进来过的操作名（去重、按先后）；封口时连成这一步的标签

  constructor(opts: HistoryOpts) {
    this._opts = opts;
    this.stack = new UndoStack({
      maxQuotaBytes: opts.maxQuotaBytes,
      onChange: opts.onChange,
      onApplied: (step, dir) => this._translateApplied(step, dir),
    });
  }

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
    if (dir === "undo" && this._open) return this._openLabel();   // 顶端还没封口的那一步
    return this.stack.peekLabel(dir);
  }
  private _flip(dir: "undo" | "redo"): boolean {
    this._commitOpen();                  // 顶端未封口 → 补封（封口不是写：只是把已经做了的记进栈）
    if (!(dir === "undo" ? this.stack.canUndo() : this.stack.canRedo())) return false;
    // 这幅画锁着（2026-11-08）：翻一步也是改——拿要翻的那一步的标签问门（2026-11-09：看法类的步骤锁着也能翻，内容类的不动）。
    if (this._req().writeGate?.(this.stack.peekLabel(dir))) return false;
    try { return dir === "undo" ? this.stack.undo() : this.stack.redo(); }
    catch (e) { this._unrecoverable(e); return false; }
  }

  canUndo(): boolean { return this.stack.canUndo(); }
  canRedo(): boolean { return this.stack.canRedo(); }
  get depth(): number { return this.stack.depth(); }
  quotaUsage(): number { return this.stack.quotaUsage(); }

  /** 弃整栈（换文档/不可恢复）。开着的令牌弃置（不回滚——load 流里层可能已换血）。 */
  clear(): void {
    if (this._open) { const t = this._open; this._open = null; this._openLabels = []; t.abandon(); }
    this.stack.clear();
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
    this.stack.clear();
    if (!this._opts.onUnrecoverable) throw e instanceof Error ? e : new Error(String(e));
    this._opts.onUnrecoverable(e);
  }
}

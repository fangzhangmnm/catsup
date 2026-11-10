// workpiece —— v2 基类：令牌工厂 + undo stack + meta（ADR-0008；T5 收编正名，前身 workpiece2.ts）。
//
// 元规则（ADR-0008 §1）：
//   - 同时只准一个开着的令牌（第二次 begin → throw = 泄漏查获点；FinalizationRegistry 兜底——
//     为此 workpiece 只持 WeakRef，泄漏令牌可被 GC → FR 报警 + begin 自愈回滚）。
//   - 拿到令牌后 component 直接写自己的 substrate；写前必调 _componentWrite(c)（无令牌 → throw）；
//     被换下的旧数据由该 component 自己的 collector 静默扣押。
//   - commit = 各被摸 collector sealRecord 打包 → 一个 UndoStep 入栈；cancel = 倒序自反 swap 回滚无痕。
//   - 忘记记账这类 bug 从「被 write-gate 锁住」变成「结构上不存在」。
//
// 双计数（ADR-0008 §5，两计数语义不同不许合并）：
//   - commitVersion：单调，每次 step 应用（commit/undo/redo/cancel）+1 → 渲染缓存失效 key。
//   - stateVersion：位置身份 = 游标处 step id → dirty 派生（undo 回存档点自动 clean）。
// dirty = (stateVersion !== lastSaved) || silentDirty。isDirty 可变布尔退役。
//
// 组件注册表（ADR-0008 §3）：undoPolicy recorded|silent。silent = sidecar 形容词（不开新 workpiece）：
// 写照走令牌但 commit 时 record 即弃、只发信号 + silentDirty；升 recorded = 注册表改一个字段。
// 无 undo 的 workpiece（ctor 不传 undo）：写面纪律统一，recorded record 同样即弃、touched 即 dirty。

import type { UndoStack, UndoStep, RecordData, WorkpieceComponent } from "./undo-stack.ts";

/** 注册进 workpiece 的组件还须带 collector 面（token 协作；ADR-0008 §1）。 */
export interface CollectorComponent extends WorkpieceComponent {
  /** commit/cancel 时打包并清空本 token 的 collector；null = 本 token 没被摸。 */
  sealRecord(): RecordData | null;
}

export type UndoPolicy = "recorded" | "silent";

export interface WorkpieceOpts {
  /** 不传 = 该 workpiece 无 undo（写照走令牌，record 即弃）。 */
  undo?: UndoStack;
  /** FR 兜底报警：令牌未 commit/cancel 就被 GC（泄漏 bug）。默认 console.error。 */
  onTokenLeak?: (label?: string) => void;
}

export interface WorkpieceChangeEvent { kind: string; recorded: boolean }

/** 写门拒绝了（见 Workpiece.writeGate）：这幅画此刻不许改。不是失败，是契约——壳把它翻成「锁闪一下」，不当成报错横幅。 */
export class WriteRefusedError extends Error {
  reason: string;
  constructor(reason: string, label?: string) { super(`Workpiece: write refused (${reason}) label=${label ?? "?"}`); this.name = "WriteRefusedError"; this.reason = reason; }
}

export class Workpiece {
  private _undo: UndoStack | null;
  private _registry: { c: CollectorComponent; policy: UndoPolicy }[] = [];
  private _tokenRef: WeakRef<WriteToken> | null = null;   // 弱持有：泄漏令牌可被 GC → FR 才有戏唱
  private _tokenOpen = false;                             // 强事实：open 令牌存在（含已被 GC 的泄漏者）
  private _touched: CollectorComponent[] = [];            // 本 token 摸过的组件（首次写序）
  private _commitVersion = 0;
  private _lastSaved = 0;
  private _silentDirty = false;
  private _listeners = new Set<(e: WorkpieceChangeEvent) => void>();
  private _onTokenLeak: (label?: string) => void;
  private _fr: FinalizationRegistry<string>;

  constructor(opts?: WorkpieceOpts) {
    this._undo = opts?.undo ?? null;
    this._onTokenLeak = opts?.onTokenLeak
      ?? ((label) => console.error(`Workpiece: token leak (GCed without commit/cancel) label=${label ?? "?"}`));
    this._fr = new FinalizationRegistry((label) => this._onTokenLeak(label || undefined));
    this._undo?._bindWorkpiece({
      beforeApply: () => {
        if (this._tokenOpen) throw new Error("Workpiece: undo/redo forbidden while a token is open (commit/cancel first)");
      },
      afterApply: (step, _dir) => {
        this._commitVersion++;
        for (const e of step.entries) this._emit({ kind: e.c.kind, recorded: true });
      },
    });
  }

  // ── 令牌（唯一写门）──

  /** 写门的否决口（2026-11-08，家族「源文件原则上只读」；组合根注入，默认没有）：返回原因 = 此刻不许做这个操作（这幅画锁着）。
   *  **label = 操作的名字**——门按它分类（app 侧 src/edit-lock-table.ts：列为「看法」的放行，其余拒）。问门的地方有三处，都经 assertWritable：
   *  开令牌（begin）、并进一个已经开着的令牌的每个微步（History.withPoint）、撤销 / 重做（History 拿要翻的那一步的标签问）。 */
  writeGate: ((label?: string) => string | null) | null = null;

  /** 问一次门：不让 → 抛 WriteRefusedError。不开令牌、不改任何状态。 */
  assertWritable(label?: string): void {
    const refused = this.writeGate?.(label);
    if (refused) throw new WriteRefusedError(refused, label);
  }

  /** 已有开着的令牌 → throw（泄漏查获点）；泄漏者已被 GC → FR 报警路线 + 此处自愈回滚后继续。 */
  begin(label?: string): WriteToken {
    this.assertWritable(label);
    if (this._tokenOpen) {
      if (this._tokenRef?.deref()) {
        throw new Error(`Workpiece: a token is already open (only one at a time; label=${label ?? "?"})`);
      }
      // 泄漏令牌已被 GC（FR 报警或迟或早）：无人能再 commit/cancel 它——自愈 = 回滚 touched，别死锁。
      this._rollbackTouched();
      this._tokenOpen = false;
      this._tokenRef = null;
    }
    const token = new WriteToken(this, label);
    this._tokenRef = new WeakRef(token);
    this._tokenOpen = true;
    this._fr.register(token, label ?? "", token);
    return token;
  }

  /** 开着的令牌存在？（substrate 观察者的收集门：LayerTiles 观察 tile 换手时据此判断收不收。） */
  get tokenOpen(): boolean { return this._tokenOpen && !!this._tokenRef?.deref(); }

  // ── meta ──

  /** 单调：每次 step 应用（commit/undo/redo/cancel）+1 → 渲染缓存失效。 */
  get commitVersion(): number { return this._commitVersion; }
  /** 位置身份：= 游标处 step id（无 undo workpiece 恒 0）→ dirty 派生。 */
  get stateVersion(): number { return this._undo ? this._undo.cursorStepId() : 0; }
  /** silent 组件（或无 undo workpiece 的任何组件）动过未存。 */
  get silentDirty(): boolean { return this._silentDirty; }

  /** 持久层存盘后调：记 lastSaved + 清 silentDirty。 */
  markSaved(): void {
    this._lastSaved = this.stateVersion;
    this._silentDirty = false;
  }

  isDirty(): boolean { return this.stateVersion !== this._lastSaved || this._silentDirty; }

  /** 统一变更信号（histchange/sidecarchange 后继）。commit/cancel 按 touched 发、undo/redo 按 entries 发。 */
  onChange(cb: (e: WorkpieceChangeEvent) => void): () => void {
    this._listeners.add(cb);
    return () => { this._listeners.delete(cb); };
  }

  // ── 组件注册（子类 ctor 调）──

  /** 子类协作面（load 清栈用）；app 侧栈引用走构造时自己传入的 UndoStack。 */
  protected get undoStack() { return this._undo; }

  protected register(c: CollectorComponent, policy: { undo: UndoPolicy }): void {
    if (this._registry.some((r) => r.c.kind === c.kind)) {
      throw new Error(`Workpiece: component kind registered twice (${c.kind})`);
    }
    this._registry.push({ c, policy: policy.undo });
  }

  // ── component/token 协作面（app 勿碰）──

  /** component 写路径守门：写 substrate 前必调（无开着的令牌 → throw；同时登记 touched）。 */
  _componentWrite(c: CollectorComponent): void {
    if (!this._tokenOpen || !this._tokenRef?.deref()) {
      throw new Error(`Workpiece: tokenless write rejected (${c.kind} — begin() first to get a token)`);
    }
    if (!this._registry.some((r) => r.c === c)) {
      throw new Error(`Workpiece: write from unregistered component rejected (${c.kind})`);
    }
    if (!this._touched.includes(c)) this._touched.push(c);
  }

  /** WriteToken.commit 的后半场（token 关门后调）。 */
  _commitToken(token: WriteToken, label?: string, hint?: (dir: "undo" | "redo") => void): void {
    this._assertCurrent(token);
    this._fr.unregister(token);
    this._tokenOpen = false;
    this._tokenRef = null;
    const touched = this._touched;
    this._touched = [];
    const entries: UndoStep["entries"] = [];
    let anySealed = false;
    for (const c of touched) {
      const data = c.sealRecord();
      if (data === null) continue;
      anySealed = true;
      const policy = this._registry.find((r) => r.c === c)!.policy;
      if (policy === "recorded" && this._undo) {
        entries.push({ c, data });
      } else {
        // silent 组件 record 即弃；无 undo workpiece 的 recorded 同（写面纪律统一）。
        c.disposeRecord(data);
        this._silentDirty = true;
      }
    }
    if (entries.length) this._undo!.push({ entries, label, hint });
    if (anySealed) this._commitVersion++;
    for (const c of touched) {
      const policy = this._registry.find((r) => r.c === c)!.policy;
      this._emit({ kind: c.kind, recorded: policy === "recorded" });
    }
  }

  /** WriteToken.cancel 的后半场：倒序自反 swap 回滚，无痕（不入栈、不动 silentDirty）。 */
  _cancelToken(token: WriteToken): void {
    this._assertCurrent(token);
    this._fr.unregister(token);
    this._tokenOpen = false;
    this._tokenRef = null;
    this._rollbackTouched();
  }

  /** 不可恢复路径协作面（History unrecoverable / clear 用）：关门 + 各 collector 弃置——
   *  不回滚（状态已不可信，回滚可能二次伤害），只释放句柄防泄漏。 */
  _abandonToken(token: WriteToken): void {
    this._assertCurrent(token);
    this._fr.unregister(token);
    this._tokenOpen = false;
    this._tokenRef = null;
    const touched = this._touched;
    this._touched = [];
    for (const c of touched) {
      const data = c.sealRecord();
      if (data !== null) c.disposeRecord(data);
    }
  }

  private _assertCurrent(token: WriteToken): void {
    if (!this._tokenOpen || this._tokenRef?.deref() !== token) {
      throw new Error("Workpiece: commit/cancel from a non-current token rejected (tokens only come from begin())");
    }
  }

  private _rollbackTouched(): void {
    const touched = this._touched;
    this._touched = [];
    let anyRolled = false;
    for (let i = touched.length - 1; i >= 0; i--) {
      const c = touched[i];
      const data = c.sealRecord();
      if (data === null) continue;
      anyRolled = true;
      const swapped = c.swapRecord(data);   // 自反：应用逆包 = 回滚
      c.disposeRecord(swapped);             // 换回来的（cancel 前的新态）句柄释放
    }
    if (!anyRolled) return;
    this._commitVersion++;                  // token 开着期间外界可能已看过中间态 → 缓存失效
    for (const c of touched) {
      const policy = this._registry.find((r) => r.c === c)?.policy ?? "recorded";
      this._emit({ kind: c.kind, recorded: policy === "recorded" });
    }
  }

  private _emit(e: WorkpieceChangeEvent): void {
    for (const cb of this._listeners) cb(e);
  }
}

export class WriteToken {
  private _wp: Workpiece;
  private _label?: string;
  private _open = true;

  /** 仅 Workpiece.begin 构造（模块内协作；外部拿不到 ctor 入口）。 */
  constructor(wp: Workpiece, label?: string) {
    this._wp = wp;
    this._label = label;
  }

  /** commit/cancel 后再写 → throw（_componentWrite 查 open）。 */
  get open(): boolean { return this._open; }

  commit(opts?: { label?: string; hint?: (dir: "undo" | "redo") => void }): void {
    if (!this._open) throw new Error("WriteToken: already closed (commit/cancel exactly once)");
    this._open = false;
    this._wp._commitToken(this, opts?.label ?? this._label, opts?.hint);
  }

  /** 各被摸 collector 倒序回滚，无痕。 */
  cancel(): void {
    if (!this._open) throw new Error("WriteToken: already closed (commit/cancel exactly once)");
    this._open = false;
    this._wp._cancelToken(this);
  }

  /** 不可恢复路径：弃置（不回滚不入栈，只释放 record）。app 正常流禁用——只给 unrecoverable 兜底。 */
  abandon(): void {
    if (!this._open) throw new Error("WriteToken: already closed (commit/cancel exactly once)");
    this._open = false;
    this._wp._abandonToken(this);
  }
}

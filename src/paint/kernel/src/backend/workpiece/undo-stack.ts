// undo-stack —— workpiece v2 的 undo 栈（令牌+collector 纪元，ADR-0008）。
// 取代 undo-history.ts 的 operator/microstep/checkpoint 模型：
//   - 入栈的是 UndoStep = { entries: {c, data}[] }，data 是**纯数据 record**（句柄集/json 引用/方向位；
//     禁函数引用——dispatcher 在 component 层，见 ADR-0008 §2）。一次交互 = 一个令牌 = 一步，
//     checkpoint/compound/sealCheckpoint 机制整体退役。
//   - undo = entries 倒序 swapRecord；redo = 正序再调一次。swap 自反（对合）：apply 后 entry.data
//     被换成反向包——不存在「undo 生成 redo」问题，也不存在 forward/backward 两套代码漂移。
//   - swapRecord 必须**同步、纯数据交换、不失败**（throw = bug，直接传播；旧栈的不可恢复协议
//     不在本层——v2 下「忘记记账」结构上不存在，半坏状态的来源被令牌墙掐死）。
//   - 配额驱逐：push 时从最老端整步驱逐直到 quota 之内；最新一步永不驱逐（刚做的必须能撤）。
//     recordBytes 每次全量重扫（tile 压缩前记 0 走共享池、压缩后记 compressedBytes/refCount，
//     规则沿旧栈——usage 会随压缩变，不缓存）。
//   - step.id 由栈单调分配（永不复用）→ stateVersion 的锚：cursorStepId() = 游标处 step 的 id，
//     栈底 = _baseId（0 起；驱逐后 = 最后被驱逐步的 id——那个位置已不可达，身份仍单调）。
//
// 本模块零 import、DOM-free → node 全可测。app 接线（按钮态/toast）走 onChange/onApplied；
// Workpiece 的协作面走 _bindWorkpiece（独占，app 勿碰）。

export type RecordData = unknown;                  // 纯数据；禁函数引用（ADR-0008 §2）

export interface WorkpieceComponent {
  /** "layerTree" | "layerTiles" | … 开放集（onChange 事件的 kind）。 */
  readonly kind: string;
  /** 自反 swap：应用 data（undo 倒序调、redo 正序再调一次），返回反向包。同步、不失败。 */
  swapRecord(data: RecordData): RecordData;
  /** 配额估计（字节）。tile 按压缩后/refCount，规则沿旧栈。 */
  recordBytes(data: RecordData): number;
  /** 驱逐/清栈/cancel 释放 record 持有的资源（tile 句柄引用计数 −1 等）。 */
  disposeRecord(data: RecordData): void;
}

export interface UndoStep {
  /** 栈分配的单调 id（永不复用）= stateVersion 的锚。 */
  readonly id: number;
  /** apply 时 data 被 swap 成反向包（entries 数组本身不换，data 字段换）。 */
  entries: { c: WorkpieceComponent; data: RecordData }[];
  label?: string;
  /** 非权威附注（ADR-0008 §7 三纪律）：栈应用完 entries 后调；只捕原始值/小 plain object。 */
  hint?: (dir: "undo" | "redo") => void;
}

/** push 入参：id 由栈分配（唯一 id 权威），其余字段同 UndoStep。 */
export type UndoStepInput = Omit<UndoStep, "id">;

export interface UndoStackOpts {
  maxQuotaBytes: number;
  /** 栈形变（push/undo/redo/clear/evict）。app 侧接按钮态/编辑门。 */
  onChange?: () => void;
  /** 某步被 undo/redo 应用。app 侧接状态栏 toast + 面板刷新。 */
  onApplied?: (step: UndoStep, dir: "undo" | "redo") => void;
}

/** Workpiece 协作面（_bindWorkpiece 注入；见 workpiece.ts）。 */
export interface StackWorkpieceHooks {
  /** undo/redo 入口先调：开着的令牌下禁 undo（throw）。 */
  beforeApply(): void;
  /** 某步应用完（hint 之后）：commitVersion++ + 组件变更信号。 */
  afterApply(step: UndoStep, dir: "undo" | "redo"): void;
}

export class UndoStack {
  private _steps: UndoStep[] = [];
  private _cursor = -1;              // 最后一个「已应用」step 的下标；-1 = 栈底
  private _baseId = 0;               // 栈底位置的身份：0 = 初始态；驱逐后 = 最后被驱逐步的 id
  private _nextId = 1;
  private _opts: UndoStackOpts;
  private _hooks: StackWorkpieceHooks | null = null;

  constructor(opts: UndoStackOpts) { this._opts = opts; }

  /** 独占绑定（一个栈只服务一个 workpiece；重复绑定 = 装配 bug）。 */
  _bindWorkpiece(hooks: StackWorkpieceHooks): void {
    if (this._hooks) throw new Error("UndoStack: already bound (one stack serves exactly one workpiece)");
    this._hooks = hooks;
  }

  /** 由 WriteToken.commit 调，app 不直调。截断 redo 段 → 入栈 → 配额驱逐。 */
  push(step: UndoStepInput): void {
    if (this._cursor < this._steps.length - 1) {
      const dropped = this._steps.splice(this._cursor + 1);
      for (const s of dropped) this._disposeStep(s);
    }
    this._steps.push({ ...step, id: this._nextId++ });
    this._cursor++;
    this._evictToQuota();
    this._opts.onChange?.();
  }

  undo(): boolean {
    if (!this.canUndo()) return false;
    this._hooks?.beforeApply();
    const step = this._steps[this._cursor];
    for (let i = step.entries.length - 1; i >= 0; i--) {
      const e = step.entries[i];
      e.data = e.c.swapRecord(e.data);
    }
    this._cursor--;
    step.hint?.("undo");
    this._opts.onApplied?.(step, "undo");
    this._hooks?.afterApply(step, "undo");
    this._opts.onChange?.();
    return true;
  }

  redo(): boolean {
    if (!this.canRedo()) return false;
    this._hooks?.beforeApply();
    const step = this._steps[this._cursor + 1];
    for (const e of step.entries) {
      e.data = e.c.swapRecord(e.data);
    }
    this._cursor++;
    step.hint?.("redo");
    this._opts.onApplied?.(step, "redo");
    this._hooks?.afterApply(step, "redo");
    this._opts.onChange?.();
    return true;
  }

  canUndo(): boolean { return this._cursor >= 0; }
  canRedo(): boolean { return this._cursor < this._steps.length - 1; }
  /** 下一次 undo / redo 要翻的那一步的标签（没有可翻的 / 那一步没带标签 → undefined）。只读，给写门按操作分类用。 */
  peekLabel(dir: "undo" | "redo"): string | undefined {
    const step = dir === "undo" ? this._steps[this._cursor] : this._steps[this._cursor + 1];
    return step?.label;
  }

  /** 游标位置身份 = stateVersion（栈底 = _baseId，初始 0）。 */
  cursorStepId(): number {
    return this._cursor >= 0 ? this._steps[this._cursor].id : this._baseId;
  }

  /** 栈内步数（驱逐观测/调试）。 */
  depth(): number { return this._steps.length; }

  /** 全量重扫（压缩会让单步 usage 变，不缓存）。 */
  quotaUsage(): number {
    let sum = 0;
    for (const s of this._steps) for (const e of s.entries) sum += e.c.recordBytes(e.data);
    return sum;
  }

  /** 弃整栈（换文档 load 后调；load 随后 markSaved → 位置身份归 0 起步）。 */
  clear(): void {
    for (const s of this._steps) this._disposeStep(s);
    this._steps = [];
    this._cursor = -1;
    this._baseId = 0;
    this._opts.onChange?.();
  }

  // ---- 内部 ----

  private _evictToQuota(): void {
    // 从最老端整步驱逐；_cursor > 0 保证最新一步（游标步）永不驱逐——宁超配额不砍刚做的。
    // （push 是唯一驱逐点，此时游标必在栈顶。）
    while (this.quotaUsage() > this._opts.maxQuotaBytes && this._cursor > 0) {
      const s = this._steps.shift()!;
      this._cursor--;
      this._baseId = s.id;
      this._disposeStep(s);
    }
  }

  private _disposeStep(s: UndoStep): void {
    for (const e of s.entries) {
      try { e.c.disposeRecord(e.data); } catch { /* dispose 尽力而为 */ }
    }
  }
}

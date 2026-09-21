// history.ts —— 正规 undo（A1，2026-09-20）：**op 日志 + 检查点环**。状态 = base + 已应用 op 序列的纯函数（内核确定性，公理 5）。
// created 2026-09-20 by Claude Fable 5.1（user 09-20「正规 undo…按照 multiplayer friendly 做这种 replay 指令式」「做」）
//
// · 记账 = 指令（ops.ts：可序列化、按坐标寻址）；undo = 回到最近检查点重放（O(SNAP_EVERY_OPS)），redo = 原地再应用；
//   零逆操作、零内核入侵（journal.ts 的设计不变，加了快照环与事务性）。
// · 事务性：应用抛错（目标缺席 / 内核拒绝）→ 这批**不记账**，并交回一份「提交前状态」的内核（OpApplyError.restored）——
//   调用方换掉手里的内核即回到提交前；2026-09-07 错误边界注释里承诺的「checkpoint 原样」从此为真（此前是原地半改动）。
// · 联机形状：log() = 线协议本体（peer 重放同序列收敛）；联机 undo = 抽 op 重放（OT 政策在上层），本类不做。
// · 指令流生命周期 = runtime（user 2026-09-07）：不持久化；打开文件 = 新 base，历史从零开始。
// · 动词面对齐 WeebPaint workpiece/undo-stack（canUndo/canRedo/undo/redo/commit/depth），日后抽 @internal/workpiece 机械。
import { Kernel } from "../kernel/kernel.ts";
import { applyOp, type ApplyResult, type Op } from "./ops.ts";

/** 每多少条 op 留一个内核快照（clone）——undo 最多重放 SNAP_EVERY_OPS−1 条。量纲：op 条数。 */
export const SNAP_EVERY_OPS = 8;
/** 最多保留几个快照（≈ SNAP_EVERY_OPS×KEEP_SNAPS 条 op 内 O(k) 撤销；更深回 base 全量重放，仍正确只是慢）。量纲：个。 */
export const KEEP_SNAPS = 8;

/** 应用失败：cause = 内核 / 解析抛的原错；restored = 提交前状态的内核（新实例，调用方直接换用）。 */
export class OpApplyError extends Error {
  readonly cause: unknown;
  readonly restored: Kernel;
  constructor(cause: unknown, restored: Kernel) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "OpApplyError"; this.cause = cause; this.restored = restored;
  }
}

export class History {
  private readonly base: Kernel;                 // 装载态（clone 持有，永不改）；undo 到底 = 回到刚打开时
  private ops: Op[] = [];
  private cursor = 0;                            // 已应用 op 数：ops[0..cursor) 生效
  private snaps = new Map<number, Kernel>();     // index → 应用 ops[0..index) 后的快照（clone，只读）；base 视为 index 0
  private readonly snapEvery: number;
  private readonly keepSnaps: number;

  constructor(base?: Kernel, opts?: { snapEvery?: number; keepSnaps?: number }) {
    this.base = base ? base.clone() : new Kernel();
    this.snapEvery = Math.max(1, opts?.snapEvery ?? SNAP_EVERY_OPS);
    this.keepSnaps = Math.max(0, opts?.keepSnaps ?? KEEP_SNAPS);
  }

  canUndo(): boolean { return this.cursor > 0; }
  canRedo(): boolean { return this.cursor < this.ops.length; }
  /** 日志长度（含可 redo 的尾巴）。 */
  depth(): number { return this.ops.length; }
  /** 当前位置（已应用 op 数）。 */
  position(): number { return this.cursor; }
  /** 联机形状：日志本体（只读）。 */
  log(): readonly Op[] { return this.ops; }
  /** 测试 / 诊断：现有快照的 index 表。 */
  snapshotIndices(): number[] { return [...this.snaps.keys()].sort((a, b) => a - b); }

  /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴与其后的快照）。失败抛 OpApplyError（不记账，带回滚内核）。 */
  commit(k: Kernel, op: Op): ApplyResult {
    let r: ApplyResult;
    try { r = applyOp(k, op); }
    catch (e) { throw new OpApplyError(e, this.stateAt(this.cursor)); }
    if (this.cursor < this.ops.length) {
      this.ops.length = this.cursor;
      for (const i of [...this.snaps.keys()]) if (i > this.cursor) this.snaps.delete(i);
    }
    this.ops.push(op);
    this.cursor++;
    if (this.cursor % this.snapEvery === 0) { this.snaps.set(this.cursor, r.kernel.clone()); this.prune(); }
    return r;
  }

  /** 撤销 = 回到最近检查点重放到 cursor−1。返回新内核（调用方换用）；没得撤 → null。 */
  undo(): Kernel | null {
    if (this.cursor === 0) return null;
    this.cursor--;
    return this.stateAt(this.cursor);
  }

  /** 重做 = 把下一条 op 原地应用到当前内核。失败抛 OpApplyError（cursor 不动）。 */
  redo(k: Kernel): ApplyResult | null {
    if (this.cursor >= this.ops.length) return null;
    let r: ApplyResult;
    try { r = applyOp(k, this.ops[this.cursor]); }
    catch (e) { throw new OpApplyError(e, this.stateAt(this.cursor)); }
    this.cursor++;
    return r;
  }

  /** 应用 ops[0..i) 后的状态（新实例）：取 ≤ i 的最近快照 clone 再重放剩余。 */
  stateAt(i: number): Kernel {
    let from = 0, src = this.base;
    for (const [j, s] of this.snaps) if (j <= i && j > from) { from = j; src = s; }
    let k = src.clone();
    for (let j = from; j < i; j++) k = applyOp(k, this.ops[j]).kernel;
    return k;
  }
  /** 当前状态的独立重建（测试 / 校验用）。 */
  replay(): Kernel { return this.stateAt(this.cursor); }

  private prune(): void {
    const keys = this.snapshotIndices();
    while (keys.length > this.keepSnaps) this.snaps.delete(keys.shift()!);
  }
}

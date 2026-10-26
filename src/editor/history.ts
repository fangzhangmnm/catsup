// history.ts —— 正规 undo（A1，2026-09-20）：**op 日志 + 检查点环**。状态 = base + 已应用 op 序列的纯函数（内核确定性，公理 5）。
// created 2026-09-20 by Claude Fable 5.1（user 09-20「正规 undo…按照 multiplayer friendly 做这种 replay 指令式」「做」）
// 2026-10-21（group / component 纪元）：状态从 Kernel 换成 **Scene**（definition / group / instance 全在里面），快照 = Scene.clone()。
//
// · 记账 = 指令（ops.ts：可序列化、按坐标寻址）；undo = 回到最近检查点重放（O(SNAP_EVERY_OPS)），redo = 原地再应用；
//   零逆操作、零内核入侵。
// · 事务性：应用抛错（目标缺席 / 内核拒绝）→ 这批**不记账**，并交回一份「提交前状态」（OpApplyError.restored）。
// · 联机形状：log() = 线协议本体；联机 undo = 抽 op 重放（OT 政策在上层），本类不做。
// · 指令流生命周期 = runtime（user 2026-09-07）：不持久化；打开文件 = 新 base，历史从零开始。
// · 一步 = 用户的一个动作，可以是好几条 op（阵列 ×6 = 6 份副本、移动两个组 = 两条变换、建组件再挪原点）：commit 带 join = 和前一条同一步；
//   undo / redo 按步走（user 2026-10-25「*6 /6的时候undo不对，变成需要一个一个删了」）。undoOp 只退一条 = 编辑器内部「撤销刚才那步按新值重做」用。
//   edited 2026-10-25 by Claude Opus 5.5
import { Scene } from "../scene/scene.ts";
import { applyOp, type ApplyResult, type Op } from "./ops.ts";

/** 每多少条 op 留一个场景快照（clone）——undo 最多重放 SNAP_EVERY_OPS−1 条。量纲：op 条数。 */
export const SNAP_EVERY_OPS = 8;
/** 最多保留几个快照（≈ SNAP_EVERY_OPS×KEEP_SNAPS 条 op 内 O(k) 撤销；更深回 base 全量重放，仍正确只是慢）。量纲：个。 */
export const KEEP_SNAPS = 8;

/** 应用失败：cause = 内核 / 解析抛的原错；restored = 提交前状态（新实例，调用方直接换用）。 */
export class OpApplyError extends Error {
  readonly cause: unknown;
  readonly restored: Scene;
  constructor(cause: unknown, restored: Scene) {
    super(cause instanceof Error ? cause.message : String(cause));
    this.name = "OpApplyError"; this.cause = cause; this.restored = restored;
  }
}

export class History {
  private readonly base: Scene;                  // 装载态（clone 持有，永不改）；undo 到底 = 回到刚打开时
  private ops: Op[] = [];
  private joins: boolean[] = [];                 // joins[i] = ops[i] 和 ops[i−1] 是同一步（第 0 条永远 false）
  private cursor = 0;                            // 已应用 op 数：ops[0..cursor) 生效
  private snaps = new Map<number, Scene>();      // index → 应用 ops[0..index) 后的快照（clone，只读）；base 视为 index 0
  private readonly snapEvery: number;
  private readonly keepSnaps: number;

  constructor(base?: Scene, opts?: { snapEvery?: number; keepSnaps?: number }) {
    this.base = base ? base.clone() : new Scene();
    this.snapEvery = Math.max(1, opts?.snapEvery ?? SNAP_EVERY_OPS);
    this.keepSnaps = Math.max(0, opts?.keepSnaps ?? KEEP_SNAPS);
  }

  canUndo(): boolean { return this.cursor > 0; }
  canRedo(): boolean { return this.cursor < this.ops.length; }
  depth(): number { return this.ops.length; }
  position(): number { return this.cursor; }
  log(): readonly Op[] { return this.ops; }
  snapshotIndices(): number[] { return [...this.snaps.keys()].sort((a, b) => a - b); }

  /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴与其后的快照）。join = 和上一条同一步。失败抛 OpApplyError（不记账，带回滚场景）。 */
  commit(s: Scene, op: Op, join = false): ApplyResult {
    let r: ApplyResult;
    try { r = applyOp(s, op); }
    catch (e) { throw new OpApplyError(e, this.stateAt(this.cursor)); }
    if (this.cursor < this.ops.length) {
      this.ops.length = this.cursor; this.joins.length = this.cursor;
      for (const i of [...this.snaps.keys()]) if (i > this.cursor) this.snaps.delete(i);
    }
    this.ops.push(op); this.joins.push(join && this.cursor > 0);
    this.cursor++;
    if (this.cursor % this.snapEvery === 0) { this.snaps.set(this.cursor, r.scene.clone()); this.prune(); }
    return r;
  }

  /** 撤销一步（这一步的全部 op）= 回到最近检查点重放到这一步之前。返回新场景（调用方换用）；没得撤 → null。 */
  undo(): Scene | null {
    if (this.cursor === 0) return null;
    do this.cursor--; while (this.cursor > 0 && this.joins[this.cursor]);
    return this.stateAt(this.cursor);
  }
  /** 只撤一条 op（编辑器内部按新值重做那一步用；用户的撤销走 undo）。 */
  undoOp(): Scene | null {
    if (this.cursor === 0) return null;
    this.cursor--;
    return this.stateAt(this.cursor);
  }

  /** 重做一步 = 把下一步的 op 依次原地应用到当前场景。中途失败抛 OpApplyError（cursor 不动、带回这一步之前的场景）。 */
  redo(s: Scene): ApplyResult | null {
    if (this.cursor >= this.ops.length) return null;
    const c0 = this.cursor;
    let r: ApplyResult | null = null;
    const events: ApplyResult["events"] = [];
    try {
      do { r = applyOp(r ? r.scene : s, this.ops[this.cursor]); events.push(...r.events); this.cursor++; }
      while (this.cursor < this.ops.length && this.joins[this.cursor]);
    } catch (e) { this.cursor = c0; throw new OpApplyError(e, this.stateAt(c0)); }
    return { ...r!, events };
  }

  /** 应用 ops[0..i) 后的状态（新实例）：取 ≤ i 的最近快照 clone 再重放剩余。 */
  stateAt(i: number): Scene {
    let from = 0, src = this.base;
    for (const [j, s] of this.snaps) if (j <= i && j > from) { from = j; src = s; }
    let sc = src.clone();
    for (let j = from; j < i; j++) sc = applyOp(sc, this.ops[j]).scene;
    return sc;
  }
  /** 当前状态的独立重建（测试 / 校验用）。 */
  replay(): Scene { return this.stateAt(this.cursor); }

  private prune(): void {
    const keys = this.snapshotIndices();
    while (keys.length > this.keepSnaps) this.snaps.delete(keys.shift()!);
  }
}

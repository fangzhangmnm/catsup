import { Scene } from "../scene/scene.ts";
import { type ApplyResult, type Op } from "./ops.ts";
/** 每多少条 op 留一个场景快照（clone）——undo 最多重放 SNAP_EVERY_OPS−1 条。量纲：op 条数。 */
export declare const SNAP_EVERY_OPS = 8;
/** 最多保留几个快照（≈ SNAP_EVERY_OPS×KEEP_SNAPS 条 op 内 O(k) 撤销；更深回 base 全量重放，仍正确只是慢）。量纲：个。 */
export declare const KEEP_SNAPS = 8;
/** 应用失败：cause = 内核 / 解析抛的原错；restored = 提交前状态（新实例，调用方直接换用）。 */
export declare class OpApplyError extends Error {
    readonly cause: unknown;
    readonly restored: Scene;
    constructor(cause: unknown, restored: Scene);
}
/** 一步的会话记录：before = 这一步第一条 op 提交之前；after = 撤销它的那一刻（重做时还原）。 */
export interface StepSession<M> {
    before: M;
    after?: M;
}
export declare class History<M = unknown> {
    private readonly base;
    private ops;
    private joins;
    private sessions;
    private cursor;
    private snaps;
    private readonly snapEvery;
    private readonly keepSnaps;
    constructor(base?: Scene, opts?: {
        snapEvery?: number;
        keepSnaps?: number;
    });
    canUndo(): boolean;
    canRedo(): boolean;
    depth(): number;
    position(): number;
    log(): readonly Op[];
    snapshotIndices(): number[];
    /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴与其后的快照）。join = 和上一条同一步；before = 新开一步时这一步之前的会话。失败抛 OpApplyError（不记账，带回滚场景）。 */
    commit(s: Scene, op: Op, join?: boolean, before?: M): ApplyResult;
    /**
     * 撤销一步（这一步的全部 op）= 回到最近检查点重放到这一步之前。now = 撤销这一刻的会话（记成这一步的 after，重做时还原）。
     * 返回新场景 + 这一步之前的会话（调用方一起换用）；没得撤 → null。
     */
    undo(now?: M): {
        scene: Scene;
        before: M | undefined;
    } | null;
    /** 只撤一条 op（编辑器内部按新值重做那一步用；用户的撤销走 undo）。撤到一步的开头时带回那一步之前的会话。 */
    undoOp(): {
        scene: Scene;
        before: M | undefined;
    } | null;
    /** 重做一步 = 把下一步的 op 依次原地应用到当前场景；带回这一步之后的会话（撤销时记下的）。中途失败抛 OpApplyError（cursor 不动、带回这一步之前的场景）。 */
    redo(s: Scene): (ApplyResult & {
        after: M | undefined;
    }) | null;
    /** 丢掉重做队列（游标之后的 op、会话记录、快照）。一步做到一半失败、回滚之后用：那半截不许被重做出来。 */
    dropRedo(): void;
    /** 应用 ops[0..i) 后的状态（新实例）：取 ≤ i 的最近快照 clone 再重放剩余。 */
    stateAt(i: number): Scene;
    /** 当前状态的独立重建（测试 / 校验用）。 */
    replay(): Scene;
    private prune;
}

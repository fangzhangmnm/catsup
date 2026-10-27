import { Scene, type PoolRef } from "../scene/scene.ts";
import { type ApplyResult, type Op } from "./ops.ts";
/** 撤销栈配额（字节）。 */
export declare const UNDO_QUOTA_BYTES: number;
/** 应用失败：cause = 内核 / 解析抛的原错；restored = 提交前状态（调用方直接换用；kernel 型 = 同一个场景对象、内核已换回）。 */
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
export type OpTier = "kernel" | "skeleton" | "scene";
/** 这条 op 的撤销记录怎么记：kernel = 一个 brep 池的差量（+ 骨架）；skeleton = 只拷骨架；scene = 整份场景拷。 */
export declare function opTier(s: Scene, op: Op): {
    tier: OpTier;
    at?: PoolRef;
};
export declare class History<M = unknown> {
    private readonly base;
    private ops;
    private joins;
    private sessions;
    private entries;
    private cursor;
    private evicted;
    private current;
    private readonly quota;
    constructor(base?: Scene, opts?: {
        quotaBytes?: number;
    });
    canUndo(): boolean;
    canRedo(): boolean;
    depth(): number;
    position(): number;
    log(): readonly Op[];
    /** 撤销记录占的字节（估计）。 */
    usageBytes(): number;
    /** 被配额驱逐、不能再撤的 op 数（披露用）。 */
    evictedCount(): number;
    /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴）。join = 和上一条同一步；before = 新开一步时这一步之前的会话。失败抛 OpApplyError（不记账，带回提交前状态）。 */
    commit(s: Scene, op: Op, join?: boolean, before?: M): ApplyResult;
    /** 只改会话（选区 / 进出组件）的一步：0 条 op，只有会话记录——「撤销也撤选区」（user 10-27「这个我们要」）。 */
    commitSession(before: M): void;
    /** 撤销一步（这一步的全部 op）：自反交换倒着走。now = 撤销这一刻的会话（记成这一步的 after）。返回场景 + 这一步之前的会话；没得撤 → null。 */
    undo(now?: M): {
        scene: Scene;
        before: M | undefined;
    } | null;
    /** 只撤一条 op（编辑器内部按新值重做那一步 / 一步中途失败回滚用；用户的撤销走 undo）。撤到一步的开头时带回那一步之前的会话。 */
    undoOp(): {
        scene: Scene;
        before: M | undefined;
    } | null;
    /** 重做一步：自反交换正着走；带回这一步之后的会话。events 为空（重做不重跑动词）。 */
    redo(_s: Scene): (ApplyResult & {
        after: M | undefined;
    }) | null;
    /** 丢掉重做队列（游标之后的 op、会话记录、撤销记录）。一步做到一半失败、回滚之后用：那半截不许被重做出来。 */
    dropRedo(): void;
    /** 当前状态的独立重建（装载态 + 指令流全量重放；测试 / 校验用，不在热路径）。 */
    replay(): Scene;
    /** 应用 ops[0..i) 后的状态（新实例，全量重放）。 */
    stateAt(i: number): Scene;
    /** 自反交换 ops[i] 的记录（撤 = 倒序、重做 = 正序）；记录被换成反向包。 */
    private swap;
    /** 从最老端整步驱逐到配额之内；最新一步永不驱逐。驱逐 = 丢撤销记录、游标之前不能再撤；指令流留着。 */
    private evictToQuota;
}

import { Scene, type PoolRef, type DefId } from "../scene/scene.ts";
import { type ApplyResult, type Op } from "./ops.ts";
/** 撤销栈配额（字节）。 */
export declare const UNDO_QUOTA_BYTES: number;
/** 应用失败：cause = 内核 / 解析抛的原错；restored = 提交前状态（调用方直接换用；kernel 型 = 同一个场景对象、内核已换回）。 */
export declare class OpApplyError extends Error {
    readonly cause: unknown;
    readonly restored: Scene;
    constructor(cause: unknown, restored: Scene);
}
/** 一步的会话记录：before = 这一步开始之前；after = 这一步结束时（sealStep 封；重做时还原）。 */
export interface StepSession<M> {
    before: M;
    after?: M;
}
/** 步的标签（提示行「撤销：建组」「重做：移动 8 个点」）。 */
export interface StepLabel {
    readonly title: string;
    readonly count?: number;
}
/** 部件的宿主：场景族的部件要换场景对象。 */
export interface UndoHost {
    readonly scene: Scene;
    setScene(s: Scene): void;
}
/**
 * 撤销记录的部件：一步 = 若干条 {kind, data}，撤 = 倒序 swap、重做 = 正序再 swap（自反 / 对合，不存在「undo 生成 redo」）。
 * 契约（设计稿 §2 I3）：swap 不许读别的部件此刻的状态（两两可交换）；调用者乱用时给规章定义的结果、不炸。记录是纯数据（不存函数）。
 */
export interface UndoComponent<R = unknown> {
    readonly kind: string;
    /** 把记录放回去，返回放回之前的样子（= 反向记录）。 */
    swap(record: R, host: UndoHost): R;
    /** 字节估计（配额用；量纲：字节；量级即可）。 */
    bytes(record: R): number;
    dispose?(record: R): void;
}
export type OpTier = "kernel" | "mesh" | "skeleton" | "scene";
/** 这条 op 的撤销记录怎么记：kernel = 一个 brep 池的差量（+ 骨架）；skeleton = 只拷骨架；scene = 整份场景拷。 */
export declare function opTier(s: Scene, op: Op): {
    tier: OpTier;
    at?: PoolRef;
    def?: DefId;
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
    private labels;
    private readonly quota;
    private readonly components;
    private readonly host;
    constructor(base?: Scene, opts?: {
        quotaBytes?: number;
    });
    /** 登记一种部件（以后的节点图 / 图片层 / 元数据）。重名 = 在登记处响亮失败（调用点的误用，不留到撤销时炸）。 */
    registerComponent(c: UndoComponent): void;
    /** 外部部件在当前步里记一条记录（会话 / 节点图 / 图片层……）：挂在这一步最后一条 op 上；没有步（游标 0 或刚驱逐）= 响亮失败。 */
    record(kind: string, data: unknown): void;
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
    commit(s: Scene, op: Op, join?: boolean, before?: M, label?: StepLabel): ApplyResult;
    /** 当前这一步（栈顶）的开头下标；没有步 = -1。 */
    private topStart;
    /** 封步：这一步结束时的会话（重做回到它）+ 可补标签。没有步 = 不做（规章定义的结果，不炸）。 */
    sealStep(after: M, label?: StepLabel): void;
    /** 栈顶那一步的标签（提示行 / 马后炮标题）。 */
    topLabel(): StepLabel | undefined;
    /** 只改会话（选区 / 进出组件）的一步：0 条 op，只有会话记录——「撤销也撤选区」（user 10-27「这个我们要」）。 */
    commitSession(before: M, after?: M, label?: StepLabel): void;
    /** 撤销一步（这一步的全部 op）：自反交换倒着走。返回场景 + 这一步之前的会话 + 标签；没得撤 → null。「之后」的会话由 sealStep 在步结束时封，这里不再补记。 */
    undo(): {
        scene: Scene;
        before: M | undefined;
        label: StepLabel | undefined;
    } | null;
    /** 只撤一条 op（编辑器内部按新值重做那一步 / 一步中途失败回滚用；用户的撤销走 undo）。撤到一步的开头时带回那一步之前的会话。 */
    undoOp(): {
        scene: Scene;
        before: M | undefined;
    } | null;
    /** 重做一步：自反交换正着走；带回这一步之后的会话。events 为空（重做不重跑动词）。 */
    redo(_s: Scene): (ApplyResult & {
        after: M | undefined;
        label: StepLabel | undefined;
    }) | null;
    /** 被配额驱逐、撤不回去的**步**数（提示行「撤到头了（更早的 N 步超过配额）」）。 */
    evictedSteps(): number;
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

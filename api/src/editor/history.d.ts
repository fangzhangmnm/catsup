import { Scene, type PoolRef, type DefId } from "../scene/scene.ts";
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import { type ApplyResult, type Op } from "./ops.ts";
import type { Kernel } from "../kernel/kernel.ts";
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
    /**
     * 字节会变（画：内核的图块没压缩时记 0、归图块池自己的额度管，压缩之后记压缩后的大小、被几条记录共用时分摊——画画软件的栈每次重算，0-3a）：
     * 算额度之前现问一遍 bytes，不用挂上时存的那个数。不给 = 挂上时算一次（别的成分照旧）。
     */
    readonly volatileBytes?: boolean;
    dispose?(record: R): void;
    /** 翻之前先问（整步事务第一段）：这一步里这种成分的全部记录（按要翻的先后）现在能不能按 dir 翻；不能 = 原因，能 = null。不给 = 永远能。不许改任何状态。 */
    check?(records: readonly R[], dir: "undo" | "redo", host: UndoHost): string | null;
    /** 翻回去也抛了 = 这条记录背后的状态不可信：成分自己走「不可恢复」那条路（可以调 History.dropRecords），返回给用户的一句话。 */
    untrusted?(record: R, cause: unknown): string;
    /** 记录被 dropRecords 摘掉（背后的东西已经自己作废，不 dispose）。 */
    forget?(record: R): void;
}
/** 撤销 / 重做没做成，三维的状态和撤销栈的游标都没动（refused = 问的时候就说不能；rolled-back = 翻了一半抛了、已经翻回去）。untrusted = 翻回去也失败、已作废的那几样的说法。 */
export declare class StepFlipError extends Error {
    readonly reason: "refused" | "rolled-back";
    readonly label: StepLabel | undefined;
    readonly untrusted: readonly string[];
    constructor(reason: "refused" | "rolled-back", why: string, label: StepLabel | undefined, untrusted?: readonly string[]);
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
    private mints;
    private joins;
    private sessions;
    private entries;
    private cursor;
    private evicted;
    private current;
    private labels;
    private recordOnly;
    /** 一步里第一条提交成功时停放的重做尾巴（一步全有或全无，统筹 11-13）：这一步成功收尾 = discardParkedRedo 丢掉；失败回滚 = restoreParkedRedo 放回原处。 */
    private parked;
    private readonly quota;
    private readonly components;
    private readonly host;
    /** 停放的重做尾巴漏过了一步的次数（本该永远 0：开一步 / 撤销 / 重做 / 装载时还停着 = 某条路没收尾；探针断言 0）。 */
    parkedLeaks: number;
    private readonly onLeak?;
    constructor(base?: Scene, opts?: {
        quotaBytes?: number;
        onLeak?: (where: string) => void;
    });
    /** 登记一种部件（以后的节点图 / 图片层 / 元数据）。重名 = 在登记处响亮失败（调用点的误用，不留到撤销时炸）。 */
    registerComponent(c: UndoComponent): void;
    /** 外部部件在当前步里记一条记录（会话 / 节点图 / 图片层……）：挂在这一步最后一条 op 上；没有步（游标 0 或刚驱逐）= 响亮失败。 */
    record(kind: string, data: unknown): void;
    canUndo(): boolean;
    canRedo(): boolean;
    depth(): number;
    position(): number;
    /**
     * 第 from 条指令起（到现在）某个定义第一次被改之前的那份网格体（施工单十八第 2 刀：收尾比这一步前后、记空出来的地方；只读，不延长那份的寿命——它本来就是撤销记录）。
     * 找法：最早一条网格体档的记录（影子 = 那一下之前的表）或整场景档的快照（深拷）；都没有、只有骨架快照 = 这一步没换过它的表：定义还在 = unchanged，
     * 定义这一步没了 = 骨架快照里共用的那份（没人再改过它）。slots = 那时的速查表（网格体档的记录不带：速查表只往后加，用现在的）。
     */
    /** 定义这一步没了时它的速查表：这一步里任何一份场景快照里的（速查表只往后加，哪一份都一样能翻代号）。 */
    private slotsInStep;
    meshBefore(def: DefId, from: number): {
        kind: "unchanged";
    } | {
        kind: "absent";
    } | {
        kind: "mesh";
        kernel: MeshKernel;
        slots: readonly string[] | null;
    };
    log(): readonly Op[];
    /** 撤销记录占的字节（估计）。 */
    /** 现在占多少字节（还能撤的那一段）。字节会变的成分现问一遍、顺手记下（volatileBytes）。 */
    usageBytes(): number;
    /** 登记过的「字节会变」的成分；一个都没有 = null（不画画的栈不多做一点事）。 */
    private volatileKinds;
    /** 被配额驱逐、不能再撤的 op 数（披露用）。 */
    evictedCount(): number;
    /** 实时提交：应用 + 记账（新分支即清空 redo 尾巴）。join = 和上一条同一步；before = 新开一步时这一步之前的会话。失败抛 OpApplyError（不记账，带回提交前状态）。 */
    commit(s: Scene, op: Op, join?: boolean, before?: M, label?: StepLabel, inStep?: boolean): ApplyResult;
    /** 当前这一步（栈顶）的开头下标；没有步 = -1。 */
    private topStart;
    /** 封步：这一步结束时的会话（重做回到它）+ 可补标签。没有步 = 不做（规章定义的结果，不炸）。 */
    sealStep(after: M, label?: StepLabel): void;
    /**
     * 上一条 op 提交之前、池 at 的内核（复现包「上一步」钮）：按这条 op 的记录倒推一次——kernel 差量 = 在真身的拷贝上应用一次（记录存的是撤销方向）；
     * pool 整表 = 那份旧表的拷贝；整份场景记录 = 快照里的那个池。不重放指令流（以前 stateAt(pos − 1) = O(指令数)，大文件上会卡）。
     * 没有上一条 / 记录被驱逐 / 这条 op 没碰 at / at 在那之前还不存在 → null（规章定义的结果，不猜）。
     */
    beforeLastOp(at: PoolRef): Kernel | null;
    /** 栈顶那一步的标签（提示行 / 马后炮标题）。 */
    topLabel(): StepLabel | undefined;
    /** 只改会话（选区 / 进出组件）的一步：0 条 op，只有会话记录——「撤销也撤选区」（user 10-27「这个我们要」）。 */
    commitSession(before: M, after?: M, label?: StepLabel): void;
    /** 一步只有成分记录（画一笔，1-8a）：一条空的 batch 记号指令（进指令流、重放是空操作，不拷场景）+ 这些记录。没有记录 = 不做。 */
    commitRecords(before: M, label: StepLabel, records: readonly {
        readonly kind: string;
        readonly data: unknown;
    }[]): void;
    /**
     * 摘记录（只给「这张画以前的步全作废」用）：所有步里这种成分、pred 为真的记录摘掉（调 forget，不调 dispose）；摘空了的「只有记录」的步整步删掉，游标和驱逐线跟着重算。返回摘了几条。
     */
    dropRecords(kind: string, pred: (data: unknown) => boolean): number;
    /** 撤销一步（这一步的全部 op）：自反交换倒着走。返回场景 + 这一步之前的会话 + 标签；没得撤 → null。「之后」的会话由 sealStep 在步结束时封，这里不再补记。 */
    /** 这几条（[start, end)）动没动文档（统筹 11-12：文档改动号变 ⟺ 写出去的文件会变）：有一条不是空 batch 的指令、或者带了撤销记录 = 动了；只改选区 / 进出组件的步（commitSession：一条空 batch、没有记录）= 没动。 */
    private touchesDoc;
    undo(): {
        scene: Scene;
        before: M | undefined;
        label: StepLabel | undefined;
        doc: boolean;
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
        doc: boolean;
    }) | null;
    /** 已做的步数（游标之前；不是 op 数；重做尾巴不算）。fuzz 的「一个动作最多长一步」用。 */
    steps(): number;
    /** 被配额驱逐、撤不回去的**步**数（提示行「撤到头了（更早的 N 步超过配额）」）。 */
    evictedSteps(): number;
    /** 把重做尾巴停放起来（这一步还没定成败）；已经停着一份 = 这一份是这一步自己的半截，直接丢。 */
    private parkRedo;
    /** 没有一步开着时停放的一定是空的（开一步 / 撤销 / 重做 / 装载前查）：不空 = 某条路没收尾——丢掉、计数、报给宿主。 */
    checkParked(where: string): void;
    /** 这一步成功收尾：停着的重做尾巴真正丢掉（释放撤销记录）。 */
    discardParkedRedo(): void;
    /** 这一步失败、已回滚到这一步之前：把停着的重做尾巴放回原处（失败的一步什么都没改，重做照旧）。 */
    restoreParkedRedo(): void;
    /** 丢掉重做队列（游标之后的 op、会话记录、撤销记录）。一步做到一半失败、回滚之后用：那半截不许被重做出来。 */
    dropRedo(): void;
    /** 当前状态的独立重建（装载态 + 指令流全量重放，GUID 和当初一样；测试 / 校验用，不在热路径）。 */
    replay(): Scene;
    /** 应用 ops[0..i) 后的状态（新实例，全量重放）。 */
    stateAt(i: number): Scene;
    /**
     * 整步事务（头注释那一节）：ops[start..end) 的记录按方向排好先后（撤 = 指令倒着、每条指令的记录倒着；重做 = 正着）→ ① 每种成分问一遍 → ② 翻；
     * 中间抛了 = 翻过的倒着再翻一遍、抛 StepFlipError；翻回去又抛的那几条，走完之后调成分的 untrusted。游标归调用的人改（只在这里没抛时）。
     */
    private flipStep;
    /** 从最老端整步驱逐到配额之内；最新一步永不驱逐。驱逐 = 丢撤销记录、游标之前不能再撤；指令流留着。 */
    private evictToQuota;
}

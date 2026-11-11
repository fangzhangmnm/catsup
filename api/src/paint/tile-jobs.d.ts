/** 没压缩的图块总共能占多少（字节）。统筹 11-11 先按 128 MB（画画软件 384 MB）；量完再定。 */
export declare const PAINT_TILE_QUOTA_BYTES: number;
/** 停多久给多少毫秒（画画仓 background-sync-jobs DEFAULT_QUOTA_TABLE 原样）。 */
export declare const IDLE_QUOTA_TABLE: readonly {
    readonly afterIdleMs: number;
    readonly quotaMs: number;
}[];
/** 多久看一次（毫秒；画画仓同值）。 */
export declare const TILE_TICK_MS = 250;
export interface CompactPool {
    compactOldest(budgetMs: number): "done" | "more";
    compactAll(): void;
}
export declare class TileJobs {
    private lastInput;
    private readonly pool;
    private readonly now;
    constructor(pool: CompactPool, now?: () => number);
    /** 有输入（按下 / 挪 / 滚轮 / 键盘 / 触摸）：空闲时钟归零。 */
    noteInput(): void;
    /** 看一次：停够了按表给预算压最老的；没停够 = 不动（"busy"）。 */
    tick(): "busy" | "done" | "more";
    /** 切到后台：全压（用户看不见，卡也无妨）。 */
    hidden(): void;
}
/** 定时器和监听从哪来（浏览器 = window / document；测试 = 假的）。每个口返回「撤掉」。 */
export interface TileJobsEnv {
    every(fn: () => void, ms: number): () => void;
    onInput(fn: () => void): () => void;
    onHidden(fn: () => void): () => void;
}
/** 只在有画板时跑：setActive(true) 挂定时器和监听（已经挂着 = 不动），setActive(false) 全撤。 */
export declare class TileJobsDriver {
    private off;
    private readonly jobs;
    private readonly env;
    private readonly log;
    constructor(jobs: TileJobs, env: TileJobsEnv, log: (msg: string) => void);
    get running(): boolean;
    setActive(on: boolean): void;
}
/** 浏览器里的定时器和监听（输入 = 按下 / 挪 / 滚轮 / 键盘 / 触摸，捕获阶段、被动；后台 = visibilitychange 变 hidden）。 */
export declare function browserTileJobsEnv(): TileJobsEnv;
/** 开机调一次（第一块画板之前）：额度 + 编码器 + 泄漏上报（开机就做）；空闲 / 切后台交给返回的 driver（画板登记处在有没有画板变了时调 setActive）。第二次调 = 抛（额度只在开机设一次）。 */
export declare function initPaintTileJobs(o: {
    readonly log: (msg: string) => void;
    readonly quotaBytes?: number;
    readonly env?: TileJobsEnv;
}): {
    readonly jobs: TileJobs;
    readonly driver: TileJobsDriver;
};
/** 图块池现在占多少（解开的 / 压着的字节、块数、解开的额度）：调试钩子和「连开十份文件」那项测量用（1-4d / 统筹 11-11）。 */
export declare function paintTileStats(): {
    rawBytes: number;
    compressedBytes: number;
    count: number;
    rawQuotaBytes: number;
};

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
/** 开机调一次（第一块画板之前）：额度 + 编码器 + 泄漏上报 + 空闲 / 切后台。第二次调 = 抛（额度只在开机设一次）。返回拆的口（真 app 不调）。 */
export declare function initPaintTileJobs(o: {
    readonly log: (msg: string) => void;
    readonly quotaBytes?: number;
}): {
    readonly jobs: TileJobs;
    dispose(): void;
};

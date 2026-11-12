export declare class PaintLimitError extends Error {
    readonly say: string;
    constructor(message: string, say: string);
}
/** 文件锁着（演示锁），画画这一层自己拦下来（统筹 11-11，v0.19.48：开一笔、落层、整份换内容都问一次）。say = 输入闸上那条锁的理由（和编辑器说同一句）。 */
export declare class PaintLockedError extends PaintLimitError {
    constructor(message: string, say: string);
}

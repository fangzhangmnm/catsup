export declare const LOG_V = 0, LOG_E = 1, LOG_F = 2;
export interface ChangeSet {
    readonly verts: Set<number>;
    readonly edges: Set<number>;
    readonly faces: Set<number>;
}
/** 一份日志的记录本体：一张挤紧的 Int32Array（每条 = id × 4 + 种类，4 字节），只有数字。族谱里的后代只拽住它。 */
export declare class LogData {
    private buf;
    private n;
    /** buf[0] 的号。 */
    private base;
    /** 早于它的改动不知道。 */
    private floor;
    /** 这份日志从第几号开始记（= 从祖先分出来的那一号）。 */
    readonly start: number;
    constructor(start: number);
    get seq(): number;
    push(kind: number, id: number): void;
    invalidate(): void;
    /** [from, to) 之间改过的编号；from 早于还记得的 → null（全量重建）。 */
    since(from: number, to?: number): ChangeSet | null;
}
/** 族谱里的一格：哪份日志数据 + 到第几号（本身 = 现在；祖先 = 分叉那一号）。 */
export interface Lineage {
    readonly data: LogData;
    readonly seq: number;
}
export declare class ChangeLog {
    readonly data: LogData;
    private anc;
    /** parent = 从谁拷来的（clone）：从它现在的号起记，族谱 = [它, 它的祖先…]（最多 MAX_DEPTH 代）。 */
    constructor(start?: number, parent?: ChangeLog | null);
    /** 拷贝用：一份从现在的号起记、祖先是自己的新日志。 */
    fork(): ChangeLog;
    /** 下一条会拿到的号 = 到目前为止的「版本」。 */
    get seq(): number;
    /** 这份日志从第几号起记（拷贝 = 拷的那一刻）。 */
    get start(): number;
    /** 族谱：[自己到现在, 父亲到分叉那号, 祖父…]。 */
    lineage(): Lineage[];
    touch(kind: number, id: number): void;
    v(id: number): void;
    e(id: number): void;
    f(id: number): void;
    /** 整批换掉（装载 / 整体重建）：之前的号一律「不知道」，族谱也断。 */
    invalidate(): void;
    /** [from, to) 之间改过的编号；from 早于还记得的 → null（全量重建）。to 缺 = 到现在。 */
    since(from: number, to?: number): ChangeSet | null;
}

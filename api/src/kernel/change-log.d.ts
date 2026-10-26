export declare const LOG_V = 0, LOG_E = 1, LOG_F = 2;
export interface ChangeSet {
    readonly verts: Set<number>;
    readonly edges: Set<number>;
    readonly faces: Set<number>;
}
export declare class ChangeLog {
    private kinds;
    private ids;
    /** kinds[0] 的号。 */
    private base;
    /** 早于它的改动不知道。 */
    private floor;
    constructor(start?: number);
    /** 下一条会拿到的号 = 到目前为止的「版本」。 */
    get seq(): number;
    touch(kind: number, id: number): void;
    v(id: number): void;
    e(id: number): void;
    f(id: number): void;
    /** 整批换掉（装载 / 整体重建）：之前的号一律「不知道」。 */
    invalidate(): void;
    /** [from, to) 之间改过的编号；from 早于还记得的 → null（全量重建）。to 缺 = 到现在。 */
    since(from: number, to?: number): ChangeSet | null;
}
/** 带记账的 Set（层的边集）：真改了才记（add 了原来没有的 / delete 了原来有的）。 */
export declare class LoggedSet<T extends number> extends Set<T> {
    private readonly onTouch;
    constructor(onTouch: (id: T) => void, init?: Iterable<T>);
    add(v: T): this;
    delete(v: T): boolean;
    clear(): void;
}
/** 带记账的 Map（顶点表 / 边表 / 膜表 / 面层）：set / delete 都记（set 同一个键 = 改了它）。 */
export declare class LoggedMap<K extends number, V> extends Map<K, V> {
    private readonly onTouch;
    constructor(onTouch: (id: K) => void, init?: Iterable<readonly [K, V]>);
    set(k: K, v: V): this;
    delete(k: K): boolean;
    clear(): void;
}

/** 稀疏数组表：下标 = id。values 不能是 undefined（内核里的记录都是对象 / 数字）。 */
export declare class IdMap<V> implements Map<number, V> {
    private items;
    private n;
    private readonly onTouch;
    readonly [Symbol.toStringTag] = "IdMap";
    constructor(onTouch?: (id: number) => void, init?: Iterable<readonly [number, V]>);
    get size(): number;
    get(k: number): V | undefined;
    has(k: number): boolean;
    set(k: number, v: V): this;
    delete(k: number): boolean;
    clear(): void;
    keys(): Generator<number, undefined, unknown>;
    values(): Generator<V, undefined, unknown>;
    entries(): Generator<[number, V], undefined, unknown>;
    [Symbol.iterator](): Generator<[number, V], undefined, unknown>;
    forEach(cb: (value: V, key: number, map: Map<number, V>) => void, thisArg?: unknown): void;
    /** 最大的 id + 1（表的长度；遍历成本随它涨，不随活的个数）。 */
    get capacity(): number;
}
/** 有序小集合：升序数组 + 二分；末尾追加 O(1)（id 单调时的常态），中间插 O(n)。遍历用快照（删着遍历不会跳元素）。 */
export declare class IdSet implements Set<number> {
    private a;
    private readonly onTouch;
    readonly [Symbol.toStringTag] = "IdSet";
    constructor(init?: Iterable<number>, onTouch?: (id: number) => void);
    get size(): number;
    private lower;
    private insert;
    has(x: number): boolean;
    add(x: number): this;
    delete(x: number): boolean;
    clear(): void;
    values(): Generator<number, undefined, unknown>;
    keys(): Generator<number, undefined, unknown>;
    entries(): Generator<[number, number], undefined, unknown>;
    [Symbol.iterator](): Generator<number, undefined, unknown>;
    forEach(cb: (value: number, value2: number, set: Set<number>) => void, thisArg?: unknown): void;
    /** 只读视图（不拷）：热路径按下标扫。 */
    get sorted(): readonly number[];
}

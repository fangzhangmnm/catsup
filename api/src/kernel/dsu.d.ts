export declare class DisjointSet<T> {
    private parent;
    /** 没登记过的元素自成一组（find 返回它自己），不登记。 */
    find(x: T): T;
    union(a: T, b: T): void;
    has(x: T): boolean;
    /** 登记过的元素，按第一次登记的顺序。 */
    keys(): IterableIterator<T>;
    get size(): number;
}

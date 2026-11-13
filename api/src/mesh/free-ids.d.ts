export declare class FreeIds {
    private h;
    private constructor();
    static empty(): FreeIds;
    get length(): number;
    /** 放回一个空出来的编号。 */
    push(x: number): void;
    /** 取走最小的那个（空 = undefined）。 */
    pop(): number | undefined;
    clone(): FreeIds;
    /** 从小到大（比集合、调试用）。 */
    sorted(): number[];
}

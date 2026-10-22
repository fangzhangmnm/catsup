export interface PerfStats {
    /** 阶段名 → 最近一次耗时（ms）。 */
    readonly last: Record<string, number>;
    /** 阶段名 → 累计次数。 */
    readonly count: Record<string, number>;
    time<T>(name: string, fn: () => T): T;
    reset(): void;
    /** 一行文本（黑匣子 / 探针用）。 */
    line(): string;
}
export declare const perf: PerfStats;

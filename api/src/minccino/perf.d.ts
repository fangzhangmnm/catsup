export interface PerfSink {
    /** 阶段名 → 最近一次耗时（ms）/ 读数。 */
    readonly last: Record<string, number>;
    /** 阶段名 → 累计次数。 */
    readonly count: Record<string, number>;
    time<T>(name: string, fn: () => T): T;
}
export declare const NOOP_PERF: PerfSink;

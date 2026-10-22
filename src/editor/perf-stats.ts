// perf-stats.ts —— 性能计数器（#14，2026-10-21，Claude Fable 5.1）：各阶段最近一次耗时，零开销到可以常开；探针 / 黑匣子读它。
// 先量后优（家规）：没有这张表就只能猜哪段慢。
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

export const perf: PerfStats = {
  last: {},
  count: {},
  time<T>(name: string, fn: () => T): T {
    const t0 = performance.now();
    try { return fn(); }
    finally { this.last[name] = performance.now() - t0; this.count[name] = (this.count[name] ?? 0) + 1; }
  },
  reset(): void { for (const k of Object.keys(this.last)) delete this.last[k]; for (const k of Object.keys(this.count)) delete this.count[k]; },
  line(): string { return Object.entries(this.last).map(([k, v]) => `${k}=${v.toFixed(1)}`).join(" "); },
};

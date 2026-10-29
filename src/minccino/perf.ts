// minccino/perf.ts —— 引擎的计时口（6c）：引擎不 import 编辑器的 perf-stats，消费方把自己的计数器递进来（结构同形：last / count / time），
// 不给 = 不计（NOOP）。血槽位（步 7）的 render.* 读数也从这个口写出去。created 2026-10-29 by Claude Fable 5.1
export interface PerfSink {
  /** 阶段名 → 最近一次耗时（ms）/ 读数。 */
  readonly last: Record<string, number>;
  /** 阶段名 → 累计次数。 */
  readonly count: Record<string, number>;
  time<T>(name: string, fn: () => T): T;
}

export const NOOP_PERF: PerfSink = { last: {}, count: {}, time: (_name, fn) => fn() };

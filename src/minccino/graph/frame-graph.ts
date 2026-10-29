// minccino/graph/frame-graph.ts —— frame graph 的规划器（骨架稿 v2 不变量 4：pass 只**声明**读什么写什么；每帧按「谁要什么产物」动态决定
// 哪些 pass 跑、按什么顺序；没人要的产物不产 = 省电池、Tron 不开时泛光那条 pass 根本不存在）。纯函数，零后端、零 DOM。
// created 2026-10-29 by Claude Fable 5.1（步 2 只有规划器；步 4 把现状的 draw call 声明成 pass）

export interface PassDecl {
  readonly id: string;
  /** 读哪些资源（别的 pass 写出来的，或外部给的输入）。 */
  readonly reads?: readonly string[];
  /** 写哪些资源。一个资源只准有一个写者（两个 = 声明错了，直接抛）。 */
  readonly writes: readonly string[];
}

export interface FramePlan {
  /** 要跑的 pass，依赖在前。 */
  readonly order: readonly string[];
  /** 声明了但这帧没人要的 pass（剪掉的）。 */
  readonly pruned: readonly string[];
}

/**
 * 从「这帧要哪些产物」反推要跑的 pass 并拓扑排序。
 * - 不在任何 pass 的 writes 里的资源 = 外部输入（流、视图），读它不需要跑谁。
 * - 环 = 抛（声明错了，不静默）。
 */
export function planFrame(passes: readonly PassDecl[], wanted: readonly string[]): FramePlan {
  const writer = new Map<string, PassDecl>();
  for (const p of passes) for (const r of p.writes) {
    const prev = writer.get(r);
    if (prev) throw new Error(`frame graph: resource "${r}" written by both "${prev.id}" and "${p.id}"`);
    writer.set(r, p);
  }
  const order: string[] = [], done = new Set<string>(), onStack = new Set<string>();
  const visit = (p: PassDecl): void => {
    if (done.has(p.id)) return;
    if (onStack.has(p.id)) throw new Error(`frame graph: cycle through "${p.id}"`);
    onStack.add(p.id);
    for (const r of p.reads ?? []) { const w = writer.get(r); if (w) visit(w); }
    onStack.delete(p.id); done.add(p.id); order.push(p.id);
  };
  for (const r of wanted) { const w = writer.get(r); if (w) visit(w); }
  const pruned = passes.filter((p) => !done.has(p.id)).map((p) => p.id);
  return { order, pruned };
}

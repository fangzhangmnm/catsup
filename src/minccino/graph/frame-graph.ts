// minccino/graph/frame-graph.ts —— frame graph 的规划器（骨架稿 v2 不变量 4：pass 只**声明**读什么写什么；每帧按「谁要什么产物」动态决定
// 哪些 pass 跑、按什么顺序；没人要的产物不产 = 省电池、Tron 不开时泛光那条 pass 根本不存在）。纯函数，零后端、零 DOM。
// created 2026-10-29 by Claude Fable 5.1（步 2 规划器；步 4 加「追加画」：几组东西往同一个目标上接着画——现状的膜 / 边、地面网格、叠加层、X 光
// 就是四组往一张画布上追加的 pass，后处理落地后叠加层仍是「追加到合成结果上」）

export interface PassDecl {
  readonly id: string;
  /** 读哪些资源（别的 pass 写出来的，或外部给的输入）。 */
  readonly reads?: readonly string[];
  /** 写哪些资源（从头产出）。一个资源只准有一个写者（两个 = 声明错了，直接抛）。 */
  readonly writes?: readonly string[];
  /** 往哪些已有资源上**追加画**（不清空）：排在那个资源的写者和声明顺序在前的追加者之后。要那个资源 = 写者 + 全部追加者都跑。 */
  readonly appends?: readonly string[];
}

export interface FramePlan {
  /** 要跑的 pass，依赖在前。 */
  readonly order: readonly string[];
  /** 声明了但这帧没人要的 pass（剪掉的）。 */
  readonly pruned: readonly string[];
}

/**
 * 从「这帧要哪些产物」反推要跑的 pass 并拓扑排序。
 * - 不在任何 pass 的 writes 里的资源 = 外部输入（流、视图、编辑器状态），读它不需要跑谁；往外部输入上追加也可以（目标 = 画布）。
 * - 环 = 抛（声明错了，不静默）。
 */
export function planFrame(passes: readonly PassDecl[], wanted: readonly string[]): FramePlan {
  const writer = new Map<string, PassDecl>(), appenders = new Map<string, PassDecl[]>();
  for (const p of passes) {
    for (const r of p.writes ?? []) {
      const prev = writer.get(r);
      if (prev) throw new Error(`frame graph: resource "${r}" written by both "${prev.id}" and "${p.id}"`);
      writer.set(r, p);
    }
    for (const r of p.appends ?? []) { let l = appenders.get(r); if (!l) { l = []; appenders.set(r, l); } l.push(p); }
  }
  const order: string[] = [], done = new Set<string>(), onStack = new Set<string>();
  const visit = (p: PassDecl): void => {
    if (done.has(p.id)) return;
    if (onStack.has(p.id)) throw new Error(`frame graph: cycle through "${p.id}"`);
    onStack.add(p.id);
    for (const r of p.reads ?? []) produce(r);
    for (const r of p.appends ?? []) {   // 追加者排在写者和前面的追加者之后
      const w = writer.get(r); if (w) visit(w);
      for (const a of appenders.get(r) ?? []) { if (a === p) break; visit(a); }
    }
    onStack.delete(p.id); done.add(p.id); order.push(p.id);
  };
  /** 要资源 r = 它的写者 + 它的全部追加者。 */
  const produce = (r: string): void => { const w = writer.get(r); if (w) visit(w); for (const a of appenders.get(r) ?? []) visit(a); };
  for (const r of wanted) produce(r);
  const pruned = passes.filter((p) => !done.has(p.id)).map((p) => p.id);
  return { order, pruned };
}

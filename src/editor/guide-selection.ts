// editor/guide-selection.ts —— 选中的参考几何（参考线 / 参考点 / 参考圆 / 参考球的 id）。created 2026-11-09 by Claude Opus 5.5（计划书 `ai-docs/20261109-audit-fixes-plan.md` 工单 1）
// user 10-24 深夜：「我设计方案：编辑器单独维护一份「选中参考几何id」集合，不混入内核实体的选区类型，避免影响其他消费方」。
// 所以选区类型（tools.ts Selection）里只有内核的点 / 边 / 面；选中的参考几何只住这里，由编辑器持有（和「选中的组 / 组件」那份并排）。
// 不变量：这里的每个 id 都是活动池里一条还在的参考几何——编辑器每次换场景之后 prune（橡皮、「清空参考几何」、撤销、换池都兜住）。
// 纯数据 + 小函数，不 import 编辑器本体；src/ 里除了它和 editor.ts 没人直接读写这份（守卫 test/guide-selection.test.ts）。
import type { Guides } from "../scene/guides.ts";
import { type SelMode, mergeSel } from "./tools.ts";

export class GuideSelection {
  private readonly ids = new Set<number>();
  get size(): number { return this.ids.size; }
  /** 只读视图（画高亮、删除时取 id）。 */
  get view(): ReadonlySet<number> { return this.ids; }
  merge(ids: Iterable<number>, mode: SelMode, perItem = false): void { mergeSel(this.ids, ids, mode, perItem); }
  clear(): void { this.ids.clear(); }
  /** 只留 g 里还在的 id（g = 活动池的参考几何；网格体没有参考几何 = 全清）。 */
  prune(g: Guides): void {
    if (!this.ids.size) return;
    const alive = new Set<number>();
    for (const x of [...g.lines, ...g.points, ...g.circles, ...g.spheres]) alive.add(x.id);
    for (const id of [...this.ids]) if (!alive.has(id)) this.ids.delete(id);
  }
  snapshot(): number[] { return [...this.ids]; }
  restore(ids: readonly number[]): void { this.ids.clear(); for (const x of ids) this.ids.add(x); }
}

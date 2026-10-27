// repairs/weld.ts —— 修复「焊接断口」（纪元排期 T7 / 账本 DT5）：共线、只连两段的点（断口）并掉，两段边变一条。
// 2026-10-26 Claude Opus 5.5 从 editor.ts 搬成模块（user「做成可以扔的模块化的」）；执行走核心指令 dissolveVertices。
import type { VertexId } from "../../kernel/kernel.ts";
import { moveTargetsSelection } from "../tools.ts";
import type { Command, PoolUnit } from "../commands/command.ts";

export const weld: Command<PoolUnit> = {
  id: "brep.weld", unit: "brep",
  title: "焊接断口",
  defaults: () => ({}),
  params: () => [],
  plan(ctx, { at, sel }) {
    const k = ctx.scene.kernelOf(at);
    const cand = sel ? new Set(moveTargetsSelection(k, sel)) : k.vertices().map((x) => x.id);
    const ids: VertexId[] = [];
    for (const vid of cand) { const x = k.graph.hasVertex(vid) ? k.graph.vertex(vid) : null; if (x && x.edges.size === 2 && k.isBreakJunction(vid)) ids.push(vid); }
    return ids.length ? { ops: [{ op: "dissolveVertices", at, points: ids.map((x) => k.graph.pt(x)) }], count: ids.length } : { ops: [], count: 0 };
  },
  done: (n) => `焊了 ${n} 处断口`,
  none: "没有断口（共线、只连两段的点）",
};

// repairs/soften.ts —— 修复「软化弯折小的边（平滑组）」：弯折 ≤ deg 还是硬的边 → 软 + 平滑。和 harden.ts 对称。
// 2026-10-30 Claude Opus 5.5：从 ☰「模型」页搬进修复面板（user 10-30「这一栏里面几乎所有的东西都不应跟出现在这里吧。前三个是修复，整理好」）。
// 范围同别的修复：有选区 = 选中的边 / 面的边，没选 = 这一层全部；执行走核心指令 setEdgeLayers（一步撤销）。
import type { EdgeId } from "../../kernel/kernel.ts";
import { edgeKey } from "../ops.ts";
import type { Command, PoolUnit } from "../commands/command.ts";

export const soften: Command<PoolUnit> = {
  id: "brep.soften", unit: "brep",
  title: "软化弯折小的边（平滑组）",
  defaults: () => ({ deg: 20 }),
  params: () => [{ key: "deg", def: { kind: "number", label: "弯折不超过", min: 1, max: 89, step: 1, unit: "°" } }],
  plan(ctx, { at, sel }, v) {
    const k = ctx.scene.kernelOf(at), deg = Number(v.deg) || 20;
    const pool = new Set<EdgeId>();
    if (sel) { for (const e of sel.edges) pool.add(e); for (const f of sel.faces) { const F = k.face(f); if (F) for (const r of [F.outer, ...F.holes]) for (const d of r.edges) pool.add(d.edge); } }
    else for (const e of k.edges()) pool.add(e.id);
    const hit = [...pool].filter((e) => { if (!k.graph.hasEdge(e) || k.isSoft(e)) return false; const b = k.bendDeg(e); return b !== null && b > 1e-9 && b <= deg + 1e-9; });
    return hit.length ? { ops: [{ op: "setEdgeLayers", at, edges: hit.map((e) => edgeKey(k, e)), layers: ["soft", "smooth"], on: true }], count: hit.length } : { ops: [], count: 0 };
  },
  done: (n) => `软化了 ${n} 条弯折小的边`,
  none: "没有弯折小、还是硬的边",
};

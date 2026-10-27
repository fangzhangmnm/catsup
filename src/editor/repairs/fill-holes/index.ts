// repairs/fill-holes —— 修复「补洞」（DT103）：规划在 plan.ts；执行 = 核心指令 addEdges（沿环重描一遍，结算机给没主的胞腔长面）。created 2026-10-26 by Claude Opus 5.5
import type { EdgeId } from "../../../kernel/kernel.ts";
import type { RepairModule } from "../repair.ts";
import { planHoles } from "./plan.ts";

export const fillHoles: RepairModule = {
  id: "fillHoles",
  title: "补洞",
  // 默认不勾：开口有时是故意的（看得见里面的房间、花盆、杯子）
  panel: { on: false, label: () => "补洞（没封口的平面开口补上面）" },
  defaults: () => ({}),
  fields: () => [],
  plan(ctx, { at, sel }) {
    const k = ctx.scene.kernelOf(at);
    let scope: Set<EdgeId> | null = null;
    if (sel) { scope = new Set(sel.edges); for (const f of sel.faces) { const F = k.face(f); if (F) for (const r of [F.outer, ...F.holes]) for (const d of r.edges) scope.add(d.edge); } if (!scope.size) return { ops: [], count: 0 }; }
    const plan = planHoles(k, scope);
    if (!plan.loops.length) return { ops: [], count: 0, skipped: plan.skipped };
    const segs = plan.loops.flatMap((pts) => pts.map((p, i) => [p, pts[(i + 1) % pts.length]] as [typeof p, typeof p]));
    return { ops: [{ op: "addEdges", at, segs }], count: plan.loops.length, skipped: plan.skipped };
  },
  done: (n) => `补了 ${n} 个洞`,
  none: "没有没封口的平面开口（平板上挖的洞是故意的，不补）",
  skippedText: (n) => `${n} 个开口不在一个平面上或者缠在一起，没补`,
  menu: { icon: "fill-hole", label: (n) => `补洞…（${n} 个）` },
};

// repairs/cleanup —— 修复「清理碎渣」（DT102）：规划在 plan.ts；插件指令 "cleanup" 执行时按顺序再规划（① 擦悬空线 → ② 并短边 → ③ 擦同平面内线），
// 前一步挪了点、后一步照新样子算。created 2026-10-26 by Claude Opus 5.5
import type { EdgeId, FaceEvent } from "../../../kernel/kernel.ts";
import { OpTargetError, edgeKey, poolOf, registerOpPlugin, resolveEdge, type EdgeKey } from "../../ops.ts";
import type { Command, PoolUnit } from "../../commands/command.ts";
import { coplanarInnerEdges, strayEdges, tinyEdgeMoves, type EdgeScope } from "./plan.ts";

interface CleanupArgs { edges: EdgeKey[]; stray: boolean; tinyLen: number; coplanar: boolean; /** 同平面并面时看不见的软边也算。缺 = 否。 */ softToo?: boolean }

registerOpPlugin("cleanup", {
  apply(s, at, a0) {
    const a = a0 as unknown as CleanupArgs, { kernel } = poolOf(s, at);
    let scope: Set<EdgeId> | null = null;
    if (a.edges.length) { scope = new Set(); for (const e of a.edges) { try { scope.add(resolveEdge(kernel, e)); } catch { /* 已经不在了 */ } } }
    const events: FaceEvent[] = [];
    if (a.stray) { const ids = strayEdges(kernel, scope); if (ids.length) events.push(...kernel.eraseEdges(ids)); }
    if (a.tinyLen > 0) {
      const live: EdgeScope = scope ? new Set([...scope].filter((e) => kernel.graph.hasEdge(e))) : null;
      const { moves } = tinyEdgeMoves(kernel, live, a.tinyLen);
      // 先在拷贝上试：会把面弄破就不并（报错整步撤回比悄悄破面好；这一条单独关掉再跑就行）
      if (moves.length) {
        if (kernel.clone().moveVertices(moves).some((e) => e.type === "BURST")) throw new OpTargetError("清理碎渣：并掉很短的边会让面破掉——这一步已撤回；把「很短的边」关掉再试，或者导出复现包");
        events.push(...kernel.moveVertices(moves));
      }
    }
    if (a.coplanar) {
      const live: EdgeScope = scope ? new Set([...scope].filter((e) => kernel.graph.hasEdge(e))) : null;
      const ids = coplanarInnerEdges(kernel, live, { soft: !!a.softToo });
      if (ids.length) events.push(...kernel.eraseEdges(ids));
    }
    return { scene: s, events };
  },
  describe: (a0) => { const a = a0 as unknown as CleanupArgs; return `${a.edges.length ? `sel=${a.edges.length}` : "all"}${a.stray ? " stray" : ""}${a.tinyLen > 0 ? ` tiny<${a.tinyLen}` : ""}${a.coplanar ? ` coplanar${a.softToo ? "+soft" : ""}` : ""}`; },
});

/** 「很短的边」打开时的建议门槛（量纲：米）；默认不打开（AI 定的默认，user 没拍：三角网上并短边容易破面）。 */
const TINY_LEN = 0.001;

export const cleanup: Command<PoolUnit> = {
  id: "brep.cleanup", unit: "brep",
  title: "清理碎渣",
  defaults: () => ({ stray: true, tinyMm: 0, coplanar: true, softToo: true }),
  params: () => [
    { key: "stray", def: { kind: "bool", label: "悬空的线（一张面都没挂的边）擦掉" } },
    { key: "tinyMm", def: { kind: "number", label: `短于这么长的边并成一个点（0 = 不并；默认不并是因为三角网上并短边容易把面弄破，会破就整步撤回；建议 ${TINY_LEN * 1000}）`, min: 0, max: 50, step: 0.1, unit: "mm" } },
    { key: "coplanar", def: { kind: "bool", label: "同一平面上被线切碎的面并回去（两边材质一样才并；画在面上的线框也算）" } },
    { key: "softToo", def: { kind: "bool", label: "连看不见的软边也并（导入的三角网里很多；大物体上会先问你，因为现在擦线很慢）" } },
  ],
  plan(ctx, { at, sel }, v) {
    const k = ctx.scene.kernelOf(at);
    let scope: Set<EdgeId> | null = null;
    if (sel) { scope = new Set(sel.edges); for (const f of sel.faces) { const F = k.face(f); if (F) for (const r of [F.outer, ...F.holes]) for (const d of r.edges) scope.add(d.edge); } if (!scope.size) return { ops: [], count: 0 }; }
    const stray = v.stray !== false, coplanar = v.coplanar !== false, softToo = v.softToo !== false, tinyLen = Math.max(0, Number(v.tinyMm ?? 0)) / 1000;
    const nStray = stray ? strayEdges(k, scope).length : 0, nTiny = tinyLen > 0 ? tinyEdgeMoves(k, scope, tinyLen).clusters : 0, nCop = coplanar ? coplanarInnerEdges(k, scope, { soft: softToo }).length : 0;
    const count = nStray + nTiny + nCop;
    if (!count) return { ops: [], count: 0 };
    const args: CleanupArgs = { edges: scope ? [...scope].filter((e) => k.graph.hasEdge(e)).map((e) => edgeKey(k, e)) : [], stray, tinyLen, coplanar, ...(softToo ? { softToo } : {}) };
    return { ops: [{ op: "plugin", name: "cleanup", at, args: args as unknown as Record<string, unknown> }], count, extra: nCop, erases: nCop };
  },
  done: (n, e) => `清理了 ${n} 处碎渣${e ? `（其中 ${e} 条同一平面上的内线）` : ""}`,
  none: "没有碎渣（悬空的线、很短的边、同一平面切碎的面都没有）",
};

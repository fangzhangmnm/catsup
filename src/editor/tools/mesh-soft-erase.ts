// tools/mesh-soft-erase.ts —— 自由建模的「软边橡皮」（网格体；和硬表面同一个工具 id softErase、同一组选项、同一个键）。created 2026-10-29 by Claude Opus 5.5
// user 10-29「软边橡皮或者说硬边软边切换，现在自由建模蛮需要的」；10-26「软边橡皮快捷键和马前炮可以变成相反操作（就是标记硬边）」。
// 按住拖 = 刮过的边都算，松手一次标完（一步撤销）：软化 = 手标平滑（明暗连续、不画线），硬化 = 手标棱（选项「硬化」XOR 按住 Shift）。
// 只认恰好挨两张面的边（边界 / 非流形本来就是棱，标了也没意义）；已经是这个样子的边不算。和硬表面那把的不同：网格体的边是拓扑，共面也不删边；
// 「最大角度」不管（低模角色的平滑边常常折得比 20° 狠，user 要的就是把它们标平滑）——选项条在自由建模里藏掉那一项。
// 悬停不高亮（FM113，同删除）；刮的时候预演就是标完以后的样子（软边变淡线 / 棱变实线）。
import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { edgeSmooth, edgeSoft, markEdges } from "../../mesh/edge-smooth.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

export class MeshSoftEraseTool implements ToolHandler {
  readonly tool = "softErase" as const;
  readonly grammar = "direct" as const;
  private acc: Set<number> | null = null;
  private harden = false;

  active(): boolean { return this.acc !== null; }
  cancel(): void { this.acc = null; this.harden = false; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshSoftErase: this.acc ? { edges: this.acc.size, harden: this.harden } : null }; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.acc = new Set();
    this.harden = (ctx.config.get("softErase", "action") === "harden") !== !!ev.shiftKey;
    this.collect(ctx, ev);
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { this.collect(ctx, s); }
  private collect(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (!this.acc) return;
    const c = ctx.classify(ctx.world(), ctx.pickStatic(s.x, s.y));
    if (c.kind === "entity" && c.local.edge !== undefined) this.acc.add(c.local.edge);
  }
  /** 刮集里真会变的边：恰好挨两张面、现在的样子和要标的不一样。 */
  private changing(m: MeshKernel): number[] {
    const out: number[] = [];
    for (const e of this.acc ?? []) {
      if (!m.hasE(e) || m.eFaces(e).length !== 2) continue;
      const smooth = edgeSmooth(m, e) && edgeSoft(m, e);
      if (this.harden ? (edgeSmooth(m, e) || edgeSoft(m, e)) : !smooth) out.push(e);
    }
    return out.sort((a, b) => a - b);
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const verb = this.harden ? "硬化" : "软化";
    if (!this.acc || !this.acc.size) return `${verb}：刮过要${this.harden ? "变成棱" : "变平滑"}的边${this.harden ? "" : "（按住 Shift = 硬化）"}`;
    const es = this.changing(ctx.mesh()), mark = this.harden ? "sharp" : "smooth";
    if (es.length) run((m) => { markEdges(m, es, mark); });
    return `${verb} ${es.length} 条边`;
  }

  up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void {
    const harden = this.harden, n = this.acc?.size ?? 0, es = this.changing(ctx.mesh());
    this.cancel();
    if (!n) return;
    if (!es.length) { ctx.hint(harden ? "硬化：刮过的边本来就是棱（或者是边界）" : "软化：刮过的边本来就平滑（边界 / 只挨一张面的边不能平滑）"); return; }
    ctx.commitOp({ op: "meshEdgeMarks", def: ctx.activePool().def, edges: es, mark: harden ? "sharp" : "smooth" });
    ctx.hint(`${harden ? "硬化" : "软化"}了 ${es.length} 条边${harden ? "（手标棱）" : "（手标平滑）"}`);
  }
}

// tools/scrub.ts —— 刮边工具的底座（direct 语法：按住拖 = 刮过的边都进刮集，抬笔结算一次）。橡皮家族三把共用：橡皮 / 焊边橡皮 / 软边橡皮。
// 子类只管两件事：刮集高亮按不按曲线连坐（wholeCurve）、抬笔拿着刮集做什么（commit）。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { EdgeId, FaceEvent } from "../../kernel/kernel.ts";
import type { WorldView } from "../../scene/world-view.ts";
import type { ToolPointer } from "../editor.ts";
import type { Tool } from "../tool-ids.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";

export abstract class EdgeScrubTool implements ToolHandler {
  abstract readonly tool: Tool;
  readonly grammar = "direct" as const;
  /** 高亮是否整条曲线连坐（橡皮 / 焊边：是——擦 / 焊一段 = 整条；软边：否——一条边一个二面角）。 */
  protected abstract readonly wholeCurve: boolean;
  protected scrubbing = false;
  protected acc = new Set<EdgeId>();          // 刮过的边（活动池本地 id）
  protected hoverEdge: EdgeId | null = null;  // 悬停高亮（无手势时）

  active(): boolean { return this.scrubbing; }
  cancel(): void { this.scrubbing = false; this.acc = new Set(); this.hoverEdge = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    const view = ctx.live();
    const c = ctx.classify(view, ctx.pick(s.x, s.y, { soft: this.pickSoft(ctx) }));
    this.hoverEdge = c.kind === "entity" ? (c.local.edge ?? null) : null;
    ctx.setHoverEdge(this.hoverEdge);
  }
  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.scrubbing = true;
    this.acc = new Set();
    this.hoverEdge = null; ctx.setHoverEdge(null);
    this.begin(ctx, ev);
    this.scrubAt(ctx, ctx.live(), ev.x, ev.y);
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { this.scrubAt(ctx, ctx.live(), s.x, s.y); }
  up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void {
    const ids = [...this.acc];
    this.cancel();
    this.commit(ctx, ids);
  }
  /** 刮集（+ 悬停边）高亮；wholeCurve 时整条曲线一起亮。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    const view = ctx.live(), k = ctx.kernel();
    const local = [...this.acc, ...(this.hoverEdge !== null ? [this.hoverEdge] : [])];
    const whole = new Set<EdgeId>();
    for (const e of local) {
      whole.add(e);
      if (!this.wholeCurve) continue;
      const cid = k.graph.hasEdge(e) ? k.curveOf(e) : undefined;
      if (cid !== undefined) for (const x of k.curveById(cid)!.edges) if (k.graph.hasEdge(x)) whole.add(x);
    }
    return { scrubEdges: new Set([...whole].map((e) => view.global(e))) };
  }

  /** 按下那一刻（子类读修饰键 / 出提示）。 */
  protected begin(_ctx: ToolCtx, _ev: ToolPointer): void {}
  /** 这一刮要不要也拾软边（硬化的时候要：软边平时点不中，不然永远硬化不了）。 */
  protected pickSoft(_ctx: ToolCtx): boolean { return false; }
  protected scrubAt(ctx: ToolCtx, view: WorldView, sx: number, sy: number): void {
    const c = ctx.classify(view, ctx.pick(sx, sy, { soft: this.pickSoft(ctx) }));
    if (c.kind === "entity" && c.local.edge !== undefined) this.acc.add(c.local.edge);
  }
  /** 抬笔：拿着刮集做事（提交 op、出提示）。 */
  protected abstract commit(ctx: ToolCtx, ids: EdgeId[]): void;
}

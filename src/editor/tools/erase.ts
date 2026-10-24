// tools/erase.ts —— 橡皮（SU Eraser）的手势模块：direct 语法（按住拖 = 刮过的都进刮集；user「erase和bucket不是还有按住拖多选这个语法嘛」）。
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）：刮边（擦一段 = 整条曲线，高亮也整条）+ 刮参考线 / 参考点（D18）；
// 修饰：Ctrl = 软化 + 平滑、Shift = 硬化（只碰恰好两膜的边，SU 同款）。悬停高亮光标下的边。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { EdgeId, FaceEvent } from "../../kernel/kernel.ts";
import type { WorldView } from "../../scene/world-view.ts";
import { edgeKey } from "../ops.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { pickGuide, withoutGuides } from "../guide-pick.ts";

type Mode = "erase" | "soften" | "harden";

export class EraseTool implements ToolHandler {
  readonly tool = "erase" as const;
  readonly grammar = "direct" as const;
  private scrubbing = false;
  private acc = new Set<EdgeId>();          // 刮过的边（活动池本地 id）
  private guides = new Set<number>();       // 刮过的参考线 / 参考点 id（活动池的）
  private mode: Mode = "erase";
  private hoverEdge: EdgeId | null = null;  // 悬停高亮（无手势时）

  active(): boolean { return this.scrubbing; }
  cancel(): void { this.scrubbing = false; this.acc = new Set(); this.guides = new Set(); this.hoverEdge = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    const view = ctx.live();
    const c = ctx.classify(view, ctx.pick(s.x, s.y));
    this.hoverEdge = c.kind === "entity" ? (c.local.edge ?? null) : null;
    ctx.setHoverEdge(this.hoverEdge);
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.scrubbing = true;
    this.acc = new Set(); this.guides = new Set();
    this.hoverEdge = null; ctx.setHoverEdge(null);
    this.mode = ev.copy ? "soften" : ev.shiftKey ? "harden" : "erase";
    ctx.hint(this.mode === "soften" ? "软化：刮过的边变软 + 平滑（Ctrl）" : this.mode === "harden" ? "硬化：刮过的边变硬（Shift）" : null);
    this.scrubAt(ctx, ctx.live(), ev.x, ev.y);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void { this.scrubAt(ctx, ctx.live(), s.x, s.y); }

  up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void {
    const ids = [...this.acc], gids = [...this.guides], mode = this.mode;
    this.cancel();
    const k = ctx.kernel(), at = ctx.activePool();
    if (mode === "erase" && gids.length) ctx.commitOp({ op: "eraseGuides", at, ids: gids });   // D18：刮过的参考线 / 参考点一起擦
    if (mode !== "erase") { ctx.softenEdges(ids.filter((id) => k.graph.hasEdge(id) && k.graph.edge(id).faceLinks.length >= 2), mode === "soften"); return; }
    const edges = ids.filter((id) => k.graph.hasEdge(id)).map((id) => edgeKey(k, id));
    if (edges.length) ctx.commitOp({ op: "eraseEdges", at, edges });
  }

  /** 刮集高亮（擦一段 = 整条曲线）+ 刮过的参考几何先从画面消失。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    const view = ctx.live(), k = ctx.kernel();
    const local = [...this.acc, ...(this.hoverEdge !== null ? [this.hoverEdge] : [])];
    const whole = new Set<EdgeId>();
    for (const e of local) { whole.add(e); const cid = k.graph.hasEdge(e) ? k.curveOf(e) : undefined; if (cid !== undefined) for (const x of k.curveById(cid)!.edges) if (k.graph.hasEdge(x)) whole.add(x); }
    return { scrubEdges: new Set([...whole].map((e) => view.global(e))), ...(this.guides.size ? { guides: withoutGuides(view.guides(), this.guides) } : {}) };
  }

  private scrubAt(ctx: ToolCtx, view: WorldView, sx: number, sy: number): void {
    const c = ctx.classify(view, ctx.pick(sx, sy));
    if (c.kind === "entity" && c.local.edge !== undefined) this.acc.add(c.local.edge);
    const g = pickGuide(view.guides(), ctx.frame(), ctx.vp(), sx, sy, ctx.eps().hit);
    if (g) this.guides.add(g.id);
  }
}

// tools/erase.ts —— 橡皮（SU Eraser）：direct 语法（按住拖 = 刮过的都进刮集；user「erase和bucket不是还有按住拖多选这个语法嘛」）。
// 刮边（擦一段 = 整条曲线，高亮也整条）+ 刮参考线 / 参考点（D18）；修饰：Ctrl = 软化 + 平滑、Shift = 硬化（只碰恰好两膜的边，SU 同款）。
// 底座 = scrub.ts（橡皮家族共用；焊边 / 软边橡皮是同一底座的另两把）。created 2026-10-24 by Claude Fable 5.1
import type { EdgeId } from "../../kernel/kernel.ts";
import type { WorldView } from "../../scene/world-view.ts";
import { edgeKey } from "../ops.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { pickGuide, withoutGuides } from "../guide-pick.ts";
import { EdgeScrubTool } from "./scrub.ts";

type Mode = "erase" | "soften" | "harden";

export class EraseTool extends EdgeScrubTool {
  readonly tool = "erase" as const;
  protected readonly wholeCurve = true;
  private guides = new Set<number>();       // 刮过的参考线 / 参考点 id（活动池的）
  private mode: Mode = "erase";

  override cancel(): void { super.cancel(); this.guides = new Set(); }
  protected override begin(ctx: ToolCtx, ev: ToolPointer): void {
    this.guides = new Set();
    this.mode = ev.copy ? "soften" : ev.shiftKey ? "harden" : "erase";
    ctx.hint(this.mode === "soften" ? "软化：刮过的边变软 + 平滑（Ctrl）" : this.mode === "harden" ? "硬化：刮过的边变硬（Shift）" : null);
  }
  protected override scrubAt(ctx: ToolCtx, view: WorldView, sx: number, sy: number): void {
    super.scrubAt(ctx, view, sx, sy);
    const g = pickGuide(view.guides(), ctx.frame(), ctx.vp(), sx, sy, ctx.eps().hit);
    if (g) this.guides.add(g.id);
  }
  protected commit(ctx: ToolCtx, ids: EdgeId[]): void {
    const gids = [...this.guides], mode = this.mode;
    this.guides = new Set();
    const k = ctx.kernel(), at = ctx.activePool();
    if (mode === "erase" && gids.length) ctx.commitOp({ op: "eraseGuides", at, ids: gids });   // D18：刮过的参考线 / 参考点一起擦
    if (mode !== "erase") { ctx.softenEdges(ids.filter((id) => k.graph.hasEdge(id) && k.graph.edge(id).faceLinks.length >= 2), mode === "soften"); return; }
    const edges = ids.filter((id) => k.graph.hasEdge(id)).map((id) => edgeKey(k, id));
    if (edges.length) ctx.commitOp({ op: "eraseEdges", at, edges });
  }
  /** 刮集高亮 + 刮过的参考几何先从画面消失。 */
  override viewExtras(ctx: ToolCtx): Partial<ViewState> {
    return { ...super.viewExtras(ctx), ...(this.guides.size ? { guides: withoutGuides(ctx.live().guides(), this.guides) } : {}) };
  }
}

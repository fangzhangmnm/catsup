// tools/erase.ts —— 橡皮（SU Eraser）：direct 语法（按住拖 = 刮过的都进刮集；user「erase和bucket不是还有按住拖多选这个语法嘛」）。
// 刮边（擦一段 = 整条曲线，高亮也整条）+ 刮参考线 / 参考点（D18）；修饰：Ctrl = 软化 + 平滑、Shift = 硬化（只碰恰好两膜的边，SU 同款）。
// 底座 = scrub.ts（橡皮家族共用；焊边 / 软边橡皮是同一底座的另两把）。created 2026-10-24 by Claude Fable 5.1
import type { EdgeId } from "../../kernel/kernel.ts";
import type { WorldView } from "../../scene/world-view.ts";
import { edgeKey } from "../ops.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { pickGuide, withoutGuides } from "../guide-pick.ts";
import { EdgeScrubTool } from "./scrub.ts";

type Mode = "erase" | "soften" | "harden";

export class EraseTool extends EdgeScrubTool {
  readonly tool = "erase" as const;
  protected readonly wholeCurve = true;
  private guides = new Set<number>();       // 刮过的参考线 / 参考点 id（活动池的）
  private toErase: number[] = [];           // 抬笔那一刻拿出来的参考几何单子（底座 up 先 cancel 再 commit，cancel 会清 guides）
  private mode: Mode = "erase";

  override cancel(): void { super.cancel(); this.guides = new Set(); }
  protected override begin(ctx: ToolCtx, ev: ToolPointer): void {
    this.guides = new Set();
    this.mode = ev.copy ? "soften" : ev.shiftKey ? "harden" : "erase";
    ctx.hint(this.mode === "soften" ? "软化：刮过的边变软 + 平滑（Ctrl）" : this.mode === "harden" ? "硬化：刮过的边变硬（Shift）" : null);
  }
  protected override pickSoft(): boolean { return this.scrubbing && this.mode === "harden"; }   // Shift 硬化要碰得到软边
  protected override scrubAt(ctx: ToolCtx, view: WorldView, sx: number, sy: number): void {
    super.scrubAt(ctx, view, sx, sy);
    const g = pickGuide(view.guides(), ctx.frame(), ctx.vp(), sx, sy, ctx.eps().hit);
    if (g) this.guides.add(g.id);
  }
  /** 抬笔：先把刮过的参考几何单子拿出来——底座的 up 是「先 cancel 再 commit」，cancel 会把 guides 清空。
   *  （v0.13.16 搬进橡皮家族共用底座时这里读的是已经清空的 guides = 参考线 / 参考点从此擦不掉；user 2026-10-25「bug：橡皮擦不了辅助线了」。探针 probe-erase-guides。） */
  override up(ctx: ToolCtx, ev: ToolPointer, settle: () => ToolSample | null): void {
    this.toErase = [...this.guides];
    super.up(ctx, ev, settle);
  }
  protected commit(ctx: ToolCtx, ids: EdgeId[]): void {
    const gids = this.toErase, mode = this.mode;
    this.toErase = [];
    const k = ctx.kernel(), at = ctx.activePool();
    if (mode === "erase" && gids.length) ctx.commitOp({ op: "eraseGuides", at, ids: gids });   // D18：刮过的参考线 / 参考点一起擦
    if (mode !== "erase") { ctx.softenEdges(ids.filter((id) => k.graph.hasEdge(id) && k.graph.edge(id).faceLinks.length >= 2), mode === "soften"); return; }
    const live = ids.filter((id) => k.graph.hasEdge(id));
    if (ctx.workflow().eraseNonCoplanar === "fold") {   // Blender 亚种（DT87）：不共面两膜之间的边变折线，别的照常擦，非流形不碰
      const plan = k.foldPlan(live);
      const foldKeys = plan.fold.map((id) => edgeKey(k, id)), eraseKeys = plan.erase.map((id) => edgeKey(k, id));   // 先取键：提交会改图
      if (foldKeys.length) ctx.commitOp({ op: "setEdgeLayers", at, edges: foldKeys, layers: ["fold"], on: true });
      if (eraseKeys.length) ctx.commitOp({ op: "eraseEdges", at, edges: eraseKeys });
      if (plan.refuse.length) ctx.hint(`${plan.refuse.length} 条边连着三张以上的面：这种擦法不擦（擦了会破面）——先拆开再擦`);
      else if (foldKeys.length) ctx.hint(`${foldKeys.length} 条边变成了折线（两边算一个面）${eraseKeys.length ? `，擦掉 ${eraseKeys.length} 条` : ""}`);
      return;
    }
    const edges = live.map((id) => edgeKey(k, id));
    if (edges.length) ctx.commitOp({ op: "eraseEdges", at, edges });
  }
  /** 刮集高亮 + 刮过的参考几何先从画面消失。 */
  override viewExtras(ctx: ToolCtx): Partial<ViewState> {
    return { ...super.viewExtras(ctx), ...(this.guides.size ? { guides: withoutGuides(ctx.live().guides(), this.guides) } : {}) };
  }
}

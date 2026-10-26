// tools/weld-erase.ts —— 焊边橡皮（AI 命名；user 2026-10-24「一个是边的焊接，只认边之间的点，可weld，有一个最大角度护栏……共轴就变成一个边，
// 如果不共轴，但在角度护栏内，那么拼成长弧线」「对焊接只认degree2同意」）。刮过两条相邻的边 → 它们之间的接点：共轴 → 真合并（dissolveVertices），
// 转角 ≤ 最大角度 → 焊成一条曲线（weldEdges），更尖 → 不碰。一刮 = 一个 batch（一次撤销）。规划在 erase-plans.ts。created 2026-10-24 by Claude Fable 5.1
import type { EdgeId } from "../../kernel/kernel.ts";
import { type Op, edgeKey } from "../ops.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ToolPointer } from "../editor.ts";
import { planWeldErase } from "../erase-plans.ts";
import { EdgeScrubTool } from "./scrub.ts";

export class WeldEraseTool extends EdgeScrubTool {
  readonly tool = "weldErase" as const;
  protected readonly wholeCurve = true;
  /** 这一刮是拆开（选项「拆开」XOR 按住 Shift；user 10-26「焊边也一样」）。 */
  private split = false;
  protected override begin(ctx: ToolCtx, ev: ToolPointer): void {
    this.split = (ctx.config.get("weldErase", "action") === "split") !== !!ev.shiftKey;
    if (this.split) ctx.hint("拆开：刮过的曲线拆回一段段");
  }
  protected commit(ctx: ToolCtx, ids: EdgeId[]): void {
    if (!ids.length) return;
    const k = ctx.kernel(), at = ctx.activePool(), maxDeg = ctx.config.get("weldErase", "maxDeg");
    if (this.split) {
      const inCurve = ids.filter((e) => k.graph.hasEdge(e) && k.curveOf(e) !== undefined);
      if (!inCurve.length) { ctx.hint("拆开：刮过的边不在曲线里"); return; }
      const n = new Set(inCurve.map((e) => k.curveOf(e))).size;
      ctx.commitOp({ op: "explodeCurves", at, edges: inCurve.map((e) => edgeKey(k, e)) });
      ctx.hint(`拆开了 ${n} 条曲线`);
      return;
    }
    const plan = planWeldErase(k, ids, maxDeg);
    const ops: Op[] = [];
    if (plan.dissolve.length) ops.push({ op: "dissolveVertices", at, points: plan.dissolve });
    for (const edges of plan.welds) ops.push({ op: "weldEdges", at, edges });
    const sharp = plan.tooSharp ? `；${plan.tooSharp} 处转角超过 ${maxDeg}°，没碰` : "";
    if (!ops.length) { ctx.hint(plan.tooSharp ? `焊边：${plan.tooSharp} 处转角都超过 ${maxDeg}°，没碰（选项条可调）` : "焊边：刮过两条相邻的边，它们之间的接点才会焊"); return; }
    ctx.commitOp(ops.length === 1 ? ops[0] : { op: "batch", label: "weldErase", ops });
    const parts = [plan.dissolve.length ? `并了 ${plan.dissolve.length} 处共轴接点` : "", plan.welds.length ? `焊了 ${plan.welds.length} 条链` : ""].filter(Boolean);
    ctx.hint(`焊边：${parts.join("、")}${sharp}`);
  }
}

// tools/soft-erase.ts —— 软边橡皮（user 2026-10-24「第三个橡皮是把面连成曲面的，原理一样。共面就删边，不共面就改软边，叫软边橡皮」）。
// 刮过两膜之间的边：共面 → 删边并面（eraseEdges），二面角 ≤ 最大角度 → 软边 + 平滑（setEdgeLayers），更尖 → 不碰。一刮 = 一个 batch。
// 不按曲线连坐（一条边一个二面角）。规划在 erase-plans.ts。created 2026-10-24 by Claude Fable 5.1
import type { EdgeId } from "../../kernel/kernel.ts";
import { type Op, edgeKey } from "../ops.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { ToolPointer } from "../editor.ts";
import { planSoftErase } from "../erase-plans.ts";
import { EdgeScrubTool } from "./scrub.ts";

export class SoftEraseTool extends EdgeScrubTool {
  readonly tool = "softErase" as const;
  protected readonly wholeCurve = false;
  /** 这一刮是硬化（选项「硬化」XOR 按住 Shift；user 10-26「快捷键和马前炮可以变成相反操作（就是标记硬边）」）。 */
  private harden = false;
  protected override begin(ctx: ToolCtx, ev: ToolPointer): void {
    this.harden = (ctx.config.get("softErase", "action") === "harden") !== !!ev.shiftKey;
    if (this.harden) ctx.hint("硬化：刮过的边变硬（= 标记硬边）");
  }
  /** 硬化时软边也要拾得到；没按下时按选项看（悬停高亮）。 */
  protected override pickSoft(ctx: ToolCtx): boolean { return this.scrubbing ? this.harden : ctx.config.get("softErase", "action") === "harden"; }
  protected commit(ctx: ToolCtx, ids: EdgeId[]): void {
    if (!ids.length) return;
    const k = ctx.kernel(), at = ctx.activePool(), maxDeg = ctx.config.get("softErase", "maxDeg");
    if (this.harden) {
      const hard = ids.filter((e) => k.graph.hasEdge(e) && (k.isSoft(e) || k.isSmooth(e)));
      if (!hard.length) { ctx.hint("硬化：刮过的边本来就是硬的"); return; }
      ctx.commitOp({ op: "setEdgeLayers", at, edges: hard.map((e) => edgeKey(k, e)), layers: ["soft", "smooth"], on: false });
      ctx.hint(`硬化了 ${hard.length} 条边`);
      return;
    }
    const plan = planSoftErase(k, ids, maxDeg);
    const ops: Op[] = [];
    if (plan.erase.length) ops.push({ op: "eraseEdges", at, edges: plan.erase });
    if (plan.soften.length) ops.push({ op: "setEdgeLayers", at, edges: plan.soften, layers: ["soft", "smooth"], on: true });
    const sharp = plan.tooSharp ? `；${plan.tooSharp} 条二面角超过 ${maxDeg}°，没碰` : "";
    if (!ops.length) { ctx.hint(plan.tooSharp ? `软边：${plan.tooSharp} 条二面角都超过 ${maxDeg}°，没碰（选项条可调）` : "软边：只认两张膜之间的边"); return; }
    ctx.commitOp(ops.length === 1 ? ops[0] : { op: "batch", label: "softErase", ops });
    const parts = [plan.erase.length ? `并了 ${plan.erase.length} 处共面` : "", plan.soften.length ? `软化了 ${plan.soften.length} 条边` : ""].filter(Boolean);
    ctx.hint(`软边：${parts.join("、")}${sharp}`);
  }
}

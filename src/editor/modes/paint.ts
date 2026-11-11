// modes/paint.ts —— 「画画」工作台（贴图主线 1-7，施工单 ai-docs/20261111-paint-workorders-14.md；2026-11-11 Claude Opus 5.5）。
// user 11-11：画画是单独的一个工作台，和自由建模、表面那几个并排；只对网格体有。三把工具：笔、橡皮、吸管。
// 工具不碰几何（照验证工作台「步行」那一套）：按下 / 拖 / 松手经 ToolCtx.paint 一个口交给宿主的画画控制器（app/paint-workbench.ts）——
//   画画内核、画板、落点、撤销的一步都在宿主；这里只管「这一下是哪把工具、哪个阶段、在哪」。笔不选中、不拖动任何东西。
import type { Mode } from "../mode.ts";
import type { PaintPointer, ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
import type { ToolPointer } from "../editor.ts";

/** 笔 / 橡皮：按住拖 = 一笔（宿主开一笔、每次挪交一个点、松手落层；取消 = 零痕迹）。 */
class PaintStrokeTool implements ToolHandler {
  readonly tool: "paintPen" | "paintEraser";
  readonly grammar = "direct" as const;
  private ctx: ToolCtx | null = null;
  constructor(tool: "paintPen" | "paintEraser") { this.tool = tool; }
  active(): boolean { return this.ctx !== null; }
  cancel(): void { const c = this.ctx; this.ctx = null; c?.paint(this.ev("cancel", 0, 0)); }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.paint(this.ev("hover", s.x, s.y)); }
  down(ctx: ToolCtx, ev: ToolPointer): void { this.ctx = ctx; ctx.paint(this.ev("down", ev.x, ev.y, ev.pointerType)); }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { if (this.ctx) ctx.paint(this.ev("move", s.x, s.y)); }
  up(ctx: ToolCtx, ev: ToolPointer): void { if (!this.ctx) return; this.ctx = null; ctx.paint(this.ev("up", ev.x, ev.y, ev.pointerType)); }
  live(): string { return ""; }
  sample(): Record<string, number> { return {}; }
  private ev(phase: PaintPointer["phase"], x: number, y: number, pointerType?: string): PaintPointer { return { tool: this.tool, phase, x, y, ...(pointerType ? { pointerType } : {}) }; }
}

/** 吸管：点一下 = 取那一处的颜色（宿主取、取完回到上一把笔）。 */
class EyedropTool implements ToolHandler {
  readonly tool = "eyedrop" as const;
  readonly grammar = "direct" as const;
  active(): boolean { return false; }
  cancel(): void { /* 一下就完，没有手势状态 */ }
  down(ctx: ToolCtx, ev: ToolPointer): void { ctx.paint({ tool: "eyedrop", phase: "pick", x: ev.x, y: ev.y, pointerType: ev.pointerType }); }
  track(): void { /* 不拖 */ }
  live(): string { return ""; }
  sample(): Record<string, number> { return {}; }
}

export class PaintMode implements Mode {
  readonly id = "paint" as const;
  readonly label = "画画";
  readonly kinds = ["mesh"] as const;
  readonly tools: readonly Tool[] = ["paintPen", "paintEraser", "eyedrop"];
  readonly defaultTool: Tool = "paintPen";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = { paintPen: new PaintStrokeTool("paintPen"), paintEraser: new PaintStrokeTool("paintEraser"), eyedrop: new EyedropTool() };
}

// editor/seek-input.ts —— 「要先找位置的」工具（stance.ts PEN_PRESS 里的 seek）收到的输入，翻成三个动词：找位置 / 下点 / 抬笔（笔的设计稿第二、三、五节，第七节第 3 步）。
// created 2026-11-13 by Claude Opus 5.5
//
// 底座把 direct 工具的 down / track / up / hover 原样递过来，这里翻：
//   · 找位置（seek）：悬空的笔、鼠标移动、轻按着滑、鼠标按着拖 —— 标记跟着走，不下点。
//   · 下点（place）：
//       指针带 press（输入层判到一次重按，app/gestures.ts → controller/hard-press.ts）= 先在 press.x / y（压力猛升之前那一刻）找一次，在那里下点，再回到笔现在的位置接着找；
//       松开时没带 lift（鼠标、不报压感的笔）且是点一下（按下到松开没走出点按容差）= 在按下时找到的标记上下点。按着拖完松开 = 不下点。
//   · 抬笔（lift）：松开时带 lift（输入层认得这支笔报压感，宽限也过了）= 交给工具（刀 = 收刀）。轻轻点一下也是抬笔，不下点（设计稿：轻轻点一下不下点）。
// 这里不读设备、不读压力：只看输入层给的 press / lift 和屏幕上走了多远。工具只实现 seek / place / lift 三个口。
import type { ToolPointer } from "./editor.ts";
import type { ToolCtx } from "./tool-handler.ts";

/** 工具那一头：找位置（标记跟到屏幕上这一点）/ 在现在的标记上下一点 / 抬笔。 */
export interface SeekVerbs {
  seek(ctx: ToolCtx, s: { x: number; y: number }): void;
  place(ctx: ToolCtx): void;
  lift(ctx: ToolCtx): void;
}

export class SeekInput {
  /** 按着没松（这一下的找位置还在走）。 */
  private downAt: { x: number; y: number } | null = null;
  private moved = false;
  constructor(private readonly tool: SeekVerbs) {}
  pressing(): boolean { return this.downAt !== null; }
  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.downAt = { x: ev.x, y: ev.y }; this.moved = false;
    this.tool.seek(ctx, ev);
    if (ev.press) this.hard(ctx, ev);
  }
  move(ctx: ToolCtx, s: { x: number; y: number }, ev?: ToolPointer): void {
    if (this.downAt && Math.hypot(s.x - this.downAt.x, s.y - this.downAt.y) > ctx.eps().tap) this.moved = true;
    this.tool.seek(ctx, s);
    if (ev?.press) this.hard(ctx, ev);
  }
  up(ctx: ToolCtx, ev: ToolPointer): void {
    const tap = !!this.downAt && !this.moved && Math.hypot(ev.x - this.downAt.x, ev.y - this.downAt.y) <= ctx.eps().tap;
    this.downAt = null;
    if (ev.lift) { this.tool.lift(ctx); return; }
    if (tap) this.tool.place(ctx);
  }
  cancel(): void { this.downAt = null; this.moved = false; }
  /** 一次重按：在压力猛升之前那一点下点，然后回到笔现在的位置接着找。 */
  private hard(ctx: ToolCtx, ev: ToolPointer): void {
    const p = ev.press!;
    this.tool.seek(ctx, { x: p.x, y: p.y });
    this.tool.place(ctx);
    this.tool.seek(ctx, ev);
    this.moved = true;   // 这一下已经下过点了：松开时不再当「点一下」
  }
}

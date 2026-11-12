// controller/stroke-clock.ts —— 画画的一笔：时间按哪种钟算、压感信谁的（施工单二十 1a）。created 2026-11-12 by Claude Opus 5.5
// 时钟照抬笔结算那次的规矩（controller/lift-settle.ts）：一笔里只用一种钟。落笔那一下的事件时间像样（和处理时刻同一个起点）= 整笔按事件时间（时间 = 事件时间 − 落笔的事件时间）；
//   不像样（程序造的、老设备）= 整笔按处理时刻。按事件时间的一笔里偶尔有一个样本的事件时间不像样：按落笔时两种钟的差折算成事件时间 —— 相对落笔就是「处理时刻 − 落笔的处理时刻」，
//   还是同一种钟。时间不往回走（取到过的最大值）。
// 压感：只信笔的（PointerEvent.pressure）；笔的样本报 0 = 没带压感，用上一个；鼠标 / 手指一律 1（它们报的 0.5 / 0 不是压感）。吃不吃压感是笔的记录的事（压感系数），不在这里。
// 无头（src/controller/ 的规矩）：不认识 DOM、编辑器、内核。
import { eventTimeUsable } from "./lift-settle.ts";

export class StrokeClock {
  /** 这一笔按事件时间（false = 按处理时刻）。 */
  readonly event: boolean;
  private readonly t0: number;
  private readonly h0: number;
  private last = 0;
  private lastPressure = 1;
  /** 落笔：at = 落笔那一下的事件时间（没有 = 程序造的），handled = 它被处理的时刻（performance.now()）。 */
  constructor(at: number | undefined, handled: number) {
    this.event = eventTimeUsable(at, handled);
    this.t0 = this.event ? at! : handled;
    this.h0 = handled;
  }
  /** 这个样本在这一笔里是第几毫秒（落笔 = 0，不往回走）。 */
  time(at: number | undefined, handled: number): number {
    const t = this.event && eventTimeUsable(at, handled) ? at - this.t0 : handled - this.h0;
    this.last = Math.max(this.last, t);
    return this.last;
  }
  /** 这个样本的压感（0..1）。 */
  pressure(pointerType: string | undefined, pressure: number | undefined): number {
    if (pointerType !== "pen" || pressure === undefined || !Number.isFinite(pressure)) return 1;
    if (pressure > 0) this.lastPressure = Math.min(1, pressure);
    return this.lastPressure;
  }
}

// controller/tool-borrow.ts —— 快捷键拿起的工具是临时的（借）：做完这一下回到原来那把（user 11-13 重做小屋子；统筹 11-13 第 C 件；原话在讨论日记第八十三轮）。
// created 2026-11-13 by Claude Opus 5.5
//
// user：「为了完全复刻 Blender 的手感……我们要记录我们这个工具是怎么进去的，以及上一个工具是什么。就是如果是 G、R、S 这些快捷键进去的话，我们完成之后，我们会回到选择，或者回到上一个工具」
//       「如果我们是用快捷键进的某个工具，它不是切工具，而是变成一个虚框，变成一个蓝色的空心框框住它。然后等我们完了之后，我们还是回到原来的工具。」
// 统筹定的范围：自由建模里快捷键拿起的一律是借的（起手就进手势的 G / R / S / E / I / Alt+S / Ctrl+B / Shift+D，只拿起的 M / Q / P / F / K / Shift+A，Ctrl+R 环切）；
// 回「选」的键（Space / Tab）、点左柱、换工作台 = 真的换。硬表面不借（SketchUp 式，一直拿着）。
//
// 「底下那把 + 借来的那把」只在这里管（编辑器一个 ToolHold 字段）：
//   · nextHold = 纯函数（现在的底、现在借的、发生了什么 → 新的底、新的借）；单元测试按表走（test/tool-borrow.test.ts）。
//   · 「借来的那把做完一次了吗」= runEnded，也是纯函数；编辑器只在一步收尾（step 的 finally）和步外的取消（abortGesture）问它一次。
//   · 回去走编辑器平常换工具那一条（setTool：取消手势、清充能……），只差不收马后炮（借用结束 = 同一个动作的收尾，不算换了工具；统筹 11-13 同意）。
// 各把工具里不许出现「我是不是借来的」：工具不认识这个模块（守卫在 test/tool-borrow.test.ts）。
// 以后会长出来的（统筹预告）：按住某个键临时换工具、「回上一把」的键、笔的橡皮头、快捷键按的锁（空心框只管这一下）——都是这里多一种事件，不是各处加 if。
import type { Tool } from "../editor/tool-ids.ts";

/** 底 = 一直拿着的那把（左柱实心高亮）；借 = 快捷键临时拿起的那把（蓝色空心框；null = 没借）。现在手上的 = 借 ?? 底。 */
export interface Hold { readonly base: Tool; readonly temp: Tool | null }
export type HoldEvent =
  | { readonly e: "take"; readonly tool: Tool }    // 真的换：点左柱、Space / Tab、换工作台、代码里 setTool
  | { readonly e: "borrow"; readonly tool: Tool }  // 快捷键拿起（自由建模）
  | { readonly e: "back" };                        // 借来的做完一次 / 什么都没做按 Esc：回底下那把

export const held = (h: Hold): Tool => h.temp ?? h.base;

export function nextHold(h: Hold, ev: HoldEvent): Hold {
  switch (ev.e) {
    case "take": return { base: ev.tool, temp: null };
    // 按的就是底下那把 = 在这把里起手、没有借这回事（借着别的也一并还掉）；按的就是借着的那把 = 不变；别的 = 换成借它，底不变（借着 G 按 R = 借 R，回的还是最开始那把）
    case "borrow": return ev.tool === h.base ? { base: h.base, temp: null } : ev.tool === h.temp ? h : { base: h.base, temp: ev.tool };
    case "back": return h.temp === null ? h : { base: h.base, temp: null };
  }
}

/** 这一下快捷键拿起的工具算不算借：自由建模里除了回「选」的键都算；别的工作台都不算。 */
export const keyBorrows = (mode: string, tool: Tool): boolean => mode === "freeform" && tool !== "select";

/**
 * 借来的那把这一下做完了吗（只在没有手势在进行时问）：
 * modal = 这次是键盘起手（G / R / S / E / I…）进去的——手势一收（落定、取消、原地留下，提交被拒也算）就算完；
 * cancelled = 有手势时被收了（Esc / 右键取消，或者收刀 / 收笔：切好的那几刀早就提交了，收的那一下本身不提交）；atStart ∧ hadOp = 这一步开始时手势在进行、这一步提交了改动（拖完落定、点落定、收刀、环切切完）。
 * 点一下选东西、框选、手势外按 Delete / 右键菜单里的指令都不算（借着移动先点一个点再拖，是常用的）。
 */
export function runEnded(r: { readonly busy: boolean; readonly modal: boolean; readonly cancelled: boolean; readonly atStart: boolean; readonly hadOp: boolean }): boolean {
  return !r.busy && (r.modal || r.cancelled || (r.atStart && r.hadOp));
}

/** 编辑器里那一个字段：状态 + 这一次借用的记号。只记账、不换工具（换工具由编辑器照平常那条路做）。 */
export class ToolHold {
  private h: Hold;
  private modal = false;
  private cancelled = false;
  private atStart = false;
  constructor(tool: Tool) { this.h = { base: tool, temp: null }; }
  get state(): Hold { return this.h; }
  /** 借的那把换了（借上 / 换成借另一把 / 回去 / 真的换）= 这一次借用的记号清掉：G 途中按 R 借旋转，G 的「键盘起手」记号不能带给 R。 */
  apply(ev: HoldEvent): Hold { const prev = this.h.temp; this.h = nextHold(this.h, ev); if (this.h.temp !== prev || this.h.temp === null) this.modal = this.cancelled = false; return this.h; }
  /** 一步开始：手势在不在进行。 */
  begin(busy: boolean): void { this.atStart = busy; }
  /** 键盘起手成功了（这一次借用到手势收了就算完）。 */
  noteModal(): void { this.modal = true; }
  /** 这一次被收了：取消（Esc / 右键）、收刀 / 收笔（编辑器 endChain：「收」钮、同一处再点、Esc、抬笔）——有手势在进行才算「做完」。 */
  noteEnd(busy: boolean): void { if (busy) this.cancelled = true; }
  /** 一步收尾 / 步外的取消之后问：借来的做完了 → 返回要回去的那把（底），不然 null。没借的时候只清记号。 */
  settle(busy: boolean, hadOp: boolean): Tool | null {
    if (busy) return null;
    const done = this.h.temp !== null && runEnded({ busy, modal: this.modal, cancelled: this.cancelled, atStart: this.atStart, hadOp });
    if (done || this.h.temp === null) this.modal = this.cancelled = false;
    return done ? this.h.base : null;
  }
}

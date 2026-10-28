// tools/select.ts —— 选择工具的手势模块：direct 语法（按下拖 = 框选；点一下 / 两下 / 三下 = 点击族，SU 同款）。
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）：框选 = 屏幕矩形里的边 / 面（子池整体）；点击族 = selectExpand 0 / 1 / 2 档；
// 双击子 group / 组件 = 进入；在组里点空处（没选区）= 退出一层。created 2026-10-24 by Claude Fable 5.1
// 修饰键对齐 Blender（2026-10-26 Opus）：点击 Shift = 切换、Ctrl = 减选；框选 Shift = 加选、Ctrl = 减选；没按 = 右下角「选区」选项（iPad，默认替换）。
// 2026-10-28：点 / 框 / 拖框的本体搬进 selecting.ts（「会选的工具」共用：自由建模的移动 / 挤出 / 插入点一下也是这一套；Alt 点边 = 环 / 洞）。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";
import { BoxDrag, clickSelect, multiSelect, selModeOf } from "./selecting.ts";

export class SelectTool implements ToolHandler {
  readonly tool = "select" as const;
  readonly grammar = "direct" as const;
  private box = new BoxDrag();

  active(): boolean { return this.box.active(); }
  /** 这一下怎么合进选区（两档 + 修饰键）：归 selecting.ts（「会选的工具」共用）。 */
  static modeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean): SelMode { return selModeOf(ctx, ev, box); }
  static multi(ctx: ToolCtx): boolean { return multiSelect(ctx); }
  cancel(): void { this.box.cancel(); }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }

  down(_ctx: ToolCtx, ev: ToolPointer): void { this.box.begin(ev); }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { this.box.track(ctx, s); }

  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    if (!this.box.active()) return;
    const n = ctx.clicks();   // 0 = 拖；n = 连着的第 n 下点击（点按族 tap-train.ts：笔快速点一下之后的下一下偏向点）
    if (n === 0) { this.box.finish(ctx, ev); return; }   // 拖 = 框选；门槛 = 这一下的点按容差（桌面 4 / VR 本帧 tap；笔跟进的那一下放宽）
    this.box.cancel(ctx);
    clickSelect(ctx, ev, n);
  }
}

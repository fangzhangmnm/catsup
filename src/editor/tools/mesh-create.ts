// tools/mesh-create.ts —— 自由建模工作台的「新建」（网格体里长一个基本体）。created 2026-10-28 by Claude Opus 5.5
// user 10-27（纪元账本 FM182）：「然后能不能加一个新建的tool，就是拖动然后新建，可以马前炮和马后炮，如果你想用马前炮的尺寸就点击」；「新建两个入口先同一条指令」。
// 直接操作（direct）：
//   · 点一下 = 在按下那一点打到的地方（点 / 边 / 面 / 原点 / 地面；和右键新建同一套落点）新建一个，尺寸 = 工具条上「点一下的尺寸」（马前炮）。
//   · 按住拖 = 从按下那一点往外拖多远，基本体就多大：拖的距离 = 半径（圆柱 / 圆锥 / 球）或半边长（立方体 / 平面），边沿跟着手指走；拖的时候预演，松手落定。
//   · 落定以后右下「刚才：」= 马后炮（对齐 法向 / 世界 / 物体、尺寸、段数），和右键新建同一份（Editor.addPrimitive）。新的那个留在选区里，接着可以挤出 / 移动。
// 工具只管「按在哪、拖多大」；落点、坐标架、提交、马后炮都在编辑器那一条里（ctx.newPrimitive / previewPrimitive / primitiveDragSize）。
import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { PrimitiveKind } from "../../mesh/ops/primitives.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

export class MeshCreateTool implements ToolHandler {
  readonly tool = "create" as const;
  readonly grammar = "direct" as const;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private dragging = false;

  active(): boolean { return this.start !== null; }
  cancel(): void { this.start = this.cur = null; this.dragging = false; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshCreate: { start: this.start, cur: this.cur, dragging: this.dragging } }; }

  private kind(ctx: ToolCtx): PrimitiveKind { return ctx.config.get("create", "kind") as PrimitiveKind; }
  /** 拖出来的尺寸（世界长度：边长 / 直径 = 拖的距离 × 2）；没拖 / 落不到东西 = null。 */
  private dragSize(ctx: ToolCtx): number | null {
    const s0 = this.start, s1 = this.cur;
    if (!s0 || !s1 || !this.dragging) return null;
    const d = ctx.primitiveDragSize(s0.x, s0.y, s1.x, s1.y);
    return d !== null && d > 1e-9 ? 2 * d : null;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; this.dragging = false;
    if (ctx.primitiveDragSize(ev.x, ev.y, ev.x, ev.y) === null) { this.cancel(); ctx.hint("新建：按在点 / 面 / 原点 / 地面上"); return; }
    ctx.hint("新建：拖出来定大小，松手落定；点一下 = 用工具条上的尺寸");
  }
  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    if (!this.start) return;
    this.cur = { x: s.x, y: s.y };
    if (!this.dragging && ctx.moved(s, travel) > ctx.tapSlop()) this.dragging = true;
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const s0 = this.start, size = this.dragSize(ctx);
    if (!s0 || size === null) return "";
    const kind = this.kind(ctx);
    let label = "";
    run((m) => { label = ctx.previewPrimitive(kind, s0.x, s0.y, size, m) ?? ""; });
    return label;
  }

  up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void {
    const s0 = this.start;
    if (!s0) return;
    const tap = ctx.clicks() > 0 || !this.dragging, size = tap ? ctx.config.get("create", "size") : this.dragSize(ctx), kind = this.kind(ctx);
    this.cancel();
    if (size === null) { ctx.hint("新建：拖得太短，没建；点一下 = 用工具条上的尺寸"); return; }
    ctx.newPrimitive(kind, s0.x, s0.y, size);
  }
}

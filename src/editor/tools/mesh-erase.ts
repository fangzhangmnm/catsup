// tools/mesh-erase.ts —— 自由建模工作台的「删除」（橡皮键 E 的那一格；网格体）。created 2026-10-27 by Claude Opus 5.5
// user 10-27「选 拉 挪 转 缩 刀 删 插 八个常用的」：直接操作（direct）——按下点到的点 / 边 / 面，按住刮过去的都算，松手一次删掉（一步撤销）。
//   · 点 → 连着的边和面一起走；边 → 连着的面一起走；面 → 只删这张面（它独占的边和孤立的点一起走）。和 Blender 按选择模式删同语义（mesh/ops/delete.ts deleteSelection）。
//   · 按住 Ctrl（Alt / ⌘）= 溶解（不开洞）：边 → 两侧的面并成一张、二度点去掉；溶解不了的跳过并说（纪元账本 FM11「去边 = Blender dissolve」；修饰键稿「Ctrl = 这个工具的另一种做法」）。
//   · 按真身拾取（预演里已经删掉了，不能按预演拾取）；悬停不高亮（FM113），刮的时候预演就是删掉以后的样子。
import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { deleteSelection } from "../../mesh/ops/index.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

export class MeshEraseTool implements ToolHandler {
  readonly tool = "erase" as const;
  readonly grammar = "direct" as const;
  private hit: { verts: Set<number>; edges: Set<number>; faces: Set<number> } | null = null;
  private dissolve = false;

  active(): boolean { return this.hit !== null; }
  cancel(): void { this.hit = null; this.dissolve = false; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshErase: this.hit ? { v: this.hit.verts.size, e: this.hit.edges.size, f: this.hit.faces.size, dissolve: this.dissolve } : null }; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.hit = { verts: new Set(), edges: new Set(), faces: new Set() };
    this.dissolve = !!ev.copy;
    this.collect(ctx, ev);
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { this.collect(ctx, s); }
  private collect(ctx: ToolCtx, s: { x: number; y: number }): void {
    const h = this.hit;
    if (!h) return;
    const c = ctx.classify(ctx.world(), ctx.pickStatic(s.x, s.y));
    if (c.kind !== "entity") return;
    if (c.local.vertex !== undefined) h.verts.add(c.local.vertex);
    else if (c.local.edge !== undefined) h.edges.add(c.local.edge);
    else if (c.local.face !== undefined && !this.dissolve) h.faces.add(c.local.face);
  }
  private count(): number { const h = this.hit; return h ? h.verts.size + h.edges.size + h.faces.size : 0; }

  liveMesh(_ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const h = this.hit;
    if (!h || !this.count()) return this.dissolve ? "溶解：刮过要溶解的边 / 点" : "删除：刮过要删的点 / 边 / 面";
    const t = { verts: [...h.verts], edges: [...h.edges], faces: [...h.faces] }, dis = this.dissolve;
    run((m) => { deleteSelection(m, t, dis); });
    return `${dis ? "溶解" : "删除"} ${this.count()} 处`;
  }

  up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void {
    const h = this.hit, dis = this.dissolve, n = this.count();
    this.cancel();
    if (!h || !n) return;
    const t = { verts: [...h.verts].sort((a, b) => a - b), edges: [...h.edges].sort((a, b) => a - b), faces: [...h.faces].sort((a, b) => a - b) };
    const skipped = deleteSelection(ctx.mesh().clone(), t, dis);   // 先在副本上跑一遍：溶解不了几个（提交是同一份内核 + 同一组参数）
    if (dis && skipped === n) { ctx.hint("溶解：这些边 / 点溶解不了（边要恰好连两张面、点要只连两条边）"); return; }
    ctx.commitOp({ op: "meshDelete", def: ctx.activePool().def, ...(t.verts.length ? { verts: t.verts } : {}), ...(t.edges.length ? { edges: t.edges } : {}), ...(t.faces.length ? { faces: t.faces } : {}), ...(dis ? { dissolve: true } : {}) });
    ctx.hint(`${dis ? "溶解" : "删除"}了 ${n - skipped} 处${skipped ? `（${skipped} 处溶解不了，跳过了）` : ""}`);
  }
}

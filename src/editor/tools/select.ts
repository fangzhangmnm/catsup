// tools/select.ts —— 选择工具的手势模块：direct 语法（按下拖 = 框选；点一下 / 两下 / 三下 = 点击族，SU 同款）。
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）：框选 = 屏幕矩形里的边 / 面（子池整体）；点击族 = selectExpand 0 / 1 / 2 档；
// 双击子 group / 组件 = 进入；在组里点空处（没选区）= 退出一层；Shift = 追加。created 2026-10-24 by Claude Fable 5.1
import { pickGuide } from "../guide-pick.ts";
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent } from "../../kernel/kernel.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

export class SelectTool implements ToolHandler {
  readonly tool = "select" as const;
  readonly grammar = "direct" as const;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private clickTrain: { t: number; p: { x: number; y: number; z: number }; n: number } | null = null;   // 点击族计数（350 ms · 1.5 × tap 帧度量）

  active(): boolean { return this.start !== null; }
  cancel(): void { this.start = this.cur = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }

  down(_ctx: ToolCtx, ev: ToolPointer): void { this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (!this.start) return;
    this.cur = { x: s.x, y: s.y };
    const minX = Math.min(this.start.x, s.x), maxX = Math.max(this.start.x, s.x), minY = Math.min(this.start.y, s.y), maxY = Math.max(this.start.y, s.y);
    ctx.marquee({ x: minX, y: minY, w: maxX - minX, h: maxY - minY });
  }

  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    const start = this.start, cur = this.cur;
    this.cancel();
    ctx.marquee(null);
    if (!start || !cur) return;
    const additive = ev.shiftKey;
    const view = ctx.live();
    if (ctx.moved(cur, ev.travel) > ctx.eps().tap) {   // 起拖门槛 = 本帧 tap（桌面 4 px / VR 0.4°）；此前写死 4 px，VR 下 (x, y) 是名义坐标（2026-10-24 Opus）
      const box = { minX: Math.min(start.x, cur.x), maxX: Math.max(start.x, cur.x), minY: Math.min(start.y, cur.y), maxY: Math.max(start.y, cur.y) };
      const picked = ctx.marqueePick(box);
      const sel = { edges: [] as number[], faces: [] as number[], pools: [] as { kind: "group"; group: number }[] | { kind: "instance"; instance: number }[] };
      const pools = new Map<string, { kind: "group"; group: number } | { kind: "instance"; instance: number }>();
      for (const gid of picked.edges) { const c = ctx.classify(view, { edge: gid }); if (c.kind === "entity" && c.local.edge !== undefined) sel.edges.push(c.local.edge); else if (c.kind === "pool") pools.set(c.key, c.pick); }
      for (const gid of picked.faces) { const c = ctx.classify(view, { face: gid }); if (c.kind === "entity" && c.local.face !== undefined) sel.faces.push(c.local.face); else if (c.kind === "pool") pools.set(c.key, c.pick); }
      // 框选也收参考点（投影在框里的）；参考线无限长、框选会全中，不收（单击选）
      const vp = ctx.vp(), guides = view.guides().points.filter((q) => { const s2 = ctx.frame().project?.(q.p, vp); return !!s2 && s2.x >= box.minX && s2.x <= box.maxX && s2.y >= box.minY && s2.y <= box.maxY; }).map((q) => q.id);
      ctx.replaceSelection({ edges: sel.edges, faces: sel.faces, pools: [...pools.values()], guides }, additive);
      ctx.afterSelect();
      return;
    }
    const now = performance.now();
    // 连击：上一击那条射线上 1 m 处的世界点，本帧 distTo 量（桌面 = 像素，VR = 角度）；门槛 1.5 × tap（桌面 6 px，VR 0.6°）
    const ray = ctx.frame().ray(ev.x, ev.y, ctx.vp()), here = { x: ray.origin.x + ray.dir.x, y: ray.origin.y + ray.dir.y, z: ray.origin.z + ray.dir.z };
    const train = this.clickTrain && now - this.clickTrain.t < 350 && ctx.frame().distTo(ev.x, ev.y, this.clickTrain.p, ctx.vp()) <= 1.5 * ctx.eps().tap
      ? { t: now, p: here, n: this.clickTrain.n + 1 } : { t: now, p: here, n: 1 };
    this.clickTrain = train;
    const hit = ctx.pick(ev.x, ev.y);
    // A31：参考线 / 参考点（光标下不是边或顶点时）——参考点 > 参考线，与实体拾取「点 > 边」同口径；面上的参考线照样点得中
    if (hit.edge === undefined && hit.vertex === undefined) {
      const g = pickGuide(view.guides(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.eps().hit);
      if (g) { ctx.selectGuide(g.id, additive); ctx.afterSelect(); return; }
    }
    const c = ctx.classify(view, hit);
    if (c.kind === "pool" && train.n >= 2) { ctx.enterPool(c.pick); return; }   // 双击子 group / 组件 = 进入
    if (c.kind === "none" && !additive && ctx.contextDepth() > 0 && train.n === 1 && !ctx.hasSelection()) { ctx.exitContext(); return; }   // 点空处 = 退出一层（SU 同款）
    ctx.selectExpand(hit, train.n >= 3 ? 2 : train.n === 2 ? 1 : 0, additive);
  }
}

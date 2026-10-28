// tools/selecting.ts —— 「会选的工具」的深模块（2026-10-28 Claude Opus 5.5；user「然后move之类的因为也可以选择，能不能理一下深模块」
// 「move的时候在没选择的时候能不能拖框，其他的同理」「对了，alt 点边可以选择洞还是环」）。
// 选择工具和自由建模里「点一下就是选」的工具（移动 / 旋转 / 缩放 / 沿法线、挤出、插入 / 倒角）用同一套选法，不各写各的：
//   · 点（clickSelect）：点击族（一下 / 两下 / 三下 = 本身 / 连同一圈 / 连通体）、修饰键（Shift 切换、Ctrl 减选、右下角「替换 / 多选」两档）、
//     Alt 点边 = 环 / 洞（网格体；mesh/select-loop.ts）、双击组件进去、双击空处退出一层、参考线 / 空组件；
//   · 框（boxSelect）：屏幕框里的点 / 边 / 面 / 子物体 / 参考点；
//   · 拖框（BoxDrag）：按下 → 拖 → 松手的那一套状态（出框的门槛 = 点按容差）。
// 自由建模的操作工具怎么用：点一下 = clickSelect；按下 = pressTarget(抓什么)——有选区 = 选区、手下有东西 = 它、**没选区又按在空处 = 拖框**；
// 拿到目标以后「拿它做什么」（挤面 / 挤边、插入 / 倒角……）才归工具自己。各工具的选法一张表 = ai-docs/20261027-freeform-tools.md §选法。
// 硬表面的移动 / 旋转 / 缩放不走这里（SketchUp 的语义不变，纪元账本 FM159）；两套肌肉记忆怎么统一 = 家族周账 F-117 交 Fable。
import { pickGuide } from "../guide-pick.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";

// ---------- 按下作用在什么上（窄接口：工具只报「没选区时抓什么」）----------
/**
 * 没选区时按下抓什么（每个工具一个词；user 10-28「关键是不同的子工具的选择逻辑是不是都不一样。能不能把这些逻辑整理出来做一个深模块窄接口」）：
 * "element" = 点 > 边 > 面（常量半径，纪元账本 FM165；移动 / 旋转 / 缩放 / 沿法线）；"face" = 只认面（点和边不挡路、小面也按得到；挤出、插入 / 倒角）。
 */
export type Grab = "element" | "face";
export interface Target { readonly verts: number[]; readonly edges: number[]; readonly faces: number[]; /** 来自选区（不是按下处抓的）。 */ readonly fromSelection: boolean }
/** 按下这一下作用在什么上：有选区 = 选区；没选区 = 按下处按 grab 抓的那一个；空处 = "box"（拖 = 框选，BoxDrag）。只管网格体（自由建模）。 */
export function pressTarget(ctx: ToolCtx, at: { x: number; y: number }, grab: Grab): Target | "box" {
  const m = ctx.mesh(), sel = ctx.selection();
  if (sel.kind === "mesh" && (sel.verts.size || sel.edges.size || sel.faces.size)) {
    const by = (xs: Iterable<number>, alive: (x: number) => boolean): number[] => [...xs].filter(alive).sort((a, b) => a - b);
    return { verts: by(sel.verts, (v) => m.hasV(v)), edges: by(sel.edges, (e) => m.hasE(e)), faces: by(sel.faces, (f) => m.hasF(f)), fromSelection: true };
  }
  if (grab === "face") {
    const gf = ctx.pickFace(at.x, at.y), c = gf !== undefined ? ctx.classify(ctx.world(), { face: gf }) : null;
    return c && c.kind === "entity" && c.local.face !== undefined && m.hasF(c.local.face) ? { verts: [], edges: [], faces: [c.local.face], fromSelection: false } : "box";
  }
  const c = ctx.classify(ctx.world(), ctx.pick(at.x, at.y));
  if (c.kind !== "entity") return "box";
  const h = c.local;
  return { verts: h.vertex !== undefined ? [h.vertex] : [], edges: h.edge !== undefined ? [h.edge] : [], faces: h.face !== undefined && h.vertex === undefined && h.edge === undefined ? [h.face] : [], fromSelection: false };
}

/** 右下角「选区」两档：多选（= 一直按着 Shift）？ */
export const multiSelect = (ctx: ToolCtx): boolean => ctx.config.get("select", "mode") === "multi";
/**
 * 这一下怎么合进选区：Ctrl（⌘）= 减选；Shift 或「多选」档 = 拖 = 加选、点 = 切换；别的 = 替换（FM158）。
 * Alt 不算减选（它留给「点边选环」；移动复制照旧认 Alt，那是 copy 的事）。
 */
export function selModeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean): SelMode {
  if (ev.copy && !ev.altKey) return "remove";
  return ev.shiftKey || multiSelect(ctx) ? (box ? "add" : "toggle") : "replace";
}

/** 点一下（第 n 下）：和选择工具同一套（见文件头）。 */
export function clickSelect(ctx: ToolCtx, ev: ToolPointer, n: number): void {
  const view = ctx.live(), mode = selModeOf(ctx, ev, false);
  const hit = ctx.pick(ev.x, ev.y);
  if (ev.altKey && hit.edge !== undefined && ctx.selectLoop(hit, mode)) return;   // Alt 点边 = 环 / 洞（网格体；硬表面没有这个，照常点）
  // A31：参考线 / 参考点（光标下不是边或顶点时）——参考点 > 参考线，与实体拾取「点 > 边」同口径；面上的参考线照样点得中
  if (hit.edge === undefined && hit.vertex === undefined) {
    const g = pickGuide(view.guides(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.eps().hit);
    if (g) { ctx.selectGuide(g.id, mode); ctx.afterSelect(); return; }
  }
  // 空组件（导入的空节点，T11）：没几何，点它的小三轴 = 点它；点 / 边优先（标记压在边上时边赢），面让给标记（埋在几何里的空节点也点得中）
  const em = hit.edge === undefined && hit.vertex === undefined ? ctx.emptyAt(ev.x, ev.y) : null;
  if (em) {
    if (n >= 2) { ctx.enterPool(em.pick); return; }
    ctx.replaceSelection({ edges: [], faces: [], pools: [em.pick] }, mode);
    ctx.afterSelect();
    return;
  }
  const c = ctx.classify(view, hit);
  if (c.kind === "pool" && n >= 2) { ctx.enterPool(c.pick); return; }   // 双击子 group / 组件 = 进入
  const multiTap = mode === "toggle" && !ev.shiftKey && multiSelect(ctx);   // 多选那一档（不是按着 Shift）
  // 双击空处 = 退出一层（user 10-27「单击空白退出一层其实还是蛮容易误触的，既然进去是双击，退出也改成双击」；单击空处 = 取消选择）
  if (c.kind === "none" && (mode === "replace" || multiTap) && ctx.contextDepth() > 0 && n === 2) { ctx.exitContext(); return; }
  if (c.kind === "none" && multiTap) { ctx.replaceSelection({ edges: [], faces: [], pools: [] }, "replace"); ctx.afterSelect(); return; }   // 多选里点空处 = 清空（FM158）
  ctx.selectExpand(hit, n >= 3 ? 2 : n === 2 ? 1 : 0, mode);
}

export interface ScreenBox { minX: number; minY: number; maxX: number; maxY: number }
/** 框选：框里的点（自由建模，FM139）/ 边 / 面 / 子物体 / 空组件 / 参考点（参考线无限长、框选会全中，不收）。 */
export function boxSelect(ctx: ToolCtx, box: ScreenBox, mode: SelMode): void {
  const view = ctx.live(), picked = ctx.marqueePick(box);
  const verts: number[] = [], edges: number[] = [], faces: number[] = [];
  const pools = new Map<string, Parameters<ToolCtx["enterPool"]>[0]>();
  for (const gid of picked.verts) { const c = ctx.classify(view, { vertex: gid }); if (c.kind === "entity" && c.local.vertex !== undefined) verts.push(c.local.vertex); else if (c.kind === "pool") pools.set(c.key, c.pick); }
  for (const gid of picked.edges) { const c = ctx.classify(view, { edge: gid }); if (c.kind === "entity" && c.local.edge !== undefined) edges.push(c.local.edge); else if (c.kind === "pool") pools.set(c.key, c.pick); }
  for (const gid of picked.faces) { const c = ctx.classify(view, { face: gid }); if (c.kind === "entity" && c.local.face !== undefined) faces.push(c.local.face); else if (c.kind === "pool") pools.set(c.key, c.pick); }
  for (const em of ctx.emptiesIn(box)) pools.set(em.key, em.pick);   // 空组件（导入的空节点）：标记的原点在框里
  const vp = ctx.vp(), guides = view.guides().points.filter((q) => { const s2 = ctx.frame().project?.(q.p, vp); return !!s2 && s2.x >= box.minX && s2.x <= box.maxX && s2.y >= box.minY && s2.y <= box.maxY; }).map((q) => q.id);
  ctx.replaceSelection({ verts, edges, faces, pools: [...pools.values()], guides }, mode);
  ctx.afterSelect();
}

/** 拖框：按下记起点；拖过点按容差才出框；松手 = 框选（没拖出框 = 什么都不做，那是「点」，归 clickSelect）。 */
export class BoxDrag {
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  active(): boolean { return this.start !== null; }
  begin(ev: { x: number; y: number }): void { this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; }
  /** 跟手（在拖框 = true）。 */
  track(ctx: ToolCtx, s: { x: number; y: number }): boolean {
    if (!this.start) return false;
    this.cur = { x: s.x, y: s.y };
    if (ctx.moved(s) <= ctx.tapSlop()) { ctx.marquee(null); return true; }   // 还在点按容差里：不出框（笔跟进的那一下滑一点不闪小框）
    const b = this.box()!;
    ctx.marquee({ x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY });
    return true;
  }
  /** 松手：框选（按这一下的修饰键 / 两档定怎么合）。 */
  finish(ctx: ToolCtx, ev: ToolPointer): void {
    if (ev.x !== undefined) this.cur = { x: ev.x, y: ev.y };
    const b = this.box();
    this.cancel(ctx);
    if (b) boxSelect(ctx, b, selModeOf(ctx, ev, true));
  }
  cancel(ctx?: ToolCtx): void { this.start = this.cur = null; ctx?.marquee(null); }
  private box(): ScreenBox | null {
    const a = this.start, c = this.cur;
    return a && c ? { minX: Math.min(a.x, c.x), maxX: Math.max(a.x, c.x), minY: Math.min(a.y, c.y), maxY: Math.max(a.y, c.y) } : null;
  }
}

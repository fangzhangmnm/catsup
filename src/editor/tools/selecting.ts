// tools/selecting.ts —— 「会选的工具」的深模块（2026-10-28 Claude Opus 5.5；user「然后move之类的因为也可以选择，能不能理一下深模块」
// 「move的时候在没选择的时候能不能拖框，其他的同理」「对了，alt 点边可以选择洞还是环」）。
// 选择工具和自由建模里「点一下就是选」的工具（移动 / 旋转 / 缩放 / 沿法线、挤出、插入 / 倒角）用同一套选法，不各写各的：
//   · 点（clickSelect）：点击族（一下 / 两下 / 三下 = 本身 / 连同一圈 / 连通体）、修饰键（Shift 切换、Ctrl 减选、右下角「替换 / 多选」两档）、
//     Alt 点边 = 环 / 洞（网格体；mesh/select-loop.ts）、双击组件进去、双击空处退出一层、参考线 / 空组件；
//   · 框（boxSelect）：屏幕框里的点 / 边 / 面 / 子物体 / 参考点；
//   · 拖框（BoxDrag）：按下 → 拖 → 松手的那一套状态（出框的门槛 = 点按容差）。
// 自由建模的操作工具怎么用：点一下 = clickSelect；按下 = pressTarget(抓什么)——有选区 = 按在选区上 / 空处对选区做、按在选区外的东西上换成它（立场表 press 列，账本 UX30）；手下有东西 = 它；**没选区又按在空处 = 拖框**；
// 拿到目标以后「拿它做什么」（挤面 / 挤边、插入 / 倒角……）才归工具自己。各工具的选法一张表 = ai-docs/20261027-freeform-tools.md §选法。
// 硬表面的移动 / 旋转 / 缩放不走这里（SketchUp 的语义不变，纪元账本 FM159）；两套肌肉记忆怎么统一 = 家族周账 F-117 交 Fable。
import { pickGuide } from "../guide-pick.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx } from "../tool-handler.ts";
import type { SelMode } from "../tools.ts";
import type { Tool } from "../tool-ids.ts";
import { BOOLEAN_DEFAULT, deviceOf, stanceOf } from "../../controller/stance.ts";
import { areaTest, type ScreenArea } from "../marquee.ts";

// ---------- 按下作用在什么上（窄接口：工具只报「没选区时抓什么」）----------
/**
 * 没选区时按下抓什么 = 立场表（stance.ts）那把工具在自由建模那一行的「抓什么」（user 10-28「关键是不同的子工具的选择逻辑是不是都不一样。能不能把这些逻辑整理出来做一个深模块窄接口」）：
 * "element" = 点 > 边 > 面（常量半径，纪元账本 FM165；移动 / 旋转 / 缩放 / 沿法线）；"face" = 只认面（点和边不挡路、小面也按得到；挤出、插入 / 倒角）。
 */
export interface Target {
  readonly verts: number[]; readonly edges: number[]; readonly faces: number[];
  /** 来自选区（不是按下处抓的）。 */ readonly fromSelection: boolean;
  /** 按在选区外的东西上（立场 press = split3）：真做了（落定那一步）才把选区换成它——按下时还分不清是点还是拖，点一下要照旧走点选（Shift 加选不能被它截胡）。 */
  readonly adopt?: { readonly verts: number[]; readonly edges: number[]; readonly faces: number[] };
}
/** 落定那一步里调（commitOp 之前）：把选区换成按下时抓到的那个（Target.adopt）；没有 = 什么都不做。 */
export function adoptPress(ctx: ToolCtx, adopt: Target["adopt"] | null | undefined): void {
  if (!adopt) return;
  ctx.replaceSelection({ verts: adopt.verts, edges: adopt.edges, faces: adopt.faces, pools: [] }, "replace");
  ctx.afterSelect();
}
/** 按下处抓到的东西（立场表「抓什么」：element = 点 > 边 > 面，face = 只认面）；没东西 = null。只管网格体（自由建模）。 */
/** 拾取范围（工具条三个开关，自由建模）：关掉的那一级不参赛；全关 = 当全开（不让人把自己锁死）。硬表面 = undefined（照旧）。 */
export function pickKinds(ctx: ToolCtx): { verts: boolean; edges: boolean; faces: boolean } | undefined {
  if (ctx.selection().kind !== "mesh") return undefined;
  const k = { verts: ctx.config.get("pick", "verts"), edges: ctx.config.get("pick", "edges"), faces: ctx.config.get("pick", "faces") };
  return k.verts || k.edges || k.faces ? k : { verts: true, edges: true, faces: true };
}
function grabUnder(ctx: ToolCtx, at: { x: number; y: number }, grab: string): { verts: number[]; edges: number[]; faces: number[] } | null {
  const m = ctx.mesh();
  if (grab === "face") {
    const gf = ctx.pickFace(at.x, at.y), c = gf !== undefined ? ctx.classify(ctx.world(), { face: gf }) : null;
    return c && c.kind === "entity" && c.local.face !== undefined && m.hasF(c.local.face) ? { verts: [], edges: [], faces: [c.local.face] } : null;
  }
  const c = ctx.classify(ctx.world(), ctx.pick(at.x, at.y, { kinds: pickKinds(ctx) }));
  if (c.kind !== "entity") return null;
  const h = c.local;
  return { verts: h.vertex !== undefined ? [h.vertex] : [], edges: h.edge !== undefined ? [h.edge] : [], faces: h.face !== undefined && h.vertex === undefined && h.edge === undefined ? [h.face] : [] };
}
/** 按下处的东西算不算「在选区上」：它自己选着，或者它是选中的面 / 边的一部分（按在选中面的边上、选中边的端点上 = 按在选区上，不换选区）。 */
function touchesSelection(ctx: ToolCtx, sel: { verts: ReadonlySet<number>; edges: ReadonlySet<number>; faces: ReadonlySet<number> }, u: { verts: number[]; edges: number[]; faces: number[] }): boolean {
  const m = ctx.mesh();
  const selFaceEdges = new Set<number>(), selVerts = new Set<number>(sel.verts);
  for (const f of sel.faces) if (m.hasF(f)) { for (const e of m.fEdges(f)) selFaceEdges.add(e); for (const v of m.faceVerts(f)) selVerts.add(v); }
  for (const e of sel.edges) if (m.hasE(e)) { selVerts.add(m.edgeA[e]); selVerts.add(m.edgeB[e]); }
  if (u.faces.some((f) => sel.faces.has(f))) return true;
  if (u.edges.some((e) => sel.edges.has(e) || selFaceEdges.has(e))) return true;
  if (u.verts.some((v) => selVerts.has(v))) return true;
  // 只认面的工具按在一张没选的面上，但这张面带着选中的边 / 点（选了边去挤）= 也算在选区上
  if (u.faces.length && !u.edges.length && !u.verts.length) for (const f of u.faces) if (m.hasF(f) && (m.fEdges(f).some((e) => sel.edges.has(e)) || m.faceVerts(f).some((v) => sel.verts.has(v)))) return true;
  return false;
}
/**
 * 按下这一下作用在什么上（只管网格体 = 自由建模）：
 * 没选区 = 按下处按这把工具的立场抓那一个；空处 = "box"（拖 = 框选，BoxDrag）。
 * 有选区 = 看立场表 press 列（账本 UX30）：split3 = 按在选区上 / 空处 → 选区；按在选区外的可选对象上 → 对它做，落定那一步里选区换成它（Target.adopt → adoptPress）、做完留着；
 *   只是点一下（没拖）= 工具走 clickSelect，选区照点选的规矩变（Shift 加选不被截胡）。
 * 缺 press = 有选区就是选区（不管按在哪）。
 */
export function pressTarget(ctx: ToolCtx, at: { x: number; y: number }, tool: Tool): Target | "box" {
  const m = ctx.mesh(), sel = ctx.selection(), st = stanceOf("freeform", tool), grab = st?.grab ?? "element";
  const by = (xs: Iterable<number>, alive: (x: number) => boolean): number[] => [...xs].filter(alive).sort((a, b) => a - b);
  if (sel.kind === "mesh" && (sel.verts.size || sel.edges.size || sel.faces.size)) {
    if (st?.press === "split3") {
      const u = grabUnder(ctx, at, grab);
      if (u && !touchesSelection(ctx, sel, u)) return { ...u, fromSelection: true, adopt: u };   // 选区外的可选对象：对它做，落定时选区换成它（adoptPress）
    }
    return { verts: by(sel.verts, (v) => m.hasV(v)), edges: by(sel.edges, (e) => m.hasE(e)), faces: by(sel.faces, (f) => m.hasF(f)), fromSelection: true };
  }
  const u = grabUnder(ctx, at, grab);
  return u ? { ...u, fromSelection: false } : "box";
}

/** 右下角「选区」两档：多选（= 一直按着 Shift）？ */
export const multiSelect = (ctx: ToolCtx): boolean => ctx.config.get("select", "mode") === "multi";
/**
 * 这一下怎么合进选区：Ctrl（⌘）= 减选；Shift 或「多选」档 = 笔的默认（拖 = 加选、点 = 切换）；别的 = 鼠标的默认（替换）。默认值表 = stance.ts BOOLEAN_DEFAULT（按设备：鼠标 / 笔 / 手指）；
 * 「多选」档就是「把笔的默认搬到鼠标上」，笔的设备上它默认开着（tool-config.ts）。Alt 不算减选（它留给「点边选环」；移动复制照旧认 Alt，那是 copy 的事）。
 */
export function selModeOf(ctx: ToolCtx, ev: ToolPointer, box: boolean | "lasso"): SelMode {
  if (ev.copy && !ev.altKey) return "remove";
  const gesture = box === "lasso" ? "lasso" : box ? "box" : "click";
  return ev.shiftKey || multiSelect(ctx) ? BOOLEAN_DEFAULT.pen[gesture] : BOOLEAN_DEFAULT[deviceOf("mouse")][gesture];
}

/** 点一下（第 n 下）：和选择工具同一套（见文件头）。 */
export function clickSelect(ctx: ToolCtx, ev: ToolPointer, n: number): void {
  const view = ctx.live(), mode = selModeOf(ctx, ev, false);
  const hit = ctx.pick(ev.x, ev.y, { kinds: pickKinds(ctx) });
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
/** 框选 / 套索：区域里的点（自由建模，FM139）/ 边 / 面 / 子物体 / 空组件 / 参考点（参考线无限长、框选会全中，不收）。区域 = 框或套索（marquee.ts ScreenArea），遮挡同一套。 */
export function boxSelect(ctx: ToolCtx, box: ScreenArea, mode: SelMode): void {
  const view = ctx.live(), picked = ctx.marqueePick(box), inArea = areaTest(box);
  const verts: number[] = [], edges: number[] = [], faces: number[] = [];
  const pools = new Map<string, Parameters<ToolCtx["enterPool"]>[0]>();
  for (const gid of picked.verts) { const c = ctx.classify(view, { vertex: gid }); if (c.kind === "entity" && c.local.vertex !== undefined) verts.push(c.local.vertex); else if (c.kind === "pool") pools.set(c.key, c.pick); }
  for (const gid of picked.edges) { const c = ctx.classify(view, { edge: gid }); if (c.kind === "entity" && c.local.edge !== undefined) edges.push(c.local.edge); else if (c.kind === "pool") pools.set(c.key, c.pick); }
  for (const gid of picked.faces) { const c = ctx.classify(view, { face: gid }); if (c.kind === "entity" && c.local.face !== undefined) faces.push(c.local.face); else if (c.kind === "pool") pools.set(c.key, c.pick); }
  for (const em of ctx.emptiesIn(box)) pools.set(em.key, em.pick);   // 空组件（导入的空节点）：标记的原点在框里
  const K = pickKinds(ctx);   // 拾取范围：关掉的那一级框不到
  if (K) { if (!K.verts) verts.length = 0; if (!K.edges) edges.length = 0; if (!K.faces) faces.length = 0; }
  const vp = ctx.vp(), guides = view.guides().points.filter((q) => { const s2 = ctx.frame().project?.(q.p, vp); return !!s2 && inArea(s2); }).map((q) => q.id);
  ctx.replaceSelection({ verts, edges, faces, pools: [...pools.values()], guides }, mode);
  ctx.afterSelect();
}

/** 拖框 / 套索：按下记起点；拖过点按容差才出框（套索 = 开始记轨迹）；松手 = 框选 / 套索选（没拖出去 = 什么都不做，那是「点」，归 clickSelect）。
 *  框还是套索 = 选择工具的选项「空处拖」（tool-config.ts select.drag；账本 UX5「套索要进 0.16」），按下那一刻读定。 */
export class BoxDrag {
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private lasso: { x: number; y: number }[] | null = null;
  active(): boolean { return this.start !== null; }
  begin(ev: { x: number; y: number }, ctx?: ToolCtx): void {
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y };
    this.lasso = ctx && ctx.config.get("select", "drag") === "lasso" ? [{ x: ev.x, y: ev.y }] : null;
  }
  /** 跟手（在拖框 = true）。 */
  track(ctx: ToolCtx, s: { x: number; y: number }): boolean {
    if (!this.start) return false;
    this.cur = { x: s.x, y: s.y };
    if (this.lasso) {   // 套索：轨迹点隔 3 px 记一个（笔 / 鼠标的事件密度不一样，别让一圈几千个点）
      const last = this.lasso[this.lasso.length - 1];
      if (Math.hypot(s.x - last.x, s.y - last.y) >= 3) this.lasso.push({ x: s.x, y: s.y });
      ctx.lasso(ctx.moved(s) <= ctx.tapSlop() && this.lasso.length < 3 ? null : this.lasso);
      return true;
    }
    if (ctx.moved(s) <= ctx.tapSlop()) { ctx.marquee(null); return true; }   // 还在点按容差里：不出框（笔跟进的那一下滑一点不闪小框）
    const b = this.box()!;
    ctx.marquee({ x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY });
    return true;
  }
  /** 松手：框选 / 套索选（按这一下的修饰键 / 两档定怎么合；套索的默认布尔照 stance.ts BOOLEAN_DEFAULT.lasso）。 */
  finish(ctx: ToolCtx, ev: ToolPointer): void {
    if (ev.x !== undefined) this.cur = { x: ev.x, y: ev.y };
    const b = this.box(), lasso = this.lasso;
    if (lasso && ev.x !== undefined) lasso.push({ x: ev.x, y: ev.y });
    this.cancel(ctx);
    if (lasso) { if (lasso.length >= 3) boxSelect(ctx, { pts: lasso }, selModeOf(ctx, ev, "lasso")); return; }
    if (b) boxSelect(ctx, b, selModeOf(ctx, ev, true));
  }
  cancel(ctx?: ToolCtx): void { this.start = this.cur = null; this.lasso = null; ctx?.marquee(null); ctx?.lasso(null); }
  private box(): ScreenBox | null {
    const a = this.start, c = this.cur;
    return a && c ? { minX: Math.min(a.x, c.x), maxX: Math.max(a.x, c.x), minY: Math.min(a.y, c.y), maxY: Math.max(a.y, c.y) } : null;
  }
}

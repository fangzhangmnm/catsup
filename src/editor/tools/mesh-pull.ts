// tools/mesh-pull.ts —— 自由建模工作台的「挤出」（硬表面的推拉键；网格体）。created 2026-10-27 by Claude Opus 5.5
// user 10-27 深夜：「默认垂直」（边 / 点）、左柱在自由建模里叫「挤出」（「或者叫挤出也行，更标准」）；挤完要不要自动进挪 = 连击系统，user 自己想（纪元账本 FM110）。
// 设计稿 §2-2 + 纪元账本 FM14 / FM15 / FM25：和硬表面推拉同一个工具 id、同一套「点几下」语法；差在**总是长新几何**（= SU 推拉的 Ctrl 档）、不推断。
//   · 面：沿法向（选了几张面 = 区域一起挤、内部边不长，方向 = 法向平均），拖多少走多少（沿法向在屏幕上的投影量）；正对着面时法向投影没长度 → 按屏幕竖直方向（往上 = 往外）。
//   · 边 / 点：**屏幕空间自由拖**（2026-10-28 晚 user「如果没有面的话，是边或者点，那么E是screen space，这个是blender的手感」；之前 10-27「默认垂直」被这句取代）；
//     沿各自的垂直方向 = 拖手柄的中心（每个新点沿它源点的方向走：边界边 = 它那张面的法向、内部边 = 两侧平均、孤立的 = +Z；mesh/ops/extrude.ts extrudeNormalDirs）。
//   · 操纵手柄（2026-10-30，tools/mesh-handles.ts「pull」家 = 三根箭头 + 中心）：点第二下（选中以后再点它）弹；拖箭头 = 沿那根轴挤；拖中心 = 换一种拖法
//     （面 = 屏幕平面随手拖、边 / 点 = 沿各自的垂直方向——以前按住 Shift 的那种，gizmo 设计稿 §3「挤出的 Shift = 自由拖 → 改成手柄中心」）。
//   · Shift = 吸附反过来（和移动同一套：点 > 边 > 面，tools/mesh-snap.ts；底 = ctx.snapBase()）：抓住的那个点落到目标上，再按这一下的方向约束投影。
//   · 右键 = 原地留下（user 10-28 晚「E之后右键是创作了面但是在原来的位置上可以切g」）：挤出 0、新长出来的成为选区，接着 G 挪；Esc = 什么都不留。
//   · 锁轴（方向键）对三种都管：沿那根轴拉。做完新长出来的东西就是选区（FM14「做完的东西留在选区里，接着挪」）：面 = 顶上那几张、边 = 新的那排边、点 = 新点。
//   · 提交 = 一条 meshExtrude（挤出 + 平移一起；重放确定：同一份内核 → 同一批新 id）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { extrudeAndOffset, extrudeAlongNormals, extrudeNormalDirs } from "../../mesh/ops/index.ts";
import { add3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyNormal, applyPt, invert } from "../../scene/xform.ts";
import { fmtLen } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import { BoxDrag, adoptPress, clickSelect, pressTarget, selectionTarget, type Target as SelTarget } from "./selecting.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { SnapKind } from "../solver.ts";
import type { ViewState } from "../view-state.ts";
import { type Grip, MeshHandles } from "./mesh-handles.ts";
import { meshSnapTarget } from "./mesh-snap.ts";

type Target = { faces: number[]; edges: number[]; verts: number[] };

export class MeshPullTool implements ToolHandler {
  readonly tool = "pp" as const;
  readonly grammar = "steps" as const;
  /** 手势中打的数 = 挤出多长（Blender「E 0.5」；读法 = units.ts）。 */
  readonly typedQuantity = { q: "length" as const };
  readonly lock = "axis" as const;
  private t: Target | null = null;
  /** 按在选区外的东西上：落定时选区换成它（selecting.ts adoptPress；账本 UX30）。 */
  private adopt: SelTarget["adopt"] | null = null;
  /** 按下时有没有选区（user 10-27：一开始没选区 = SU 手感，做完还是没选区、接着挑下一个「受害者」；一开始有选区才留选区）。 */
  private hadSel = false;
  private pivotW: Pt3 | null = null;
  private nW: Pt3 | null = null;     // 量拖动量的方向（世界、单位长）：面 = 法向平均；边 / 点 = 各点「垂直」方向的平均；抵消了 = null（屏幕竖直兜底）
  private alongScale = 1;            // 边 / 点：世界长度 / 本地长度（组件被缩放过时）
  private grabW: Pt3 | null = null;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;

  /** 没选区又按在空处 = 拖框（「会选的工具」，selecting.ts）。 */
  private box = new BoxDrag();
  private readonly handles = new MeshHandles("pull");
  /** 这一下按在哪个把手上（null = 没按在把手上）。 */
  private grip: Grip | null = null;
  /** 被挤的源点（吸附不吸它们）；抓住的那个点（离按下处最近的源点，世界）——吸附时是它落到目标上。 */
  private src = new Set<number>();
  private handleW: Pt3 | null = null;
  private snapT: { p: Pt3; kind: SnapKind } | null = null;
  /** 点一下 = 选（同选择工具），只有拖才挤出（user 10-27）。点中选着的不改选区、选到东西就弹手柄；点在把手上没拖 = 不动。 */
  tap(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.handles.grip(ctx, ev)) { ctx.hint(this.handles.cycleOrient(ctx)); return; }   // 点手柄（没拖）= 换朝向
    const r = clickSelect(ctx, ev, ctx.clicks(), { keepOnSelection: true });
    ctx.hint(this.handles.afterTap(ctx, ev, r === "onSelection"));   // 点第二下 = 手柄（mesh-handles.ts）
  }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { this.handles.hover(ctx, s); }
  stripGroups(cfg: ToolCtx["config"]): readonly { group: string; keys?: readonly string[] }[] { return cfg.get("handles", "show") ? [{ group: "handles", keys: ["orient"] }] : []; }   // 朝向只在手柄出来时露
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    const mv = this.t ? this.motion(ctx) : null, o = this.pivotW;
    const origin = mv && o ? (mv.along !== undefined ? (this.nW ? add3(o, scale3(this.nW, mv.along)) : o) : add3(o, mv.off)) : null;   // 拖着的时候手柄跟着挤出去的那头走
    return this.handles.view(ctx, this.t ? { origin, id: this.grip?.id ?? null } : null);
  }
  active(): boolean { return this.t !== null || this.box.active(); }
  startModal(ctx: ToolCtx, s: { x: number; y: number }): boolean {   // Blender 的 G / R / S / E：光标处起手、跟着鼠标走（移动工具本身 = Blender 的 tweak，另一回事；user 10-27）
    const sel = ctx.selection();
    if (!(sel.faces.size || sel.edges.size || sel.verts.size)) return false;
    this.down(ctx, ctx.keyboardStart(s));
    return this.active();
  }

  cancel(): void { this.box.cancel(); this.t = null; this.adopt = null; this.pivotW = this.nW = this.grabW = null; this.start = this.cur = null; this.grip = null; this.src = new Set(); this.handleW = null; this.snapT = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshPull: { t: this.t, start: this.start, cur: this.cur } }; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.box.active()) { this.box.finish(ctx, ev); return; }   // 拖框松手
    if (this.active()) { this.commit(ctx); return; }
    const m = ctx.mesh();
    // 按下作用在什么上 = selecting.ts（没选区只认面：点和边不挡路，小面也按得到；挤边 / 点 = 先选中它们。纪元账本 FM165）；挤什么 = 这里：面 > 边 > 点
    const grip = ev.start !== "keyboard" ? this.handles.grip(ctx, ev) : null;   // 按在把手上 = 对选区做（把手下面压着别的东西也不换目标）
    const p = (grip ? selectionTarget(ctx) : null) ?? pressTarget(ctx, ev, this.tool);
    if (p === "box") { this.hadSel = false; this.box.begin(ev, ctx); ctx.hint("框选（挤出工具里：没选东西时在空处拖 = 框；挤边 / 点 = 框住它们再拖）"); return; }   // user 10-28「其他的同理」
    this.hadSel = p.fromSelection; this.adopt = p.adopt ?? null;
    const t: Target = p.faces.length ? { faces: p.faces, edges: [], verts: [] } : p.edges.length ? { faces: [], edges: p.edges, verts: [] } : { faces: [], edges: [], verts: p.verts };
    if (!(t.faces.length || t.edges.length || t.verts.length)) { ctx.hint("挤出：直接在面上按下；要挤边 / 点，先选中它们"); return; }
    const X = ctx.ctxXform(), vs = new Set<number>();
    for (const f of t.faces) for (const v of m.faceVerts(f)) vs.add(v);
    for (const e of t.edges) { vs.add(m.edgeA[e]); vs.add(m.edgeB[e]); }
    for (const v of t.verts) vs.add(v);
    let c0 = { x: 0, y: 0, z: 0 };
    for (const v of vs) c0 = add3(c0, m.pt(v));
    this.t = t; this.grip = grip; this.src = vs; this.snapT = null;
    this.pivotW = applyPt(X, scale3(c0, 1 / vs.size));
    { const vp = ctx.vp(); let best = Infinity; this.handleW = null; for (const v of vs) { const w = applyPt(X, m.pt(v)), q = ctx.frame().project?.(w, vp); const d = q ? Math.hypot(q.x - ev.x, q.y - ev.y) : Infinity; if (d < best) { best = d; this.handleW = w; } } }
    if (t.faces.length) { let n = { x: 0, y: 0, z: 0 }; for (const f of t.faces) n = add3(n, m.faceNormal(f)); this.nW = len3(n) > 1e-12 ? normalize3(applyNormal(X, normalize3(n))) : null; this.alongScale = 1; }
    else {
      let n = { x: 0, y: 0, z: 0 }; for (const d of extrudeNormalDirs(m, t).values()) n = add3(n, d);
      const w = len3(n) > 1e-9 ? applyDir(X, normalize3(n)) : null;
      this.nW = w && len3(w) > 1e-12 ? normalize3(w) : null; this.alongScale = w ? len3(w) || 1 : len3(applyDir(X, { x: 0, y: 0, z: 1 })) || 1;
    }
    this.grabW = this.onPlane(ctx, ev.x, ev.y) ?? this.pivotW;
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y };
    ctx.setAnchor(this.grabW); ctx.setCursor(this.grabW);
    const how = grip ? (grip.id === "mc" ? (t.faces.length ? "手柄中心：屏幕平面随手拖" : "手柄中心：沿各自的垂直方向") : `手柄：${grip.say}`) : t.faces.length ? "沿法向拖" : "屏幕平面随手拖";
    ctx.hint(`挤出 ${this.what()}：${how}，松手或点第二下落定；右键 = 原地留下接着 G；方向键锁轴；${ctx.snapBase() ? "吸附：点 > 边 > 面，Shift = 反过来" : "按住 Shift = 吸附（点 > 边 > 面）"}`);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.box.track(ctx, s) || !this.active()) return;
    this.cur = { x: s.x, y: s.y };
    const p = this.onPlane(ctx, s.x, s.y);
    if (p) ctx.setCursor(p);
    this.snapT = ctx.snapBase() !== ctx.mods().shift ? meshSnapTarget(ctx, s, this.src) : null;   // 吸 = 底 XOR Shift（和移动同一套）
    ctx.setSnap(this.snapT ? { p: this.snapT.p, kind: this.snapT.kind } : null);
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const t = this.t, mv = this.motion(ctx);
    if (!t || !mv) return "";
    const X = ctx.ctxXform();
    if (mv.along !== undefined) { const d = mv.along / this.alongScale; run((m) => { extrudeAlongNormals(m, t, d); }); return `挤出 ${fmtLen(Math.abs(mv.along))}`; }
    const offL = applyDir(invert(X), mv.off);
    run((m) => { extrudeAndOffset(m, t, offL); });
    return `挤出 ${fmtLen(len3(mv.off))}`;
  }

  /** 当前拖动 → 世界位移（off：面、或锁了轴 / 面）或沿各点垂直方向的世界长度（along：边 / 点、没锁）。 */
  private motion(ctx: ToolCtx): { off: Pt3; along?: undefined } | { along: number; off?: undefined } | null {
    const pivot = this.pivotW, grab = this.grabW, s0 = this.start, s1 = this.cur, t = this.t;
    if (!pivot || !grab || !s0 || !s1 || !t) return null;
    // 锁：键盘锁轴 / 锁面 > 这一下按着的手柄箭头 > 不锁；吸附 = 抓住的点落到目标上（再按方向约束投影）
    const kAx = ctx.axisLockDir(), kPn = ctx.planeLockNormal(), keyed = !!(kAx || kPn), ax = keyed ? kAx : this.grip?.axis ?? null, pn = keyed ? kPn : this.grip?.plane ?? null;
    const now = this.onPlane(ctx, s1.x, s1.y) ?? grab, d = this.snapT && this.handleW ? sub3(this.snapT.p, this.handleW) : sub3(now, grab), typed = ctx.typed();
    if (typed !== null) {   // 打了数：锁着轴 = 沿轴这么长；面 = 沿法向；边 / 点 = 沿各自垂直方向
      if (ax) return { off: scale3(ax, typed) };
      if (t.faces.length) return { off: scale3(this.nW ?? { x: 0, y: 0, z: 1 }, typed) };
      return { along: typed };
    }
    if (ax) return { off: scale3(ax, dot3(d, ax)) };
    if (pn) return { off: sub3(d, scale3(pn, dot3(d, pn))) };
    // 面：默认沿法向，拖手柄中心 = 屏幕平面随手拖；边 / 点：默认屏幕平面随手拖（Blender 手感，user 10-28 晚），拖手柄中心 = 沿各自的垂直方向。
    const flip = this.grip?.id === "mc", free = t.faces.length ? flip : !flip;
    if (free) return { off: d };
    const amt = this.snapT && this.nW ? dot3(d, this.nW) : this.amountAlong(ctx, s0, s1);   // 吸到了 = 沿方向走到目标那么高
    if (t.faces.length) return this.nW ? { off: scale3(this.nW, amt) } : { off: { x: 0, y: 0, z: 0 } };
    return { along: amt };
  }
  /** 沿 nW 拖了多少（世界长度）：nW 在屏幕上的投影够长 = 拖动在它上面的分量；正对着 / 抵消了 = 屏幕往上 = 正。 */
  private amountAlong(ctx: ToolCtx, s0: { x: number; y: number }, s1: { x: number; y: number }): number {
    const pivot = this.pivotW!, grab = this.grabW!, ds = { x: s1.x - s0.x, y: s1.y - s0.y };
    if (this.nW) {
      const vp = ctx.vp(), fr = ctx.frame(), a = fr.project?.(pivot, vp), b = fr.project?.(add3(pivot, this.nW), vp);   // 方向上 1 m 在屏幕上多长
      if (a && b) { const u = { x: b.x - a.x, y: b.y - a.y }, uu = u.x * u.x + u.y * u.y; if (Math.sqrt(uu) >= 8) return (ds.x * u.x + ds.y * u.y) / uu; }
    }
    const up = this.onPlane(ctx, s0.x, s0.y - 1);   // 屏幕往上 1 px = 世界多长
    return -ds.y * (up ? len3(sub3(up, grab)) : 0);
  }

  /** 右键 = 原地留下（Blender E 然后右键）：挤出 0——几何长出来叠在原地，新长出来的成为选区，接着 G 挪。 */
  commitInPlace(ctx: ToolCtx): void {
    const t = this.t, what = this.what(), adopt = this.adopt;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    if (!t) return;
    const def = ctx.activePool().def, sel = t.faces.length ? { faces: t.faces } : t.edges.length ? { edges: t.edges } : { verts: t.verts };
    const probe = ctx.mesh().clone(), r = extrudeAndOffset(probe, t, { x: 0, y: 0, z: 0 });
    adoptPress(ctx, adopt);
    ctx.commitOp({ op: "meshExtrude", def, ...sel, offset: { x: 0, y: 0, z: 0 } });
    const m = ctx.mesh();
    if (t.faces.length) ctx.setSelection({ faces: t.faces.filter((f) => m.hasF(f)) });
    else if (t.edges.length) ctx.setSelection({ edges: t.edges.map((e) => m.edgeOf(r.newVerts.get(probe.edgeA[e])!, r.newVerts.get(probe.edgeB[e])!)).filter((e) => e >= 0) });
    else ctx.setSelection({ verts: [...r.newVerts.values()].filter((v) => m.hasV(v)) });
    ctx.hint(`原地挤出了 ${what}（叠在原来的位置上，新长出来的在选区里）：按 G 或者用移动工具挪开`);
  }
  private commit(ctx: ToolCtx): void {
    const t = this.t, mv = this.motion(ctx), what = this.what(), scaleL = this.alongScale, hadSel = this.hadSel, adopt = this.adopt;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    if (!t || !mv) return;
    const amount = mv.along !== undefined ? Math.abs(mv.along) : len3(mv.off);
    if (amount < 1e-6) { ctx.hint("挤出：没动（挤出 0 会长出叠在一起的面，不做）"); return; }
    const def = ctx.activePool().def, sel = t.faces.length ? { faces: t.faces } : t.edges.length ? { edges: t.edges } : { verts: t.verts };
    const how = mv.along !== undefined ? { along: mv.along / scaleL } : { offset: applyDir(invert(ctx.ctxXform()), mv.off) };
    const probe = ctx.mesh().clone(), r = how.along !== undefined ? extrudeAlongNormals(probe, t, how.along) : extrudeAndOffset(probe, t, how.offset);   // 先在副本上跑一遍拿新 id（提交 = 同一份内核 + 同一组参数 = 同一批 id）
    adoptPress(ctx, adopt);
    ctx.commitOp({ op: "meshExtrude", def, ...sel, ...how });
    const m = ctx.mesh();
    if (!hadSel) { ctx.hint(`挤出了 ${what}（${fmtLen(amount)}）`); return; }   // 没选区开始的 = 做完也不留选区（SU 手感，接着点下一个）
    if (t.faces.length) ctx.setSelection({ faces: t.faces.filter((f) => m.hasF(f)) });
    else if (t.edges.length) ctx.setSelection({ edges: t.edges.map((e) => m.edgeOf(r.newVerts.get(probe.edgeA[e])!, r.newVerts.get(probe.edgeB[e])!)).filter((e) => e >= 0) });
    else ctx.setSelection({ verts: [...r.newVerts.values()].filter((v) => m.hasV(v)) });
    ctx.hint(`挤出了 ${what}（${fmtLen(amount)}）；新长出来的留在选区里，接着可以移动 / 缩放`);
  }

  private what(): string { const t = this.t; return !t ? "" : t.faces.length ? `${t.faces.length} 张面` : t.edges.length ? `${t.edges.length} 条边` : `${t.verts.length} 个点`; }
  /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。 */
  private onPlane(ctx: ToolCtx, x: number, y: number): Pt3 | null {
    const pivot = this.pivotW;
    if (!pivot) return null;
    const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp), n = normalize3(ctx.frame().ray(ps?.x ?? x, ps?.y ?? y, vp).dir), ray = ctx.frame().ray(x, y, vp);
    return rayPlane(ray.origin, ray.dir, n, dot3(n, pivot));
  }
}

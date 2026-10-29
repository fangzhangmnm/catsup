// tools/transform.ts —— 变换工具（Transform）：direct 语法。和移动 / 旋转 / 缩放工具并列的一个单独工具（user 2026-10-26「变换还是接不住move rotate scale的，算作一个单独的吧」
// 「所以transform就是知道倍数和角度，然后rotate scale就是基于对齐的」）——知道要动多少（距离 / 角度 / 倍数，拖完在数值小窗里输）就用它；要对齐就用那三个。
//   · 中心点 = 移动，按移动工具的逻辑吸附（就是移动工具在代驾，user「变换的中间应该有一个可以拖动的点，就类似move的snapping」）；按住已选中的东西拖 = 同样是移动（「所以变换按住拖动就几乎等于move吧」）；
//   · 三根箭头 = 沿轴移动（吸到点 = 那点投到轴上；格点吸附开着 = 整格）；三个环 = 绕轴转（格点吸附开着 = 15°）；
//   · 轴上的小方块 = 沿那根轴缩放，中心右上方的方块 = 等比缩放（咬 −1 / 0.5 / 1 / 1.5 / 2 / 3 / 4）；
//   · 点空处 / 框选 = 换选区（同选择工具）；右下「选变换中心」= 拾一个临时变换中心（吸附照常，选区一变就作废）；变换中心选项 = 包围盒中心 / 顶点平均 / 最后选的物体原点；
//   · 按住 Ctrl 或开着「复制」= 复制；数值小窗：移动 / 缩放能 *n /n 阵列；转 / 缩之后右下「刚才：」能换变换中心重做。
// 全部透视画、透视拾；箭头 / 环 / 方块的纯数学在 transform-gizmo.ts。created 2026-10-24 by Claude Fable 5.1（原缩放工具）；2026-10-26 重写成单独的变换工具 by Claude Opus 5.5
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3, VertexId } from "../../kernel/kernel.ts";
import { add3, dot3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { cameraPlane, drawPlaneAt, rectFirstPlane, type SnapKind } from "../pick.ts";
import { applyDir, applyPt, rotationAbout, scalingAbout, scalingAlong, scalingAlongAxes, translation, type Xform } from "../../scene/xform.ts";
import { moveTargetsSelection, unwrapAngle } from "../tools.ts";
import { INCREMENT_DEG, nearestStep } from "../increments.ts";
import { type XformGizmo, type XformGrab, type XformHandle, XG_UNIFORM_OFFSET_PX, axisOf, dragMove, dragRotate, dragScale, grabXform, hitXformGizmo, isPlaneHandle, planeAxes, xformGizmoGeom } from "../transform-gizmo.ts";
import { fmtDeg, fmtLen } from "../units.ts";
import { MIN_GESTURE_LEN, SNAP_LABELS } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
import { pickHandle } from "../handle-pick.ts";
import { MoveTool } from "./move.ts";
import { SelectTool } from "./select.ts";

/** 缩放咬合的倍率（−1 = 过了变换中心 = 镜像）。 */
const SCALE_SNAPS = [-1, 0.5, 1, 1.5, 2, 3, 4];
/** 移动箭头「从点」：吸到这些点类 = 那点投到轴上（SU 轴向移动同款）。 */
// 不收格点：格点是光标所在斜平面上的点，投回轴上是个怪数；箭头拖动的格子 = 从抓点量整格（下面 trackMove）
const POINT_KINDS: ReadonlySet<string> = new Set(["endpoint", "midpoint", "center", "intersection", "guide-point", "pool-origin", "origin"]);
type PivotMode = "auto" | "bbox" | "mean" | "active";
type Pick = { kind: "gizmo"; handle: XformHandle } | { kind: "center" };

export class TransformTool implements ToolHandler {
  readonly tool = "transform" as const;
  readonly grammar = "direct" as const;
  private mode: "move" | "rotate" | "scale" | "center" | "select" | null = null;
  private grab: XformGrab | null = null;
  /** 拖中心点 / 拖选区（移动代驾）开始时的手柄：拖动中跟着走，不重算（重算时在手里的组件不算数，「自动」会跳回包围盒中心）。 */
  private centerG: XformGizmo | null = null;
  private dist = 0;
  private angle = 0;
  private factor = 1;
  private copy = false;
  private mv = new Set<VertexId>();
  /** 悬停 / 拖着的把手（高亮）：XformHandle 或 "mc"（中心点）。 */
  private hot: string | null = null;
  /** 代驾：中心点 / 拖已选中的东西 = 移动工具；点空处 / 框选 = 选择工具。 */
  private readonly mover = new MoveTool();
  private readonly selector = new SelectTool();
  /** 按在已选中的东西上开的移动：松手前没动 = 其实是点一下 → 退回选择（点击族照常）。 */
  private fromHit: ToolPointer | null = null;
  /** 临时变换中心（右下「选变换中心」拾的点）与当时的选区签名：选区一变就作废。 */
  private tempPivot: Pt3 | null = null;
  private tempSig = "";
  /** 正在等用户点一下定变换中心。 */
  picking = false;
  /** 抓的时候四种变换中心（马后炮换变换中心重做用）。 */
  private pivotsAtGrab: Partial<Record<PivotMode | "picked", Pt3>> = {};

  active(): boolean { return this.mode !== null; }
  cancel(): void {
    if (this.mode === "center") this.mover.cancel();
    if (this.mode === "select") this.selector.cancel();
    this.mode = null; this.grab = null; this.centerG = null; this.dist = 0; this.angle = 0; this.factor = 1; this.copy = false; this.mv = new Set(); this.fromHit = null; this.picking = false;
  }
  sample(): Record<string, number> { return { mt: this.dist, ra: this.angle, sf: this.factor }; }
  describe(ctx?: ToolCtx): Record<string, unknown> { return { transform: { mode: this.mode, handle: this.grab?.handle ?? null, dist: this.dist, angle: this.angle, factor: this.factor, copy: this.copy, picking: this.picking, tempPivot: this.tempPivot, ...(this.mode === "center" && ctx ? { move: this.mover.describe(ctx) } : {}) } }; }

  // ---------- 右下面板的两个钮（main.ts 经 editor.toolHandler 调） ----------
  /** 「选变换中心」：下一下点 = 临时变换中心（再按一次 = 不选了）。 */
  startPickPivot(): void { this.picking = !this.picking; }
  clearPivot(): void { this.tempPivot = null; this.picking = false; }
  get hasTempPivot(): boolean { return this.tempPivot !== null; }

  // ---------- 变换中心 / gizmo ----------
  /** 选区签名（便宜的那种：数量 + id 和 + 组 / 组件键）：临时变换中心跟着选区走，选区一变就作废。 */
  private static selSig(ctx: ToolCtx): string {
    const sel = ctx.selection();
    let fs = 0, es = 0, vs = 0;
    for (const f of sel.faces) fs += f;
    for (const e of sel.edges) es += e;
    for (const v of sel.verts) vs += v;
    return `${sel.faces.size}:${fs}|${sel.edges.size}:${es}|${sel.verts.size}:${vs}|${ctx.movablePoolPicks(false).map((p) => (p.kind === "group" ? `g${p.group}` : `i${p.instance}`)).join(",")}`;
  }
  private pivotMode(ctx: ToolCtx): PivotMode { return ctx.config.get("transform", "pivot") as PivotMode; }
  /** 现在的变换中心：临时变换中心（选区没变）> 变换中心选项。 */
  private pivotNow(ctx: ToolCtx): Pt3 | null {
    if (this.tempPivot && TransformTool.selSig(ctx) !== this.tempSig) this.tempPivot = null;
    return this.tempPivot ?? ctx.pivotOf(this.pivotMode(ctx));
  }
  private gizmo(ctx: ToolCtx): XformGizmo | null {
    if (!ctx.hasSelection()) return null;
    const o = this.pivotNow(ctx);
    if (!o) return null;
    const F = ctx.orientFrame();   // 只选一个组 / 组件 = 它自己的轴（沿它缩放不会斜切），否则上下文的轴（2026-10-26）
    return { origin: o, axes: { x: F.x, y: F.y, z: F.z } };
  }
  /** 屏幕把手：中心点（变换中心的投影）和等比缩放块（中心右上方）。 */
  private screenHandles(ctx: ToolCtx, g: XformGizmo): { center: { x: number; y: number }; uniform: { x: number; y: number } } | null {
    const q = ctx.frame().project?.(g.origin, ctx.vp());
    return q ? { center: q, uniform: { x: q.x + XG_UNIFORM_OFFSET_PX, y: q.y - XG_UNIFORM_OFFSET_PX } } : null;
  }
  /** 光标下是哪个把手：中心点 / 等比块 / 单轴块 / 箭头先比（屏距最近，叠在一起离相机近的赢），都不在圈里才看环。 */
  private pickAt(ctx: ToolCtx, sx: number, sy: number): Pick | null {
    const g = this.gizmo(ctx);
    if (!g) return null;
    const pts: (Pick & { d: number; z: number })[] = [], rings: (Pick & { d: number; z: number })[] = [];
    const sh = this.screenHandles(ctx, g);
    if (sh) {
      pts.push({ kind: "center", d: Math.hypot(sh.center.x - sx, sh.center.y - sy), z: -1 });
      pts.push({ kind: "gizmo", handle: "su", d: Math.hypot(sh.uniform.x - sx, sh.uniform.y - sy), z: -1 });
    }
    for (const c of hitXformGizmo(g, ctx.frame(), ctx.vp(), sx, sy)) (c.handle[0] === "r" ? rings : pts).push({ kind: "gizmo", handle: c.handle, d: c.d, z: c.z });
    const i = pickHandle(pts, ctx.eps().hit);
    if (i >= 0) return pts[i];
    const j = pickHandle(rings, ctx.eps().hit);
    return j < 0 ? null : rings[j];
  }
  private static hotOf(p: Pick | null): string | null { return p ? (p.kind === "center" ? "mc" : p.handle) : null; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.picking) { ctx.hoverSnap(s); ctx.hint("点一下定临时变换中心（吸附照常，网格开着也吸格点；再按「选变换中心」= 不选了）"); return; }
    if (this.mode) return;
    this.hot = ctx.hasSelection() ? TransformTool.hotOf(this.pickAt(ctx, s.x, s.y)) : null;
  }

  // ---------- 手势 ----------
  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.picking) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.tempPivot = r.snap.p; this.tempSig = TransformTool.selSig(ctx); this.picking = false;
      ctx.setSnap(null);
      ctx.hint(`临时变换中心定了${r.snap.kind ? `（${SNAP_LABELS[r.snap.kind] ?? r.snap.kind}）` : ""}：转 / 缩都绕它；换选区就作废`);
      return;
    }
    this.copy = !!ev.copy || ctx.config.get("transform", "copy");
    const p = ctx.hasSelection() ? this.pickAt(ctx, ev.x, ev.y) : null;
    const g = this.gizmo(ctx);
    if (p && g) {
      this.hot = TransformTool.hotOf(p);
      if (p.kind === "center") {   // 中心点 = 移动工具代驾，锚点 = 变换中心
        if (this.mover.startAt(ctx, g.origin, this.copy)) { this.mode = "center"; this.centerG = g; ctx.hint(`${this.copy ? "复制" : "移动"}：和移动工具一样吸附；松手落定，之后能输距离 / 5x / /5`); }
        return;
      }
      this.grab = grabXform(g, p.handle, ctx.frame(), ctx.vp(), ev.x, ev.y);
      this.mode = p.handle[0] === "m" ? "move" : p.handle[0] === "r" ? "rotate" : "scale";
      this.dist = 0; this.angle = 0; this.factor = 1;
      this.mv = new Set(moveTargetsSelection(ctx.kernel(), ctx.selection()));
      const modes: PivotMode[] = ["auto", "bbox", "mean", "active"];
      this.pivotsAtGrab = {};
      for (const m of modes) { const q = ctx.pivotOf(m); if (q) this.pivotsAtGrab[m] = q; }
      if (this.tempPivot) this.pivotsAtGrab.picked = this.tempPivot;
      if (this.mode === "rotate" && !this.grab.dir0) { this.cancel(); ctx.hint("正对着圆环的侧面看，转不了：换个角度再拖"); return; }
      const ax = axisOf(p.handle).toUpperCase(), cp = this.copy ? "复制 · " : "";
      ctx.setCursor(this.mode === "move" ? add3(g.origin, scale3(this.grab.axis, this.grab.t0)) : g.origin);
      ctx.hint(this.mode === "move" ? `${cp}沿 ${ax} 轴移动：吸到点 = 对齐那点；输数字 = 精确距离` : this.mode === "rotate" ? `${cp}绕 ${ax} 轴转：格点吸附开着 = 15° 一档；输数字 = 精确角度`
        : `${cp}${p.handle === "su" ? "等比" : isPlaneHandle(p.handle) ? `在 ${planeAxes(p.handle).a.toUpperCase()}${planeAxes(p.handle).b.toUpperCase()} 面内（两轴一起）` : `沿 ${ax} 轴`}缩放（绕变换中心）：咬 −1 / 0.5 / 1 / 2…；输数字 = 精确倍率`);
      return;
    }
    // 没点在把手上：按在已选中的东西上 = 移动（同移动工具，锚点 = 按下的那点）；别处 = 选择（点 / 框）
    const view = ctx.live(), hit = ctx.pick(ev.x, ev.y), c = ctx.classify(view, hit);
    if (ctx.hasSelection() && this.inSelection(ctx, c)) {
      const anchor = hit.vertex !== undefined ? view.graph.pt(hit.vertex) : ctx.snap(view, ev.x, ev.y, { plane: drawPlaneAt(view, ctx.frame(), ctx.vp(), ev.x, ev.y), alignSources: ctx.alignSources(), hand: ctx.hand(view) }).p;
      const g0 = this.gizmo(ctx);
      if (this.mover.startAt(ctx, anchor, this.copy)) { this.mode = "center"; this.centerG = g0; this.fromHit = ev; return; }
    }
    this.mode = "select";
    this.selector.down(ctx, ev);
  }
  /** 命中的东西在选区里吗（散的面 / 边；组 / 组件按整体）。 */
  private inSelection(ctx: ToolCtx, c: ReturnType<ToolCtx["classify"]>): boolean {
    const sel = ctx.selection();
    if (c.kind === "entity") {
      if (c.local.vertex !== undefined) return moveTargetsSelection(ctx.kernel(), sel).includes(c.local.vertex);   // 选中的点，或选中的边 / 面上的点
      return (c.local.face !== undefined && sel.faces.has(c.local.face)) || (c.local.edge !== undefined && sel.edges.has(c.local.edge));
    }
    if (c.kind === "pool") { const p = c.pick; return ctx.movablePoolPicks(false).some((q) => (q.kind === "group" && p.kind === "group" && q.group === p.group) || (q.kind === "instance" && p.kind === "instance" && q.instance === p.instance)); }
    return false;
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    if (this.mode === "center") this.mover.track(ctx, s, travel);
    else if (this.mode === "select") this.selector.track(ctx, s);
    else if (this.mode === "move") this.trackMove(ctx, s);
    else if (this.mode === "rotate") this.trackRotate(ctx, s);
    else if (this.mode === "scale") this.trackScale(ctx, s);
  }
  /** 沿轴移动：① 吸到点 = 那点投到轴上；② 否则格点吸附开着 = 从抓点量整格（近才咬）。 */
  private trackMove(ctx: ToolCtx, s: { x: number; y: number }): void {
    const G = this.grab!, a = G.axis, grabPt = add3(G.g0.origin, scale3(a, G.t0)), ax = axisOf(G.handle);
    let t = dragMove(G, ctx.frame(), ctx.vp(), s.x, s.y);
    if (t === null) return;
    const view = ctx.live(), mv = this.mv;
    const sn = ctx.snap(view, s.x, s.y, { plane: cameraPlane(ctx.frame(), grabPt), anchor: grabPt, alignSources: ctx.alignSources(), hand: ctx.hand(view, (vid) => mv.has(vid), false) });
    let kind: SnapKind | null = null, label: string | undefined, at: Pt3 | null = null;
    if (sn.kind && POINT_KINDS.has(sn.kind)) { t = dot3(sub3(sn.p, grabPt), a); kind = sn.kind; at = sn.p; label = `${SNAP_LABELS[sn.kind] ?? sn.kind} → ${ax.toUpperCase()} 轴`; }
    else {
      const g = ctx.grid(), step = g.step / g.subdiv;
      if (g.on && step > 0) {
        const k = nearestStep(t, step);
        if (Math.abs(k) > 1e-9 && ctx.frame().distBetween(add3(grabPt, scale3(a, t)), add3(grabPt, scale3(a, k)), ctx.vp()) <= ctx.snapPx()) { t = k; kind = "increment"; label = `整格 ${fmtLen(Math.abs(k))}`; }
      }
    }
    this.dist = t;
    const cur = add3(grabPt, scale3(a, t));
    ctx.setCursor(cur);
    ctx.setSnap(kind ? { p: at ?? cur, kind, ...(label ? { label } : {}), hints: [{ a: grabPt, b: cur, axis: ax }, ...(at ? [{ a: at, b: cur, axis: "i" as const }] : [])] } : null);
  }
  /** 绕轴转（连续化，可以转过 180°）；格点吸附开着 = 15° 一档，近才咬。 */
  private trackRotate(ctx: ToolCtx, s: { x: number; y: number }): void {
    const G = this.grab!;
    const raw = dragRotate(G, ctx.frame(), ctx.vp(), s.x, s.y);
    if (raw === null) return;
    let ang = unwrapAngle(this.angle, raw), snapped = false;
    const ray = ctx.frame().ray(s.x, s.y, ctx.vp()), q = rayPlane(ray.origin, ray.dir, G.axis, dot3(G.axis, G.g0.origin));
    if (ctx.grid().on && q) {
      const step = (INCREMENT_DEG * Math.PI) / 180, k = Math.round(ang / step) * step;
      if (ctx.frame().distBetween(q, applyPt(rotationAbout(G.g0.origin, G.axis, k - ang), q), ctx.vp()) <= ctx.snapPx()) { ang = k; snapped = true; }
    }
    this.angle = ang;
    if (q) ctx.setCursor(q);
    ctx.setSnap(snapped && q ? { p: q, kind: "h-stop", label: fmtDeg(ang) } : null);
  }
  /** 缩放（绕变换中心）：单轴块 = 抓点沿轴的距离比（过了变换中心 = 负 = 镜像），等比块 = 屏距比；咬 −1 / 0.5 / 1 / 1.5 / 2 / 3 / 4（屏距近才咬）。 */
  private trackScale(ctx: ToolCtx, s: { x: number; y: number }): void {
    const G = this.grab!;
    let f = dragScale(G, ctx.frame(), ctx.vp(), s.x, s.y);
    if (f === null) return;
    if (Math.abs(f) < 1e-3) f = f < 0 ? -1e-3 : 1e-3;   // 不许缩到零（退化）
    let snapped = false;
    if (G.handle === "su") {
      const q = ctx.frame().project?.(G.g0.origin, ctx.vp());
      if (q) { const d = Math.hypot(q.x - s.x, q.y - s.y); for (const v of SCALE_SNAPS) if (v > 0 && Math.abs(d - v * G.t0) <= ctx.snapPx()) { f = v; snapped = true; break; } }
    } else {
      let bestD = ctx.snapPx();
      for (const v of SCALE_SNAPS) { const d = ctx.frame().distTo(s.x, s.y, add3(G.g0.origin, scale3(G.axis, v * G.t0)), ctx.vp()); if (d <= bestD) { bestD = d; f = v; snapped = true; } }
    }
    this.factor = f;
    const cur = G.handle === "su" ? G.g0.origin : add3(G.g0.origin, scale3(G.axis, f * G.t0));
    ctx.setCursor(cur);
    ctx.setSnap(snapped ? { p: cur, kind: "h-stop", label: `×${f}` } : null);
  }

  /** 当前预演的变换（世界系，绕抓的时候的变换中心）；中心点 / 选择 / 没在拖 → null。 */
  private xformOf(mode: "move" | "rotate" | "scale", G: XformGrab, v: { dist: number; angle: number; factor: number }, pivot: Pt3 = G.g0.origin): Xform {
    if (mode === "move") return translation(scale3(G.axis, v.dist));
    if (mode === "rotate") return rotationAbout(pivot, G.axis, v.angle);
    if (G.handle === "su") return scalingAbout(pivot, { x: v.factor, y: v.factor, z: v.factor });
    return isPlaneHandle(G.handle) ? scalingAlongAxes(pivot, this.scaleDirs(G), v.factor) : scalingAlong(pivot, G.axis, v.factor);
  }
  /** 缩放沿哪几根轴：单轴块 = 那一根；平面块 = 两根；等比块 = 空（三轴等比）。 */
  private scaleDirs(G: XformGrab): Pt3[] {
    if (G.handle === "su") return [];
    if (isPlaneHandle(G.handle)) { const { a, b } = planeAxes(G.handle); return [G.g0.axes[a], G.g0.axes[b]]; }
    return [G.axis];
  }
  private currentXform(): Xform | null {
    if (!this.grab || (this.mode !== "move" && this.mode !== "rotate" && this.mode !== "scale")) return null;
    return this.xformOf(this.mode, this.grab, { dist: this.dist, angle: this.angle, factor: this.factor });
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.mode === "center") return this.mover.live(ctx, run);
    const X = this.currentXform();
    if (!X) return "";
    const cp = this.copy ? "复制 · " : "", ents = this.copy ? { faces: [...ctx.selection().faces], edges: [...ctx.selection().edges] } : undefined;
    const idle = this.mode === "move" ? Math.abs(this.dist) < 1e-9 : this.mode === "rotate" ? Math.abs(this.angle) < 1e-9 : Math.abs(this.factor - 1) < 1e-9;
    if (!idle) ctx.previewXform(X, run, ents);
    return this.mode === "move" ? `${cp}移动 ${fmtLen(Math.abs(this.dist))}` : this.mode === "rotate" ? `${cp}旋转 ${fmtDeg(this.angle)}` : `${cp}缩放 ×${this.factor.toFixed(3)}`;
  }

  up(ctx: ToolCtx, ev: ToolPointer, settle: () => ToolSample | null): void {
    const mode = this.mode;
    if (!mode) return;
    if (mode === "select") { this.selector.up(ctx, ev, settle); this.mode = null; return; }
    if (mode === "center") {
      if (this.fromHit && ctx.moved(ev) <= ctx.tapSlop()) {   // 按在选中的东西上但没拖 = 点一下 → 选择工具的点击族
        const d = this.fromHit;
        this.mover.cancel(); ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
        this.mode = "select"; this.fromHit = null;
        this.selector.down(ctx, d); this.selector.up(ctx, ev, settle); this.mode = null;
        return;
      }
      const smp = settle();
      if (smp?.cursor3) ctx.setCursor(smp.cursor3);
      this.mover.finish(ctx);
      this.mode = null; this.fromHit = null; this.centerG = null;
      return;
    }
    const smp = settle(), G = this.grab!;
    const v = { dist: smp?.extra.mt ?? this.dist, angle: smp?.extra.ra ?? this.angle, factor: smp?.extra.sf ?? this.factor };
    const copy = this.copy, pivots = { ...this.pivotsAtGrab }, pivotUsed: PivotMode | "picked" = this.tempPivot ? "picked" : this.pivotMode(ctx);
    this.mode = null; this.grab = null; this.centerG = null; this.dist = 0; this.angle = 0; this.factor = 1; this.copy = false; this.mv = new Set();
    ctx.setCursor(null); ctx.setSnap(null);
    const idle = mode === "move" ? Math.abs(v.dist) < MIN_GESTURE_LEN : mode === "rotate" ? Math.abs(v.angle) < 1e-6 : Math.abs(v.factor - 1) < 1e-9;
    if (idle) return;
    const sel = ctx.selection(), entities = { faces: [...sel.faces], edges: [...sel.edges] };
    const k0 = ctx.kernel(), vids = moveTargetsSelection(k0, sel), pools = ctx.movablePoolPicks(false);
    const froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    /** 落一次（马后炮换变换中心重做也走这里）：普通 = 整体变换，复制 = 放一份副本；记成普通的移动 / 旋转 / 缩放一步（数值小窗能接着改）。 */
    const commitAt = (pivot: Pt3): void => {
      const n0 = ctx.opCount(), at0 = ctx.activePool(), X = this.xformOf(mode, G, v, pivot);
      if (copy) { const XL = ctx.xformToLocal(X); ctx.commitCopies([{ payload: ctx.copyPayload(XL, entities), XL }], pools, at0); }
      else ctx.commitXform(X, vids, pools);
      const ops = ctx.opCount() - n0;
      if (mode === "move") ctx.recordLast({ kind: "move", ops, at: at0, froms, pools, delta: scale3(G.axis, v.dist), copy, entities });
      else if (mode === "rotate") ctx.recordLast({ kind: "rotate", ops, at: at0, froms, pools, center: pivot, axis: G.axis, angle: v.angle, copy, entities, pivots: pv, pivotUsed });
      else ctx.recordLast({ kind: "scale", ops, at: at0, froms, pools, anchor: pivot, axis: null, f: { x: v.factor, y: v.factor, z: v.factor }, copy, entities, ...(G.handle === "su" ? {} : { dirs: this.scaleDirs(G) }), pivots: pv, pivotUsed });
    };
    // 转 / 缩之后右下「刚才：」能换变换中心 / 改复制重做（编辑器的移动类马后炮读 last 里的 pivots；user「transform能不能马后炮可以切换 pivot」「马后炮都能override」）
    const pv: Record<string, Pt3> = {};
    for (const [k, q] of Object.entries(pivots)) if (q) pv[k] = q;
    commitAt(G.g0.origin);
  }

  /** 箭头 / 环 / 方块 / 中心点，跟着预演实时动（拖着的时候在抓的那一刻的位置上叠当前变换）。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    let g: XformGizmo | null;
    if (this.mode === "center") { const a = ctx.anchor(), c = ctx.cursor(), g0 = this.centerG ?? this.gizmo(ctx); g = g0 && a && c ? { ...g0, origin: add3(g0.origin, sub3(c, a)) } : g0; }
    else if (this.grab && (this.mode === "move" || this.mode === "rotate" || this.mode === "scale")) {
      const X = this.currentXform()!, g0 = this.grab.g0;
      g = { origin: applyPt(X, g0.origin), axes: this.mode === "rotate" ? { x: applyDir(X, g0.axes.x), y: applyDir(X, g0.axes.y), z: applyDir(X, g0.axes.z) } : g0.axes };
    } else g = this.gizmo(ctx);
    if (!g) return { xformGizmo: null };
    const G = xformGizmoGeom(g, ctx.frame(), ctx.vp());
    // 等比块的世界位置：屏上中心右上方那一点，落在过变换中心、正对相机的平面上
    let uniform: Pt3 | null = null;
    const sh = this.screenHandles(ctx, g);
    if (sh) { const r = ctx.frame().ray(sh.uniform.x, sh.uniform.y, ctx.vp()), n = ctx.frame().viewDir(g.origin), q = rayPlane(r.origin, r.dir, n, dot3(n, g.origin)); uniform = q; }
    return { xformGizmo: { ...G, hot: this.hot, uniform } };
  }
}

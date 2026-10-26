// tools/transform.ts —— 变换工具（Transform）的手势模块：direct 语法。三样把手一起拾（屏距最近、叠在一起离相机近的赢）：
//   · 包围盒的缩放柄（角 = 等比、面心 = 单轴；×−1 咬合 = 镜像过去）；
//   · 三根移动箭头（沿上下文帧 X / Y / Z；吸到点 = 那点投到轴上，SU「从点」；格点吸附开着 = 整格）；
//   · 三个旋转环（绕那根轴转；格点吸附开着 = 15° 一档，离得近才咬）。
// 全部透视画、透视拾（user 2026-10-25「缩放的gizmos如果卡几何里面应该能点中」「以后有move rotate了也这样」）；柄 / gizmo 跟着预演实时动。
// 落定 = 普通的缩放 / 移动 / 旋转一步（数值小窗照常能输精确值 / 阵列）。箭头和环的纯数学在 transform-gizmo.ts。
// 2026-10-25 缩放 → 变换（user「或者其实scale改名就是move rotate scale全家？我们没必要学sketchup的麻烦的地方」「就叫transform」）；2026-10-26 加箭头 + 环。edited by Claude Opus 5.5
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）。柄每帧从选区包围盒重算（不再靠 rebuildScaleHandles 的触发点）。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3, VertexId } from "../../kernel/kernel.ts";
import { add3, dist3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { closestOnAxis, rayPlane } from "../camera.ts";
import { intentAllows1D } from "../intent.ts";
import { cameraPlane, type SnapKind } from "../pick.ts";
import { applyDir, applyPt, rotationAbout, scalingAbout, translation, type Xform } from "../../scene/xform.ts";
import { moveTargetsSelection, unwrapAngle } from "../tools.ts";
import { INCREMENT_DEG, nearestStep } from "../increments.ts";
import { type XformGizmo, type XformGrab, type XformHandle, axisOf, dragMove, dragRotate, grabXform, hitXformGizmo, xformGizmoGeom } from "../transform-gizmo.ts";
import { MIN_GESTURE_LEN, SNAP_LABELS, fmtDeg, fmtLen } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { pickHandle } from "../handle-pick.ts";

interface Handle { kind: "corner" | "face"; p: Pt3; anchor: Pt3; axis: Pt3 | null }
/** 咬合的倍率。−1 = 面心柄拖过对面 = 沿那根轴镜像（user 2026-10-25「scale有snapping吗。最常用的就是用来x -1」）。 */
const SNAP_FACTORS = [-1, 0.5, 1, 1.5, 2, 3, 4];
/** 移动箭头「从点」：吸到这些点类 = 那点投到轴上（SU 轴向移动同款）。 */
const POINT_KINDS: ReadonlySet<string> = new Set(["endpoint", "midpoint", "center", "intersection", "guide-point", "pool-origin", "origin", "grid-point"]);
type Pick = { kind: "scale"; idx: number } | { kind: "gizmo"; handle: XformHandle };

export class TransformTool implements ToolHandler {
  readonly tool = "transform" as const;
  readonly grammar = "direct" as const;
  private mode: "scale" | "move" | "rotate" | null = null;
  // 缩放
  private h: Handle | null = null;   // 正在拖的柄
  private hIdx = -1;
  private t0 = 1;
  private f: Pt3 = { x: 1, y: 1, z: 1 };
  // 移动 / 转动
  private grab: XformGrab | null = null;
  private dist = 0;
  private angle = 0;
  private mv = new Set<VertexId>();
  /** 悬停 / 拖着的把手（高亮）：缩放柄 `s<序号>`，箭头 / 环 = XformHandle。 */
  private hot: string | null = null;

  active(): boolean { return this.mode !== null; }
  cancel(): void { this.mode = null; this.h = null; this.hIdx = -1; this.f = { x: 1, y: 1, z: 1 }; this.grab = null; this.dist = 0; this.angle = 0; this.mv = new Set(); this.hot = null; }
  sample(): Record<string, number> { return { fx: this.f.x, fy: this.f.y, fz: this.f.z, mt: this.dist, ra: this.angle }; }
  describe(): Record<string, unknown> { return { transform: { mode: this.mode, anchor: this.h?.anchor ?? null, f: this.f, handle: this.grab?.handle ?? null, dist: this.dist, angle: this.angle } }; }

  /** 角柄 8 个（等比）+ 面心柄 6 个（单轴），按选区的世界包围盒。 */
  private handles(ctx: ToolCtx): Handle[] {
    const b = ctx.targetBounds();
    if (!b) return [];
    const { min, max } = b, out: Handle[] = [];
    const mid = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
    for (const sx of [0, 1]) for (const sy of [0, 1]) for (const sz of [0, 1]) {
      out.push({ kind: "corner", p: { x: sx ? max.x : min.x, y: sy ? max.y : min.y, z: sz ? max.z : min.z }, anchor: { x: sx ? min.x : max.x, y: sy ? min.y : max.y, z: sz ? min.z : max.z }, axis: null });
    }
    const faces: [Pt3, Pt3, Pt3][] = [
      [{ x: max.x, y: mid.y, z: mid.z }, { x: min.x, y: mid.y, z: mid.z }, { x: 1, y: 0, z: 0 }], [{ x: min.x, y: mid.y, z: mid.z }, { x: max.x, y: mid.y, z: mid.z }, { x: -1, y: 0, z: 0 }],
      [{ x: mid.x, y: max.y, z: mid.z }, { x: mid.x, y: min.y, z: mid.z }, { x: 0, y: 1, z: 0 }], [{ x: mid.x, y: min.y, z: mid.z }, { x: mid.x, y: max.y, z: mid.z }, { x: 0, y: -1, z: 0 }],
      [{ x: mid.x, y: mid.y, z: max.z }, { x: mid.x, y: mid.y, z: min.z }, { x: 0, y: 0, z: 1 }], [{ x: mid.x, y: mid.y, z: min.z }, { x: mid.x, y: mid.y, z: max.z }, { x: 0, y: 0, z: -1 }],
    ];
    for (const [p, anchor, axis] of faces) if (dist3(p, anchor) >= MIN_GESTURE_LEN) out.push({ kind: "face", p, anchor, axis });
    return out;
  }
  /** 箭头 / 环的位置：选区包围盒中心 + 上下文帧的三轴。没选区 → null。 */
  private gizmo(ctx: ToolCtx): XformGizmo | null {
    const b = ctx.targetBounds();
    if (!b) return null;
    const F = ctx.contextFrame();
    return { origin: { x: (b.min.x + b.max.x) / 2, y: (b.min.y + b.max.y) / 2, z: (b.min.z + b.max.z) / 2 }, axes: { x: normalize3(F.x), y: normalize3(F.y), z: normalize3(F.z) } };
  }
  /** 光标下是哪个把手：缩放柄和箭头一起比（屏距最近，叠在一起离相机近的赢），都不在圈里才看环。 */
  private pickAt(ctx: ToolCtx, sx: number, sy: number): Pick | null {
    const hs = this.handles(ctx), g = this.gizmo(ctx), ray0 = ctx.frame().ray(sx, sy, ctx.vp());
    const cands: (Pick & { d: number; z: number })[] = hs.map((h, i) => ({ kind: "scale", idx: i, d: ctx.frame().distTo(sx, sy, h.p, ctx.vp()), z: dot3(sub3(h.p, ray0.origin), ray0.dir) }));
    const rings: (Pick & { d: number; z: number })[] = [];
    if (g) for (const c of hitXformGizmo(g, ctx.frame(), ctx.vp(), sx, sy)) (c.handle[0] === "r" ? rings : cands).push({ kind: "gizmo", handle: c.handle, d: c.d, z: c.z });
    // 环是大目标、斜着看会从箭头 / 方块旁边擦过：箭头和方块在捕获圈里就先给它们，没有才轮到环
    const i = pickHandle(cands, ctx.eps().hit);
    if (i >= 0) return cands[i];
    const j = pickHandle(rings, ctx.eps().hit);
    return j < 0 ? null : rings[j];
  }
  private static hotOf(p: Pick | null): string | null { return p ? (p.kind === "scale" ? `s${p.idx}` : p.handle) : null; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.mode || !ctx.hasSelection()) { if (!this.mode) this.hot = null; return; }
    this.hot = TransformTool.hotOf(this.pickAt(ctx, s.x, s.y));
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (!ctx.hasSelection()) { ctx.hint("先选中要变换的东西（选择工具），再拖把手"); return; }
    const p = this.pickAt(ctx, ev.x, ev.y);
    if (!p) { ctx.hint("拖包围盒上的方块 = 缩放（角 = 等比，面心 = 单轴）；拖箭头 = 沿轴移动；拖圆环 = 绕轴转"); return; }
    this.hot = TransformTool.hotOf(p);
    if (p.kind === "scale") {
      const h = this.handles(ctx)[p.idx];
      this.mode = "scale"; this.h = h; this.hIdx = p.idx;
      this.f = { x: 1, y: 1, z: 1 };
      const dir = normalize3(sub3(h.p, h.anchor));
      const ray = ctx.frame().ray(ev.x, ev.y, ctx.vp());
      const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
      this.t0 = q ? Math.max(dot3(sub3(q, h.anchor), dir), MIN_GESTURE_LEN) : dist3(h.p, h.anchor);
      ctx.setCursor(h.p);
      ctx.hint(h.kind === "corner" ? "等比缩放：沿对角拖" : "单轴缩放：沿轴拖（拖过对面到 −1 = 沿这根轴镜像）");
      return;
    }
    const g = this.gizmo(ctx)!;
    this.grab = grabXform(g, p.handle, ctx.frame(), ctx.vp(), ev.x, ev.y);
    this.mode = p.handle[0] === "m" ? "move" : "rotate";
    this.dist = 0; this.angle = 0;
    this.mv = new Set(moveTargetsSelection(ctx.kernel(), ctx.selection()));
    const ax = axisOf(p.handle).toUpperCase();
    if (this.mode === "rotate" && !this.grab.dir0) { this.cancel(); ctx.hint("正对着圆环的侧面看，转不了：换个角度再拖"); return; }
    ctx.setCursor(this.mode === "move" ? add3(g.origin, scale3(this.grab.axis, this.grab.t0)) : g.origin);
    ctx.hint(this.mode === "move" ? `沿 ${ax} 轴移动：吸到点 = 对齐那点；输数字 = 精确距离` : `绕 ${ax} 轴转：格点吸附开着 = 15° 一档；输数字 = 精确角度`);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    if (this.mode === "move") this.trackMove(ctx, s);
    else if (this.mode === "rotate") this.trackRotate(ctx, s);
    else if (this.mode === "scale") this.trackScale(ctx, s, travel);
  }
  private trackScale(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    const h = this.h;
    if (!h) return;
    const dir = normalize3(sub3(h.p, h.anchor));
    const ray = ctx.frame().ray(s.x, s.y, ctx.vp());
    const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
    if (!q) return;
    const t = dot3(sub3(q, h.anchor), dir);
    let f = t / this.t0;
    if (Math.abs(f) < 1e-3) f = 1e-3;   // 不许缩到零（退化）
    // 咬合按屏距（和别的吸附一样）：光标离「倍率 v 的落点」在吸附半径内就咬住、最近的赢（2026-10-25 改：以前是倍率差 < 0.02，屏上只有几个像素、很难咬到）。
    // 意图门：倍率相对 1 的符号 = 放大 / 缩小；反向的咬合不合法（1 本身保留）
    let snapped: number | undefined, bestD = ctx.eps().snap;
    for (const v of SNAP_FACTORS) {
      if (ctx.intentOn(s, travel) && !intentAllows1D(f - 1, v - 1, 0.01)) continue;
      const d = ctx.frame().distTo(s.x, s.y, add3(h.anchor, scale3(dir, v * this.t0)), ctx.vp());
      if (d <= bestD) { bestD = d; snapped = v; }
    }
    if (snapped !== undefined) f = snapped;
    this.f = h.kind === "corner" ? { x: f, y: f, z: f } : { x: h.axis!.x ? f : 1, y: h.axis!.y ? f : 1, z: h.axis!.z ? f : 1 };
    const cur = add3(h.anchor, scale3(dir, t));
    ctx.setCursor(cur);
    ctx.setSnap(snapped !== undefined ? { p: cur, kind: "h-stop" } : null);
  }
  /** 沿轴移动：① 吸到点（端点 / 中点 / 圆心…）= 那点投到轴上；② 否则格点吸附开着 = 从抓点量整格（离得近才咬）。 */
  private trackMove(ctx: ToolCtx, s: { x: number; y: number }): void {
    const G = this.grab!, a = G.axis, grabPt = add3(G.g0.origin, scale3(a, G.t0)), ax = axisOf(G.handle);
    let t = dragMove(G, ctx.frame(), ctx.vp(), s.x, s.y);
    if (t === null) return;
    const view = ctx.live(), mv = this.mv;
    const sn = ctx.snap(view, s.x, s.y, { plane: cameraPlane(ctx.frame(), grabPt), anchor: grabPt, alignSources: ctx.alignSources(), hand: ctx.hand(view, (vid) => mv.has(vid), false) });
    let kind: SnapKind | null = null, label: string | undefined, at: Pt3 | null = null;
    if (sn.kind && POINT_KINDS.has(sn.kind)) {
      t = dot3(sub3(sn.p, grabPt), a); kind = sn.kind; at = sn.p;
      label = `${SNAP_LABELS[sn.kind] ?? sn.kind} → ${ax.toUpperCase()} 轴`;
    } else {
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
  /** 绕轴转：从抓的方向转到光标方向（连续化，可以转过 180°）；格点吸附开着 = 15° 一档，离得近才咬。 */
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

  /** 当前预演的变换（世界系）；没在拖 → null。 */
  private currentXform(): Xform | null {
    if (this.mode === "scale" && this.h) return scalingAbout(this.h.anchor, this.f);
    if (this.mode === "move" && this.grab) return translation(scale3(this.grab.axis, this.dist));
    if (this.mode === "rotate" && this.grab) return rotationAbout(this.grab.g0.origin, this.grab.axis, this.angle);
    return null;
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    const X = this.currentXform();
    if (!X) return "";
    if (this.mode === "scale") { ctx.previewXform(X, run); return `缩放 ${this.f.x.toFixed(3)} × ${this.f.y.toFixed(3)} × ${this.f.z.toFixed(3)}`; }
    if (this.mode === "move") { if (Math.abs(this.dist) > 1e-9) ctx.previewXform(X, run); return `移动 ${fmtLen(Math.abs(this.dist))}`; }
    if (Math.abs(this.angle) > 1e-9) ctx.previewXform(X, run);
    return `旋转 ${fmtDeg(this.angle)}`;
  }

  up(ctx: ToolCtx, _ev: ToolPointer, settle: () => ToolSample | null): void {
    const mode = this.mode;
    if (!mode) return;
    const smp = settle();
    const sel = ctx.selection(), k0 = ctx.kernel(), vids = moveTargetsSelection(k0, sel), pools = ctx.movablePoolPicks(false);
    const froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    if (mode === "scale") {
      const h = this.h!;
      const s: Pt3 = smp && smp.extra.fx !== undefined ? { x: smp.extra.fx, y: smp.extra.fy, z: smp.extra.fz } : this.f;
      const anchor = h.anchor, axis = h.axis;
      this.cancel();
      ctx.setCursor(null); ctx.setSnap(null);
      if (Math.abs(s.x - 1) < 1e-9 && Math.abs(s.y - 1) < 1e-9 && Math.abs(s.z - 1) < 1e-9) return;
      ctx.commitXform(scalingAbout(anchor, s), vids, pools);
      ctx.recordLast({ kind: "scale", ops: ctx.opCount() - n0, at: at0, froms, pools, anchor, axis, f: s });
      return;
    }
    const G = this.grab!;
    if (mode === "move") {
      const t = smp && smp.extra.mt !== undefined ? smp.extra.mt : this.dist, delta = scale3(G.axis, t);
      const entities = { faces: [...sel.faces], edges: [...sel.edges] };
      this.cancel();
      ctx.setCursor(null); ctx.setSnap(null);
      if (Math.abs(t) < MIN_GESTURE_LEN) return;
      ctx.commitXform(translation(delta), vids, pools);
      ctx.recordLast({ kind: "move", ops: ctx.opCount() - n0, at: at0, froms, pools, delta, copy: false, entities });
      return;
    }
    const ang = smp && smp.extra.ra !== undefined ? smp.extra.ra : this.angle, c = G.g0.origin, ax = G.axis;
    this.cancel();
    ctx.setCursor(null); ctx.setSnap(null);
    if (Math.abs(ang) < 1e-6) return;
    ctx.commitXform(rotationAbout(c, ax, ang), vids, pools);
    ctx.recordLast({ kind: "rotate", ops: ctx.opCount() - n0, at: at0, froms, pools, center: c, axis: ax, angle: ang });
  }

  /** 缩放柄 + 箭头 / 环，都跟着预演实时动（user 2026-10-21「缩放的handle应该跟着实时动」）。缩放拖着的时候不画箭头 / 环（包围盒在变形）。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    const hs = this.handles(ctx), X = this.currentXform();
    const handles = hs.map((h, i) => ({ p: X ? applyPt(X, h.p) : h.p, active: i === this.hIdx || this.hot === `s${i}` }));
    let g: XformGizmo | null = this.mode === "move" || this.mode === "rotate" ? this.grab!.g0 : this.mode === "scale" ? null : this.gizmo(ctx);
    if (g && X) g = { origin: applyPt(X, g.origin), axes: this.mode === "rotate" ? { x: applyDir(X, g.axes.x), y: applyDir(X, g.axes.y), z: applyDir(X, g.axes.z) } : g.axes };
    const xformGizmo = g ? { ...xformGizmoGeom(g, ctx.frame(), ctx.vp()), hot: this.hot } : null;
    return { handles, xformGizmo };
  }
}

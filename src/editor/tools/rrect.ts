// tools/rrect.ts —— 旋转矩形。2026-10-26 改成三下对齐（user「旋转矩形错了，应该第一下设置边，第二下设置角度，然后这个量角器应该和边垂直的。第三下设置长度。一共三下对齐」）：
//   ① 第一边 A→B（拖一下，或点两下；躺在首点的平面上，吸附照常）；
//   ② 角度：量角器绕第一边（和边垂直）——矩形所在的面绕 AB 转：0° = 平躺在原来那个面里、90° = 立起来；吸到点 = 面过那点，靠近帧的轴吸正，格点吸附开着 = 15° 一档；
//   ③ 长度：沿刚定的那个方向拉第二边（吸到点 = 那点投到这条线上；格点吸附开着 = 整格）。
// 结果是真矩形（直角）。数值小窗「角度,宽」= 绕边的角 + 第二边长；只输一个数 = 第二边长。
// 旧版（第二边在面内转出平行四边形、角度和宽一下定）2026-10-24 by Claude Fable 5.1；edited by Claude Opus 5.5
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { add3, cross3, dist3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { closestOnAxis, rayPlane } from "../camera.ts";
import { cameraPlane, rectFirstPlane, type DrawPlane, type SnapKind } from "../pick.ts";
import { rrectDirAt, rrectSegments } from "../tools.ts";
import { axisAlignAngle } from "../protractor-geom.ts";
import { applyPt, rotationAbout } from "../../scene/xform.ts";
import { INCREMENT_DEG, nearestStep } from "../increments.ts";
import { fmtDeg, fmtLen } from "../units.ts";
import { SNAP_LABELS, MIN_GESTURE_LEN } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
import type { ViewState } from "../view-state.ts";

const projectThrough = (p: Pt3, c: Pt3, n: Pt3): Pt3 => { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); };
/** 吸到这些点类 = 对齐那点（角度：面过那点；长度：那点投到第二边的线上）。 */
const POINT_KINDS: ReadonlySet<string> = new Set(["endpoint", "midpoint", "center", "intersection", "guide-point", "pool-origin", "origin", "grid-point"]);
/** 角度靠近帧的轴（第二边竖直 / 水平）多少度以内吸正。量纲：度。 */
const AXIS_SNAP_DEG = 3;

export class RRectTool implements ToolHandler {
  readonly tool = "rrect" as const;
  readonly grammar = "steps" as const;
  readonly draws = true;
  readonly lock = "plane" as const;   // A9：方向键锁平面（第一边那一步）
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 | 2 | 3 = 0;
  private plane: DrawPlane | null = null;
  private plane0: DrawPlane | null = null;   // 首点解析出的平面（面锁解开时回到它）
  private a: Pt3 | null = null;
  private b: Pt3 | null = null;
  private theta = 0;           // 绕第一边的角（弧度）
  private len = 0;             // 第二边长（③）；② 时 = 光标离 B 的距离（预演用）
  private c: Pt3 | null = null;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.a = this.b = this.c = null; this.theta = 0; this.len = 0; }
  sample(): Record<string, number> { return { th: this.theta, ln: this.len }; }
  /** B43：拉第一边 = 这一边的长度；之后 = 矩形（两条边 + 法向）。 */
  scaleGeom(ctx: ToolCtx): ScaleGeom | null {
    if (this.stage === 1 && this.a) { const q = ctx.cursor(); return q ? { kind: "length", vec: sub3(q, this.a) } : null; }
    if (this.stage >= 2 && this.a && this.b && this.c) { const u = sub3(this.b, this.a), v = sub3(this.c, this.b); return { kind: "rect", u, v, normal: normalize3(cross3(u, v)) }; }
    return null;
  }

  /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
  private relock(ctx: ToolCtx): void { if (this.stage === 1 && this.a && this.plane0) this.plane = ctx.lockedPlane(this.a) ?? this.plane0; }
  /** ① 第一边终点：在首点的平面上取点（吸附照常）。 */
  private edgeEnd(ctx: ToolCtx, sx: number, sy: number): Pt3 | null {
    this.relock(ctx);
    const view = ctx.live(), pl = this.plane!;
    const sn = ctx.snap(view, sx, sy, { plane: pl, anchor: this.a!, alignSources: ctx.alignSources(), hand: ctx.hand(view) });
    ctx.setSnap(sn);
    if (sn.p) return projectThrough(sn.p, this.a!, pl.plane.n);
    const ray = ctx.frame().ray(sx, sy, ctx.vp());
    return rayPlane(ray.origin, ray.dir, pl.plane.n, pl.plane.d);
  }
  private edgeDir(): Pt3 { return normalize3(sub3(this.b!, this.a!)); }
  private u0(): Pt3 { return normalize3(cross3(this.plane!.plane.n, this.edgeDir())); }
  /** ② 角度：光标在「过 B、垂直第一边」的面上的方向 → θ；吸到点 = 面过那点；靠近帧轴吸正；格点吸附开着 = 15°（近才咬）。 */
  private trackAngle(ctx: ToolCtx, sx: number, sy: number): void {
    const a = this.a!, b = this.b!, e = this.edgeDir(), u0 = this.u0();
    const ray = ctx.frame().ray(sx, sy, ctx.vp()), q = rayPlane(ray.origin, ray.dir, e, dot3(e, b));
    const angOf = (w: Pt3): number => Math.atan2(dot3(cross3(u0, w), e), dot3(u0, w));
    let th = this.theta, kind: SnapKind | null = null, label: string | undefined, at: Pt3 | null = null;
    const view = ctx.live();
    const sn = ctx.snap(view, sx, sy, { plane: cameraPlane(ctx.frame(), b), anchor: b, alignSources: ctx.alignSources(), hand: ctx.hand(view) });
    const w0 = sn.kind && POINT_KINDS.has(sn.kind) ? sub3(sn.p, b) : null, wp = w0 ? sub3(w0, scale3(e, dot3(w0, e))) : null;
    if (wp && Math.hypot(wp.x, wp.y, wp.z) > 1e-6) { th = angOf(wp); kind = sn.kind; at = sn.p; label = `${SNAP_LABELS[sn.kind!] ?? sn.kind} · 面过这点`; this.len = Math.hypot(wp.x, wp.y, wp.z); }
    else if (q) {
      const w = sub3(q, b);
      if (Math.hypot(w.x, w.y, w.z) < 1e-9) return;
      th = angOf(w); this.len = Math.hypot(w.x, w.y, w.z);
      const ax = axisAlignAngle(b, e, add3(b, u0), ctx.contextFrame(), th, AXIS_SNAP_DEG);
      if (ax) { th = ax.ang; kind = `axis-${ax.axis}` as SnapKind; }
      else if (ctx.grid().on) {
        const step = (INCREMENT_DEG * Math.PI) / 180, k = Math.round(th / step) * step;
        if (ctx.frame().distBetween(q, applyPt(rotationAbout(b, e, k - th), q), ctx.vp()) <= ctx.snapPx()) { th = k; kind = "h-stop"; }
      }
    } else return;
    this.theta = th;
    this.c = add3(b, scale3(rrectDirAt(a, b, this.plane!.plane.n, th), Math.max(this.len, MIN_GESTURE_LEN)));
    ctx.setCursor(this.c);
    ctx.setSnap(kind ? { p: at ?? this.c, kind, label: label ?? fmtDeg(th) } : null);
    ctx.tip(fmtDeg(th));
  }
  /** ③ 长度：沿第二边方向；吸到点 = 那点投到这条线上；格点吸附开着 = 整格（近才咬）。 */
  private trackLength(ctx: ToolCtx, sx: number, sy: number): void {
    const a = this.a!, b = this.b!, d = rrectDirAt(a, b, this.plane!.plane.n, this.theta);
    const ray = ctx.frame().ray(sx, sy, ctx.vp()), q = closestOnAxis(b, d, ray.origin, ray.dir);
    if (!q) return;
    let w = dot3(sub3(q, b), d), kind: SnapKind | null = null, label: string | undefined, at: Pt3 | null = null;
    const view = ctx.live();
    const sn = ctx.snap(view, sx, sy, { plane: cameraPlane(ctx.frame(), b), anchor: b, alignSources: ctx.alignSources(), hand: ctx.hand(view) });
    if (sn.kind && POINT_KINDS.has(sn.kind)) { w = dot3(sub3(sn.p, b), d); kind = sn.kind; at = sn.p; label = `${SNAP_LABELS[sn.kind] ?? sn.kind} → 长度`; }
    else {
      const g = ctx.grid(), step = g.snap;
      if (g.on && step > 0) { const k = nearestStep(w, step); if (Math.abs(k) > 1e-9 && ctx.frame().distBetween(add3(b, scale3(d, w)), add3(b, scale3(d, k)), ctx.vp()) <= ctx.snapPx()) { w = k; kind = "increment"; label = `整格 ${fmtLen(Math.abs(k))}`; } }
    }
    this.len = w;
    this.c = add3(b, scale3(d, w));
    ctx.setCursor(this.c);
    ctx.setSnap(kind ? { p: at ?? this.c, kind, ...(label ? { label } : {}), hints: [{ a: b, b: this.c, axis: "i" }, ...(at ? [{ a: at, b: this.c, axis: "i" as const }] : [])] } : null);
    ctx.tip(fmtLen(Math.abs(w)));
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane0 = r.plane; this.plane = ctx.lockedPlane(r.snap.p) ?? r.plane; this.a = r.snap.p; this.b = this.c = null;
      ctx.setAnchor(this.a); ctx.setSnap(r.snap); ctx.setCursor(this.a);
      this.stage = 1;
      ctx.hint("旋转矩形 ①/③：拉第一边，点终点（吸附照常；输数字 = 边长）");
      return;
    }
    if (this.stage === 1) {
      const q = this.edgeEnd(ctx, ev.x, ev.y);
      if (!q || dist3(q, this.a!) < MIN_GESTURE_LEN) return;
      this.b = q; this.c = null; this.theta = 0; this.len = 0;
      this.stage = 2;
      ctx.setAnchor(this.b);
      ctx.hint("旋转矩形 ②/③：转角度——量角器绕第一边（0° = 平躺，90° = 立起来；吸到点 = 面过那点）；点一下定角度");
      return;
    }
    if (this.stage === 2) {
      this.trackAngle(ctx, ev.x, ev.y);
      this.stage = 3;
      ctx.hint("旋转矩形 ③/③：拉长度，点落定（吸到点 = 对齐那点；输数字 = 精确长度，「角度,宽」两样一起改）");
      return;
    }
    this.trackLength(ctx, ev.x, ev.y);
    const segs = this.c ? rrectSegments(this.a!, this.b!, this.c) : [];
    if (!segs.length || Math.abs(this.len) < MIN_GESTURE_LEN) { ctx.hint("旋转矩形：第二边太短，换个点"); return; }
    const n0 = ctx.opCount(), at0 = ctx.activePool(), { a, b, c } = this, plane = this.plane0 ?? this.plane;
    ctx.commitOp({ op: "addEdges", at: at0, segs: segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)]), harden: true });   // 描过软边 = 变硬
    ctx.recordLast({ kind: "rrect", ops: ctx.opCount() - n0, at: at0, plane: plane!, a: a!, b: b!, c: c! });
    ctx.hint(`旋转矩形 ${fmtLen(dist3(a!, b!))} × ${fmtLen(dist3(b!, c!))} · ${fmtDeg(this.theta)}`);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null); ctx.tip(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 1) { const q = this.edgeEnd(ctx, s.x, s.y); if (q) ctx.setCursor(q); return; }
    if (this.stage === 2) this.trackAngle(ctx, s.x, s.y);
    else if (this.stage === 3) this.trackLength(ctx, s.x, s.y);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage === 1 && this.a) { const c = ctx.cursor() ?? this.a; if (dist3(c, this.a) >= MIN_GESTURE_LEN) run((k) => k.addEdges([[ctx.toLocal(this.a!), ctx.toLocal(c)]])); return `第一边 ${fmtLen(dist3(this.a, c))}`; }
    if (this.stage >= 2 && this.a && this.b && this.c) {
      const segs = rrectSegments(this.a, this.b, this.c);
      if (segs.length) run((k) => k.addEdges(segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)])));
      return `旋转矩形 ${fmtLen(dist3(this.a, this.b))} × ${fmtLen(dist3(this.b, this.c))} · ${fmtDeg(this.theta)}`;
    }
    return "";
  }
  describe(ctx: ToolCtx): Record<string, unknown> {
    if (!this.a || !this.b || !this.c) return { stage: this.stage };
    return { stage: this.stage, theta: this.theta, len: this.len, segs: rrectSegments(this.a, this.b, this.c).map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]) };
  }
  /** ② / ③：量角器在 B、绕第一边（轴 = AB 方向），基线 = 平躺的那个方向。 */
  viewExtras(): Partial<ViewState> {
    if (this.stage >= 2 && this.a && this.b && this.plane) return { protractor: { center: this.b, axis: this.edgeDir(), ref: add3(this.b, this.u0()), angle: this.theta } };
    return {};
  }
}


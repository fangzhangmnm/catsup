// tools/rrect.ts —— 旋转矩形（SU Rotated Rectangle；user 2026-10-24「中心rect和旋转rect还是要，你查一下sketchup的旋转rect怎么做的」）。
// SU 流程（2026-10-24 查档）：点第一角 → 拉第一边（可输长度；Shift 保方向）→ 量角器出现在第一边终点：转角度 + 拉宽（Shift 约束角度）→ 点落定；
// 角度可以不是 90°（平行四边形合法）；数值小窗「角度,宽」。这里：三下；第一边 Shift = 15° 角（与画线同款）；第二边 90° 强吸（±5°）、Shift = 15° 格；
// 量角器弧预演在第一边终点 B（A34）；提示带 ①/③。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { dist3, dot3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { rectFirstPlane, type DrawPlane } from "../pick.ts";
import { rrectAngle, rrectSegments, rrectSnapAngle } from "../tools.ts";
import { fmtLen, MIN_GESTURE_LEN } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";
import type { ViewState } from "../render3.ts";

const projectThrough = (p: Pt3, c: Pt3, n: Pt3): Pt3 => { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); };

export class RRectTool implements ToolHandler {
  readonly tool = "rrect" as const;
  readonly grammar = "steps" as const;
  readonly draws = true;
  readonly lock = "plane" as const;   // A9：方向键锁平面
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 | 2 = 0;
  private plane: DrawPlane | null = null;
  private plane0: DrawPlane | null = null;   // 首点解析出的平面（面锁解开时回到它）
  private a: Pt3 | null = null;
  private b: Pt3 | null = null;
  private c: Pt3 | null = null;
  private deg = 90;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.a = this.b = this.c = null; this.deg = 90; }
  sample(): Record<string, number> { return {}; }
  /** B43：拉第一边 = 这一边的长度；转第二边 = 矩形（两条边 + 法向）。 */
  scaleGeom(ctx: ToolCtx): ScaleGeom | null {
    if (this.stage === 1 && this.a) { const q = ctx.cursor(); return q ? { kind: "length", vec: sub3(q, this.a) } : null; }
    if (this.stage === 2 && this.a && this.b && this.c && this.plane) return { kind: "rect", u: sub3(this.b, this.a), v: sub3(this.c, this.b), normal: this.plane.plane.n };
    return null;
  }

  /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
  private relock(ctx: ToolCtx): void { if (this.stage === 1 && this.a && this.plane0) this.plane = ctx.lockedPlane(this.a) ?? this.plane0; }
  private pointOnPlane(ctx: ToolCtx, sx: number, sy: number, anchor: Pt3): Pt3 | null {
    this.relock(ctx);
    const view = ctx.live(), pl = this.plane!;
    let sn = ctx.snap(view, sx, sy, { plane: pl, anchor, alignSources: ctx.alignSources(), hand: ctx.hand(view) });
    // 第一边的 15° 整角 = 格点吸附（求解器自由落点时咬，有捕捉阈；画线同款）
    ctx.setSnap(sn);
    if (sn.p) return projectThrough(sn.p, anchor, pl.plane.n);
    const ray = ctx.frame().ray(sx, sy, ctx.vp());
    return rayPlane(ray.origin, ray.dir, pl.plane.n, pl.plane.d);
  }
  /** 第二边：角度咬合（90° 强吸；格点吸附开着 = 15° 一档、离得近才咬），顺手记角度给提示。 */
  private secondCorner(ctx: ToolCtx, q: Pt3): Pt3 {
    let r = rrectSnapAngle(this.a!, this.b!, q, this.plane!.plane.n, { shift: ctx.grid().on });
    if (r.snapped && ctx.frame().distBetween(q, r.c, ctx.vp()) > ctx.snapPx()) r = rrectSnapAngle(this.a!, this.b!, q, this.plane!.plane.n, { shift: false });   // 15° 档太远 = 不咬（90° 强吸照旧）
    this.deg = r.deg;
    ctx.tip(r.snapped ? `${Math.round(r.deg)}°` : null);
    return r.c;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane0 = r.plane; this.plane = ctx.lockedPlane(r.snap.p) ?? r.plane; this.a = r.snap.p; this.b = this.c = null;
      ctx.setAnchor(this.a); ctx.setSnap(r.snap); ctx.setCursor(this.a);
      this.stage = 1;
      ctx.hint("旋转矩形 ②/③：拉第一边，点终点（Shift = 15° 角）");
      return;
    }
    if (this.stage === 1) {
      const q = this.pointOnPlane(ctx, ev.x, ev.y, this.a!);
      if (!q || dist3(q, this.a!) < MIN_GESTURE_LEN) return;
      this.b = q; this.c = null;
      this.stage = 2;
      ctx.setAnchor(this.b);
      ctx.hint("旋转矩形 ③/③：转角度 + 拉宽，点落定（90° 强吸；Shift = 15° 格；数值小窗「角度,宽」）；Esc 取消");
      return;
    }
    const q = this.pointOnPlane(ctx, ev.x, ev.y, this.b!);
    if (q) this.c = this.secondCorner(ctx, q);
    const segs = this.c ? rrectSegments(this.a!, this.b!, this.c) : [];
    if (!segs.length) { ctx.hint("旋转矩形：第二边太短或与第一边共线，换个点"); return; }
    const n0 = ctx.opCount(), at0 = ctx.activePool(), { a, b, c, plane } = this;
    ctx.commitOp({ op: "addEdges", at: at0, segs: segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)]) });
    ctx.recordLast({ kind: "rrect", ops: ctx.opCount() - n0, at: at0, plane: plane!, a: a!, b: b!, c: c! });
    const ang = rrectAngle(a!, b!, c!, plane!.plane.n);
    ctx.hint(`旋转矩形 ${fmtLen(dist3(a!, b!))} × ${fmtLen(dist3(b!, c!))} · ${Math.round(ang.deg)}°`);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null); ctx.tip(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0) return;
    const anchor = this.stage === 1 ? this.a! : this.b!;
    const q = this.pointOnPlane(ctx, s.x, s.y, anchor);
    if (!q) return;
    if (this.stage === 1) { ctx.setCursor(q); return; }
    this.c = this.secondCorner(ctx, q);
    ctx.setCursor(this.c);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage === 1 && this.a) { const c = ctx.cursor() ?? this.a; if (dist3(c, this.a) >= MIN_GESTURE_LEN) run((k) => k.addEdges([[ctx.toLocal(this.a!), ctx.toLocal(c)]])); return `第一边 ${fmtLen(dist3(this.a, c))}`; }
    if (this.stage === 2 && this.a && this.b && this.c) {
      const segs = rrectSegments(this.a, this.b, this.c);
      if (segs.length) run((k) => k.addEdges(segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)])));
      return `旋转矩形 ${fmtLen(dist3(this.a, this.b))} × ${fmtLen(dist3(this.b, this.c))} · ${Math.round(this.deg)}°`;
    }
    return "";
  }
  describe(ctx: ToolCtx): Record<string, unknown> {
    if (!this.a || !this.b || !this.c) return {};
    return { segs: rrectSegments(this.a, this.b, this.c).map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]) };
  }
  /** 第二边阶段：量角器弧在 B，基线 = B→A（A34）。 */
  viewExtras(): Partial<ViewState> {
    if (this.stage === 2 && this.a && this.b && this.plane) {
      const ang = this.c ? rrectAngle(this.a, this.b, this.c, this.plane.plane.n) : { deg: 90, side: 1 as const };
      return { protractor: { center: this.b, axis: this.plane.plane.n, ref: this.a, angle: (ang.deg * Math.PI / 180) * ang.side } };
    }
    return {};
  }
}

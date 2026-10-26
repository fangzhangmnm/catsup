// tools/arc.ts —— 弧工具的四种画法（SU 对照，user 2026-10-24「几种arc模式也看一下」；选项条「画法」切）：
//   两点弧（SU 2 Point Arc）：起点 A → 终点 B → 拉凸度 P（半圆目标 B22）；三点弧（3 Point Arc）：起点 A → 弧上枢轴 M → 终点 E；
//   圆心弧（Arc）：圆心 C → 起点 A（定半径）→ 转角度（量角器弧预演，15° Shift 咬合，可转过 180°）；扇形（Pie）：圆心弧 + 两条半径闭合成面。
// 都是三下；第一下定平面（rectFirstPlane）。构造 / 落定共用 arc-build.ts（数值小窗改半径 / 角度 / 段数也走它）。
// 提示带步骤字 ①/③（A34；user「也不知道到第几步了」）。0.10 两点弧 2026-10-24 Claude Fable 5.1；四模式同日重写。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { dist3, dot3, scale3, sub3 } from "../../kernel/geom.ts";
import { applyPt, rotationAbout } from "../../scene/xform.ts";
import { rayPlane } from "../camera.ts";
import { rectFirstPlane, type DrawPlane } from "../pick.ts";
import { arcToolTargets, sweepAngle, unwrapAngle } from "../tools.ts";
import { type ArcMode, type ArcGesture, arcOp, buildArc } from "../arc-build.ts";
import { fmtDeg, fmtLen, MIN_GESTURE_LEN } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";

const projectThrough = (p: Pt3, c: Pt3, n: Pt3): Pt3 => { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); };
const STEP = (Math.PI / 180) * 15;

export class ArcTool implements ToolHandler {
  readonly tool = "arc" as const;
  readonly grammar = "steps" as const;
  readonly lock = "plane" as const;   // A9：方向键锁平面
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 | 2 = 0;
  private mode: ArcMode = "two";
  private plane: DrawPlane | null = null;
  private plane0: DrawPlane | null = null;   // 首点解析出的平面（面锁解开时回到它）
  /** 第一下：two / three 的起点；center / pie 的圆心。 */
  private p1: Pt3 | null = null;
  /** 第二下：two 的终点 / three 的枢轴 / center·pie 的起点。 */
  private p2: Pt3 | null = null;
  /** 第三量：two 的凸度点 / three 的终点（指针）；center·pie 的扫角（弧度，连续化）。 */
  private p3: Pt3 | null = null;
  private sweep = 0;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.p1 = this.p2 = this.p3 = null; this.sweep = 0; }
  sample(): Record<string, number> { return {}; }

  private label(): string { return this.mode === "two" ? "两点弧" : this.mode === "three" ? "三点弧" : this.mode === "center" ? "圆心弧" : "扇形"; }
  private gesture(ctx: ToolCtx): ArcGesture | null {
    if (!this.plane || !this.p1 || !this.p2) return null;
    const segments = ctx.config.get("arc", "segments");
    if (this.mode === "two") return this.p3 ? { mode: "two", plane: this.plane, a: this.p1, b: this.p2, p: this.p3, segments } : null;
    if (this.mode === "three") return this.p3 ? { mode: "three", plane: this.plane, a: this.p1, b: this.p3, p: this.p2, segments } : null;
    return { mode: this.mode, plane: this.plane, center: this.p1, a: this.p2, sweep: this.sweep, segments };
  }

  /** 指针在手势平面上的点（吸附过；吸不到就射线落面）。 */
  /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
  private relock(ctx: ToolCtx): void { if (this.stage === 1 && this.p1 && this.plane0) this.plane = ctx.lockedPlane(this.p1) ?? this.plane0; }
  private pointOnPlane(ctx: ToolCtx, sx: number, sy: number, anchor: Pt3): Pt3 | null {
    this.relock(ctx);
    const view = ctx.live();
    const pl = this.plane!;
    const toolTargets = this.mode === "two" && this.stage === 2 && this.p1 && this.p2 ? arcToolTargets(this.p1, this.p2, pl.plane.n) : null;   // 半圆（B22）
    const sn = ctx.snap(view, sx, sy, { plane: pl, anchor, alignSources: ctx.alignSources(), hand: ctx.hand(view), toolTargets });
    ctx.setSnap(sn);
    if (sn.p) return projectThrough(sn.p, anchor, pl.plane.n);
    const ray = ctx.frame().ray(sx, sy, ctx.vp());
    return rayPlane(ray.origin, ray.dir, pl.plane.n, pl.plane.d);
  }
  /** 圆心弧：指针 → 扫角（连续化；格点吸附开着 = 15° 一档、离得近才咬，按住 Shift 反过来）。 */
  private sweepFrom(ctx: ToolCtx, q: Pt3): number {
    const raw = sweepAngle(this.p1!, this.p2!, q, this.plane!.plane.n);
    let s = unwrapAngle(this.sweep, raw);
    if (ctx.grid().on) { const k = Math.round(s / STEP) * STEP; if (ctx.frame().distBetween(q, applyPt(rotationAbout(this.p1!, this.plane!.plane.n, k - s), q), ctx.vp()) <= ctx.snapPx()) s = k; }
    return s;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      this.mode = ctx.config.get("arc", "mode");
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane0 = r.plane; this.plane = ctx.lockedPlane(r.snap.p) ?? r.plane; this.p1 = r.snap.p; this.p2 = this.p3 = null; this.sweep = 0;
      ctx.setAnchor(this.p1); ctx.setSnap(r.snap); ctx.setCursor(this.p1);
      this.stage = 1;
      ctx.hint(this.mode === "two" ? "两点弧 ②/③：点终点" : this.mode === "three" ? "三点弧 ②/③：点弧上一点（枢轴）" : `${this.label()} ②/③：点起点（定半径）`);
      return;
    }
    if (this.stage === 1) {
      const q = this.pointOnPlane(ctx, ev.x, ev.y, this.p1!);
      if (!q || dist3(q, this.p1!) < MIN_GESTURE_LEN) return;
      this.p2 = q; this.p3 = null; this.sweep = 0;
      this.stage = 2;
      ctx.hint(this.mode === "two" ? "两点弧 ③/③：移动定凸度（半圆有目标），再点一下落定；Esc 取消" : this.mode === "three" ? "三点弧 ③/③：移动定终点，再点一下落定；Esc 取消" : `${this.label()} ③/③：转到角度再点一下落定（Shift = 15° 咬合；可转过 180°）；Esc 取消`);
      return;
    }
    // stage 2：落定
    if (this.mode === "two" || this.mode === "three") { const q = this.pointOnPlane(ctx, ev.x, ev.y, this.p1!); if (q) this.p3 = q; }
    else { const q = this.pointOnPlane(ctx, ev.x, ev.y, this.p1!); if (q) this.sweep = this.sweepFrom(ctx, q); }
    const g = this.gesture(ctx);
    const built = g ? buildArc(g) : null;
    if (!g || !built) { ctx.hint(this.mode === "two" || this.mode === "three" ? `${this.label()}：三点共线画不出弧，换个点` : `${this.label()}：角度是 0，转一下`); return; }
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    ctx.commitOp(arcOp((p) => ctx.toLocal(p), at0, built));
    ctx.recordLast({ kind: "arc", ops: ctx.opCount() - n0, at: at0, ...g });
    ctx.hint(`${this.label()} r=${fmtLen(built.radius)} · ${fmtDeg(Math.abs(built.sweep))} · ${built.segs.length} 段`);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0) return;
    const q = this.pointOnPlane(ctx, s.x, s.y, this.p1!);
    if (!q) return;
    if (this.stage === 1) { ctx.setCursor(q); return; }
    if (this.mode === "two" || this.mode === "three") { this.p3 = q; ctx.setCursor(q); return; }
    this.sweep = this.sweepFrom(ctx, q);
    const built = buildArc(this.gesture(ctx)!);
    ctx.setCursor(built ? built.end : q);
    ctx.tip(ctx.mods().shift ? fmtDeg(this.sweep) : null);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage === 1 && this.p1) {
      const c = ctx.cursor() ?? this.p1;
      return this.mode === "two" ? `弦 ${fmtLen(dist3(this.p1, c))}` : this.mode === "three" ? `${this.label()}：枢轴` : `半径 ${fmtLen(dist3(this.p1, c))}`;
    }
    if (this.stage === 2) {
      const g = this.gesture(ctx);
      const built = g ? buildArc(g) : null;
      if (!built) return `${this.label()}：${this.mode === "two" || this.mode === "three" ? "三点共线" : "转一下"}`;
      run((c) => { const evs = c.addEdges(built.segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)]), { curve: { kind: "arc", closed: false } }); if (built.radii.length) evs.push(...c.addEdges(built.radii.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)]))); return evs; });
      return `${this.label()} r=${fmtLen(built.radius)} · ${fmtDeg(Math.abs(built.sweep))} · ${built.segs.length} 段`;
    }
    return "";
  }
  /** 圆心弧 / 扇形转角度时画量角器弧（A34：克制的圆 + 基线 + 当前线）。 */
  viewExtras(): Partial<ViewState> {
    if (this.stage === 2 && (this.mode === "center" || this.mode === "pie") && this.p1 && this.p2 && this.plane) return { protractor: { center: this.p1, axis: this.plane.plane.n, ref: this.p2, angle: this.sweep } };
    return {};
  }
}

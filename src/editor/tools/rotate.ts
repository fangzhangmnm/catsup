// tools/rotate.ts —— 旋转工具的手势模块：steps 语法，点三下（圆心 → 参考方向 → 角度；#23 user「旋转和move对齐」），拖着也能落定。
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）：圆心落在膜上 → 转轴 = 膜法向，否则画面平面法向；参考点吸附过；
// 角度：轴向咬合先于 15° 档（user 2026-10-24「旋转的时候坐标轴方向也有snap」），意图门（反向的点吸附不合法）。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { cross3, dist3, dot3, len3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { intentAllows1D } from "../intent.ts";
import { rectFirstPlane, type DrawPlane, type SnapKind } from "../pick.ts";
import { axisAlignAngle } from "../protractor-geom.ts";
import { rotationAbout } from "../../scene/xform.ts";
import { moveTargetsSelection } from "../tools.ts";
import { MIN_GESTURE_LEN, fmtDeg } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";

/** 旋转的意图死区（弧度）：半度以内还看不出转向。量角器角度咬合：步长（度）与咬合半宽（度）。 */
const ANGLE_DEAD = 0.5 * Math.PI / 180, ANGLE_STEP_DEG = 15, ANGLE_SNAP_DEG = 1.5;
const projectThrough = (p: Pt3, c: Pt3, n: Pt3): Pt3 => { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); };

export class RotateTool implements ToolHandler {
  readonly tool = "rotate" as const;
  readonly grammar = "steps" as const;
  private stage: 0 | 1 | 2 = 0;
  private plane: DrawPlane | null = null;
  private center: Pt3 | null = null;
  private axis: Pt3 | null = null;
  private ref: Pt3 | null = null;
  private angle = 0;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.center = this.axis = this.ref = null; this.angle = 0; }
  sample(): Record<string, number> { return { angle: this.angle }; }
  describe(): Record<string, unknown> { return { rotate: { center: this.center, axis: this.axis, angle: this.angle } }; }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      if (!ctx.hasSelection()) { ctx.hint("先选中要旋转的东西（选择工具），再用量角器"); return; }
      // 圆心：落在膜上 → 转轴 = 膜法向；否则 → 画线平面（地面 / 面向的轴平面）
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.center = r.snap.p; this.axis = r.plane.plane.n; this.plane = r.plane;
      ctx.setAnchor(this.center); ctx.setSnap(r.snap);
      this.stage = 1;
      ctx.hint(`旋转 ②/③：圆心已定（转轴 = ${r.fixed ? "这张面的法向" : "当前平面法向"}）；点参考方向`);
      return;
    }
    if (this.stage === 1) {
      const view = ctx.live();
      const sn = ctx.snap(view, ev.x, ev.y, { plane: this.plane!, anchor: this.center!, alignSources: ctx.alignSources(), hand: ctx.hand(view) });
      const q = projectThrough(sn.p, this.center!, this.axis!);
      if (dist3(q, this.center!) < MIN_GESTURE_LEN) { ctx.hint("参考点离圆心太近"); return; }
      this.ref = q; this.angle = 0;
      this.stage = 2;
      ctx.setCursor(q);
      ctx.hint("旋转 ③/③：转到角度再点一下落定（15° 咬合）；也可以直接拖");
      return;
    }
    this.commit(ctx);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    if (this.stage === 1 && this.center) {
      const view = ctx.live();
      const sn = ctx.hysteresis(ctx.snap(view, s.x, s.y, { plane: this.plane!, anchor: this.center, alignSources: ctx.alignSources(), hand: ctx.hand(view) }), s.x, s.y);
      ctx.setSnap(sn);
      return;
    }
    if (this.stage !== 2 || !this.center || !this.axis || !this.ref) return;
    const c = this.center, ax = this.axis;
    const sn = ctx.snap(ctx.world(), s.x, s.y, { plane: this.plane!, anchor: c, alignSources: ctx.alignSources(), hand: ctx.hand(ctx.world()) });
    const a = sub3(this.ref, c);
    const angOf = (pt: Pt3): number => { const bb = sub3(pt, c); return Math.atan2(dot3(cross3(a, bb), ax), dot3(a, bb)); };
    // 意图门：自由角（指针落在旋转平面上的点）的符号 = 转向；反向的点吸附不合法
    const rayR = ctx.frame().ray(s.x, s.y, ctx.vp());
    const freeR = rayPlane(rayR.origin, rayR.dir, ax, dot3(ax, c));
    let q = projectThrough(sn.p, c, ax);
    let kind = sn.kind;
    if (kind !== null && freeR && len3(sub3(freeR, c)) >= MIN_GESTURE_LEN && ctx.intentOn(s, travel) && !intentAllows1D(angOf(freeR), angOf(q), ANGLE_DEAD)) { q = freeR; kind = null; }
    const b = sub3(q, c);
    if (len3(b) < MIN_GESTURE_LEN) return;
    let ang = angOf(q);
    const step = ANGLE_STEP_DEG * Math.PI / 180, near = Math.round(ang / step) * step;
    // 轴向咬合先于 15° 档（user 2026-10-24「旋转的时候坐标轴方向也有snap」）：参考方向转到与上下文某轴平行时吸住
    const axHit = kind === null ? axisAlignAngle(c, ax, this.ref, ctx.contextFrame(), ang, ANGLE_SNAP_DEG) : null;
    if (axHit) { ang = axHit.ang; ctx.setSnap({ p: q, kind: `axis-${axHit.axis}` as SnapKind }); }
    else if ((kind === null && Math.abs(ang - near) <= ANGLE_SNAP_DEG * Math.PI / 180) || ctx.mods().shift) { ang = near; ctx.setSnap({ p: q, kind: "h-stop" }); }   // Shift = 强制 15° 档（整数增量）
    else ctx.setSnap(kind ? { ...sn, kind, p: q } : null);
    this.angle = ang;
    ctx.setCursor(q);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage !== 2 || !this.center || !this.axis) return "";
    if (Math.abs(this.angle) > 1e-6) ctx.previewXform(rotationAbout(this.center, this.axis, this.angle), run);
    return `旋转 ${fmtDeg(this.angle)}`;
  }

  /** 量角器圆环 + 当前角。 */
  viewExtras(): Partial<ViewState> {
    return this.center && this.axis ? { protractor: { center: this.center, axis: this.axis, ref: this.ref, angle: this.angle } } : {};
  }

  private commit(ctx: ToolCtx): void {
    const ang = this.angle, c = this.center!, ax = this.axis!;
    const k0 = ctx.kernel(), vids = moveTargetsSelection(k0, ctx.selection()), pools = ctx.movablePoolPicks(false);
    const froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    if (Math.abs(ang) < 1e-6) return;
    ctx.commitXform(rotationAbout(c, ax, ang), vids, pools);
    ctx.recordLast({ kind: "rotate", ops: ctx.opCount() - n0, at: at0, froms, pools, center: c, axis: ax, angle: ang });
  }
}

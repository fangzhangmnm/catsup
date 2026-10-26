// tools/compass.ts —— 圆规 / 球规（纪元账本 DT50，2026-10-26 Claude Opus 5.5；尺规 2.0 文档 §3「圆规（新，user 提的）」+「球规（user 2026-10-25 晚拍了要）」）。
// user：「我之前没有想过圆规，这个完全是我的创新」「做圆规的时候顺便我真的想要球规。因为发现关卡设计这个会很有用」；10-26「圆规和球规放不放进这个纪元收尾 放」。
// 两下：圆心 → 半径点（或打半径）→ **参考圆**（画在圆心所在的平面上：落在面上 = 那张面；空处 = 当前画图平面；方向键锁平面）/ **参考球**（工具条「画：球」）。
// 数值小窗：打长度 = 精确半径；x5 = 5 个同心圆（r、2r…5r）；/5 = 把半径五等分画 5 个。产物只进参考几何（不碰内核），吸附在 solver.ts（圆上 / 交点 / 球 ∩ 画面…）。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { add3, dist3, normalize3, scale3 } from "../../kernel/geom.ts";
import { rectFirstPlane, type DrawPlane, type Snap3 } from "../pick.ts";
import { fmtLen } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { projectToAxisPlane } from "../protractor-geom.ts";

/** 半径下限（米）：点得离圆心太近 = 没打算画。 */
const COMPASS_MIN = 1e-4;

export class CompassTool implements ToolHandler {
  readonly tool = "compass" as const;
  readonly grammar = "steps" as const;
  readonly lock = "plane" as const;   // A9：方向键锁圆所在的平面
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 = 0;
  private plane: DrawPlane | null = null;
  private plane0: DrawPlane | null = null;
  private center: Pt3 | null = null;
  private rim: Pt3 | null = null;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = this.plane0 = null; this.center = this.rim = null; }
  sample(): Record<string, number> { return { r: this.radius() }; }

  private sphere(ctx: ToolCtx): boolean { return ctx.config.get("compass", "shape") === "sphere"; }
  private radius(): number { return this.center && this.rim ? dist3(this.center, this.rim) : 0; }
  private relock(ctx: ToolCtx): void { if (this.stage === 1 && this.center && this.plane0) this.plane = ctx.lockedPlane(this.center) ?? this.plane0; }
  /** 光标落点 → 半径点：圆 = 投到圆所在的平面上；球 = 原样（三维里离球心多远就是半径）。 */
  private rimOf(ctx: ToolCtx, sx: number, sy: number): { rim: Pt3; snap: Snap3 } {
    const view = ctx.live();
    const sn = ctx.snap(view, sx, sy, { plane: this.plane!, anchor: this.center!, alignSources: ctx.alignSources(), hand: ctx.hand(view), lines: true });
    return { rim: this.sphere(ctx) ? sn.p : projectToAxisPlane(sn.p, this.center!, this.plane!.plane.n), snap: sn };
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane0 = r.plane; this.plane = ctx.lockedPlane(r.snap.p) ?? r.plane; this.center = r.snap.p; this.rim = null;
      ctx.setAnchor(this.center); ctx.setSnap(r.snap); ctx.setCursor(this.center);
      this.stage = 1;
      ctx.hint(this.sphere(ctx) ? "球规 ②/②：球心已定；点半径点（或输半径）" : `圆规 ②/②：圆心已定（画在${r.fixed ? "这张面" : "当前画图平面"}上）；点半径点（或输半径）`);
      return;
    }
    this.relock(ctx);
    const { rim } = this.rimOf(ctx, ev.x, ev.y);
    if (dist3(rim, this.center!) < COMPASS_MIN) { ctx.hint("圆规：半径点离圆心太近"); return; }
    this.rim = rim;
    const sphere = this.sphere(ctx), n = this.plane!.plane.n, at = ctx.activePool(), n0 = ctx.opCount();
    ctx.commitOp(compassOp(ctx, at, this.center!, n, this.radius(), sphere));
    ctx.recordLast({ kind: "compass", ops: ctx.opCount() - n0, at, center: this.center!, n, r: this.radius(), sphere });
    ctx.hint(`${sphere ? "参考球" : "参考圆"} 半径 ${fmtLen(this.radius())}（右下角输长度改半径；x5 = 5 个同心${sphere ? "球" : "圆"}）`);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0 || !this.center) return;
    this.relock(ctx);
    const { rim, snap } = this.rimOf(ctx, s.x, s.y);
    this.rim = rim;
    ctx.setSnap(snap); ctx.setCursor(rim);
  }

  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    return this.stage === 1 && this.rim ? `半径 ${fmtLen(this.radius())}` : "";
  }

  /** 预演：半径线 + 正在画的圆 / 球（当参考几何画，和落定后一个样子）。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    if (this.stage === 0 || !this.center || !this.plane) return {};
    const out: Partial<ViewState> = {};
    if (this.rim && this.radius() >= COMPASS_MIN) {
      const base = ctx.live().guides?.() ?? { lines: [], points: [], circles: [], spheres: [] }, r = this.radius();
      out.guides = this.sphere(ctx) ? { ...base, spheres: [...base.spheres, { id: -1, c: this.center, r }] } : { ...base, circles: [...base.circles, { id: -1, c: this.center, n: this.plane.plane.n, r }] };
      out.tape = { a: this.center, b: this.rim };
    }
    return out;
  }
}

/** 一条「加参考圆 / 球」指令（世界坐标 → 当前池的本地坐标；半径按池的变换量）。 */
export function compassOp(ctx: Pick<ToolCtx, "toLocal">, at: ReturnType<ToolCtx["activePool"]>, center: Pt3, n: Pt3, r: number, sphere: boolean): import("../ops.ts").Op {
  const c = ctx.toLocal(center);
  // 本地半径：圆面里一个方向走 r，换到本地量长度（组件缩放过也对）
  const a = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const u = normalize3({ x: n.y * a.z - n.z * a.y, y: n.z * a.x - n.x * a.z, z: n.x * a.y - n.y * a.x });
  const rl = dist3(c, ctx.toLocal(add3(center, scale3(u, r))));
  if (sphere) return { op: "addGuide", at, sphere: { c, r: rl } };
  const nl = normalize3({ x: ctx.toLocal(add3(center, n)).x - c.x, y: ctx.toLocal(add3(center, n)).y - c.y, z: ctx.toLocal(add3(center, n)).z - c.z });
  return { op: "addGuide", at, circle: { c, n: nl, r: rl } };
}

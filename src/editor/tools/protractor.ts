// tools/protractor.ts —— 量角器（SU Protractor）：0.11 尺规纪元 ⑥（2026-10-24，Claude Fable 5.1；设计稿 §4）。
// 三下：圆心（定平面 = 转轴）→ 参考方向 → 转到角度（15° 咬合 + VCB 度数）→ 过圆心的**角度参考线**。预演复用旋转工具的量角器圆环。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { add3, dist3, normalize3, scale3 } from "../../kernel/geom.ts";
import { applyDir, invert } from "../../scene/xform.ts";
import { rectFirstPlane, type DrawPlane, type Snap3 } from "../pick.ts";
import { fmtLen } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { PROT_MIN, angleAbout, axisAlignAngle, detent, projectToAxisPlane, rotateDir } from "../protractor-geom.ts";

const fmtDeg = (rad: number): string => `${((rad * 180) / Math.PI).toFixed(1)}°`;

export class ProtractorTool implements ToolHandler {
  readonly tool = "protractor" as const;
  readonly grammar = "steps" as const;
  readonly lock = "plane" as const;   // A9：方向键锁量角器的盘面（法向 = 那根轴）
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 | 2 = 0;
  private plane: DrawPlane | null = null;
  private plane0: DrawPlane | null = null;   // 圆心处解析出的平面（面锁解开时回到它）
  private center: Pt3 | null = null;
  private ref: Pt3 | null = null;
  private angle = 0;
  private snappedDetent = false;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.center = this.ref = null; this.angle = 0; this.snappedDetent = false; }
  sample(): Record<string, number> { return { angle: this.angle }; }

  private axis(): Pt3 { return this.plane!.plane.n; }
  /** A9 面锁：第二点落定之前随时可锁 / 解锁——平面过首点；解锁回到首点解析出的平面。 */
  private relock(ctx: ToolCtx): void { if (this.stage === 1 && this.center && this.plane0) this.plane = ctx.lockedPlane(this.center) ?? this.plane0; }
  private snapAt(ctx: ToolCtx, sx: number, sy: number, lines: boolean): Snap3 {
    const view = ctx.live();
    return ctx.snap(view, sx, sy, { plane: this.plane!, anchor: this.center!, alignSources: ctx.alignSources(), hand: ctx.hand(view), lines });
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane0 = r.plane; this.plane = ctx.lockedPlane(r.snap.p) ?? r.plane; this.center = r.snap.p; this.ref = null; this.angle = 0;
      ctx.setAnchor(this.center); ctx.setSnap(r.snap); ctx.setCursor(this.center);
      this.stage = 1;
      ctx.hint(`量角器 ②/③：圆心已定（转轴 = ${r.fixed ? "这张面的法向" : "当前平面法向"}）；点参考方向`);
      return;
    }
    if (this.stage === 1) {
      this.relock(ctx);
      const sn = this.snapAt(ctx, ev.x, ev.y, true);
      const q = projectToAxisPlane(sn.p, this.center!, this.axis());
      if (dist3(q, this.center!) < PROT_MIN) { ctx.hint("量角器：参考点离圆心太近"); return; }
      this.ref = q; this.angle = 0;
      this.stage = 2;
      ctx.hint("量角器 ③/③：转到角度再点一下 → 角度参考线（15° 咬合；输度数可精确）");
      return;
    }
    const dir = rotateDir(this.center!, this.axis(), this.ref!, this.angle);
    const at = ctx.activePool(), n0 = ctx.opCount();
    const mInv = invert(ctx.ctxXform());
    ctx.commitOp({ op: "addGuide", at, line: { p: ctx.toLocal(this.center!), dir: normalize3(applyDir(mInv, dir)) } });
    ctx.recordLast({ kind: "protractor", ops: ctx.opCount() - n0, at, center: this.center!, axis: this.axis(), ref: this.ref!, angle: this.angle });
    ctx.hint(`角度参考线 ${fmtDeg(this.angle)}`);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0 || !this.center) return;
    if (this.stage === 1) {
      this.relock(ctx);
      const sn = this.snapAt(ctx, s.x, s.y, true);
      ctx.setSnap(sn); ctx.setCursor(projectToAxisPlane(sn.p, this.center, this.axis()));
      return;
    }
    const sn = this.snapAt(ctx, s.x, s.y, false);
    const q = projectToAxisPlane(sn.p, this.center, this.axis());
    if (dist3(q, this.center) < PROT_MIN) return;
    let ang = angleAbout(this.center, this.axis(), this.ref!, q);
    this.snappedDetent = false;
    let axisKind: "axis-x" | "axis-y" | "axis-z" | null = null;
    if (sn.kind === null) {
      const ax = axisAlignAngle(this.center, this.axis(), this.ref!, ctx.contextFrame(), ang);   // 轴向先于 15° 档
      if (ax) { ang = ax.ang; axisKind = `axis-${ax.axis}`; }
      else { const d = detent(ang); ang = d.ang; this.snappedDetent = d.snapped; }
    }
    this.angle = ang;
    ctx.setSnap(axisKind ? { p: q, kind: axisKind } : this.snappedDetent ? { p: q, kind: "h-stop" } : sn);
    ctx.setCursor(q);
  }


  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage === 1 && this.center) return "量角器：参考方向";
    if (this.stage === 2) return `角度 ${fmtDeg(this.angle)}`;
    return "";
  }

  /** 旋转工具的量角器圆环 + 候选参考线。 */
  viewExtras(): Partial<ViewState> {
    if (this.stage === 0 || !this.center || !this.plane) return {};
    const out: Partial<ViewState> = { protractor: { center: this.center, axis: this.axis(), ref: this.ref, angle: this.angle } };
    if (this.stage === 2 && this.ref) {
      const dir = rotateDir(this.center, this.axis(), this.ref, this.angle);
      out.tape = { a: this.center, b: add3(this.center, scale3(dir, dist3(this.ref, this.center))), guide: { p: this.center, dir } };
    }
    return out;
  }
}
void fmtLen;

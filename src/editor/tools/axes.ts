// tools/axes.ts —— 轴工具（SU Axes）：0.11 尺规纪元 ④（2026-10-24，Claude Fable 5.1；设计稿 §4）。
// 三下：原点 → X 方向（红）→ Y 方向（绿）；Z = X × Y 右手系。根上下文 = 搬绘图轴（推断的原点与三轴、上下文轴线跟着走）；
// 进了 group = 改那个 group 的轴（Change Axes：几何不动、帧换掉）。预演：候选帧直接当 ViewState.frame 画出来。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { rectFirstPlane, type DrawPlane, type Snap3 } from "../pick.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import type { Frame } from "../../scene/xform.ts";
import { frameFrom3 } from "../axes-geom.ts";
export { frameFrom3 } from "../axes-geom.ts";

export class AxesTool implements ToolHandler {
  readonly tool = "axes" as const;
  readonly grammar = "steps" as const;
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 | 2 = 0;
  private plane: DrawPlane | null = null;
  private o: Pt3 | null = null;
  private px: Pt3 | null = null;
  private cur: Pt3 | null = null;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.o = this.px = this.cur = null; }
  sample(): Record<string, number> { return {}; }

  private snapAt(ctx: ToolCtx, sx: number, sy: number, anchor: Pt3): Snap3 {
    const view = ctx.live();
    return ctx.snap(view, sx, sy, { plane: this.plane!, anchor, alignSources: ctx.alignSources(), hand: ctx.hand(view) });
  }
  private candidate(): Frame | null {
    if (!this.o || !this.plane) return null;
    if (this.stage === 1) return this.cur ? frameFrom3(this.o, this.cur, null, this.plane.plane.n) : null;
    if (this.stage === 2 && this.px) return frameFrom3(this.o, this.px, this.cur, this.plane.plane.n);
    return null;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane = r.plane; this.o = r.snap.p; this.px = this.cur = null;
      ctx.setAnchor(this.o); ctx.setSnap(r.snap); ctx.setCursor(this.o);
      this.stage = 1;
      ctx.hint("轴 ②/③：点 X 方向（红）——三色轴跟着预览");
      return;
    }
    const sn = this.snapAt(ctx, ev.x, ev.y, this.stage === 1 ? this.o! : this.o!);
    if (this.stage === 1) {
      if (!frameFrom3(this.o!, sn.p, null, this.plane!.plane.n)) { ctx.hint("轴：X 方向点离原点太近"); return; }
      this.px = sn.p; this.cur = null;
      this.stage = 2;
      ctx.hint("轴 ③/③：点 Y 方向（绿）；Z 随右手系");
      return;
    }
    const f = frameFrom3(this.o!, this.px!, sn.p, this.plane!.plane.n);
    if (!f) { ctx.hint("轴：Y 方向与 X 共线，换个点"); return; }
    ctx.setAxes(f);
    ctx.hint(ctx.activePool().group !== null ? "组的轴已换（几何不动）" : "绘图轴已搬");
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0 || !this.o) return;
    const sn = this.snapAt(ctx, s.x, s.y, this.o);
    this.cur = sn.p;
    ctx.setSnap(sn); ctx.setCursor(sn.p);
  }


  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    return this.stage === 1 ? "轴 ②/③：X 方向" : this.stage === 2 ? "轴 ③/③：Y 方向" : "";
  }

  /** 候选帧直接画成上下文轴。 */
  viewExtras(): Partial<ViewState> {
    const f = this.candidate();
    return f ? { frame: f } : {};
  }
}

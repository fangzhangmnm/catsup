// tools/axes.ts —— 坐标架工具（SU Axes）：0.11 尺规纪元 ④（2026-10-24，Claude Fable 5.1；设计稿 §4）。
// 三下：原点 → X 方向（红）→ Y 方向（绿）；Z = X × Y 右手系。预演：候选帧直接当 ViewState.frame 画出来。
// DT86（2026-10-26 Claude Opus 5.5；user「坐标架同意」）：只搬画图用的坐标架——最外层 / 组里 / 组件里都一样，从不碰几何；
// 改组件原点 = 选中组件「改组件原点…」开的会话，同一套点击由编辑器改投到组件原点（ctx.setAxes 一个口；提示行由编辑器写）。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { rectFirstPlane, type DrawPlane, type Snap3 } from "../pick.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
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
      if (ctx.config.get("axes", "mode") === "point") {   // 只设原点（默认）：点一下，朝向照旧
        const cf = ctx.axesBase();
        ctx.setAxes({ origin: r.snap.p, x: cf.x, y: cf.y, z: cf.z });
        ctx.setSnap(null);
        return;
      }
      this.plane = r.plane; this.o = r.snap.p; this.px = this.cur = null;
      ctx.setAnchor(this.o); ctx.setSnap(r.snap); ctx.setCursor(this.o);
      this.stage = 1;
      ctx.hint("坐标架 ②/③：点 X 方向（红）——三色轴跟着预览");
      return;
    }
    const sn = this.snapAt(ctx, ev.x, ev.y, this.stage === 1 ? this.o! : this.o!);
    if (this.stage === 1) {
      if (!frameFrom3(this.o!, sn.p, null, this.plane!.plane.n)) { ctx.hint("坐标架：X 方向点离原点太近"); return; }
      this.px = sn.p; this.cur = null;
      this.stage = 2;
      ctx.hint("坐标架 ③/③：点 Y 方向（绿）；Z 随右手系");
      return;
    }
    const f = frameFrom3(this.o!, this.px!, sn.p, this.plane!.plane.n);
    if (!f) { ctx.hint("坐标架：Y 方向与 X 共线，换个点"); return; }
    this.cancel();
    ctx.setAxes(f);
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0 || !this.o) return;
    const sn = this.snapAt(ctx, s.x, s.y, this.o);
    this.cur = sn.p;
    ctx.setSnap(sn); ctx.setCursor(sn.p);
  }


  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    return this.stage === 1 ? "坐标架 ②/③：X 方向" : this.stage === 2 ? "坐标架 ③/③：Y 方向" : "";
  }

  /** 候选帧直接画成上下文轴。 */
  viewExtras(): Partial<ViewState> {
    const f = this.candidate();
    return f ? { frame: f } : {};
  }
}

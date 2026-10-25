// tools/tape.ts —— 卷尺（SU Tape Measure）：0.11 尺规纪元 ③（2026-10-24，Claude Fable 5.1；设计稿 ai-docs/20261024-ruler-compass-design.md §4）。
// 两下：第一下定起点（吸附过，rectFirstPlane 同圆 / 弧的首点推断）；第二下落定。**起点落在哪决定产物**（SU 同款，不加动词）：
//   边上 / 参考线上          → 平行参考线（偏移）：过第二点、与那条线平行，距离 = 垂距
//   端点 / 中点 / 交点 / 原点 / 参考点 / 参考线交点 → 参考点：落在第二点（VCB 改沿起点→终点方向的距离）
//   面上 / 空处              → 只量：状态行报长度，不留东西
// 预演 = 量线 + 候选参考线（viewExtras → render3 tape 层）；VCB：距离（撤销刚才那条、按精确值重做）。落定后回到第一下（SU：卷尺一直在手上）。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { applyDir, invert } from "../../scene/xform.ts";
import { rectFirstPlane, type DrawPlane, type Snap3 } from "../pick.ts";
import { fmtLen } from "../editor.ts";
import { type TapeStart, classifyStart, tapeResult } from "../tape-geom.ts";
export { type TapeResult, type TapeStart, classifyStart, tapeResult } from "../tape-geom.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import type { WorldView } from "../../scene/world-view.ts";

/** 吸附点所在的边 / 参考线的方向（世界坐标）；找不到 = null。
 *  D23（2026-10-25 Opus，user「卷尺在snap模式下还是只能打点不能打线」）：栅格开着时「边上 / 参考线上」被求解器改写成落格的点——
 *  这时只认「这个点正落在光标下那条边或某条参考线上」，落在线上才给方向（卷尺出平行线），否则照旧只量。 */
function lineDirAt(view: WorldView, sn: Snap3, pick: { edge?: number }): Pt3 | null {
  const onLine = (a: Pt3, dir: Pt3): boolean => { const v = sub3(sn.p, a); const off = sub3(v, scale3(dir, dot3(v, dir))); return Math.hypot(off.x, off.y, off.z) < 1e-6; };
  const lattice = sn.kind === "grid-point" || sn.kind === "increment";
  if (sn.kind === "on-guide") {
    for (const l of view.guides().lines) if (onLine(l.p, l.dir)) return l.dir;
    return null;
  }
  if (pick.edge !== undefined && view.graph.hasEdge(pick.edge)) {
    const e = view.graph.edge(pick.edge), a = view.graph.pt(e.a), d = normalize3(sub3(view.graph.pt(e.b), a));
    if (!lattice || onLine(a, d)) return d;
  }
  if (lattice) for (const l of view.guides().lines) if (onLine(l.p, l.dir)) return l.dir;
  return null;
}

export class TapeTool implements ToolHandler {
  readonly tool = "tape" as const;
  readonly grammar = "steps" as const;
  readonly lock = "axis" as const;   // A9：方向键锁轴、Shift+方向键锁面
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 = 0;
  private plane: DrawPlane | null = null;
  private start: TapeStart | null = null;
  private b: Pt3 | null = null;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.start = this.b = null; }
  sample(): Record<string, number> { return {}; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const view = ctx.live();
      const r = rectFirstPlane(view, ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane = r.plane;
      this.start = classifyStart(r.snap, lineDirAt(view, r.snap, ctx.pick(ev.x, ev.y)));
      this.b = null;
      ctx.setAnchor(this.start.p); ctx.setSnap(r.snap); ctx.setCursor(this.start.p);
      this.stage = 1;
      ctx.hint(this.start.kind === "line" ? "卷尺：拖开 → 平行参考线（输距离可精确）" : this.start.kind === "through" ? "卷尺：从参考点拉 → 过两点的参考线（参考点留着）" : this.start.kind === "point" ? "卷尺：沿方向拖 → 参考点（输距离可精确）" : "卷尺：点第二点只量长度");
      return;
    }
    const b = this.b ?? this.start!.p;
    const res = tapeResult(this.start!, b);
    if (res.make === "through") {   // 过两点的参考线：没有距离参数，不登记给数值小窗
      const mInv = invert(ctx.ctxXform());
      ctx.commitOp({ op: "addGuide", at: ctx.activePool(), line: { p: ctx.toLocal(res.p), dir: normalize3(applyDir(mInv, res.dir)) } });
      ctx.hint("参考线 · 过两点");
    } else if (res.make === "line" || res.make === "point") {
      const at = ctx.activePool(), n0 = ctx.opCount();
      const mInv = invert(ctx.ctxXform());
      if (res.make === "line") ctx.commitOp({ op: "addGuide", at, line: { p: ctx.toLocal(res.p), dir: normalize3(applyDir(mInv, res.dir)) } });
      else ctx.commitOp({ op: "addGuide", at, point: ctx.toLocal(res.p) });
      const a = this.start!.p;
      const dir = res.make === "line" ? normalize3(sub3(res.p, a)) : normalize3(sub3(res.p, a));
      ctx.recordLast({ kind: "tape", ops: ctx.opCount() - n0, at, a, dir, d: res.d, make: res.make, ...(res.make === "line" ? { lineDir: res.dir } : {}) });
      ctx.hint(res.make === "line" ? `参考线 · 偏移 ${fmtLen(res.d)}` : `参考点 · 距 ${fmtLen(res.d)}`);
    } else {
      ctx.hint(res.d > 0 ? `距离 ${fmtLen(res.d)}` : "卷尺：第二点太近，没量到");
    }
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0 || !this.start) return;
    const view = ctx.live();
    const sn = ctx.applyLock(ctx.snap(view, s.x, s.y, { plane: this.plane!, anchor: this.start.p, alignSources: ctx.alignSources(), hand: ctx.hand(view) }), s.x, s.y);   // A9 轴锁
    this.b = sn.p;
    ctx.setSnap(sn); ctx.setCursor(sn.p);
  }


  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage !== 1 || !this.start || !this.b) return "";
    const r = tapeResult(this.start, this.b);
    return r.make === "line" ? `偏移 ${fmtLen(r.d)}` : r.make === "through" ? `过两点 · ${fmtLen(r.d)}` : r.make === "point" ? `距 ${fmtLen(r.d)}` : `距离 ${fmtLen(r.d)}`;
  }

  /** 量线 + 候选参考线 / 参考点（render3 tape 层）。 */
  viewExtras(): Partial<ViewState> {
    if (this.stage !== 1 || !this.start || !this.b) return {};
    const r = tapeResult(this.start, this.b);
    return { tape: { a: this.start.p, b: this.b, guide: r.make === "line" || r.make === "through" ? { p: r.p, dir: r.dir } : null, point: r.make === "point" ? r.p : null } };
  }
}

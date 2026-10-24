// tools/arc.ts —— 弧工具（SU 两点弧：起点、终点、再拉凸度）的手势模块（0.10 曲线与曲面纪元，2026-10-24，Claude Fable 5.1；设计稿 §4.3）。
// 三下：第一下定平面与起点 A（圆 / 矩形同一套 rectFirstPlane 推断）；第二下定终点 B；之后移动 = 弧上第三点（凸度），第三下落定。
// 预演：A、B 定了之后把弧当像跑到克隆内核上；落定 = addEdges + 曲线规格（arc，圆心 / 半径 / 法向 / x 轴 / 整圆段数等效值）。
// 段数 = 工具配置 arc.segments（SU 默认 12）。Esc / 换工具 = cancel。
import type { Kernel } from "../../kernel/kernel.ts";
import type { CurveSpec, FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { dist3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { rectFirstPlane, type DrawPlane } from "../pick.ts";
import { arcSegmentsOnPlane, arcToolTargets, curveSpecToLocal } from "../tools.ts";
import { fmtLen, MIN_GESTURE_LEN } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

const projectThrough = (p: Pt3, c: Pt3, n: Pt3): Pt3 => { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); };

export class ArcTool implements ToolHandler {
  readonly tool = "arc" as const;
  readonly grammar = "steps" as const;
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }
  private stage: 0 | 1 | 2 = 0;
  private plane: DrawPlane | null = null;
  private a: Pt3 | null = null;
  private b: Pt3 | null = null;
  private p: Pt3 | null = null;

  active(): boolean { return this.stage > 0; }
  cancel(): void { this.stage = 0; this.plane = null; this.a = this.b = this.p = null; }
  sample(): Record<string, number> { return {}; }

  /** 指针在手势平面上的点（吸附过；吸不到就射线落面）。 */
  private pointOnPlane(ctx: ToolCtx, sx: number, sy: number, anchor: Pt3): Pt3 | null {
    const view = ctx.live();
    const pl = this.plane!;
    const toolTargets = this.stage === 2 && this.a && this.b ? arcToolTargets(this.a, this.b, pl.plane.n) : null;   // 半圆（B22）
    const sn = ctx.snap(view, sx, sy, { plane: pl, anchor, alignSources: ctx.alignSources(), hand: ctx.hand(view), toolTargets });
    ctx.setSnap(sn);
    if (sn.p) return projectThrough(sn.p, anchor, pl.plane.n);
    const ray = ctx.frame().ray(sx, sy, ctx.vp());
    return rayPlane(ray.origin, ray.dir, pl.plane.n, pl.plane.d);
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.stage === 0) {
      const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
      this.plane = r.plane; this.a = r.snap.p; this.p = this.b = null;
      ctx.setAnchor(this.a); ctx.setSnap(r.snap); ctx.setCursor(this.a);
      this.stage = 1;
      ctx.hint("弧：点终点");
      return;
    }
    if (this.stage === 1) {
      const q = this.pointOnPlane(ctx, ev.x, ev.y, this.a!);
      if (!q || dist3(q, this.a!) < MIN_GESTURE_LEN) return;
      this.b = q; this.p = null;
      this.stage = 2;
      ctx.hint("弧：移动定凸度，再点一下落定；Esc 取消");
      return;
    }
    // stage 2：落定
    const q = this.pointOnPlane(ctx, ev.x, ev.y, this.a!) ?? this.p;
    const arc = q ? arcSegmentsOnPlane(this.plane!.plane, this.plane!.basis, this.a!, this.b!, q, ctx.config.get("arc", "segments")) : null;
    if (!arc) { ctx.hint("弧：三点共线画不出弧，换个凸度"); return; }
    const n = arc.segs.length, full = Math.max(3, Math.round((n * Math.PI * 2) / Math.abs(arc.sweep)));
    const spec: CurveSpec = { kind: "arc", closed: false, params: { center: arc.center, radius: arc.radius, normal: this.plane!.plane.n, xaxis: normalize3(sub3(this.a!, arc.center)), segments: full } };
    ctx.commitOp({ op: "addEdges", at: ctx.activePool(), segs: arc.segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)]), curve: curveSpecToLocal((pt) => ctx.toLocal(pt), spec) });
    ctx.hint(`弧 r=${fmtLen(arc.radius)} · ${n} 段`);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.stage === 0) return;
    const q = this.pointOnPlane(ctx, s.x, s.y, this.a!);
    if (!q) return;
    if (this.stage === 1) ctx.setCursor(q);
    else { this.p = q; ctx.setCursor(q); }
  }


  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.stage === 1 && this.a) return `弦 ${fmtLen(dist3(this.a, this.b ?? this.a))}`;
    if (this.stage === 2 && this.a && this.b && this.p) {
      const arc = arcSegmentsOnPlane(this.plane!.plane, this.plane!.basis, this.a, this.b, this.p, ctx.config.get("arc", "segments"));
      if (!arc) return "弧：三点共线";
      run((c) => c.addEdges(arc.segs.map(([u, v]) => [ctx.toLocal(u), ctx.toLocal(v)]), { curve: { kind: "arc", closed: false } }));
      return `弧 r=${fmtLen(arc.radius)} · ${arc.segs.length} 段`;
    }
    return "";
  }
}

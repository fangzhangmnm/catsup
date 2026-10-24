// tools/scale.ts —— 缩放工具的手势模块：direct 语法（按住包围盒上的柄拖；角柄 = 等比、面心柄 = 单轴；柄跟着预演实时动）。
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）。柄每帧从选区包围盒重算（不再靠 rebuildScaleHandles 的触发点）。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { add3, dist3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { closestOnAxis } from "../camera.ts";
import { intentAllows1D } from "../intent.ts";
import { applyPt, scalingAbout } from "../../scene/xform.ts";
import { moveTargetsSelection } from "../tools.ts";
import { MIN_GESTURE_LEN } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";

interface Handle { kind: "corner" | "face"; p: Pt3; anchor: Pt3; axis: Pt3 | null }
const SNAP_FACTORS = [0.5, 1, 1.5, 2, 3, 4];

export class ScaleTool implements ToolHandler {
  readonly tool = "scale" as const;
  readonly grammar = "direct" as const;
  private h: Handle | null = null;   // 正在拖的柄
  private hIdx = -1;
  private t0 = 1;
  private f: Pt3 = { x: 1, y: 1, z: 1 };

  active(): boolean { return this.h !== null; }
  cancel(): void { this.h = null; this.hIdx = -1; this.f = { x: 1, y: 1, z: 1 }; }
  sample(): Record<string, number> { return { fx: this.f.x, fy: this.f.y, fz: this.f.z }; }
  describe(): Record<string, unknown> { return { scale: { anchor: this.h?.anchor ?? null, f: this.f } }; }

  /** 角柄 8 个（等比）+ 面心柄 6 个（单轴），按选区的世界包围盒。 */
  private handles(ctx: ToolCtx): Handle[] {
    const b = ctx.targetBounds();
    if (!b) return [];
    const { min, max } = b, out: Handle[] = [];
    const mid = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
    for (const sx of [0, 1]) for (const sy of [0, 1]) for (const sz of [0, 1]) {
      out.push({ kind: "corner", p: { x: sx ? max.x : min.x, y: sy ? max.y : min.y, z: sz ? max.z : min.z }, anchor: { x: sx ? min.x : max.x, y: sy ? min.y : max.y, z: sz ? min.z : max.z }, axis: null });
    }
    const faces: [Pt3, Pt3, Pt3][] = [
      [{ x: max.x, y: mid.y, z: mid.z }, { x: min.x, y: mid.y, z: mid.z }, { x: 1, y: 0, z: 0 }], [{ x: min.x, y: mid.y, z: mid.z }, { x: max.x, y: mid.y, z: mid.z }, { x: -1, y: 0, z: 0 }],
      [{ x: mid.x, y: max.y, z: mid.z }, { x: mid.x, y: min.y, z: mid.z }, { x: 0, y: 1, z: 0 }], [{ x: mid.x, y: min.y, z: mid.z }, { x: mid.x, y: max.y, z: mid.z }, { x: 0, y: -1, z: 0 }],
      [{ x: mid.x, y: mid.y, z: max.z }, { x: mid.x, y: mid.y, z: min.z }, { x: 0, y: 0, z: 1 }], [{ x: mid.x, y: mid.y, z: min.z }, { x: mid.x, y: mid.y, z: max.z }, { x: 0, y: 0, z: -1 }],
    ];
    for (const [p, anchor, axis] of faces) if (dist3(p, anchor) >= MIN_GESTURE_LEN) out.push({ kind: "face", p, anchor, axis });
    return out;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (!ctx.hasSelection()) { ctx.hint("先选中要缩放的东西（选择工具），再拖包围盒上的柄"); return; }
    const hs = this.handles(ctx);
    let best = -1, bd = ctx.eps().hit * 1.5;
    hs.forEach((h, i) => { const d = ctx.frame().distTo(ev.x, ev.y, h.p, ctx.vp()); if (d <= bd) { bd = d; best = i; } });
    if (best < 0) { ctx.hint("按住包围盒上的柄拖：角 = 等比，面心 = 单轴"); return; }
    const h = hs[best];
    this.h = h; this.hIdx = best;
    this.f = { x: 1, y: 1, z: 1 };
    const dir = normalize3(sub3(h.p, h.anchor));
    const ray = ctx.frame().ray(ev.x, ev.y, ctx.vp());
    const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
    this.t0 = q ? Math.max(dot3(sub3(q, h.anchor), dir), MIN_GESTURE_LEN) : dist3(h.p, h.anchor);
    ctx.setCursor(h.p);
    ctx.hint(h.kind === "corner" ? "等比缩放：沿对角拖" : "单轴缩放：沿轴拖");
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    const h = this.h;
    if (!h) return;
    const dir = normalize3(sub3(h.p, h.anchor));
    const ray = ctx.frame().ray(s.x, s.y, ctx.vp());
    const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
    if (!q) return;
    const t = dot3(sub3(q, h.anchor), dir);
    let f = t / this.t0;
    if (Math.abs(f) < 1e-3) f = 1e-3;   // 不许缩到零（退化）
    // 意图门：倍率相对 1 的符号 = 放大 / 缩小；反向的咬合不合法（1 本身保留）
    const snapped = SNAP_FACTORS.find((v) => Math.abs(f - v) < 0.02 && (!ctx.intentOn(s, travel) || intentAllows1D(f - 1, v - 1, 0.01)));
    if (snapped !== undefined) f = snapped;
    this.f = h.kind === "corner" ? { x: f, y: f, z: f } : { x: h.axis!.x ? f : 1, y: h.axis!.y ? f : 1, z: h.axis!.z ? f : 1 };
    const cur = add3(h.anchor, scale3(dir, t));
    ctx.setCursor(cur);
    ctx.setSnap(snapped !== undefined ? { p: cur, kind: "h-stop" } : null);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (!this.h) return "";
    const s = this.f;
    ctx.previewXform(scalingAbout(this.h.anchor, s), run);
    return `缩放 ${s.x.toFixed(3)} × ${s.y.toFixed(3)} × ${s.z.toFixed(3)}`;
  }

  up(ctx: ToolCtx, _ev: ToolPointer, settle: () => ToolSample | null): void {
    const h = this.h;
    if (!h) return;
    const smp = settle();
    const s: Pt3 = smp && smp.extra.fx !== undefined ? { x: smp.extra.fx, y: smp.extra.fy, z: smp.extra.fz } : this.f;
    const anchor = h.anchor, axis = h.axis;
    const k0 = ctx.kernel(), vids = moveTargetsSelection(k0, ctx.selection()), pools = ctx.movablePoolPicks(false);
    const froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    this.cancel();
    ctx.setCursor(null); ctx.setSnap(null);
    if (Math.abs(s.x - 1) < 1e-9 && Math.abs(s.y - 1) < 1e-9 && Math.abs(s.z - 1) < 1e-9) return;
    ctx.commitXform(scalingAbout(anchor, s), vids, pools);
    ctx.recordLast({ kind: "scale", ops: ctx.opCount() - n0, at: at0, froms, pools, anchor, axis, f: s });
  }

  /** 柄跟着预演实时动（user 2026-10-21「缩放的handle应该跟着实时动」）：拖动中按当前倍率把柄过一遍同一个变换。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    const hs = this.handles(ctx);
    const X = this.h ? scalingAbout(this.h.anchor, this.f) : null;
    return { handles: hs.map((h, i) => ({ p: X ? applyPt(X, h.p) : h.p, active: i === this.hIdx })) };
  }
}

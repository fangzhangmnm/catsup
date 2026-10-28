// tools/scale.ts —— 缩放工具的手势模块：direct 语法（按住包围盒上的柄拖；角柄 = 等比、面心柄 = 单轴；柄跟着预演实时动）。
// 2026-10-26 恢复（user「box也需要，emmmm，因为box对对齐很重要，这样，先留着move rotate scale，transform做单独的，就是恢复之前的scale」）：
// v0.14.17–0.14.19 改名「变换」那段的改进都留着——×−1 咬合（面心柄拖过对面 = 沿轴镜像）、咬合按屏距、柄透视画透视拾；加：落定记下选区 → 数值小窗 *n /n 缩放阵列。
// 带箭头 / 环 / 轴心的「变换」是另一个工具（tools/transform.ts）。edited by Claude Opus 5.5
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）。柄每帧从选区包围盒重算（不再靠 rebuildScaleHandles 的触发点）。created 2026-10-24 by Claude Fable 5.1
// 2026-10-26 包围盒有朝向（ctx.orientFrame：只选一个组 / 组件 = 它自己的轴，否则上下文的轴；以前一律世界轴）——沿组件自己的轴缩放不会斜切（斜切护栏，user「和gltf对齐」）。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { add3, dist3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { closestOnAxis } from "../camera.ts";
import { intentAllows1D } from "../intent.ts";
import { type Xform, applyPt, scalingAbout, scalingAlong } from "../../scene/xform.ts";
import { moveTargetsSelection } from "../tools.ts";
import { MIN_GESTURE_LEN } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";
import { pickHandle } from "../handle-pick.ts";

/** axis = 面心柄沿的那根单位轴（世界）；角柄 null。 */
interface Handle { kind: "corner" | "face"; p: Pt3; anchor: Pt3; axis: Pt3 | null }
/** 咬合的倍率。−1 = 面心柄拖过对面 = 沿那根轴镜像（user 2026-10-25「scale有snapping吗。最常用的就是用来x -1」）。 */
const SNAP_FACTORS = [-1, 0.5, 1, 1.5, 2, 3, 4];

export class ScaleTool implements ToolHandler {
  readonly tool = "scale" as const;
  readonly grammar = "direct" as const;
  private h: Handle | null = null;   // 正在拖的柄
  private hIdx = -1;
  private t0 = 1;
  private f = 1;   // 倍率（角柄 = 三轴等比；面心柄 = 沿 h.axis）

  active(): boolean { return this.h !== null; }
  cancel(): void { this.h = null; this.hIdx = -1; this.f = 1; }
  sample(): Record<string, number> { return { f: this.f }; }
  /** 这一柄 + 倍率的变换（世界）。 */
  private static xform(h: Handle, f: number): Xform { return h.kind === "corner" || !h.axis ? scalingAbout(h.anchor, { x: f, y: f, z: f }) : scalingAlong(h.anchor, h.axis, f); }
  describe(): Record<string, unknown> { return { scale: { anchor: this.h?.anchor ?? null, f: this.f } }; }

  /** 角柄 8 个（等比）+ 面心柄 6 个（单轴），按选区在 orientFrame 下的包围盒（有朝向）。 */
  private handles(ctx: ToolCtx): Handle[] {
    const F = ctx.orientFrame(), b = ctx.boxIn(F);
    if (!b) return [];
    const W = (c: Pt3): Pt3 => add3(add3(scale3(F.x, c.x), scale3(F.y, c.y)), scale3(F.z, c.z));   // 盒坐标 → 世界（三轴单位正交）
    const { min, max } = b, out: Handle[] = [];
    const mid = { x: (min.x + max.x) / 2, y: (min.y + max.y) / 2, z: (min.z + max.z) / 2 };
    for (const sx of [0, 1]) for (const sy of [0, 1]) for (const sz of [0, 1]) {
      out.push({ kind: "corner", p: W({ x: sx ? max.x : min.x, y: sy ? max.y : min.y, z: sz ? max.z : min.z }), anchor: W({ x: sx ? min.x : max.x, y: sy ? min.y : max.y, z: sz ? min.z : max.z }), axis: null });
    }
    const faces: [Pt3, Pt3, Pt3][] = [
      [{ x: max.x, y: mid.y, z: mid.z }, { x: min.x, y: mid.y, z: mid.z }, F.x], [{ x: min.x, y: mid.y, z: mid.z }, { x: max.x, y: mid.y, z: mid.z }, scale3(F.x, -1)],
      [{ x: mid.x, y: max.y, z: mid.z }, { x: mid.x, y: min.y, z: mid.z }, F.y], [{ x: mid.x, y: min.y, z: mid.z }, { x: mid.x, y: max.y, z: mid.z }, scale3(F.y, -1)],
      [{ x: mid.x, y: mid.y, z: max.z }, { x: mid.x, y: mid.y, z: min.z }, F.z], [{ x: mid.x, y: mid.y, z: min.z }, { x: mid.x, y: mid.y, z: max.z }, scale3(F.z, -1)],
    ];
    for (const [pc, ac, axis] of faces) { const p = W(pc), anchor = W(ac); if (dist3(p, anchor) >= MIN_GESTURE_LEN) out.push({ kind: "face", p, anchor, axis }); }
    return out;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (!ctx.hasSelection()) { ctx.hint("先选中要缩放的东西（选择工具），再拖包围盒上的柄"); return; }
    // 柄透视画、透视拾（埋在几何里也点得中；user 2026-10-25「缩放的gizmos如果卡几何里面应该能点中」）
    const hs = this.handles(ctx), ray0 = ctx.frame().ray(ev.x, ev.y, ctx.vp());
    const best = pickHandle(hs.map((h) => ({ d: ctx.frame().distTo(ev.x, ev.y, h.p, ctx.vp()), z: dot3(sub3(h.p, ray0.origin), ray0.dir) })), ctx.eps().hit);
    if (best < 0) { ctx.hint("按住包围盒上的柄拖：角 = 等比，面心 = 单轴"); return; }
    const h = hs[best];
    this.h = h; this.hIdx = best;
    this.f = 1;
    const dir = normalize3(sub3(h.p, h.anchor));
    const ray = ctx.frame().ray(ev.x, ev.y, ctx.vp());
    const q = closestOnAxis(h.anchor, dir, ray.origin, ray.dir);
    this.t0 = q ? Math.max(dot3(sub3(q, h.anchor), dir), MIN_GESTURE_LEN) : dist3(h.p, h.anchor);
    ctx.setCursor(h.p);
    ctx.hint(h.kind === "corner" ? "等比缩放：沿对角拖" : "单轴缩放：沿轴拖（拖过对面到 −1 = 沿这根轴镜像）");
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
    // 咬合按屏距（和别的吸附一样）：光标离「倍率 v 的落点」在吸附半径内就咬住、最近的赢（2026-10-25 改：以前是倍率差 < 0.02，屏上只有几个像素、很难咬到）。
    // 意图门：倍率相对 1 的符号 = 放大 / 缩小；反向的咬合不合法（1 本身保留）
    let snapped: number | undefined, bestD = ctx.eps().snap;
    for (const v of SNAP_FACTORS) {
      if (ctx.intentOn(s, travel) && !intentAllows1D(f - 1, v - 1, 0.01)) continue;
      const d = ctx.frame().distTo(s.x, s.y, add3(h.anchor, scale3(dir, v * this.t0)), ctx.vp());
      if (d <= bestD) { bestD = d; snapped = v; }
    }
    if (snapped !== undefined) f = snapped;
    this.f = f;
    const cur = add3(h.anchor, scale3(dir, t));
    ctx.setCursor(cur);
    ctx.setSnap(snapped !== undefined ? { p: cur, kind: "h-stop" } : null);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (!this.h) return "";
    ctx.previewXform(ScaleTool.xform(this.h, this.f), run);
    return `缩放 ${this.h.kind === "corner" ? "等比" : "单轴"} ×${this.f.toFixed(3)}`;
  }

  up(ctx: ToolCtx, _ev: ToolPointer, settle: () => ToolSample | null): void {
    const h = this.h;
    if (!h) return;
    const smp = settle();
    const f = smp && smp.extra.f !== undefined ? smp.extra.f : this.f;
    const anchor = h.anchor, axis = h.axis;
    const sel = ctx.selection(), k0 = ctx.kernel(), vids = moveTargetsSelection(k0, sel), pools = ctx.movablePoolPicks(false);
    const entities = { faces: [...sel.faces], edges: [...sel.edges] };   // 数值小窗 *n /n 缩放阵列要抠副本（2026-10-26）
    const froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    this.cancel();
    ctx.setCursor(null); ctx.setSnap(null);
    if (Math.abs(f - 1) < 1e-9) return;
    ctx.commitXform(ScaleTool.xform(h, f), vids, pools);
    ctx.recordLast({ kind: "scale", ops: ctx.opCount() - n0, at: at0, froms, pools, anchor, axis: null, f: { x: f, y: f, z: f }, entities, ...(h.kind === "face" && axis ? { dirs: [axis] } : {}) });
  }

  /** 柄跟着预演实时动（user 2026-10-21「缩放的handle应该跟着实时动」）：拖动中按当前倍率把柄过一遍同一个变换。 */
  viewExtras(ctx: ToolCtx): Partial<ViewState> {
    const hs = this.handles(ctx);
    const X = this.h ? ScaleTool.xform(this.h, this.f) : null;
    return { handles: hs.map((h, i) => ({ p: X ? applyPt(X, h.p) : h.p, active: i === this.hIdx })) };
  }
}

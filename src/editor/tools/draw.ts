// tools/draw.ts —— 画线 / 矩形 / 圆 三个取量型工具（steps 语法）：首点（rectFirstPlane 定平面 + 吸附）→ 第二点（面内 / 可切面）→ 落定。
// 从 editor.ts 原样搬出（刀 ② B，行为零变更）：画线连画（出膜自动停）、第二点意图门、矩形的正方形 / 黄金分割目标（B22）、圆首点定平面、
// 数值小窗改完长度后画线继续连画（vcbContinue）。它们是 draw 类工具：手里的膜只算 BIRTH 出来的（底座 freshHand 看 `draws`）。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, Pt3 } from "../../kernel/kernel.ts";
import { cross3, dist3, dot3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { intentAllows3D } from "../intent.ts";
import { GROUND, cameraPlane, grazing, rectFirstPlane, resolveRectPlane, type DrawPlane, type Snap3 } from "../pick.ts";
import { circleCurveSpec, circleSegmentsOnPlane, rectOpposite, rectSegmentsOnPlane, rectToolTargets, snapDirectionInPlane, rectAxesOf } from "../tools.ts";
import { fmtLen } from "../units.ts";
import { MIN_GESTURE_LEN } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";


abstract class DrawTool implements ToolHandler {
  abstract readonly tool: "line" | "rect" | "crect" | "circle";
  readonly grammar = "steps" as const;
  readonly draws = true;
  readonly lock: "axis" | "plane" = "plane";   // A9：矩形 / 圆 = 方向键锁平面（画线覆盖成 axis）
  protected anchor: Pt3 | null = null;        // 首点（世界）；也写进底座 anchor（渲染轴线虚线起点）
  protected plane: DrawPlane = GROUND;        // 当前手势平面
  protected fixed: DrawPlane | null = null;   // 首点落在膜内 → 平面钉死（矩形 / 圆）

  active(): boolean { return this.anchor !== null; }
  cancel(): void { this.anchor = null; this.fixed = null; }
  sample(): Record<string, number> { return {}; }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.anchor) { this.commit(ctx); return; }
    const r = rectFirstPlane(ctx.live(), ctx.frame(), ctx.vp(), ev.x, ev.y, ctx.snapPx(), ctx.alignSources());
    this.plane = r.plane;
    this.fixed = this.tool === "line" ? null : this.tool === "circle" && !r.fixed ? r.plane : r.fixed;   // 圆：首点定平面（没落在膜内就用解析出的平面）
    ctx.setSnap(r.snap);
    this.anchor = r.snap.p;
    ctx.setAnchor(this.anchor); ctx.setCursor(this.anchor);
  }

  protected basePlane(): DrawPlane | undefined { return this.anchor && Math.abs(this.anchor.z) < 1e-6 ? GROUND : undefined; }

  /** 第二点在平面上取（矩形 / 圆 / 画线意图门回退）：钉死的平面直接吸，否则 resolveRectPlane 可切面；轻擦保持上一帧。 */
  protected planeSnap(ctx: ToolCtx, sx: number, sy: number): Pt3 {
    const w = ctx.live(), prev = ctx.currentSnap();
    const locked = this.anchor ? ctx.lockedPlane(this.anchor) : null;   // A9 面锁：平面过首点、钉死
    if (locked) this.plane = locked;
    const targets = this.tool === "rect" && this.anchor ? rectToolTargets(this.anchor, this.plane.basis) : null;   // 正方形 / 黄金分割（B22；按上一帧平面基）
    if (locked || this.fixed) {
      const sn = ctx.snap(w, sx, sy, { plane: this.plane, alignSources: ctx.alignSources(), hand: ctx.hand(w), toolTargets: targets });
      ctx.setSnap(sn);
      return sn.p;
    }
    const r = resolveRectPlane(w, ctx.frame(), ctx.vp(), this.anchor!, sx, sy, ctx.snapPx(), ctx.alignSources(), ctx.hand(w), this.basePlane(), targets);
    if (r.snap.kind === null && prev && grazing(r.plane, ctx.frame().ray(sx, sy, ctx.vp()))) return prev.p;
    this.plane = r.plane;
    ctx.setSnap(r.snap);
    return r.snap.p;
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, _travel?: number): void {
    if (this.anchor) ctx.setCursor(this.planeSnap(ctx, s.x, s.y));
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return this.preview(ctx, run); }
  describe(ctx: ToolCtx): Record<string, unknown> {
    const b = ctx.cursor();
    if (!this.anchor || !b) return {};
    return { segs: this.segsFor(ctx, b).map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]) };
  }
  protected abstract segsFor(ctx: ToolCtx, b: Pt3): [Pt3, Pt3][];
  protected abstract preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string;
  protected abstract commit(ctx: ToolCtx): void;
  protected finish(ctx: ToolCtx): void { this.cancel(); ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null); }
}

export class LineTool extends DrawTool {
  readonly tool = "line" as const;
  readonly lock = "axis" as const;
  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    const a = this.anchor;
    if (!a) return;
    const w = ctx.live(), prev = ctx.currentSnap();
    const r = resolveRectPlane(w, ctx.frame(), ctx.vp(), a, s.x, s.y, ctx.snapPx(), ctx.alignSources(), ctx.hand(w), this.basePlane());
    let sn: Snap3;
    if (r.snap.kind === null && prev && grazing(r.plane, ctx.frame().ray(s.x, s.y, ctx.vp()))) sn = prev;
    else { this.plane = r.plane; sn = r.snap; }
    // 意图门：候选在锚点另一侧（相机平面上与拖动方向点积 < 0）不合法
    const camL = cameraPlane(ctx.frame(), a), rayL = ctx.frame().ray(s.x, s.y, ctx.vp());
    const freeL = rayPlane(rayL.origin, rayL.dir, camL.plane.n, camL.plane.d);
    if (sn.kind !== null && freeL && ctx.intentOn(s, travel) && !intentAllows3D(sub3(freeL, a), sub3(sn.p, a), MIN_GESTURE_LEN)) { sn = { p: this.planeSnap(ctx, s.x, s.y), kind: null }; ctx.dropHysteresis(); }
    // 15° 整角归格点吸附（user 2026-10-25「15是grid合理」）：求解器在自由落点时咬（有捕捉阈）；Shift = 把格点吸附反过来（DT51），不再单独 = 15°
    sn = ctx.applyLock(sn, s.x, s.y);   // A9 轴锁 / 面锁（没锁 = 原样）
    const snapped = ctx.hysteresis(sn, s.x, s.y);
    ctx.setSnap(snapped);
    ctx.charge(snapped, 120);
    ctx.setCursor(snapped.p);
  }
  protected segsFor(_ctx: ToolCtx, b: Pt3): [Pt3, Pt3][] { return [[this.anchor!, b]]; }
  scaleGeom(ctx: ToolCtx): ScaleGeom | null { const a = this.anchor, b = ctx.cursor(); return a && b ? { kind: "length", vec: sub3(b, a) } : null; }
  protected preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    const a = this.anchor, b = ctx.cursor();
    if (!a || !b) return "";
    if (dist3(a, b) >= MIN_GESTURE_LEN) run((c) => c.addEdges([[ctx.toLocal(a), ctx.toLocal(b)]]));
    return `长 ${fmtLen(dist3(a, b))}`;
  }
  protected commit(ctx: ToolCtx): void {
    const a = this.anchor!, b = ctx.cursor() ?? a;
    if (dist3(a, b) < MIN_GESTURE_LEN) { this.finish(ctx); return; }
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    const evs = ctx.commitOp({ op: "addEdges", at: at0, segs: [[ctx.toLocal(a), ctx.toLocal(b)]], harden: true });   // 描过软边 = 变硬
    this.finish(ctx);   // 落定不再自动充能两端（充能只活到下一次按下；锚点的轴线本来就在）
    ctx.recordLast({ kind: "line", ops: ctx.opCount() - n0, at: at0, a, b });
    if (evs.length > 0) return;
    this.vcbContinue(ctx, b);   // 连画：下一笔的锚点 = 这一笔的终点（底座看到还 active 就 arm）
    ctx.hint("连画中：点下一点；出膜自动停；Esc 收笔");
  }
  /** 数值小窗改完这一笔之后继续连画（底座 applyVcb 调）。 */
  vcbContinue(ctx: ToolCtx, p: Pt3): void { this.anchor = p; ctx.setAnchor(p); ctx.setCursor(p); }
}

export class RectTool extends DrawTool {
  readonly tool: "rect" | "crect" = "rect";
  /** 起点：从角；Ctrl 按着 = 临时从中心（SU Ctrl / Option 同款）。中心矩形（CenterRectTool）反过来。 */
  protected from(ctx: ToolCtx): "corner" | "center" { return ctx.mods().copy ? "center" : "corner"; }
  protected segsFor(ctx: ToolCtx, b: Pt3): [Pt3, Pt3][] { return rectSegmentsOnPlane(this.plane.plane, this.plane.basis, rectOpposite(this.anchor!, b, this.from(ctx)), b); }
  scaleGeom(ctx: ToolCtx): ScaleGeom | null {
    const b = ctx.cursor();
    if (!this.anchor || !b) return null;
    const s = this.segsFor(ctx, b);
    return s.length >= 2 ? { kind: "rect", u: sub3(s[0][1], s[0][0]), v: sub3(s[1][1], s[1][0]), normal: this.plane.plane.n } : null;
  }
  protected preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    const a = this.anchor, b = ctx.cursor();
    if (!a || !b) return "";
    const { basis } = this.plane, from = this.from(ctx);
    const segs = rectSegmentsOnPlane(this.plane.plane, basis, rectOpposite(a, b, from), b);
    const d = sub3(b, a), k = from === "center" ? 2 : 1;
    const [aw, ah] = rectAxesOf(basis);   // 宽 = 贴近世界 X 的那根（和数值小窗同一条规则）
    const du = d.x * aw.x + d.y * aw.y + d.z * aw.z, dv = d.x * ah.x + d.y * ah.y + d.z * ah.z;
    if (segs.length) run((c) => c.addEdges(segs.map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)])));
    return `矩形 ${fmtLen(Math.abs(du) * k)} × ${fmtLen(Math.abs(dv) * k)}${from === "center" ? "（从中心）" : ""}`;
  }
  protected commit(ctx: ToolCtx): void {
    const plane = this.plane, anchor = this.anchor!, b = ctx.cursor() ?? anchor, from = this.from(ctx);
    const segs = rectSegmentsOnPlane(plane.plane, plane.basis, rectOpposite(anchor, b, from), b);
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    this.finish(ctx);
    if (segs.length) { ctx.commitOp({ op: "addEdges", at: at0, segs: segs.map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]), harden: true }); ctx.recordLast({ kind: "rect", ops: ctx.opCount() - n0, at: at0, plane, anchor, corner: b, from }); }
  }
}

/**
 * 中心矩形（user 10-27「随手，硬表面里面中心矩形能单独做一个工具吗而不是矩形的预设」）：第一下 = 中心、第二下 = 一个角；Ctrl 按着 = 临时从角。
 * 和矩形同一套手势 / 吸附 / 数值小窗（数值仍是整个矩形的宽 × 高）；矩形工具原来的「起点」选项（预设）撤掉，两个工具各管一种。
 */
export class CenterRectTool extends RectTool {
  readonly tool = "crect" as const;
  protected from(ctx: ToolCtx): "corner" | "center" { return ctx.mods().copy ? "corner" : "center"; }
}

export class CircleTool extends DrawTool {
  readonly tool = "circle" as const;
  protected segsFor(ctx: ToolCtx, b: Pt3): [Pt3, Pt3][] { return circleSegmentsOnPlane(this.plane.plane, this.plane.basis, this.anchor!, b, ctx.config.get("circle", "segments")); }
  scaleGeom(ctx: ToolCtx): ScaleGeom | null { const b = ctx.cursor(); return this.anchor && b ? { kind: "circle", radius: dist3(this.anchor, b), normal: this.plane.plane.n } : null; }
  protected preview(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    const a = this.anchor, b = ctx.cursor();
    if (!a || !b) return "";
    const r = dist3(a, b);
    const segs = circleSegmentsOnPlane(this.plane.plane, this.plane.basis, a, b, ctx.config.get("circle", "segments"));
    if (segs.length && r >= MIN_GESTURE_LEN) run((c) => c.addEdges(segs.map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]), { curve: true }));
    return `圆 半径 ${fmtLen(r)}`;
  }
  protected commit(ctx: ToolCtx): void {
    const plane = this.plane, center = this.anchor!, b = ctx.cursor() ?? center;
    const segments = ctx.config.get("circle", "segments");
    const segs = dist3(center, b) >= MIN_GESTURE_LEN ? circleSegmentsOnPlane(plane.plane, plane.basis, center, b, segments) : [];
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    this.finish(ctx);
    if (segs.length) { ctx.commitOp({ op: "addEdges", at: at0, segs: segs.map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]), curve: circleCurveSpec((pt) => ctx.toLocal(pt), center, b, plane, segments) }); ctx.recordLast({ kind: "circle", ops: ctx.opCount() - n0, at: at0, plane, center, rim: b, segments }); }
  }
}

// tools/offset.ts —— 偏移工具（SU Offset）的手势模块：工具模块的**样板**（架构重构 2026-10-21，Claude Fable 5.1）。
// 从 editor.ts 原样搬出（行为零变更）：按下 = 选面 + 定「内法向」（按下点离外环最近那条边的面内内法向）；
// 跟随 = 沿内法向量距离（吸附 + 意图门：反号 / 零位不合法）；预演 = 偏移环当手势线段进结算机；松手 = 抬笔结算后落定 + 记给数值小窗。
// D22（user 2026-10-24「推了面板显示的是5 ft但是没有对齐格子」，Claude Opus 5.5）：距离从**那条边**量（锚点 = 按下点在边上的垂足），不是从按下点量；
// 栅格开着 = 世界是格子（同 move 轴锁 / 求解器「沿 1-D 走格」）：内法向与栅格轴平行 → 那条边的内环落绝对格线，斜边 → 距离按格距增量；Shift = 整数增量（不管栅格开没开）。
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, FaceId, Pt3 } from "../../kernel/kernel.ts";
import { add3, cross3, dist3, dot3, liftFromPlane, normalize3, projectToPlane, scale3, sub3, type Pt3 as GPt3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyPt } from "../../scene/xform.ts";
import type { DrawPlane } from "../pick.ts";
import { offsetRing } from "../offset.ts";
import { circleOfFace, curveSpecToLocal, offsetCircleSpec } from "../tools.ts";
import { intentAllows1D } from "../intent.ts";
import { nearestStep } from "../increments.ts";
import { fmtLen } from "../units.ts";
import { MIN_GESTURE_LEN } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";

/** 点 p 沿 n 投到过 c 的平面上。 */
const projectThrough = (p: Pt3, c: Pt3, n: Pt3): Pt3 => { const d = dot3(sub3(p, c), n); return sub3(p, scale3(n, d)); };

export class OffsetTool implements ToolHandler {
  readonly tool = "offset" as const;
  readonly grammar = "steps" as const;
  private face: FaceId | null = null;       // 活动池本地 id
  private plane: DrawPlane | null = null;   // 世界系
  private inward: Pt3 | null = null;        // 面内内法向（世界系）
  private dist = 0;                         // 正 = 向内

  active(): boolean { return this.face !== null; }
  cancel(): void { this.face = null; this.plane = null; this.inward = null; this.dist = 0; }
  sample(): Record<string, number> { return { off: this.dist }; }
  scaleGeom(): ScaleGeom | null { return this.face !== null && this.inward ? { kind: "length", vec: scale3(this.inward, this.dist) } : null; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.face !== null) { this.commit(ctx); return; }   // 第二次按下（点一下 / 拖到位松手 / armed 再点）= 落定（A29：全工具点几下）
    const view = ctx.live();
    const gf = ctx.pickFace(ev.x, ev.y);
    if (gf === undefined) return;
    const c = ctx.classify(view, { face: gf });
    if (c.kind === "pool") { ctx.hint("这张面在子 group / 组件里：双击进入后再偏移"); return; }
    if (c.kind !== "entity" || c.local.face === undefined) return;
    const wrec = view.planeOf(gf)!;
    const ray0 = ctx.frame().ray(ev.x, ev.y, ctx.vp());
    const hit = rayPlane(ray0.origin, ray0.dir, wrec.plane.n, wrec.plane.d);
    if (!hit) return;
    // 离按下点最近的外环边 → 它的面内内法向（朝面心）；偏移距离沿它量
    const outer = view.faceRings3(gf)!.outer;
    let best = 0, bd = Infinity;
    for (let i = 0; i < outer.length; i++) {
      const a = outer[i], b = outer[(i + 1) % outer.length];
      const ab = sub3(b, a), l2 = dot3(ab, ab) || 1;
      const t = Math.max(0, Math.min(1, dot3(sub3(hit, a), ab) / l2));
      const dd = dist3(hit, add3(a, scale3(ab, t)));
      if (dd < bd) { bd = dd; best = i; }
    }
    const a = outer[best], b = outer[(best + 1) % outer.length];
    const dir = normalize3(sub3(b, a));
    const foot = add3(a, scale3(dir, dot3(sub3(hit, a), dir)));   // 按下点在那条边（的直线）上的垂足 = 距离的零点
    let inward = cross3(wrec.plane.n, dir);
    const cen = outer.reduce((acc, p) => add3(acc, scale3(p, 1 / outer.length)), { x: 0, y: 0, z: 0 });
    if (dot3(sub3(cen, a), inward) < 0) inward = scale3(inward, -1);
    this.face = c.local.face;
    this.plane = { plane: wrec.plane, basis: wrec.basis, face: gf };
    this.inward = normalize3(inward);
    this.dist = 0;
    ctx.setAnchor(foot);
    ctx.setCursor(hit);
    ctx.hint("偏移：移动定距离——向里内缩、向外外扩；再点一下 / 松手落定（输距离可精确）");
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    const anchor = ctx.anchor();
    if (this.face === null || !this.plane || !this.inward || !anchor) return;
    const view = ctx.live();
    const sn = ctx.snap(ctx.world(), s.x, s.y, { plane: this.plane, anchor, alignSources: ctx.alignSources(), hand: ctx.hand(view), lines: false });
    // 意图门：自由距离（指针落在面上的点沿内法向的距离）定内缩 / 外扩；反号 / 零位的吸附不合法
    const rayO = ctx.frame().ray(s.x, s.y, ctx.vp());
    const freeO = rayPlane(rayO.origin, rayO.dir, this.plane.plane.n, this.plane.plane.d);
    const dFree = freeO ? dot3(sub3(freeO, anchor), this.inward) : NaN;
    let q = projectThrough(sn.p, anchor, this.plane.plane.n);
    let kind = sn.kind;
    if (kind !== null && freeO && ctx.intentOn(s, travel) && !intentAllows1D(dFree, dot3(sub3(q, anchor), this.inward), MIN_GESTURE_LEN)) { q = freeO; kind = null; }
    let d = dot3(sub3(q, anchor), this.inward);
    let label: string | undefined;
    // 落格：只在没吸到几何（裸落 / 格点 / 整数长度 / 面上）时接管；吸到别的端点 / 中点 / 边照旧（偏移到某个点是正经用法）
    const weak = kind === null || kind === "grid-point" || kind === "increment" || kind === "on-face";
    // 格点吸附（有效开关 = ctx.grid().on，按住 Shift 反过来）：绝对格线（内法向与栅格轴平行时）+ 从边起的整格，屏距最近、在吸附圈内才咬（2026-10-25：以前是硬取整）
    const g = ctx.grid(), s0 = g.step / g.subdiv;
    if (weak && g.on && s0 > 0) {
      const cands: { d: number; abs: boolean }[] = [{ d: nearestStep(d, s0), abs: false }];
      const F = ctx.contextFrame();
      for (const ax of [F.x, F.y, F.z] as GPt3[]) {
        const dd = dot3(this.inward, ax);
        if (Math.abs(Math.abs(dd) - 1) > 1e-6) continue;
        const c0 = dot3(sub3(anchor, F.origin), ax);
        cands.push({ d: (nearestStep(c0 + d * dd, s0) - c0) / dd, abs: true });
        break;
      }
      let best: { d: number; abs: boolean; q: Pt3; px: number } | null = null;
      for (const c of cands) {
        if (Math.abs(c.d) <= 1e-9 || Math.sign(c.d) !== Math.sign(d || c.d)) continue;
        const q2 = add3(anchor, scale3(this.inward, c.d)), px = ctx.frame().distTo(s.x, s.y, q2, ctx.vp());
        if (px <= ctx.snapPx() && (!best || px < best.px)) best = { ...c, q: q2, px };
      }
      if (best) { d = best.d; q = best.q; kind = best.abs ? "grid-point" : "increment"; label = `${best.abs ? "格线" : "整格"} · ${fmtLen(Math.abs(d))}`; }
    }
    this.dist = d;
    ctx.setSnap(kind ? { ...sn, kind, p: q, ...(label ? { label, hints: [{ a: anchor, b: q, axis: "i" as const }] } : {}) } : null);
    ctx.setCursor(q);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.face === null || Math.abs(this.dist) < MIN_GESTURE_LEN) return "";
    const segs = this.segs(ctx, this.dist);
    if (segs.length) run((c) => c.addEdges(segs.map(([a, b]) => [ctx.toLocal(a), ctx.toLocal(b)])));
    return `偏移 ${this.dist > 0 ? "向内" : "向外"} ${fmtLen(Math.abs(this.dist))}`;
  }

  /** 落定：用 track 跟到的距离（底座在松手时已先 track 到抬笔结算帧）。 */
  private commit(ctx: ToolCtx): void {
    if (this.face === null || !this.plane) return;
    const d = this.dist;
    const segs = Math.abs(d) >= MIN_GESTURE_LEN ? this.segs(ctx, d) : [];
    const k = ctx.kernel(), m = ctx.ctxXform();
    const ring = k.faceRings3(this.face)!.outer.map((p) => applyPt(m, p));
    const plane = this.plane, n0 = ctx.opCount(), at0 = ctx.activePool();
    const circle = circleOfFace(k, this.face, m);   // 0.10：外环恰是一条闭合圆曲线 → 偏移环登记成同心圆（半径 r − d）
    this.cancel();
    if (segs.length) {
      const spec = circle ? offsetCircleSpec(circle, d) : null;
      ctx.commitOp({ op: "addEdges", at: at0, segs: segs.map(([p, q]) => [ctx.toLocal(p), ctx.toLocal(q)]), ...(spec ? { curve: curveSpecToLocal((pt) => ctx.toLocal(pt), spec) } : {}) });
      ctx.recordLast({ kind: "offset", ops: ctx.opCount() - n0, at: at0, ring, plane, d, ...(circle ? { circle } : {}) });
    }
  }

  /** 偏移环（世界坐标线段）：活动池里 face 的外环投到面基 → offsetRing（SU 只外环）→ 抬回 3D。 */
  private segs(ctx: ToolCtx, d: number): [Pt3, Pt3][] {
    if (this.face === null || !this.plane) return [];
    const k = ctx.kernel(), f = k.face(this.face), rec = k.planeOf(this.face);
    if (!f || !rec) return [];
    const m = ctx.ctxXform();
    const outer3 = k.faceRings3(this.face)!.outer.map((p) => applyPt(m, p));
    const ring2 = outer3.map((p) => projectToPlane(p, this.plane!.basis));
    const r = offsetRing(ring2, -d);   // offsetRing 的 d>0 = 外扩；工具的 d>0 = 向内
    if (r.length < 3) return [];
    const r3 = r.map((q) => liftFromPlane(q, this.plane!.plane, this.plane!.basis));
    return r3.map((p, i) => [p, r3[(i + 1) % r3.length]] as [Pt3, Pt3]);
  }
}

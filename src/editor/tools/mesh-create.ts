// tools/mesh-create.ts —— 自由建模工作台的「拉出」（网格体里长一个基本体；10-28 夜由「新建」改名，user「新建可能名字比较误导，因为你这个是拉出长出」「拉出也行吧」）。created 2026-10-28 by Claude Opus 5.5
// user 10-27（纪元账本 FM182）：「然后能不能加一个新建的tool，就是拖动然后新建，可以马前炮和马后炮，如果你想用马前炮的尺寸就点击」；「新建两个入口先同一条指令」。
// user 10-28 夜（账本 UX57）：「新建能不能做成两步手势，拉好了之后会有一个环，设置朝向」。
// 直接操作（direct），两步：
//   · 点一下 = 在按下那一点打到的地方（点 / 边 / 面 / 原点 / 地面；和右键新建同一套落点）新建一个，尺寸 = 工具条上「点一下的尺寸」（马前炮），朝向不转。
//   · ① 按住拖 = 从按下那一点往外拖多远，基本体就多大：拖的距离 = 半径（圆柱 / 圆锥 / 球）或半边长（立方体 / 平面）；拖的时候预演。
//   · ② 松手不落定，出一个环（量角器同款，画在底面那个平面里）：鼠标绕着环转 / 笔再按下拖着转 = 绕底面法向转朝向；
//     起始朝向看边（落在面上 = 顺着这张面最长的那条边，落在边上 = 这条边；Editor.newObjectAnchorAt 的 e；user「不一定是最近边吧。最长？」）；转的时候每 90°（从起始算）和上下文的轴会吸住，
//     按住 Shift = 15° 一档，也能直接打角度（打数层，单位文本框同一个读法）；点一下 / 松手 / 回车 = 落定，Esc = 不建。
//     不想转、要起始那个精确的角（user 10-28 夜「如同我不想环想要精确怎么办。就笔点一下？会不会误触……然后电脑应该相当于右键？」）：
//     笔 / 手指 = 点一下（按下后挪不过点按容差就不转，和别处分单击 / 拖动同一个容差）；电脑 = 右键（commitInPlace）。
//   · 平的几种（圆圈 / 方框 / 平面）拖的时候能拖出长宽比（user 10-28 夜「拉出方框能不能拖动选择aspect，所以就是有锁aspect的和可以算aspect的」）：
//     工具条「锁比例」关 = 指针落在底面上那一点在两根轴上各多远，宽 / 深就各两倍（圆圈 = 椭圆）；开 = 正方 / 正圆；按住 Shift 临时反过来。
//   · 落定以后右下「刚才：」= 马后炮（对齐 法向 / 世界 / 物体、尺寸、段数、朝向），和右键新建同一份（Editor.addPrimitive）。新的那个留在选区里，接着可以挤出 / 移动。
// 工具只管「按在哪、拖多大、转多少」；落点、坐标架、提交、马后炮都在编辑器那一条里（ctx.newPrimitive / previewPrimitive / primitiveDragSize / primitiveFrameAt）。
import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import { add3, dot3, sub3 } from "../../kernel/geom.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { isFlatPrimitive, type PrimitiveKind } from "../../mesh/ops/primitives.ts";
import type { Frame } from "../../scene/xform.ts";
import { rayPlane } from "../camera.ts";
import { angleAbout, axisAlignAngle } from "../protractor-geom.ts";
import type { QuantityTag } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import type { ViewState } from "../view-state.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

const ANGLE: QuantityTag = { q: "angle" };
/** 定朝向：转到和上下文某根轴平行时吸住的范围（度）；Shift 一档多少度。 */
const AXIS_SNAP_DEG = 3, SHIFT_STEP_DEG = 15;

export class MeshCreateTool implements ToolHandler {
  readonly tool = "create" as const;
  readonly grammar = "direct" as const;
  private phase: "idle" | "size" | "orient" = "idle";
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private dragging = false;
  // 第二步：拖出来的尺寸、落点的世界坐标架（还没转）、朝向 = base + (指针现在绕法向的角 − refAng)
  private size = 0;
  /** 深 / 宽（平的几种拖出来的长宽比；别的 = 1）。 */
  private aspect = 1;
  private frame: Frame | null = null;
  private spin = 0;
  private base = 0;
  private refAng: number | null = null;
  private pressing = false;
  /** 第二步按下之后挪过了点按容差（= 在拖着转；没过 = 这一下是点一下，不转）。 */
  private turning = false;

  /** 第二步能打角度（「30」回车 = 转 30°）。 */
  get typedQuantity(): QuantityTag | undefined { return this.phase === "orient" ? ANGLE : undefined; }
  awaitsClick(): boolean { return this.phase === "orient" && !this.pressing; }
  active(): boolean { return this.phase !== "idle"; }
  cancel(): void {
    this.phase = "idle"; this.start = this.cur = null; this.dragging = false;
    this.size = 0; this.aspect = 1; this.frame = null; this.spin = this.base = 0; this.refAng = null; this.pressing = this.turning = false;
  }
  /** 右键 = 不要环：拖着定大小时 / 第二步里，都按起始朝向（打了角度就按打的）落定。 */
  commitInPlace(ctx: ToolCtx): void {
    const s0 = this.start, dims = this.phase === "orient" ? { size: this.size, aspect: this.aspect } : this.dragDims(ctx), kind = this.kind(ctx), typed = this.phase === "orient" ? ctx.typed() : null;
    this.cancel();
    if (!s0 || !dims) return;
    ctx.newPrimitive(kind, s0.x, s0.y, dims.size, typed ?? 0, dims.aspect);
  }
  sample(): Record<string, number> { return this.phase === "orient" ? { spin: this.spin } : {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshCreate: { phase: this.phase, start: this.start, cur: this.cur, dragging: this.dragging, size: this.size, spin: this.spin } }; }
  /** 定朝向的环 = 量角器圆环（参考线 = 没转时的 x 方向，橙线 = 现在的朝向），套在基本体外面（方的半对角 ≈ 0.71 × 边长，圆的半径 = 0.5 × 直径）。 */
  viewExtras(): Partial<ViewState> {
    const f = this.frame;
    return this.phase === "orient" && f ? { protractor: { center: f.origin, axis: f.z, ref: add3(f.origin, f.x), angle: this.spin, minRadius: 0.8 * this.size * Math.max(1, this.aspect) } } : {};
  }

  private kind(ctx: ToolCtx): PrimitiveKind { return ctx.config.get("create", "kind") as PrimitiveKind; }
  /** 拖出来的尺寸（世界长度：边长 / 直径 = 拖的距离 × 2）；没拖 / 落不到东西 = null。 */
  private dragSize(ctx: ToolCtx): number | null {
    const s0 = this.start, s1 = this.cur;
    if (!s0 || !s1 || !this.dragging) return null;
    const d = ctx.primitiveDragSize(s0.x, s0.y, s1.x, s1.y);
    return d !== null && d > 1e-9 ? 2 * d : null;
  }
  /** 拖出来的尺寸 + 长宽比：平的几种、没锁比例（Shift 反过来）= 指针落在底面上那一点在坐标架两根轴上各多远 × 2；别的 = 正方 / 正圆。 */
  private dragDims(ctx: ToolCtx): { size: number; aspect: number } | null {
    const size = this.dragSize(ctx), f = this.frame, s1 = this.cur;
    if (size === null) return null;
    const lock = !!ctx.config.get("create", "lockAspect") !== ctx.mods().shift;
    if (!isFlatPrimitive(this.kind(ctx)) || lock || !f || !s1) return { size, aspect: 1 };
    const r = ctx.frame().ray(s1.x, s1.y, ctx.vp()), q = rayPlane(r.origin, r.dir, f.z, dot3(f.z, f.origin));
    if (!q) return { size, aspect: 1 };   // 看底面看到侧边：退回正方
    const d = sub3(q, f.origin), w = 2 * Math.abs(dot3(d, f.x)), h = 2 * Math.abs(dot3(d, f.y)), big = Math.max(w, h);
    if (big < 1e-9) return null;
    const W = Math.max(w, 0.01 * big), H = Math.max(h, 0.01 * big);   // 贴着一根轴拖：另一边留 1%，不长零面积的东西
    return { size: W, aspect: H / W };
  }
  /** 指针打在底面那个平面上、绕法向的角（相对没转时的 x）；看平面看到侧边 / 打不到 = null。 */
  private angleAt(ctx: ToolCtx, s: { x: number; y: number }): number | null {
    const f = this.frame;
    if (!f) return null;
    const r = ctx.frame().ray(s.x, s.y, ctx.vp()), q = rayPlane(r.origin, r.dir, f.z, f.z.x * f.origin.x + f.z.y * f.origin.y + f.z.z * f.origin.z);
    if (!q || Math.hypot(q.x - f.origin.x, q.y - f.origin.y, q.z - f.origin.z) < 1e-9) return null;
    return angleAbout(f.origin, f.z, add3(f.origin, f.x), q);
  }
  /** 现在的朝向：打了数 = 打的数；否则跟指针（吸轴 / Shift 档）。 */
  private spinNow(ctx: ToolCtx): number { return ctx.typed() ?? this.spin; }
  private orientTo(ctx: ToolCtx, s: { x: number; y: number }): void {
    const a = this.angleAt(ctx, s), f = this.frame;
    if (a === null || !f) return;
    if (this.refAng === null) { this.refAng = a; this.base = this.spin; return; }
    const d = a - this.refAng;
    let ang = this.base + Math.atan2(Math.sin(d), Math.cos(d));
    if (ctx.mods().shift) { const step = SHIFT_STEP_DEG * Math.PI / 180; ang = Math.round(ang / step) * step; }
    else {
      const q = Math.PI / 2, near = Math.round(ang / q) * q;   // 先吸起始朝向（看的那条边）的 0 / 90 / 180 / 270°，再吸上下文的轴
      if (Math.abs(ang - near) <= AXIS_SNAP_DEG * Math.PI / 180) ang = near;
      else { const hit = axisAlignAngle(f.origin, f.z, add3(f.origin, f.x), ctx.contextFrame(), ang, AXIS_SNAP_DEG); if (hit) ang = hit.ang; }
    }
    this.spin = Math.atan2(Math.sin(ang), Math.cos(ang));
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.phase === "orient") {   // 第二步再按下：从现在的朝向接着转（不跳）；挪过点按容差才开始转，松手落定
      this.pressing = true; this.turning = false; this.base = this.spin; this.refAng = this.angleAt(ctx, ev);
      return;
    }
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; this.dragging = false; this.phase = "size";
    if (ctx.primitiveDragSize(ev.x, ev.y, ev.x, ev.y) === null) { this.cancel(); ctx.hint("拉出：按在点 / 面 / 原点 / 地面上"); return; }
    this.frame = ctx.primitiveFrameAt(ev.x, ev.y);   // 底面的坐标架：拖长宽比量在它的两根轴上，第二步的环也画在它上面
    ctx.hint("拉出 ①/②：拖出来定大小，松手后转朝向；点一下 = 用工具条上的尺寸");
  }
  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    if (this.phase === "orient") {
      if (this.pressing && !this.turning) { if (ctx.moved(s, travel) <= ctx.tapSlop()) return; this.turning = true; }   // 笔点一下手抖 ≠ 转
      this.orientTo(ctx, s); return;
    }
    if (!this.start) return;
    this.cur = { x: s.x, y: s.y };
    if (!this.dragging && ctx.moved(s, travel) > ctx.tapSlop()) this.dragging = true;
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const s0 = this.start, dims = this.phase === "orient" ? { size: this.size, aspect: this.aspect } : this.dragDims(ctx);
    if (!s0 || !dims) return "";
    const kind = this.kind(ctx), spin = this.phase === "orient" ? this.spinNow(ctx) : 0;
    let label = "";
    run((m) => { label = ctx.previewPrimitive(kind, s0.x, s0.y, dims.size, m, spin, dims.aspect) ?? ""; });
    return label;
  }

  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    const s0 = this.start;
    if (!s0) return;
    const kind = this.kind(ctx);
    if (this.phase === "orient") {   // 第二步：点一下 / 拖着转完松手 = 落定
      const size = this.size, aspect = this.aspect, spin = this.spinNow(ctx);
      this.cancel();
      ctx.newPrimitive(kind, s0.x, s0.y, size, spin, aspect);
      return;
    }
    const tap = ctx.clicks() > 0 || !this.dragging;
    if (tap) { const size = ctx.config.get("create", "size"); this.cancel(); ctx.newPrimitive(kind, s0.x, s0.y, size); return; }
    const dims = this.dragDims(ctx), frame = this.frame;
    if (!dims || !frame) { this.cancel(); ctx.hint("拉出：拖得太短，没建；点一下 = 用工具条上的尺寸"); return; }
    // 进第二步：从松手那一点的方向起算（不转），环出来
    this.phase = "orient"; this.size = dims.size; this.aspect = dims.aspect; this.spin = this.base = 0; this.pressing = this.turning = false;
    this.refAng = this.angleAt(ctx, ev);
    ctx.hint("拉出 ②/②：转一转定朝向（鼠标绕着环转 / 笔按下拖着转；每 90° 和贴轴会吸、Shift = 15° 一档、能直接打角度），点一下 / 回车落定；不转 = 笔点一下 / 右键；Esc 不建");
  }
}

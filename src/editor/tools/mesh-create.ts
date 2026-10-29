// tools/mesh-create.ts —— 自由建模工作台的「新建」（网格体里长一个基本体）。created 2026-10-28 by Claude Opus 5.5
// user 10-27（纪元账本 FM182）：「然后能不能加一个新建的tool，就是拖动然后新建，可以马前炮和马后炮，如果你想用马前炮的尺寸就点击」；「新建两个入口先同一条指令」。
// user 10-28 夜（账本 UX57）：「新建能不能做成两步手势，拉好了之后会有一个环，设置朝向」。
// 直接操作（direct），两步：
//   · 点一下 = 在按下那一点打到的地方（点 / 边 / 面 / 原点 / 地面；和右键新建同一套落点）新建一个，尺寸 = 工具条上「点一下的尺寸」（马前炮），朝向不转。
//   · ① 按住拖 = 从按下那一点往外拖多远，基本体就多大：拖的距离 = 半径（圆柱 / 圆锥 / 球）或半边长（立方体 / 平面）；拖的时候预演。
//   · ② 松手不落定，出一个环（量角器同款，画在底面那个平面里）：鼠标绕着环转 / 笔再按下拖着转 = 绕底面法向转朝向；
//     贴着上下文的轴会吸住，按住 Shift = 15° 一档，也能直接打角度（打数层，单位文本框同一个读法）；点一下 / 松手 / 回车 = 落定，Esc = 不建。
//   · 落定以后右下「刚才：」= 马后炮（对齐 法向 / 世界 / 物体、尺寸、段数、朝向），和右键新建同一份（Editor.addPrimitive）。新的那个留在选区里，接着可以挤出 / 移动。
// 工具只管「按在哪、拖多大、转多少」；落点、坐标架、提交、马后炮都在编辑器那一条里（ctx.newPrimitive / previewPrimitive / primitiveDragSize / primitiveFrameAt）。
import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import { add3 } from "../../kernel/geom.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import type { PrimitiveKind } from "../../mesh/ops/primitives.ts";
import type { Frame } from "../../scene/xform.ts";
import { rayPlane } from "../camera.ts";
import { angleAbout, axisAlignAngle } from "../protractor-geom.ts";
import type { QuantityTag } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import type { ViewState } from "../render3.ts";
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
  private frame: Frame | null = null;
  private spin = 0;
  private base = 0;
  private refAng: number | null = null;
  private pressing = false;

  /** 第二步能打角度（「30」回车 = 转 30°）。 */
  get typedQuantity(): QuantityTag | undefined { return this.phase === "orient" ? ANGLE : undefined; }
  awaitsClick(): boolean { return this.phase === "orient" && !this.pressing; }
  active(): boolean { return this.phase !== "idle"; }
  cancel(): void {
    this.phase = "idle"; this.start = this.cur = null; this.dragging = false;
    this.size = 0; this.frame = null; this.spin = this.base = 0; this.refAng = null; this.pressing = false;
  }
  sample(): Record<string, number> { return this.phase === "orient" ? { spin: this.spin } : {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshCreate: { phase: this.phase, start: this.start, cur: this.cur, dragging: this.dragging, size: this.size, spin: this.spin } }; }
  /** 定朝向的环 = 量角器圆环（参考线 = 没转时的 x 方向，橙线 = 现在的朝向），套在基本体外面（方的半对角 ≈ 0.71 × 边长，圆的半径 = 0.5 × 直径）。 */
  viewExtras(): Partial<ViewState> {
    const f = this.frame;
    return this.phase === "orient" && f ? { protractor: { center: f.origin, axis: f.z, ref: add3(f.origin, f.x), angle: this.spin, minRadius: 0.8 * this.size } } : {};
  }

  private kind(ctx: ToolCtx): PrimitiveKind { return ctx.config.get("create", "kind") as PrimitiveKind; }
  /** 拖出来的尺寸（世界长度：边长 / 直径 = 拖的距离 × 2）；没拖 / 落不到东西 = null。 */
  private dragSize(ctx: ToolCtx): number | null {
    const s0 = this.start, s1 = this.cur;
    if (!s0 || !s1 || !this.dragging) return null;
    const d = ctx.primitiveDragSize(s0.x, s0.y, s1.x, s1.y);
    return d !== null && d > 1e-9 ? 2 * d : null;
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
    else { const hit = axisAlignAngle(f.origin, f.z, add3(f.origin, f.x), ctx.contextFrame(), ang, AXIS_SNAP_DEG); if (hit) ang = hit.ang; }
    this.spin = Math.atan2(Math.sin(ang), Math.cos(ang));
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.phase === "orient") {   // 第二步再按下：从现在的朝向接着转（不跳），松手落定
      this.pressing = true; this.base = this.spin; this.refAng = this.angleAt(ctx, ev);
      return;
    }
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; this.dragging = false; this.phase = "size";
    if (ctx.primitiveDragSize(ev.x, ev.y, ev.x, ev.y) === null) { this.cancel(); ctx.hint("新建：按在点 / 面 / 原点 / 地面上"); return; }
    ctx.hint("新建 ①/②：拖出来定大小，松手后转朝向；点一下 = 用工具条上的尺寸");
  }
  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    if (this.phase === "orient") { this.orientTo(ctx, s); return; }
    if (!this.start) return;
    this.cur = { x: s.x, y: s.y };
    if (!this.dragging && ctx.moved(s, travel) > ctx.tapSlop()) this.dragging = true;
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const s0 = this.start, size = this.phase === "orient" ? this.size : this.dragSize(ctx);
    if (!s0 || size === null) return "";
    const kind = this.kind(ctx), spin = this.phase === "orient" ? this.spinNow(ctx) : 0;
    let label = "";
    run((m) => { label = ctx.previewPrimitive(kind, s0.x, s0.y, size, m, spin) ?? ""; });
    return label;
  }

  up(ctx: ToolCtx, ev: ToolPointer, _settle: () => ToolSample | null): void {
    const s0 = this.start;
    if (!s0) return;
    const kind = this.kind(ctx);
    if (this.phase === "orient") {   // 第二步：点一下 / 拖着转完松手 = 落定
      const size = this.size, spin = this.spinNow(ctx);
      this.cancel();
      ctx.newPrimitive(kind, s0.x, s0.y, size, spin);
      return;
    }
    const tap = ctx.clicks() > 0 || !this.dragging;
    if (tap) { const size = ctx.config.get("create", "size"); this.cancel(); ctx.newPrimitive(kind, s0.x, s0.y, size); return; }
    const size = this.dragSize(ctx), frame = ctx.primitiveFrameAt(s0.x, s0.y);
    if (size === null || !frame) { this.cancel(); ctx.hint("新建：拖得太短，没建；点一下 = 用工具条上的尺寸"); return; }
    // 进第二步：从松手那一点的方向起算（不转），环出来
    this.phase = "orient"; this.size = size; this.frame = frame; this.spin = this.base = 0; this.pressing = false;
    this.refAng = this.angleAt(ctx, ev);
    ctx.hint("新建 ②/②：转一转定朝向（鼠标绕着环转 / 笔按下拖着转；贴轴会吸、Shift = 15° 一档、能直接打角度），点一下 / 松手 / 回车落定；Esc 不建");
  }
}

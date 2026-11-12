// tools/pushpull.ts —— 推拉工具的手势模块：steps 语法（点面 → 移动定高度 → 再点 / 松手落定）。从 editor.ts 原样搬出（刀 ② B，行为零变更）。
// 双通道吸附：光标通道（世界 = 按下时的模型，源面原位不透明；不吸轴）+ 高度通道（停靠集 pp-stops：0 / 同柱平行面 / 参考几何高度 + 整数长度）。
// 意图门：自由高度的符号 = 推 / 拉意图，反号候选不合法；0.10 护栏：曲面的一片不许推拉。created 2026-10-24 by Claude Fable 5.1
import type { FaceId, Pt3, VertexId } from "../../kernel/kernel.ts";
import { add3, dot3, len3, scale3, sub3 } from "../../kernel/geom.ts";
import { ringVidsTolerant } from "../../kernel/face-lifecycle.ts";
import { closestOnAxis, rayPlane } from "../camera.ts";
import { hasIntent, intentAllows1D } from "../intent.ts";
import { pickEntity, type AlignHand, type DrawPlane } from "../pick.ts";
import { ppStopsOf } from "../pp-stops.ts";
import { faceKey, type FaceKey, type Op } from "../ops.ts";
import { IDENTITY, applyNormal } from "../../scene/xform.ts";
import { fmtLen } from "../units.ts";
import { SNAP_LABELS, gestureMinLen } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, PreviewOp } from "../tool-handler.ts";
import type { ScaleGeom } from "../scale-ref.ts";

export class PushPullTool implements ToolHandler {
  readonly tool = "pp" as const;
  readonly grammar = "steps" as const;
  private face: FaceId | null = null;        // 活动池本地 id
  private normal: Pt3 | null = null;         // 世界系法向 = 本地平面法向（内核推拉的正方向）按法向变换送到世界，朝向保留
  private nScale = 1;                         // 世界推拉高度 × 它 = 本地推拉距离（|(M⁻¹)ᵀ n|；纯旋转 = 1）
  private plane: DrawPlane | null = null;    // 源面平面（世界系）
  private shell: ReadonlySet<VertexId> = new Set();
  private stops: number[] = [];
  private h = 0;                             // 世界系高度

  active(): boolean { return this.face !== null; }
  private say = "";
  cancel(): void { this.face = null; this.normal = null; this.plane = null; this.shell = new Set(); this.stops = []; this.h = 0; }
  sample(): Record<string, number> { return { h: this.h }; }
  scaleGeom(): ScaleGeom | null { return this.face !== null && this.normal ? { kind: "length", vec: scale3(this.normal, this.h) } : null; }
  describe(ctx?: ToolCtx): Record<string, unknown> {
    const k = ctx?.kernel();
    return this.face !== null && k && k.face(this.face) ? { face: faceKey(k, this.face), h: this.localH(ctx!, this.h) } : {};
  }

  /** 世界系推拉高度 → 活动池本地推拉距离（内核按本地平面法向走；down 里已把那根法向送到世界当 this.normal）。 */
  private localH(_ctx: ToolCtx, h: number): number { return h * this.nScale; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.face !== null) { this.commit(ctx); return; }
    const view = ctx.live();
    const gf = ctx.pickFace(ev.x, ev.y);
    if (gf === undefined) return;
    const c = ctx.classify(view, { face: gf });
    if (c.kind === "pool") { ctx.hint("这张面在子 group / 组件里：双击进入后再推拉"); return; }
    if (c.kind !== "entity" || c.local.face === undefined) return;
    const k = ctx.kernel();
    const wrec = view.planeOf(gf)!;
    {   // 0.10 护栏（设计稿 §6-①，user「推拉单片没有任何意义」）：曲面的一片不许推拉，先硬化；整张曲面推拉 = wishlist B18
      const f0 = k.face(c.local.face)!;
      if ([f0.outer, ...f0.holes].some((r) => r.edges.some((d) => k.isFold(d.edge)))) { ctx.hint("这是一个折面的一片：推拉只推得动平面——先把它周围的折线变硬（橡皮 + Shift），再推拉"); return; }   // DT87 护栏
      if ([f0.outer, ...f0.holes].some((r) => r.edges.some((d) => k.isSoft(d.edge)))) { ctx.hint("这是曲面的一片：先用橡皮 + Shift 硬化它周围的软边，再推拉（整张曲面推拉在 wishlist）"); return; }
    }
    this.face = c.local.face;
    const fRec = k.face(c.local.face)!;
    this.shell = new Set([...ringVidsTolerant(k.graph, fRec.outer), ...fRec.holes.flatMap((hh) => ringVidsTolerant(k.graph, hh))]);
    {   // 拖动方向 = 内核推拉的正方向送到世界（不用 wrec.plane.n：那是规范化过的世界平面，转过的组件里会和本地法向差一个正负号）
      const nL = k.planeOf(c.local.face)!.plane.n, m = ctx.ctxXform();
      const w = m === IDENTITY ? nL : applyNormal(m, nL), L = len3(w);
      this.normal = L > 1e-12 ? scale3(w, 1 / L) : wrec.plane.n;
      this.nScale = L > 1e-12 ? L : 1;
    }
    this.plane = { plane: wrec.plane, basis: wrec.basis };
    const ray0 = ctx.frame().ray(ev.x, ev.y, ctx.vp());
    const grab = rayPlane(ray0.origin, ray0.dir, wrec.plane.n, wrec.plane.d);
    const anchor = grab ?? view.faceRings3(gf)!.outer[0];
    ctx.setAnchor(anchor);
    // 高度通道停靠集（2026-10-24 退役「全场顶点高度」）：0 + 同柱子里的平行面（穿透 / 挖通）+ 参考点 / 平行参考线的高度（pp-stops.ts）
    this.stops = ppStopsOf(view, gf, anchor, this.normal!);
    ctx.setCursor(anchor);
    this.h = 0;
    ctx.hint("推拉中：沿法向拖或点两下落定（所见即所得；吸点线=取其高度）");
  }

  /** pp 双通道吸附：光标通道（世界 = 按下时模型，源面原位不透明；不吸轴）+ 高度通道（h 对静态高度集咬合）。 */
  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    const anc = ctx.anchor(), n = this.normal;
    if (this.face === null || !anc || !n || !this.plane) return;
    const wk = ctx.world();   // 推拉的推断世界 = 按下那一刻的模型
    const active = wk.activeSlot();
    const shell = this.shell;
    const hand: AlignHand = { has: (gid) => wk.slotOf(gid) === active && shell.has(wk.local(gid).id), opaque: true };
    let sn = ctx.hysteresis(ctx.snap(wk, s.x, s.y, { plane: this.plane, anchor: anc, lines: false, hand }), s.x, s.y);
    // 求解器在被推拉的那张面自己的平面上给的格点 / 整数长度：高度一律是 0，从源头就不当推拉的目标（统筹 11-12；意图门是第二层）。高度的整格由下面「开着吸附一律取整」管
    if (sn.kind === "grid-point" || sn.kind === "increment") { sn = { p: sn.p, kind: null }; ctx.dropHysteresis(); }
    const minL = gestureMinLen(ctx, anc);   // 这一处手势最短算多长（屏幕像素换成世界长度；统筹 11-12：不再写死 1 厘米）
    let fromSnap = true;   // 高度是吸到的 / 取整出来的（只要不是 0 就收）；false = 自由拖的（不到 minL 当没动）
    let ref = "";
    let stuck = false;
    const ppGlobal = wk.global(this.face);
    // 意图门（intent.ts；user 2026-10-21 夜「如果是push的话所有snap到pull的应该都不合法」）：
    // 自由高度 = 不吸附时指针沿法向给出的高度，它的符号就是推 / 拉意图；点吸附 / 面高度 / 高度咬合三路候选反号一律不合法，零点保留。
    const ray1 = ctx.frame().ray(s.x, s.y, ctx.vp());
    const qFree = closestOnAxis(anc, n, ray1.origin, ray1.dir);
    const hFree = qFree ? dot3(sub3(qFree, anc), n) : NaN;
    const moved = ctx.moved(s, travel);
    const allowed = (h: number): boolean => !hasIntent(moved, ctx.eps().drag) || intentAllows1D(hFree, h, minL);
    const hSnap = sn.kind !== null ? dot3(sub3(sn.p, anc), n) : NaN;
    if (sn.kind !== null && allowed(hSnap)) {
      ctx.setSnap(sn);
      this.h = hSnap;
      ref = `｜取${SNAP_LABELS[sn.kind] ?? sn.kind}高度`;
    } else {
      ctx.setSnap(null);
      if (sn.kind !== null) ctx.dropHysteresis();   // 被意图门否掉的吸附不许黏住（迟滞也不留）
      const hitF = pickEntity(wk, ctx.frame(), ctx.vp(), s.x, s.y, 0.5).face;
      const hitRec = hitF !== undefined ? wk.planeOf(hitF) : undefined;
      let hFace: number | null = null;
      if (hitF !== undefined && hitF !== ppGlobal && hitRec && Math.abs(dot3(hitRec.plane.n, n)) > 0.05) {
        const q = rayPlane(ray1.origin, ray1.dir, hitRec.plane.n, hitRec.plane.d);
        if (q) hFace = dot3(sub3(q, anc), n);
      }
      if (hFace !== null && allowed(hFace)) { this.h = hFace; ref = "｜取面高度"; }
      else {
        if (qFree) this.h = hFree;
        else stuck = true;
        fromSnap = false;
        const pxPerUnit = Math.max(ctx.frame().distBetween(anc, add3(anc, n), ctx.vp()), 0.5);
        const epsH = ctx.eps().edge / pxPerUnit;
        let best: number | null = null;
        for (const st of this.stops) if (allowed(st) && Math.abs(st - this.h) <= epsH && (best === null || Math.abs(st - this.h) < Math.abs(best - this.h))) best = st;
        const grid = ctx.grid();
        if (best !== null) {
          this.h = best; fromSnap = true;
          ref = `｜高度咬合 ${fmtLen(best)}`;
          ctx.setSnap({ p: add3(anc, scale3(n, this.h)), kind: "h-stop" });
        // 吸附的两种不许混（统筹 11-12，user「但吸附只在整厘米附近几个像素才咬 这里数学确实应该完全错了」）：吸到具体的东西（上面的停靠点、别的面的高度）= 孤立的目标，按光标离它几个屏幕像素判；
        //   吸到整格 = 目标铺满整条线，正确的运算是取整 h := s · round(h / s)，对任何 h 都做、没有「够不够近」、结果不随缩放变。两种都在时光标正指着的东西优先（上面先判），否则取整。
        } else if (grid.on && grid.snap > 0) {   // 开着吸附 = 一律取吸附长度的整数倍（统筹 11-12，做小零件：以前离整格近才咬，放大看时中间一大段停在哪就是哪）；Shift 反过来 = ctx.grid() 已是有效值；键入的数不走这里
          const step = grid.snap, r = Math.round(this.h / step) * step || 0;   // || 0：-0 当 0
          this.h = r; fromSnap = true;
          if (r !== 0) { ref = `｜整数长度 ${fmtLen(r)}`; ctx.setSnap({ p: add3(anc, scale3(n, this.h)), kind: "increment", label: `整数长度 ${fmtLen(r)}` }); }
          else ref = `｜不到半格（${fmtLen(step / 2)}），再拖远一点`;   // 取整是 0：不长东西、松手不提交（统筹 11-12 定的表现）
        }
      }
    }
    if (!fromSnap && Math.abs(this.h) < minL) this.h = 0;   // 自由拖的、不到这一处手势最短长度 = 没动
    ctx.setCursor(add3(anc, scale3(n, this.h)));
    const facing = Math.abs(dot3(n, ctx.frame().viewDir(anc)));
    if (moved > ctx.eps().drag && this.h === 0 && (stuck || facing > 0.9)) {
      ctx.hint("推拉没动：正对着这张面看，法向和视线平行，拖不出高度——环绕一下换个角度再拉（Esc 取消）");
      return;
    }
    this.say = `推拉 ${fmtLen(this.h)}${ref}`;   // 预演那一行由编辑器拼（live 的返回值 = 那一段）：以前 live 交空串，「整数长度 …」一预演就被「预览：诞生 面…」盖掉（user 11-12 截图）
    ctx.hint(`推拉 h = ${fmtLen(this.h)}${ref}（松手/再点落定；Esc 取消）`);
  }

  private opFor(ctx: ToolCtx, face: FaceKey, hl: number): Op { const keepRing = this.keepRing(ctx); return { op: "pushpull", at: ctx.activePool(), face, dist: hl, ...(keepRing ? { keepRing } : {}) }; }
  live(ctx: ToolCtx, preview: PreviewOp): string {
    if (this.face === null || this.h === 0) return "";   // h 在 track 里已经按「动没动 / 吸到 / 取整」定好：0 = 不长东西
    const k = ctx.kernel();
    if (k.face(this.face)) preview(this.opFor(ctx, faceKey(k, this.face), this.localH(ctx, this.h)));
    return this.say;
  }

  /** 加边（不自愈）：工具选项「加边」或按住 Ctrl（SketchUp Push/Pull + Ctrl）。 */
  private keepRing(ctx: ToolCtx): boolean { const m = ctx.mods(); return ctx.config.effective("pp", "mode", { ctrl: m.copy, shift: m.shift }) === "ring"; }

  private commit(ctx: ToolCtx): void {
    const h = this.h, fid = this.face!, hl = this.localH(ctx, h);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    const k = ctx.kernel();
    if (h !== 0 && k.face(fid)) {
      const n0 = ctx.opCount(), at0 = ctx.activePool(), face = faceKey(k, fid);
      const keepRing = this.keepRing(ctx);
      ctx.commitOp(this.opFor(ctx, face, hl));
      ctx.recordLast({ kind: "pp", ops: ctx.opCount() - n0, at: at0, face, h, hl, ...(keepRing ? { keepRing } : {}) });
    }
  }
}

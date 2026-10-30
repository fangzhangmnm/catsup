// tools/pushpull.ts —— 推拉工具的手势模块：steps 语法（点面 → 移动定高度 → 再点 / 松手落定）。从 editor.ts 原样搬出（刀 ② B，行为零变更）。
// 双通道吸附：光标通道（世界 = 按下时的模型，源面原位不透明；不吸轴）+ 高度通道（停靠集 pp-stops：0 / 同柱平行面 / 参考几何高度 + 整数长度）。
// 意图门：自由高度的符号 = 推 / 拉意图，反号候选不合法；0.10 护栏：曲面的一片不许推拉。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { FaceEvent, FaceId, Pt3, VertexId } from "../../kernel/kernel.ts";
import { add3, dot3, len3, scale3, sub3 } from "../../kernel/geom.ts";
import { ringVidsTolerant } from "../../kernel/face-lifecycle.ts";
import { closestOnAxis, rayPlane } from "../camera.ts";
import { hasIntent, intentAllows1D } from "../intent.ts";
import { pickEntity, type AlignHand, type DrawPlane } from "../pick.ts";
import { ppStopsOf } from "../pp-stops.ts";
import { faceKey } from "../ops.ts";
import { IDENTITY, applyNormal } from "../../scene/xform.ts";
import { fmtLen } from "../units.ts";
import { MIN_GESTURE_LEN, SNAP_LABELS } from "../gesture-consts.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
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
    const sn = ctx.hysteresis(ctx.snap(wk, s.x, s.y, { plane: this.plane, anchor: anc, lines: false, hand }), s.x, s.y);
    let ref = "";
    let stuck = false;
    const ppGlobal = wk.global(this.face);
    // 意图门（intent.ts；user 2026-10-21 夜「如果是push的话所有snap到pull的应该都不合法」）：
    // 自由高度 = 不吸附时指针沿法向给出的高度，它的符号就是推 / 拉意图；点吸附 / 面高度 / 高度咬合三路候选反号一律不合法，零点保留。
    const ray1 = ctx.frame().ray(s.x, s.y, ctx.vp());
    const qFree = closestOnAxis(anc, n, ray1.origin, ray1.dir);
    const hFree = qFree ? dot3(sub3(qFree, anc), n) : NaN;
    const moved = ctx.moved(s, travel);
    const allowed = (h: number): boolean => !hasIntent(moved, ctx.eps().drag) || intentAllows1D(hFree, h, MIN_GESTURE_LEN);
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
        const pxPerUnit = Math.max(ctx.frame().distBetween(anc, add3(anc, n), ctx.vp()), 0.5);
        const epsH = ctx.eps().edge / pxPerUnit;
        let best: number | null = null;
        for (const st of this.stops) if (allowed(st) && Math.abs(st - this.h) <= epsH && (best === null || Math.abs(st - this.h) < Math.abs(best - this.h))) best = st;
        const grid = ctx.grid();
        if (best !== null) {
          this.h = best;
          ref = `｜高度咬合 ${fmtLen(best)}`;
          ctx.setSnap({ p: add3(anc, scale3(n, this.h)), kind: "h-stop" });
        } else if (grid.on) {   // 整数长度（0.11 ⑤；与格点同一开关，按住 Shift 反过来 = ctx.grid() 已是有效值）：没停靠点时高度离整格近才咬
          const step = grid.snap, r = Math.round(this.h / step) * step;
          if (Math.abs(r) >= MIN_GESTURE_LEN && allowed(r) && Math.abs(r - this.h) <= epsH) {
            this.h = r;
            ref = `｜整数长度 ${fmtLen(r)}`;
            ctx.setSnap({ p: add3(anc, scale3(n, this.h)), kind: "increment", label: `整数长度 ${fmtLen(r)}` });
          }
        }
      }
    }
    ctx.setCursor(add3(anc, scale3(n, this.h)));
    const facing = Math.abs(dot3(n, ctx.frame().viewDir(anc)));
    if (moved > ctx.eps().drag && Math.abs(this.h) < MIN_GESTURE_LEN && (stuck || facing > 0.9)) {
      ctx.hint("推拉没动：正对着这张面看，法向和视线平行，拖不出高度——环绕一下换个角度再拉（Esc 取消）");
      return;
    }
    ctx.hint(`推拉 h = ${fmtLen(this.h)}${ref}（松手/再点落定；Esc 取消）`);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    if (this.face === null || Math.abs(this.h) < MIN_GESTURE_LEN) return "";
    const fid = this.face, h = this.localH(ctx, this.h), keepRing = this.keepRing(ctx);
    run((c) => c.pushPull(fid, h, { settleLanding: false, keepRing }));
    return "";
  }

  /** 加边（不自愈）：工具选项「加边」或按住 Ctrl（SketchUp Push/Pull + Ctrl）。 */
  private keepRing(ctx: ToolCtx): boolean { const m = ctx.mods(); return ctx.config.effective("pp", "mode", { ctrl: m.copy, shift: m.shift }) === "ring"; }

  private commit(ctx: ToolCtx): void {
    const h = this.h, fid = this.face!, hl = this.localH(ctx, h);
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    const k = ctx.kernel();
    if (Math.abs(h) >= MIN_GESTURE_LEN && k.face(fid)) {
      const n0 = ctx.opCount(), at0 = ctx.activePool(), face = faceKey(k, fid);
      const keepRing = this.keepRing(ctx);
      ctx.commitOp({ op: "pushpull", at: at0, face, dist: hl, ...(keepRing ? { keepRing } : {}) });
      ctx.recordLast({ kind: "pp", ops: ctx.opCount() - n0, at: at0, face, h, hl, ...(keepRing ? { keepRing } : {}) });
    }
  }
}

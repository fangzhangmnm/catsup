// tools/mesh-knife.ts —— 自由建模工作台的刀 + 环切（网格体；K）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 §2-1 / §2½ + 纪元账本 FM10 / FM11 / FM12：
//   · 刀**要吸**（§2½「刀要吸、挪不要吸」：落点是拓扑，不吸就切出一堆差 0.1 mm 的碎边）——落点永远是光标下看得见的点或边上的点；
//   · 一下一下连着切：每两个落点之间切一刀（= 一步撤销），接着从刚切到的点往下切；Esc 收刀；两个点得在同一张面上（跨面先切到中间那条边上）；
//   · 每个点 = 按下、滑动、松手才定（W-3 2026-11-10，user 11-10「第一个点改成按下、滑动、松手才定……后面的手感和线对齐」）：
//     按下只开始找，落点标记跟着笔 / 光标沿边滑，松手那一刻的落点才算；鼠标点一下 = 原地按下松手。悬停预告：端点 > 中点 > 边上的点；
//   · 环切（沿四边形带切一圈中线，切出来的那圈边进选区，接着移动 / 缩放）只走自己的入口：Ctrl+R 再点一条边、右键「环切」。
//     以前「同一条边点两下 = 环切」（FM10）：第一下点完光标不动就预演整圈、手一抖就落定（W-0 侦察）；user 11-10「可以」撤掉（W-2）。
//     同一处再点一下 = 收刀（和画线的收笔一样，底座 sameSpotEnds）；同一处再点、左下「收刀」钮、Esc 都走编辑器的 endChain 那一段（W-8）；
//   · 收刀时这一串进马后炮小窗（W-8，Fable 11-10 裁定）：一行一个落在边上的点（在边上的位置 0–1），改一个 = 撤掉这一串、按新位置重切；
//     切不成（拖到端头 / 切不出来）= 这个数退回原值、说原因、原来的切法不动；悬在某一行 = 模型上标出那个点。Ctrl+R 环切做完也进小窗（位置 / 圈数）；
//   · 不带 XOR（FM11「好刀不要xor」）：去边归溶解。停在面中间（悬线）还没做（网格面是简单环，悬线要另一种表示）。
import type { Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { knife, loopCuts } from "../../mesh/ops/index.ts";
import { LOOP_CUT_DEFAULTS, LOOP_CUT_FIELDS, loopCutArgs } from "../mesh-edits/loop-cut-fields.ts";
import type { ParamField, ParamValue } from "../param-panel.ts";
import { applyPt } from "../../scene/xform.ts";
import type { SnapKind } from "../solver.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, PreviewOp } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";

export type KnifePoint = { v: number } | { e: number; t: number };
type Hit = { pt: KnifePoint; w: Pt3; kind: SnapKind };
/** 这一串里切成的一刀（马后炮重切用）：提交的那条记录 + 刀口上的顶点（和 path 一一对应）。 */
type Cut = { def: number; face: number; path: [KnifePoint, KnifePoint]; verts: number[] };

/** 一个落点在哪几张面上（点 = 围着它的面；边上的点 = 边两侧的面）。 */
function facesAt(m: MeshKernel, p: KnifePoint): number[] {
  if ("v" in p) { const fs = new Set<number>(); for (const e of m.vEdges(p.v)) for (const f of m.eFaces(e)) fs.add(f); return [...fs].sort((a, b) => a - b); }
  return [...m.eFaces(p.e)].sort((a, b) => a - b);
}
/** 两个落点共有的那张面（最小 id）；没有 = null。 */
export function commonFace(m: MeshKernel, a: KnifePoint, b: KnifePoint): number | null {
  const fb = new Set(facesAt(m, b));
  return facesAt(m, a).find((f) => fb.has(f)) ?? null;
}
/** 这一刀切不切得出新边：两点已经是同一条边的两端 / 边上的点挨着它自己的端点 / 两个点在同一条边上 = 切不出。 */
function cutsNothing(m: MeshKernel, a: KnifePoint, b: KnifePoint): boolean {
  if ("v" in a && "v" in b) return a.v === b.v || m.edgeOf(a.v, b.v) >= 0;
  if ("v" in a && "e" in b) return m.edgeA[b.e] === a.v || m.edgeB[b.e] === a.v;
  if ("e" in a && "v" in b) return m.edgeA[a.e] === b.v || m.edgeB[a.e] === b.v;
  return "e" in a && "e" in b && a.e === b.e;   // 两个都是边上的点（W-2 起同一条边不再 = 环切）
}

export class MeshKnifeTool implements ToolHandler {
  readonly tool = "knife" as const;
  /** direct：松手交给工具（落点在松手时定）。以前是 steps = 按下那一刻就按悬停到的位置取点，笔没有悬停、一落下就得正好压在边上（W-0 侦察）。 */
  readonly grammar = "direct" as const;
  /** 同一处再点一下 = 收刀（和画线的收笔一样）。direct 工具底座不管这一下，刀在 up 里自己认；W-7 的「收」钮也认这个标记。 */
  readonly sameSpotEnds = true;
  readonly finishLabel = "收刀";   // 左下芯片那颗「收」（W-7）
  readonly escFinishes = true;     // 在等下一点时 Esc = 收刀、开小窗；再按一次才是原来的取消（W-8）
  /** 这一串切成的每一刀 + 第一个点定下时编辑器的操作数（收刀时进马后炮小窗：W-8）。 */
  private chain: Cut[] = [];
  private chainOps0 = 0;
  private start: KnifePoint | null = null;
  private startW: Pt3 | null = null;
  private startKind: SnapKind = "endpoint";
  private hov: Hit | null = null;
  /** 按着没松 = 这一下的落点还在找（active 的一票：底座这时才把移动 / 松手递过来）。 */
  private pressing = false;
  /** Ctrl+R 预备：下一下点到边上直接环切（Blender Ctrl+R；纪元账本 FM10「也加一个模式按钮」）。 */
  private loopNext = false;
  armLoop(ctx: ToolCtx): void { this.cancel(); this.loopNext = true; ctx.hint("环切：点一条边（四边形带上的）就切一圈；Esc 取消"); }
  /** 光标的屏幕位置：没落在点 / 边上时刀线画到这里——每帧按当前相机从这一点的射线上取（onPlane），所以线永远从起点到光标，
   *  不在三维里留一个悬空的点，转了视角也不飘（W-3；以前存的是三维点，W-0 侦察转视角后线伸进空处）。 */
  private cursorS: { x: number; y: number } | null = null;
  /** 这一串切开始时有没有选区（user 10-27：没选区开始 = 做完也不留选区）。 */
  private hadSel = false;

  active(): boolean { return this.start !== null || this.pressing; }
  /** 松着手、已经有起点 = 在等下一下：回车 = 在光标处点一下（底座 confirmGesture）。 */
  awaitsClick(): boolean { return this.start !== null && !this.pressing; }
  cancel(): void { this.start = this.startW = null; this.hov = null; this.cursorS = null; this.pressing = false; this.chain = []; }
  sample(): Record<string, number> { return {}; }
  describe(): Record<string, unknown> { return { meshKnife: { start: this.start, hov: this.hov?.pt ?? null, pressing: this.pressing } }; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    this.hov = this.snapAt(ctx, s);
    ctx.setSnap(this.hov ? { p: this.hov.w, kind: this.hov.kind } : null);   // 只画落点那个小标记，不高亮边（user「自由建模模式不要悬浮高亮」）
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    this.hov = this.snapAt(ctx, s);
    ctx.setSnap(this.hov ? { p: this.hov.w, kind: this.hov.kind } : null);
    this.cursorS = { x: s.x, y: s.y };
    ctx.setCursor(this.hov?.w ?? null);
    ctx.hint(null);   // 提示行只说这一刻：有预演时底座接着写「切一刀」；没落点 = 空（W-3：以前停在上一句）
  }
  /** 屏幕点 → 过上一个落点、垂直于视线的平面上的点（每帧现算，见 cursorS）。 */
  private onPlane(ctx: ToolCtx, s: { x: number; y: number }): Pt3 | null {
    const a = this.startW;
    if (!a) return null;
    const vp = ctx.vp(), fr = ctx.frame(), pa = fr.project?.(a, vp), n = fr.ray(pa?.x ?? s.x, pa?.y ?? s.y, vp).dir, r = fr.ray(s.x, s.y, vp);
    const den = n.x * r.dir.x + n.y * r.dir.y + n.z * r.dir.z;
    if (Math.abs(den) < 1e-9) return null;
    const t = (n.x * (a.x - r.origin.x) + n.y * (a.y - r.origin.y) + n.z * (a.z - r.origin.z)) / den;
    return { x: r.origin.x + r.dir.x * t, y: r.origin.y + r.dir.y * t, z: r.origin.z + r.dir.z * t };
  }
  /** 现在这一下切不切得出来（刀线的颜色）。 */
  private validNow(ctx: ToolCtx): boolean {
    const a = this.start, h = this.hov;
    if (!a || !h) return false;
    const m = ctx.mesh(), b = h.pt;
    return !cutsNothing(m, a, b) && commonFace(m, a, b) !== null;
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.loopNext) {
      const h = this.snapAt(ctx, ev);
      this.loopNext = false;
      if (h && "e" in h.pt) { const sel = ctx.selection(); this.hadSel = sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0; this.loopCutAt(ctx, h.pt.e); return; }
      ctx.hint("环切：要点在边上（Ctrl+R 再来一次）"); return;
    }
    this.pressing = true;
    this.hov = null; ctx.setSnap(null);   // 每次按下先清掉上一次留下的落点（笔没有悬停：不清 = 刀线连到上一笔停下的地方；W-0 侦察）
    this.track(ctx, ev);
    if (!this.hov) ctx.hint(this.start ? "切割：滑到点或边上再松手" : "切割：滑到点或边上再松手，松手的地方是第一个点");
  }

  up(ctx: ToolCtx, ev: ToolPointer): void {
    if (!this.pressing) return;
    this.pressing = false;
    this.track(ctx, ev);   // 松手那一点
    const h = this.hov;
    if (this.start && this.startW && ctx.frame().distTo(ev.x, ev.y, this.startW, ctx.vp()) <= Math.max(ctx.eps().tap, ctx.eps().snap)) {   // 同一处再点一下 = 收刀（吸附半径：笔「同一处」点两下常差 5–8 px，同底座）
      ctx.endChain();   // 和左下「收刀」钮、Esc 同一段（W-8；以前这里自己收，Fable 审 W-7 时点出是两段代码）
      return;
    }
    if (!h) { ctx.hint(this.start ? "切割：要在点或边上松手（停在面中间还没做）；同一处再点一下或 Esc 收刀" : "切割：滑到点或边上再松手，松手的地方是第一个点；环切用 Ctrl+R 或右键菜单"); return; }
    if (!this.start) {
      const sel = ctx.selection(); this.hadSel = sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0;
      this.chain = []; this.chainOps0 = ctx.opCount();
      this.setStart(ctx, h);
      ctx.hint("切割：按下、滑到下一个点（同一张面上的点或边）再松手 = 切一刀；同一处再点一下或 Esc 收刀");
      return;
    }
    const a = this.start, b = h.pt, m = ctx.mesh(), def = ctx.activePool().def;
    if (cutsNothing(m, a, b)) { this.setStart(ctx, h); ctx.hint("切割：这两个点之间已经有边了，从这里接着切"); return; }   // 起点挪到新点（W-2：以前边上的点不挪、提示却说「从这里」）
    const face = commonFace(m, a, b);
    if (face === null) { this.settle(ctx); ctx.hint("切割：两个点不在同一张面上（先切到中间那条边上，再接着切）"); return; }
    const probe = m.clone(), verts = knife(probe, face, [a, b]);   // 先在副本上切一遍拿新点的 id（提交 = 同一份内核 + 同一组参数 = 同一批 id）
    ctx.commitOp({ op: "meshKnife", def, face, path: [a, b] });
    this.chain.push({ def, face, path: [a, b], verts });
    this.setStart(ctx, { pt: { v: verts[verts.length - 1] }, w: h.w, kind: "endpoint" });
    ctx.hint("切了一刀；接着按下、滑到下一个点松手，同一处再点一下或 Esc 收刀");
  }
  /** 定下一个点（第一个点 / 切到的点 / 挪过去的起点）：起点换成它。 */
  private setStart(ctx: ToolCtx, h: Hit): void { this.start = h.pt; this.startW = h.w; this.startKind = h.kind; ctx.setAnchor(h.w); this.settle(ctx); }
  /** 松手之后：找落点时的落点 / 光标丢掉（不留连到别处的线），标记留在起点上——笔没有悬停，不然看不出起点在哪；下一次按下再清（down）。 */
  private settle(ctx: ToolCtx): void { this.hov = null; this.cursorS = null; ctx.setCursor(null); ctx.setSnap(this.startW ? { p: this.startW, kind: this.startKind } : null); }

  live(ctx: ToolCtx, preview: PreviewOp): string {
    const a = this.start, h = this.hov;
    if (!a || !h) return "";
    const m = ctx.mesh(), b = h.pt;
    if (cutsNothing(m, a, b)) return "";
    const face = commonFace(m, a, b);
    if (face === null) return "不在同一张面上";
    preview({ op: "meshKnife", def: ctx.activePool().def, face, path: [a, b] });
    return "切一刀";
  }

  viewExtras(ctx: ToolCtx): Partial<ViewState> {   // 刀没退出就一直画刀线（切不出来 = 灰；不被几何挡）；没落点 = 画到光标（每帧按屏幕位置现算）
    if (!this.startW) return {};
    const b = this.hov?.w ?? (this.cursorS ? this.onPlane(ctx, this.cursorS) : null);
    return b ? { knifeLine: { a: this.startW, b, valid: this.validNow(ctx) } } : {};
  }

  private loopCutAt(ctx: ToolCtx, e: number): void {
    const hadSel = this.hadSel, def = ctx.activePool().def;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    /** 按小窗里的值切（先在副本上切：切不出 = 一条都不提交）。 */
    const cut = (v: Readonly<Record<string, ParamValue>>, quiet = false): boolean => {
      const { t, cuts } = loopCutArgs(v), r = loopCuts(ctx.mesh().clone(), e, cuts, t);
      if (!r.edges.length) { ctx.hint("环切：这条边两侧不是四边形，切不出一圈"); return false; }
      ctx.commitOp({ op: "meshLoopCut", def, edge: e, t, ...(cuts > 1 ? { cuts } : {}) });
      const k = ctx.mesh(), ring = `${cuts > 1 ? `切了 ${cuts} 圈` : "切了一圈"} ${r.edges.length} 条边${r.closed ? "（闭合）" : "（开口带）"}`;
      if (hadSel) ctx.setSelection({ edges: r.edges.filter((x) => k.hasE(x)) });
      if (!quiet) ctx.hint(hadSel ? `环切：${ring}；这圈边在选区里，接着可以移动 / 缩放` : `环切：${ring}`);
      return true;
    };
    const n0 = ctx.opCount();
    if (!cut(LOOP_CUT_DEFAULTS)) return;
    ctx.offerAfterthought("环切", LOOP_CUT_FIELDS, { ...LOOP_CUT_DEFAULTS }, ctx.opCount() - n0, (v, restoring) => (cut(v, restoring) ? undefined : false));   // 做完进小窗：改位置 / 圈数（W-8）
  }

  /** 收刀（W-8）：这一串进马后炮小窗——一行一个落在边上的点。编辑器的 endChain 在 cancel 之前调这里。 */
  onEndChain(ctx: ToolCtx): void {
    const chain = this.chain, nOps = ctx.opCount() - this.chainOps0;
    this.chain = [];
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    const rows: { key: string; i: number; j: 0 | 1; t: number }[] = [];
    chain.forEach((c, i) => ([0, 1] as const).forEach((j) => { const p = c.path[j]; if ("e" in p) rows.push({ key: `p${rows.length}`, i, j, t: p.t }); }));
    if (!chain.length || !rows.length || nOps <= 0) return;   // 一刀没切成 / 落点全在顶点上 = 不开
    const fields: ParamField[] = rows.map((r, n) => ({ key: r.key, def: { kind: "number", label: `第 ${n + 1} 点`, min: 0, max: 1, step: 0.01 } }));
    const shown: Record<string, ParamValue> = Object.fromEntries(rows.map((r) => [r.key, Math.round(r.t * 1000) / 1000]));
    let verts = chain.map((c) => c.verts);
    const mark = (key: string | null): void => {   // 悬在某一行：在模型上标出那个点（Fable 11-10）
      const r = rows.find((x) => x.key === key), m = ctx.mesh(), v = r ? verts[r.i]?.[r.j] : undefined;
      ctx.setSnap(v !== undefined && m.hasV(v) ? { p: applyPt(ctx.ctxXform(), m.pt(v)), kind: "on-edge" } : null);
    };
    ctx.offerAfterthought("切割", fields, shown, nOps, (vals, restoring) => {
      const cuts = chain.map((c): Cut => ({ ...c, path: [c.path[0], c.path[1]] }));
      for (const [n, r] of rows.entries()) {
        const t = vals[r.key] === shown[r.key] ? r.t : Number(vals[r.key]);   // 没动的那几行用原来的精确值（小窗里显示的是舍入的）
        if (!(t > 0.001 && t < 0.999)) { ctx.hint(`切割：第 ${n + 1} 点拖到了边的端头上（要在 0 和 1 之间），退回原来的位置`); return false; }
        const p = cuts[r.i].path[r.j];
        if ("e" in p) cuts[r.i].path[r.j] = { e: p.e, t };
      }
      const probe = ctx.mesh().clone(), got: number[][] = [];
      try { for (const c of cuts) got.push(knife(probe, c.face, c.path)); }
      catch { ctx.hint("切割：按这个位置切不出来，退回原来的位置"); return false; }   // 先在副本上切一遍：切不成 = 一条都不提交
      for (const c of cuts) ctx.commitOp({ op: "meshKnife", def: c.def, face: c.face, path: c.path });
      verts = got;
      if (!restoring) ctx.hint(`切割：按新位置重切了 ${cuts.length} 刀`);
      return undefined;
    }, { focus: mark });
  }

  /**
   * 光标下看得见的点 / 中点 / 边上的点（拓扑吸附，永远开）。中点 = 离边的中点在点的吸附半径内（和硬表面的求解器同一个 eps.point；W-3）。
   * 边上的点 = 光标正下方那一点在这条边上的位置：问指针帧的 distToSeg
   * （桌面相机按深度做透视校正、VR 帧按射线算；W-1 2026-11-10 Claude Opus 5.5：以前把屏幕上的比例直接当成边上的比例，
   * 透视下标记跑偏——默认视角 8 像素，一条往里伸的 4 m 长边上 160 像素 / 1.2 m；正交下两者相同）。
   */
  private snapAt(ctx: ToolCtx, s: { x: number; y: number }): Hit | null {
    const c = ctx.classify(ctx.world(), ctx.pickStatic(s.x, s.y));   // 真身的拓扑（预演里那条边已经劈开了）
    if (c.kind !== "entity") return null;
    const m = ctx.mesh(), X = ctx.ctxXform(), h = c.local;
    if (h.vertex !== undefined && m.hasV(h.vertex)) return { pt: { v: h.vertex }, w: applyPt(X, m.pt(h.vertex)), kind: "endpoint" };
    if (h.edge !== undefined && m.hasE(h.edge)) {
      const a = applyPt(X, m.pt(m.edgeA[h.edge])), b = applyPt(X, m.pt(m.edgeB[h.edge])), vp = ctx.vp(), fr = ctx.frame();
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 };
      if (fr.distTo(s.x, s.y, mid, vp) <= ctx.eps().point) return { pt: { e: h.edge, t: 0.5 }, w: mid, kind: "midpoint" };
      const t0 = fr.distToSeg(s.x, s.y, a, b, vp).t;
      const t = Math.max(0.001, Math.min(0.999, Number.isFinite(t0) ? t0 : 0.5));
      return { pt: { e: h.edge, t }, w: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, kind: "on-edge" };
    }
    return null;
  }
}

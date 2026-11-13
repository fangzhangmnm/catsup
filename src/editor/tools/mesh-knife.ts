// tools/mesh-knife.ts —— 自由建模工作台的刀 + 环切（网格体；K）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 §2-1 / §2½ + 纪元账本 FM10 / FM11 / FM12：
//   · 落点跟吸附开关走（2026-11-13 user 改口，盖过 10-27 设计稿 §2½「刀要吸」：「自由建模的时候，如果你没有开吸附的时候，它是应该不会吸附终点的……
//     你可以想象，自由建模就是艺术家而不是工程师」）。开关 = 和挪同一个（底 XOR Shift；底 = ctx.snapBase()：鼠标关、笔 / 手指跟右上角锁钮）：
//     开着 = 端点 > 中点 > 边上的点（照旧）；关着 = 笔 / 光标正下方那一点在边上的位置，不拽到端点、不拽到中点（拾取只给了点 = 取它连着的边里离笔最近的那条），
//     离端点不到 KNIFE_END_PX 个屏幕像素 = 就是那个端点（免得切出看不见的碎边；统筹加的，已报 user）。落点永远在看得见的点或边上；
//   · 输入 = 「要先找位置的」（stance.ts PEN_PRESS = seek；笔的设计稿 ai-docs/20261113-freeform-pen-grammar.md 第四节、第七节第 3 步，2026-11-13）：
//     鼠标移动 / 笔悬空 / 笔轻按着滑 = 找位置（落点标记跟着，不下点）；鼠标点一下 / 笔重按 = 下点（重按的点 = 压力猛升之前那一刻；翻译在 seek-input.ts，刀不读设备）；
//     不报压感的笔点一下 = 下点；鼠标按着拖完松开 = 不下点。
//   · 每下一个点刀线都接着走：第一个点之后，每个点都和上一个点切一刀（= 一步撤销），接着从这一点往下切（边上、点上都一样；面中间 = 第 4 步）；两个点得在同一张面上（跨面先切到中间那条边上）；
//   · 收刀 = 报压感的笔抬笔（宽限 0.05 秒，app/gestures.ts）/ Esc / 左下「收刀」钮：已经切好的留着，还没切到的那一段丢掉。「同一处再点一下 = 收刀」撤了。
//     以前（W-3，11-10）每个点 = 按下、滑动、松手才定；那是以为笔没有悬停（设计稿第六节），这一版换掉。
//   · 环切（沿四边形带切一圈中线，切出来的那圈边进选区，接着移动 / 缩放）只走自己的入口：Ctrl+R 再点一条边、右键「环切」。
//     以前「同一条边点两下 = 环切」（FM10）：第一下点完光标不动就预演整圈、手一抖就落定（W-0 侦察）；user 11-10「可以」撤掉（W-2）。
//     抬笔、左下「收刀」钮、Esc 都走编辑器的 endChain 那一段（W-8）；
//   · 收刀时这一串进马后炮小窗（W-8，Fable 11-10 裁定）：一行一个落在边上的点（在边上的位置 0–1），改一个 = 撤掉这一串、按新位置重切；
//     切不成（拖到端头 / 切不出来）= 这个数退回原值、说原因、原来的切法不动；悬在某一行 = 模型上标出那个点。Ctrl+R 环切做完也进小窗（位置 / 圈数）；
//   · 不带 XOR（FM11「好刀不要xor」）：去边归溶解。停在面中间（悬线）还没做（网格面是简单环，悬线要另一种表示）。
import type { Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { knife, knifeCheck, KnifeRefused, loopCuts, type KnifeStop } from "../../mesh/ops/index.ts";
import { rayTriHit } from "./mesh-snap.ts";
import { LOOP_CUT_DEFAULTS, LOOP_CUT_FIELDS, loopCutArgs } from "../mesh-edits/loop-cut-fields.ts";
import type { ParamField, ParamValue } from "../param-panel.ts";
import { applyPt } from "../../scene/xform.ts";
import type { SnapKind } from "../solver.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, PreviewOp } from "../tool-handler.ts";
import type { ViewState } from "../view-state.ts";
import { SeekInput } from "../seek-input.ts";

const HINT_FIRST = "切割：找到点或边，点一下（笔：重按）= 第一个点；环切用 Ctrl+R 或右键菜单";
const HINT_LOOP = "环切：找到一条边（四边形带上的），点一下（笔：重按）= 切一圈；Esc 取消";
const HINT_NEXT = "切割：接着找下一个点（同一张面上的点或边），点一下（笔：重按）= 切一刀，再接着切；抬笔 / Esc / 左下「收刀」收刀";

export type KnifePoint = { v: number } | { e: number; t: number };
/** 吸附关着时，离端点不到这么多屏幕像素 = 就是那个端点（统筹 11-13：免得切出看不见的碎边）。 */
export const KNIFE_END_PX = 2;
/** 落点：点 / 边上的点（环上）；或者面里的点（第七节第 4 步：local = 定义坐标，笔正下方那一点、不吸附）。 */
type RingHit = { pt: KnifePoint; w: Pt3; kind: SnapKind };
type FaceHit = { face: number; local: Pt3; w: Pt3; kind: "on-face" };
type Hit = RingHit | FaceHit;
/** 这一串里切成的一刀（马后炮重切用）：提交的那条记录 + 刀口上的顶点（和 path 一一对应：面里的点 = 新点）。 */
type Cut = { def: number; face: number; path: KnifeStop[]; verts: number[] };

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
  /** direct：底座原样递按下 / 移动 / 松开，翻成「找位置 / 下点 / 抬笔」在 seek-input.ts（stance.ts PEN_PRESS = seek；笔的设计稿第七节第 3 步）。 */
  readonly grammar = "direct" as const;
  readonly finishLabel = "收刀";   // 左下芯片那颗「收」（W-7）：在等下一点时露；收刀只有抬笔 / Esc / 这颗钮（「同一处再点一下 = 收刀」撤了：设计稿第四节）
  private readonly input = new SeekInput({ seek: (ctx, s) => this.seekAt(ctx, s), place: (ctx) => this.placeHere(ctx), lift: (ctx) => this.liftEnd(ctx) });
  readonly escFinishes = true;     // 在等下一点时 Esc = 收刀、开小窗；再按一次才是原来的取消（W-8）
  /** 这一串切成的每一刀 + 第一个点定下时编辑器的操作数（收刀时进马后炮小窗：W-8）。 */
  private chain: Cut[] = [];
  private chainOps0 = 0;
  private start: KnifePoint | null = null;
  private startW: Pt3 | null = null;
  private startKind: SnapKind = "endpoint";
  private hov: Hit | null = null;
  /** 在面里拐过的弯（还没切到边的那一段：只是预演，不进撤销；放弃 = 什么都没发生）：哪张面、拐点（定义坐标 / 世界坐标）。第一个面里的点定下是哪张面。 */
  private bend: { face: number; pts: Pt3[]; ws: Pt3[] } | null = null;
  /** Ctrl+R 预备：下一下点到边上直接环切（Blender Ctrl+R；纪元账本 FM10「也加一个模式按钮」）。 */
  private loopNext = false;
  armLoop(ctx: ToolCtx): void { this.cancel(); this.loopNext = true; ctx.hint(HINT_LOOP); }
  /** 光标的屏幕位置：没落在点 / 边上时刀线画到这里——每帧按当前相机从这一点的射线上取（onPlane），所以线永远从起点到光标，
   *  不在三维里留一个悬空的点，转了视角也不飘（W-3；以前存的是三维点，W-0 侦察转视角后线伸进空处）。 */
  private cursorS: { x: number; y: number } | null = null;
  /** 这一串切开始时有没有选区（user 10-27：没选区开始 = 做完也不留选区）。 */
  private hadSel = false;

  active(): boolean { return this.start !== null || this.input.pressing() || this.loopNext; }   // 环切预备着 = 手势里（Esc 取消它；移动按「找位置」走）
  /** 松着手、已经有起点 = 在等下一下：回车 = 在光标处点一下（底座 confirmGesture）。 */
  awaitsClick(): boolean { return this.start !== null && !this.input.pressing(); }
  cancel(): void { this.start = this.startW = null; this.hov = null; this.cursorS = null; this.input.cancel(); this.chain = []; this.bend = null; this.loopNext = false; }
  sample(): Record<string, number> { return {}; }
  describe(): Record<string, unknown> { const h = this.hov; return { meshKnife: { start: this.start, hov: h ? ("face" in h ? { face: h.face } : h.pt) : null, pressing: this.input.pressing(), bend: this.bend ? { face: this.bend.face, n: this.bend.pts.length } : null } }; }

  /** 悬着（鼠标没按、笔悬空、还没有起点）= 只找位置：落点标记跟着，不碰提示行。 */
  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    this.hov = this.snapAt(ctx, s);
    ctx.setSnap(this.hov ? { p: this.hov.w, kind: this.hov.kind } : null);   // 只画落点那个小标记，不高亮边（user「自由建模模式不要悬浮高亮」）
  }
  /** 底座递来的移动（按着 / 已有起点）：交给 seek-input 翻成「找位置」，带着重按的 = 下点。 */
  track(ctx: ToolCtx, s: { x: number; y: number }, _travel?: number, ev?: ToolPointer): void { this.input.move(ctx, s, ev); }
  /** 找位置（seek-input 的口）：落点标记 + 刀线跟到屏幕上这一点。 */
  private seekAt(ctx: ToolCtx, s: { x: number; y: number }): void {
    this.hov = this.snapAt(ctx, s);
    ctx.setSnap(this.hov ? { p: this.hov.w, kind: this.hov.kind } : null);
    this.cursorS = { x: s.x, y: s.y };
    ctx.setCursor(this.hov?.w ?? null);
    if (!this.loopNext) ctx.hint(null);   // 提示行只说这一刻：有预演时底座接着写「切一刀」；没落点 = 空（W-3：以前停在上一句）；环切预备着 = 留着那句说明
  }
  /** 屏幕点 → 过上一个落点、垂直于视线的平面上的点（每帧现算，见 cursorS）。 */
  private onPlane(ctx: ToolCtx, s: { x: number; y: number }): Pt3 | null {
    const a = this.bend?.ws[this.bend.ws.length - 1] ?? this.startW;   // 拐过弯 = 从最后一个拐点量
    if (!a) return null;
    const vp = ctx.vp(), fr = ctx.frame(), pa = fr.project?.(a, vp), n = fr.ray(pa?.x ?? s.x, pa?.y ?? s.y, vp).dir, r = fr.ray(s.x, s.y, vp);
    const den = n.x * r.dir.x + n.y * r.dir.y + n.z * r.dir.z;
    if (Math.abs(den) < 1e-9) return null;
    const t = (n.x * (a.x - r.origin.x) + n.y * (a.y - r.origin.y) + n.z * (a.z - r.origin.z)) / den;
    return { x: r.origin.x + r.dir.x * t, y: r.origin.y + r.dir.y * t, z: r.origin.z + r.dir.z * t };
  }
  /** 现在这一下切不切得出来（刀线的颜色）：落在环上 = 和提交同一个 knifeCheck；落在面里 = 这张面能接着拐（拐弯的那张 / 挨着起点的）。 */
  private validNow(ctx: ToolCtx): boolean {
    const a = this.start, h = this.hov;
    if (!a || !h) return false;
    const m = ctx.mesh();
    if ("face" in h) return this.bend ? h.face === this.bend.face : facesAt(m, a).includes(h.face);
    const plan = this.planTo(m, h.pt);
    return !!plan && !("why" in plan);
  }
  /** 从起点（经过拐点）到环上这一点的一刀：哪张面、整条路径；切不出 = null（两点之间已经有边）；验不过 = 原因（knifeCheck 那一句）。 */
  private planTo(m: MeshKernel, b: KnifePoint): { face: number; path: KnifeStop[] } | { why: string } | null {
    const a = this.start!;
    if (this.bend) { const path: KnifeStop[] = [a, ...this.bend.pts.map((p) => ({ p })), b], why = knifeCheck(m, this.bend.face, path); return why ? { why } : { face: this.bend.face, path }; }
    if (cutsNothing(m, a, b)) return null;
    const face = commonFace(m, a, b);
    if (face === null) return { why: "两个点不在同一张面上（先切到中间那条边上，再接着切）" };
    const why = knifeCheck(m, face, [a, b]);
    return why ? { why } : { face, path: [a, b] };
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.input.down(ctx, ev);   // 环切预备着也一样：按下只找边，下点（鼠标点一下 / 笔重按）才切（第七节第 5 步：以前按下那一刻就切 = 笔一落下就切了）
    if (!this.hov && !this.start) ctx.hint(HINT_FIRST);
  }

  up(ctx: ToolCtx, ev: ToolPointer): void { if (this.input.pressing()) this.input.up(ctx, ev); }

  /** 下点（seek-input 的口）：在现在的落点标记上下一点——第一个点 = 起点；面里的点 = 拐一个弯（第一个定下是哪张面）；环上的点 = 从上一个点（经过拐点）切一刀（= 一步撤销），接着从这一点往下切。 */
  private placeHere(ctx: ToolCtx): void {
    const h = this.hov, m = ctx.mesh();
    if (this.loopNext) {   // 环切：找到的边上下点 = 切一圈（第七节第 5 步）
      if (h && "pt" in h && "e" in h.pt) { const sel = ctx.selection(); this.hadSel = sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0; this.loopNext = false; this.loopCutAt(ctx, h.pt.e); return; }
      ctx.hint("环切：要点在边上（四边形带上的）；Esc 取消"); return;
    }
    if (!h) { ctx.hint(this.start ? "切割：下点要在点、边或者面上；抬笔 / Esc / 左下「收刀」收刀" : HINT_FIRST); return; }
    if ("face" in h) {   // 面里的点（第七节第 4 步）
      if (!this.start) { ctx.hint("切割：从面中间起刀还没做，第一个点要在点或边上"); return; }
      if (this.bend && h.face !== this.bend.face) { ctx.hint("切割：一刀只能在一张面里拐弯（这一点在另一张面上）；先切到这张面的边上"); return; }
      if (!this.bend && !facesAt(m, this.start).includes(h.face)) { ctx.hint("切割：这张面不挨着起点（起点要在这张面的点或边上）"); return; }
      this.bend ??= { face: h.face, pts: [], ws: [] };
      this.bend.pts.push(h.local); this.bend.ws.push(h.w);
      ctx.hint("切割：在面里拐了一个弯；接着拐，或者切到这张面的点或边上");
      return;
    }
    if (!this.start) {
      const sel = ctx.selection(); this.hadSel = sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0;
      this.chain = []; this.chainOps0 = ctx.opCount();
      this.setStart(ctx, h);
      ctx.hint(HINT_NEXT);
      return;
    }
    const a = this.start, b = h.pt, def = ctx.activePool().def;
    if (!this.bend && cutsNothing(m, a, b)) { this.setStart(ctx, h); ctx.hint("切割：这两个点之间已经有边了，从这里接着切"); return; }   // 起点挪到新点（W-2：以前边上的点不挪、提示却说「从这里」）
    const plan = this.planTo(m, b);
    if (!plan) return;
    if ("why" in plan) { if (!this.bend) this.settle(ctx); ctx.hint(`切割：${plan.why}`); return; }   // 拐过弯的这一段留着（只是预演）：换一个终点，或者 Esc 放弃
    const probe = m.clone(), verts = knife(probe, plan.face, plan.path);   // 先在副本上切一遍拿新点的 id（提交 = 同一份内核 + 同一组参数 = 同一批 id）
    ctx.commitOp({ op: "meshKnife", def, face: plan.face, path: plan.path });
    this.chain.push({ def, face: plan.face, path: plan.path, verts });
    this.bend = null;
    this.setStart(ctx, { pt: { v: verts[verts.length - 1] }, w: h.w, kind: "endpoint" });
    ctx.hint(`切了一刀；${HINT_NEXT.slice(3)}`);
  }
  /** 抬笔（seek-input 的口；报压感的笔抬起、宽限过了）= 收刀：已经切好的留着、进小窗，还没切到的那一段丢掉（和 Esc、左下「收刀」同一段 endChain）。还没有起点 = 什么都不做。 */
  private liftEnd(ctx: ToolCtx): void { if (this.start) ctx.endChain(); else { this.hov = null; ctx.setSnap(null); } }
  /** 定下一个点（第一个点 / 切到的点 / 挪过去的起点）：起点换成它。 */
  private setStart(ctx: ToolCtx, h: RingHit): void { this.start = h.pt; this.startW = h.w; this.startKind = h.kind; ctx.setAnchor(h.w); this.settle(ctx); }
  /** 松手之后：找落点时的落点 / 光标丢掉（不留连到别处的线），标记留在起点上——笔没有悬停，不然看不出起点在哪；下一次按下再清（down）。 */
  private settle(ctx: ToolCtx): void { this.hov = null; this.cursorS = null; ctx.setCursor(null); ctx.setSnap(this.startW ? { p: this.startW, kind: this.startKind } : null); }

  live(ctx: ToolCtx, preview: PreviewOp): string {
    if (this.loopNext) {   // 环切预备着：找到的边上预演整圈（下点之前看得见会切成什么样）
      const h = this.hov;
      if (!h || !("pt" in h) || !("e" in h.pt)) return "";
      const { t, cuts } = loopCutArgs(LOOP_CUT_DEFAULTS);
      preview({ op: "meshLoopCut", def: ctx.activePool().def, edge: h.pt.e, t, ...(cuts > 1 ? { cuts } : {}) });
      return "环切";
    }
    const a = this.start, h = this.hov;
    if (!a || !h) return "";
    if ("face" in h) return this.bend ? "拐弯" : "";   // 面里：还没切到边，只画刀线
    const plan = this.planTo(ctx.mesh(), h.pt);
    if (!plan) return "";
    if ("why" in plan) return plan.why;
    preview({ op: "meshKnife", def: ctx.activePool().def, face: plan.face, path: plan.path });
    return this.bend ? "沿折线切一刀" : "切一刀";
  }

  viewExtras(ctx: ToolCtx): Partial<ViewState> {   // 刀没退出就一直画刀线（切不出来 = 灰；不被几何挡）；没落点 = 画到光标（每帧按屏幕位置现算）
    if (!this.startW) return {};
    const h = this.hov, onFace = h && "face" in h && this.cursorS ? this.faceAt(ctx, this.cursorS, h.face)?.w ?? null : null;   // 落在面里 = 每帧按光标现算（转了视角也不飘，和 cursorS 同一个道理）
    const b = h && "face" in h ? onFace ?? (this.cursorS ? this.onPlane(ctx, this.cursorS) : h.w) : h?.w ?? (this.cursorS ? this.onPlane(ctx, this.cursorS) : null);
    return b ? { knifeLine: { a: this.startW, b, valid: this.validNow(ctx), ...(this.bend ? { via: this.bend.ws } : {}) } } : {};
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
    const rows: { key: string; i: number; j: number; t: number }[] = [];
    chain.forEach((c, i) => [0, c.path.length - 1].forEach((j) => { const p = c.path[j]; if ("e" in p) rows.push({ key: `p${rows.length}`, i, j, t: p.t }); }));   // 只列两头落在边上的；面里的拐点这一版不列（第八节第 4 条）
    if (!chain.length || !rows.length || nOps <= 0) return;   // 一刀没切成 / 落点全在顶点上 = 不开
    const fields: ParamField[] = rows.map((r, n) => ({ key: r.key, def: { kind: "number", label: `第 ${n + 1} 点`, min: 0, max: 1, step: 0.01 } }));
    const shown: Record<string, ParamValue> = Object.fromEntries(rows.map((r) => [r.key, Math.round(r.t * 1000) / 1000]));
    let verts = chain.map((c) => c.verts);
    const mark = (key: string | null): void => {   // 悬在某一行：在模型上标出那个点（Fable 11-10）
      const r = rows.find((x) => x.key === key), m = ctx.mesh(), v = r ? verts[r.i]?.[r.j] : undefined;
      ctx.setSnap(v !== undefined && m.hasV(v) ? { p: applyPt(ctx.ctxXform(), m.pt(v)), kind: "on-edge" } : null);
    };
    ctx.offerAfterthought("切割", fields, shown, nOps, (vals, restoring) => {
      const cuts = chain.map((c): Cut => ({ ...c, path: [...c.path] }));
      for (const [n, r] of rows.entries()) {
        const t = vals[r.key] === shown[r.key] ? r.t : Number(vals[r.key]);   // 没动的那几行用原来的精确值（小窗里显示的是舍入的）
        if (!(t > 0.001 && t < 0.999)) { ctx.hint(`切割：第 ${n + 1} 点拖到了边的端头上（要在 0 和 1 之间），退回原来的位置`); return false; }
        const p = cuts[r.i].path[r.j];
        if ("e" in p) cuts[r.i].path[r.j] = { e: p.e, t };
      }
      const probe = ctx.mesh().clone(), got: number[][] = [];
      try { for (const c of cuts) got.push(knife(probe, c.face, c.path)); }
      catch (err) { ctx.hint(err instanceof KnifeRefused ? `切割：按这个位置${err.message}，退回原来的位置` : "切割：按这个位置切不出来，退回原来的位置"); return false; }   // 先在副本上切一遍：切不成 = 一条都不提交（验那一道说的原因照写）
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
    if (h.vertex === undefined && h.edge === undefined) return h.face !== undefined && this.start ? this.faceAt(ctx, s, h.face) : null;   // 面里：有起点了才算（拐弯；第一个点要在点或边上）
    if (ctx.snapBase() === ctx.mods().shift) return this.freeAt(ctx, s, h);   // 吸附关着（底 XOR Shift = 关）：笔正下方那一点（2026-11-13 user）
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
  /** 面里的点 = 笔正下方那一点（不吸附，吸附开着也一样；第八节第 4 条）：射线打这张面画出来的三角形，重心坐标换回定义坐标（落在三角形上，离面 0）。 */
  private faceAt(ctx: ToolCtx, s: { x: number; y: number }, f: number): FaceHit | null {
    const m = ctx.mesh();
    if (!m.hasF(f)) return null;
    const X = ctx.ctxXform(), ps = m.facePts(f), ws = ps.map((p) => applyPt(X, p)), ray = ctx.frame().ray(s.x, s.y, ctx.vp());
    const at = (A: Pt3, B: Pt3, C: Pt3, u: number, v: number): Pt3 => ({ x: A.x + (B.x - A.x) * u + (C.x - A.x) * v, y: A.y + (B.y - A.y) * u + (C.y - A.y) * v, z: A.z + (B.z - A.z) * u + (C.z - A.z) * v });
    let best: FaceHit | null = null, bt = Infinity;
    for (const [a, b, c] of m.faceTriangles(f)) {
      const r = rayTriHit(ray.origin, ray.dir, ws[a], ws[b], ws[c]);
      if (r && r.t < bt) { bt = r.t; best = { face: f, local: at(ps[a], ps[b], ps[c], r.u, r.v), w: at(ws[a], ws[b], ws[c], r.u, r.v), kind: "on-face" }; }
    }
    return best;
  }
  /**
   * 吸附关着的落点：拾取给了边 = 那条边；只给了点 = 这个点连着的边里离笔最近的那条（屏幕上）。边上取笔正下方那一点（不拽到中点）；
   * 离两头不到 KNIFE_END_PX 个屏幕像素 = 就是那一头的点。拾取什么都没给 = null。
   */
  private freeAt(ctx: ToolCtx, s: { x: number; y: number }, h: { vertex?: number; edge?: number }): Hit | null {
    const m = ctx.mesh(), X = ctx.ctxXform(), vp = ctx.vp(), fr = ctx.frame();
    const seg = (e: number) => { const a = applyPt(X, m.pt(m.edgeA[e])), b = applyPt(X, m.pt(m.edgeB[e])); return { a, b, d: fr.distToSeg(s.x, s.y, a, b, vp) }; };
    let e = h.edge !== undefined && m.hasE(h.edge) ? h.edge : -1;
    if (e < 0 && h.vertex !== undefined && m.hasV(h.vertex)) {
      let best = Infinity;
      for (const x of m.vEdges(h.vertex)) { const d = seg(x).d.d; if (d < best) { best = d; e = x; } }
    }
    if (e < 0) return null;
    const { a, b, d } = seg(e);
    if (fr.distTo(s.x, s.y, a, vp) <= KNIFE_END_PX) return { pt: { v: m.edgeA[e] }, w: a, kind: "endpoint" };
    if (fr.distTo(s.x, s.y, b, vp) <= KNIFE_END_PX) return { pt: { v: m.edgeB[e] }, w: b, kind: "endpoint" };
    const t = Math.max(0.001, Math.min(0.999, Number.isFinite(d.t) ? d.t : 0.5));
    return { pt: { e, t }, w: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, kind: "on-edge" };
  }
}

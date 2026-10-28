// tools/mesh-knife.ts —— 自由建模工作台的刀 + 环切（网格体；K）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 §2-1 / §2½ + 纪元账本 FM10 / FM11 / FM12：
//   · 刀**要吸**（§2½「刀要吸、挪不要吸」：落点是拓扑，不吸就切出一堆差 0.1 mm 的碎边）——落点永远是光标下看得见的点或边上的点；
//   · 一下一下连着切：每两个落点之间切一刀（= 一步撤销），接着从刚切到的点往下切；Esc 收刀；两个点得在同一张面上（跨面先切到中间那条边上）；
//   · **同一条边点两下 = 环切**（FM10「ctrl r 刀双击好想法」）：沿四边形带切一圈（中线），切出来的那圈边进选区，接着移动 / 缩放；
//   · 不带 XOR（FM11「好刀不要xor」）：去边归溶解。停在面中间（悬线）还没做（网格面是简单环，悬线要另一种表示）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { knife, loopCut } from "../../mesh/ops/index.ts";
import { applyPt } from "../../scene/xform.ts";
import type { SnapKind } from "../solver.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { ViewState } from "../render3.ts";

export type KnifePoint = { v: number } | { e: number; t: number };
type Hit = { pt: KnifePoint; w: Pt3; kind: SnapKind };

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
/** 这一刀切不切得出新边：两点已经是同一条边的两端 / 边上的点挨着它自己的端点 = 切不出。 */
function cutsNothing(m: MeshKernel, a: KnifePoint, b: KnifePoint): boolean {
  if ("v" in a && "v" in b) return a.v === b.v || m.edgeOf(a.v, b.v) >= 0;
  if ("v" in a && "e" in b) return m.edgeA[b.e] === a.v || m.edgeB[b.e] === a.v;
  if ("e" in a && "v" in b) return m.edgeA[a.e] === b.v || m.edgeB[a.e] === b.v;
  return false;
}

export class MeshKnifeTool implements ToolHandler {
  readonly tool = "knife" as const;
  readonly grammar = "steps" as const;
  /** 同一处点第二下也递给工具（底座默认吞掉）：同一条边点两下 = 环切。 */
  readonly repeatTap = true;
  private start: KnifePoint | null = null;
  private startW: Pt3 | null = null;
  private hov: Hit | null = null;
  /** 这一串切开始时有没有选区（user 10-27：没选区开始 = 做完也不留选区）。 */
  private hadSel = false;

  active(): boolean { return this.start !== null; }
  cancel(): void { this.start = this.startW = null; this.hov = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshKnife: { start: this.start, hov: this.hov?.pt ?? null } }; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void {
    this.hov = this.snapAt(ctx, s);
    ctx.setSnap(this.hov ? { p: this.hov.w, kind: this.hov.kind } : null);   // 只画落点那个小标记，不高亮边（user「自由建模模式不要悬浮高亮」）
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    this.hov = this.snapAt(ctx, s);
    ctx.setSnap(this.hov ? { p: this.hov.w, kind: this.hov.kind } : null);
    if (this.hov) ctx.setCursor(this.hov.w);
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    const h = this.snapAt(ctx, ev);
    if (!h) { ctx.hint(this.start ? "切割：落在点或边上（停在面中间还没做）；Esc 收刀" : "切割：在点或边上按下开始切；同一条边点两下 = 环切"); return; }
    if (!this.start) { const sel = ctx.selection(); this.hadSel = sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0; this.start = h.pt; this.startW = h.w; ctx.setAnchor(h.w); ctx.setCursor(h.w); ctx.hint("切割：点下一个点切一刀（同一张面上的点或边）；同一条边再点一下 = 环切；Esc 收刀"); return; }
    const a = this.start, b = h.pt, m = ctx.mesh(), def = ctx.activePool().def;
    if ("e" in a && "e" in b && a.e === b.e) { this.loopCutAt(ctx, a.e); return; }
    if (cutsNothing(m, a, b)) { if ("v" in b) { this.start = b; this.startW = h.w; ctx.setAnchor(h.w); } ctx.hint("切割：这两个点之间已经有边了，从这里接着切"); return; }
    const face = commonFace(m, a, b);
    if (face === null) { ctx.hint("切割：两个点不在同一张面上（先切到中间那条边上，再接着切）"); return; }
    const probe = m.clone(), verts = knife(probe, face, [a, b]);   // 先在副本上切一遍拿新点的 id（提交 = 同一份内核 + 同一组参数 = 同一批 id）
    ctx.commitOp({ op: "meshKnife", def, face, path: [a, b] });
    this.start = { v: verts[verts.length - 1] }; this.startW = h.w;
    ctx.setAnchor(h.w);
    ctx.hint("切了一刀；接着点下一个点继续切，Esc 收刀");
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const a = this.start, h = this.hov;
    if (!a || !h) return "";
    const m = ctx.mesh(), b = h.pt;
    if ("e" in a && "e" in b && a.e === b.e) {
      if (!loopCut(m.clone(), a.e, 0.5).edges.length) return "环切：这条边两侧不是四边形，切不出一圈";
      run((c) => { loopCut(c, a.e, 0.5); });
      return "环切（松手 / 点下去 = 切）";
    }
    if (cutsNothing(m, a, b)) return "";
    const face = commonFace(m, a, b);
    if (face === null) return "不在同一张面上";
    run((c) => { knife(c, face, [a, b]); });
    return "切一刀";
  }

  viewExtras(): Partial<ViewState> { return this.startW && this.hov ? { tape: { a: this.startW, b: this.hov.w } } : {}; }

  private loopCutAt(ctx: ToolCtx, e: number): void {
    const m = ctx.mesh(), probe = m.clone(), r = loopCut(probe, e, 0.5), hadSel = this.hadSel;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    if (!r.edges.length) { ctx.hint("环切：这条边两侧不是四边形，切不出一圈"); return; }
    ctx.commitOp({ op: "meshLoopCut", def: ctx.activePool().def, edge: e, t: 0.5 });
    const k = ctx.mesh();
    if (hadSel) { ctx.setSelection({ edges: r.edges.filter((x) => k.hasE(x)) }); ctx.hint(`环切：切了一圈 ${r.edges.length} 条边${r.closed ? "（闭合）" : "（开口带）"}；这圈边在选区里，接着可以移动 / 缩放`); }
    else ctx.hint(`环切：切了一圈 ${r.edges.length} 条边${r.closed ? "（闭合）" : "（开口带）"}`);
  }

  /** 光标下看得见的点 / 边上的点（拓扑吸附，永远开）。边上的点 = 光标在这条边屏幕投影上的位置。 */
  private snapAt(ctx: ToolCtx, s: { x: number; y: number }): Hit | null {
    const c = ctx.classify(ctx.world(), ctx.pickStatic(s.x, s.y));   // 真身的拓扑（预演里那条边已经劈开了）
    if (c.kind !== "entity") return null;
    const m = ctx.mesh(), X = ctx.ctxXform(), h = c.local;
    if (h.vertex !== undefined && m.hasV(h.vertex)) return { pt: { v: h.vertex }, w: applyPt(X, m.pt(h.vertex)), kind: "endpoint" };
    if (h.edge !== undefined && m.hasE(h.edge)) {
      const a = applyPt(X, m.pt(m.edgeA[h.edge])), b = applyPt(X, m.pt(m.edgeB[h.edge])), vp = ctx.vp(), qa = ctx.frame().project?.(a, vp), qb = ctx.frame().project?.(b, vp);
      let t = 0.5;
      if (qa && qb) { const ux = qb.x - qa.x, uy = qb.y - qa.y, L2 = ux * ux + uy * uy; if (L2 > 1e-9) t = ((s.x - qa.x) * ux + (s.y - qa.y) * uy) / L2; }
      t = Math.max(0.001, Math.min(0.999, t));
      return { pt: { e: h.edge, t }, w: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t }, kind: "on-edge" };
    }
    return null;
  }
}

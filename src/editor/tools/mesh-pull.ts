// tools/mesh-pull.ts —— 自由建模工作台的「拉」（挤出；网格体）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 §2-2 + 纪元账本 FM14 / FM15 / FM25：和硬表面推拉同一个工具 id、同一套「点几下」语法；差在**总是长新几何**（= SU 推拉的 Ctrl 档）、不推断。
//   · 面：沿法向（选了几张面 = 区域一起挤、内部边不长，方向 = 法向平均），拖多少走多少（沿法向在屏幕上的投影量）；正对着面时法向投影没长度 → 按屏幕竖直方向（往上 = 往外）。
//   · 边 / 点：在过轴心、垂直于视线的平面里自由拖（FM15「点 / 边走屏幕空间；按轴键随时换方向 同意」）；方向键锁 Z = 拉墙（FM16）。
//   · 锁轴（方向键）对三种都管：沿那根轴拉。做完新长出来的东西就是选区（FM14「做完的东西留在选区里，接着挪」）：面 = 顶上那几张、边 = 新的那排边、点 = 新点。
//   · 提交 = 一条 meshExtrude（挤出 + 平移一起；重放确定：同一份内核 → 同一批新 id）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { extrudeAndOffset } from "../../mesh/ops/index.ts";
import { add3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyNormal, applyPt, invert } from "../../scene/xform.ts";
import { fmtLen } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import { meshHover } from "./mesh-transform.ts";

type Target = { faces: number[]; edges: number[]; verts: number[] };

export class MeshPullTool implements ToolHandler {
  readonly tool = "pp" as const;
  readonly grammar = "steps" as const;
  readonly lock = "axis" as const;
  private t: Target | null = null;
  private pivotW: Pt3 | null = null;
  private nW: Pt3 | null = null;     // 面的法向（世界、单位长）；边 / 点 = null
  private grabW: Pt3 | null = null;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;

  active(): boolean { return this.t !== null; }
  cancel(): void { this.t = null; this.pivotW = this.nW = this.grabW = null; this.start = this.cur = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshPull: { t: this.t, start: this.start, cur: this.cur } }; }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { meshHover(ctx, s); }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.active()) { this.commit(ctx); return; }
    const m = ctx.mesh(), sel = ctx.selection();
    let t: Target | null = null;
    if (sel.kind === "mesh" && sel.faces.size) t = { faces: [...sel.faces].filter((f) => m.hasF(f)), edges: [], verts: [] };
    else if (sel.kind === "mesh" && sel.edges.size) t = { faces: [], edges: [...sel.edges].filter((e) => m.hasE(e)), verts: [] };
    else if (sel.kind === "mesh" && sel.verts.size) t = { faces: [], edges: [], verts: [...sel.verts].filter((v) => m.hasV(v)) };
    else {
      const c = ctx.classify(ctx.live(), ctx.pick(ev.x, ev.y));
      if (c.kind === "entity") {
        const h = c.local;
        t = h.face !== undefined ? { faces: [h.face], edges: [], verts: [] } : h.edge !== undefined ? { faces: [], edges: [h.edge], verts: [] } : h.vertex !== undefined ? { faces: [], edges: [], verts: [h.vertex] } : null;
      }
    }
    if (!t || !(t.faces.length || t.edges.length || t.verts.length)) { ctx.hint("拉：先选面 / 边 / 点，或者直接在要拉的东西上按下"); return; }
    const X = ctx.ctxXform(), vs = new Set<number>();
    for (const f of t.faces) for (const v of m.faceVerts(f)) vs.add(v);
    for (const e of t.edges) { vs.add(m.edgeA[e]); vs.add(m.edgeB[e]); }
    for (const v of t.verts) vs.add(v);
    let c0 = { x: 0, y: 0, z: 0 };
    for (const v of vs) c0 = add3(c0, m.pt(v));
    this.t = t;
    this.pivotW = applyPt(X, scale3(c0, 1 / vs.size));
    if (t.faces.length) { let n = { x: 0, y: 0, z: 0 }; for (const f of t.faces) n = add3(n, m.faceNormal(f)); this.nW = len3(n) > 1e-12 ? normalize3(applyNormal(X, normalize3(n))) : null; }
    else this.nW = null;
    this.grabW = this.onPlane(ctx, ev.x, ev.y) ?? this.pivotW;
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y };
    ctx.setAnchor(this.grabW); ctx.setCursor(this.grabW);
    ctx.setHoverFace(null); ctx.setHoverEdge(null);
    ctx.hint(`拉 ${this.what()}：${t.faces.length ? "沿法向" : "在屏幕平面里"}拖着松手，或者点第二下落定（方向键锁轴：锁 Z = 拉墙）`);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (!this.active()) return;
    this.cur = { x: s.x, y: s.y };
    const p = this.onPlane(ctx, s.x, s.y);
    if (p) ctx.setCursor(p);
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const t = this.t, off = this.offsetW(ctx);
    if (!t || !off) return "";
    const offL = applyDir(invert(ctx.ctxXform()), off);
    run((m) => { extrudeAndOffset(m, t, offL); });
    return `拉 ${fmtLen(len3(off))}`;
  }

  /** 当前拖动 → 世界位移。 */
  private offsetW(ctx: ToolCtx): Pt3 | null {
    const pivot = this.pivotW, grab = this.grabW, s0 = this.start, s1 = this.cur;
    if (!pivot || !grab || !s0 || !s1) return null;
    const ax = ctx.axisLockDir(), pn = ctx.planeLockNormal(), now = this.onPlane(ctx, s1.x, s1.y) ?? grab, d = sub3(now, grab);
    if (ax) return scale3(ax, dot3(d, ax));
    if (this.nW) {
      const vp = ctx.vp(), fr = ctx.frame(), a = fr.project?.(pivot, vp), b = fr.project?.(add3(pivot, this.nW), vp);   // 法向 1 m 在屏幕上多长
      const ds = { x: s1.x - s0.x, y: s1.y - s0.y };
      if (a && b) {
        const u = { x: b.x - a.x, y: b.y - a.y }, uu = u.x * u.x + u.y * u.y;
        if (Math.sqrt(uu) >= 8) return scale3(this.nW, (ds.x * u.x + ds.y * u.y) / uu);
      }
      const up = this.onPlane(ctx, s0.x, s0.y - 1);   // 正对着面：屏幕往上 1 px = 世界多长 → 往上拖 = 往外
      const wpp = up ? len3(sub3(up, grab)) : 0;
      return scale3(this.nW, -ds.y * wpp);
    }
    return pn ? sub3(d, scale3(pn, dot3(d, pn))) : d;
  }

  private commit(ctx: ToolCtx): void {
    const t = this.t, off = this.offsetW(ctx), what = this.what();
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null);
    if (!t || !off) return;
    if (len3(off) < 1e-6) { ctx.hint("拉：没拉动（拉 0 会长出叠在一起的面，不做）"); return; }
    const offL = applyDir(invert(ctx.ctxXform()), off), def = ctx.activePool().def;
    const probe = ctx.mesh().clone(), r = extrudeAndOffset(probe, t, offL);   // 先在副本上跑一遍拿新 id（提交是同一份内核 + 同一组参数 = 同一批 id）
    ctx.commitOp({ op: "meshExtrude", def, ...(t.faces.length ? { faces: t.faces } : t.edges.length ? { edges: t.edges } : { verts: t.verts }), offset: offL });
    const m = ctx.mesh();
    if (t.faces.length) ctx.setSelection({ faces: t.faces.filter((f) => m.hasF(f)) });
    else if (t.edges.length) ctx.setSelection({ edges: t.edges.map((e) => m.edgeOf(r.newVerts.get(probe.edgeA[e])!, r.newVerts.get(probe.edgeB[e])!)).filter((e) => e >= 0) });
    else ctx.setSelection({ verts: [...r.newVerts.values()].filter((v) => m.hasV(v)) });
    ctx.hint(`拉了 ${what}（${fmtLen(len3(off))}）；新长出来的留在选区里，接着可以挪 / 缩`);
  }

  private what(): string { const t = this.t; return !t ? "" : t.faces.length ? `${t.faces.length} 张面` : t.edges.length ? `${t.edges.length} 条边` : `${t.verts.length} 个点`; }
  /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。 */
  private onPlane(ctx: ToolCtx, x: number, y: number): Pt3 | null {
    const pivot = this.pivotW;
    if (!pivot) return null;
    const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp), n = normalize3(ctx.frame().ray(ps?.x ?? x, ps?.y ?? y, vp).dir), ray = ctx.frame().ray(x, y, vp);
    return rayPlane(ray.origin, ray.dir, n, dot3(n, pivot));
  }
}

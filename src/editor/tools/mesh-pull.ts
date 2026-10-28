// tools/mesh-pull.ts —— 自由建模工作台的「挤出」（硬表面的推拉键；网格体）。created 2026-10-27 by Claude Opus 5.5
// user 10-27 深夜：「默认垂直」（边 / 点）、左柱在自由建模里叫「挤出」（「或者叫挤出也行，更标准」）；挤完要不要自动进挪 = 连击系统，user 自己想（纪元账本 FM110）。
// 设计稿 §2-2 + 纪元账本 FM14 / FM15 / FM25：和硬表面推拉同一个工具 id、同一套「点几下」语法；差在**总是长新几何**（= SU 推拉的 Ctrl 档）、不推断。
//   · 面：沿法向（选了几张面 = 区域一起挤、内部边不长，方向 = 法向平均），拖多少走多少（沿法向在屏幕上的投影量）；正对着面时法向投影没长度 → 按屏幕竖直方向（往上 = 往外）。
//   · 边 / 点：默认垂直（user 10-27 拍）——每个新点沿它源点的方向走（边界边 = 它那张面的法向、内部边 = 两侧平均、孤立的 = +Z；mesh/ops/extrude.ts extrudeNormalDirs），
//     一圈裙摆下沿 = 各自往外；拖动量沿这些方向的平均在屏幕上的投影量（抵消掉了 = 屏幕往上 = 往外）。
//   · 锁轴（方向键）对三种都管：沿那根轴拉。做完新长出来的东西就是选区（FM14「做完的东西留在选区里，接着挪」）：面 = 顶上那几张、边 = 新的那排边、点 = 新点。
//   · 提交 = 一条 meshExtrude（挤出 + 平移一起；重放确定：同一份内核 → 同一批新 id）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { extrudeAndOffset, extrudeAlongNormals, extrudeNormalDirs } from "../../mesh/ops/index.ts";
import { add3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyNormal, applyPt, invert } from "../../scene/xform.ts";
import { fmtLen } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";

type Target = { faces: number[]; edges: number[]; verts: number[] };

export class MeshPullTool implements ToolHandler {
  readonly tool = "pp" as const;
  readonly grammar = "steps" as const;
  readonly lock = "axis" as const;
  private t: Target | null = null;
  /** 按下时有没有选区（user 10-27：一开始没选区 = SU 手感，做完还是没选区、接着挑下一个「受害者」；一开始有选区才留选区）。 */
  private hadSel = false;
  private pivotW: Pt3 | null = null;
  private nW: Pt3 | null = null;     // 量拖动量的方向（世界、单位长）：面 = 法向平均；边 / 点 = 各点「垂直」方向的平均；抵消了 = null（屏幕竖直兜底）
  private alongScale = 1;            // 边 / 点：世界长度 / 本地长度（组件被缩放过时）
  private grabW: Pt3 | null = null;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;

  active(): boolean { return this.t !== null; }
  startModal(ctx: ToolCtx, s: { x: number; y: number }): boolean {   // Blender 的 G / R / S / E：光标处起手、跟着鼠标走（移动工具本身 = Blender 的 tweak，另一回事；user 10-27）
    const sel = ctx.selection();
    if (!(sel.faces.size || sel.edges.size || sel.verts.size)) return false;
    this.down(ctx, { x: s.x, y: s.y, clientX: s.x, clientY: s.y, pointerType: "mouse", shiftKey: false } as ToolPointer);
    return this.active();
  }

  cancel(): void { this.t = null; this.pivotW = this.nW = this.grabW = null; this.start = this.cur = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshPull: { t: this.t, start: this.start, cur: this.cur } }; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.active()) { this.commit(ctx); return; }
    const m = ctx.mesh(), sel = ctx.selection();
    let t: Target | null = null;
    this.hadSel = sel.kind === "mesh" && (sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0);
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
    if (!t || !(t.faces.length || t.edges.length || t.verts.length)) { ctx.hint("挤出：先选面 / 边 / 点，或者直接在要挤的东西上按下"); return; }
    const X = ctx.ctxXform(), vs = new Set<number>();
    for (const f of t.faces) for (const v of m.faceVerts(f)) vs.add(v);
    for (const e of t.edges) { vs.add(m.edgeA[e]); vs.add(m.edgeB[e]); }
    for (const v of t.verts) vs.add(v);
    let c0 = { x: 0, y: 0, z: 0 };
    for (const v of vs) c0 = add3(c0, m.pt(v));
    this.t = t;
    this.pivotW = applyPt(X, scale3(c0, 1 / vs.size));
    if (t.faces.length) { let n = { x: 0, y: 0, z: 0 }; for (const f of t.faces) n = add3(n, m.faceNormal(f)); this.nW = len3(n) > 1e-12 ? normalize3(applyNormal(X, normalize3(n))) : null; this.alongScale = 1; }
    else {
      let n = { x: 0, y: 0, z: 0 }; for (const d of extrudeNormalDirs(m, t).values()) n = add3(n, d);
      const w = len3(n) > 1e-9 ? applyDir(X, normalize3(n)) : null;
      this.nW = w && len3(w) > 1e-12 ? normalize3(w) : null; this.alongScale = w ? len3(w) || 1 : len3(applyDir(X, { x: 0, y: 0, z: 1 })) || 1;
    }
    this.grabW = this.onPlane(ctx, ev.x, ev.y) ?? this.pivotW;
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y };
    ctx.setAnchor(this.grabW); ctx.setCursor(this.grabW);
    ctx.hint(`挤出 ${this.what()}：${t.faces.length ? "沿法向" : "沿垂直方向"}拖着松手，或者点第二下落定（按住 Shift = 屏幕平面里自由拖；方向键锁轴）`);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (!this.active()) return;
    this.cur = { x: s.x, y: s.y };
    const p = this.onPlane(ctx, s.x, s.y);
    if (p) ctx.setCursor(p);
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const t = this.t, mv = this.motion(ctx);
    if (!t || !mv) return "";
    const X = ctx.ctxXform();
    if (mv.along !== undefined) { const d = mv.along / this.alongScale; run((m) => { extrudeAlongNormals(m, t, d); }); return `挤出 ${fmtLen(Math.abs(mv.along))}`; }
    const offL = applyDir(invert(X), mv.off);
    run((m) => { extrudeAndOffset(m, t, offL); });
    return `挤出 ${fmtLen(len3(mv.off))}`;
  }

  /** 当前拖动 → 世界位移（off：面、或锁了轴 / 面）或沿各点垂直方向的世界长度（along：边 / 点、没锁）。 */
  private motion(ctx: ToolCtx): { off: Pt3; along?: undefined } | { along: number; off?: undefined } | null {
    const pivot = this.pivotW, grab = this.grabW, s0 = this.start, s1 = this.cur, t = this.t;
    if (!pivot || !grab || !s0 || !s1 || !t) return null;
    const ax = ctx.axisLockDir(), pn = ctx.planeLockNormal(), now = this.onPlane(ctx, s1.x, s1.y) ?? grab, d = sub3(now, grab);
    if (ax) return { off: scale3(ax, dot3(d, ax)) };
    if (pn) return { off: sub3(d, scale3(pn, dot3(d, pn))) };
    if (ctx.mods().shift) return { off: d };   // 按住 Shift = 不锁方向、屏幕平面里自由拖（user 10-27「挤出是不是可以shift切换不锁定，屏幕空间拖拽」；Shift = 把默认的对齐反过来）
    const amt = this.amountAlong(ctx, s0, s1);
    if (t.faces.length) return this.nW ? { off: scale3(this.nW, amt) } : { off: { x: 0, y: 0, z: 0 } };
    return { along: amt };
  }
  /** 沿 nW 拖了多少（世界长度）：nW 在屏幕上的投影够长 = 拖动在它上面的分量；正对着 / 抵消了 = 屏幕往上 = 正。 */
  private amountAlong(ctx: ToolCtx, s0: { x: number; y: number }, s1: { x: number; y: number }): number {
    const pivot = this.pivotW!, grab = this.grabW!, ds = { x: s1.x - s0.x, y: s1.y - s0.y };
    if (this.nW) {
      const vp = ctx.vp(), fr = ctx.frame(), a = fr.project?.(pivot, vp), b = fr.project?.(add3(pivot, this.nW), vp);   // 方向上 1 m 在屏幕上多长
      if (a && b) { const u = { x: b.x - a.x, y: b.y - a.y }, uu = u.x * u.x + u.y * u.y; if (Math.sqrt(uu) >= 8) return (ds.x * u.x + ds.y * u.y) / uu; }
    }
    const up = this.onPlane(ctx, s0.x, s0.y - 1);   // 屏幕往上 1 px = 世界多长
    return -ds.y * (up ? len3(sub3(up, grab)) : 0);
  }

  private commit(ctx: ToolCtx): void {
    const t = this.t, mv = this.motion(ctx), what = this.what(), scaleL = this.alongScale, hadSel = this.hadSel;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null);
    if (!t || !mv) return;
    const amount = mv.along !== undefined ? Math.abs(mv.along) : len3(mv.off);
    if (amount < 1e-6) { ctx.hint("挤出：没动（挤出 0 会长出叠在一起的面，不做）"); return; }
    const def = ctx.activePool().def, sel = t.faces.length ? { faces: t.faces } : t.edges.length ? { edges: t.edges } : { verts: t.verts };
    const how = mv.along !== undefined ? { along: mv.along / scaleL } : { offset: applyDir(invert(ctx.ctxXform()), mv.off) };
    const probe = ctx.mesh().clone(), r = how.along !== undefined ? extrudeAlongNormals(probe, t, how.along) : extrudeAndOffset(probe, t, how.offset);   // 先在副本上跑一遍拿新 id（提交 = 同一份内核 + 同一组参数 = 同一批 id）
    ctx.commitOp({ op: "meshExtrude", def, ...sel, ...how });
    const m = ctx.mesh();
    if (!hadSel) { ctx.hint(`挤出了 ${what}（${fmtLen(amount)}）`); return; }   // 没选区开始的 = 做完也不留选区（SU 手感，接着点下一个）
    if (t.faces.length) ctx.setSelection({ faces: t.faces.filter((f) => m.hasF(f)) });
    else if (t.edges.length) ctx.setSelection({ edges: t.edges.map((e) => m.edgeOf(r.newVerts.get(probe.edgeA[e])!, r.newVerts.get(probe.edgeB[e])!)).filter((e) => e >= 0) });
    else ctx.setSelection({ verts: [...r.newVerts.values()].filter((v) => m.hasV(v)) });
    ctx.hint(`挤出了 ${what}（${fmtLen(amount)}）；新长出来的留在选区里，接着可以移动 / 缩放`);
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

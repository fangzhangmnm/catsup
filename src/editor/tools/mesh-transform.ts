// tools/mesh-transform.ts —— 自由建模工作台的挪 / 转 / 缩（网格体）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 ai-docs/20261027-free-modeling-sketch-review.md §2-4 / §2-5 / §2-6 / §2½ + 纪元账本 FM14 / FM17 / FM18 / FM24：
//   · 和硬表面的移动 / 旋转 / 缩放同一个工具 id、同一套「点几下」语法（steps：按下 = 起点；拖着松手或点第二下 = 落定），user「不要一个工具在不同模式下面语义和用法差太多」；
//   · 差在对齐：**不推断**（FM24「必须有永远不吸的选项，这个才是日常」）——挪 = 相对拖动，手指在哪都行，拖多少走多少（在过轴心的相机平面上量）；
//     锁轴 / 锁面复用方向键（A9）：锁轴 = 投到轴上（轴贴近视线时挪得变慢、不暴涨，FM18）；Shift = 转 15° 一档 / 缩 0.1 一档（偶尔吸 = 按住 Shift）；
//   · 目标 = 选区（点 / 边 / 面的全部点）；没选 = 按下处的点 / 边 / 面；轴心 = 目标点的平均（FM7「各工具自己管轴心」）；做完选区不变（FM14：接着挪）。
//   · 提交 = 一条 meshMove（每个点写绝对坐标）：挪 / 转 / 缩都是「改位置数组」，一条 op 一步撤销。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { add3, dot3, len3, normalize3, scale3, sub3, cross3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyPt, invert } from "../../scene/xform.ts";
import { fmtLen } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";

export type MeshXformKind = "move" | "rotate" | "scale";
/** 起点离轴心太近时缩放的参考半径（CSS px；Blender 要人先把鼠标挪开，触屏上点中的常常就是轴心）。 */
const SCALE_REF_PX = 40;
/** Shift 档：转 15°、缩 0.1。 */
const ROT_STEP = Math.PI / 12, SCALE_STEP = 0.1;

/** 悬停：没选区时高亮按下会作用的那张面 / 那条边（设计稿 §2½「操作前高亮会被作用的东西」）；有选区 = 作用于选区，不高亮。 */
export function meshHover(ctx: ToolCtx, s: { x: number; y: number }): void {
  if (ctx.hasSelection()) { ctx.setHoverFace(null); ctx.setHoverEdge(null); return; }
  const c = ctx.classify(ctx.live(), ctx.pick(s.x, s.y));
  ctx.setHoverFace(c.kind === "entity" && c.local.face !== undefined ? c.local.face : null);
  ctx.setHoverEdge(c.kind === "entity" && c.local.edge !== undefined ? c.local.edge : null);
}
/** 网格体选区 / 命中 → 点集（边 = 两端、面 = 环上的点）。 */
export function meshTargets(m: MeshKernel, sel: { verts: Iterable<number>; edges: Iterable<number>; faces: Iterable<number> }): number[] {
  const out = new Set<number>();
  for (const v of sel.verts) if (m.hasV(v)) out.add(v);
  for (const e of sel.edges) if (m.hasE(e)) { out.add(m.edgeA[e]); out.add(m.edgeB[e]); }
  for (const f of sel.faces) if (m.hasF(f)) for (const v of m.faceVerts(f)) out.add(v);
  return [...out];
}

export class MeshTransformTool implements ToolHandler {
  readonly grammar = "steps" as const;
  readonly lock = "axis" as const;
  readonly tool: MeshXformKind;
  private vids: number[] = [];
  private base = new Map<number, Pt3>();   // 按下那一刻的本地坐标
  private pivotW: Pt3 | null = null;         // 轴心（世界）
  private grabW: Pt3 | null = null;          // 按下处在过轴心的相机平面上的点（世界）
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private shift = false;
  constructor(kind: MeshXformKind) { this.tool = kind; }

  active(): boolean { return this.vids.length > 0; }
  cancel(): void { this.vids = []; this.base.clear(); this.pivotW = this.grabW = null; this.start = this.cur = null; this.shift = false; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }   // 只在网格体池里用：预演走 liveMesh
  describe(): Record<string, unknown> { return { meshXform: { kind: this.tool, verts: this.vids.length, start: this.start, cur: this.cur } }; }

  hover(ctx: ToolCtx, s: { x: number; y: number }): void { meshHover(ctx, s); }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.active()) { this.commit(ctx); return; }
    const m = ctx.mesh(), sel = ctx.selection();
    let vids: number[] = [];
    if (sel.kind === "mesh" && (sel.verts.size || sel.edges.size || sel.faces.size)) vids = meshTargets(m, sel);
    else {
      const c = ctx.classify(ctx.live(), ctx.pick(ev.x, ev.y));
      if (c.kind === "entity") vids = meshTargets(m, { verts: c.local.vertex !== undefined ? [c.local.vertex] : [], edges: c.local.edge !== undefined ? [c.local.edge] : [], faces: c.local.face !== undefined ? [c.local.face] : [] });
    }
    if (!vids.length) { ctx.hint(`${this.verb()}：先选点 / 边 / 面，或者直接在要${this.verb()}的东西上按下`); return; }
    const X = ctx.ctxXform();
    this.vids = vids; this.base.clear();
    let c0 = { x: 0, y: 0, z: 0 };
    for (const v of vids) { const p = m.pt(v); this.base.set(v, p); c0 = add3(c0, p); }
    this.pivotW = applyPt(X, scale3(c0, 1 / vids.length));
    this.grabW = this.onPlane(ctx, ev.x, ev.y) ?? this.pivotW;
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; this.shift = ev.shiftKey;
    ctx.setAnchor(this.grabW); ctx.setCursor(this.grabW);
    ctx.setHoverFace(null); ctx.setHoverEdge(null);
    ctx.hint(`${this.verb()} ${vids.length} 个点：拖着松手，或者点第二下落定（方向键锁轴 / Shift+方向键锁面${this.tool === "move" ? "" : `；按住 Shift = ${this.tool === "rotate" ? "15° 一档" : "0.1 一档"}`}）`);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (!this.active()) return;
    this.cur = { x: s.x, y: s.y };
    this.shift = ctx.mods().shift;
    const p = this.onPlane(ctx, s.x, s.y);
    if (p) ctx.setCursor(p);
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    if (!this.active()) return "";
    const r = this.solve(ctx);
    if (!r) return "";
    run((m) => { for (const [v, p] of r.moves) m.setPos(v, p); });
    return r.dims;
  }

  /** 当前拖动 → 每个点的新本地坐标 + 读数。 */
  private solve(ctx: ToolCtx): { moves: Map<number, Pt3>; dims: string } | null {
    const pivot = this.pivotW, grab = this.grabW, s0 = this.start, s1 = this.cur;
    if (!pivot || !grab || !s0 || !s1) return null;
    const X = ctx.ctxXform(), Xi = invert(X), ax = ctx.axisLockDir(), pn = ctx.planeLockNormal();
    let fW: (p: Pt3) => Pt3, dims: string;
    if (this.tool === "move") {
      const now = this.onPlane(ctx, s1.x, s1.y) ?? grab;
      let d = sub3(now, grab);
      if (ax) d = scale3(ax, dot3(d, ax));             // 锁轴：投到轴上（贴近视线 = 变慢，FM18）
      else if (pn) d = sub3(d, scale3(pn, dot3(d, pn)));   // 锁面：去掉法向分量
      fW = (p) => add3(p, d);
      dims = `挪 ${fmtLen(len3(d))}`;
    } else {
      const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp);
      if (!ps) return null;
      if (this.tool === "rotate") {
        const toCam = scale3(ctx.frame().ray(ps.x, ps.y, vp).dir, -1);
        const axis = ax ?? normalize3(toCam);
        const a0 = Math.atan2(s0.y - ps.y, s0.x - ps.x), a1 = Math.atan2(s1.y - ps.y, s1.x - ps.x);
        let th = a0 - a1;                                    // 屏幕 y 朝下：屏上逆时针 = a 变小 = 绕朝向人的轴正转
        if (dot3(axis, toCam) < 0) th = -th;
        th = Math.atan2(Math.sin(th), Math.cos(th));
        if (this.shift) th = Math.round(th / ROT_STEP) * ROT_STEP;
        const k = normalize3(axis), c = Math.cos(th), sn = Math.sin(th);
        fW = (p) => { const v = sub3(p, pivot); const r = add3(add3(scale3(v, c), scale3(cross3(k, v), sn)), scale3(k, dot3(k, v) * (1 - c))); return add3(pivot, r); };   // Rodrigues
        dims = `转 ${(th * 180 / Math.PI).toFixed(1)}°${ax ? "（锁轴）" : ""}`;
      } else {
        let d0 = { x: s0.x - ps.x, y: s0.y - ps.y };
        const L0 = Math.hypot(d0.x, d0.y);
        if (L0 < SCALE_REF_PX) d0 = L0 > 1e-6 ? { x: d0.x / L0 * SCALE_REF_PX, y: d0.y / L0 * SCALE_REF_PX } : { x: SCALE_REF_PX, y: 0 };
        const o = { x: s0.x - d0.x, y: s0.y - d0.y };      // 起点离轴心太近：在起点后面 40 px 立一个虚轴心（往外拖 = 放大）
        let f = Math.hypot(s1.x - o.x, s1.y - o.y) / Math.hypot(d0.x, d0.y);
        if (this.shift) f = Math.round(f / SCALE_STEP) * SCALE_STEP;
        if (ax) fW = (p) => { const v = sub3(p, pivot); return add3(p, scale3(ax, dot3(v, ax) * (f - 1))); };   // 只沿这根轴（S Z 0 = 压平）
        else if (pn) fW = (p) => { const v = sub3(p, pivot), vn = scale3(pn, dot3(v, pn)); return add3(pivot, add3(vn, scale3(sub3(v, vn), f))); };   // 只在面内
        else fW = (p) => add3(pivot, scale3(sub3(p, pivot), f));
        dims = `缩 ×${f.toFixed(3)}${ax ? "（锁轴）" : pn ? "（锁面）" : ""}`;
      }
    }
    const moves = new Map<number, Pt3>();
    for (const [v, p] of this.base) moves.set(v, applyPt(Xi, fW(applyPt(X, p))));
    return { moves, dims };
  }

  private commit(ctx: ToolCtx): void {
    const r = this.solve(ctx), n = this.vids.length, verb = this.verb();
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null);
    if (!r) return;
    const moves = [...r.moves].filter(([v, p]) => { const b = ctx.mesh().pt(v); return b.x !== p.x || b.y !== p.y || b.z !== p.z; }).map(([v, to]) => ({ v, to }));
    if (!moves.length) { ctx.hint(`${verb}：没动`); return; }
    ctx.commitOp({ op: "meshMove", def: ctx.activePool().def, moves });
    ctx.hint(`${verb}了 ${n} 个点（${r.dims}）`);
  }

  private verb(): string { return this.tool === "move" ? "挪" : this.tool === "rotate" ? "转" : "缩"; }
  /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。不用 pick.ts cameraPlane：那个是「最朝向镜头的轴平面」（SU 画图用），等轴视角下是地面，锁 Z 就挪不动了。 */
  private onPlane(ctx: ToolCtx, x: number, y: number): Pt3 | null {
    const pivot = this.pivotW;
    if (!pivot) return null;
    const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp), n = normalize3(ctx.frame().ray(ps?.x ?? x, ps?.y ?? y, vp).dir), ray = ctx.frame().ray(x, y, vp);
    return rayPlane(ray.origin, ray.dir, n, dot3(n, pivot));
  }
}


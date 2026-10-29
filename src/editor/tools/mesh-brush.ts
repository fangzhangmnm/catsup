// tools/mesh-brush.ts —— 软编辑笔刷（自由建模，网格体）：抓 / 鼓起 / 抹平 / 压平。created 2026-10-29 by Claude Opus 5.5
// 纪元账本 UX53（user 10-28 夜「3 和沿法向移动的几个不同的软编辑擦边sculpt的笔刷居然忘了做」）→ 方案甲（和自由建模放一起，左柱「笔刷 ▾」小三角）
// → user「笔刷小三角同意。然后算是自动折叠的不是常驻的」（放在左柱折叠组里，用过才长出来）。
// 是什么：在光标下按住刮，不用先选；半径 = 左栏 dial 那根滑条（和软选择共用，屏幕像素，按下处换成世界长度）；衰减 = 软选择同一条（mesh/soft-select.ts softFalloff）。
//   · 抓（grab）：按下那一刻半径里的点按衰减跟着手走（在过按下处、正对镜头的平面上拖）。
//   · 鼓起（draw）：沿每个点自己的法向往外推；按住 Ctrl（复制键）= 反过来压进去。
//   · 抹平（smooth）：每个点往它邻点的平均位置拉（Laplacian）。任何一把按住 Shift = 临时抹平（Blender 同款）。
//   · 压平（flatten）：压到这一片（半径里的点按衰减加权）的平均面上。
// 鼓起 / 抹平 / 压平是「刷」：沿着拖过的路每隔 ¼ 半径点一下（dab），一下的量 = 力度（工具条）× 衰减；快拖慢拖一样多。
// 提交 = 松手一条 meshMove（每个碰过的点写绝对坐标）= 一步撤销；镜像编辑 / 强行对称照常走 commitIn 的 mirrorRewrite（预演不画镜像那半）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { add3, cross3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyPt, invert } from "../../scene/xform.ts";
import { softFalloff } from "../../mesh/soft-select.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

export type BrushKind = "grab" | "draw" | "smooth" | "flatten";
const TOOL = { grab: "brushGrab", draw: "brushDraw", smooth: "brushSmooth", flatten: "brushFlatten" } as const;
const LABEL: Readonly<Record<BrushKind, string>> = { grab: "抓", draw: "鼓起", smooth: "抹平", flatten: "压平" };
/** 刷的间距（半径的几分之一；量纲：比例）；鼓起一下推多远（半径 × 力度 × 这个；量纲：比例）。 */
const DAB_SPACING = 0.25, DRAW_RATE = 0.06;

export class MeshBrushTool implements ToolHandler {
  readonly grammar = "direct" as const;
  readonly tool: (typeof TOOL)[BrushKind];
  private readonly kind: BrushKind;
  constructor(kind: BrushKind) { this.kind = kind; this.tool = TOOL[kind]; }   // 不用参数属性（node 去类型跑单测不认）
  /** 一笔：碰过的点现在的位置（本地）+ 按下前的位置；邻接（抹平用）；上一个 dab 的屏幕点。 */
  private stroke: { pos: Map<number, Pt3>; base: Map<number, Pt3>; adj: Map<number, number[]> | null; last: { x: number; y: number }; dabs: number } | null = null;
  /** 抓：按下那一刻的点（本地）+ 权重；拖的平面（世界：过按下处、法向 = 视线）；按下处（世界）。 */
  private grab: { set: Map<number, { p0: Pt3; w: number }>; planeN: Pt3; startW: Pt3 } | null = null;

  active(): boolean { return this.stroke !== null; }
  cancel(): void { this.stroke = null; this.grab = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshBrush: { kind: this.kind, touched: this.stroke?.pos.size ?? 0, dabs: this.stroke?.dabs ?? 0 } }; }

  /** 悬停：光标处画笔刷圈（和软选择半径同一个圈）。 */
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.softRing({ x: s.x, y: s.y, r: ctx.config.get("soft", "radius") }); }

  private posOf(m: MeshKernel, v: number): Pt3 { return this.stroke?.pos.get(v) ?? m.pt(v); }
  /** 光标打在网格体哪一点（本地坐标）+ 那张面的法向（本地）+ 半径换成本地长度。打不到 = null。 */
  private hit(ctx: ToolCtx, x: number, y: number): { p: Pt3; n: Pt3; R: number } | null {
    const h = ctx.pick(x, y, { kinds: { verts: false, edges: false, faces: true } }), c = ctx.classify(ctx.world(), h);
    if (c.kind !== "entity" || c.local.face === undefined) return null;
    const m = ctx.mesh(), f = c.local.face;
    if (!m.hasF(f)) return null;
    const X = ctx.ctxXform(), Xi = invert(X), ray = ctx.frame().ray(x, y, ctx.vp()), o = applyPt(Xi, ray.origin), d = applyDir(Xi, ray.dir);
    const ring = m.faceVerts(f).map((v) => this.posOf(m, v));
    let best: { t: number; n: Pt3 } | null = null;
    for (let i = 1; i + 1 < ring.length; i++) {   // 扇形三角化（不平的面也按真三角形打）
      const a = ring[0], e1 = sub3(ring[i], a), e2 = sub3(ring[i + 1], a), pv = cross3(d, e2), det = dot3(e1, pv);
      if (Math.abs(det) < 1e-14) continue;
      const tv = sub3(o, a), u = dot3(tv, pv) / det; if (u < -1e-6 || u > 1 + 1e-6) continue;
      const qv = cross3(tv, e1), w = dot3(d, qv) / det; if (w < -1e-6 || u + w > 1 + 1e-6) continue;
      const t = dot3(e2, qv) / det;
      if (t > 0 && (!best || t < best.t)) best = { t, n: normalize3(cross3(e1, e2)) };
    }
    if (!best) return null;
    const p = add3(o, scale3(d, best.t));
    // 半径：屏幕像素 → 打中那一点处的世界长度 → 本地长度
    const pw = applyPt(X, p), ps = ctx.frame().project?.(pw, ctx.vp());
    if (!ps) return null;
    const r1 = ctx.frame().ray(ps.x + 1, ps.y, ctx.vp()), vn = normalize3(ray.dir), q = rayPlane(r1.origin, r1.dir, vn, dot3(vn, pw));
    const wpp = q ? len3(sub3(q, pw)) : 0, sL = len3(applyDir(Xi, { x: 1, y: 0, z: 0 })) || 1;
    return { p, n: best.n, R: ctx.config.get("soft", "radius") * wpp * sL };
  }
  /** 半径里的点（按现在的位置量）和它们的衰减权重。 */
  private within(m: MeshKernel, c: Pt3, R: number): Map<number, number> {
    const out = new Map<number, number>();
    if (!(R > 0)) return out;
    for (const v of m.verts()) { const d = len3(sub3(this.posOf(m, v), c)); if (d < R) out.set(v, softFalloff(d, R)); }
    return out;
  }
  /** 点的法向（本地）：连着的面的法向按现在的位置算、平均。 */
  private vNormal(m: MeshKernel, v: number): Pt3 {
    let acc = { x: 0, y: 0, z: 0 };
    const seen = new Set<number>();
    for (const e of m.vEdges(v)) for (const f of m.eFaces(e)) {
      if (seen.has(f)) continue; seen.add(f);
      const ps = m.faceVerts(f).map((u) => this.posOf(m, u));
      let n = { x: 0, y: 0, z: 0 };
      for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length]; n = add3(n, { x: (a.y - b.y) * (a.z + b.z), y: (a.z - b.z) * (a.x + b.x), z: (a.x - b.x) * (a.y + b.y) }); }   // Newell
      acc = add3(acc, n);
    }
    return len3(acc) > 1e-12 ? normalize3(acc) : { x: 0, y: 0, z: 1 };
  }
  private set(m: MeshKernel, v: number, p: Pt3): void { const s = this.stroke!; if (!s.base.has(v)) s.base.set(v, m.pt(v)); s.pos.set(v, p); }

  /** 刷一下（鼓起 / 抹平 / 压平）：以 c 为心、R 为半径。 */
  private dab(ctx: ToolCtx, h: { p: Pt3; n: Pt3; R: number }): void {
    const m = ctx.mesh(), s = this.stroke!, strength = Number(ctx.config.get("brush", "strength")) || 0.5;
    const kind: BrushKind = ctx.mods().shift ? "smooth" : this.kind, w = this.within(m, h.p, h.R);
    if (!w.size) return;
    s.dabs++;
    if (kind === "draw") {
      const sign = ctx.mods().copy ? -1 : 1, step = sign * DRAW_RATE * strength * h.R;
      const next = [...w].map(([v, wt]) => [v, add3(this.posOf(m, v), scale3(this.vNormal(m, v), step * wt))] as const);
      for (const [v, p] of next) this.set(m, v, p);
    } else if (kind === "smooth") {
      if (!s.adj) { s.adj = new Map(); for (const v of m.verts()) s.adj.set(v, [...m.vEdges(v)].map((e) => (m.edgeA[e] === v ? m.edgeB[e] : m.edgeA[e]))); }
      const next = [...w].map(([v, wt]) => {
        const nb = s.adj!.get(v) ?? [], p = this.posOf(m, v);
        if (!nb.length) return [v, p] as const;
        let avg = { x: 0, y: 0, z: 0 }; for (const u of nb) avg = add3(avg, this.posOf(m, u)); avg = scale3(avg, 1 / nb.length);
        return [v, add3(p, scale3(sub3(avg, p), Math.min(1, strength * wt)))] as const;
      });
      for (const [v, p] of next) this.set(m, v, p);   // 先全算完再写（Jacobi：不受遍历顺序影响）
    } else if (kind === "flatten") {
      let c = { x: 0, y: 0, z: 0 }, n = { x: 0, y: 0, z: 0 }, sw = 0;
      for (const [v, wt] of w) { c = add3(c, scale3(this.posOf(m, v), wt)); n = add3(n, scale3(this.vNormal(m, v), wt)); sw += wt; }
      if (sw < 1e-12 || len3(n) < 1e-12) return;
      c = scale3(c, 1 / sw); n = normalize3(n);
      for (const [v, wt] of w) { const p = this.posOf(m, v), off = dot3(sub3(p, c), n); this.set(m, v, sub3(p, scale3(n, off * Math.min(1, strength * wt)))); }
    }
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    this.cancel();
    const h = this.hit(ctx, ev.x, ev.y);
    if (!h) { ctx.hint(`${LABEL[this.kind]}：按在网格体的面上刮（半径 = 左边那根滑条，[ ] 也能调）`); return; }
    this.stroke = { pos: new Map(), base: new Map(), adj: null, last: { x: ev.x, y: ev.y }, dabs: 0 };
    ctx.softRing({ x: ev.x, y: ev.y, r: ctx.config.get("soft", "radius") });
    if (this.kind === "grab" && !ctx.mods().shift) {
      const m = ctx.mesh(), X = ctx.ctxXform(), set = new Map<number, { p0: Pt3; w: number }>();
      for (const [v, w] of this.within(m, h.p, h.R)) set.set(v, { p0: m.pt(v), w });
      const vp = ctx.vp(), fwd = ctx.frame().ray(vp.w / 2, vp.h / 2, vp).dir;   // 正对镜头的平面（画面正中那条视线 = 镜头朝向；Blender 抓同款）：透视下也只在屏幕里挪、不往深处跑
      this.grab = { set, planeN: normalize3(fwd), startW: applyPt(X, h.p) };
      ctx.hint(`抓：${set.size} 个点跟着走（离得越远跟得越少）`);
      return;
    }
    this.dab(ctx, h);
    ctx.hint(`${ctx.mods().shift ? "抹平（Shift）" : LABEL[this.kind]}：按住刮${this.kind === "draw" ? "；Ctrl = 反过来压进去" : ""}${this.kind !== "smooth" ? "；Shift = 临时抹平" : ""}`);
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    const st = this.stroke;
    if (!st) return;
    ctx.softRing({ x: s.x, y: s.y, r: ctx.config.get("soft", "radius") });
    if (this.grab) {
      const g = this.grab, ray = ctx.frame().ray(s.x, s.y, ctx.vp()), q = rayPlane(ray.origin, ray.dir, g.planeN, dot3(g.planeN, g.startW));
      if (!q) return;
      const dL = applyDir(invert(ctx.ctxXform()), sub3(q, g.startW)), m = ctx.mesh();
      for (const [v, { p0, w }] of g.set) this.set(m, v, add3(p0, scale3(dL, w)));
      return;
    }
    // 沿拖过的路每隔 ¼ 半径（屏幕）刷一下
    const rPx = ctx.config.get("soft", "radius"), gap = Math.max(2, DAB_SPACING * rPx), dx = s.x - st.last.x, dy = s.y - st.last.y, dist = Math.hypot(dx, dy);
    if (dist < gap) return;
    const n = Math.floor(dist / gap);
    for (let i = 1; i <= n; i++) { const p = { x: st.last.x + dx * (i * gap / dist), y: st.last.y + dy * (i * gap / dist) }, h = this.hit(ctx, p.x, p.y); if (h) this.dab(ctx, h); }
    st.last = { x: st.last.x + dx * (n * gap / dist), y: st.last.y + dy * (n * gap / dist) };
  }
  liveMesh(_ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const st = this.stroke;
    if (!st || !st.pos.size) return "";
    run((m) => { for (const [v, p] of st.pos) m.setPos(v, p); });
    return `${LABEL[this.kind]}：动了 ${st.pos.size} 个点`;
  }
  up(ctx: ToolCtx, _ev: ToolPointer, _settle: () => ToolSample | null): void {
    const st = this.stroke;
    this.cancel();
    if (!st) return;
    const moves = [...st.pos].filter(([v, p]) => { const b = st.base.get(v)!; return len3(sub3(p, b)) > 1e-12; }).map(([v, to]) => ({ v, to }));
    if (!moves.length) { ctx.hint(`${LABEL[this.kind]}：这一笔没动到点（半径里没有点？把左边滑条调大，或靠近点）`); return; }
    ctx.commitOp({ op: "meshMove", def: ctx.activePool().def, moves });
    ctx.hint(`${LABEL[this.kind]}：动了 ${moves.length} 个点（一步撤销）`);
  }
}

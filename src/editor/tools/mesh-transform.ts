// tools/mesh-transform.ts —— 自由建模工作台的挪 / 转 / 缩（网格体）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 ai-docs/20261027-free-modeling-sketch-review.md §2-4 / §2-5 / §2-6 / §2½ + 纪元账本 FM14 / FM17 / FM18 / FM24：
//   · 和硬表面的移动 / 旋转 / 缩放同一个工具 id、同一套「点几下」语法（steps：按下 = 起点；拖着松手或点第二下 = 落定），user「不要一个工具在不同模式下面语义和用法差太多」；
//   · 差在对齐：**不推断**（FM24「必须有永远不吸的选项，这个才是日常」）——挪 = 相对拖动，手指在哪都行，拖多少走多少（在过轴心的相机平面上量）；
//     锁轴 / 锁面复用方向键（A9）：锁轴 = 投到轴上（轴贴近视线时挪得变慢、不暴涨，FM18）；
//     **挪按住 Shift = 开吸附**（user 10-27「shift挪就是开吸附啊，也不一定是点。点>线>面，就是控制吸附开关」）：抓住的那个点落到光标下的点 > 边 > 面上（被挪的不算）；
//     转 / 缩按住 Shift = 15° / 0.1 一档；
//   · 目标 = 选区（点 / 边 / 面的全部点）；没选 = 按下处的点 / 边 / 面，按在空处 = 拖框（2026-10-28，selecting.ts）；点一下 = 选（同选择工具）；轴心 = 目标点的平均（FM7「各工具自己管轴心」）；做完选区不变（FM14：接着挪）。
//   · 提交 = 一条 meshMove（每个点写绝对坐标）：挪 / 转 / 缩都是「改位置数组」，一条 op 一步撤销。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { SnapKind } from "../solver.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { add3, dot3, len3, normalize3, scale3, sub3, cross3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyPt, invert } from "../../scene/xform.ts";
import { extrudeNormalDirs, selectionVerts } from "../../mesh/ops/index.ts";
import { fmtLen } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import { BoxDrag, adoptPress, clickSelect, pressTarget, type Target } from "./selecting.ts";

export type MeshXformKind = "move" | "rotate" | "scale" | "normal";   // normal = 沿法线移动（Blender Shrink / Fatten；工具 id shrink）
/** 起点离轴心太近时缩放的参考半径（CSS px；Blender 要人先把鼠标挪开，触屏上点中的常常就是轴心）。 */
const SCALE_REF_PX = 40;
/** Shift 档：转 15°、缩 0.1。 */
const ROT_STEP = Math.PI / 12, SCALE_STEP = 0.1;

// 悬停不高亮（user 10-27「自由建模模式不要悬浮高亮」）：自由建模的工具都不写 hover。
export class MeshTransformTool implements ToolHandler {
  readonly grammar = "steps" as const;
  readonly lock = "axis" as const;
  readonly tool: "move" | "rotate" | "scale" | "shrink";
  private readonly kind: MeshXformKind;
  /** 沿法线：每个点自己的方向（本地，单位长；点 = 连着的面的法向平均）。 */
  private dirs = new Map<number, Pt3>();
  private vids: number[] = [];
  /** 按在选区外的东西上：落定时选区换成它（selecting.ts adoptPress；账本 UX30）。 */
  private adopt: Target["adopt"] | null = null;
  private base = new Map<number, Pt3>();   // 按下那一刻的本地坐标
  private pivotW: Pt3 | null = null;         // 轴心（世界）
  private grabW: Pt3 | null = null;          // 按下处在过轴心的相机平面上的点（世界）
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private shift = false;
  private handleW: Pt3 | null = null;        // 挪：抓住的那个点（目标里离按下处最近的点，世界）——吸附时是它落到目标上
  private snapT: { p: Pt3; kind: SnapKind } | null = null;
  /** 手势中打的数是什么量（Blender「S Z 0」：缩放 = 倍数、旋转 = 角度、移动 / 沿法线 = 长度；读法 = units.ts，工具只问 ctx.typed()）。 */
  readonly typedQuantity: { q: "length" | "angle" | "factor" };
  constructor(kind: MeshXformKind) { this.kind = kind; this.tool = kind === "normal" ? "shrink" : kind; this.typedQuantity = { q: kind === "rotate" ? "angle" : kind === "scale" ? "factor" : "length" }; }
  /** 没选区又按在空处 = 拖框（「会选的工具」，selecting.ts）。 */
  private box = new BoxDrag();
  tap(ctx: ToolCtx, ev: ToolPointer): void { clickSelect(ctx, ev, ctx.clicks()); ctx.hint(null); }   // 点一下 = 选（和选择工具同一套）；只有拖才是操作（user 10-27）

  active(): boolean { return this.vids.length > 0 || this.box.active(); }
  startModal(ctx: ToolCtx, s: { x: number; y: number }): boolean {   // Blender 的 G / R / S / E：光标处起手、跟着鼠标走（移动工具本身 = Blender 的 tweak，另一回事；user 10-27）
    const sel = ctx.selection();
    if (!(sel.faces.size || sel.edges.size || sel.verts.size)) return false;
    this.down(ctx, { x: s.x, y: s.y, clientX: s.x, clientY: s.y, pointerType: "mouse", shiftKey: false } as ToolPointer);
    return this.active();
  }

  cancel(): void { this.box.cancel(); this.vids = []; this.adopt = null; this.base.clear(); this.pivotW = this.grabW = this.handleW = null; this.start = this.cur = null; this.shift = false; this.snapT = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }   // 只在网格体池里用：预演走 liveMesh
  describe(): Record<string, unknown> { return { meshXform: { kind: this.tool, verts: this.vids.length, start: this.start, cur: this.cur } }; }


  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.box.active()) { this.box.finish(ctx, ev); return; }   // 拖框松手
    if (this.active()) { this.commit(ctx); return; }
    const m = ctx.mesh(), sel = ctx.selection(), t = pressTarget(ctx, ev, this.tool);   // 选区 > 按下处的点 / 边 / 面 > 空处拖框（selecting.ts）
    if (t === "box") { this.box.begin(ev, ctx); ctx.hint(`框选（${this.verb()}工具里：没选东西时在空处拖 = 框）`); return; }   // user 10-28「move的时候在没选择的时候能不能拖框」
    const vids = selectionVerts(m, t);
    if (!vids.length) { ctx.hint(`${this.verb()}：选区里没有能${this.verb()}的点`); return; }
    const X = ctx.ctxXform();
    this.vids = vids; this.adopt = t.adopt ?? null; this.base.clear(); this.dirs = new Map();
    if (this.kind === "normal") {   // 选了面 = 每个点只看选中的面（选一张顶面 = 直直往上，Blender Shrink / Fatten 同）；只选了边 / 点 = 看连着的全部面（一圈环 = 各自往外胖）
      const selF = sel.kind === "mesh" ? [...sel.faces].filter((f) => m.hasF(f)) : [];
      if (selF.length) {
        const acc = new Map<number, Pt3>();
        for (const f of selF) { const n = m.faceNormal(f); for (const v of m.faceVerts(f)) { const a = acc.get(v) ?? { x: 0, y: 0, z: 0 }; acc.set(v, add3(a, n)); } }
        for (const v of vids) { const a = acc.get(v); this.dirs.set(v, a && len3(a) > 1e-12 ? normalize3(a) : { x: 0, y: 0, z: 1 }); }
      } else this.dirs = extrudeNormalDirs(m, { verts: vids });
    }
    let c0 = { x: 0, y: 0, z: 0 };
    for (const v of vids) { const p = m.pt(v); this.base.set(v, p); c0 = add3(c0, p); }
    this.pivotW = applyPt(X, scale3(c0, 1 / vids.length));
    this.grabW = this.onPlane(ctx, ev.x, ev.y) ?? this.pivotW;
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y }; this.shift = ev.shiftKey;
    { const vp = ctx.vp(); let best = Infinity; for (const [, p] of this.base) { const w = applyPt(X, p), q = ctx.frame().project?.(w, vp); const d = q ? Math.hypot(q.x - ev.x, q.y - ev.y) : Infinity; if (d < best) { best = d; this.handleW = w; } } }
    ctx.setAnchor(this.grabW); ctx.setCursor(this.grabW);
    ctx.hint(`${this.verb()} ${vids.length} 个点：拖着松手，或者点第二下落定（方向键锁轴 / Shift+方向键锁面；按住 Shift = ${this.kind === "move" ? "吸附：点 > 边 > 面" : this.kind === "rotate" ? "15° 一档" : "0.1 一档"}）`);
  }

  track(ctx: ToolCtx, s: { x: number; y: number }): void {
    if (this.box.track(ctx, s) || !this.active()) return;
    this.cur = { x: s.x, y: s.y };
    this.shift = ctx.mods().shift;
    const p = this.onPlane(ctx, s.x, s.y);
    if (p) ctx.setCursor(p);
    this.snapT = this.kind === "move" && this.shift ? this.snapTarget(ctx, s) : null;
    ctx.setSnap(this.snapT ? { p: this.snapT.p, kind: this.snapT.kind } : null);
  }

  /** 挪的吸附目标（Shift）：光标吸附圈里最近的点 > 边上最近的点 > 光标射线打到的面；被挪的点、连着它们的边 / 面不算。O(网格)，几千面以内每帧零点几毫秒。 */
  private snapTarget(ctx: ToolCtx, s: { x: number; y: number }): { p: Pt3; kind: SnapKind } | null {
    const m = ctx.mesh(), X = ctx.ctxXform(), vp = ctx.vp(), fr = ctx.frame(), R = ctx.snapPx(), moving = this.base;
    const scr = new Map<number, { x: number; y: number } | null>(), W = new Map<number, Pt3>();
    const w = (v: number): Pt3 => { let p = W.get(v); if (!p) { p = applyPt(X, m.pt(v)); W.set(v, p); } return p; };
    const sp = (v: number): { x: number; y: number } | null => { if (!scr.has(v)) scr.set(v, fr.project?.(w(v), vp) ?? null); return scr.get(v)!; };
    let best: { p: Pt3; kind: SnapKind } | null = null, bd = R;
    for (const v of m.verts()) { if (moving.has(v)) continue; const q = sp(v); if (!q) continue; const d = Math.hypot(q.x - s.x, q.y - s.y); if (d <= bd) { bd = d; best = { p: w(v), kind: "endpoint" }; } }
    const F = ctx.contextFrame(), qo = fr.project?.(F.origin, vp);   // 原点也是「点」（user 10-27「点（包括原点）-线（包括轴）-面」）
    if (qo) { const d = Math.hypot(qo.x - s.x, qo.y - s.y); if (d <= bd) { bd = d; best = { p: F.origin, kind: "origin" }; } }
    if (best) return best;
    { const ray = fr.ray(s.x, s.y, vp);   // 三根轴也是「线」：光标射线离轴线最近的那一点，投到屏幕上在吸附圈里
      for (const [ax, kind] of [[F.x, "axis-x"], [F.y, "axis-y"], [F.z, "axis-z"]] as const) {
        const u = normalize3(ax), w0 = sub3(F.origin, ray.origin), b = dot3(u, ray.dir), cc = dot3(ray.dir, ray.dir), dd = dot3(u, w0), ee = dot3(ray.dir, w0), den = cc - b * b;
        if (den < 1e-9) continue;
        const t = (b * ee - cc * dd) / den, p = add3(F.origin, scale3(u, t)), q = fr.project?.(p, vp);
        if (!q) continue;
        const d = Math.hypot(q.x - s.x, q.y - s.y);
        if (d <= bd) { bd = d; best = { p, kind }; }
      }
    }
    for (const e of m.edges()) {
      const a = m.edgeA[e], b = m.edgeB[e];
      if (moving.has(a) || moving.has(b)) continue;
      const qa = sp(a), qb = sp(b); if (!qa || !qb) continue;
      const ux = qb.x - qa.x, uy = qb.y - qa.y, L2 = ux * ux + uy * uy; if (L2 < 1e-9) continue;
      const u = Math.max(0, Math.min(1, ((s.x - qa.x) * ux + (s.y - qa.y) * uy) / L2)), d = Math.hypot(qa.x + ux * u - s.x, qa.y + uy * u - s.y);
      if (d <= bd) { bd = d; const pa = w(a), pb = w(b); best = { p: add3(pa, scale3(sub3(pb, pa), u)), kind: "on-edge" }; }
    }
    if (best) return best;
    const ray = fr.ray(s.x, s.y, vp), { tris, faceOfTri } = m.triangles();
    let bt = Infinity;
    for (let i = 0; i < faceOfTri.length; i++) {
      const A = tris[3 * i], B = tris[3 * i + 1], C = tris[3 * i + 2];
      if (moving.has(A) || moving.has(B) || moving.has(C) || m.isFaceHidden(faceOfTri[i])) continue;
      const t = rayTri(ray.origin, ray.dir, w(A), w(B), w(C));
      if (t !== null && t < bt) bt = t;
    }
    return Number.isFinite(bt) ? { p: add3(ray.origin, scale3(ray.dir, bt)), kind: "on-face" } : null;
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    if (!this.vids.length) return "";
    const r = this.solve(ctx);
    if (!r) return "";
    run((m) => { for (const [v, p] of r.moves) m.setPos(v, p); });
    return r.dims;
  }

  /** 当前拖动 → 每个点的新本地坐标 + 读数。 */
  private solve(ctx: ToolCtx): { moves: Map<number, Pt3>; dims: string } | null {
    const pivot = this.pivotW, grab = this.grabW, s0 = this.start, s1 = this.cur;
    if (!pivot || !grab || !s0 || !s1) return null;
    const X = ctx.ctxXform(), Xi = invert(X), ax = ctx.axisLockDir(), pn = ctx.planeLockNormal(), typed = ctx.typed(), tag = typed !== null ? "（打的数）" : "";
    let fW: (p: Pt3) => Pt3, dims: string;
    if (this.kind === "normal") {   // 沿法线：离轴心（屏幕）远了 = 胖、近了 = 瘦（Blender Alt+S 同手感）；每个点沿自己的法向走同样长
      const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp);
      if (!ps) return null;
      let d0 = { x: s0.x - ps.x, y: s0.y - ps.y };
      const L0 = Math.hypot(d0.x, d0.y);
      if (L0 < SCALE_REF_PX) d0 = L0 > 1e-6 ? { x: d0.x / L0 * SCALE_REF_PX, y: d0.y / L0 * SCALE_REF_PX } : { x: SCALE_REF_PX, y: 0 };
      const o = { x: s0.x - d0.x, y: s0.y - d0.y }, px = Math.hypot(s1.x - o.x, s1.y - o.y) - Math.hypot(d0.x, d0.y);
      const a = this.onPlane(ctx, ps.x, ps.y), b = this.onPlane(ctx, ps.x + 1, ps.y), wpp = a && b ? len3(sub3(b, a)) : 0;
      const tW = typed ?? px * wpp, sL = len3(applyDir(Xi, { x: 1, y: 0, z: 0 })) || 1, tL = tW * sL;
      const moves = new Map<number, Pt3>();
      for (const [v, p] of this.base) { const d = this.dirs.get(v) ?? { x: 0, y: 0, z: 1 }; moves.set(v, add3(p, scale3(d, tL))); }
      return { moves, dims: `沿法线 ${tW >= 0 ? "+" : "−"}${fmtLen(Math.abs(tW))}${tag}` };
    }
    if (this.kind === "move") {
      const now = this.onPlane(ctx, s1.x, s1.y) ?? grab;
      let d = this.snapT && this.handleW ? sub3(this.snapT.p, this.handleW) : sub3(now, grab);   // 吸附：抓住的点落到目标上
      if (ax) d = scale3(ax, dot3(d, ax));             // 锁轴：投到轴上（贴近视线 = 变慢，FM18）
      else if (pn) d = sub3(d, scale3(pn, dot3(d, pn)));   // 锁面：去掉法向分量
      if (typed !== null) {   // 打了数 = 沿锁着的轴走这么长；没锁 = 沿目前拖出来的方向（锁面 = 面内那个方向）；还没方向 = 等你锁轴或拖一下
        const dir = ax ?? (len3(d) > 1e-9 ? normalize3(d) : null);
        if (!dir) return { moves: new Map(this.base), dims: `打数 ${fmtLen(Math.abs(typed))}：先锁一个轴（X / Y / Z）或者拖出个方向` };
        d = scale3(dir, typed);
      }
      fW = (p) => add3(p, d);
      dims = `移动 ${fmtLen(len3(d))}${tag}${this.snapT ? `（吸到${this.snapT.kind === "endpoint" ? "点" : this.snapT.kind === "origin" ? "原点" : this.snapT.kind === "on-edge" ? "边" : this.snapT.kind.startsWith("axis-") ? `${this.snapT.kind.slice(5).toUpperCase()} 轴` : "面"}上）` : ""}`;
    } else {
      const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp);
      if (!ps) return null;
      if (this.kind === "rotate") {
        const toCam = scale3(ctx.frame().ray(ps.x, ps.y, vp).dir, -1);
        const axis = ax ?? normalize3(toCam);
        const a0 = Math.atan2(s0.y - ps.y, s0.x - ps.x), a1 = Math.atan2(s1.y - ps.y, s1.x - ps.x);
        let th = a0 - a1;                                    // 屏幕 y 朝下：屏上逆时针 = a 变小 = 绕朝向人的轴正转
        if (dot3(axis, toCam) < 0) th = -th;
        th = Math.atan2(Math.sin(th), Math.cos(th));
        if (this.shift) th = Math.round(th / ROT_STEP) * ROT_STEP;
        if (typed !== null) th = typed;   // 打的角度（弧度；绕锁着的轴 / 视线）
        const k = normalize3(axis), c = Math.cos(th), sn = Math.sin(th);
        fW = (p) => { const v = sub3(p, pivot); const r = add3(add3(scale3(v, c), scale3(cross3(k, v), sn)), scale3(k, dot3(k, v) * (1 - c))); return add3(pivot, r); };   // Rodrigues
        dims = `旋转 ${(th * 180 / Math.PI).toFixed(1)}°${ax ? "（锁轴）" : ""}${tag}`;
      } else {
        let d0 = { x: s0.x - ps.x, y: s0.y - ps.y };
        const L0 = Math.hypot(d0.x, d0.y);
        if (L0 < SCALE_REF_PX) d0 = L0 > 1e-6 ? { x: d0.x / L0 * SCALE_REF_PX, y: d0.y / L0 * SCALE_REF_PX } : { x: SCALE_REF_PX, y: 0 };
        const o = { x: s0.x - d0.x, y: s0.y - d0.y };      // 起点离轴心太近：在起点后面 40 px 立一个虚轴心（往外拖 = 放大）
        let f = Math.hypot(s1.x - o.x, s1.y - o.y) / Math.hypot(d0.x, d0.y);
        if (this.shift) f = Math.round(f / SCALE_STEP) * SCALE_STEP;
        if (typed !== null) f = typed;   // 打的倍数（S Z 0 = 沿 Z 压平）
        if (ax) fW = (p) => { const v = sub3(p, pivot); return add3(p, scale3(ax, dot3(v, ax) * (f - 1))); };   // 只沿这根轴（S Z 0 = 压平）
        else if (pn) fW = (p) => { const v = sub3(p, pivot), vn = scale3(pn, dot3(v, pn)); return add3(pivot, add3(vn, scale3(sub3(v, vn), f))); };   // 只在面内
        else fW = (p) => add3(pivot, scale3(sub3(p, pivot), f));
        dims = `缩放 ×${f.toFixed(3)}${ax ? "（锁轴）" : pn ? "（锁面）" : ""}${tag}`;
      }
    }
    const moves = new Map<number, Pt3>();
    for (const [v, p] of this.base) moves.set(v, applyPt(Xi, fW(applyPt(X, p))));
    return { moves, dims };
  }

  private commit(ctx: ToolCtx): void {
    const r = this.solve(ctx), n = this.vids.length, verb = this.verb(), adopt = this.adopt;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    if (!r) return;
    const moves = [...r.moves].filter(([v, p]) => { const b = ctx.mesh().pt(v); return b.x !== p.x || b.y !== p.y || b.z !== p.z; }).map(([v, to]) => ({ v, to }));
    if (!moves.length) { ctx.hint(`${verb}：没动`); return; }
    adoptPress(ctx, adopt);
    ctx.commitOp({ op: "meshMove", def: ctx.activePool().def, moves });
    ctx.hint(`${verb}了 ${n} 个点（${r.dims}）`);
  }

  private verb(): string { return this.kind === "move" ? "移动" : this.kind === "rotate" ? "旋转" : this.kind === "normal" ? "沿法线移动" : "缩放"; }   // 两字词，和硬表面对齐（user 10-27）
  /** 屏幕点 → 过轴心、垂直于视线的平面上的点（世界）。不用 pick.ts cameraPlane：那个是「最朝向镜头的轴平面」（SU 画图用），等轴视角下是地面，锁 Z 就挪不动了。 */
  private onPlane(ctx: ToolCtx, x: number, y: number): Pt3 | null {
    const pivot = this.pivotW;
    if (!pivot) return null;
    const vp = ctx.vp(), ps = ctx.frame().project?.(pivot, vp), n = normalize3(ctx.frame().ray(ps?.x ?? x, ps?.y ?? y, vp).dir), ray = ctx.frame().ray(x, y, vp);
    return rayPlane(ray.origin, ray.dir, n, dot3(n, pivot));
  }
}


/** 射线 × 三角形（Möller–Trumbore）：命中的射线参数（> 0），没中 = null。 */
function rayTri(o: Pt3, d: Pt3, a: Pt3, b: Pt3, c: Pt3): number | null {
  const e1 = sub3(b, a), e2 = sub3(c, a), p = cross3(d, e2), det = dot3(e1, p);
  if (Math.abs(det) < 1e-12) return null;
  const inv = 1 / det, tv = sub3(o, a), u = dot3(tv, p) * inv;
  if (u < 0 || u > 1) return null;
  const q = cross3(tv, e1), v = dot3(d, q) * inv;
  if (v < 0 || u + v > 1) return null;
  const t = dot3(e2, q) * inv;
  return t > 1e-9 ? t : null;
}

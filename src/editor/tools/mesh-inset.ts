// tools/mesh-inset.ts —— 自由建模工作台的「插入 / 倒角」那一格（硬表面偏移键 F 那一格；网格体；Blender I / Ctrl+B / Ctrl+Shift+B）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 §2-3「插：在目标处长一圈」。选区规矩同挤出：一开始有选区 = 做完新几何成选区；没有 = 不留（user 10-27）。
// 2026-10-28（纪元账本 FM152 / FM165，user「还是先合租试试」）：同一格按目标分——
//   · 面（选中的面；没选区时直接在面上按下，按下只认面 = pickFace，点和边不挡路）→ 插入：往面中心拖 = 插得深（op meshInset）；
//   · 选中的边 → 倒边；只选了点 → 倒点：往外拖 = 倒得宽（op meshBevel / meshBevelVerts；松手后马后炮改宽度 / 段数）；
//   · Ctrl+B（startModal 的 "bevel"）= 选了面也倒它们的边；Ctrl+Shift+B（"bevelVerts"）= 倒选中的点。
// 提交 = 一条 op（重放确定）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { bevelEdges, bevelVerts, insetFaces } from "../../mesh/ops/index.ts";
import { add3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyPt } from "../../scene/xform.ts";
import { fmtLen } from "../units.ts";
import type { ToolPointer } from "../editor.ts";
import { BoxDrag, adoptPress, clickSelect, pressTarget, type Target } from "./selecting.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { Op } from "../ops.ts";
import type { QuantityTag } from "../units.ts";
/** 长度字段：值存米，显示 / − + / 打字按用户选的单位（units.ts）。 */
const LEN: QuantityTag = { q: "length" };

type Job = { kind: "inset"; faces: number[] } | { kind: "bevel"; edges: number[] } | { kind: "bevelVerts"; verts: number[] };

/** 选中的面的全部边（升序）。 */
function edgesOfFaces(m: MeshKernel, faces: readonly number[]): number[] {
  const out = new Set<number>();
  for (const f of faces) { const r = m.faceVerts(f); for (let i = 0; i < r.length; i++) { const e = m.edgeOf(r[i], r[(i + 1) % r.length]); if (e >= 0) out.add(e); } }
  return [...out].sort((a, b) => a - b);
}

export class MeshInsetTool implements ToolHandler {
  readonly tool = "offset" as const;
  readonly grammar = "steps" as const;
  /** 手势中打的数 = 插入 / 倒角的宽度（读法 = units.ts）。 */
  readonly typedQuantity = { q: "length" as const };
  private job: Job | null = null;
  /** 按在选区外的东西上：落定时选区换成它（selecting.ts adoptPress；账本 UX30）。 */
  private adopt: Target["adopt"] | null = null;
  private hadSel = false;
  private centerW: Pt3 | null = null;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private localScale = 1;
  /** 倒角的段数（这个会话里记着上一次用的；马后炮里改）。 */
  private segments = 1;

  /** 没选区又按在空处 = 拖框（「会选的工具」，selecting.ts）。 */
  private box = new BoxDrag();
  tap(ctx: ToolCtx, ev: ToolPointer): void { clickSelect(ctx, ev, ctx.clicks()); ctx.hint(null); }   // 点一下 = 选（同选择工具），只有拖才插入 / 倒角（user 10-27）
  active(): boolean { return this.job !== null || this.box.active(); }
  cancel(): void { this.box.cancel(); this.job = null; this.adopt = null; this.centerW = null; this.start = this.cur = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshInset: { job: this.job?.kind ?? null, start: this.start, cur: this.cur } }; }

  /** Blender I / Ctrl+B / Ctrl+Shift+B：有选区 = 光标处起手。 */
  startModal(ctx: ToolCtx, s: { x: number; y: number }, variant?: string): boolean {
    const sel = ctx.selection();
    if (!(sel.faces.size || sel.edges.size || sel.verts.size)) return false;
    this.begin(ctx, { x: s.x, y: s.y }, variant === "bevel" || variant === "bevelVerts" ? variant : undefined);
    return this.active();
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.box.active()) { this.box.finish(ctx, ev); return; }   // 拖框松手
    if (this.active()) { this.commit(ctx); return; }
    this.begin(ctx, { x: ev.x, y: ev.y });
    if (!this.job && !this.hadSel) { this.box.begin(ev, ctx); ctx.hint("框选（插入 / 倒角工具里：没选东西时在空处拖 = 框）"); }   // user 10-28「其他的同理」
  }

  private begin(ctx: ToolCtx, at: { x: number; y: number }, force?: "bevel" | "bevelVerts"): void {
    const m = ctx.mesh();
    // 按下作用在什么上 = selecting.ts（没选区只认面；FM165）；拿它做什么 = 这里：面 = 插入、边 = 倒角、点 = 倒点（Ctrl+B / Ctrl+Shift+B 强制倒角 / 倒点）
    const p = pressTarget(ctx, at, this.tool);
    this.hadSel = p !== "box" && p.fromSelection; this.adopt = p !== "box" ? p.adopt ?? null : null;
    const faces = p === "box" ? [] : p.faces, edges = p === "box" ? [] : p.edges, verts = p === "box" ? [] : p.verts;
    let job: Job | null = null;
    if (force === "bevelVerts") job = verts.length ? { kind: "bevelVerts", verts } : null;
    else if (force === "bevel") { const es = [...new Set([...edges, ...edgesOfFaces(m, faces)])].sort((a, b) => a - b); job = es.length ? { kind: "bevel", edges: es } : null; }
    else if (faces.length) job = { kind: "inset", faces };
    else if (edges.length) job = { kind: "bevel", edges };
    else if (verts.length) job = { kind: "bevelVerts", verts };
    if (!job) { ctx.hint(force ? "倒角：先选边（或面）/ 点" : "插入 / 倒角：在一张面上按下 = 插入；选中边 / 点再拖 = 倒角"); return; }
    const X = ctx.ctxXform(), vs = job.kind === "inset" ? job.faces.flatMap((f) => m.faceVerts(f)) : job.kind === "bevel" ? job.edges.flatMap((e) => [m.edgeA[e], m.edgeB[e]]) : job.verts;
    let c0 = { x: 0, y: 0, z: 0 };
    for (const v of vs) c0 = add3(c0, m.pt(v));
    this.job = job;
    this.centerW = applyPt(X, scale3(c0, 1 / vs.length));
    // 本地长度 ↔ 世界长度：沿目标所在平面里的一个方向量（插入 = 面的切向；倒边 = 边的方向；倒点 = 本地 X）
    let d = { x: 1, y: 0, z: 0 };
    if (job.kind === "inset") { const n = m.faceNormal(job.faces[0]), t = Math.abs(n.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }; d = normalize3({ x: t.y * n.z - t.z * n.y, y: t.z * n.x - t.x * n.z, z: t.x * n.y - t.y * n.x }); }
    else if (job.kind === "bevel") { const e = job.edges[0]; d = normalize3(sub3(m.pt(m.edgeB[e]), m.pt(m.edgeA[e]))); }
    this.localScale = len3(applyDir(X, d)) || 1;
    this.start = { ...at }; this.cur = { ...at };
    ctx.setAnchor(this.centerW); ctx.setCursor(this.centerW);
    ctx.hint(job.kind === "inset" ? `插入 ${job.faces.length} 张面：往面中心拖 = 插得深，松手或点第二下落定（各自插一圈）`
      : job.kind === "bevel" ? `倒角 ${job.edges.length} 条边：往外拖 = 倒得宽，松手或点第二下落定（段数在马后炮里改）`
        : `倒角 ${job.verts.length} 个点：往外拖 = 切得多，松手或点第二下落定`);
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { if (this.box.track(ctx, s)) return; if (this.job) this.cur = { x: s.x, y: s.y }; }

  /**
   * 当前拖动 → 多宽（世界长度）：离目标中心（屏幕）的距离变了多少 × 每像素的世界长度；插入 = 靠近中心为正，倒角 = 远离中心为正。
   * 起点离中心太近 = 在起点后面 40 px 立一个虚中心。
   */
  private distW(ctx: ToolCtx): number {
    { const t = ctx.typed(); if (t !== null) return Math.max(0, t); }   // 打的宽度
    const c = this.centerW, s0 = this.start, s1 = this.cur;
    if (!c || !s0 || !s1) return 0;
    const vp = ctx.vp(), fr = ctx.frame(), cs = fr.project?.(c, vp);
    if (!cs) return 0;
    let d0 = { x: s0.x - cs.x, y: s0.y - cs.y };
    const L0 = Math.hypot(d0.x, d0.y);
    if (L0 < 40) d0 = L0 > 1e-6 ? { x: d0.x / L0 * 40, y: d0.y / L0 * 40 } : { x: 40, y: 0 };
    const o = { x: s0.x - d0.x, y: s0.y - d0.y }, moved = Math.hypot(s1.x - o.x, s1.y - o.y) - Math.hypot(d0.x, d0.y);
    const px = this.job?.kind === "inset" ? -moved : moved;
    const n = normalize3(fr.ray(cs.x, cs.y, vp).dir), at = (x: number, y: number): Pt3 | null => { const r = fr.ray(x, y, vp); return rayPlane(r.origin, r.dir, n, dot3(n, c)); };
    const a = at(cs.x, cs.y), b = at(cs.x + 1, cs.y), wpp = a && b ? len3(sub3(b, a)) : 0;
    return Math.max(0, px) * wpp;
  }

  /** 这一下的 op（本地宽度 dL）。 */
  private opFor(ctx: ToolCtx, job: Job, dL: number, segments: number): Op {
    const def = ctx.activePool().def;
    return job.kind === "inset" ? { op: "meshInset", def, faces: job.faces, dist: dL }
      : job.kind === "bevel" ? { op: "meshBevel", def, edges: job.edges, width: dL, segments }
        : { op: "meshBevelVerts", def, verts: job.verts, width: dL };
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    const job = this.job;
    if (!job) return "";
    const dW = this.distW(ctx), dL = dW / this.localScale, seg = this.segments;
    if (dL > 1e-9) run((m) => { if (job.kind === "inset") insetFaces(m, job.faces, dL); else if (job.kind === "bevel") bevelEdges(m, job.edges, dL, seg); else bevelVerts(m, job.verts, dL); });
    return `${job.kind === "inset" ? "插入" : "倒角"} ${fmtLen(dW)}`;
  }

  private commit(ctx: ToolCtx): void {
    const job = this.job, dW = this.distW(ctx), dL = dW / this.localScale, hadSel = this.hadSel, scale = this.localScale, adopt = this.adopt;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null);
    if (!job) return;
    const name = job.kind === "inset" ? "插入" : "倒角";
    if (dL < 1e-6) { ctx.hint(`${name}：没动`); return; }
    adoptPress(ctx, adopt);
    if (job.kind === "inset") {
      ctx.commitOp(this.opFor(ctx, job, dL, 1));
      if (hadSel) ctx.setSelection({ faces: job.faces.filter((f) => ctx.mesh().hasF(f)) });   // 里面那几张面（插入保号：面还是原来的 id）
      ctx.hint(`插入了 ${job.faces.length} 张面（${fmtLen(dW)}）`);
      return;
    }
    // 倒角：先在副本上倒一遍（新面的 id、有没有被夹宽、跳过了几条），再提交同一条 op（确定性 = 同一批 id）
    const go = (wL: number, seg: number): boolean => {
      const probe = ctx.mesh().clone();
      const r = job.kind === "bevel" ? bevelEdges(probe, job.edges, wL, seg) : bevelVerts(probe, job.verts, wL);
      if (!r.faces.length) { ctx.hint(`倒角：${job.kind === "bevel" ? "选中的边" : "选中的点"}倒不了（要两侧都有面、四周围满面；网格边缘上的不行）`); return false; }
      ctx.commitOp(this.opFor(ctx, job, wL, seg));
      if (hadSel) ctx.setSelection({ faces: r.faces });
      const tail = [r.clamped ? `宽度被限到 ${fmtLen(r.width * scale)}（再宽会穿过别的边）` : "", r.skipped ? `${r.skipped} ${job.kind === "bevel" ? "条边" : "个点"}没倒（网格边缘上 / 四周没围满面）` : ""].filter(Boolean).join("；");
      ctx.hint(`倒角：${job.kind === "bevel" ? `${job.edges.length - r.skipped} 条边` : `${job.verts.length - r.skipped} 个点`}（${fmtLen(r.width * scale)}${job.kind === "bevel" && seg > 1 ? `，${seg} 段圆角` : ""}）${tail ? `——${tail}` : ""}`);
      return true;
    };
    if (!go(dL, this.segments)) return;
    const fields = job.kind === "bevel"
      ? [{ key: "width", def: { kind: "number" as const, label: "宽度", min: 0.001, max: 10000, step: 0.01, quantity: LEN } }, { key: "segments", def: { kind: "number" as const, label: "段数", min: 1, max: 32, step: 1 } }]
      : [{ key: "width", def: { kind: "number" as const, label: "宽度", min: 0.001, max: 10000, step: 0.01, quantity: LEN } }];
    ctx.offerAfterthought("倒角", fields, { width: Math.round(dW * 1000) / 1000, segments: this.segments }, 1, (v) => {
      const seg = Math.max(1, Math.min(32, Math.round(Number(v.segments ?? 1))));
      this.segments = seg;
      go(Number(v.width) / scale, seg);
    });
  }
}

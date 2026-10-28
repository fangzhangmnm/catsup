// tools/mesh-inset.ts —— 自由建模工作台的「插入」（硬表面偏移键 F 那一格；网格体；Blender I）。created 2026-10-27 by Claude Opus 5.5
// 设计稿 §2-3「插：在目标处长一圈」——这一版先做面：选中的面（或按下处那张面）各自往里插一圈（等宽），往面中心拖 = 插得深。
// 点 / 边上的插（倒角）、空处的插（建 n 边形）、相邻面当一整块的区域内插 = 以后。选区规矩同挤出：一开始有选区 = 里面那几张面成选区；没有 = 做完不留（user 10-27）。
// 提交 = 一条 meshInset（mesh/ops/inset.ts insetFaces；重放确定）。
import type { FaceEvent, Kernel, Pt3 } from "../../kernel/kernel.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";
import { insetFaces } from "../../mesh/ops/index.ts";
import { add3, dot3, len3, normalize3, scale3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { applyDir, applyPt } from "../../scene/xform.ts";
import { fmtLen } from "../editor.ts";
import type { ToolPointer } from "../editor.ts";
import { meshTap } from "./mesh-transform.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";

export class MeshInsetTool implements ToolHandler {
  readonly tool = "offset" as const;
  readonly grammar = "steps" as const;
  private faces: number[] = [];
  private hadSel = false;
  private centerW: Pt3 | null = null;
  private start: { x: number; y: number } | null = null;
  private cur: { x: number; y: number } | null = null;
  private localScale = 1;

  tap(ctx: ToolCtx, s: { x: number; y: number }): void { meshTap(ctx, s); }   // 点一下 = 选 / 取消选择，只有拖才挤出 / 插入（user 10-27）
  active(): boolean { return this.faces.length > 0; }
  cancel(): void { this.faces = []; this.centerW = null; this.start = this.cur = null; }
  sample(): Record<string, number> { return {}; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  describe(): Record<string, unknown> { return { meshInset: { faces: this.faces.length, start: this.start, cur: this.cur } }; }

  startModal(ctx: ToolCtx, s: { x: number; y: number }): boolean {   // Blender I：有选区 = 光标处起手
    const sel = ctx.selection();
    if (!sel.faces.size) return false;
    this.down(ctx, { x: s.x, y: s.y, clientX: s.x, clientY: s.y, pointerType: "mouse", shiftKey: false } as ToolPointer);
    return this.active();
  }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.active()) { this.commit(ctx); return; }
    const m = ctx.mesh(), sel = ctx.selection();
    this.hadSel = sel.faces.size > 0 || sel.edges.size > 0 || sel.verts.size > 0;
    let faces = sel.kind === "mesh" ? [...sel.faces].filter((f) => m.hasF(f)) : [];
    if (!faces.length && !this.hadSel) {
      const c = ctx.classify(ctx.world(), ctx.pickStatic(ev.x, ev.y));
      if (c.kind === "entity" && c.local.face !== undefined && m.hasF(c.local.face)) faces = [c.local.face];
    }
    if (!faces.length) { ctx.hint(this.hadSel ? "插入：这一版只插面（选中面；点 / 边的倒角以后做）" : "插入：在一张面上按下"); return; }
    const X = ctx.ctxXform();
    let c0 = { x: 0, y: 0, z: 0 }, n = 0;
    for (const f of faces) for (const v of m.faceVerts(f)) { c0 = add3(c0, m.pt(v)); n++; }
    this.faces = faces;
    this.centerW = applyPt(X, scale3(c0, 1 / n));
    const nrm = m.faceNormal(faces[0]), t = Math.abs(nrm.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
    this.localScale = len3(applyDir(X, normalize3({ x: t.y * nrm.z - t.z * nrm.y, y: t.z * nrm.x - t.x * nrm.z, z: t.x * nrm.y - t.y * nrm.x }))) || 1;
    this.start = { x: ev.x, y: ev.y }; this.cur = { x: ev.x, y: ev.y };
    ctx.setAnchor(this.centerW); ctx.setCursor(this.centerW);
    ctx.hint(`插入 ${faces.length} 张面：往面中心拖 = 插得深，松手或点第二下落定（各自插一圈）`);
  }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { if (this.active()) { this.cur = { x: s.x, y: s.y }; void ctx; } }

  /** 当前拖动 → 插多深（世界长度）：离面中心（屏幕）的距离少了多少 × 每像素的世界长度；起点离中心太近 = 在起点后面 40 px 立一个虚中心。 */
  private distW(ctx: ToolCtx): number {
    const c = this.centerW, s0 = this.start, s1 = this.cur;
    if (!c || !s0 || !s1) return 0;
    const vp = ctx.vp(), fr = ctx.frame(), cs = fr.project?.(c, vp);
    if (!cs) return 0;
    let d0 = { x: s0.x - cs.x, y: s0.y - cs.y };
    const L0 = Math.hypot(d0.x, d0.y);
    if (L0 < 40) d0 = L0 > 1e-6 ? { x: d0.x / L0 * 40, y: d0.y / L0 * 40 } : { x: 40, y: 0 };
    const o = { x: s0.x - d0.x, y: s0.y - d0.y }, px = Math.hypot(d0.x, d0.y) - Math.hypot(s1.x - o.x, s1.y - o.y);
    const n = normalize3(fr.ray(cs.x, cs.y, vp).dir), at = (x: number, y: number): Pt3 | null => { const r = fr.ray(x, y, vp); return rayPlane(r.origin, r.dir, n, dot3(n, c)); };
    const a = at(cs.x, cs.y), b = at(cs.x + 1, cs.y), wpp = a && b ? len3(sub3(b, a)) : 0;
    return Math.max(0, px) * wpp;
  }

  liveMesh(ctx: ToolCtx, run: (fn: (m: MeshKernel) => void) => void): string {
    if (!this.active()) return "";
    const dW = this.distW(ctx), dL = dW / this.localScale, fs = this.faces;
    if (dL > 1e-9) run((m) => { insetFaces(m, fs, dL); });
    return `插入 ${fmtLen(dW)}`;
  }

  private commit(ctx: ToolCtx): void {
    const dW = this.distW(ctx), dL = dW / this.localScale, fs = this.faces, hadSel = this.hadSel;
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null);
    if (dL < 1e-6) { ctx.hint("插入：没动"); return; }
    ctx.commitOp({ op: "meshInset", def: ctx.activePool().def, faces: fs, dist: dL });
    if (hadSel) ctx.setSelection({ faces: fs.filter((f) => ctx.mesh().hasF(f)) });   // 里面那几张面（挤出保号：面还是原来的 id）
    ctx.hint(`插入了 ${fs.length} 张面（${fmtLen(dW)}）`);
  }
}

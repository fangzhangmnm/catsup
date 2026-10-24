// tools/move.ts —— 移动工具的手势模块：steps 语法（点参考点 → 移动 → 再点 / 松手放置；Ctrl / Alt = 复制）。从 editor.ts 原样搬出（刀 ② B，行为零变更）。
// 目标 = 选区（顶点集 + 能动的子池）或光标下的实体 / 子池；拖拽中在相机平面上吸附、意图门（反方向候选不合法）、
// 格点是地板（D16）：吸到格点时轴向锥照跑；轻擦平面保持上一点。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../../kernel/kernel.ts";
import { add3, len3, sub3 } from "../../kernel/geom.ts";
import { rayPlane } from "../camera.ts";
import { intentAllows3D } from "../intent.ts";
import { cameraPlane, drawPlaneAt, grazing, inferAxisByDirection, type SnapKind } from "../pick.ts";
import { moveTargets, moveTargetsSelection } from "../tools.ts";
import { applyDir, invert, translation } from "../../scene/xform.ts";
import { MIN_GESTURE_LEN, fmtLen } from "../editor.ts";
import type { PoolPick, ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";

export class MoveTool implements ToolHandler {
  readonly tool = "move" as const;
  readonly grammar = "steps" as const;
  private vids: VertexId[] = [];
  private pools: PoolPick[] = [];
  private copy = false;
  private entities: { faces: FaceId[]; edges: EdgeId[] } = { faces: [], edges: [] };

  active(): boolean { return this.vids.length > 0 || this.pools.length > 0; }
  cancel(): void { this.vids = []; this.pools = []; this.copy = false; this.entities = { faces: [], edges: [] }; }
  sample(): Record<string, number> { return {}; }
  describe(ctx?: ToolCtx): Record<string, unknown> { return { move: { anchor: ctx?.anchor() ?? null, vids: this.vids.length, pools: this.pools.length, copy: this.copy } }; }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.hoverSnap(s); }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    if (this.active()) { this.commit(ctx); return; }
    const view = ctx.live();
    const hit = ctx.pick(ev.x, ev.y);
    const c = ctx.classify(view, hit);
    this.copy = !!ev.copy;
    if (ctx.hasSelection()) {
      const sel = ctx.selection();
      this.vids = moveTargetsSelection(ctx.kernel(), sel);
      this.pools = ctx.movablePoolPicks();
      this.entities = { faces: [...sel.faces], edges: [...sel.edges] };
    } else if (c.kind === "pool" && ctx.pickLocked(c.pick)) { ctx.hint("已锁定：不能移（选中它 → 解锁）"); return; }
    else if (c.kind === "entity") {
      this.vids = moveTargets(ctx.kernel(), c.local); this.pools = [];
      this.entities = { faces: c.local.face !== undefined ? [c.local.face] : [], edges: c.local.edge !== undefined ? [c.local.edge] : [] };
    }
    else if (c.kind === "pool") { this.vids = []; this.pools = [c.pick]; this.entities = { faces: [], edges: [] }; }
    else { this.vids = []; this.pools = []; }
    if (!this.active()) return;
    const plane = drawPlaneAt(view, ctx.frame(), ctx.vp(), ev.x, ev.y);
    const anchor = hit.vertex !== undefined
      ? view.graph.pt(hit.vertex)
      : ctx.snap(view, ev.x, ev.y, { plane, alignSources: ctx.alignSources(), hand: ctx.hand(view) }).p;
    ctx.setAnchor(anchor);
    ctx.setCursor(anchor);
    ctx.hint((this.copy ? "复制：" : "") + (this.pools.length ? "移动 group / 组件：拖拽或点两下放置" : ctx.hasSelection() ? "移动选区：参考点已拾取，拖拽或点两下放置" : "移动中…拖拽或点两下放置（所见即所得；按住 Ctrl/Alt = 复制）"));
  }

  track(ctx: ToolCtx, s: { x: number; y: number }, travel?: number): void {
    const anchor = ctx.anchor();
    if (!this.active() || !anchor) return;
    const view = ctx.live();
    const mv = new Set(this.vids);
    const plane = cameraPlane(ctx.frame(), anchor);
    let sn = ctx.snap(view, s.x, s.y, { plane, anchor, alignSources: ctx.alignSources(), hand: ctx.hand(view, (vid) => mv.has(vid), false) });
    // 意图门：候选在锚点另一侧（相机平面上与拖动方向点积 < 0）不合法（抬笔那一下滑到反方向的点 = 本案）
    const rayM = ctx.frame().ray(s.x, s.y, ctx.vp());
    const freeM = rayPlane(rayM.origin, rayM.dir, plane.plane.n, plane.plane.d);
    if (sn.kind !== null && freeM && ctx.intentOn(s, travel) && !intentAllows3D(sub3(freeM, anchor), sub3(sn.p, anchor), MIN_GESTURE_LEN)) { sn = { p: freeM, kind: null }; ctx.dropHysteresis(); }
    if (sn.kind === null || sn.kind === "grid-point") {   // 格点是地板（D16）：拖出方向意图时轴向锥先于格点
      const ax = inferAxisByDirection(ctx.frame(), ctx.vp(), anchor, s.x, s.y);
      const cur = ctx.cursor();
      if (ax) sn = { p: ax.p, kind: `axis-${ax.axis}` as SnapKind };
      else if (sn.kind === null && cur && grazing(plane, ctx.frame().ray(s.x, s.y, ctx.vp()))) sn = { p: cur, kind: null };
    }
    const snapped = ctx.hysteresis(sn, s.x, s.y);
    ctx.setSnap(snapped);
    ctx.charge(snapped, 120);
    ctx.setCursor(snapped.p);
  }

  live(ctx: ToolCtx, run: (fn: (c: Kernel) => FaceEvent[]) => void): string {
    const anchor = ctx.anchor(), cursor = ctx.cursor();
    if (!this.active() || !anchor || !cursor) return "";
    const delta = sub3(cursor, anchor);
    const dims = `${this.copy ? "复制" : "移动"} ${fmtLen(len3(delta))}`;
    if (len3(delta) >= MIN_GESTURE_LEN) {
      if (this.vids.length) {
        const vids = this.vids, dl = applyDir(invert(ctx.ctxXform()), delta);
        if (this.copy) {
          const payload = ctx.copyPayload(translation(dl), this.entities);
          if (payload) run((c) => { const edgeSegs: Record<string, { a: Pt3; b: Pt3 }[]> = {}; for (const [n, segs] of Object.entries(payload.edgeSegs)) edgeSegs[n] = segs.map(([a, b]) => ({ a, b })); return c.absorb(payload.faces, payload.wires.map(([a, b]) => ({ a, b })), { edgeSegs, faceLayers: payload.faceLayers }); });
        } else run((c) => c.moveVertices(vids.filter((id) => c.graph.hasVertex(id)).map((id) => ({ id, to: add3(c.graph.pt(id), dl) }))));
      }
      if (this.pools.length) ctx.setLiveOverride({ picks: this.pools, xform: translation(delta), copy: this.copy });
    }
    return dims;
  }

  private commit(ctx: ToolCtx): void {
    const anchor = ctx.anchor()!, target = ctx.cursor() ?? anchor;
    const delta = sub3(target, anchor);
    const vids = this.vids, pools = this.pools, copy = this.copy, entities = { faces: [...this.entities.faces], edges: [...this.entities.edges] };
    const X = translation(delta);
    const k0 = ctx.kernel(), froms = vids.filter((id) => k0.graph.hasVertex(id)).map((id) => k0.graph.pt(id));
    const n0 = ctx.opCount(), at0 = ctx.activePool();
    const XL = ctx.xformToLocal(X);
    const payload = copy ? ctx.copyPayload(XL, entities) : null;   // 复制载荷先从落定前的内核算
    this.cancel();
    ctx.setAnchor(null); ctx.setCursor(null); ctx.setSnap(null);
    if (len3(delta) < MIN_GESTURE_LEN) return;
    if (copy) ctx.commitCopies([{ payload, XL }], pools, at0);
    else ctx.commitXform(X, vids, pools);
    ctx.recordLast({ kind: "move", ops: ctx.opCount() - n0, at: at0, froms, pools, delta, copy, entities });
  }
}

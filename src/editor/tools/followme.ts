// tools/followme.ts —— 跟随工具（SU Follow Me）的手势模块：接缝的第二个适配器（「两个适配器才是真接缝」；架构重构 2026-10-21，Claude Fable 5.1）。
// 从 editor.ts 原样搬出（行为零变更）：点轮廓面 → 路径 = 当前选区（边链 / 一张面的外环）→ 一步 followme op。无拖拽态（active 永远 false）。
// pathFromSelection 是纯函数（node 直测的入口）；#24 交互式描路径 / 跨池路径以后也落在这个文件。
import type { Kernel } from "../../kernel/kernel.ts";
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../../kernel/kernel.ts";
import { dist3, dot3, normalize3, sub3 } from "../../kernel/geom.ts";
import { simplifyPath } from "../../kernel/sweep.ts";
import { faceKey } from "../ops.ts";
import type { Selection } from "../tools.ts";
import type { ToolPointer } from "../editor.ts";
import type { ToolCtx, ToolHandler, ToolSample } from "../tool-handler.ts";

export interface FollowPath { path: Pt3[]; closed: boolean; smoothJoints: boolean[]; }

/**
 * 跟随的路径 = 当前选区：一串边（链，无分叉）；没选边就取选中的一张面（不是轮廓面本身）的外环 = 闭路径。
 * 取向：起点必须落在轮廓面的平面上，且首段不平行于它；闭路径候选起点多时取离轮廓最近的；两个方向都试，取 |n·d₀| 大的。
 * 关节平滑 = 两侧路径边都是曲线成员（圆 / 弧路径 → 旋转体侧面光滑）。失败 → 人话原因。
 */
export function pathFromSelection(k: Kernel, selection: Readonly<Selection>, profile: FaceId): FollowPath | string {
  const g = k.graph;
  let edgeIds = [...selection.edges].filter((id) => g.hasEdge(id));
  if (!edgeIds.length) {
    const fs = [...selection.faces].filter((id) => id !== profile && k.face(id));
    if (fs.length !== 1) return "先用选择工具选好路径（一串边，或一张面 = 它的外环），再点轮廓面";
    edgeIds = k.face(fs[0])!.outer.edges.map((d) => d.edge);
  }
  const adj = new Map<VertexId, EdgeId[]>();
  const between = new Map<string, EdgeId>();
  for (const id of edgeIds) {
    const e = g.edge(id);
    for (const v of [e.a, e.b]) (adj.get(v) ?? adj.set(v, []).get(v)!).push(id);
    between.set(`${e.a}-${e.b}`, id); between.set(`${e.b}-${e.a}`, id);
  }
  for (const es of adj.values()) if (es.length > 2) return "路径有分叉：只能是一条链";
  const ends = [...adj.entries()].filter(([, es]) => es.length === 1).map(([v]) => v);
  if (ends.length !== 0 && ends.length !== 2) return "路径不连续：选中的边不是一条链";
  const closed = ends.length === 0;
  const start = closed ? g.edge(edgeIds[0]).a : ends[0];
  const vids: VertexId[] = [start];
  const seen = new Set<EdgeId>();
  let cur = start;
  for (;;) {
    const nextE = (adj.get(cur) ?? []).find((id) => !seen.has(id));
    if (nextE === undefined) break;
    seen.add(nextE);
    const e = g.edge(nextE);
    cur = e.a === cur ? e.b : e.a;
    if (closed && cur === start) break;
    vids.push(cur);
  }
  if (seen.size !== edgeIds.length) return "路径不连续：选中的边不是一条链";
  const rec = k.planeOf(profile)!;
  const n = rec.plane.n, pl = rec.plane;
  const onPlane = (v: VertexId): boolean => Math.abs(dot3(n, g.pt(v)) - pl.d) <= k.coplanarTol;
  const profPts = k.faceRings3(profile)!.outer;
  const nearProfile = (v: VertexId): number => Math.min(...profPts.map((p) => dist3(p, g.pt(v))));
  // 候选起点：闭路径每个顶点两个方向；开路径两端。打分 = 起点在轮廓平面上（SU 要求）≫ 离轮廓近 ≫ 首段越垂直越好；首段平行于轮廓面的不要
  const candidates: VertexId[][] = [];
  if (closed) for (let i = 0; i < vids.length; i++) { const rot = [...vids.slice(i), ...vids.slice(0, i)]; candidates.push(rot, [rot[0], ...rot.slice(1).reverse()]); }
  else candidates.push(vids, [...vids].reverse());
  let best: VertexId[] | null = null, bestScore = -Infinity;
  for (const c of candidates) {
    const d0 = normalize3(sub3(g.pt(c[1]), g.pt(c[0])));
    const dn = Math.abs(dot3(n, d0));
    if (dn < 1e-6) continue;
    const score = (onPlane(c[0]) ? 1e6 : 0) - nearProfile(c[0]) + dn * 1e-3;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  if (!best) return "路径的首段不能平行于轮廓面";
  const path = best.map((v) => g.pt(v));
  const m = best.length;
  const edgeAt = (i: number): EdgeId => between.get(`${best![i % m]}-${best![(i + 1) % m]}`)!;
  const segs = closed ? m : m - 1;
  const smoothJoints = best.map((_, i) => {
    if (!closed && (i === 0 || i === m - 1)) return false;
    return k.isCurve(edgeAt((i - 1 + segs) % segs)) && k.isCurve(edgeAt(i % segs));
  });
  return { path, closed, smoothJoints };
}

export class FollowMeTool implements ToolHandler {
  readonly tool = "followme" as const;
  readonly grammar = "direct" as const;
  active(): boolean { return false; }
  cancel(): void {}
  sample(): Record<string, number> { return {}; }
  track(): void {}
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }

  down(ctx: ToolCtx, ev: ToolPointer): void {
    const view = ctx.live();
    const gf = ctx.pickFace(ev.x, ev.y);
    if (gf === undefined) { ctx.hint("跟随：先用选择工具选好路径（一串边，或一张面 = 它的外环），再点轮廓面"); return; }
    const c = ctx.classify(view, { face: gf });
    if (c.kind === "pool") { ctx.hint("这张面在子 group / 组件里：双击进入后再跟随"); return; }
    if (c.kind !== "entity" || c.local.face === undefined) return;
    const k = ctx.kernel();
    const r = pathFromSelection(k, ctx.selection(), c.local.face);
    if (typeof r === "string") { ctx.hint(`跟随：${r}`); return; }
    ctx.commitOp({ op: "followme", at: ctx.activePool(), face: faceKey(k, c.local.face), path: r.path, closed: r.closed, smoothJoints: r.smoothJoints });
    const nSeg = simplifyPath(r.path, r.closed).path.length - (r.closed ? 0 : 1);   // 共线关节不算拐角
    ctx.hint(`跟随：沿 ${nSeg} 段路径扫完${r.closed ? "（闭合）" : ""}`);
  }
}

// snap-grid.ts —— 修复指令「吸到格点…」的规划：纯函数（零 DOM，node 直测）。纪元排期 T8 / 账本 DT4。created 2026-10-26 by Claude Opus 5.5
// user 拍过的（10-25 / 10-26）：名字「吸到格点…」；作用范围 = 有选区只对选中的、没选 = 整个物体，默认含子物体（DT85，和焊接断口 / 拍平同一套）；
//   坐标系默认按**物体自己的坐标架**吸（组件实例转了 30°，按世界格点吸会改它的定义，别的实例就离格了），世界格点是选项；
//   格子 = 文档的格距 ÷ 细分（和画图时吸附的格点同一套）；不破面，折缝默认软边、可选硬边（「估计没人用」）。
// AI 加的一条默认（默认 + 披露，user 没拍）：圆 / 弧整条按圆心平移吸上格点（保持是圆——轮子上的点逐个吸会把小圆吸成歪多边形），开关「曲线上的点也逐个吸」。
//   曲线只有一部分在范围里 → 那些点不动（整条平移会动到范围外的点，逐个吸会把圆吸歪），提示里报出来。
// 不破面的退路在执行那边（ops.ts snapToGrid）：先在拷贝上试吸，会破的面先在原平面里三角化（三角永远是平的），对角线和折缝同样的层，再真吸。
import type { FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import { type Xform, applyPt, invert } from "../scene/xform.ts";
import { triangulateRings } from "../format/triangulate.ts";

export type SnapCurves = "rigid" | "points";
export interface GridSnapOptions { /** 格子边长（格子坐标里，米）。 */ step: number; curves: SnapCurves; }
export interface GridSnapPlan {
  /** 挪点（id → 新位置，池本地坐标）；本来就在格点上的不在里面。按 id 排好（确定）。 */
  moves: { id: VertexId; to: Pt3 }[];
  /** 整条平移、保持是圆的曲线条数。 */
  curves: number;
  /** 曲线只有一部分在范围里、因此没动的点。 */
  skipped: number;
}

const EPS_MOVE = 1e-9;

/**
 * 规划：scope = 只看这些点（null = 池里全部）；lattice = 池本地坐标 → 格子坐标的仿射变换（格点 = 三个分量都是 step 的整数倍）。
 * 物体自己的坐标架 → lattice = 坐标架的逆；世界格点 → lattice = 池到世界的变换。
 */
export function planGridSnap(k: Kernel, scope: readonly VertexId[] | null, lattice: Xform, opt: GridSnapOptions): GridSnapPlan {
  const g = k.graph, inv = invert(lattice), s = opt.step;
  const snap = (p: Pt3): Pt3 => { const q = applyPt(lattice, p); return applyPt(inv, { x: Math.round(q.x / s) * s, y: Math.round(q.y / s) * s, z: Math.round(q.z / s) * s }); };
  const vs = new Set<VertexId>(scope ? scope.filter((v) => g.hasVertex(v)) : k.vertices().map((v) => v.id));
  const target = new Map<VertexId, Pt3>(), skip = new Set<VertexId>();
  let curves = 0;
  if (opt.curves === "rigid") {
    for (const c of k.curves()) {
      if ((c.kind !== "circle" && c.kind !== "arc") || !c.params) continue;
      const cv = new Set<VertexId>();
      for (const e of c.edges) if (g.hasEdge(e)) { const E = g.edge(e); cv.add(E.a); cv.add(E.b); }
      const inScope = [...cv].filter((v) => vs.has(v));
      if (!inScope.length) continue;
      if (inScope.length < cv.size) { for (const v of inScope) skip.add(v); continue; }
      const c0 = c.params.center, c1 = snap(c0), d = { x: c1.x - c0.x, y: c1.y - c0.y, z: c1.z - c0.z };
      for (const v of cv) if (!target.has(v)) { const p = g.pt(v); target.set(v, { x: p.x + d.x, y: p.y + d.y, z: p.z + d.z }); }
      curves++;
    }
  }
  for (const v of vs) if (!target.has(v) && !skip.has(v)) target.set(v, snap(g.pt(v)));
  const moves: GridSnapPlan["moves"] = [];
  for (const [id, to] of [...target].sort((a, b) => a[0] - b[0])) { const p = g.pt(id); if (Math.abs(to.x - p.x) + Math.abs(to.y - p.y) + Math.abs(to.z - p.z) > EPS_MOVE) moves.push({ id, to }); }
  let skipped = 0;
  for (const v of skip) if (!target.has(v)) skipped++;
  return { moves, curves, skipped };
}

/**
 * 这几张面在原平面里三角化要补的对角线（两端点坐标；环上本来就有的边不算）。三角永远是平的 = 吸完怎么挪都不会破。
 * 带洞的面一起算（对角线会连到洞上）。
 */
export function triangulationDiagonals(k: Kernel, faces: readonly FaceId[]): [Pt3, Pt3][] {
  const g = k.graph, out: [Pt3, Pt3][] = [], seen = new Set<string>();
  for (const fid of faces) {
    const f = k.face(fid), rec = k.planeOf(fid);
    if (!f || !rec) continue;
    const pts: Pt3[] = [], vids: VertexId[] = [], outer: number[] = [], holes: number[][] = [], ring = new Set<string>();
    [f.outer, ...f.holes].forEach((r, ri) => {
      const idx: number[] = [];
      for (const v of r.vids) { idx.push(pts.length); pts.push(g.pt(v)); vids.push(v); }
      for (let i = 0; i < r.vids.length; i++) { const a = r.vids[i], b = r.vids[(i + 1) % r.vids.length]; ring.add(a < b ? `${a}-${b}` : `${b}-${a}`); }
      if (ri === 0) outer.push(...idx); else holes.push(idx);
    });
    for (const t of triangulateRings(pts, rec.plane, outer, holes)) for (let i = 0; i < 3; i++) {
      const a = vids[t[i]], b = vids[t[(i + 1) % 3]];
      if (a === b) continue;
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (ring.has(key) || seen.has(key)) continue;
      seen.add(key); out.push([g.pt(a), g.pt(b)]);
    }
  }
  return out;
}

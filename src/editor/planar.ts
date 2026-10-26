// planar.ts —— 拍平（make faces planar）的规划：纯函数（零 DOM，node 直测）。纪元排期 T9 / 账本 DT7。created 2026-10-26 by Claude Opus 5.5
// user 拍过的（10-25）：角度 = 油漆桶的锐角阈值（同一个量、同一个默认 20°）；「也许比我想的简单，不用flood fill，只是把所有小于角度的硬边干掉就行」——
//   候选 = 弯折小于阈值的**硬**边（软边从来不是候选 → 平滑组自动不碰）；经候选边连起来的面 = 一组（kernel/flood.ts partitionFaces）；
//   每组拍到同一张平面上（众数 = 组里已经落在同一平面上的点最多的那张，user 的例子 0.5 / 0.51 → 0.5；中位数 / 平均数可选）；擦内线 = 选项。
//   边角：小角度硬边一边是平面、一边是平滑组的一片 → 照样是候选，拍平后并成一张面、成为平滑组的一员（user「和你相反……加入平滑组」）——不用特判。
//   零破面（user「确保不要有任何面破，如果有，说明我们算法可能想错了」）：不在这里判，在执行（ops.ts makePlanar）那里看结算事件，有 BURST 整步拒绝。
// 一个点同时属于几组（被一条锐边分开的两组共用的边界点）→ 挪到这几张平面的交线 / 交点上（交替投影），几组都平。
import type { EdgeId, FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import { COPLANAR_TOL_DEFAULT, add3, cross3, dot3, normalize3, scale3, sub3 } from "../kernel/geom.ts";
import { gates, partitionFaces } from "../kernel/flood.ts";

export type PlanarTarget = "mode" | "median" | "mean";
export interface PlanarOptions { /** 候选边的弯折上限（度）。 */ deg: number; target: PlanarTarget; /** 拍完擦掉组里的候选边（两边并成一张面）。 */ eraseInner: boolean; }
export const PLANAR_DEFAULTS: PlanarOptions = { deg: 20, target: "mode", eraseInner: true };

export interface PlanarPlan {
  /** 要拍平的组（每组 ≥ 2 张面）。 */
  groups: FaceId[][];
  /** 挪点（id → 新位置）；本来就在平面上的点不在里面。 */
  moves: { id: VertexId; to: Pt3 }[];
  /** 擦内线时要擦的边（拍平之前的 id + 两端点拍平之后的位置，执行时按位置找回）。 */
  erase: { id: EdgeId; a: Pt3; b: Pt3 }[];
}
interface Plane { n: Pt3; d: number }

/** 规划：scope = 只看这些面（null = 池里全部）。 */
export function planPlanar(k: Kernel, scope: readonly FaceId[] | null, opt: PlanarOptions): PlanarPlan {
  const faces = scope ?? k.faces().map((f) => f.id);
  const gate = gates.hardBelow(k, opt.deg);
  const groups = partitionFaces(k, faces, gate).filter((g) => g.length >= 2);
  const tau = COPLANAR_TOL_DEFAULT;
  const planesOf = new Map<VertexId, Plane[]>();
  for (const g of groups) {
    const vids = new Set<VertexId>();
    for (const fid of g) { const f = k.face(fid)!; for (const r of [f.outer, ...f.holes]) for (const v of r.vids) vids.add(v); }
    const pl = targetPlane(k, g, [...vids], opt.target, tau);
    for (const v of vids) { const a = planesOf.get(v) ?? []; a.push(pl); planesOf.set(v, a); }
  }
  const moves: PlanarPlan["moves"] = [], moved = new Map<VertexId, Pt3>();
  for (const [v, pls] of planesOf) {
    const p0 = k.graph.pt(v), p = onAll(p0, pls);
    if (Math.hypot(p.x - p0.x, p.y - p0.y, p.z - p0.z) > tau * 1e-3) { moves.push({ id: v, to: p }); moved.set(v, p); }
  }
  const erase: PlanarPlan["erase"] = [];
  if (opt.eraseInner) {
    for (const g of groups) {
      const inG = new Set(g), seen = new Set<EdgeId>();
      for (const fid of g) { const f = k.face(fid)!; for (const r of [f.outer, ...f.holes]) for (const d of r.edges) {
        if (seen.has(d.edge)) continue; seen.add(d.edge);
        const e = k.graph.edge(d.edge);
        if (!gate(d.edge) || !e.faceLinks.every((x) => inG.has(x))) continue;   // 只擦组里的候选边（两边都在这组）
        erase.push({ id: d.edge, a: moved.get(e.a) ?? k.graph.pt(e.a), b: moved.get(e.b) ?? k.graph.pt(e.b) });
      } }
    }
  }
  return { groups, moves, erase };
}

/** 这一组拍到哪张平面。 */
function targetPlane(k: Kernel, g: readonly FaceId[], vids: readonly VertexId[], target: PlanarTarget, tau: number): Plane {
  const pts = vids.map((v) => k.graph.pt(v));
  // 朝向统一：组里各面的法向翻到和面积最大那张同侧（规范化平面的法向朝向是任意的）
  const recs = g.map((fid) => ({ fid, rec: k.planeOf(fid)!, area: faceArea(k, fid) })).sort((a, b) => b.area - a.area);
  const n0 = recs[0].rec.plane.n;
  if (target === "mode") {
    // 众数：组里各面所在的平面里，已经落在它上面（τ 内）的点最多的那张；平手 = 面积大的
    let best: Plane = { n: n0, d: recs[0].rec.plane.d }, bestN = -1;
    for (const { rec } of recs) {
      const cnt = pts.filter((p) => Math.abs(dot3(rec.plane.n, p) - rec.plane.d) <= tau).length;
      if (cnt > bestN) { bestN = cnt; best = { n: rec.plane.n, d: rec.plane.d }; }
    }
    return best;
  }
  // 中位数 / 平均数：法向 = 各面法向按面积加权平均（同侧）；位置 = 各点沿法向坐标的中位数 / 平均数
  let n = { x: 0, y: 0, z: 0 };
  for (const { rec, area } of recs) { const s = dot3(rec.plane.n, n0) < 0 ? -1 : 1; n = add3(n, scale3(rec.plane.n, s * area)); }
  n = normalize3(n);
  const ds = pts.map((p) => dot3(n, p)).sort((a, b) => a - b);
  const d = target === "median" ? (ds.length % 2 ? ds[(ds.length - 1) / 2] : (ds[ds.length / 2 - 1] + ds[ds.length / 2]) / 2) : ds.reduce((a, b) => a + b, 0) / ds.length;
  return { n, d };
}

/** 点挪到所有这些平面的公共部分上（一张 = 投影；几张 = 交替投影收敛到交线 / 交点）。 */
function onAll(p0: Pt3, pls: readonly Plane[]): Pt3 {
  let p = p0;
  const proj = (q: Pt3, pl: Plane): Pt3 => sub3(q, scale3(pl.n, dot3(pl.n, q) - pl.d));
  if (pls.length === 1) return proj(p, pls[0]);
  for (let it = 0; it < 200; it++) {
    let worst = 0;
    for (const pl of pls) { worst = Math.max(worst, Math.abs(dot3(pl.n, p) - pl.d)); p = proj(p, pl); }
    if (worst < 1e-12) break;
  }
  return p;
}

function faceArea(k: Kernel, fid: FaceId): number {
  const r = k.faceRings3(fid);
  if (!r) return 0;
  const o = r.outer;
  let c = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < o.length; i++) c = add3(c, cross3(o[i], o[(i + 1) % o.length]));
  return Math.hypot(c.x, c.y, c.z) / 2;
}

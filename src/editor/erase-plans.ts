// erase-plans.ts —— 焊边橡皮 / 软边橡皮的纯规划（零 DOM、零 editor；node 直测）。
// user 2026-10-24：「加两种橡皮……一个是边的焊接，只认边之间的点，可weld，有一个最大角度护栏……共轴就变成一个边，如果不共轴，但在角度护栏内，那么拼成长弧线」
//               「第三个橡皮是把面连成曲面的，原理一样。共面就删边，不共面就改软边，叫软边橡皮」「对焊接只认degree2同意」。
// 刮集 → 一张 op 清单（坐标寻址；焊接的边键按溶解之后的形状算好，整批一次撤销）。created 2026-10-24 by Claude Fable 5.1
import type { Kernel } from "../kernel/kernel.ts";
import type { EdgeId, Pt3, VertexId } from "../kernel/kernel.ts";
import { dot3, sub3 } from "../kernel/geom.ts";
import { type EdgeKey, edgeKey } from "./ops.ts";

export interface WeldErasePlan {
  /** 真合并（共轴）的接点坐标。 */
  dissolve: Pt3[];
  /** 焊成一条曲线的边链（每条链一个 weldEdges；边键 = 溶解之后的形状）。 */
  welds: EdgeKey[][];
  /** 转角超过护栏、没碰的接点数。 */
  tooSharp: number;
}

/** 刮集按曲线连坐（刮到弧的一段 = 整条弧参与）。 */
function withWholeCurves(k: Kernel, ids: readonly EdgeId[]): Set<EdgeId> {
  const g = k.graph, set = new Set<EdgeId>();
  for (const id of ids) {
    if (!g.hasEdge(id)) continue;
    set.add(id);
    const cid = k.curveOf(id);
    if (cid !== undefined) for (const e of k.curveById(cid)!.edges) if (g.hasEdge(e)) set.add(e);
  }
  return set;
}

/** 接点两边的转角（度）：0 = 直着过去，90 = 直角。 */
export function turnDeg(k: Kernel, vid: VertexId): number | null {
  const g = k.graph, v = g.vertex(vid);
  if (v.edges.size !== 2) return null;
  const [ea, eb] = [...v.edges];
  const pv = g.pt(vid), pa = g.pt(g.otherEnd(g.edge(ea), vid)), pb = g.pt(g.otherEnd(g.edge(eb), vid));
  const da = sub3(pa, pv), db = sub3(pb, pv);
  const la = Math.hypot(da.x, da.y, da.z), lb = Math.hypot(db.x, db.y, db.z);
  if (la === 0 || lb === 0) return null;
  const c = Math.max(-1, Math.min(1, dot3(da, db) / (la * lb)));
  return 180 - (Math.acos(c) * 180) / Math.PI;
}

/**
 * 焊边：刮集里「两边都被刮到」的二度接点——共轴 → 溶解；转角 ≤ maxDeg → 焊；更尖 → 不碰。
 * 已在同一条曲线里的接点不算（那是弧自己的段）。焊链按溶解之后的虚拟边连通分量算。
 */
export function planWeldErase(k: Kernel, scrubbed: readonly EdgeId[], maxDeg: number): WeldErasePlan {
  const g = k.graph, set = withWholeCurves(k, scrubbed);
  type VEdge = { a: VertexId; b: VertexId };
  const atV = new Map<VertexId, Set<VEdge>>();
  const link = (ve: VEdge): void => { for (const v of [ve.a, ve.b]) (atV.get(v) ?? atV.set(v, new Set()).get(v)!).add(ve); };
  const unlink = (ve: VEdge): void => { for (const v of [ve.a, ve.b]) atV.get(v)?.delete(ve); };
  // 并查集：同一条曲线的边天生一组；溶解并出的边继承两边的组；焊接点把两组并一组
  const parent = new Map<VEdge, VEdge>();
  const make = (ve: VEdge): VEdge => { parent.set(ve, ve); return ve; };
  const find = (x: VEdge): VEdge => { let r = x; while (parent.get(r) !== r) r = parent.get(r)!; let c = x; while (parent.get(c) !== r) { const n = parent.get(c)!; parent.set(c, r); c = n; } return r; };
  const union = (x: VEdge, y: VEdge): VEdge => { const rx = find(x), ry = find(y); if (rx !== ry) parent.set(rx, ry); return ry; };
  const byCurve = new Map<number, VEdge>();
  for (const id of set) {
    const e = g.edge(id); const ve = make({ a: e.a, b: e.b }); link(ve);
    const cid = k.curveOf(id);
    if (cid !== undefined) { const rep = byCurve.get(cid); if (rep) union(ve, rep); else byCurve.set(cid, ve); }
  }
  const dissolve: VertexId[] = [], weldJoints: VertexId[] = [];
  let tooSharp = 0;
  for (const [v, ves] of atV) {
    if (g.vertex(v).edges.size !== 2 || ves.size !== 2) continue;   // 只认度 2、且两边都在刮集里
    const [ea, eb] = [...g.vertex(v).edges];
    const ca = k.curveOf(ea), cb = k.curveOf(eb);
    if (ca !== undefined && ca === cb) continue;   // 同一条曲线内部的接点
    const t = turnDeg(k, v);
    if (t === null) continue;
    if (t <= 1e-6) { if (k.isBreakJunction(v)) dissolve.push(v); continue; }   // 共轴但面链接不同 / 退化三角 → 不碰
    if (t <= maxDeg + 1e-9) weldJoints.push(v); else tooSharp++;
  }
  // 虚拟溶解：v 的两条虚拟边并成 a–b（组也并）
  for (const v of dissolve) {
    const ves = [...(atV.get(v) ?? [])];
    if (ves.length !== 2) continue;
    const [x, y] = ves;
    const a = x.a === v ? x.b : x.a, b = y.a === v ? y.b : y.a;
    unlink(x); unlink(y);
    const m = make({ a, b }); link(m); union(m, x); union(m, y);
  }
  // 焊接点并组；只有经焊接点并过的组才需要 weldEdges（光溶解不焊）
  const welded = new Set<VEdge>();
  for (const v of weldJoints) {
    const ves = [...(atV.get(v) ?? [])];
    if (ves.length !== 2 || ves[0] === ves[1]) continue;
    welded.add(union(ves[0], ves[1]));
  }
  const groups = new Map<VEdge, VEdge[]>();
  for (const s of atV.values()) for (const ve of s) { const r = find(ve); if (!groups.has(r)) groups.set(r, []); const arr = groups.get(r)!; if (!arr.includes(ve)) arr.push(ve); }
  const welds: EdgeKey[][] = [];
  for (const [r, members] of groups) if (members.length >= 2 && [...welded].some((w) => find(w) === r)) welds.push(members.map((ve) => [g.pt(ve.a), g.pt(ve.b)] as EdgeKey));
  return { dissolve: dissolve.map((v) => g.pt(v)), welds, tooSharp };
}

export interface SoftErasePlan {
  /** 共面两膜之间的边 → 删边并面。 */
  erase: EdgeKey[];
  /** 二面角 ≤ maxDeg 的边 → 软边 + 平滑。 */
  soften: EdgeKey[];
  /** 二面角超过护栏、没碰的边数。 */
  tooSharp: number;
}

/** 共面判据（度）：同一平面记录的两膜二面角恰为 0；容差内的别的平面也算。 */
const COPLANAR_DEG = 0.01;

/** 软边：刮到的每条边（不按曲线连坐）——恰好两膜之间才有二面角；共面 → 删，≤ maxDeg → 软，更尖 → 不碰。 */
export function planSoftErase(k: Kernel, scrubbed: readonly EdgeId[], maxDeg: number): SoftErasePlan {
  const g = k.graph, seen = new Set<EdgeId>();
  const erase: EdgeKey[] = [], soften: EdgeKey[] = [];
  let tooSharp = 0;
  for (const id of scrubbed) {
    if (!g.hasEdge(id) || seen.has(id)) continue;
    seen.add(id);
    const a = k.dihedralDeg(id);
    if (a === null) continue;
    if (a <= COPLANAR_DEG) erase.push(edgeKey(k, id));
    else if (a <= maxDeg + 1e-9) soften.push(edgeKey(k, id));
    else tooSharp++;
  }
  return { erase, soften, tooSharp };
}

// scene/fan-normal.ts —— 扇内平滑法线（屏幕、导出、网格体导出同一个算法：屏幕上看到的 = 导出的）。created 2026-10-28 by Claude Opus 5.5
// 从 editor/pool-mesh.ts 原样搬出来（算法不变；那边的作者注释照留），因为导出（format 层）也要用：format 不许依赖 editor。
// 任何满足 FanView 的视图都能用：SU 体的内核、场景视图、网格体视图（mesh/mesh-view.ts，平滑判定 = mesh/edge-smooth.ts）。
import type { EdgeId, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { GeomView } from "./world-view.ts";
import { faceLeftSign } from "../kernel/flood.ts";

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
type RingView = { readonly vids: readonly VertexId[]; readonly edges: readonly { readonly edge: EdgeId }[] };
/** 扇内法线要看的（内核和场景视图都满足：渲染的池网格用内核、平铺路径用场景视图、网格体导出用网格视图）。 */
export type FanView = Pick<GeomView, "face" | "planeOf" | "isSmooth" | "isFold"> & { readonly graph: Pick<GeomView["graph"], "pt" | "edge"> };

/** 环上第 j 个顶点的内角（三维）。 */
function cornerAngle(k: FanView, ring: RingView, j: number): number {
  const m = ring.vids.length, g = k.graph;
  const p = g.pt(ring.vids[j]), u = sub(g.pt(ring.vids[(j - 1 + m) % m]), p), v = sub(g.pt(ring.vids[(j + 1) % m]), p);
  const lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
  return lu > 0 && lv > 0 ? Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (lu * lv)))) : 0;
}
/** 面在顶点 v 处、边 e 之外的另一条环边（vids[i] = edges[i] 的起点）。 */
function otherEdgeAt(k: FanView, fid: FaceId, e: EdgeId, v: VertexId): EdgeId | null {
  const f = k.face(fid);
  if (!f) return null;
  for (const r of [f.outer, ...f.holes]) {
    const m = r.edges.length;
    for (let i = 0; i < m; i++) {
      if (r.edges[i].edge !== e) continue;
      if (r.vids[i] === v) return r.edges[(i - 1 + m) % m].edge;
      if (r.vids[(i + 1) % m] === v) return r.edges[(i + 1) % m].edge;
    }
  }
  return null;
}
/**
 * 面 fid 外环第 j 个角的平滑法线：从这张面出发，在这个顶点处向两边跨平滑边 / 折线（硬边、边界、非流形就停），把扇里每张面的法向按内角加权；
 * 跨边时按「两张面在共享边上面在左的符号相反 = 朝向一致」统一朝向（kernel/flood.ts faceLeftSign）。结果翻到本面法向那一侧。扇里只有自己 = 平面法向。
 */
export function fanNormal(k: FanView, fid: FaceId, j: number): Pt3 {
  const f = k.face(fid)!, n = k.planeOf(fid)!.plane.n, ring = f.outer, m = ring.vids.length, v = ring.vids[j];
  const w0 = cornerAngle(k, ring, j);
  let ax = n.x * w0, ay = n.y * w0, az = n.z * w0, crossed = false;
  const seen = new Set<FaceId>([fid]);
  for (const start of [ring.edges[j].edge, ring.edges[(j - 1 + m) % m].edge]) {
    let cur = fid, sign = 1, e = start;
    for (let step = 0; step < 256; step++) {
      if (!(k.isSmooth(e) || k.isFold(e))) break;
      const others = [...new Set(k.graph.edge(e).faceLinks)].filter((x) => x !== cur && k.face(x));
      if (others.length !== 1) break;
      const nx = others[0];
      if (seen.has(nx)) break;
      const la = faceLeftSign(k, cur, e), lb = faceLeftSign(k, nx, e);
      if (la === null || lb === null) break;
      sign *= la * lb < 0 ? 1 : -1;
      seen.add(nx); crossed = true;
      const F = k.face(nx)!, rn = k.planeOf(nx)!.plane.n, jj = F.outer.vids.indexOf(v);
      if (jj >= 0) { const w = cornerAngle(k, F.outer, jj) * sign; ax += rn.x * w; ay += rn.y * w; az += rn.z * w; }
      const ne = otherEdgeAt(k, nx, e, v);
      if (ne === null) break;
      e = ne; cur = nx;
    }
  }
  if (!crossed) return n;
  const l = Math.hypot(ax, ay, az);
  if (l < 1e-12) return n;
  const s = (ax * n.x + ay * n.y + az * n.z) < 0 ? -1 / l : 1 / l;
  return { x: ax * s, y: ay * s, z: az * s };
}

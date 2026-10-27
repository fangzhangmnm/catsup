// snap-grid.ts —— 修复指令「吸到格点…」的规划：纯函数（零 DOM，node 直测）。纪元排期 T8 / 账本 DT4。created 2026-10-26 by Claude Opus 5.5
// user 拍过的（10-25 / 10-26）：名字「吸到格点…」；作用范围 = 有选区只对选中的、没选 = 整个物体，默认含子物体（DT85，和焊接断口 / 拍平同一套）；
//   坐标系默认按**物体自己的坐标架**吸（组件实例转了 30°，按世界格点吸会改它的定义，别的实例就离格了），世界格点是选项；
//   格子 = 文档的格距 ÷ 细分（和画图时吸附的格点同一套）；不破面，折缝默认软边、可选硬边（「估计没人用」）。
// AI 加的一条默认（默认 + 披露，user 没拍）：圆 / 弧整条按圆心平移吸上格点（保持是圆——轮子上的点逐个吸会把小圆吸成歪多边形），开关「曲线上的点也逐个吸」。
//   曲线只有一部分在范围里 → 那些点不动（整条平移会动到范围外的点，逐个吸会把圆吸歪），提示里报出来。
// 不破面的退路在执行那边（ops.ts snapToGrid）：先在拷贝上试吸，会破的面先在原平面里三角化（三角永远是平的），对角线和折缝同样的层，再真吸。
import type { EdgeId, FaceId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";
import { type Xform, applyPt, invert } from "../../../scene/xform.ts";
import { triangulateRings } from "../../../format/triangulate.ts";

export type SnapCurves = "rigid" | "points";
export interface GridSnapOptions {
  /** 格子边长（格子坐标里，米）。 */ step: number; curves: SnapCurves;
  /** 拉正（DT101）：和格子三根轴差这么多度以内的边拉正（两端点在那根轴上的坐标拉成一样）；缺 = 不拉正。 */ straighten?: number;
  /** 吸格点；缺 = 吸（老 op 只有吸格点）。 */ grid?: boolean;
}
export interface GridSnapPlan {
  /** 挪点（id → 新位置，池本地坐标）；本来就在格点上的不在里面。按 id 排好（确定）。 */
  moves: { id: VertexId; to: Pt3 }[];
  /** 整条平移、保持是圆的曲线条数。 */
  curves: number;
  /** 曲线只有一部分在范围里、因此没动的点。 */
  skipped: number;
  /** 整条平移的曲线上的点：执行时单独一批先挪（内核挪点：一批里有点合并 = 这批挪过的曲线都不再算圆，别处的合并不能连累它们）。 */
  rigid: ReadonlySet<VertexId>;
  /** 拉正：被拉成一样的坐标有几个（点 × 轴；披露用）。 */
  aligned: number;
}

const EPS_MOVE = 1e-9;
const AX = ["x", "y", "z"] as const;

/** 一伙点在一根轴上取哪个值：多数点已经共用的那个（1 µm 内算同一个，至少两个点、且比第二多）；没有就取中位数。 */
function clusterValue(vals: number[]): number {
  const buckets = new Map<number, number[]>();
  for (const v of vals) { const b = Math.round(v * 1e6); const a = buckets.get(b); if (a) a.push(v); else buckets.set(b, [v]); }
  const ranked = [...buckets.values()].sort((a, b) => b.length - a.length);
  if (ranked[0].length >= 2 && (ranked.length === 1 || ranked[0].length > ranked[1].length)) return ranked[0].reduce((x, y) => x + y, 0) / ranked[0].length;
  const s = [...vals].sort((a, b) => a - b);
  return s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2;
}

/**
 * 规划：scope = 只看这些点（null = 池里全部）；lattice = 池本地坐标 → 格子坐标的仿射变换（格点 = 三个分量都是 step 的整数倍）。
 * 物体自己的坐标架 → lattice = 坐标架的逆；世界格点 → lattice = 池到世界的变换。
 * 拉正（opt.straighten，DT101，user「拉正 好想要，比snap更好……这个可以和snap合租。就是可以拉正不snap之类的？」）在格子坐标里逐根轴做：
 *   一条边和这根轴几乎垂直（差 straighten° 以内）→ 两端点在这根轴上的坐标该一样（几乎竖直的边 → x、y 一样；几乎水平的边 → z 一样）；
 *   这样连成伙，每伙取同一个值（clusterValue）。范围外连着的点 = 锚：伙里有锚就取锚的值、锚不动。
 *   圆 / 弧整条看：只在它法向最贴近的那根轴上拉平（不按每段的方向拉，免得把圆拉歪）。
 *   拉正和吸格点一起做 = 先拉正、再把拉正后的坐标吸上格点（圆 / 弧整条平移时按拉正后的圆心吸）。
 */
export function planGridSnap(k: Kernel, scope: readonly VertexId[] | null, lattice: Xform, opt: GridSnapOptions): GridSnapPlan {
  const g = k.graph, inv = invert(lattice), s = opt.step, grid = opt.grid !== false;
  const toQ = (p: Pt3): Pt3 => applyPt(lattice, p);
  const snapQ = (q: Pt3): Pt3 => ({ x: Math.round(q.x / s) * s, y: Math.round(q.y / s) * s, z: Math.round(q.z / s) * s });
  const vs = new Set<VertexId>(scope ? scope.filter((v) => g.hasVertex(v)) : k.vertices().map((v) => v.id));
  // 曲线：整条在范围里的 / 只有一部分在范围里的（那部分点不动）
  const skip = new Set<VertexId>(), whole: { verts: VertexId[]; center: Pt3; normal: Pt3; edges: EdgeId[] }[] = [];
  const curveOfEdge = new Map<EdgeId, number>();
  for (const c of k.curves()) {
    if ((c.kind !== "circle" && c.kind !== "arc") || !c.params) continue;
    const cv = new Set<VertexId>(), es: EdgeId[] = [];
    for (const e of c.edges) if (g.hasEdge(e)) { const E = g.edge(e); cv.add(E.a); cv.add(E.b); es.push(e); }
    const inScope = [...cv].filter((v) => vs.has(v));
    if (!inScope.length) continue;
    if (inScope.length < cv.size) { for (const v of inScope) skip.add(v); continue; }
    for (const e of es) curveOfEdge.set(e, whole.length);
    whole.push({ verts: [...cv].sort((a, b) => a - b), center: c.params.center, normal: c.params.normal, edges: es });
  }
  const movable = (v: VertexId): boolean => vs.has(v) && !skip.has(v);
  const Q = new Map<VertexId, Pt3>();
  for (const v of vs) if (!skip.has(v)) Q.set(v, toQ(g.pt(v)));
  let aligned = 0;
  if (opt.straighten !== undefined && opt.straighten > 0) {
    const sinT = Math.sin((opt.straighten * Math.PI) / 180), cosT = Math.cos((opt.straighten * Math.PI) / 180);
    const curveN = whole.map((c) => { const a = toQ(c.center), b = toQ({ x: c.center.x + c.normal.x, y: c.center.y + c.normal.y, z: c.center.z + c.normal.z }); const d = { x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, l = Math.hypot(d.x, d.y, d.z) || 1; return { x: d.x / l, y: d.y / l, z: d.z / l }; });
    const edges = new Set<EdgeId>();
    for (const v of Q.keys()) for (const e of g.vertex(v).edges) edges.add(e);
    const sorted = [...edges].sort((a, b) => a - b);
    for (const ax of AX) {
      const parent = new Map<VertexId, VertexId>();
      const find = (x: VertexId): VertexId => { let r = x; while (parent.has(r) && parent.get(r) !== r) r = parent.get(r)!; let y = x; while (parent.has(y) && parent.get(y) !== r) { const n = parent.get(y)!; parent.set(y, r); y = n; } return r; };
      const union = (a: VertexId, b: VertexId): void => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(Math.max(ra, rb), Math.min(ra, rb)); };
      for (const e of sorted) {
        const E = g.edge(e);
        if (!movable(E.a) && !movable(E.b)) continue;
        const ci = curveOfEdge.get(e);
        if (ci !== undefined) { if (Math.abs(curveN[ci][ax]) < cosT) continue; }
        else { const qa = toQ(g.pt(E.a)), qb = toQ(g.pt(E.b)), d = { x: qb.x - qa.x, y: qb.y - qa.y, z: qb.z - qa.z }, L = Math.hypot(d.x, d.y, d.z); if (L < 1e-12 || Math.abs(d[ax]) > sinT * L) continue; }
        union(E.a, E.b);
      }
      const groups = new Map<VertexId, VertexId[]>();
      for (const v of parent.keys()) { const r = find(v); const a = groups.get(r); if (a) a.push(v); else groups.set(r, [v]); }
      for (const mem of groups.values()) {
        const mov = mem.filter(movable);
        if (!mov.length || mem.length < 2) continue;
        const anchors = mem.filter((v) => !movable(v));
        const val = clusterValue((anchors.length ? anchors : mem).map((v) => (Q.get(v) ?? toQ(g.pt(v)))[ax]));
        for (const v of mov) { const q = Q.get(v)!; if (Math.abs(q[ax] - val) > EPS_MOVE) aligned++; Q.set(v, { ...q, [ax]: val }); }
      }
    }
  }
  const target = new Map<VertexId, Pt3>();
  let curves = 0;
  if (grid && opt.curves === "rigid") {
    for (const c of whole) {
      // 圆心跟着拉正平移的量走（各点挪动的平均），再按格点吸；整条一起平移 = 保持是圆
      let sx = 0, sy = 0, sz = 0;
      for (const v of c.verts) { const q0 = toQ(g.pt(v)), q = Q.get(v)!; sx += q.x - q0.x; sy += q.y - q0.y; sz += q.z - q0.z; }
      const n = c.verts.length, cq = toQ(c.center), c1 = { x: cq.x + sx / n, y: cq.y + sy / n, z: cq.z + sz / n }, cs = snapQ(c1);
      const d = { x: cs.x - c1.x, y: cs.y - c1.y, z: cs.z - c1.z };
      for (const v of c.verts) if (!target.has(v)) { const q = Q.get(v)!; target.set(v, { x: q.x + d.x, y: q.y + d.y, z: q.z + d.z }); }
      curves++;
    }
  }
  for (const [v, q] of Q) if (!target.has(v)) target.set(v, grid ? snapQ(q) : q);
  // 整条平移的曲线（各点挪得一样）单独一批先挪
  const rigid = new Set<VertexId>();
  for (const c of whole) {
    const ds = c.verts.map((v) => { const p = g.pt(v), t = applyPt(inv, target.get(v)!); return { x: t.x - p.x, y: t.y - p.y, z: t.z - p.z }; });
    if (ds.every((d) => Math.abs(d.x - ds[0].x) + Math.abs(d.y - ds[0].y) + Math.abs(d.z - ds[0].z) < 1e-9)) for (const v of c.verts) rigid.add(v);
  }
  const moves: GridSnapPlan["moves"] = [];
  for (const [id, q] of [...target].sort((a, b) => a[0] - b[0])) { const p = g.pt(id), to = applyPt(inv, q); if (Math.abs(to.x - p.x) + Math.abs(to.y - p.y) + Math.abs(to.z - p.z) > EPS_MOVE) moves.push({ id, to }); }
  let skipped = 0;
  for (const v of skip) if (!target.has(v)) skipped++;
  return { moves, curves, skipped, rigid, aligned };
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

// repairs/fill-holes/plan.ts —— 修复「补洞」的规划：纯函数（零 DOM，node 直测）。纪元账本 DT103 / 排期 T17。created 2026-10-26 by Claude Opus 5.5
// user 10-26：「补洞可以。但是我们数据契约不是不分正反面的吗」（→「正面朝外」撤：契约 §7 面无朝向）。
// 洞 = 「只挂一张面的边」围成的一个简单闭环（每个点在这圈里恰好连两条），在一个平面上，并且环外挂着的那些面**都不和这个环同平面**
//   （盒子缺了顶：四周是竖墙 → 补；平板上挖出来的洞：旁边的面和洞同平面 → 是故意挖的，不补）。
// 补法 = 沿这圈边重描一遍（核心指令 addEdges）：结算机给没主的胞腔长面（和 SketchUp 描一下边就补上面同一个道理）。
// AI 定的（默认 + 披露，user 没拍）：缠在一起的环（某个点连着三条以上这样的边）、不在一个平面上的环都不补，报出来；没面的线框（挂零张面）不算洞。
import type { EdgeId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";
import { COPLANAR_TOL_DEFAULT } from "../../../kernel/geom.ts";

export interface HolePlan {
  /** 要补的环（按点的顺序，池本地坐标）；按环里最小的边 id 排（确定）。 */
  loops: Pt3[][];
  /** 没补的：不在一个平面上 / 缠在一起。 */
  skipped: number;
}

/** 「环外的面和环同平面」的门槛：法向夹角 1° 以内算同平面（量纲：度；和拍平 / 检查是各自的量）。 */
const SAME_PLANE_DEG = 1;

/** scopeEdges 有 = 只要碰到这些边的环。 */
export function planHoles(k: Kernel, scopeEdges: ReadonlySet<EdgeId> | null): HolePlan {
  const g = k.graph, tau = Math.max(COPLANAR_TOL_DEFAULT, k.coplanarTol), cosSame = Math.cos((SAME_PLANE_DEG * Math.PI) / 180);
  const border = k.edges().filter((e) => new Set(e.faceLinks).size === 1).map((e) => e.id).sort((a, b) => a - b);
  const deg = new Map<VertexId, EdgeId[]>();
  for (const id of border) { const E = g.edge(id); for (const v of [E.a, E.b]) { const a = deg.get(v); if (a) a.push(id); else deg.set(v, [id]); } }
  const seen = new Set<EdgeId>(), loops: Pt3[][] = [];
  let skipped = 0;
  for (const start of border) {
    if (seen.has(start)) continue;
    // 这一团：经点连着的边界边
    const comp: EdgeId[] = [], stack = [start];
    seen.add(start);
    while (stack.length) { const e = stack.pop()!; comp.push(e); const E = g.edge(e); for (const v of [E.a, E.b]) for (const e2 of deg.get(v)!) if (!seen.has(e2)) { seen.add(e2); stack.push(e2); } }
    if (scopeEdges && !comp.some((e) => scopeEdges.has(e))) continue;
    const verts = new Set<VertexId>(); for (const e of comp) { const E = g.edge(e); verts.add(E.a); verts.add(E.b); }
    if (comp.length < 3 || [...verts].some((v) => deg.get(v)!.length !== 2)) { skipped++; continue; }   // 缠在一起 / 不成环
    // 顺着走一圈
    const order: VertexId[] = [], used = new Set<EdgeId>();
    let e = Math.min(...comp), v = g.edge(e).a;
    for (let i = 0; i < comp.length; i++) { order.push(v); used.add(e); const E = g.edge(e); v = E.a === v ? E.b : E.a; e = deg.get(v)!.find((x) => !used.has(x)) ?? e; }
    const pts = order.map((x) => g.pt(x));
    // 平面（Newell）+ 都在 τ 内
    let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; nx += (a.y - b.y) * (a.z + b.z); ny += (a.z - b.z) * (a.x + b.x); nz += (a.x - b.x) * (a.y + b.y); }
    const L = Math.hypot(nx, ny, nz);
    if (L < 1e-12) { skipped++; continue; }
    const n = { x: nx / L, y: ny / L, z: nz / L }, d = pts.reduce((s, p) => s + n.x * p.x + n.y * p.y + n.z * p.z, 0) / pts.length;
    if (pts.some((p) => Math.abs(n.x * p.x + n.y * p.y + n.z * p.z - d) > tau)) { skipped++; continue; }
    // 环外挂着的面和环同平面 = 故意挖的洞，不补
    const sameplane = comp.some((id) => { const f = g.edge(id).faceLinks[0], rec = k.planeOf(f); return !!rec && Math.abs(rec.plane.n.x * n.x + rec.plane.n.y * n.y + rec.plane.n.z * n.z) >= cosSame; });
    if (sameplane) continue;
    loops.push(pts);
  }
  return { loops, skipped };
}

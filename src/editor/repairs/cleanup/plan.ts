// repairs/cleanup/plan.ts —— 修复「清理碎渣」的规划：纯函数（零 DOM，node 直测）。纪元账本 DT102 / 排期 T18。created 2026-10-26 by Claude Opus 5.5
// user 10-26：「清理碎渣」「其实我ex做的那个sketchup是超级地狱，我清理了三天也没清理干净，等我以后找到了我给你感受一下」——真样本等 user；先做最常见的三条
// （SketchUp 常用清理插件 CleanUp³ 的默认项），每条能单独关：
//   ① 悬空的线：一张面都没挂的边；② 很短的边：短于 len 的边连成伙、并成一个点（留连边最多的那个点）；
//   ③ 同一平面上被线切碎的面并回去：两边是同一平面、两侧材质都一样的边（圆 / 弧曲线上的、隐藏的不碰；画在面上没推拉、涂了别的颜色的线框不碰）；
//      看不见的软边默认也算（v0.14.70，user「不要因为性能静默不做，宁愿弹警告问yes no。诚实性问题」——以前为了快默认不碰）；大物体上擦线很慢
//      （坦克实测：每擦一次内核整理一遍整个物体，3.2 万面一次约 95 s，和擦几条几乎无关，家族周账 F-97 ①）→ 修复框架先问 user。
//      很短的边默认不并（三角网上并短边容易破面：坦克上试一次破 106 张）。
import type { EdgeId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";

/** 范围：边 id 集（有选区 = 选中的边 + 选中面的环边）；null = 整个池。 */
export type EdgeScope = ReadonlySet<EdgeId> | null;
const inScope = (scope: EdgeScope, e: EdgeId): boolean => !scope || scope.has(e);

/** ① 悬空的线：一张面都没挂的边。 */
export function strayEdges(k: Kernel, scope: EdgeScope): EdgeId[] {
  return k.edges().filter((e) => e.faceLinks.length === 0 && inScope(scope, e.id)).map((e) => e.id).sort((a, b) => a - b);
}

/** ② 很短的边连成的伙：每伙并成一个点（保留连边最多的点，平手留 id 小的）。返回挪点（id → 新位置），按 id 排。 */
export function tinyEdgeMoves(k: Kernel, scope: EdgeScope, len: number): { moves: { id: VertexId; to: Pt3 }[]; clusters: number } {
  if (!(len > 0)) return { moves: [], clusters: 0 };
  const g = k.graph, parent = new Map<VertexId, VertexId>();
  const find = (x: VertexId): VertexId => { while (parent.get(x) !== x) { const p = parent.get(x)!; parent.set(x, parent.get(p)!); x = p; } return x; };
  for (const e of k.edges()) {
    if (!inScope(scope, e.id)) continue;
    const a = g.pt(e.a), b = g.pt(e.b);
    if (Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) >= len) continue;
    for (const v of [e.a, e.b]) if (!parent.has(v)) parent.set(v, v);
    const ra = find(e.a), rb = find(e.b);
    if (ra !== rb) parent.set(Math.max(ra, rb), Math.min(ra, rb));
  }
  const groups = new Map<VertexId, VertexId[]>();
  for (const v of parent.keys()) { const r = find(v); const a = groups.get(r); if (a) a.push(v); else groups.set(r, [v]); }
  const moves: { id: VertexId; to: Pt3 }[] = [];
  let clusters = 0;
  for (const mem of groups.values()) {
    if (mem.length < 2) continue;
    clusters++;
    const keep = [...mem].sort((x, y) => (g.vertex(y).edges.size - g.vertex(x).edges.size) || (x - y))[0], to = g.pt(keep);
    for (const v of mem) if (v !== keep) moves.push({ id: v, to: { ...to } });
  }
  return { moves: moves.sort((a, b) => a.id - b.id), clusters };
}

/** ③ 同一平面上切碎面的内线：恰好两张面、两张面同一平面、两侧材质都一样；曲线上的、隐藏的不算；soft = 看不见的软边也算（缺 = 不算）。 */
export function coplanarInnerEdges(k: Kernel, scope: EdgeScope, opt: { soft?: boolean } = {}): EdgeId[] {
  const out: EdgeId[] = [];
  for (const e of k.edges()) {
    if (!inScope(scope, e.id)) continue;
    const fl = [...new Set(e.faceLinks)];
    if (fl.length !== 2 || k.curveOf(e.id) !== undefined || k.isEdgeHidden(e.id) || (!opt.soft && k.isSoft(e.id))) continue;
    const [f1, f2] = fl.map((f) => k.face(f));
    if (!f1 || !f2 || f1.planeId !== f2.planeId) continue;
    if (k.faceMaterialOf(fl[0], 0) !== k.faceMaterialOf(fl[1], 0) || k.faceMaterialOf(fl[0], 1) !== k.faceMaterialOf(fl[1], 1)) continue;
    out.push(e.id);
  }
  return out.sort((a, b) => a - b);
}

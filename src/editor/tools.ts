// tools.ts —— 工具动词的纯逻辑层（DOM-free，node 可测）；main.ts 只做指针事件接线。
// 验收①在工具层的体现：rectSegments 只产出线段，Rect = kernel.addEdges(4 段)，
// 全链路无任何 Face 构造。

import type { Edge, EdgeId, Face, FaceId, Kernel, Pt, Pt3, VertexId } from "../kernel/kernel.ts";
import type { CurveParams, CurveSpec } from "../kernel/kernel.ts";
import { applyPt, type Xform } from "../scene/xform.ts";
import { liftFromPlane, projectToPlane, type PlaneParams, add3, sub3, scale3, dist3, normalize3, len3, cross3 } from "../kernel/geom.ts";

/** Rect 工具（任意平面版）：对角两点（须在平面上）→ 4 条边。退化 → []。 */
export function rectSegmentsOnPlane(
  plane: PlaneParams,
  basis: { u: Pt3; v: Pt3 },
  a3: Pt3,
  b3: Pt3,
): [Pt3, Pt3][] {
  const a = projectToPlane(a3, basis), b = projectToPlane(b3, basis);
  if (Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9) return [];
  const c = (x: number, y: number): Pt3 => liftFromPlane({ x, y }, plane, basis);
  const p1 = c(a.x, a.y), p2 = c(b.x, a.y), p3 = c(b.x, b.y), p4 = c(a.x, b.y);
  return [[p1, p2], [p2, p3], [p3, p4], [p4, p1]];
}

/**
 * Arc 工具（0.10，SU 两点 + 凸度）：起点 a、终点 b、弧上一点 p（都在平面上）→ 过三点的圆上从 a 到 b 经过 p 的那段弧，n 段。
 * 三点共线 / 太近 → null。返回段 + 圆参数（sweep 带号：正 = 绕法向逆时针）。added 2026-10-24 by Claude Fable 5.1
 */
export function arcSegmentsOnPlane(
  plane: PlaneParams,
  basis: { u: Pt3; v: Pt3 },
  a3: Pt3,
  b3: Pt3,
  p3: Pt3,
  n = 12,
): { segs: [Pt3, Pt3][]; center: Pt3; radius: number; sweep: number } | null {
  const a = projectToPlane(a3, basis), b = projectToPlane(b3, basis), p = projectToPlane(p3, basis);
  const d = 2 * (a.x * (b.y - p.y) + b.x * (p.y - a.y) + p.x * (a.y - b.y));
  if (Math.abs(d) < 1e-12 || n < 1) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, p2 = p.x * p.x + p.y * p.y;
  const cx = (a2 * (b.y - p.y) + b2 * (p.y - a.y) + p2 * (a.y - b.y)) / d;
  const cy = (a2 * (p.x - b.x) + b2 * (a.x - p.x) + p2 * (b.x - a.x)) / d;
  const r = Math.hypot(a.x - cx, a.y - cy);
  if (r < 1e-9) return null;
  const TAU = Math.PI * 2;
  const ta = Math.atan2(a.y - cy, a.x - cx), tb = Math.atan2(b.y - cy, b.x - cx), tp = Math.atan2(p.y - cy, p.x - cx);
  const ccwTo = (t: number): number => ((t - ta) % TAU + TAU) % TAU;
  const sAB = ccwTo(tb) || TAU, sAP = ccwTo(tp);
  const sweep = sAP <= sAB ? sAB : sAB - TAU;   // p 在逆时针路上 → 走逆时针，否则走顺时针（负）
  const pts: Pt3[] = [];
  for (let i = 0; i <= n; i++) { const t = ta + (sweep * i) / n; pts.push(liftFromPlane({ x: cx + r * Math.cos(t), y: cy + r * Math.sin(t) }, plane, basis)); }
  const segs: [Pt3, Pt3][] = [];
  for (let i = 0; i < n; i++) segs.push([pts[i], pts[i + 1]]);
  return { segs, center: liftFromPlane({ x: cx, y: cy }, plane, basis), radius: r, sweep };
}

/** 面的外环若恰是一条闭合圆曲线 → 它的圆参数（换到世界系：圆心经 m，方向经两点之差，半径按变换后距离）；否则 null。（纯函数，node 直测） */
export function circleOfFace(k: Kernel, face: FaceId, m: Xform): CurveParams | null {
  const f = k.face(face);
  if (!f || f.holes.length) return null;
  const cid = k.curveOf(f.outer.edges[0].edge);
  if (cid === undefined) return null;
  const c = k.curveById(cid);
  if (!c || !c.closed || c.kind !== "circle" || !c.params) return null;
  if (f.outer.edges.length !== c.edges.length || f.outer.edges.some((d) => k.curveOf(d.edge) !== cid)) return null;
  const p = c.params, c0 = applyPt(m, p.center);
  const dir = (d: Pt3): Pt3 => normalize3(sub3(applyPt(m, add3(p.center, d)), c0));
  const radius = dist3(applyPt(m, add3(p.center, scale3(normalize3(p.xaxis), p.radius))), c0);
  return { center: c0, radius, normal: dir(p.normal), xaxis: dir(p.xaxis), segments: p.segments };
}

/** 偏移一个圆（d > 0 = 向内）：同圆心同法向、半径 r − d 的新圆；塌没了 → null。 */
export function offsetCircleSpec(params: CurveParams, d: number): CurveSpec | null {
  const radius = params.radius - d;
  if (!(radius > 1e-6)) return null;
  return { kind: "circle", closed: true, params: { ...params, radius } };
}

/** 曲线规格换到池本地坐标：点经 toLocal，方向经两点之差，半径按两点距离（池有缩放时跟着缩）。 */
/** 圆的曲线规格（世界系 → 池本地）：圆心、半径、法向、x 轴指向半径点、段数。画圆与数值小窗重做共用。 */
export function circleCurveSpec(toLocal: (p: Pt3) => Pt3, center: Pt3, rim: Pt3, plane: { plane: { n: Pt3 } }, segments: number): CurveSpec {
  const dx = rim.x - center.x, dy = rim.y - center.y, dz = rim.z - center.z, r = Math.hypot(dx, dy, dz) || 1;
  return curveSpecToLocal(toLocal, { kind: "circle", closed: true, params: { center, radius: Math.hypot(dx, dy, dz), normal: plane.plane.n, xaxis: { x: dx / r, y: dy / r, z: dz / r }, segments } });
}
export function curveSpecToLocal(toLocal: (p: Pt3) => Pt3, spec: CurveSpec): CurveSpec {
  if (!spec.params) return spec;
  const p = spec.params, c = toLocal(p.center);
  const dir = (d: Pt3): Pt3 => normalize3(sub3(toLocal(add3(p.center, d)), c));
  const radius = dist3(toLocal(add3(p.center, scale3(normalize3(p.xaxis), p.radius))), c);
  return { ...spec, params: { center: c, radius, normal: dir(p.normal), xaxis: dir(p.xaxis), segments: p.segments } };
}

/** Circle 工具：圆心 + 半径点（都在平面上）→ n 段正多边形（SU 默认 24 段；第一个顶点在半径点方向）。退化 → []。added 2026-10-21 */
export function circleSegmentsOnPlane(
  plane: PlaneParams,
  basis: { u: Pt3; v: Pt3 },
  c3: Pt3,
  r3: Pt3,
  n = 24,
): [Pt3, Pt3][] {
  const c = projectToPlane(c3, basis), r = projectToPlane(r3, basis);
  const radius = Math.hypot(r.x - c.x, r.y - c.y);
  if (radius < 1e-9 || n < 3) return [];
  const a0 = Math.atan2(r.y - c.y, r.x - c.x);
  const pts: Pt3[] = [];
  for (let i = 0; i < n; i++) {
    const a = a0 + (2 * Math.PI * i) / n;
    pts.push(liftFromPlane({ x: c.x + radius * Math.cos(a), y: c.y + radius * Math.sin(a) }, plane, basis));
  }
  return pts.map((p, i) => [p, pts[(i + 1) % n]] as [Pt3, Pt3]);
}

/** Rect 工具（2D/俯视版，测试与验收①沿用）：对角两点 → 4 条边（轴对齐）。退化 → []。 */
export function rectSegments(a: Pt, b: Pt): [Pt, Pt][] {
  if (Math.abs(a.x - b.x) < 1e-9 || Math.abs(a.y - b.y) < 1e-9) return [];
  const p1 = { x: a.x, y: a.y }, p2 = { x: b.x, y: a.y }, p3 = { x: b.x, y: b.y }, p4 = { x: a.x, y: b.y };
  return [[p1, p2], [p2, p3], [p3, p4], [p4, p1]];
}

export interface Marquee { minX: number; minY: number; maxX: number; maxY: number; }
export function marqueeOf(a: Pt, b: Pt): Marquee {
  return { minX: Math.min(a.x, b.x), minY: Math.min(a.y, b.y), maxX: Math.max(a.x, b.x), maxY: Math.max(a.y, b.y) };
}

/** 选区：内核实体（边 / 面）+ 活动池的参考几何 id（A31，2026-10-24 Opus：参考线 / 参考点能被选择工具选中、Delete 删）。 */
export interface Selection { edges: Set<EdgeId>; faces: Set<FaceId>; guides: Set<number>; }
export const emptySelection = (): Selection => ({ edges: new Set(), faces: new Set(), guides: new Set() });

/** 移动工具的目标展开：顶点→自己；边→两端点；面→外环+洞环全部顶点。 */
export function moveTargets(k: Kernel, hit: { vertex?: VertexId; edge?: EdgeId; face?: FaceId }): VertexId[] {
  if (hit.vertex !== undefined) return [hit.vertex];
  if (hit.edge !== undefined) {
    const e = k.graph.edge(hit.edge);
    return [e.a, e.b];
  }
  if (hit.face !== undefined) {
    const f = k.face(hit.face);
    if (!f) return [];
    const ids = new Set<VertexId>();
    for (const ring of [f.outer, ...f.holes]) {
      for (const d of ring.edges) {
        const e = k.graph.edge(d.edge);
        ids.add(e.a); ids.add(e.b);
      }
    }
    return [...ids];
  }
  return [];
}

/** 批量平移：目标顶点集整体位移 delta（moveVertices 一批收口；z 缺省 0）。 */
export function translateMoves(
  k: Kernel,
  vids: readonly VertexId[],
  delta: { x: number; y: number; z?: number },
): { id: VertexId; to: { x: number; y: number; z: number } }[] {
  return vids
    .filter((id) => k.graph.hasVertex(id))
    .map((id) => {
      const p = k.graph.pt(id);
      return { id, to: { x: p.x + delta.x, y: p.y + delta.y, z: p.z + (delta.z ?? 0) } };
    });
}

/** 多选混移展开（SU 同款：线/面混选合法）：选区全部实体 → 顶点并集。added by Claude Fable 5 2026-09-01 */
export function moveTargetsSelection(k: Kernel, sel: Selection): VertexId[] {
  const ids = new Set<VertexId>();
  for (const eid of sel.edges) {
    if (!k.graph.hasEdge(eid)) continue;
    const e = k.graph.edge(eid);
    ids.add(e.a); ids.add(e.b);
  }
  for (const fid of sel.faces) for (const vid of moveTargets(k, { face: fid })) ids.add(vid);
  return [...ids];
}

/** 类型 re-export 便利（main.ts 少一层 import）。 */
export type { Edge, Face };


// ---------- 工具自带的推断目标（B22，2026-10-24，Claude Fable 5.1；接口 = solver.ts ToolTarget）----------
import type { ToolTarget } from "./solver.ts";
import { RANK as _RANK } from "./solver.ts";
const PHI = (1 + Math.sqrt(5)) / 2;
export { snapDirectionInPlane } from "./increments.ts";   // 搬到 increments.ts（2026-10-25：整格 / 整角吸附一处）
/** 矩形第二点：从首点出发的两条对角线 = 正方形（秩同轴线）；四条黄金分割线（稍低）。 */
export function rectToolTargets(anchor: Pt3, basis: { u: Pt3; v: Pt3 }): ToolTarget[] {
  const { u, v } = basis;
  const line = (dir: Pt3, label: string, rank: number): ToolTarget => ({ locus: { dim: 1, a: anchor, dir: normalize3(dir) }, rank, label, src: anchor });
  return [
    line(add3(u, v), "正方形", _RANK.axisLine), line(sub3(u, v), "正方形", _RANK.axisLine),
    line(add3(scale3(u, PHI), v), "黄金分割", _RANK.axisLine - 3), line(add3(u, scale3(v, PHI)), "黄金分割", _RANK.axisLine - 3),
    line(sub3(scale3(u, PHI), v), "黄金分割", _RANK.axisLine - 3), line(sub3(u, scale3(v, PHI)), "黄金分割", _RANK.axisLine - 3),
  ];
}
/** 两点弧第三点（凸度）：弦中垂线上离弦 |AB|/2 的两个点 = 半圆。 */
export function arcToolTargets(a: Pt3, b: Pt3, n: Pt3): ToolTarget[] {
  const mid = scale3(add3(a, b), 0.5), ab = sub3(b, a), r = len3(ab) / 2;
  if (r < 1e-9) return [];
  const perp = normalize3(cross3(n, ab));
  return [
    { locus: { dim: 0, p: add3(mid, scale3(perp, r)) }, rank: _RANK.intersection, label: "半圆" },
    { locus: { dim: 0, p: sub3(mid, scale3(perp, r)) }, rank: _RANK.intersection, label: "半圆" },
  ];
}

// ---------------- 形状批（2026-10-24；user「中心rect和旋转rect还是要……几种arc模式也看一下」）：纯几何，node 直测 ----------------

/** 带号角度的连续化：raw ∈ (−π, π] 加减 2π 使其离 prev 最近（圆心弧 / 旋转一直转过 180° 不跳）。 */
export function unwrapAngle(prev: number, raw: number): number {
  const TAU = Math.PI * 2;
  let a = raw;
  while (a - prev > Math.PI) a -= TAU;
  while (prev - a > Math.PI) a += TAU;
  return a;
}

/** 圆心弧（SU Arc / Pie）：圆心 c、起点 a（定半径与 0°）、扫角 sweep（弧度，带号，可超 180°）→ n 段。退化（半径 0 / 扫角 0）→ null。 */
export function centerArcSegments(
  plane: PlaneParams,
  basis: { u: Pt3; v: Pt3 },
  c3: Pt3,
  a3: Pt3,
  sweep: number,
  n = 12,
): { segs: [Pt3, Pt3][]; center: Pt3; radius: number; end: Pt3 } | null {
  const c = projectToPlane(c3, basis), a = projectToPlane(a3, basis);
  const r = Math.hypot(a.x - c.x, a.y - c.y);
  if (r < 1e-9 || n < 1 || Math.abs(sweep) < 1e-9) return null;
  const t0 = Math.atan2(a.y - c.y, a.x - c.x);
  const pts: Pt3[] = [];
  for (let i = 0; i <= n; i++) { const t = t0 + (sweep * i) / n; pts.push(liftFromPlane({ x: c.x + r * Math.cos(t), y: c.y + r * Math.sin(t) }, plane, basis)); }
  const segs: [Pt3, Pt3][] = [];
  for (let i = 0; i < n; i++) segs.push([pts[i], pts[i + 1]]);
  return { segs, center: liftFromPlane({ x: c.x, y: c.y }, plane, basis), radius: r, end: pts[n] };
}

/** 平面上从 c→a 转到 c→p 的带号角（绕法向 n，右手；(−π, π]）。 */
export function sweepAngle(c: Pt3, a: Pt3, p: Pt3, n: Pt3): number {
  const u = normalize3(sub3(a, c)), w = sub3(p, c);
  const v = cross3(n, u);
  const x = u.x * w.x + u.y * w.y + u.z * w.z, y = v.x * w.x + v.y * w.y + v.z * w.z;
  if (Math.hypot(x, y) < 1e-12) return 0;
  return Math.atan2(y, x);
}

/** 两点弧：弦 a–b、同侧、给定半径 r（≥ 弦半长）→ 劣弧的凸度点（VCB 改半径用）；r 太小 → 半圆。 */
export function bulgePointForRadius(a: Pt3, b: Pt3, side: Pt3, r: number): Pt3 {
  const mid = scale3(add3(a, b), 0.5), half = dist3(a, b) / 2;
  const rr = Math.max(r, half);
  const h = rr - Math.sqrt(Math.max(0, rr * rr - half * half));
  const dir = normalize3(sub3(side, mid));
  return add3(mid, scale3(dir, h));
}

/** 矩形「宽,高」的两根轴：面基 (u, v) 里更贴近世界 X 的那根算「宽」（平手看 Y）——地面矩形 = (x, y)，立面 = (水平, 竖直)。光标旁提示和数值小窗共用（2026-10-25：此前两处各算、宽高顺序对不上）。 */
export function rectAxesOf(basis: { u: Pt3; v: Pt3 }): [Pt3, Pt3] {
  const score = (a: Pt3): number => Math.abs(a.x) * 4 + Math.abs(a.y) * 2 + Math.abs(a.z);
  return score(basis.u) >= score(basis.v) ? [basis.u, basis.v] : [basis.v, basis.u];
}
/** 矩形的对角（从角 = 锚点本身；从中心 = 锚点关于 b 的对称点，user 2026-10-24「中心rect……还是要」）。 */
export function rectOpposite(anchor: Pt3, b: Pt3, from: "corner" | "center"): Pt3 { return from === "center" ? sub3(scale3(anchor, 2), b) : anchor; }

/**
 * 旋转矩形（SU Rotated Rectangle）：A 第一角、B 第一边终点、C 第二边终点（都在平面上）→ 四角 A B C D，D = A + (C − B)。
 * 角度不限 90°（平行四边形合法，SU 同款）；退化（边长 0 / C 落在 AB 直线上）→ null。
 */
export function rrectCorners(a: Pt3, b: Pt3, c: Pt3): [Pt3, Pt3, Pt3, Pt3] | null {
  const ab = sub3(b, a), bc = sub3(c, b);
  if (len3(ab) < 1e-9 || len3(bc) < 1e-9) return null;
  if (len3(cross3(ab, bc)) < 1e-9 * len3(ab) * len3(bc)) return null;
  return [a, b, c, add3(a, bc)];
}
export function rrectSegments(a: Pt3, b: Pt3, c: Pt3): [Pt3, Pt3][] {
  const q = rrectCorners(a, b, c);
  return q ? [[q[0], q[1]], [q[1], q[2]], [q[2], q[3]], [q[3], q[0]]] : [];
}
/** 第二边在 B 处相对 BA 的内角（度，0..180）与转向（沿 A→B 走到 B 后向左转 = +1（绕 n 逆时针）、向右 = −1）。 */
export function rrectAngle(a: Pt3, b: Pt3, c: Pt3, n: Pt3): { deg: number; side: 1 | -1 } {
  const ba = normalize3(sub3(a, b)), bc = normalize3(sub3(c, b));
  const d = Math.max(-1, Math.min(1, ba.x * bc.x + ba.y * bc.y + ba.z * bc.z));
  const s = cross3(scale3(ba, -1), bc);   // ab × bc
  return { deg: (Math.acos(d) * 180) / Math.PI, side: (s.x * n.x + s.y * n.y + s.z * n.z) >= 0 ? 1 : -1 };
}
/**
 * 旋转矩形（2026-10-26 改，user「应该第一下设置边，第二下设置角度，然后这个量角器应该和边垂直的。第三下设置长度」）：
 * 第一边 a→b 躺在平面（法向 n）上；θ = 绕第一边转的角——0 = 平躺在这个平面里（朝 n × e 那边），90° = 立起来（朝 n）。返回第二边的单位方向。
 */
export function rrectDirAt(a: Pt3, b: Pt3, n: Pt3, theta: number): Pt3 {
  const e = normalize3(sub3(b, a)), u0 = normalize3(cross3(n, e)), up = cross3(e, u0);
  return add3(scale3(u0, Math.cos(theta)), scale3(up, Math.sin(theta)));
}
/** rrectDirAt 的反函数：已有的第三角 c → 绕第一边的角 θ（弧度，(−π, π]）。 */
export function rrectThetaOf(a: Pt3, b: Pt3, n: Pt3, c: Pt3): number {
  const e = normalize3(sub3(b, a)), u0 = normalize3(cross3(n, e)), d = sub3(c, b), w = sub3(d, scale3(e, d.x * e.x + d.y * e.y + d.z * e.z));
  const cr = cross3(u0, w);
  return Math.atan2(cr.x * e.x + cr.y * e.y + cr.z * e.z, u0.x * w.x + u0.y * w.y + u0.z * w.z);
}
/** 角度 + 宽 → C：B + w·(cos·BA + side·sin·(n × AB))——内角 deg、转向 side，与 rrectAngle 互逆。 */
export function rrectCornerFromAngle(a: Pt3, b: Pt3, n: Pt3, deg: number, w: number, side: 1 | -1): Pt3 {
  const ba = normalize3(sub3(a, b)), v = cross3(normalize3(n), scale3(ba, -1));
  const t = (deg * Math.PI) / 180;
  return add3(b, scale3(add3(scale3(ba, Math.cos(t)), scale3(v, side * Math.sin(t))), w));
}
/**
 * 第二边角度咬合（A34 的量角器手感）：90° 强吸（±strongDeg 内直接 90°）；Shift 按着 → 15° 格；其余照指针。长度 |BC| 不变。
 * 返回咬合后的 C 与角度（度）；snapped = 是否咬住了格。
 */
export function rrectSnapAngle(a: Pt3, b: Pt3, c: Pt3, n: Pt3, opts: { shift: boolean; stepDeg?: number; strongDeg?: number }): { c: Pt3; deg: number; snapped: boolean } {
  const { deg, side } = rrectAngle(a, b, c, n);
  const w = dist3(c, b);
  const step = opts.stepDeg ?? 15, strong = opts.strongDeg ?? 5;
  let target: number | null = null;
  if (Math.abs(deg - 90) <= strong) target = 90;
  else if (opts.shift) target = Math.min(180 - step, Math.max(step, Math.round(deg / step) * step));
  if (target === null) return { c, deg, snapped: false };
  return { c: rrectCornerFromAngle(a, b, n, target, w, side), deg: target, snapped: true };
}

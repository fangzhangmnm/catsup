// mirror.ts —— 镜像指令的几何（狗咬坦克纪元 DT23，user 2026-10-25「mirror也是一个command，对选中的几何作用……默认的是比blender更激进的一个，
// 就是中间的线如果可以的话，消掉，这样你Mirror一个cube中间不会多一条割线。然后Mirror默认是删掉对面吧」）。
// 一次落定的指令，不是 modifier（user「我不喜欢modifier，我喜欢指令」）。全用已有内核动词拼，不改内核：
//   ① 选中的面被镜像面穿过 → 交线当新线段加进去（画线成面把面切开）；切完按「内部点落在原来哪张面里」认回选区
//   ② 融合阈值 > 0：留下这侧离镜像面 ≤ 阈值的点吸到面上（默认 0 = 精确硬表面；有机建模共用这一项）
//   ③ 删掉对面（默认开）：选区里在对面那侧的面 / 线删掉；关掉 = 原件留着、对面多一份（= 复制）
//   ④ 这一侧抽成快照、按镜像变换（行列式 < 0）吸回同一个池（粘性几何把缝上的点并上；曲线参数跟着镜）
//   ⑤ 缝上自愈（默认开，user「语义就是自愈」）：先删夹在两半中间、贴在镜像面上的面；再擦缝上两边共面的边（并面）；再焊掉缝上的共线断口；正中切开的同一个圆焊回圆
//   不变量：零破面——任何一步出现 BURST = 整步拒绝（OpTargetError → History 回滚），算法没想到的情况要暴露，不靠兜底盖住（user「确保不要有任何面破」）。
// 坐标一律 = 这个池的本地坐标（definition 坐标）。created 2026-10-25 by Claude Opus 5.5
import type { EdgeId, FaceEvent, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import { Kernel } from "../kernel/kernel.ts";
import { type Pt, add3, cross3, dot3, normalize3, pointInRing, projectToPlane, scale3, sub3 } from "../kernel/geom.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { absorbSnapshot, extractSnapshot } from "../scene/scene.ts";
import type { Xform } from "../scene/xform.ts";

export interface MirrorPlane { origin: Pt3; normal: Pt3; }
export interface MirrorOptions {
  /** 删掉对面（默认 true）；false = 原件留着、对面多一份。 */
  deleteOpposite: boolean;
  /** 缝上自愈（默认 true）：缝上共面的边擦掉、夹在中间的面删掉、共线断口焊掉、正中切开的同一个圆焊回圆。 */
  mergeSeam: boolean;
  /** 融合阈值（米，默认 0）：留下这侧离镜像面这么近的点先吸到面上。 */
  weld: number;
}
export const MIRROR_DEFAULTS: MirrorOptions = { deleteOpposite: true, mergeSeam: true, weld: 0 };

/** 关于平面的镜像变换（3×4 行优先）：x' = x − 2((x−o)·n)n。 */
export function reflectionXform(pl: MirrorPlane): Xform {
  const n = normalize3(pl.normal), d = dot3(pl.origin, n);
  return [
    1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x,
    -2 * n.y * n.x, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y,
    -2 * n.z * n.x, -2 * n.z * n.y, 1 - 2 * n.z * n.z, 2 * d * n.z,
  ];
}

export class MirrorRejected extends Error {}
/**
 * 防碎护栏（米；user 2026-10-25「切到点不要出零长度的线，然后非常近的点也有护栏」）：
 *   切点离边的端点这么近 = 就用端点；短于它的切段不要；选区里离镜像面这么近（但又不在面上）的点先吸到镜像面上（报数，不悄悄改）。
 * 尺子分工（2026-10-25 AI 建议、待 user 定）：3 µm = 同一个点（内核铁律）；10 µm = 在同一张面上（内核共面容差，判「点在不在镜像面上」用它）；
 * 本常量 = 防碎；融合阈值（user 选项，默认 0）= 额外的主动合并。
 */
export const CUT_SNAP = 1e-4;
/** 镜像这一步的回执（给提示行 / 参数小窗报数）。 */
export interface MirrorReport { snappedToPlane: number; }

interface Parent { n: Pt3; d: number; basis: { u: Pt3; v: Pt3 }; rings: Pt[][] }

/** 面里一个确定在内部的点（三角化后第一个三角的形心）。 */
function interiorPoint(k: Kernel, fid: FaceId): Pt3 | null {
  const F = k.face(fid), rec = k.planeOf(fid);
  if (!F || !rec) return null;
  const all = [...F.outer.vids, ...F.holes.flatMap((h) => h.vids)];
  const uniq = [...new Set(all)];
  const local = new Map(uniq.map((v, i) => [v, i]));
  const pts = uniq.map((v) => k.graph.pt(v));
  const tris = triangulateRings(pts, rec.plane, F.outer.vids.map((v) => local.get(v)!), F.holes.map((h) => h.vids.map((v) => local.get(v)!)));
  if (!tris.length) return null;
  const [a, b, c] = tris[0];
  return { x: (pts[a].x + pts[b].x + pts[c].x) / 3, y: (pts[a].y + pts[b].y + pts[c].y) / 3, z: (pts[a].z + pts[b].z + pts[c].z) / 3 };
}

/**
 * 对池内核 k 上选中的面 / 线（本地 id）做镜像。返回全部面事件。有 BURST → 抛 MirrorRejected（调用方转 OpTargetError，History 回滚）。
 */
export function mirrorGeometry(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[], plane: MirrorPlane, opts: MirrorOptions = MIRROR_DEFAULTS, report?: MirrorReport): FaceEvent[] {
  const n = normalize3(plane.normal);
  const o = plane.origin;
  const tol = Math.max(k.coplanarTol, 1e-6);
  const sd = (p: Pt3): number => dot3(sub3(p, o), n);
  const events: FaceEvent[] = [];
  const guard = (evs: FaceEvent[]): void => { for (const e of evs) if (e.type === "BURST") throw new MirrorRejected("镜像会让面破掉（算法没想到的情况，已整步撤回；请导出复现包）"); events.push(...evs); };

  // 选区：面 + 不属于这些面的线（裸线）
  const faceSet = new Set(faces.filter((f) => k.face(f)));
  const ringEdges = new Set<EdgeId>();
  for (const f of faceSet) { const F = k.face(f)!; for (const r of [F.outer, ...F.holes]) for (const d of r.edges) ringEdges.add(d.edge); }

  // ⓪ 防碎护栏：选区里离镜像面 (τ, CUT_SNAP] 的点先吸到面上（否则镜过去和原件在缝上叠出几十微米的细缝，一合并就碎）
  {
    const vids = new Set<VertexId>();
    for (const f of faceSet) { const F = k.face(f)!; for (const r of [F.outer, ...F.holes]) for (const v of r.vids) vids.add(v); }
    for (const e of edges) if (k.graph.hasEdge(e) && !ringEdges.has(e)) { const E = k.graph.edge(e); vids.add(E.a); vids.add(E.b); }
    const moves = [...vids].map((id) => ({ id, p: k.graph.pt(id) })).filter(({ p }) => { const d = Math.abs(sd(p)); return d > tol && d <= CUT_SNAP; }).map(({ id, p }) => ({ id, to: sub3(p, scale3(n, sd(p))) }));
    if (moves.length) { guard(k.moveVertices(moves)); if (report) report.snappedToPlane += moves.length; }
  }

  // 裸线（在护栏吸点之后记位置）
  const wires = edges.filter((e) => k.graph.hasEdge(e) && !ringEdges.has(e)).map((e) => { const E = k.graph.edge(e); return { a: k.graph.pt(E.a), b: k.graph.pt(E.b) }; });

  // 记下原来每张选中面的平面 + 2D 环（切开后按内部点认回）
  const parents: Parent[] = [];
  for (const f of faceSet) {
    const F = k.face(f)!, rec = k.planeOf(f)!;
    parents.push({ n: rec.plane.n, d: rec.plane.d, basis: rec.basis, rings: [F.outer, ...F.holes].map((r) => r.vids.map((v) => projectToPlane(k.graph.pt(v), rec.basis))) });
  }

  // ① 切：每张选中面与镜像面的交线段（同平面内的扫描线奇偶配对；|sd| ≤ tol 当 0、按「非正」侧，过顶点只计一次）
  const cuts: [Pt3, Pt3][] = [];
  for (const f of faceSet) {
    const F = k.face(f)!, rec = k.planeOf(f)!;
    const dir = cross3(rec.plane.n, n);
    const dl = Math.hypot(dir.x, dir.y, dir.z);
    if (dl < 1e-9) continue;                       // 面和镜像面平行：不切
    const u = scale3(dir, 1 / dl);
    const hits: { t: number; p: Pt3 }[] = [];
    for (const r of [F.outer, ...F.holes]) {
      const P = r.vids.map((v) => k.graph.pt(v));
      for (let i = 0; i < P.length; i++) {
        const a = P[i], b = P[(i + 1) % P.length];
        let sa = sd(a), sb = sd(b);
        if (Math.abs(sa) <= tol) sa = 0;
        if (Math.abs(sb) <= tol) sb = 0;
        if ((sa > 0) === (sb > 0)) continue;
        const t = sa === 0 ? 0 : sa / (sa - sb);
        let p = add3(a, scale3(sub3(b, a), t));
        if (Math.hypot(p.x - a.x, p.y - a.y, p.z - a.z) <= CUT_SNAP) p = a;          // 切点护栏：贴近端点 = 就是端点
        else if (Math.hypot(p.x - b.x, p.y - b.y, p.z - b.z) <= CUT_SNAP) p = b;
        hits.push({ t: dot3(p, u), p });
      }
    }
    hits.sort((x, y) => x.t - y.t);
    for (let i = 0; i + 1 < hits.length; i += 2) if (hits[i + 1].t - hits[i].t > CUT_SNAP) cuts.push([hits[i].p, hits[i + 1].p]);   // 零长度 / 太短的切段不要
  }
  // 裸线过镜像面：在交点处切开（共线插段 = 粘性几何把原边切成两段）
  const wireCuts: [Pt3, Pt3][] = [];
  for (const w of wires) {
    let sa = sd(w.a), sb = sd(w.b);
    if (Math.abs(sa) <= tol) sa = 0;
    if (Math.abs(sb) <= tol) sb = 0;
    if (sa === 0 || sb === 0 || (sa > 0) === (sb > 0)) continue;
    const x = add3(w.a, scale3(sub3(w.b, w.a), sa / (sa - sb)));
    if (Math.hypot(x.x - w.a.x, x.y - w.a.y, x.z - w.a.z) <= CUT_SNAP || Math.hypot(x.x - w.b.x, x.y - w.b.y, x.z - w.b.z) <= CUT_SNAP) continue;   // 切点护栏：贴着端点就不切
    wireCuts.push([w.a, x], [x, w.b]);
  }
  if (cuts.length || wireCuts.length) guard(k.addEdges([...cuts, ...wireCuts]));

  // 认回选区：面 = 和某张原面同平面、内部点落在原面环里的面；裸线 = 两端都在某条原裸线上的无面边
  const inParent = (fid: FaceId): boolean => {
    const rec = k.planeOf(fid);
    const ip = interiorPoint(k, fid);
    if (!rec || !ip) return false;
    for (const p of parents) {
      if (Math.abs(dot3(rec.plane.n, p.n)) < 1 - 1e-9 || Math.abs(dot3(ip, p.n) - p.d) > tol * 10) continue;
      const q = projectToPlane(ip, p.basis);
      if (pointInRing(q, p.rings[0]) && !p.rings.slice(1).some((h) => pointInRing(q, h))) return true;
    }
    return false;
  };
  const onWire = (p: Pt3): boolean => wires.some((w) => { const ab = sub3(w.b, w.a), L = Math.hypot(ab.x, ab.y, ab.z); if (L < 1e-12) return false; const t = dot3(sub3(p, w.a), ab) / (L * L); if (t < -1e-9 || t > 1 + 1e-9) return false; const q = add3(w.a, scale3(ab, t)); return Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) <= tol; });
  const regionFaces = k.faces().map((f) => f.id).filter(inParent);
  const regionWires = k.edges().filter((e) => e.faceLinks.length === 0 && onWire(k.graph.pt(e.a)) && onWire(k.graph.pt(e.b))).map((e) => e.id);
  const side = new Map<FaceId, number>();
  for (const f of regionFaces) {
    const vs = k.face(f)!.outer.vids.map((v) => sd(k.graph.pt(v)));
    side.set(f, vs.every((s) => Math.abs(s) <= tol) ? 0 : Math.sign(sd(interiorPoint(k, f)!)));
  }
  const wireSide = (e: EdgeId): number => { const E = k.graph.edge(e); const m = scale3(add3(k.graph.pt(E.a), k.graph.pt(E.b)), 0.5); const s = sd(m); return Math.abs(s) <= tol ? 0 : Math.sign(s); };

  // ② 融合阈值：留下这侧（+）离镜像面 ≤ 阈值的点吸到面上
  if (opts.weld > 0) {
    const vids = new Set<VertexId>();
    for (const f of regionFaces) if (side.get(f) === 1) for (const v of k.face(f)!.outer.vids) vids.add(v);
    for (const e of regionWires) if (wireSide(e) === 1) { const E = k.graph.edge(e); vids.add(E.a); vids.add(E.b); }
    const moves = [...vids].map((v) => ({ id: v, p: k.graph.pt(v) })).filter(({ p }) => { const s = sd(p); return s > tol && s <= opts.weld; }).map(({ id, p }) => ({ id, to: sub3(p, scale3(n, sd(p))) }));
    if (moves.length) guard(k.moveVertices(moves));
  }

  // ③ 删掉对面
  const keepFaces = (): FaceId[] => k.faces().map((f) => f.id).filter((f) => regionFaces.includes(f) && side.get(f) === 1 && k.face(f));
  if (opts.deleteOpposite) {
    const opp = regionFaces.filter((f) => side.get(f) === -1 && k.face(f));
    const oppRing = new Set<EdgeId>();
    for (const f of opp) { const F = k.face(f)!; for (const r of [F.outer, ...F.holes]) for (const d of r.edges) oppRing.add(d.edge); }
    if (opp.length) guard(k.eraseFaces(opp));
    const orphans = [...oppRing].filter((e) => k.graph.hasEdge(e) && k.graph.edge(e).faceLinks.length === 0 && wireSide(e) === -1);
    const oppWires = regionWires.filter((e) => k.graph.hasEdge(e) && wireSide(e) === -1);
    const kill = [...new Set([...orphans, ...oppWires])];
    if (kill.length) guard(k.eraseEdges(kill));
  }

  // ④ 这一侧镜过去
  const kf = keepFaces();
  const kw = regionWires.filter((e) => k.graph.hasEdge(e) && wireSide(e) === 1);
  if (kf.length || kw.length) {
    guard(absorbSnapshot(k, extractSnapshot(k, kf, kw), reflectionXform({ origin: o, normal: n })));
  }

  // ⑤ 消中缝
  if (opts.mergeSeam) {
    const onPlane = (p: Pt3): boolean => Math.abs(sd(p)) <= tol;
    const sideOfFace = (f: FaceId): number => { const ip = interiorPoint(k, f); if (!ip) return 0; const s = sd(ip); return Math.abs(s) <= tol ? 0 : Math.sign(s); };
    // a. 贴在镜像面上、两边都有面夹着的面（两半之间的隔墙）
    const walls: FaceId[] = [];
    for (const F of k.faces()) {
      if (!F.outer.vids.every((v) => onPlane(k.graph.pt(v)))) continue;
      const ok = F.outer.edges.every((d) => { const others = k.graph.edge(d.edge).faceLinks.filter((g) => g !== F.id); const ss = others.map(sideOfFace); return ss.includes(1) && ss.includes(-1); });
      if (ok) walls.push(F.id);
    }
    const wallRing = new Set<EdgeId>();
    for (const w of walls) for (const d of k.face(w)!.outer.edges) wallRing.add(d.edge);
    if (walls.length) guard(k.eraseFaces(walls));
    // b. 缝上两边共面的边：擦掉 = 两张面并成一张
    const seam = k.edges().filter((e) => onPlane(k.graph.pt(e.a)) && onPlane(k.graph.pt(e.b)) && e.faceLinks.length === 2 && (k.dihedralDeg(e.id) ?? 99) < 1e-6).map((e) => e.id);
    if (seam.length) guard(k.eraseEdges(seam));
    // 删隔墙后它们环上没了面引用的边清掉（只清隔墙自己的边，不碰别处画在镜像面上的线）
    const lone = [...wallRing].filter((e) => k.graph.hasEdge(e) && k.graph.edge(e).faceLinks.length === 0);
    if (lone.length) guard(k.eraseEdges(lone));
    // c. 缝上的共线断口焊掉
    const breaks = k.vertices().filter((v) => onPlane(v) && v.edges.size === 2 && k.isBreakJunction(v.id)).map((v) => v.id);
    if (breaks.length) k.dissolveVertices(breaks);
    // d. 正中切开的同一个圆：缝上相接、圆参数相同（圆心 / 半径 / 法线）的两段弧焊回一条（两段拼成整圈 = 回到圆）。不在正中切 = 两个圆心不同的弧，不碰。
    //    user 2026-10-25「正中切开同圆心，和是否删中线一样共享一个选项」「因为它们语义就是自愈」——同一个开关（缝上自愈）。
    const sameCircle = (a: NonNullable<ReturnType<Kernel["curveById"]>>, b: NonNullable<ReturnType<Kernel["curveById"]>>): boolean => {
      const p = a.params, q = b.params;
      if (!p || !q) return false;
      const dc = Math.hypot(p.center.x - q.center.x, p.center.y - q.center.y, p.center.z - q.center.z);
      return dc <= tol && Math.abs(p.radius - q.radius) <= tol && Math.abs(dot3(normalize3(p.normal), normalize3(q.normal))) >= 1 - 1e-9;
    };
    for (let guardN = 0; guardN < 64; guardN++) {
      let welded = false;
      for (const v of k.vertices()) {
        if (!onPlane(v)) continue;
        const cids = [...new Set([...v.edges].map((e) => k.curveOf(e)).filter((c): c is number => c !== undefined))];
        if (cids.length !== 2) continue;
        const A = k.curveById(cids[0]), B = k.curveById(cids[1]);
        if (!A || !B || !sameCircle(A, B)) continue;
        try { k.weldEdges([...A.edges, ...B.edges]); welded = true; break; } catch { /* 不是一条链之类：不焊，照旧两段弧 */ }
      }
      if (!welded) break;
    }
  }
  return events;
}

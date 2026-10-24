// settle.ts —— 统一像表结算机：立宪 §3 的**唯一**物理实现（2026-10-21 重写，Claude Fable 5.1；
// 起因 = 09-23 算法 QA：推拉「切半推到底两面不消」+ 一族同根 bug 的根 = 身份靠 id、id 在合并/切割里会丢）。
//
// 一句话：**动词不碰图，只交一张像表；机器按坐标认领胞腔**。
//   像 = 一张多边形（世界坐标环，外环 + 洞）+ 代数（OR / XOR）+ 继承谁的身份（可无 = 新膜）。
//   动词把「做完以后每张膜长什么样」写成像表（pp = 帽 + 侧壁 + 被拉伸的邻膜；move = 搬过的膜；draw = 只有手势线）；
//   机器：① 未被动词消耗的膜自动交**身份像**（现状坐标，OR，继承自身）② 插边（手势线 / 裸线 / 像的环段）③ planarize 自愈
//   ④ 非平面像先 autofold 折成平面片（折缝也是线）⑤ 每平面切胞腔 ⑥ 每个像按绕数认领胞腔 ⑦ 逐胞腔裁决：
//   有 XOR 参与 = 认领数奇偶，否则 ≥1 即填；⑧ 身份：一对一保 id、一对多 DIVIDE、多对一 MERGE、零胞腔 BURST、
//   新像独占 = BIRTH、无主胞腔外环含手势边 = BIRTH ⑨ 随葬：被消耗膜的旧环边结算后无人引用 → 删
//   ⑩ 溶解：**因本次操作**变成二度共线的顶点（之前不是、也不是本次显式画的端点）→ 两边并一条（不对称律：用户自己的分割点不动）。
// 退役的特例（全部被「坐标认领」吸收）：pp 的 MOVE/COPY 顶点随行、frontier 删原画新、riser、v3.1 顶点守卫、蒸发+rename、
//   按边 id 的 parity toggle、洞环三律、movedOuter 补手势、预演开区间样本；结算机的 zeroClaimKeep + repairRings、ringKey 去重。
// 不在本机的：擦边（loop 身份即意图：外环=BURST / 洞=ABSORB / 同平面共享=MERGE，face-lifecycle.ts）、删膜（纯出库）。

import { type Pt, type Pt3, add3, cross, dist3, distToPlane, dot3, planeOfRing, pointInRing, pointOnSegment3, projectToPlane, ptKey3, quantize3, samePt3, sub3 } from "./geom.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type DirEdge, type Region, type Ring, representativePoint } from "./facefind.ts";
import { type PlaneId, PlaneRegistry, discoverPlanes } from "./planes.ts";
import { INSERT_TOL, insertSegment } from "./subdivide.ts";
import { planarize } from "./planarize.ts";
import { foldDecompose } from "./autofold.ts";
import { type Face, type FaceEvent, FaceStore } from "./face-lifecycle.ts";
import type { EdgeLayers, FaceLayers } from "./layers.ts";
import { perf } from "../editor/perf-stats.ts";

export type Algebra = "or" | "xor";
export interface Seg3 { readonly a: Pt3; readonly b: Pt3; }
/** 一张像：动词说「这张膜做完以后在这里、长这样」。 */
export interface Image {
  /** [外环, ...洞环]，世界坐标；允许重复点与零面积尖刺（绕数天然为零）；非平面 → 机器 autofold。 */
  rings: Pt3[][];
  algebra: Algebra;
  /** 继承的身份；缺省 = 新膜（独占胞腔 → BIRTH）。 */
  inherit?: FaceId;
  /** 新膜的面层值（absorb 用：炸开 / 粘贴带着材质回来）。 */
  face?: Readonly<Record<string, number>>;
}
export interface ImageTable {
  /** 被动词替换的膜：出库；身份只经 images[].inherit 延续；旧环边 = 随葬候选。 */
  consumed: ReadonlySet<FaceId>;
  images: readonly Image[];
  /** 带手势身份的线段（画笔）：无主胞腔外环含手势边 → BIRTH。 */
  gesture?: readonly Seg3[];
  /** 普通线段：只插入（随行的裸线、折缝）。 */
  wires?: readonly Seg3[];
  /**
   * 随葬通则（pp 开、move / draw 不开）：结算后无膜引用的边只许是**用户画的线**——本次的手势线 / 裸线段、或操作前就是裸线的边
   * （含它们被切开的后代）；其余孤儿边（XOR 湮灭留下的、零面积像的残边、被消耗膜的旧环边）一律删。
   * 另有第一相（永远开）：被消耗膜的旧环边若不在任何像的环段上、也没有未动膜引用 → 结算**前**就摘（否则旧边会把新膜切成两格）。
   * move 不开通则：膜移扁留一条线（SU 同款，靶4）。
   */
  buryOrphans?: boolean;
  /** 边属性层登记处（内核的；机器只调它的四条规则：切割继承 / 删边清理 / 段上落边入集 / 溶解并层）。 */
  edgeLayers?: EdgeLayers;
  /** 名字 → 线段：这些段上落下的边进该层（圆的近似边 → curve；推拉侧棱 → soft+smooth）。 */
  layerSegs?: Readonly<Record<string, readonly Seg3[]>>;
  /** 面属性层登记处：新像带 face 值时，它独占的胞腔铸出的膜记上。 */
  faceLayers?: FaceLayers;
  /** 本次动过坐标的边（moveVertices：被移 / 被合并顶点的邻边）——局部性：自愈与认领只围绕脏边 + 像 + 被消耗膜的平面（2026-10-21 #14）。 */
  dirtyEdges?: Iterable<EdgeId>;
}

/** 面环 → 世界坐标环（沿环取每条有向边的起点）。 */
export function ringsOf(g: PlanarGraph, f: { outer: Ring; holes: Ring[] }): Pt3[][] {
  const ring3 = (r: Ring): Pt3[] => r.edges.map((d) => g.pt(d.forward ? g.edge(d.edge).a : g.edge(d.edge).b));
  return [ring3(f.outer), ...f.holes.map(ring3)];
}

/** 绕数（|w|≥1 = 覆盖；零面积尖刺贡献 0）。 */
export function windingOf(p: Pt, poly: readonly Pt[]): number {
  let w = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a.y <= p.y) {
      if (b.y > p.y && cross(a, b, p) > 0) w++;
    } else if (b.y <= p.y && cross(a, b, p) < 0) w--;
  }
  return w;
}

/** 顶点是否「二度共线」（两条边反向共线）。 */
function collinear2(g: PlanarGraph, vid: VertexId): { a: VertexId; b: VertexId; ea: EdgeId; eb: EdgeId } | null {
  const v = g.vertex(vid);
  if (v.edges.size !== 2) return null;
  const [ea, eb] = [...v.edges];
  const a = g.otherEnd(g.edge(ea), vid), b = g.otherEnd(g.edge(eb), vid);
  if (a === b) return null;
  const pv = g.pt(vid), pa = g.pt(a), pb = g.pt(b);
  const da = sub3(pa, pv), db = sub3(pb, pv);
  const la = dist3(pa, pv), lb = dist3(pb, pv);
  if (la === 0 || lb === 0) return null;
  if (dot3(da, db) / (la * lb) > -(1 - 1e-9)) return null;
  return { a, b, ea, eb };
}

/** 像的平面化：共面 → 原样；非平面无洞 → autofold 成片 + 折缝；非平面带洞 / 折不动 → 丢弃（零认领 = BURST 曝光）。 */
function planarPieces(im: Image, tol: number): { images: Image[]; creases: Seg3[] } {
  const outer = dedupeRing(im.rings[0]);
  if (outer.length < 3) return { images: [], creases: [] };
  const plane = planeOfRing(outer);
  if (!plane) return { images: [], creases: [] };   // 整环退化成线
  const all = [outer, ...im.rings.slice(1).map(dedupeRing)];
  if (all.every((r) => r.every((p) => distToPlane(p, plane!) <= tol))) return { images: [{ ...im, rings: all }], creases: [] };
  if (im.rings.length > 1) return { images: [], creases: [] };
  const d = foldDecompose(outer, tol);
  if (!d) return { images: [], creases: [] };
  return {
    images: d.pieces.map((idxs) => ({ rings: [idxs.map((i) => outer[i])], algebra: im.algebra, ...(im.inherit !== undefined ? { inherit: im.inherit } : {}) })),
    creases: d.creases.map(([i, j]) => ({ a: outer[i], b: outer[j] })),
  };
}
function dedupeRing(r: readonly Pt3[]): Pt3[] {
  const out: Pt3[] = [];
  for (const p0 of r) {
    const p = quantize3(p0);
    if (out.length && samePt3(p, out[out.length - 1])) continue;
    out.push(p);
  }
  while (out.length >= 2 && samePt3(out[0], out[out.length - 1])) out.pop();
  return out;
}

interface Claim { im: Image; }

/**
 * 结算机本体。g / store / reg 原地修改；返回事件叙事。
 * opts.global = 全平面全膜结算（差分 oracle：局部结算的结果必须与它逐字相同——立宪页 §3「局部性定理」，test/settle-differential.test.ts）。
 */
export function settle(g: PlanarGraph, store: FaceStore, reg: PlaneRegistry, tol: number, table: ImageTable, opts?: { global?: boolean }): FaceEvent[] {
  const GLOBAL = !!opts?.global;
  const events: FaceEvent[] = [];
  let tMark = performance.now();
  const mark = (name: string): void => { const t = performance.now(); perf.last[`settle.${name}`] = t - tMark; tMark = t; };

  // ① 身份像（插边前拍）+ 溶解基线 + 随葬候选。局部性：稍后只认领「被碰到的平面」上的膜（其余原地不动）
  const dirty = new Set<EdgeId>(table.dirtyEdges ?? []);
  const verbImages: Image[] = [];
  const creases: { a: Pt3; b: Pt3 }[] = [];
  for (const im of table.images) { const r = planarPieces(im, tol); verbImages.push(...r.images); creases.push(...r.creases); }
  const touchedPlanes = new Set<PlaneId>();
  for (const id of table.consumed) { const f = store.face(id); if (f) touchedPlanes.add(f.planeId); }
  // 身份像只拍「可能被碰到的平面」上的膜（④ 的超集，用插边前的坐标算：被消耗膜的平面 + 动词像的平面 + 含任一脏边 / 任一待插线段的平面，
  // 容差放宽 INSERT_TOL 盖住插边时的粘连位移）。其余膜本次保证原地不动，不需要身份像——2400 面全拍 ringsOf 一次 5.5 ms（#22）
  const maybeTouched = new Set<PlaneId>(touchedPlanes);
  if (GLOBAL) for (const rec of reg.all()) maybeTouched.add(rec.id);
  for (const im of verbImages) {
    const plane = planeOfRing(im.rings[0]);
    if (plane) maybeTouched.add(reg.ensure(plane, tol).id);
  }
  if (!GLOBAL) {
    const segs: [Pt3, Pt3][] = [];
    for (const id of dirty) if (g.hasEdge(id)) { const e = g.edge(id); segs.push([g.pt(e.a), g.pt(e.b)]); }
    for (const s of [...(table.gesture ?? []), ...(table.wires ?? []), ...creases]) segs.push([s.a, s.b]);
    for (const im of verbImages) for (const ring of im.rings) for (let i = 0; i < ring.length; i++) segs.push([ring[i], ring[(i + 1) % ring.length]]);
    // 插边会切开 / 粘住线段附近的既有边，它们的后代也算脏边（onSplit）→ 它们所在的平面也会被碰到：用空间网格取同一份超集
    const near = new Set<EdgeId>();
    for (const [pa, pb] of segs) for (const e of g.edgesNear(pa, pb)) near.add(e.id);
    for (const id of near) { const e = g.edge(id); segs.push([g.pt(e.a), g.pt(e.b)]); }
    const tol2 = tol + INSERT_TOL;
    for (const rec of reg.all()) {
      if (maybeTouched.has(rec.id)) continue;
      for (const [pa, pb] of segs) if (distToPlane(pa, rec.plane) <= tol2 && distToPlane(pb, rec.plane) <= tol2) { maybeTouched.add(rec.id); break; }
    }
  }
  const identity: Image[] = [];
  for (const f of store.faces()) {
    if (table.consumed.has(f.id) || !maybeTouched.has(f.planeId)) continue;
    identity.push({ rings: ringsOf(g, f), algebra: "or", inherit: f.id });
  }
  mark("identity.rings");
  const wasCollinear2 = new Set<VertexId>();
  for (const v of g.vertices()) if (collinear2(g, v.id)) wasCollinear2.add(v.id);
  const preWires = new Set<EdgeId>();                 // 操作前就是裸线的边（随葬豁免，含后代）
  for (const e of g.edges()) if (e.faceLinks.length === 0) preWires.add(e.id);
  mark("identity.pre");
  const buryCand = new Set<EdgeId>();                 // 第一相候选 = 被消耗膜的旧环边
  const consumedEdges = new Set<EdgeId>();            // 被消耗膜的全部旧环边（面内邻域的种子，不受随葬第一相筛减）
  const consumedIds: FaceId[] = [];
  for (const id of table.consumed) {
    const f = store.face(id);
    if (!f) continue;
    consumedIds.push(id);
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) { buryCand.add(d.edge); consumedEdges.add(d.edge); }
    store.deleteSilently(id);
  }
  // 随葬第一相：候选边若不在任何像（身份像 + 动词像）的环段上、也不被未动膜引用 → 现在就摘（它已不是任何膜的边界）
  if (buryCand.size) {
    // 「还被活膜引用」直接问 faceLinks（fuzz 守着「环边的 faceLinks 含它」不变量；被消耗的膜已出库 → 查不到），不再扫全部膜的环（2400 面 2 ms）
    const kept = (eid: EdgeId): boolean => g.edge(eid).faceLinks.some((fid) => store.face(fid) !== undefined);
    mark("identity.kept");
    // 只扫动词像的环段：身份像的环段 = 未动膜的图边（ringsOf 一段一边），已全在 kept 里；再扫一遍是 O(候选 × 全部环段)（2400 面推拉提交 27 ms，#22）
    const segs: [Pt3, Pt3][] = [];
    for (const im of table.images) for (const ring of im.rings) for (let i = 0; i < ring.length; i++) segs.push([ring[i], ring[(i + 1) % ring.length]]);
    for (const eid of [...buryCand]) {
      if (!g.hasEdge(eid) || kept(eid)) { buryCand.delete(eid); continue; }
      const e = g.edge(eid);
      const pa = g.pt(e.a), pb = g.pt(e.b);
      const onBoundary = segs.some(([p, q]) => pointOnSegment3(pa, p, q, INSERT_TOL) && pointOnSegment3(pb, p, q, INSERT_TOL));
      if (!onBoundary) { g.removeEdge(eid); buryCand.delete(eid); }
    }
  }

  mark("identity.bury");
  // ② 插边
  const gesture = new Set<EdgeId>();
  const explicitEnds = new Set<string>();
  const splitChildren = new Map<EdgeId, EdgeId[]>();   // 切割血缘（身份膜环边的随葬要沿血缘找后代）
  const EL = table.edgeLayers;
  const onSplit = (parent: EdgeId, children: readonly EdgeId[]): void => {
    if (gesture.delete(parent)) for (const c of children) gesture.add(c);
    if (buryCand.delete(parent)) for (const c of children) buryCand.add(c);
    EL?.onSplit(parent, children);
    splitChildren.set(parent, [...children]);
    dirty.delete(parent); for (const c of children) dirty.add(c);
  };
  const descendants = (eid: EdgeId): EdgeId[] => {
    const kids = splitChildren.get(eid);
    return kids ? kids.flatMap(descendants) : [eid];
  };
  const userEdges = new Set<EdgeId>();                // 本次显式画的线（随葬豁免，含后代）
  const ins = (a: Pt3, b: Pt3, kind: "gesture" | "wire" | "image"): void => {
    const r = insertSegment(g, a, b, (parent, c1, c2) => onSplit(parent, [c1, c2]));
    for (const e of r.created) dirty.add(e); for (const e of r.retraced) dirty.add(e);
    if (kind === "gesture") { for (const e of r.created) gesture.add(e); for (const e of r.retraced) gesture.add(e); }
    if (kind !== "image") { for (const e of r.created) userEdges.add(e); for (const e of r.retraced) userEdges.add(e); }
  };
  for (const s of table.gesture ?? []) { ins(s.a, s.b, "gesture"); explicitEnds.add(ptKey3(quantize3(s.a))); explicitEnds.add(ptKey3(quantize3(s.b))); }
  for (const s of table.wires ?? []) { ins(s.a, s.b, "wire"); explicitEnds.add(ptKey3(quantize3(s.a))); explicitEnds.add(ptKey3(quantize3(s.b))); }
  for (const c of creases) ins(c.a, c.b, "image");
  for (const im of verbImages) for (const ring of im.rings) for (let i = 0; i < ring.length; i++) ins(ring[i], ring[(i + 1) % ring.length], "image");

  mark("insert");
  // ③ 自愈（搬迁造成的交叉 / 骑边；切割血缘喂回手势集与随葬集）——只围绕脏边
  planarize(g, onSplit, dirty);
  mark("planarize");

  // ④ 胞腔——只算「被碰到的平面」：被消耗膜的平面 + 动词像的平面 + 含任一脏边的平面（+ 脏边周围新长出的候选平面）
  for (const im of verbImages) {
    const plane = planeOfRing(im.rings[0]);
    if (plane) touchedPlanes.add(reg.ensure(plane, tol).id);
  }
  const dirtyLive = [...dirty].filter((id) => g.hasEdge(id)).map((id) => g.edge(id));
  for (const rec of reg.all()) {
    if (touchedPlanes.has(rec.id)) continue;
    for (const e of dirtyLive) if (distToPlane(g.pt(e.a), rec.plane) <= tol && distToPlane(g.pt(e.b), rec.plane) <= tol) { touchedPlanes.add(rec.id); break; }
  }
  const dirtyVerts = new Set<VertexId>();
  for (const e of dirtyLive) { dirtyVerts.add(e.a); dirtyVerts.add(e.b); }
  // 候选平面发现（原在 groupCoplanar 第 1 步；影响域定理把它搬到这里：新平面与旧平面走同一套边集构造）。全局模式 = 全部顶点、全部平面
  // 脏顶点永远先发现（两种模式同序 → sticky 平面代表相同，差分 oracle 才能逐字比）；全局模式再把其余顶点补上
  for (const pid of discoverPlanes(g, reg, tol, dirtyVerts)) touchedPlanes.add(pid);
  if (GLOBAL) { discoverPlanes(g, reg, tol, g.vertices().map((v) => v.id)); for (const rec of reg.all()) touchedPlanes.add(rec.id); }
  // 影响域（立宪页 §3「局部性定理」，2026-10-23）：每张被碰平面 P 上这次要用的边集 S =
  //   ① 脏边 + 被消耗膜旧环边的后代（在 P 上的）
  //   ② 从 ① 的端点出发、沿「在 P 上且不属于 P 上活膜」的边可达的裸线（闭合一个大环只差最后一笔）
  //   ③ 影响域包围盒内落在 P 上的边（空间网格现查；不连通的旧闭环 = 新膜的洞）
  //   ④ 受影响膜（环上有可达顶点 / 环里有死边 / 内部含可达顶点）的全部环边
  // 定理：在 S 上切出的胞腔去掉「与未受影响膜同环」的，= 在 P 全部边上切出的胞腔去掉未受影响膜的胞腔。其余膜原地不动（环都不碰）。
  // 「边属于哪张平面」是谓词现算，不是状态——10-21 的 PlaneMembership 缓存在溶解步后过期且永不自愈（总账 #26），已删。
  const neighFaces = new Set<FaceId>();
  const subset = new Map<PlaneId, Set<EdgeId>>();
  {
    const onPlaneE = (e: { a: VertexId; b: VertexId }, pl: { n: Pt3; d: number }): boolean => distToPlane(g.pt(e.a), pl) <= tol && distToPlane(g.pt(e.b), pl) <= tol;
    const facesByPlane = new Map<PlaneId, Face[]>();
    for (const f of store.faces()) if (touchedPlanes.has(f.planeId)) (facesByPlane.get(f.planeId) ?? facesByPlane.set(f.planeId, []).get(f.planeId)!).push(f);
    for (const pid of touchedPlanes) {
      const rec = reg.rec(pid);
      const sub = new Set<EdgeId>();
      for (const e of dirtyLive) if (onPlaneE(e, rec.plane)) sub.add(e.id);
      for (const eid0 of consumedEdges) for (const eid of descendants(eid0)) if (g.hasEdge(eid)) { const e = g.edge(eid); if (onPlaneE(e, rec.plane)) sub.add(eid); }
      // ① 可达顶点：种子边的端点，再沿「不属于这张平面上活膜」的边传递（裸线、别的平面的膜的边、死膜残留链接）——闭合一个大环只差最后一笔
      const reach = new Set<VertexId>();
      for (const eid of sub) { const e = g.edge(eid); reach.add(e.a); reach.add(e.b); }
      const stack = [...reach];
      while (stack.length) {
        const v = stack.pop()!;
        if (!g.hasVertex(v)) continue;
        for (const eid of g.vertex(v).edges) {
          const e = g.edge(eid);
          if (!onPlaneE(e, rec.plane)) continue;
          if (e.faceLinks.some((fid) => { const f = store.face(fid); return !!f && f.planeId === pid; })) continue;
          sub.add(eid);
          const o = g.otherEnd(e, v);
          if (!reach.has(o)) { reach.add(o); stack.push(o); }
        }
      }
      // ③ 影响域包围盒内落在这张平面上的边（全局模式 = 整张平面）
      if (GLOBAL) { for (const e of g.edges()) if (onPlaneE(e, rec.plane)) sub.add(e.id); }
      else if (sub.size) {
        const mn = { x: Infinity, y: Infinity, z: Infinity }, mx = { x: -Infinity, y: -Infinity, z: -Infinity };
        for (const eid of sub) { const e = g.edge(eid); for (const p of [g.pt(e.a), g.pt(e.b)]) { if (p.x < mn.x) mn.x = p.x; if (p.y < mn.y) mn.y = p.y; if (p.z < mn.z) mn.z = p.z; if (p.x > mx.x) mx.x = p.x; if (p.y > mx.y) mx.y = p.y; if (p.z > mx.z) mx.z = p.z; } }
        for (const e of g.edgesInBox(mn, mx)) if (onPlaneE(e, rec.plane)) sub.add(e.id);
      }
      // ④ 膜入选 = 环上有可达顶点 或 环里有死边 或 内部含可达顶点（膜的顶点**不**再往外传递——否则整张平面连成片）
      for (const f of facesByPlane.get(pid) ?? []) {
        let hit = GLOBAL;
        for (const ring of [f.outer, ...f.holes]) { for (const d of ring.edges) { if (!g.hasEdge(d.edge)) { hit = true; break; } const e = g.edge(d.edge); if (reach.has(e.a) || reach.has(e.b)) { hit = true; break; } } if (hit) break; }
        if (!hit) for (const v of reach) { if (!g.hasVertex(v)) continue; const p2 = projectToPlane(g.pt(v), rec.basis); if (pointInRing(p2, f.outer.pts) && !f.holes.some((h) => pointInRing(p2, h.pts))) { hit = true; break; } }
        if (hit) { neighFaces.add(f.id); for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) if (g.hasEdge(d.edge)) sub.add(d.edge); }
      }
      subset.set(pid, sub);
    }
  }
  mark("touched");
  const byPlane = store.regionsByPlane(g, reg, tol, { only: touchedPlanes, edges: subset });
  mark("regions");
  // 没进邻域的膜原地不动；它们的边环若与某胞腔同一组边（近平行平面同环 / 邻域边界），那胞腔不算
  {
    const keyOf = (rings: readonly { edges: readonly { edge: EdgeId }[] }[]): string => rings.map((ring) => [...ring.edges.map((d) => d.edge)].sort((a, b) => a - b).join(",")).join("|");
    const untouchedKeys = new Set<string>();
    for (const f of store.faces()) if (!neighFaces.has(f.id)) untouchedKeys.add(keyOf([f.outer, ...f.holes]));
    for (const f of store.faces()) if (neighFaces.has(f.id)) untouchedKeys.delete(keyOf([f.outer, ...f.holes]));   // 同环双胞（已知残余）里有一张受影响 → 这胞腔要算
    if (untouchedKeys.size) for (const [pid, regions] of byPlane) byPlane.set(pid, regions.filter((r) => !untouchedKeys.has(keyOf([r.outer, ...r.holes]))));
  }

  // ⑤ 认领：像 → 胞腔集；胞腔 → 认领像集
  //   每个胞腔的代表点只算一次（像 × 胞腔是本机最贵的一步：#14 基线 600 面时 13 ms 全花在逐对重算代表点上）；
  //   像的 2D 包围盒先粗筛，再做绕数。
  const claimsOf = new Map<Region, Claim[]>();
  const cellsOf = new Map<Image, { r: Region; planeId: PlaneId }[]>();
  const repOf = new Map<Region, Pt3>();
  for (const [pid, regions] of byPlane) {
    const prec = reg.rec(pid);
    const { u, v } = prec.basis, n = prec.plane.n, d = prec.plane.d;
    for (const r of regions) { const rp = representativePoint(r); repOf.set(r, { x: u.x * rp.x + v.x * rp.y + n.x * d, y: u.y * rp.x + v.y * rp.y + n.y * d, z: u.z * rp.x + v.z * rp.y + n.z * d }); }
  }
  const claim = (im: Image): void => {
    const cells: { r: Region; planeId: PlaneId }[] = [];
    cellsOf.set(im, cells);
    const plane = planeOfRing(im.rings[0]);   // Newell 整环：µm 尖刺 / 近共线三点不给垃圾法向
    if (!plane) return;   // 零面积 → 零认领
    const rec = reg.ensure(plane, tol);
    const rings2 = im.rings.map((r) => r.map((p) => projectToPlane(p, rec.basis)));
    let bx0 = Infinity, by0 = Infinity, bx1 = -Infinity, by1 = -Infinity;
    for (const r of rings2) for (const q of r) { if (q.x < bx0) bx0 = q.x; if (q.y < by0) by0 = q.y; if (q.x > bx1) bx1 = q.x; if (q.y > by1) by1 = q.y; }
    const wind = (p: Pt): number => rings2.reduce((acc, r) => acc + (r.length >= 3 ? windingOf(p, r) : 0), 0);
    // 共面门先 τ、认领不到再放宽到 3τ（2026-10-23）：固定 3τ 会让 2 mm 之隔的两张平行膜互相认领对方的胞腔（差分 oracle clean 种子 300922：
    // 全局机把 x=2.437 / 2.439 两面墙互相 DIVIDE / MERGE，几何没变、id 乱换）；3τ 的兜底仍留着给 09-07 那种「小面落在斜了 0.6° 的记录上」的情形。
    const gather = (gate: number): void => {
      for (const [pid, regions] of byPlane) {
        const prec = reg.rec(pid);
        if (Math.abs(dot3(prec.plane.n, rec.plane.n)) < 0.999) continue;   // 明显不平行 → 不可能是同一张膜（2.6°）
        for (const r of regions) {
          const rep3 = repOf.get(r)!;
          if (distToPlane(rep3, rec.plane) > gate) continue;
          const q = projectToPlane(rep3, rec.basis);
          if (q.x < bx0 || q.x > bx1 || q.y < by0 || q.y > by1) continue;   // 包围盒外，绕数必为 0
          if (Math.abs(wind(q)) < 1) continue;
          cells.push({ r, planeId: pid });
        }
      }
    };
    gather(tol);
    if (!cells.length) gather(3 * tol);
    for (const c of cells) (claimsOf.get(c.r) ?? claimsOf.set(c.r, []).get(c.r)!).push({ im });
  };
  const identityTouched = identity.filter((im) => neighFaces.has(im.inherit!));
  for (const im of identityTouched) claim(im);
  for (const im of verbImages) claim(im);

  mark("claims");
  // ⑥ 逐胞腔裁决：填 / 不填
  const filled = new Set<Region>();
  for (const [r, cs] of claimsOf) {
    const hasXor = cs.some((c) => c.im.algebra === "xor");
    if (hasXor ? cs.length % 2 === 1 : cs.length >= 1) filled.add(r);
  }
  // 身份 → 它的像们认领到的**填充**胞腔；另记几何认领数（不管填不填）给守恒断言用
  const cellsById = new Map<FaceId, { r: Region; planeId: PlaneId }[]>();
  const geomClaims = new Map<FaceId, number>();
  const newImageCells: { r: Region; planeId: PlaneId }[] = [];
  for (const [im, cells] of cellsOf) {
    if (im.inherit !== undefined) geomClaims.set(im.inherit, (geomClaims.get(im.inherit) ?? 0) + cells.length);
    for (const c of cells) {
      if (!filled.has(c.r)) continue;
      if (im.inherit === undefined) newImageCells.push(c);
      else (cellsById.get(im.inherit) ?? cellsById.set(im.inherit, []).get(im.inherit)!).push(c);
    }
  }
  const allIds = new Set<FaceId>([...consumedIds, ...identityTouched.map((im) => im.inherit!)]);
  const planeOfRegion = new Map<Region, PlaneId>();
  for (const [pid, regions] of byPlane) for (const r of regions) planeOfRegion.set(r, pid);

  // ⑦ 身份裁决：一对多 → DIVIDE（铸新）；一对一 → 暂定持有；零 → BURST
  const owners = new Map<Region, FaceId[]>();          // 胞腔 → 候选持有者（暂定 id 或 DIVIDE 铸出的新 id）
  const minted = new Set<FaceId>();                     // 本轮铸出的 id（DIVIDE 子膜）
  const divided = new Set<FaceId>();
  const wasFace = (id: FaceId): boolean => allIds.has(id);
  for (const id of allIds) {
    const cells = [...new Set(cellsById.get(id) ?? [])];
    if (cells.length === 0) {
      // 守恒断言（2026-10-23，总账 #26）：没被动词消耗、环还在的膜，它的身份像**几何上**一个胞腔都认领不到 = 结算机自相矛盾
      // （影响域漏边 / τ 带内嵌入不一致），不是结果——宁炸不糊：throw，commitOp 整批回滚。XOR 湮灭（认领到了但不填）仍是合法 BURST。
      if (!table.consumed.has(id) && (geomClaims.get(id) ?? 0) === 0) throw new Error(`settle: 膜 ${id} 未被消耗、环还在，身份像却认领不到任何胞腔——结算机自相矛盾，拒绝这次操作`);
      store.deleteSilently(id);
      events.push({ type: "BURST", face: id });
      continue;
    }
    if (cells.length === 1) { (owners.get(cells[0].r) ?? owners.set(cells[0].r, []).get(cells[0].r)!).push(id); continue; }
    store.deleteSilently(id);
    divided.add(id);
    const into: FaceId[] = [];
    for (const c of cells) {
      const nf = store.mint(c.planeId, c.r);
      minted.add(nf.id);
      into.push(nf.id);
      (owners.get(c.r) ?? owners.set(c.r, []).get(c.r)!).push(nf.id);
    }
    events.push({ type: "DIVIDE", from: id, into });
  }
  // 新像独占的胞腔（记下带材质的新像：胞腔 → 材质槽）
  const newClaimed = new Map<Region, number>();
  const newFaceVals = new Map<Region, Readonly<Record<string, number>>>();
  for (const c of newImageCells) newClaimed.set(c.r, (newClaimed.get(c.r) ?? 0) + 1);
  for (const [im, cells] of cellsOf) if (im.inherit === undefined && im.face) for (const c of cells) if (filled.has(c.r) && !newFaceVals.has(c.r)) newFaceVals.set(c.r, im.face);

  // ⑧ 逐填充胞腔定膜
  const stretched: FaceId[] = [];
  for (const r of filled) {
    const pid = planeOfRegion.get(r)!;
    const ids = [...new Set(owners.get(r) ?? [])];
    const hasNew = (newClaimed.get(r) ?? 0) > 0;
    if (ids.length === 0) {
      if (hasNew) { const nf = store.mint(pid, r); events.push({ type: "BIRTH", face: nf.id }); table.faceLayers?.setAll(nf.id, newFaceVals.get(r)); }
      continue;
    }
    if (ids.length === 1 && !hasNew) {
      const id = ids[0];
      if (minted.has(id)) continue;                                  // DIVIDE 子膜已铸
      store.setFace(id, pid, r);                                     // 一对一：保 id（换平面也跟随）
      if (table.consumed.has(id)) stretched.push(id);
      continue;
    }
    // 多对一 → MERGE（含新像参与）
    const from: FaceId[] = [];
    for (const id of ids) { if (!minted.has(id) && wasFace(id)) from.push(id); store.deleteSilently(id); }
    for (const id of ids) if (minted.has(id)) { from.push(id); }
    const nf = store.mint(pid, r);
    events.push({ type: "MERGE", from, into: nf.id });
  }
  // 手势出生：无主胞腔外环含手势边
  if (gesture.size) {
    for (const [pid, regions] of byPlane) {
      for (const r of regions) {
        if (claimsOf.has(r)) continue;
        if (r.outer.edges.some((d) => gesture.has(d.edge))) {
          const nf = store.mint(pid, r);
          events.push({ type: "BIRTH", face: nf.id });
        }
      }
    }
  }
  mark("decide");
  store.rebuildFaceLinks(g);
  mark("faceLinks");

  // ⑨ 随葬第二相（通则，动词开关）：结算后无膜的边只许是用户画的线（本次的 / 之前就是裸线的，含切割后代）
  if (table.buryOrphans) {
    const exempt = new Set<EdgeId>();
    for (const eid of preWires) for (const c of descendants(eid)) exempt.add(c);
    for (const eid of userEdges) for (const c of descendants(eid)) exempt.add(c);
    for (const e of g.edges()) if (e.faceLinks.length === 0 && !exempt.has(e.id)) g.removeEdge(e.id);
  }

  mark("bury");
  // ⑩ 溶解：因本次操作新成为二度共线的顶点
  for (const v of g.vertices()) {
    if (wasCollinear2.has(v.id)) continue;
    const c = collinear2(g, v.id);
    if (!c) continue;
    if (explicitEnds.has(ptKey3({ x: v.x, y: v.y, z: v.z }))) continue;
    const fa = g.edge(c.ea).faceLinks, fb = g.edge(c.eb).faceLinks;
    if (fa.length !== fb.length || !fa.every((f) => fb.includes(f))) continue;
    if (g.edgeBetween(c.a, c.b) !== undefined) continue;   // 退化三角，不动
    const ne = g.addEdge(c.a, c.b);
    g.edge(ne).faceLinks = [...fa];
    EL?.onMerge(ne, c.ea, c.eb);
    for (const fid of new Set(fa)) {
      const f = store.face(fid);
      if (f) for (const ring of [f.outer, ...f.holes]) spliceRing(g, ring, c.ea, c.eb, ne);
    }
    g.removeEdge(c.ea);
    g.removeEdge(c.eb);
  }
  mark("dissolve");
  // ⑪ 边属性层：删掉的边出集；新段上落下的边入集（规则在 layers.ts）
  if (EL) {
    EL.prune((id) => g.hasEdge(id));
    if (table.layerSegs) { const es = g.edges(); for (const [n, segs] of Object.entries(table.layerSegs)) EL.mark(n, es, (id) => g.pt(id), segs); }
  }
  mark("layers");
  if (stretched.length) events.push({ type: "STRETCH", faces: stretched });
  return events;
}

/** 环内把相邻的两条边 (ea, eb)（经某个二度顶点相连）换成一条边 ne；去掉中间点。桥边（同面两侧）会出现两对，全部替换。 */
function spliceRing(g: PlanarGraph, ring: Ring, ea: EdgeId, eb: EdgeId, ne: EdgeId): void {
  for (let guard = 0; guard < 4; guard++) {
    const n = ring.edges.length;
    let i = -1;
    for (let j = 0; j < n; j++) {
      const d1 = ring.edges[j], d2 = ring.edges[(j + 1) % n];
      if ((d1.edge === ea && d2.edge === eb) || (d1.edge === eb && d2.edge === ea)) { i = j; break; }
    }
    if (i < 0) return;
    const d1 = ring.edges[i];
    const start = d1.forward ? g.edge(d1.edge).a : g.edge(d1.edge).b;
    const rep: DirEdge = { edge: ne, forward: g.edge(ne).a === start };
    const edges: DirEdge[] = [], pts: Pt[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) { edges.push(rep); pts.push(ring.pts[j]); continue; }
      if (j === (i + 1) % n) continue;
      edges.push(ring.edges[j]); pts.push(ring.pts[j]);
    }
    ring.edges = edges; ring.pts = pts;
  }
}

/** 一张像沿 δ 平移（pp 的帽）。 */
export const translateImage = (rings: readonly (readonly Pt3[])[], delta: Pt3): Pt3[][] => rings.map((r) => r.map((p) => add3(p, delta)));

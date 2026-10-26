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

import { type Pt, type Pt3, add3, cross, dist3, distToPlane, dot3, planeOfRing, pointInRing, pointOnSegment3, projectToPlane, ptKey3, quantize3, samePt3, sub3, Q } from "./geom.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type DirEdge, type Region, type Ring, representativePoint } from "./facefind.ts";
import { type PlaneId, PlaneRegistry, discoverPlanes } from "./planes.ts";
import { INSERT_TOL, STICKY, insertSegment } from "./subdivide.ts";
import { toLattice3 } from "./exact/lattice.ts";
import { pointNearSegment } from "./exact/predicates3d.ts";
import { orient2dD } from "./exact/predicates.ts";
import { planarize } from "./planarize.ts";
import { flattenPlanes } from "./tau-flatten.ts";
import { foldDecompose } from "./autofold.ts";
import { type Face, type FaceEvent, FaceStore, ringEdgeIds } from "./face-lifecycle.ts";
import type { EdgeLayers, FaceLayers } from "./layers.ts";
import { type CurveRegistry, type CurveSpec, edgesAlongSegs } from "./curves.ts";
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
  /**
   * 分片组（v0.10.3）：同组的像是**同一张面的分片**（跟随的扫掠面 = 它的全部四边形），一个胞腔被同组几张认领只算一次（组内是并），
   * 组与世界之间才按 algebra 算。没有它，轮廓穿过转轴的跟随（SU 不用插件画球：圆跟随圆）两半各扫一遍、每胞腔两张 XOR 像 → 偶数 → 不填 → 球是空的。
   */
  group?: number;
}
/** 动词提交的「这批段是一条曲线」（0.10.2 起登记归结算机，动词不再自己 create / cut）。 */
export interface NewCurve { readonly segs: readonly Seg3[]; readonly spec: CurveSpec; }

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
  /** 曲线登记处（0.10）：机器只调它的钩子——切割按序传子 / 删边出链 / 溶解顶替 / 结算后 prune。 */
  curves?: CurveRegistry;
  /** 本次落下的曲线（圆 / 弧 / 折线）：段 + 规格。结算完才登记（段上的边那时才存在），随后对本次动过的顶点跑断点规则（curves.ts rechain）。 */
  newCurves?: readonly NewCurve[];
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
      if (b.y > p.y && orient2dD(a, b, p) > 0) w++;   // 精确（EGC 期 3）
    } else if (b.y <= p.y && orient2dD(a, b, p) < 0) w--;
  }
  return w;
}

/** 顶点是否「二度共线」（两条边反向共线）。导出给内核的显式溶解动词（焊边橡皮 / A33 断口判定）复用——同一把尺子。 */
export function collinear2(g: PlanarGraph, vid: VertexId): { a: VertexId; b: VertexId; ea: EdgeId; eb: EdgeId } | null {
  const v = g.vertex(vid);
  if (v.edges.size !== 2) return null;
  const [ea, eb] = [...v.edges];
  const a = g.otherEnd(g.edge(ea), vid), b = g.otherEnd(g.edge(eb), vid);
  if (a === b) return null;
  const pv = g.pt(vid), pa = g.pt(a), pb = g.pt(b);
  // EGC 期 3：共线 = 中间点离两端连线 ≤ r（身份分辨率那把尺，格点精确），且两边反向（点积 < 0）——不再是裸角度 1e⁻⁹
  const La = toLattice3(pa), Lb = toLattice3(pb), Lv = toLattice3(pv);
  if ((La.x === Lv.x && La.y === Lv.y && La.z === Lv.z) || (Lb.x === Lv.x && Lb.y === Lv.y && Lb.z === Lv.z)) return null;
  const dx1 = La.x - Lv.x, dy1 = La.y - Lv.y, dz1 = La.z - Lv.z, dx2 = Lb.x - Lv.x, dy2 = Lb.y - Lv.y, dz2 = Lb.z - Lv.z;
  if (BigInt(dx1) * BigInt(dx2) + BigInt(dy1) * BigInt(dy2) + BigInt(dz1) * BigInt(dz2) >= 0n) return null;
  if (!pointNearSegment(Lv, La, Lb, Math.round(STICKY.r / Q))) return null;
  return { a, b, ea, eb };
}

/**
 * 溶解一个二度共线顶点：ea、eb 并成一条新边 a–b（层 / 曲线按 onMerge 并、所属膜的环就地 splice、旧边删）。
 * 前提（调用方负责判，不满足返回 false 不动）：两边的面链接相同；a–b 之间还没有边（退化三角不动）。
 * 结算机 ⑩ 与 Kernel.dissolveVertices（焊边橡皮的「共轴 → 真合并」，user 2026-10-24）共用这一份——合并只有一种写法。
 */
export function dissolveAt(g: PlanarGraph, store: FaceStore, c: { a: VertexId; b: VertexId; ea: EdgeId; eb: EdgeId }, EL?: EdgeLayers, curves?: CurveRegistry): boolean {
  const fa = g.edge(c.ea).faceLinks, fb = g.edge(c.eb).faceLinks;
  if (fa.length !== fb.length || !fa.every((f) => fb.includes(f))) return false;
  if (g.edgeBetween(c.a, c.b) !== undefined) return false;   // 退化三角，不动
  const ne = g.addEdge(c.a, c.b);
  g.edge(ne).faceLinks = [...fa];
  EL?.onMerge(ne, c.ea, c.eb);
  curves?.onMerge(ne, c.ea, c.eb);
  for (const fid of new Set(fa)) {
    const f = store.face(fid);
    if (f) for (const ring of [f.outer, ...f.holes]) spliceRing(g, ring, c.ea, c.eb, ne);
  }
  g.removeEdge(c.ea);
  g.removeEdge(c.eb);
  return true;
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
    images: d.pieces.map((idxs) => ({ rings: [idxs.map((i) => outer[i])], algebra: im.algebra, ...(im.inherit !== undefined ? { inherit: im.inherit } : {}), ...(im.group !== undefined ? { group: im.group } : {}) })),
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
/** 调试钩子（默认 null 零开销）：影响域 / 胞腔 / 认领逐条打出来——守恒断言响了先开它看，别猜。added by Claude Fable 5.1 2026-10-24 */
/** 影响域 ③ 包围盒的余量（米）——见 scope() 里的 ⚠ 注释；临时、等定理补洞。 */
const BOX_SLACK = 1;
export const SETTLE_DEBUG: { log: ((line: string) => void) | null } = { log: null };
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
  // 本次会动到的膜（出库 / 换环 / 新铸）与它们改动前的环边：faceLinks 增量维护用（FaceStore.relinkFaces），不再全量重建
  const changed = new Set<FaceId>();
  const oldRings = new Map<FaceId, EdgeId[]>();
  const noteOld = (id: FaceId): void => { if (!oldRings.has(id)) { const f = store.face(id); if (f) oldRings.set(id, ringEdgeIds(f)); } changed.add(id); };
  // 前置快照只看影响域（O(影响域)，不扫全表；2026-10-23）：插边会切开的边 = 新线段附近的边（空间网格超集）∪ 脏边 ∪ 被消耗膜的旧环边。
  // 本次之外的顶点 / 边的星形不会变（planarize 只配脏边 × 近边），所以「操作前是否二度共线」「操作前是否裸线」只需在这些边的端点 / 本身上记。
  const near = new Set<EdgeId>();                     // 新线段附近的既有边（可能被切）
  if (!GLOBAL) {
    const segs: [Pt3, Pt3][] = [];
    for (const s of [...(table.gesture ?? []), ...(table.wires ?? []), ...creases]) segs.push([s.a, s.b]);
    for (const im of verbImages) for (const ring of im.rings) for (let i = 0; i < ring.length; i++) segs.push([ring[i], ring[(i + 1) % ring.length]]);
    for (const [pa, pb] of segs) for (const e of g.edgesNear(pa, pb)) near.add(e.id);
  } else for (const e of g.edges()) near.add(e.id);
  const buryCand = new Set<EdgeId>();                 // 第一相候选 = 被消耗膜的旧环边
  const consumedEdges = new Set<EdgeId>();            // 被消耗膜的全部旧环边（面内邻域的种子，不受随葬第一相筛减）
  const consumedIds: FaceId[] = [];
  for (const id of table.consumed) {
    const f = store.face(id);
    if (!f) continue;
    consumedIds.push(id);
    noteOld(id);
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) { buryCand.add(d.edge); consumedEdges.add(d.edge); }
    store.deleteSilently(id);
  }
  const preEdges = new Set<EdgeId>();
  for (const id of dirty) if (g.hasEdge(id)) preEdges.add(id);
  for (const id of near) preEdges.add(id);
  for (const id of consumedEdges) if (g.hasEdge(id)) preEdges.add(id);
  const wasCollinear2 = new Set<VertexId>();
  const preVerts = new Set<VertexId>();
  for (const id of preEdges) { const e = g.edge(id); preVerts.add(e.a); preVerts.add(e.b); }
  for (const v of preVerts) if (collinear2(g, v)) wasCollinear2.add(v);
  const preWires = new Set<EdgeId>();                 // 操作前就是裸线的边（随葬豁免，含后代）——只记影响域内的，外面的裸线本次不会变成孤儿
  for (const id of preEdges) if (g.edge(id).faceLinks.length === 0) preWires.add(id);
  const candVerts = new Set<VertexId>();              // 溶解候选：本次星形变过的顶点（删边 / 加边 / 切边的端点）
  mark("identity.pre");
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
      if (!onBoundary) { candVerts.add(e.a); candVerts.add(e.b); table.curves?.onRemove(eid); g.removeEdge(eid); buryCand.delete(eid); }
    }
  }

  mark("identity.bury");
  // ② 插边
  const vFloor = g.nextVertexId, eFloor = g.nextEdgeId;   // 旧 / 新界线（τ-flatten：新几何让位给旧几何）
  const parentOf = new Map<EdgeId, EdgeId>();              // 切割血缘反向（子 → 父）：旧边的后代仍算旧
  const isOldEdge = (eid: EdgeId): boolean => { let id = eid; for (let i = 0; i < 64; i++) { if (id < eFloor) return true; const par = parentOf.get(id); if (par === undefined) return false; id = par; } return false; };
  const gesture = new Set<EdgeId>();
  const explicitEnds = new Set<string>();
  const splitChildren = new Map<EdgeId, EdgeId[]>();   // 切割血缘（身份膜环边的随葬要沿血缘找后代）
  const EL = table.edgeLayers;
  const onSplit = (parent: EdgeId, children: readonly EdgeId[]): void => {
    if (gesture.delete(parent)) for (const c of children) gesture.add(c);
    if (buryCand.delete(parent)) for (const c of children) buryCand.add(c);
    EL?.onSplit(parent, children);
    table.curves?.onSplit(g, parent, children);
    splitChildren.set(parent, [...children]);
    for (const c of children) if (c !== parent && !parentOf.has(c)) parentOf.set(c, parent);
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

  const neighFaces = new Set<FaceId>();
  const subset = new Map<PlaneId, Set<EdgeId>>();
  const scope = (): void => {
  neighFaces.clear(); subset.clear();
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
  {
    const onPlaneE = (e: { a: VertexId; b: VertexId }, pl: { n: Pt3; d: number }): boolean => distToPlane(g.pt(e.a), pl) <= tol && distToPlane(g.pt(e.b), pl) <= tol;
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
        // ⚠ BOX_SLACK = 旧空间网格（固定 1 m 格、查询外扩一格）白给的余量，原样保留（2026-10-26 Claude Opus 5.5）：网格改成不写死尺度之后，
        //   差分 oracle tilted 种子 340517 第 11 步局部少生一张面——新线闭合的空洞有一条边属于未受影响的膜、又在 S 的包围盒外，①–④ 都够不着。
        //   这是定理的缺口（大于 1 m 的同形场景旧代码也会漏），不是网格的；根治归 Fable（纪元账本 DT83 / 家族周账 F-96），在那之前别删这个余量。
        for (const e of g.edgesInBox({ x: mn.x - BOX_SLACK, y: mn.y - BOX_SLACK, z: mn.z - BOX_SLACK }, { x: mx.x + BOX_SLACK, y: mx.y + BOX_SLACK, z: mx.z + BOX_SLACK })) if (onPlaneE(e, rec.plane)) sub.add(e.id);
      }
      // ④ 膜入选 = 环上有可达顶点 或 环里有死边 或 内部含可达顶点（膜的顶点**不**再往外传递——否则整张平面连成片）
      //    前两种从边找膜（faceLinks：切出来的子边继承了父边的链接，所以「环里有死边」的膜挂在 sub 里的子边上；可达顶点的膜挂在它的邻边上），
      //    第三种按膜的包围盒粗筛再 pointInRing——都不用逐膜扫环。全局模式 = 这张平面全部膜。
      const take = (f: Face | undefined): void => {
        if (!f || f.planeId !== pid || neighFaces.has(f.id)) return;
        neighFaces.add(f.id);
        for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) if (g.hasEdge(d.edge)) sub.add(d.edge);
      };
      if (GLOBAL) { for (const f of store.facesOnPlane(pid)) take(f); }
      else {
        for (const eid of [...sub]) for (const fid of g.edge(eid).faceLinks) take(store.face(fid));
        const reach2: Pt[] = [];
        for (const v of reach) { if (!g.hasVertex(v)) continue; for (const eid of g.vertex(v).edges) for (const fid of g.edge(eid).faceLinks) take(store.face(fid)); reach2.push(projectToPlane(g.pt(v), rec.basis)); }
        if (reach2.length) for (const f of store.facesOnPlane(pid)) {
          if (neighFaces.has(f.id)) continue;
          const b = f.bbox;
          for (const p2 of reach2) {
            if (p2.x < b.x0 || p2.x > b.x1 || p2.y < b.y0 || p2.y > b.y1) continue;
            if (pointInRing(p2, f.outer.pts) && !f.holes.some((h) => pointInRing(p2, h.pts))) { take(f); break; }
          }
        }
      }
      subset.set(pid, sub);
    }
  }
  };
  scope();
  // ④½ τ-flatten（EGC 期 3b，tau-flatten.ts）：同一平面组里 3D 相距 (r, 2τ] 的东西在投影里相交 / 骑边 / 重合 → 并成一个；
  //    改了图就再跑一轮 3D planarize + 重算影响域，直到不动点。不收敛 = 数值异常，宁炸不糊（守恒断言之前就报）。
  {
    const flattenCtx = {
      r: STICKY.r, dirty, isOldEdge, isOldVertex: (v: VertexId) => v < vFloor,
      onSplit,
      // 旧顶点被并掉（两个旧顶点在投影里 ≤ r）：引用它的活膜环按 id 改写——这些膜都在影响域里，等下按环点重新认领；环点现在按 to 读
      onMerge: (from: VertexId, to: VertexId): void => {
        for (const eid of g.vertex(from).edges) for (const fid of g.edge(eid).faceLinks) {
          const f = store.face(fid); if (!f) continue;
          for (const ring of [f.outer, ...f.holes]) for (let i = 0; i < ring.vids.length; i++) if (ring.vids[i] === from) ring.vids[i] = to;
        }
        candVerts.add(to);
      },
    };
    for (let round = 0; ; round++) {
      if (round >= 16) throw new Error("tau-flatten did not converge (>16 rounds) — numeric anomaly in the coplanar band");
      const planes = [...subset].map(([pid, sub]) => ({ basis: reg.rec(pid).basis, edges: sub }));
      if (!flattenPlanes(g, planes, flattenCtx)) break;
      planarize(g, onSplit, dirty);
      scope();
    }
  }
  mark("touched");
  const byPlane = store.regionsByPlane(g, reg, tol, { only: touchedPlanes, edges: subset });
  mark("regions");
  // 没进邻域的膜原地不动；它们的边环若与某胞腔同一组边（近平行平面同环 / 邻域边界），那胞腔不算。
  // 候选只有「环边全在 sub 里」的未受影响膜 = 挂在 sub 边 faceLinks 上的膜（胞腔由 sub 边围成，同环必经这些边）——不扫全表
  {
    const keyOf = (rings: readonly { edges: readonly { edge: EdgeId }[] }[]): string => rings.map((ring) => [...ring.edges.map((d) => d.edge)].sort((a, b) => a - b).join(",")).join("|");
    const untouchedKeys = new Set<string>();
    const seen = new Set<FaceId>();
    for (const sub of subset.values()) for (const eid of sub) { if (!g.hasEdge(eid)) continue; for (const fid of g.edge(eid).faceLinks) { if (seen.has(fid) || neighFaces.has(fid)) continue; seen.add(fid); const f = store.face(fid); if (f) untouchedKeys.add(keyOf([f.outer, ...f.holes])); } }
    for (const fid of neighFaces) { const f = store.face(fid); if (f) untouchedKeys.delete(keyOf([f.outer, ...f.holes])); }   // 同环双胞（已知残余）里有一张受影响 → 这胞腔要算
    if (untouchedKeys.size) for (const [pid, regions] of byPlane) byPlane.set(pid, regions.filter((r) => !untouchedKeys.has(keyOf([r.outer, ...r.holes]))));
  }
  // 身份像：受影响的膜按**顶点 id** 读环（Ring.vids；边被切了顶点没动、坐标没动）——不必在插边前把整张平面的膜都拍一遍
  const identity: Image[] = [];
  for (const fid of [...neighFaces].sort((a, b) => a - b)) {   // 按 id 序：两台机（局部 / 全局）入选顺序不同，裁决顺序必须一致
    const f = store.face(fid)!;
    // 合并过的环里相邻两个 id 可能变成同一个（坍缩边）→ 去掉连续重复点
    const rings = [f.outer, ...f.holes].map((r) => r.vids.filter((v, i, a) => v !== a[(i + 1) % a.length]).map((v) => g.pt(v)));
    // τ 退化（2026-10-24，800 件 mm 格点场景第 591 步）：一张厚度 < τ 的既有膜（1 mm 的细条），邻居推拉出两张 1 mm 之隔的墙 → 同一平面组 →
    // τ-flatten 把它的两条长边并成一条，环只剩 2 个点。这不是结算机矛盾，是输入在共面容差下退化（τ 说「这么近就是同一张平面」）。
    // 数据安全词典序：宁拒不删——不静默烧掉用户的面；理由说清楚，τ 多大是 user 的旋钮。
    if (rings[0].length < 3) throw new Error(`settle: 膜 ${fid} 在共面容差 τ = ${tol} m 下被压扁（厚度 < τ 的几何在 τ 语义里是退化的）——拒绝这次操作`);
    identity.push({ rings, algebra: "or", inherit: fid });
  }
  mark("identity.rings");

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
  const identityTouched = identity;
  for (const im of identityTouched) claim(im);
  for (const im of verbImages) claim(im);
  if (SETTLE_DEBUG.log) {
    const f3 = (p: Pt3): string => `(${p.x},${p.y},${p.z})`;
    SETTLE_DEBUG.log(`neighFaces ${[...neighFaces].sort((a, b) => a - b).join(",")} consumed ${consumedIds.join(",")}`);
    for (const [pid, regions] of byPlane) { SETTLE_DEBUG.log(`plane ${pid} n=${JSON.stringify(reg.rec(pid).plane)} regions ${regions.length} (sub ${subset.get(pid)?.size ?? "?"} edges)`); for (const r of regions) SETTLE_DEBUG.log(`  cell outer[${r.outer.edges.map((d) => d.edge).join(",")}] holes ${r.holes.length} rep ${f3(repOf.get(r)!)} claims ${(claimsOf.get(r) ?? []).map((c) => c.im.inherit ?? "verb").join(",")}`); }
    for (const im of [...identityTouched, ...verbImages]) SETTLE_DEBUG.log(`image ${im.inherit ?? "verb"} ${im.algebra} rings ${im.rings.map((r) => r.map(f3).join(" ")).join(" | ")} → ${cellsOf.get(im)?.length ?? 0} cells`);
  }

  mark("claims");
  // ⑥ 逐胞腔裁决：填 / 不填
  const filled = new Set<Region>();
  for (const [r, cs] of claimsOf) {
    const hasXor = cs.some((c) => c.im.algebra === "xor");
    const n = new Set<Image | number>(cs.map((c) => c.im.group ?? c.im)).size;   // 同组分片算一个认领者
    if (hasXor ? n % 2 === 1 : n >= 1) filled.add(r);
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
  const allIds = new Set<FaceId>([...consumedIds, ...identityTouched.map((im) => im.inherit!)].sort((a, b) => a - b));   // 按 id 序裁决：铸出的新 id 与两台机 / 两台 peer 无关于 faceLinks 的历史顺序
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
      noteOld(id); store.deleteSilently(id);
      events.push({ type: "BURST", face: id });
      continue;
    }
    if (cells.length === 1) { (owners.get(cells[0].r) ?? owners.set(cells[0].r, []).get(cells[0].r)!).push(id); continue; }
    noteOld(id); store.deleteSilently(id);
    divided.add(id);
    const into: FaceId[] = [];
    for (const c of cells) {
      const nf = store.mint(c.planeId, c.r);
      changed.add(nf.id);
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
      if (hasNew) { const nf = store.mint(pid, r); changed.add(nf.id); events.push({ type: "BIRTH", face: nf.id }); table.faceLayers?.setAll(nf.id, newFaceVals.get(r)); }
      continue;
    }
    if (ids.length === 1 && !hasNew) {
      const id = ids[0];
      if (minted.has(id)) continue;                                  // DIVIDE 子膜已铸
      noteOld(id); store.setFace(id, pid, r);                        // 一对一：保 id（换平面也跟随）
      if (table.consumed.has(id)) stretched.push(id);
      continue;
    }
    // 多对一 → MERGE（含新像参与）
    const from: FaceId[] = [];
    for (const id of ids) { if (!minted.has(id) && wasFace(id)) from.push(id); noteOld(id); store.deleteSilently(id); }
    for (const id of ids) if (minted.has(id)) { from.push(id); }
    const nf = store.mint(pid, r);
    changed.add(nf.id);
    events.push({ type: "MERGE", from, into: nf.id });
  }
  // 手势出生：无主胞腔外环含手势边
  if (gesture.size) {
    for (const [pid, regions] of byPlane) {
      for (const r of regions) {
        if (claimsOf.has(r)) continue;
        if (r.outer.edges.some((d) => gesture.has(d.edge))) {
          const nf = store.mint(pid, r);
          changed.add(nf.id);
          events.push({ type: "BIRTH", face: nf.id });
        }
      }
    }
  }
  mark("decide");
  {
    // 旧环边在本次可能被切开：子边继承了父边的 faceLinks（topology.splitEdge）→ 旧 id 要沿切割血缘从后代上摘掉
    const oldExpanded = new Map<FaceId, EdgeId[]>();
    for (const [id, ring] of oldRings) { const out: EdgeId[] = []; for (const eid of ring) for (const c of descendants(eid)) out.push(c); oldExpanded.set(id, out); }
    store.relinkFaces(g, changed, oldExpanded);   // 只动变了的膜的环边（原来全膜全边重建 = O(E + F)）
  }
  mark("faceLinks");

  // ⑨ 随葬第二相（通则，动词开关）：结算后无膜的边只许是用户画的线（本次的 / 之前就是裸线的，含切割后代）。
  //    候选 = 本次可能失去最后一张膜的边：变了的膜的旧环边（含切割后代）、被消耗膜旧环边的后代、脏边——外面的边链接没动过，不扫全表
  const orphanCands = new Set<EdgeId>();
  for (const eid of dirty) if (g.hasEdge(eid)) orphanCands.add(eid);
  for (const eid of consumedEdges) for (const c of descendants(eid)) if (g.hasEdge(c)) orphanCands.add(c);
  for (const ring of oldRings.values()) for (const eid of ring) for (const c of descendants(eid)) if (g.hasEdge(c)) orphanCands.add(c);
  if (table.buryOrphans) {
    const exempt = new Set<EdgeId>();
    for (const eid of preWires) for (const c of descendants(eid)) exempt.add(c);
    for (const eid of userEdges) for (const c of descendants(eid)) exempt.add(c);
    const doomed: EdgeId[] = [];
    for (const eid of orphanCands) { const e = g.edge(eid); if (e.faceLinks.length === 0 && !exempt.has(eid)) doomed.push(eid); }
    // 影响域外的顶点：插边 / 自愈碰不到它们的星形，所以「此刻」= 「操作前」——删边之前先把它们的二度共线状态补进快照
    for (const eid of doomed) { const e = g.edge(eid); for (const v of [e.a, e.b]) if (!preVerts.has(v)) { preVerts.add(v); if (collinear2(g, v)) wasCollinear2.add(v); } }
    for (const eid of doomed) { const e = g.edge(eid); candVerts.add(e.a); candVerts.add(e.b); table.curves?.onRemove(eid); g.removeEdge(eid); }
  }

  mark("bury");
  // ⑪a 边属性层规则 ③「新段上落下的边入集」提到溶解之前（DT12，v0.14.3，Claude Opus 5.5）：溶解时新段已经带层，规则 ④「两边都有 → 并出的边也有」才成立。
  // 之前排在 ⑩ 之后 → 同向再推拉圆柱顶面：新侧棱溶解那一刻还没层，和下面那段软的旧侧棱并成一条硬边，并出的长边又不完全落在新段上、③ 也贴不上（user「第二次拖动顶面的时候，平滑组变成硬边了」）。
  if (EL && table.layerSegs) { const es = g.edges(); for (const [n, segs] of Object.entries(table.layerSegs)) EL.mark(n, es, (id) => g.pt(id), segs); }
  // ⑩ 溶解：因本次操作新成为二度共线的顶点——只看本次星形变过的顶点：新边 / 切出来的边的端点（dirty）+ 本次删掉的边的端点（candVerts）
  for (const eid of dirty) if (g.hasEdge(eid)) { const e = g.edge(eid); candVerts.add(e.a); candVerts.add(e.b); }
  for (const vid of candVerts) {
    if (!g.hasVertex(vid)) continue;
    const v = g.vertex(vid);
    if (wasCollinear2.has(v.id)) continue;
    const c = collinear2(g, v.id);
    if (!c) continue;
    if (explicitEnds.has(ptKey3({ x: v.x, y: v.y, z: v.z }))) continue;
    dissolveAt(g, store, c, EL, table.curves);
  }
  mark("dissolve");
  // ⑪ 边属性层：删掉的边出集（新段入集已在 ⑪a 提前做；规则在 layers.ts）
  if (EL) EL.prune((id) => g.hasEdge(id));
  table.curves?.prune(g);
  // ⑫ 曲线：登记本次新曲线（两端都在段上的边，INSERT_TOL），再对本次星形变过的顶点（candVerts = 删 / 加 / 切的端点，含 dirtyEdges）跑断点规则——唯一判断点
  if (table.curves) {
    const C = table.curves;
    for (const nc of table.newCurves ?? []) C.create(g, edgesAlongSegs(g, nc.segs, (pa, pb, a, b) => pointOnSegment3(pa, a, b, INSERT_TOL) && pointOnSegment3(pb, a, b, INSERT_TOL)), nc.spec);
    C.rechain(g, candVerts, tol);
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
    const edges: DirEdge[] = [], pts: Pt[] = [], vids: VertexId[] = [];
    for (let j = 0; j < n; j++) {
      if (j === i) { edges.push(rep); pts.push(ring.pts[j]); vids.push(ring.vids[j]); continue; }
      if (j === (i + 1) % n) continue;
      edges.push(ring.edges[j]); pts.push(ring.pts[j]); vids.push(ring.vids[j]);
    }
    ring.edges = edges; ring.pts = pts; ring.vids = vids;
  }
}

/** 一张像沿 δ 平移（pp 的帽）。 */
export const translateImage = (rings: readonly (readonly Pt3[])[], delta: Pt3): Pt3[][] => rings.map((r) => r.map((p) => add3(p, delta)));

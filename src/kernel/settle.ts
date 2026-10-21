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

import { type Pt, type Pt3, add3, cross, dist3, distToPlane, dot3, planeFromPoints, pointOnSegment3, projectToPlane, ptKey3, quantize3, samePt3, sub3 } from "./geom.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type DirEdge, type Region, type Ring, representativePoint } from "./facefind.ts";
import { type PlaneId, PlaneRegistry } from "./planes.ts";
import { INSERT_TOL, insertSegment } from "./subdivide.ts";
import { planarize } from "./planarize.ts";
import { foldDecompose } from "./autofold.ts";
import { type Face, type FaceEvent, FaceStore } from "./face-lifecycle.ts";

export type Algebra = "or" | "xor";
export interface Seg3 { readonly a: Pt3; readonly b: Pt3; }
/** 一张像：动词说「这张膜做完以后在这里、长这样」。 */
export interface Image {
  /** [外环, ...洞环]，世界坐标；允许重复点与零面积尖刺（绕数天然为零）；非平面 → 机器 autofold。 */
  rings: Pt3[][];
  algebra: Algebra;
  /** 继承的身份；缺省 = 新膜（独占胞腔 → BIRTH）。 */
  inherit?: FaceId;
  /** 新膜的材质槽（absorb 用：炸开 / 粘贴带着材质回来）。 */
  material?: number;
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
  /** 软边集（内核的属性层；机器维护切割继承 / 删边清理 / 新软段登记）。 */
  soft?: Set<EdgeId>;
  /** 这些线段上落下的边 = 软边（圆的近似边、软边推拉出的侧棱与帽边）。 */
  softSegs?: readonly Seg3[];
  /** 面材质层（内核的）：新像带 material 时，它独占的胞腔铸出的膜记上。 */
  faceMat?: Map<FaceId, number>;
  /** 曲线成员边集 + 新曲线段（同软边机制：切割继承 / 删边清理 / 段上落边入集）。 */
  curve?: Set<EdgeId>;
  curveSegs?: readonly Seg3[];
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
  let plane = null;
  for (let i = 0; i + 2 < outer.length && !plane; i++) plane = planeFromPoints(outer[i], outer[i + 1], outer[i + 2]);
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
 */
export function settle(g: PlanarGraph, store: FaceStore, reg: PlaneRegistry, tol: number, table: ImageTable): FaceEvent[] {
  const events: FaceEvent[] = [];

  // ① 身份像（插边前拍）+ 溶解基线 + 随葬候选
  const identity: Image[] = [];
  for (const f of store.faces()) {
    if (table.consumed.has(f.id)) continue;
    identity.push({ rings: ringsOf(g, f), algebra: "or", inherit: f.id });
  }
  const wasCollinear2 = new Set<VertexId>();
  for (const v of g.vertices()) if (collinear2(g, v.id)) wasCollinear2.add(v.id);
  const preWires = new Set<EdgeId>();                 // 操作前就是裸线的边（随葬豁免，含后代）
  for (const e of g.edges()) if (e.faceLinks.length === 0) preWires.add(e.id);
  const buryCand = new Set<EdgeId>();                 // 第一相候选 = 被消耗膜的旧环边
  const consumedIds: FaceId[] = [];
  for (const id of table.consumed) {
    const f = store.face(id);
    if (!f) continue;
    consumedIds.push(id);
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) buryCand.add(d.edge);
    store.deleteSilently(id);
  }
  // 随葬第一相：候选边若不在任何像（身份像 + 动词像）的环段上、也不被未动膜引用 → 现在就摘（它已不是任何膜的边界）
  if (buryCand.size) {
    const kept = new Set<EdgeId>();
    for (const f of store.faces()) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) kept.add(d.edge);
    const segs: [Pt3, Pt3][] = [];
    for (const im of [...identity, ...table.images]) for (const ring of im.rings) for (let i = 0; i < ring.length; i++) segs.push([ring[i], ring[(i + 1) % ring.length]]);
    for (const eid of [...buryCand]) {
      if (!g.hasEdge(eid) || kept.has(eid)) { buryCand.delete(eid); continue; }
      const e = g.edge(eid);
      const pa = g.pt(e.a), pb = g.pt(e.b);
      const onBoundary = segs.some(([p, q]) => pointOnSegment3(pa, p, q, INSERT_TOL) && pointOnSegment3(pb, p, q, INSERT_TOL));
      if (!onBoundary) { g.removeEdge(eid); buryCand.delete(eid); }
    }
  }

  // ② 插边
  const gesture = new Set<EdgeId>();
  const explicitEnds = new Set<string>();
  const splitChildren = new Map<EdgeId, EdgeId[]>();   // 切割血缘（身份膜环边的随葬要沿血缘找后代）
  const soft = table.soft, curve = table.curve;
  const onSplit = (parent: EdgeId, children: readonly EdgeId[]): void => {
    if (gesture.delete(parent)) for (const c of children) gesture.add(c);
    if (buryCand.delete(parent)) for (const c of children) buryCand.add(c);
    if (soft?.delete(parent)) for (const c of children) soft.add(c);
    if (curve?.delete(parent)) for (const c of children) curve.add(c);
    splitChildren.set(parent, [...children]);
  };
  const descendants = (eid: EdgeId): EdgeId[] => {
    const kids = splitChildren.get(eid);
    return kids ? kids.flatMap(descendants) : [eid];
  };
  const userEdges = new Set<EdgeId>();                // 本次显式画的线（随葬豁免，含后代）
  const ins = (a: Pt3, b: Pt3, kind: "gesture" | "wire" | "image"): void => {
    const r = insertSegment(g, a, b, (parent, c1, c2) => onSplit(parent, [c1, c2]));
    if (kind === "gesture") { for (const e of r.created) gesture.add(e); for (const e of r.retraced) gesture.add(e); }
    if (kind !== "image") { for (const e of r.created) userEdges.add(e); for (const e of r.retraced) userEdges.add(e); }
  };
  for (const s of table.gesture ?? []) { ins(s.a, s.b, "gesture"); explicitEnds.add(ptKey3(quantize3(s.a))); explicitEnds.add(ptKey3(quantize3(s.b))); }
  for (const s of table.wires ?? []) { ins(s.a, s.b, "wire"); explicitEnds.add(ptKey3(quantize3(s.a))); explicitEnds.add(ptKey3(quantize3(s.b))); }
  const verbImages: Image[] = [];
  for (const im of table.images) {
    const { images, creases } = planarPieces(im, tol);
    verbImages.push(...images);
    for (const c of creases) ins(c.a, c.b, "image");
  }
  for (const im of verbImages) for (const ring of im.rings) for (let i = 0; i < ring.length; i++) ins(ring[i], ring[(i + 1) % ring.length], "image");

  // ③ 自愈（搬迁造成的交叉 / 骑边；切割血缘喂回手势集与随葬集）
  planarize(g, onSplit);

  // ④ 胞腔
  const byPlane = store.regionsByPlane(g, reg, tol);

  // ⑤ 认领：像 → 胞腔集；胞腔 → 认领像集
  const claimsOf = new Map<Region, Claim[]>();
  const cellsOf = new Map<Image, { r: Region; planeId: PlaneId }[]>();
  const claim = (im: Image): void => {
    const cells: { r: Region; planeId: PlaneId }[] = [];
    cellsOf.set(im, cells);
    const outer3 = im.rings[0];
    let plane = null;
    for (let i = 0; i + 2 < outer3.length && !plane; i++) plane = planeFromPoints(outer3[i], outer3[i + 1], outer3[i + 2]);
    if (!plane) return;   // 零面积 → 零认领
    const rec = reg.ensure(plane, tol);
    const rings2 = im.rings.map((r) => r.map((p) => projectToPlane(p, rec.basis)));
    const wind = (p: Pt): number => rings2.reduce((acc, r) => acc + (r.length >= 3 ? windingOf(p, r) : 0), 0);
    for (const [pid, regions] of byPlane) {
      const prec = reg.rec(pid);
      if (Math.abs(dot3(prec.plane.n, rec.plane.n)) < 0.999) continue;   // 明显不平行 → 不可能是同一张膜（2.6°）
      for (const r of regions) {
        const rp = representativePoint(r);
        const { u, v } = prec.basis, n = prec.plane.n, d = prec.plane.d;
        const rep3: Pt3 = { x: u.x * rp.x + v.x * rp.y + n.x * d, y: u.y * rp.x + v.y * rp.y + n.y * d, z: u.z * rp.x + v.z * rp.y + n.z * d };
        if (distToPlane(rep3, rec.plane) > 3 * tol) continue;
        if (Math.abs(wind(projectToPlane(rep3, rec.basis))) < 1) continue;
        cells.push({ r, planeId: pid });
        (claimsOf.get(r) ?? claimsOf.set(r, []).get(r)!).push({ im });
      }
    }
  };
  for (const im of identity) claim(im);
  for (const im of verbImages) claim(im);

  // ⑥ 逐胞腔裁决：填 / 不填
  const filled = new Set<Region>();
  for (const [r, cs] of claimsOf) {
    const hasXor = cs.some((c) => c.im.algebra === "xor");
    if (hasXor ? cs.length % 2 === 1 : cs.length >= 1) filled.add(r);
  }
  // 身份 → 它的像们认领到的**填充**胞腔
  const cellsById = new Map<FaceId, { r: Region; planeId: PlaneId }[]>();
  const newImageCells: { r: Region; planeId: PlaneId }[] = [];
  for (const [im, cells] of cellsOf) {
    for (const c of cells) {
      if (!filled.has(c.r)) continue;
      if (im.inherit === undefined) newImageCells.push(c);
      else (cellsById.get(im.inherit) ?? cellsById.set(im.inherit, []).get(im.inherit)!).push(c);
    }
  }
  const allIds = new Set<FaceId>([...consumedIds, ...identity.map((im) => im.inherit!)]);
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
  const newMaterial = new Map<Region, number>();
  for (const c of newImageCells) newClaimed.set(c.r, (newClaimed.get(c.r) ?? 0) + 1);
  for (const [im, cells] of cellsOf) if (im.inherit === undefined && im.material !== undefined) for (const c of cells) if (filled.has(c.r) && !newMaterial.has(c.r)) newMaterial.set(c.r, im.material);

  // ⑧ 逐填充胞腔定膜
  const stretched: FaceId[] = [];
  for (const r of filled) {
    const pid = planeOfRegion.get(r)!;
    const ids = [...new Set(owners.get(r) ?? [])];
    const hasNew = (newClaimed.get(r) ?? 0) > 0;
    if (ids.length === 0) {
      if (hasNew) { const nf = store.mint(pid, r); events.push({ type: "BIRTH", face: nf.id }); const mat = newMaterial.get(r); if (mat !== undefined) table.faceMat?.set(nf.id, mat); }
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
  store.rebuildFaceLinks(g);

  // ⑨ 随葬第二相（通则，动词开关）：结算后无膜的边只许是用户画的线（本次的 / 之前就是裸线的，含切割后代）
  if (table.buryOrphans) {
    const exempt = new Set<EdgeId>();
    for (const eid of preWires) for (const c of descendants(eid)) exempt.add(c);
    for (const eid of userEdges) for (const c of descendants(eid)) exempt.add(c);
    for (const e of g.edges()) if (e.faceLinks.length === 0 && !exempt.has(e.id)) g.removeEdge(e.id);
  }

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
    if (soft?.has(c.ea) && soft.has(c.eb)) soft.add(ne);
    if (curve?.has(c.ea) && curve.has(c.eb)) curve.add(ne);
    for (const fid of new Set(fa)) {
      const f = store.face(fid);
      if (f) for (const ring of [f.outer, ...f.holes]) spliceRing(g, ring, c.ea, c.eb, ne);
    }
    g.removeEdge(c.ea);
    g.removeEdge(c.eb);
  }
  // ⑪ 边属性层（软边 / 曲线成员）：删掉的边出集；新段上落下的边入集
  const layer = (set: Set<EdgeId> | undefined, segs: readonly Seg3[] | undefined): void => {
    if (!set) return;
    for (const eid of [...set]) if (!g.hasEdge(eid)) set.delete(eid);
    if (!segs?.length) return;
    for (const e of g.edges()) {
      if (set.has(e.id)) continue;
      const pa = g.pt(e.a), pb = g.pt(e.b);
      if (segs.some((sg) => pointOnSegment3(pa, sg.a, sg.b, INSERT_TOL) && pointOnSegment3(pb, sg.a, sg.b, INSERT_TOL))) set.add(e.id);
    }
  };
  layer(soft, table.softSegs);
  layer(curve, table.curveSegs);
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

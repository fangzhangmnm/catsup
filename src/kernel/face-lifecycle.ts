// face-lifecycle.ts —— 存储态膜的仓库（FaceStore）+ 擦边裁决器。
//
// 公理 4 修正版（drill L316-320）：膜是**涌现但被存储**的状态——由封闭手势诞生、作为一等状态持久存在、
// 只被特定事件杀死/合并。**不是边集的纯函数**（闭环可以无面）。
//
// 2026-10-21 重写（Claude Fable 5.1）：设面的唯一机器搬到 settle.ts（像表结算机：动词交坐标多边形，机器按绕数认领胞腔）。
// 本文件只剩两件事：
//   · FaceStore = 膜的存储（byId / mint / setFace / 面环投影 / faceLinks 权威重建 / 持久化复原 / 深拷贝 / 每平面胞腔提取）；
//   · 擦边 = 自己的小规则（drill L421「erase 看 loop 身份」）：被擦边在膜环里的身份即意图——
//       外环对 void → BURST（无条件，不做覆盖查找）· 洞环 / 同面双现（桥）→ ABSORB（愈合）· 同平面 ≥2 膜共享 → MERGE。
//     radial（公理 2）：一条边挂 N 膜时按**每个平面各自裁决**（立方体擦棱：两面各自 BURST；同平面两格：MERGE）。
// 守恒律：erase 永不凭空创造表面。不对称律：dissolve-collinear 只在结算机⑩「因本次操作新成为二度共线」时发生，用户自己的分割点永不动。
//
// id 纪律：DIVIDE/MERGE/ABSORB 退休旧 id、铸新 id（事件携带血缘）；延续/STRETCH 保 id。

import { type Pt, distToPlane, pointInRing, projectToPlane } from "./geom.ts";
import { perf } from "../editor/perf-stats.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type DirEdge, type Region, type Ring, findRegions, regionContains, representativePoint } from "./facefind.ts";
import { type PlaneId, PlaneRegistry, type CoplanarScope, groupCoplanar } from "./planes.ts";
import { DisjointSet } from "./dsu.ts";

export type FaceEvent =
  | { type: "BIRTH"; face: FaceId }
  | { type: "DIVIDE"; from: FaceId; into: FaceId[] }
  | { type: "MERGE"; from: FaceId[]; into: FaceId }
  | { type: "ABSORB"; from: FaceId; into: FaceId }
  | { type: "BURST"; face: FaceId }
  | { type: "STRETCH"; faces: FaceId[] }
  | { type: "FACE_ERASED"; face: FaceId };

export interface Face {
  readonly id: FaceId;
  readonly planeId: PlaneId;
  outer: Ring;   // pts = 该平面 canonical 基下的 2D
  holes: Ring[];
  /** 外环 2D 包围盒（平面基下；入库时算一次）——结算机「膜入选」的粗筛，不用逐膜 pointInRing（2026-10-23）。 */
  readonly bbox: { x0: number; y0: number; x1: number; y1: number };
}
export function bboxOfRing(r: Ring): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of r.pts) { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; }
  return { x0, y0, x1, y1 };
}

/** erase 前的裁决快照（删边前算好；loop 身份以批开始时的状态为准，删除顺序无关）。 */
export interface EraseVerdicts {
  burst: Set<FaceId>;
  mergePairs: [FaceId, FaceId][];
  heal: Set<FaceId>;
}

/** 每平面的 region 提取结果。 */
export type RegionsByPlane = Map<PlaneId, Region[]>;

export class FaceStore {
  private byId = new Map<FaceId, Face>();
  /** 平面 → 膜 id（单主人：只在 put / drop 里维护；结算机按被碰平面取膜，不扫全表。2026-10-23） */
  private byPlane = new Map<PlaneId, Set<FaceId>>();
  private nextId = 1;

  private put(f: Face): Face {
    const old = this.byId.get(f.id);
    if (old) this.byPlane.get(old.planeId)?.delete(f.id);
    this.byId.set(f.id, f);
    (this.byPlane.get(f.planeId) ?? this.byPlane.set(f.planeId, new Set()).get(f.planeId)!).add(f.id);
    return f;
  }
  /** 删过的膜（id 从不复用）：Kernel.emit 只拿它们去清面层（2026-10-26 Claude Opus 5.5，纪元账本 DT93）。 */
  private removedF: FaceId[] = [];
  drainRemovedFaces(): FaceId[] { const r = this.removedF; this.removedF = []; return r; }
  private drop(id: FaceId): boolean {
    const f = this.byId.get(id);
    if (!f) return false;
    this.byId.delete(id);
    this.removedF.push(id);
    const set = this.byPlane.get(f.planeId);
    if (set) { set.delete(id); if (!set.size) this.byPlane.delete(f.planeId); }
    return true;
  }

  faces(): Face[] { return [...this.byId.values()]; }
  face(id: FaceId): Face | undefined { return this.byId.get(id); }
  faceCount(): number { return this.byId.size; }
  planeIds(): Set<PlaneId> { return new Set(this.byPlane.keys()); }
  /** 这张平面上的膜（索引，O(该平面膜数)）。 */
  facesOnPlane(pid: PlaneId): Face[] { const set = this.byPlane.get(pid); if (!set) return []; const out: Face[] = []; for (const id of set) { const f = this.byId.get(id); if (f) out.push(f); } return out; }

  /** p 须为该 face 平面 canonical 基下的 2D 坐标。 */
  faceContains(f: Face, p: Pt): boolean {
    if (!pointInRing(p, f.outer.pts)) return false;
    for (const h of f.holes) if (pointInRing(p, h.pts)) return false;
    return true;
  }

  private occurrences(f: Face, e: EdgeId): { count: number; onOuter: boolean; onHole: boolean } {
    let count = 0, onOuter = false, onHole = false;
    for (const d of f.outer.edges) if (d.edge === e) { count++; onOuter = true; }
    for (const h of f.holes) for (const d of h.edges) if (d.edge === e) { count++; onHole = true; }
    return { count, onOuter, onHole };
  }

  /** coplanarity 分组 + 每平面跑 findRegions（canonical 基投影）。scope = 局部结算的影响域（planes.ts CoplanarScope）；不给 = 全局。 */
  regionsByPlane(g: PlanarGraph, reg: PlaneRegistry, tol: number, scope?: CoplanarScope): RegionsByPlane {
    const t0 = performance.now();
    const groups = groupCoplanar(g, reg, tol, { has: (pid) => this.byPlane.has(pid) }, scope);
    perf.last["regions.group"] = performance.now() - t0; const t1 = performance.now();
    const out: RegionsByPlane = new Map();
    // 同一个边环只准属于一张平面（2026-09-07 fuzz 案）：候选平面来自每顶点任意两邻边，归属是 cover 语义（τ=1 mm），
    // 小面会同时落进两张近平行候选平面 → 同环两次成面。去重键 = 外环+洞的边 id 集合；保留拟合最好的那张。
    const best = new Map<string, { planeId: PlaneId; r: Region; err: number }>();
    const keyOf = (r: Region): string => [r.outer, ...r.holes].map((ring) => [...ring.edges.map((d) => d.edge)].sort((a, b) => a - b).join(",")).join("|");
    for (const [planeId, edges] of groups) {
      const rec = reg.rec(planeId);
      const regions = findRegions(g, {
        edges,
        project: (vid: VertexId) => projectToPlane(g.pt(vid), rec.basis),
      });
      for (const r of regions) {
        let err = 0;
        for (const ring of [r.outer, ...r.holes]) for (const d of ring.edges) {
          const e = g.edge(d.edge);
          err = Math.max(err, distToPlane(g.pt(e.a), rec.plane), distToPlane(g.pt(e.b), rec.plane));
        }
        const key = keyOf(r);
        const prev = best.get(key);
        if (!prev || err < prev.err) best.set(key, { planeId, r, err });
      }
    }
    for (const { planeId, r } of best.values()) (out.get(planeId) ?? out.set(planeId, []).get(planeId)!).push(r);
    perf.last["regions.find"] = performance.now() - t1;
    perf.last["regions.planes"] = groups.size;
    perf.last["regions.edges"] = [...groups.values()].reduce((a, es) => a + es.length, 0);
    return out;
  }

  // ---------------- erase ----------------

  /** 删边**前**按 loop 身份裁决。radial：命中面先按平面分组，各平面独立裁决。 */
  snapshotEraseVerdicts(edgeIds: readonly EdgeId[]): EraseVerdicts {
    const v: EraseVerdicts = { burst: new Set(), mergePairs: [], heal: new Set() };
    for (const e of edgeIds) {
      const hits = this.faces()
        .map((f) => ({ f, occ: this.occurrences(f, e) }))
        .filter((x) => x.occ.count > 0);
      if (hits.length === 0) continue; // wire/filament：只删边

      const byPlane = new Map<PlaneId, typeof hits>();
      for (const h of hits) {
        const list = byPlane.get(h.f.planeId) ?? [];
        list.push(h);
        byPlane.set(h.f.planeId, list);
      }
      for (const list of byPlane.values()) {
        if (list.length >= 2) {
          // 同平面 ≥2 面共享 → 全部 MERGE（并查集链）
          for (let i = 1; i < list.length; i++) v.mergePairs.push([list[0].f.id, list[i].f.id]);
        } else {
          const { f, occ } = list[0];
          if (occ.count >= 2) v.heal.add(f.id);              // 同面双现（桥缝）→ 整理
          else if (occ.onHole) v.heal.add(f.id);             // 内环（洞）→ ABSORB
          else v.burst.add(f.id);                            // 外环对 void → 无条件死
        }
      }
    }
    return v;
  }

  reconcileErase(g: PlanarGraph, reg: PlaneRegistry, tol: number, v: EraseVerdicts): FaceEvent[] {
    const events: FaceEvent[] = [];

    const dsu = new DisjointSet<FaceId>();   // kernel/dsu.ts：同一套合并约定（a 的根挂到 b 的根下），加了路径压缩
    for (const [a, b] of v.mergePairs) dsu.union(a, b);
    const groups = new Map<FaceId, FaceId[]>();
    for (const id of dsu.keys()) {
      const r = dsu.find(id);
      (groups.get(r) ?? groups.set(r, []).get(r)!).push(id);
    }

    const byPlane = this.regionsByPlane(g, reg, tol);
    const taken = new Set<Region>();
    // D12（2026-10-24，Claude Fable 5.1）：后继区域不许是**别的活膜已经占着的胞腔**。τ 带里的脏嵌入会给膜配上碰着外环的假「洞」，
    // 代表点（按外环 + 洞的奇偶扫描）落到邻膜肚子里，旧代码就把邻膜的胞腔再铸一张 = 同环双胞（fuzz 种子 31）。
    // 占用判定按环边 id 集合；本次要出库的膜（并组成员 / 整理 / 死）不算占用。第二次机会：只按外环取代表点（假洞不参与）。
    const leaving = new Set<FaceId>([...v.burst, ...v.heal]);
    for (const [a, b] of v.mergePairs) { leaving.add(a); leaving.add(b); }
    const ringKey = (rings: readonly { edges: readonly { edge: EdgeId }[] }[]): string => rings.map((ring) => [...ring.edges.map((d) => d.edge)].sort((x, y) => x - y).join(",")).join("|");
    const owned = new Set<string>();
    for (const f of this.faces()) if (!leaving.has(f.id)) owned.add(ringKey([f.outer, ...f.holes]));
    const findRegionAt = (planeId: PlaneId, p: Pt): Region | undefined =>
      (byPlane.get(planeId) ?? []).find((r) => !taken.has(r) && !owned.has(ringKey([r.outer, ...r.holes])) && regionContains(r, p));
    const findSuccessor = (f: Face): Region | undefined => findRegionAt(f.planeId, representativePoint(f)) ?? findRegionAt(f.planeId, representativePoint({ outer: f.outer, holes: [] }));

    const dead = new Set<FaceId>(v.burst);

    // 并组：burst 污染 → 整组死；否则按成员旧 anchor 在**同平面** regions 里找后继
    for (const members of groups.values()) {
      const tainted = members.some((m) => dead.has(m));
      let survivorRegion: Region | undefined;
      let survivorPlane: PlaneId | undefined;
      if (!tainted) {
        for (const m of members) {
          const f = this.byId.get(m);
          if (!f) continue;
          survivorRegion = findSuccessor(f);
          if (survivorRegion) { survivorPlane = f.planeId; break; }
        }
      }
      if (survivorRegion && survivorPlane !== undefined) {
        for (const m of members) this.drop(m);
        const nf = this.mint(survivorPlane, survivorRegion);
        taken.add(survivorRegion);
        events.push({ type: "MERGE", from: members, into: nf.id });
      } else {
        for (const m of members) dead.add(m);
      }
    }

    // 整理存活（ABSORB / 桥缝愈合）
    for (const id of v.heal) {
      if (dead.has(id) || !this.byId.has(id)) continue;
      const f = this.byId.get(id)!;
      const r = findSuccessor(f);
      if (r) {
        this.drop(id);
        const nf = this.mint(f.planeId, r);
        taken.add(r);
        events.push({ type: "ABSORB", from: id, into: nf.id });
      } else {
        dead.add(id);
      }
    }

    for (const id of dead) {
      if (this.drop(id)) events.push({ type: "BURST", face: id });
    }

    this.rebuildFaceLinks(g);
    return events;
  }

  /** 静默出库（结算机 / 删膜用；叙事由调用方负责）。 */
  deleteSilently(id: FaceId): boolean {
    return this.drop(id);
  }

  eraseFaces(g: PlanarGraph, ids: readonly FaceId[]): FaceEvent[] {
    const events: FaceEvent[] = [];
    const changed: FaceId[] = [];
    const oldRings = new Map<FaceId, EdgeId[]>();
    for (const id of ids) {
      const f = this.byId.get(id);
      if (!f) continue;
      oldRings.set(id, ringEdgeIds(f));
      this.drop(id); changed.push(id);
      events.push({ type: "FACE_ERASED", face: id });
    }
    this.relinkFaces(g, changed, oldRings);
    return events;
  }

  /** 顶点 id 环快照（搬迁前拍；经合并映射 + 新坐标读出 = 像）。只拍给定的膜（moveVertices 只要被牵连的）；不给 = 全部。 */
  captureSnaps(_g: PlanarGraph, ids?: Iterable<FaceId>): Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }> {
    const snaps = new Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>();
    const list = ids ? [...ids].map((id) => this.byId.get(id)).filter((f): f is Face => !!f) : this.faces();
    for (const f of list) snaps.set(f.id, { outer: [...f.outer.vids], holes: f.holes.map((h) => [...h.vids]) });
    return snaps;
  }

  /**
   * 持久化装载：从顶点环**复原**一张存储态的膜（不是构造——不跑 face-finding、不发事件；A4「膜涌现且被存储」
   * 的存储态由文件带回）。环 = 顶点 id 序列（A3：两点至多一边，边由 edgeBetween 唯一恢复）；pts 按平面基重算。
   * 只给 Kernel.fromBrep 用，调用方负责校验。created 2026-09-20 by Claude Fable 5.1
   */
  restoreFace(g: PlanarGraph, reg: PlaneRegistry, planeId: PlaneId, outer: readonly VertexId[], holes: readonly (readonly VertexId[])[]): Face {
    const basis = reg.rec(planeId).basis;
    const ring = (vids: readonly VertexId[]): Ring => {
      const edges: DirEdge[] = [];
      for (let i = 0; i < vids.length; i++) {
        const a = vids[i], b = vids[(i + 1) % vids.length];
        const eid = g.edgeBetween(a, b);
        if (eid === undefined) throw new Error(`restoreFace: no edge between vertices ${a} and ${b}`);
        edges.push({ edge: eid, forward: g.edge(eid).a === a });
      }
      return { edges, pts: vids.map((v) => projectToPlane(g.pt(v), basis)), vids: [...vids] };
    };
    const o = ring(outer);
    return this.put({ id: this.nextId++, planeId, outer: o, holes: holes.map(ring), bbox: bboxOfRing(o) });
  }

  /** 深拷贝（含 id 计数器；preview 影子副本用）。 */
  clone(): FaceStore {
    const s = new FaceStore();
    s.nextId = this.nextId;
    const cloneRing = (r: Ring): Ring => ({ edges: r.edges.map((d) => ({ ...d })), pts: r.pts.map((p) => ({ ...p })), vids: [...r.vids] });
    for (const [id, f] of this.byId) s.put({ id: f.id, planeId: f.planeId, outer: cloneRing(f.outer), holes: f.holes.map(cloneRing), bbox: { ...f.bbox } });
    s.removedF = [...this.removedF];
    return s;
  }

  // ---------------- 结算机的仓库接口 ----------------

  /** 铸新膜。 */
  mint(planeId: PlaneId, r: Region): Face {
    return this.put({ id: this.nextId++, planeId, outer: r.outer, holes: r.holes, bbox: bboxOfRing(r.outer) });
  }

  /** 以给定 id 落一张膜（一对一承继：保 id，换平面亦跟随）。 */
  setFace(id: FaceId, planeId: PlaneId, r: Region): Face {
    return this.put({ id, planeId, outer: r.outer, holes: r.holes, bbox: bboxOfRing(r.outer) });
  }

  /** faceLinks 权威重建（全量；装载 / 擦边用）：per 出现（桥边同面双现 → 同 id 两次；radial：多平面各挂一次）。 */
  rebuildFaceLinks(g: PlanarGraph): void {
    for (const e of g.edges()) e.faceLinks = [];
    for (const f of this.byId.values()) {
      for (const ring of [f.outer, ...f.holes]) {
        for (const d of ring.edges) {
          if (g.hasEdge(d.edge)) g.edge(d.edge).faceLinks.push(f.id);
        }
      }
    }
  }

  /**
   * faceLinks 增量维护（结算机用，O(变了的膜的环)，2026-10-23）：changed = 本次出库 / 入库 / 换环的膜 id；oldRings = 它们改动前的环边
   * （出库 / 换环前记下）。先把 id 从旧环边上摘干净，再按现在的环逐次挂回（per 出现）。没变的膜与边一个不碰。
   * 前提（fuzz 守着）：膜环边的 faceLinks 含它；切边时子边继承父边的 faceLinks（topology.splitEdge / replaceEdgeWithChain）。
   */
  relinkFaces(g: PlanarGraph, changed: Iterable<FaceId>, oldRings: ReadonlyMap<FaceId, readonly EdgeId[]>): void {
    const ids = new Set(changed);
    for (const id of ids) {
      for (const eid of oldRings.get(id) ?? []) {
        if (!g.hasEdge(eid)) continue;
        const e = g.edge(eid);
        if (e.faceLinks.includes(id)) e.faceLinks = e.faceLinks.filter((x) => x !== id);
      }
    }
    const touched = new Set<EdgeId>();
    for (const id of ids) {
      const f = this.byId.get(id);
      if (!f) continue;
      for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) if (g.hasEdge(d.edge)) { g.edge(d.edge).faceLinks.push(id); touched.add(d.edge); }
    }
    for (const eid of touched) g.edge(eid).faceLinks.sort((a, b) => a - b);   // 与全量重建同序（按 id 升），链接顺序不带历史
  }
}

/** 膜现在的全部环边 id（外环 + 洞），给 relinkFaces 记旧环用。 */
export function ringEdgeIds(f: Face): EdgeId[] {
  const out: EdgeId[] = [];
  for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) out.push(d.edge);
  return out;
}

/** 容错环顶点提取（共享：移动快照 / 壳层手中集）——环边可能已被本批切割移除：缺失边的起点=前一条边的终点。 */
export function ringVidsTolerant(g: { hasEdge(id: EdgeId): boolean; edge(id: EdgeId): { a: VertexId; b: VertexId } }, r: Ring): VertexId[] {
  const out: VertexId[] = [];
  const es = r.edges;
  for (let i = 0; i < es.length; i++) {
    const d = es[i];
    if (g.hasEdge(d.edge)) {
      const e = g.edge(d.edge);
      out.push(d.forward ? e.a : e.b);
    } else {
      const prev = es[(i - 1 + es.length) % es.length];
      if (g.hasEdge(prev.edge)) {
        const pe = g.edge(prev.edge);
        out.push(prev.forward ? pe.b : pe.a);
      }
    }
  }
  return out;
}

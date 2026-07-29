// face-lifecycle.ts —— 存储态 face 的生老病死 reconciler（内核的心脏）。
//
// 公理 4 修正版（drill L316-320，人类实机实验逼出来的）：face 是**涌现但被存储**的状态——
// 由封闭手势诞生、作为一等状态持久存在、只被特定事件杀死/合并。**不是边集的纯函数**
// （闭环可以无面）。所以 findRegions 的输出不能直接替换 face 集，而要按 mutation 类型 reconcile：
//
//   统一律（drill L421）：诞生靠手势、move 守恒、erase 看 loop 身份、sticky 兜底。
//
// M3 升维后 reconcile 是 **per-plane** 的：coplanarity 分组（planes.ts）把边切成平面组，
// 每组用该平面的 canonical 基投影成 2D 跑 findRegions；face 带 planeId，环坐标 = 该基下 2D
// （基确定性 → 跨重跑稳定）。radial（公理 2）在 erase 裁决里体现：一条边挂 N 张面时按
// **每个平面各自裁决**——两面同平面共享 → MERGE；不同平面各持一面 → 各自外环对 void → 都 BURST
// （立方体擦棱、两墙擦角边的 SU 行为）。
//
// - 构造手势：老面被 ≥2 region 覆盖 → DIVIDE（急切）；无主 region 的**外环**含手势边 → BIRTH。
// - erase：按被擦边在相邻面 loop 结构里的身份裁决——同面双现（桥）/内环 → 存活整理（ABSORB）、
//   外环对 void → **无条件** BURST（不做覆盖查找！loop membership 即意图）。
// - move：结构上不存在 birth 路径（不传手势边集）= 守恒律零成本实现。
// - 守恒律：erase 永不凭空创造表面。不对称律：dissolve-collinear 无任何自动路径。
//
// face↔region 匹配 = 几何 anchor：面的 representativePoint 落在同平面哪个 region 就是后继。
// id 纪律：DIVIDE/MERGE/ABSORB 退休旧 id、铸新 id（事件携带血缘）；延续/STRETCH 保 id。

import { type Pt, pointInRing, projectToPlane } from "./geom.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type Region, type Ring, findRegions, regionContains, representativePoint } from "./facefind.ts";
import { type PlaneId, PlaneRegistry, groupCoplanar } from "./planes.ts";

export type FaceEvent =
  | { type: "BIRTH"; face: FaceId }
  | { type: "DIVIDE"; from: FaceId; into: FaceId[] }
  | { type: "MERGE"; from: FaceId[]; into: FaceId }
  | { type: "ABSORB"; from: FaceId; into: FaceId }
  | { type: "BURST"; face: FaceId }
  | { type: "STRETCH"; faces: FaceId[] }
  | { type: "FACE_ERASED"; face: FaceId };
// AUTOFOLD-SPLIT / DEDUP-MERGE 是 3D move/sticky 事件（M4），届时加进此 union。

export interface Face {
  readonly id: FaceId;
  readonly planeId: PlaneId;
  outer: Ring;   // pts = 该平面 canonical 基下的 2D
  holes: Ring[];
}

/** erase 前的裁决快照（删边前算好；loop 身份以批开始时的状态为准，删除顺序无关）。 */
export interface EraseVerdicts {
  burst: Set<FaceId>;
  mergePairs: [FaceId, FaceId][];
  heal: Set<FaceId>;
}

/** 每平面的 region 提取结果。 */
type RegionsByPlane = Map<PlaneId, Region[]>;

export class FaceStore {
  private byId = new Map<FaceId, Face>();
  private nextId = 1;

  faces(): Face[] { return [...this.byId.values()]; }
  face(id: FaceId): Face | undefined { return this.byId.get(id); }
  faceCount(): number { return this.byId.size; }
  planeIds(): Set<PlaneId> { return new Set([...this.byId.values()].map((f) => f.planeId)); }

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

  /** coplanarity 分组 + 每平面跑 findRegions（canonical 基投影）。 */
  private regionsByPlane(g: PlanarGraph, reg: PlaneRegistry, tol: number): RegionsByPlane {
    const groups = groupCoplanar(g, reg, tol, this.planeIds());
    const out: RegionsByPlane = new Map();
    for (const [planeId, edges] of groups) {
      const rec = reg.rec(planeId);
      const regions = findRegions(g, {
        edges,
        project: (vid: VertexId) => projectToPlane(g.pt(vid), rec.basis),
      });
      if (regions.length) out.set(planeId, regions);
    }
    return out;
  }

  // ---------------- 构造手势 ----------------

  reconcileConstructive(g: PlanarGraph, reg: PlaneRegistry, tol: number, gestureEdges: Set<EdgeId>): FaceEvent[] {
    const events: FaceEvent[] = [];
    const byPlane = this.regionsByPlane(g, reg, tol);
    const claimed = new Set<Region>();

    for (const f of this.faces()) {
      const regions = byPlane.get(f.planeId) ?? [];
      const covering = regions.filter((r) => !claimed.has(r) && this.faceContains(f, representativePoint(r)));
      if (covering.length === 1) {
        this.adopt(f, covering[0]);
        claimed.add(covering[0]);
      } else if (covering.length >= 2) {
        this.byId.delete(f.id);
        const into: FaceId[] = [];
        for (const r of covering) {
          const nf = this.mint(f.planeId, r);
          into.push(nf.id);
          claimed.add(r);
        }
        events.push({ type: "DIVIDE", from: f.id, into });
      }
      // covering=0：构造不减边，防御性保留原面
    }

    // 无主 region：**外环**含手势边才 BIRTH（内环含手势边≠封闭手势）
    for (const [planeId, regions] of byPlane) {
      for (const r of regions) {
        if (claimed.has(r)) continue;
        if (r.outer.edges.some((d) => gestureEdges.has(d.edge))) {
          const nf = this.mint(planeId, r);
          claimed.add(r);
          events.push({ type: "BIRTH", face: nf.id });
        }
      }
    }

    this.rebuildFaceLinks(g);
    return events;
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
          v.mergePairs.push([list[0].f.id, list[1].f.id]);   // 同平面两面共享 → MERGE
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

    const parent = new Map<FaceId, FaceId>();
    const find = (x: FaceId): FaceId => {
      let r = x;
      while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!;
      return r;
    };
    for (const [a, b] of v.mergePairs) {
      if (!parent.has(a)) parent.set(a, a);
      if (!parent.has(b)) parent.set(b, b);
      parent.set(find(a), find(b));
    }
    const groups = new Map<FaceId, FaceId[]>();
    for (const id of parent.keys()) {
      const r = find(id);
      (groups.get(r) ?? groups.set(r, []).get(r)!).push(id);
    }

    const byPlane = this.regionsByPlane(g, reg, tol);
    const taken = new Set<Region>();
    const findRegionAt = (planeId: PlaneId, p: Pt): Region | undefined =>
      (byPlane.get(planeId) ?? []).find((r) => !taken.has(r) && regionContains(r, p));

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
          survivorRegion = findRegionAt(f.planeId, representativePoint(f));
          if (survivorRegion) { survivorPlane = f.planeId; break; }
        }
      }
      if (survivorRegion && survivorPlane !== undefined) {
        for (const m of members) this.byId.delete(m);
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
      const r = findRegionAt(f.planeId, representativePoint(f));
      if (r) {
        this.byId.delete(id);
        const nf = this.mint(f.planeId, r);
        taken.add(r);
        events.push({ type: "ABSORB", from: id, into: nf.id });
      } else {
        dead.add(id);
      }
    }

    for (const id of dead) {
      if (this.byId.delete(id)) events.push({ type: "BURST", face: id });
    }

    this.rebuildFaceLinks(g);
    return events;
  }

  eraseFaces(g: PlanarGraph, ids: readonly FaceId[]): FaceEvent[] {
    const events: FaceEvent[] = [];
    for (const id of ids) {
      if (this.byId.delete(id)) events.push({ type: "FACE_ERASED", face: id });
    }
    this.rebuildFaceLinks(g);
    return events;
  }

  // ---------------- move ----------------

  /**
   * move 后 reconcile：**没有 birth 路径**（守恒律）。
   * ringVerts = move 前每面外环的顶点 id 快照（经 mergeMap 映射后用当前坐标重建 anchor 多边形）。
   * M3 范围注：move 拖边横穿他面的 DIVIDE 未实现；把顶点拖出面平面 = autofold 领域（M4），
   * 当前该面在全量重跑里找不到同平面后继 → 静默移除（golden 挂 todo）。
   */
  reconcileMove(
    g: PlanarGraph,
    reg: PlaneRegistry,
    tol: number,
    ringVerts: Map<FaceId, VertexId[]>,
    mergeMap: Map<VertexId, VertexId>,
    topologyChanged: boolean,
    movedFaces: Set<FaceId>,
  ): FaceEvent[] {
    const events: FaceEvent[] = [];
    if (!topologyChanged) {
      for (const f of this.faces()) this.refreshRingPts(g, reg, f);
      this.rebuildFaceLinks(g);
      if (movedFaces.size) events.push({ type: "STRETCH", faces: [...movedFaces] });
      return events;
    }
    const byPlane = this.regionsByPlane(g, reg, tol);
    const taken = new Set<Region>();
    for (const f of this.faces()) {
      const verts = ringVerts.get(f.id);
      if (!verts) continue;
      const basis = reg.rec(f.planeId).basis;
      const pts: Pt[] = [];
      for (const vid0 of verts) {
        let vid = vid0;
        while (mergeMap.has(vid)) vid = mergeMap.get(vid)!;
        if (g.hasVertex(vid)) pts.push(projectToPlane(g.pt(vid), basis));
      }
      const probe = polygonProbe(pts);
      const r = probe && (byPlane.get(f.planeId) ?? []).find((x) => !taken.has(x) && regionContains(x, probe));
      if (r) {
        this.adopt(f, r);
        taken.add(r);
      } else {
        this.byId.delete(f.id); // 压扁/出平面退化：静默移除（M4 autofold 接管前的空档）
      }
    }
    this.rebuildFaceLinks(g);
    if (movedFaces.size) {
      const alive = [...movedFaces].filter((id) => this.byId.has(id));
      if (alive.length) events.push({ type: "STRETCH", faces: alive });
    }
    return events;
  }

  /** 深拷贝（含 id 计数器；preview 影子副本用）。 */
  clone(): FaceStore {
    const s = new FaceStore();
    s.nextId = this.nextId;
    const cloneRing = (r: Ring): Ring => ({ edges: r.edges.map((d) => ({ ...d })), pts: r.pts.map((p) => ({ ...p })) });
    for (const [id, f] of this.byId) {
      s.byId.set(id, { id: f.id, planeId: f.planeId, outer: cloneRing(f.outer), holes: f.holes.map(cloneRing) });
    }
    return s;
  }

  // ---------------- 内部 ----------------

  private mint(planeId: PlaneId, r: Region): Face {
    const f: Face = { id: this.nextId++, planeId, outer: r.outer, holes: r.holes };
    this.byId.set(f.id, f);
    return f;
  }

  private adopt(f: Face, r: Region): void {
    f.outer = r.outer;
    f.holes = r.holes;
  }

  private refreshRingPts(g: PlanarGraph, reg: PlaneRegistry, f: Face): void {
    const basis = reg.rec(f.planeId).basis;
    for (const ring of [f.outer, ...f.holes]) {
      ring.pts = ring.edges.map((d) => projectToPlane(g.pt(d.forward ? g.edge(d.edge).a : g.edge(d.edge).b), basis));
    }
  }

  /** faceLinks 权威重建：per 出现（桥边同面双现 → 同 id 两次；radial：多平面各挂一次）。 */
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
}

/** 顶点序列的内部代表点（move 匹配用）。 */
function polygonProbe(pts: Pt[]): Pt | undefined {
  if (pts.length < 3) return undefined;
  const ring: Ring = { edges: [], pts };
  return representativePoint({ outer: ring, holes: [] });
}

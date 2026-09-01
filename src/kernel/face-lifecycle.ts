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

import { type Pt, type Pt3, cross, distToPlane, planeFromPoints, pointInRing, projectToPlane } from "./geom.ts";
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

  // ---------------- move（sticky geometry 协议第 3-4 步） ----------------

  /**
   * 覆盖 reconcile（spec = ai-docs/20260901-move-spec.md §1 步 3-4，取代旧 reconcileMove）。
   * snaps = 扰动前每面环的**顶点 id 快照**（含洞环）；经 mergedVerts 映射 + 新坐标读出
   * = 该膜的像多边形（切点都落在像的线段上，绕数不变——不需要边血缘）。
   * 设面规则（user 拍板）：胞腔填 ⟺ 被 ≥1 张旧膜像覆盖（1+1=1，|绕数|≥1，不 mod 2）。
   * 事件 = 纯叙事：一对一保 id（STRETCH）、一对多 DIVIDE、多对一 MERGE、零认领 BURST。
   * 无 birth 路径（守恒律 by construction）。edited by Claude Fable 5 2026-09-01
   */
  reconcileCoverage(
    g: PlanarGraph,
    reg: PlaneRegistry,
    tol: number,
    snaps: Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>,
    mergedVerts: Map<VertexId, VertexId>,
    movedFaces: Set<FaceId>,
    topologyChanged: boolean,
  ): FaceEvent[] {
    const events: FaceEvent[] = [];
    if (!topologyChanged) {
      for (const f of this.faces()) this.refreshRingPts(g, reg, f);
      this.rebuildFaceLinks(g);
      const alive = [...movedFaces].filter((id) => this.byId.has(id));
      if (alive.length) events.push({ type: "STRETCH", faces: alive });
      return events;
    }

    const byPlane = this.regionsByPlane(g, reg, tol);
    const chase = (vid: VertexId): VertexId => {
      while (mergedVerts.has(vid)) vid = mergedVerts.get(vid)!;
      return vid;
    };
    /** 快照环 → 现坐标闭多边形（合并去重、消失顶点丢弃）。 */
    const ringPts3 = (vids: readonly VertexId[]): Pt3[] => {
      const pts: Pt3[] = [];
      for (const vid0 of vids) {
        const vid = chase(vid0);
        if (!g.hasVertex(vid)) continue;
        const p = g.pt(vid);
        if (pts.length && p.x === pts[pts.length - 1].x && p.y === pts[pts.length - 1].y && p.z === pts[pts.length - 1].z) continue;
        pts.push(p);
      }
      while (pts.length >= 2 && pts[0].x === pts[pts.length - 1].x && pts[0].y === pts[pts.length - 1].y && pts[0].z === pts[pts.length - 1].z) pts.pop();
      return pts;
    };

    // 认领矩阵：face → 覆盖的 region 集；region → 认领者
    const claims = new Map<FaceId, { planeId: PlaneId; regions: Region[] }>();
    const claimants = new Map<Region, FaceId[]>();
    for (const f of this.faces()) {
      const snap = snaps.get(f.id);
      const outer3 = snap ? ringPts3(snap.outer) : [];
      let planeId: PlaneId | null = null;
      let covered: Region[] = [];
      if (snap && outer3.length >= 3) {
        // 像的平面拟合（刚移在面内 → 原平面；整体抬升 → 平行新平面；扭出平面 → 放弃认领=autofold 空档曝光）
        let plane = null;
        for (let i = 0; i + 2 < outer3.length && !plane; i++) plane = planeFromPoints(outer3[i], outer3[i + 1], outer3[i + 2]);
        if (plane && outer3.every((p) => distToPlane(p, plane!) <= tol)) {
          const rec = reg.ensure(plane, tol);
          planeId = rec.id;
          const outer2 = outer3.map((p) => projectToPlane(p, rec.basis));
          const holes2 = snap.holes.map((h) => ringPts3(h).map((p) => projectToPlane(p, rec.basis)));
          const windTotal = (p: Pt): number =>
            windingOf(p, outer2) + holes2.reduce((acc, h) => acc + (h.length >= 3 ? windingOf(p, h) : 0), 0);
          covered = (byPlane.get(rec.id) ?? []).filter((r) => Math.abs(windTotal(representativePoint(r))) >= 1);
        }
      }
      claims.set(f.id, { planeId: planeId ?? f.planeId, regions: covered });
      for (const r of covered) {
        const list = claimants.get(r) ?? [];
        list.push(f.id);
        claimants.set(r, list);
      }
    }

    // 叙事装配。descend: DIVIDE/MERGE 的血缘映射；replaned: 平面平移的膜跟随（STRETCH 叙事）
    const descend = new Map<FaceId, FaceId[]>();
    const replaned = new Map<FaceId, FaceId>();
    // ① 一对多 → DIVIDE（退休铸新）
    for (const [fid, c] of claims) {
      if (c.regions.length < 2) continue;
      this.byId.delete(fid);
      const into: FaceId[] = [];
      for (const r of c.regions) {
        const nf = this.mint(c.planeId, r);
        into.push(nf.id);
        const list = claimants.get(r)!;
        list[list.indexOf(fid)] = nf.id;
      }
      descend.set(fid, into);
      events.push({ type: "DIVIDE", from: fid, into });
    }
    // ② 多对一 → MERGE（dedup：膜没有出身）
    for (const [r, owners] of claimants) {
      const unique = [...new Set(owners)];
      if (unique.length < 2) continue;
      let planeId: PlaneId | null = null;
      for (const fid of unique) {
        planeId = this.byId.get(fid)?.planeId ?? planeId;
        this.byId.delete(fid);
      }
      const nf = this.mint(planeId!, r);
      for (const fid of unique) descend.set(fid, [...(descend.get(fid) ?? []), nf.id]);
      events.push({ type: "MERGE", from: unique, into: nf.id });
      claimants.set(r, [nf.id]);
    }
    // ③ 一对一 → adopt 保 id（换平面则退休铸新，叙事并入 STRETCH）；零认领 → BURST
    for (const [fid, c] of claims) {
      if (descend.has(fid)) continue;
      const f = this.byId.get(fid);
      if (!f) continue;
      if (c.regions.length === 0) {
        this.byId.delete(fid);
        events.push({ type: "BURST", face: fid });
        continue;
      }
      const r = c.regions[0];
      if ((claimants.get(r) ?? [])[0] !== fid) continue; // 已被 MERGE 收编
      if (c.planeId === f.planeId) {
        this.adopt(f, r);
      } else {
        // 膜整体换平面（如面沿法向平移）：退休老 planeId 铸新，膜跟随，计入 STRETCH 叙事
        this.byId.delete(fid);
        const nf = this.mint(c.planeId, r);
        replaned.set(fid, nf.id);
      }
    }

    this.rebuildFaceLinks(g);
    const stretched = new Set<FaceId>();
    for (const id of movedFaces) {
      if (this.byId.has(id) && !descend.has(id) && !events.some((e) => e.type === "BURST" && e.face === id)) stretched.add(id);
      const rp = replaned.get(id);
      if (rp !== undefined) stretched.add(rp); // 换平面跟随=拉伸叙事；DIVIDE/MERGE 已各自叙事不重复
    }
    if (stretched.size) events.push({ type: "STRETCH", faces: [...stretched] });
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

/** 绕数（覆盖函数用；|w|≥1=覆盖——1+1=1，不 mod 2）。 */
function windingOf(p: Pt, poly: readonly Pt[]): number {
  let w = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    if (a.y <= p.y) {
      if (b.y > p.y && cross(a, b, p) > 0) w++;
    } else if (b.y <= p.y && cross(a, b, p) < 0) w--;
  }
  return w;
}

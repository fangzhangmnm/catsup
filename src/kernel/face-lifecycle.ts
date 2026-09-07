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

import { type Pt, type Pt3, Q, cross, dist3, distToPlane, dot3, planeFromPoints, pointInRing, pointOnSegment3, projectToPlane } from "./geom.ts";
import { type EdgeId, type FaceId, type VertexId, PlanarGraph } from "./topology.ts";
import { type DirEdge, type Region, type Ring, findRegions, regionContains, representativePoint } from "./facefind.ts";
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
    // 同一个边环只准属于一张平面（2026-09-07 fuzz 案，edited by Claude Fable 5.1）：候选平面来自每顶点任意两邻边（含与既有面共点的
    // 混合对），归属是 cover 语义（τ=1 mm），小面会同时落进两张近平行候选平面 → 同环两次成面 = 重复面 → 擦边裁决漏、环里留死边。
    // 去重键 = 外环+洞的边 id 集合；保留顶点离平面最远距离最小（拟合最好）的那张。
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
    return out;
  }

  // ---------------- 构造手势 ----------------

  /**
   * 构造结算（薄壳，2026-09-03 统一手术）：= 统一覆盖结算机的特例——像=各膜自身当前环（身份像）、
   * 代数=OR、零认领=防御保留、出生源=手势边。三台机器收敛为一台 settle 的三组参数。
   */
  reconcileConstructive(g: PlanarGraph, reg: PlaneRegistry, tol: number, gestureEdges: Set<EdgeId>, toggleWith?: Set<EdgeId>, preSnaps?: Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>): FaceEvent[] {
    // 像 = 扰动前快照（普适原则：切割会移除环边 id，事后拍会丢顶点——E8 角案 2026-09-03）
    const snaps = preSnaps ?? this.captureSnaps(g);
    return this.settle(g, reg, tol, snaps, new Map(), new Set(), true, undefined, "or", {
      zeroClaimKeep: true,
      gestureEdges,
      toggleWith,
    });
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
          // 同平面 ≥2 面共享 → 全部 MERGE（并查集链；此前只配前两张，第三张会带着死边活下来——2026-09-07 fuzz）
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

  /** 静默摘除（pp 身份跟随用：蒸发不叙事，等目标膜出生后 rename 回原 id=STRETCH 叙事）。 */
  deleteSilently(id: FaceId): boolean {
    return this.byId.delete(id);
  }

  /** 膜改名（身份跟随：目标膜继承被推膜的 id——SU「材质跟着面走」的本体，贴图纪元地基）。 */
  renameFace(from: FaceId, to: FaceId): void {
    const f = this.byId.get(from);
    if (!f || this.byId.has(to)) return;
    this.byId.delete(from);
    this.byId.set(to, { id: to, planeId: f.planeId, outer: f.outer, holes: f.holes });
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
    folds?: Map<FaceId, VertexId[][]>,
    algebra: "or" | "xor" = "or",
  ): FaceEvent[] {
    return this.settle(g, reg, tol, snaps, mergedVerts, movedFaces, topologyChanged, folds, algebra, {});
  }

  /**
   * 统一覆盖结算机（2026-09-03 收敛手术；立宪 §3 的唯一物理实现）。
   * 各膜以像折线按 |绕数| 认领胞腔：一对一承继（换平面保 id 跟随）、一对多 DIVIDE、
   * 多对一按代数（OR 并 / XOR 偶湮灭+边随葬）、零认领按策略（burst / 构造防御保留）；
   * parity 翻灭=已有膜区域外环 ⊆ 手势∪toggleWith（随葬）；无主胞腔外环含手势边 → BIRTH。
   */
  private settle(
    g: PlanarGraph,
    reg: PlaneRegistry,
    tol: number,
    snaps: Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>,
    mergedVerts: Map<VertexId, VertexId>,
    movedFaces: Set<FaceId>,
    topologyChanged: boolean,
    folds: Map<FaceId, VertexId[][]> | undefined,
    algebra: "or" | "xor",
    opts: { zeroClaimKeep?: boolean; gestureEdges?: Set<EdgeId>; toggleWith?: Set<EdgeId> },
  ): FaceEvent[] {
    const events: FaceEvent[] = [];
    if (!topologyChanged) {
      for (const f of this.faces()) this.refreshRingPts(g, reg, f);
      this.rebuildFaceLinks(g);
      const alive = [...movedFaces].filter((id) => this.byId.has(id));
      if (alive.length) events.push({ type: "STRETCH", faces: alive });
      return events;
    }

    const parityDeadRingEdges: EdgeId[] = [];
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

    // 认领矩阵：face → 覆盖的 (region, 平面) 集；region → 认领者。
    // autofold 折片（folds）：每片在**自己的平面**里认领——膜折而不破，1→n = DIVIDE 叙事。
    const claims = new Map<FaceId, { r: Region; planeId: PlaneId }[]>();
    const claimants = new Map<Region, FaceId[]>();
    for (const f of this.faces()) {
      const snap = snaps.get(f.id);
      const entries: { r: Region; planeId: PlaneId }[] = [];
      const folded = folds?.get(f.id);
      const pieceOuters: VertexId[][] = folded ?? (snap ? [snap.outer] : []);
      for (const outerVids of pieceOuters) {
        const outer3 = ringPts3(outerVids);
        if (outer3.length < 3) continue;
        // 像的平面拟合（刚移在面内 → 原平面；整体抬升 → 平行新平面；折片 → 各自平面；
        // 扭出平面且不可折 → 放弃认领 = BURST 兜底曝光）
        let plane = null;
        for (let i = 0; i + 2 < outer3.length && !plane; i++) plane = planeFromPoints(outer3[i], outer3[i + 1], outer3[i + 2]);
        if (!plane || !outer3.every((p) => distToPlane(p, plane!) <= tol)) continue;
        const rec = reg.ensure(plane, tol);
        // 认领 = 纯几何（2026-09-07 fuzz 案，edited by Claude Fable 5.1）：候选平面由每顶点两邻边张成 + cover 归属（τ=1 mm），
        // 小面会在一张斜了 0.6°/差 16 mm 的「错」记录上被找到并成面，而它的像拟合到真平面记录——按 (n,d) 匹配记录永远配不上 →
        // 零认领 → 防御保留 + 同环再铸 = 重复面。改成：区域代表点抬回 3D → 到像平面距离 ≤ 3τ（共面门）→ 投到像平面基做 winding。
        const outer2 = outer3.map((p) => projectToPlane(p, rec.basis));
        const holes2 = folded ? [] : (snap?.holes ?? []).map((h) => ringPts3(h).map((p) => projectToPlane(p, rec.basis)));
        const windTotal = (p: Pt): number =>
          windingOf(p, outer2) + holes2.reduce((acc, h) => acc + (h.length >= 3 ? windingOf(p, h) : 0), 0);
        for (const [pid, regions] of byPlane) {
          const prec = reg.rec(pid);
          const c = dot3(prec.plane.n, rec.plane.n);
          if (Math.abs(c) < 0.999) continue;   // 明显不平行的平面不可能是同一张膜（2.6°）
          for (const r of regions) {
            if (entries.some((e) => e.r === r)) continue;
            const rp = representativePoint(r);
            const { u, v } = prec.basis, n = prec.plane.n, d = prec.plane.d;
            const rep3: Pt3 = { x: u.x * rp.x + v.x * rp.y + n.x * d, y: u.y * rp.x + v.y * rp.y + n.y * d, z: u.z * rp.x + v.z * rp.y + n.z * d };
            if (distToPlane(rep3, rec.plane) > 3 * tol) continue;
            if (Math.abs(windTotal(projectToPlane(rep3, rec.basis))) >= 1) entries.push({ r, planeId: pid });
          }
        }
      }
      claims.set(f.id, entries);
      for (const e of entries) {
        const list = claimants.get(e.r) ?? [];
        list.push(f.id);
        claimants.set(e.r, list);
      }
    }

    // 叙事装配。descend: DIVIDE/MERGE 的血缘映射；replaned: 平面平移的膜跟随（STRETCH 叙事）
    const descend = new Map<FaceId, FaceId[]>();
    const replaned = new Map<FaceId, FaceId>();
    // ① 一对多 → DIVIDE（退休铸新；折片各在自己平面铸）
    for (const [fid, entries] of claims) {
      if (entries.length < 2) continue;
      this.byId.delete(fid);
      const into: FaceId[] = [];
      for (const e of entries) {
        const nf = this.mint(e.planeId, e.r);
        into.push(nf.id);
        const list = claimants.get(e.r)!;
        list[list.indexOf(fid)] = nf.id;
      }
      descend.set(fid, into);
      events.push({ type: "DIVIDE", from: fid, into });
    }
    // ② 多对一：OR=MERGE dedup；XOR（pp 注入，user 2026-09-02 拍板）=偶数成对湮灭（着陆开洞）
    for (const [r, owners] of claimants) {
      const unique = [...new Set(owners)];
      if (unique.length < 2) continue;
      if (algebra === "xor" && unique.length % 2 === 0) {
        for (const fid of unique) {
          const dead = this.byId.get(fid);
          if (dead) parityDeadRingEdges.push(...this.ringEdgeIds(dead));
          if (this.byId.delete(fid)) events.push({ type: "BURST", face: fid });
        }
        claimants.set(r, []);
        continue;
      }
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
    for (const [fid, entries] of claims) {
      if (descend.has(fid)) continue;
      const f = this.byId.get(fid);
      if (!f) continue;
      if (entries.length === 0) {
        // 构造：不减边，防御保留——但保留的前提是环自洽：切割把环边换成了子边（父边已出图），先把死边换成共线子边链；
        // 修不了 = 环不可信 → BURST 曝光，绝不带着死边活下去（2026-09-07 VR 真机「edge N 不存在」案；fuzz test/kernel-fuzz.test.ts）
        if (opts.zeroClaimKeep && this.repairRings(g, f)) { this.refreshRingPts(g, reg, f); continue; }
        this.byId.delete(fid);
        events.push({ type: "BURST", face: fid });
        continue;
      }
      const { r, planeId } = entries[0];
      if ((claimants.get(r) ?? [])[0] !== fid) continue; // 已被 MERGE 收编
      if (planeId === f.planeId) {
        this.adopt(f, r);
      } else {
        // 膜整体换平面（如面沿法向平移）：**保 id 跟随**（2026-09-03 身份跟随批：颜色/贴图稳定）
        this.byId.delete(fid);
        this.byId.set(fid, { id: fid, planeId, outer: r.outer, holes: r.holes });
        replaned.set(fid, fid);
      }
    }

    // parity 翻灭（pp 构造相位）：已有膜区域外环 ⊆ 手势∪toggleWith → 翻灭+随葬
    const gset = opts.gestureEdges;
    const tset = opts.toggleWith;
    if (tset && gset) {
      for (const f of this.faces()) {
        if (f.outer.edges.every((d) => gset.has(d.edge) || tset.has(d.edge))) {
          parityDeadRingEdges.push(...this.ringEdgeIds(f));
          this.byId.delete(f.id);
          events.push({ type: "BURST", face: f.id });
        }
      }
    }
    // 手势出生：无主胞腔外环含手势边 → BIRTH（内环含手势 ≠ 封闭手势）
    if (gset && gset.size) {
      const owned = new Set<Region>();
      for (const [, es] of claims) for (const en of es) owned.add(en.r);
      // 已有面的环键（外环+洞的边集）：零认领防御保留的面其区域仍在 byPlane 里，BIRTH 不许再铸一张同环的面
      // （2026-09-07 fuzz：pp 补壁后 BIRTH 铸出与保留面同环的重复面 → 擦边裁决漏 → 死边留环）
      const ringKey = (rr: { outer: Ring; holes: Ring[] }): string => [rr.outer, ...rr.holes].map((ring) => [...ring.edges.map((d) => d.edge)].sort((a, b) => a - b).join(",")).join("|");
      const existingKeys = new Set(this.faces().map(ringKey));
      for (const [planeId2, regions2] of byPlane) {
        for (const r of regions2) {
          if (owned.has(r)) continue;
          if (this.faces().some((f) => f.outer === r.outer)) continue; // 已被承继/铸造
          if (existingKeys.has(ringKey(r))) continue;                  // 同环已有面（防御保留者）
          if (r.outer.edges.some((d) => gset.has(d.edge))) {
            const nf = this.mint(planeId2, r);
            events.push({ type: "BIRTH", face: nf.id });
          }
        }
      }
    }
    this.rebuildFaceLinks(g);
    this.buryEdges(g, parityDeadRingEdges);
    const stretched = new Set<FaceId>();
    for (const id of movedFaces) {
      if (this.byId.has(id) && !descend.has(id) && !events.some((e) => e.type === "BURST" && e.face === id)) stretched.add(id);
      const rp = replaned.get(id);
      if (rp !== undefined) stretched.add(rp); // 换平面跟随=拉伸叙事；DIVIDE/MERGE 已各自叙事不重复
    }
    if (stretched.size) events.push({ type: "STRETCH", faces: [...stretched] });
    return events;
  }

  /**
   * parity 杀膜的边随葬（user 2026-09-02 规则）：XOR/toggle 消膜时检测被消膜的环边，
   * 结算后不再被任何膜引用（faceLinks==0）→ 删。只挂 parity 杀点；squash/删膜/autofold
   * 兜底 BURST 不触发（SU「删膜边必留」口径）。纯用户 wire 不在任何膜环里，天然免疫。
   */
  private buryEdges(g: PlanarGraph, ringEdges: Iterable<EdgeId>): void {
    for (const eid of ringEdges) {
      if (g.hasEdge(eid) && g.edge(eid).faceLinks.length === 0) g.removeEdge(eid);
    }
  }

  /**
   * 环修复：死边（已被切割移出图的父边）→ 从上一活边终点到下一活边起点、沿原线段走既有边的共线链
   * （切边只在原线段上插顶点，链必然存在）。环全死 / 链断 → false。edited by Claude Fable 5.1 2026-09-07
   */
  private repairRings(g: PlanarGraph, f: Face): boolean {
    for (const ring of [f.outer, ...f.holes]) if (!repairRing(g, ring)) return false;
    return true;
  }

  private ringEdgeIds(f: Face): EdgeId[] {
    const out: EdgeId[] = [];
    for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) out.push(d.edge);
    return out;
  }

  /** 全膜身份像快照（扰动前调用）。 */
  captureSnaps(g: PlanarGraph): Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }> {
    const snaps = new Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>();
    for (const f of this.faces()) {
      snaps.set(f.id, { outer: ringVidsTolerant(g, f.outer), holes: f.holes.map((h) => ringVidsTolerant(g, h)) });
    }
    return snaps;
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

/** 容错环顶点提取（共享：构造身份像/移动快照）——环边可能已被本批切割移除：缺失边的起点=前一条边的终点。 */
export function ringVidsTolerant(g: PlanarGraph, r: Ring): VertexId[] {
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

/** 环内死边替换（见 FaceStore.repairRings）。先把环旋到一条活边开头，死边串两侧必有活边。 */
function repairRing(g: PlanarGraph, ring: Ring): boolean {
  const es = ring.edges;
  if (es.every((d) => g.hasEdge(d.edge))) return true;
  const first = es.findIndex((d) => g.hasEdge(d.edge));
  if (first < 0) return false;
  const rot = [...es.slice(first), ...es.slice(0, first)];
  const n = rot.length;
  const vStart = (d: DirEdge): VertexId => (d.forward ? g.edge(d.edge).a : g.edge(d.edge).b);
  const vEnd = (d: DirEdge): VertexId => (d.forward ? g.edge(d.edge).b : g.edge(d.edge).a);
  const out: DirEdge[] = [];
  let i = 0;
  while (i < n) {
    const d = rot[i];
    if (g.hasEdge(d.edge)) { out.push(d); i++; continue; }
    let j = i;
    while (j < n && !g.hasEdge(rot[j].edge)) j++;
    const a = vEnd(rot[i - 1]);                 // rot[0] 是活边，i ≥ 1
    const b = vStart(j < n ? rot[j] : rot[0]);
    const chain = collinearChain(g, a, b);
    if (!chain) return false;
    out.push(...chain);
    i = j;
  }
  ring.edges = out;
  return true;
}

/** a → b 沿原线段 [a,b] 走既有边（每步取线段上最近的下一个顶点，不跳过中间切点）。 */
function collinearChain(g: PlanarGraph, a: VertexId, b: VertexId): DirEdge[] | null {
  if (a === b) return [];
  const pa = g.pt(a), pb = g.pt(b);
  const out: DirEdge[] = [];
  const seen = new Set<VertexId>([a]);
  let cur = a;
  for (let guard = 0; guard < 100000 && cur !== b; guard++) {
    const pc = g.pt(cur);
    const remaining = dist3(pc, pb);
    let bestE: EdgeId | undefined, bestV: VertexId | undefined, bestT = Infinity;
    for (const eid of g.vertex(cur).edges) {
      const e = g.edge(eid);
      const o = e.a === cur ? e.b : e.a;
      if (seen.has(o)) continue;
      const po = g.pt(o);
      if (!pointOnSegment3(po, pa, pb, Q * 2)) continue;
      if (dist3(po, pb) >= remaining - 1e-12) continue;   // 必须朝 b 前进
      const t = dist3(pc, po);
      if (t < bestT) { bestT = t; bestE = eid; bestV = o; }
    }
    if (bestE === undefined || bestV === undefined) return null;
    out.push({ edge: bestE, forward: g.edge(bestE).a === cur });
    seen.add(bestV);
    cur = bestV;
  }
  return cur === b ? out : null;
}

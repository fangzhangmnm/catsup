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

  /** coplanarity 分组 + 每平面跑 findRegions（canonical 基投影）。scope = 局部结算的影响域（planes.ts CoplanarScope）；不给 = 全局。 */
  regionsByPlane(g: PlanarGraph, reg: PlaneRegistry, tol: number, scope?: CoplanarScope): RegionsByPlane {
    const t0 = performance.now();
    const groups = groupCoplanar(g, reg, tol, this.planeIds(), scope);
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

  /** 静默出库（结算机 / 删膜用；叙事由调用方负责）。 */
  deleteSilently(id: FaceId): boolean {
    return this.byId.delete(id);
  }

  eraseFaces(g: PlanarGraph, ids: readonly FaceId[]): FaceEvent[] {
    const events: FaceEvent[] = [];
    for (const id of ids) {
      if (this.byId.delete(id)) events.push({ type: "FACE_ERASED", face: id });
    }
    this.rebuildFaceLinks(g);
    return events;
  }

  /** 全膜顶点 id 环快照（搬迁前拍；经合并映射 + 新坐标读出 = 像）。 */
  captureSnaps(g: PlanarGraph): Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }> {
    const snaps = new Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>();
    for (const f of this.faces()) {
      snaps.set(f.id, { outer: ringVidsTolerant(g, f.outer), holes: f.holes.map((h) => ringVidsTolerant(g, h)) });
    }
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
      return { edges, pts: vids.map((v) => projectToPlane(g.pt(v), basis)) };
    };
    const f: Face = { id: this.nextId++, planeId, outer: ring(outer), holes: holes.map(ring) };
    this.byId.set(f.id, f);
    return f;
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

  // ---------------- 结算机的仓库接口 ----------------

  /** 铸新膜。 */
  mint(planeId: PlaneId, r: Region): Face {
    const f: Face = { id: this.nextId++, planeId, outer: r.outer, holes: r.holes };
    this.byId.set(f.id, f);
    return f;
  }

  /** 以给定 id 落一张膜（一对一承继：保 id，换平面亦跟随）。 */
  setFace(id: FaceId, planeId: PlaneId, r: Region): Face {
    const f: Face = { id, planeId, outer: r.outer, holes: r.holes };
    this.byId.set(id, f);
    return f;
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

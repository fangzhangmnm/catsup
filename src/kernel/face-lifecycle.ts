// face-lifecycle.ts —— 存储态 face 的生老病死 reconciler（内核的心脏）。
//
// 公理 4 修正版（drill L316-320，人类实机实验逼出来的）：face 是**涌现但被存储**的状态——
// 由封闭手势诞生、作为一等状态持久存在、只被特定事件杀死/合并。**不是边集的纯函数**
// （闭环可以无面）。所以 findRegions 的输出不能直接替换 face 集，而要按 mutation 类型 reconcile：
//
//   统一律（drill L421）：诞生靠手势、move 守恒、erase 看 loop 身份、sticky 兜底。
//
// - 构造手势：老面被 ≥2 region 覆盖 → DIVIDE（急切，无确认步）；无主 region 的**外环**含手势边 → BIRTH。
// - erase：按被擦边在相邻面 loop 结构里的身份裁决（drill L363-368）——两面共享→MERGE、
//   内环→ABSORB、外环对 void→**无条件** BURST（不做覆盖查找！否则 回字内填外空 擦内边会把面
//   错误长满外方——「intention 被结构化成了 loop membership」正是为了不用猜）、无面→只删边。
// - move：结构上不存在 birth 路径（不传手势边集）= 守恒律零成本实现。
// - 守恒律（drill L331）：erase 永不凭空创造表面。空 region 永远不会因 erase 被存储。
// - 不对称律：dissolve-collinear 无任何自动路径（靠缺席实现）。
//
// face↔region 匹配 = 几何 anchor：面的 representativePoint 落在哪个新 region 就是它的后继
// （region 互不重叠 → 无歧义；对边切割/吞洞稳健）。
// id 纪律：DIVIDE/MERGE/ABSORB 退休旧 id、铸新 id（事件携带血缘）；延续/STRETCH 保 id。

import { type Pt, pointInRing } from "./geom.ts";
import { type EdgeId, type FaceId, PlanarGraph } from "./topology.ts";
import { type Region, type Ring, findRegions, regionContains, representativePoint } from "./facefind.ts";

export type FaceEvent =
  | { type: "BIRTH"; face: FaceId }
  | { type: "DIVIDE"; from: FaceId; into: FaceId[] }
  | { type: "MERGE"; from: FaceId[]; into: FaceId }
  | { type: "ABSORB"; from: FaceId; into: FaceId }
  | { type: "BURST"; face: FaceId }
  | { type: "STRETCH"; faces: FaceId[] }
  | { type: "FACE_ERASED"; face: FaceId };
// AUTOFOLD-SPLIT / DEDUP-MERGE 是 3D 事件（M4），届时加进此 union。

export interface Face {
  readonly id: FaceId;
  outer: Ring;
  holes: Ring[];
}

/** erase 前的裁决快照（删边前算好；loop 身份以批开始时的状态为准，删除顺序无关）。 */
export interface EraseVerdicts {
  burst: Set<FaceId>;                 // 外环对 void 被擦 → 无条件死
  mergePairs: [FaceId, FaceId][];     // 两面共享边被擦 → 并
  heal: Set<FaceId>;                  // 内环（洞）边或双现桥边被擦 → 存活整理
}

export class FaceStore {
  private byId = new Map<FaceId, Face>();
  private nextId = 1;

  faces(): Face[] { return [...this.byId.values()]; }
  face(id: FaceId): Face | undefined { return this.byId.get(id); }
  faceCount(): number { return this.byId.size; }

  faceContains(f: Face, p: Pt): boolean {
    if (!pointInRing(p, f.outer.pts)) return false;
    for (const h of f.holes) if (pointInRing(p, h.pts)) return false;
    return true;
  }

  /** 面在环里引用某边的出现次数与所在环类型。 */
  private occurrences(f: Face, e: EdgeId): { count: number; onOuter: boolean; onHole: boolean } {
    let count = 0, onOuter = false, onHole = false;
    for (const d of f.outer.edges) if (d.edge === e) { count++; onOuter = true; }
    for (const h of f.holes) for (const d of h.edges) if (d.edge === e) { count++; onHole = true; }
    return { count, onOuter, onHole };
  }

  // ---------------- 构造手势 ----------------

  /** 图已插完手势边后调用。gestureEdges = 沿画线的 created+retraced 边（切割子边身份由调用方维护）。 */
  reconcileConstructive(g: PlanarGraph, gestureEdges: Set<EdgeId>): FaceEvent[] {
    const events: FaceEvent[] = [];
    const regions = findRegions(g);
    const claimed = new Set<Region>();

    // 老面 → 覆盖它的 region 集（构造只加边：面的旧多边形仍是有效几何，直接点试）
    for (const f of this.faces()) {
      const covering = regions.filter((r) => !claimed.has(r) && this.faceContains(f, representativePoint(r)));
      if (covering.length === 1) {
        this.adopt(f, covering[0]);           // 延续（边可能被切开，环刷新；无事件）
        claimed.add(covering[0]);
      } else if (covering.length >= 2) {
        // DIVIDE：急切分割，双方都有膜，无确认步（验收②）
        this.byId.delete(f.id);
        const into: FaceId[] = [];
        for (const r of covering) {
          const nf = this.mint(r);
          into.push(nf.id);
          claimed.add(r);
        }
        events.push({ type: "DIVIDE", from: f.id, into });
      }
      // covering=0：构造不减边，不应发生；防御性保留原面
    }

    // 无主 region：**外环**含手势边才 BIRTH（内环含手势边≠封闭手势——
    // 在空环里画个小方，生的是小方，不是外面那圈环带）。retrace 空闭环也走这条。
    for (const r of regions) {
      if (claimed.has(r)) continue;
      if (r.outer.edges.some((d) => gestureEdges.has(d.edge))) {
        const nf = this.mint(r);
        events.push({ type: "BIRTH", face: nf.id });
      }
    }

    this.rebuildFaceLinks(g);
    return events;
  }

  // ---------------- erase ----------------

  /** 删边**前**按 loop 身份裁决（批量语义：全部按批开始时的环结构判）。 */
  snapshotEraseVerdicts(edgeIds: readonly EdgeId[]): EraseVerdicts {
    const v: EraseVerdicts = { burst: new Set(), mergePairs: [], heal: new Set() };
    for (const e of edgeIds) {
      const hits = this.faces()
        .map((f) => ({ f, occ: this.occurrences(f, e) }))
        .filter((x) => x.occ.count > 0);
      if (hits.length === 0) continue;                        // wire/filament：只删边
      if (hits.length >= 2) {
        v.mergePairs.push([hits[0].f.id, hits[1].f.id]);      // 两面共享 → MERGE
      } else {
        const { f, occ } = hits[0];
        if (occ.count >= 2) v.heal.add(f.id);                 // 双现桥边（裂缝）→ 整理
        else if (occ.onHole) v.heal.add(f.id);                // 内环（洞）→ ABSORB
        else v.burst.add(f.id);                               // 外环对 void → 无条件死
      }
    }
    return v;
  }

  /** 边已删除后调用。 */
  reconcileErase(g: PlanarGraph, v: EraseVerdicts): FaceEvent[] {
    const events: FaceEvent[] = [];

    // 并组（union-find）：批量擦多条共享边可链式并多面
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

    const regions = findRegions(g);
    const taken = new Set<Region>();
    const findRegionAt = (p: Pt): Region | undefined => regions.find((r) => !taken.has(r) && regionContains(r, p));

    // 1. 无条件 BURST（loop 身份裁决，不做覆盖查找——见文件头）
    const dead = new Set<FaceId>(v.burst);

    // 2. 并组：组内任一成员被 burst 污染 → 整组死（与逐条串行擦的两种顺序一致）；
    //    否则按任一成员的旧 anchor 找后继 region；找不到（外圈也破了）→ 整组死。
    for (const members of groups.values()) {
      const tainted = members.some((m) => dead.has(m));
      let survivorRegion: Region | undefined;
      if (!tainted) {
        for (const m of members) {
          const f = this.byId.get(m);
          if (!f) continue;
          survivorRegion = findRegionAt(representativePoint(f));
          if (survivorRegion) break;
        }
      }
      if (survivorRegion) {
        for (const m of members) this.byId.delete(m);
        const nf = this.mint(survivorRegion);
        taken.add(survivorRegion);
        events.push({ type: "MERGE", from: members, into: nf.id });
      } else {
        for (const m of members) dead.add(m);
      }
    }

    // 3. 整理存活（ABSORB / 桥缝愈合）：外环完好，后继必在
    for (const id of v.heal) {
      if (dead.has(id) || !this.byId.has(id)) continue;
      const f = this.byId.get(id)!;
      const r = findRegionAt(representativePoint(f));
      if (r) {
        this.byId.delete(id);
        const nf = this.mint(r);
        taken.add(r);
        events.push({ type: "ABSORB", from: id, into: nf.id });
      } else {
        dead.add(id); // 防御：同批把外圈也擦了
      }
    }

    for (const id of dead) {
      if (this.byId.delete(id)) events.push({ type: "BURST", face: id });
    }

    this.rebuildFaceLinks(g);
    return events;
  }

  /** 只删膜不动拓扑（「闭环无面」态；BURST 后与 eraseFaces 后同构——retrace 可复生）。 */
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
   * ringVerts = move 前每面外环的顶点 id 快照（经 mergeMap 映射后用当前坐标重建多边形做 anchor）。
   * M1 范围注：move 拖边横穿他面导致的 DIVIDE 未实现（golden 未覆盖，挂 todo）；
   * 面被 move 压扁成零面积 → 静默移除（超范围，见 todo）。
   */
  reconcileMove(
    g: PlanarGraph,
    ringVerts: Map<FaceId, number[]>,
    mergeMap: Map<number, number>,
    topologyChanged: boolean,
    movedFaces: Set<FaceId>,
  ): FaceEvent[] {
    const events: FaceEvent[] = [];
    if (!topologyChanged) {
      // STRETCH 快路：环里边都活着，只刷新坐标
      for (const f of this.faces()) this.refreshRingPts(g, f);
      this.rebuildFaceLinks(g);
      if (movedFaces.size) events.push({ type: "STRETCH", faces: [...movedFaces] });
      return events;
    }
    const regions = findRegions(g);
    const taken = new Set<Region>();
    for (const f of this.faces()) {
      const verts = ringVerts.get(f.id);
      if (!verts) continue;
      const pts: Pt[] = [];
      for (const vid0 of verts) {
        let vid = vid0;
        while (mergeMap.has(vid)) vid = mergeMap.get(vid)!;
        try { pts.push(g.pt(vid)); } catch { /* 顶点被合并链吃掉：跳过该点 */ }
      }
      const probe = polygonProbe(pts);
      const r = probe && regions.find((x) => !taken.has(x) && regionContains(x, probe));
      if (r) {
        this.adopt(f, r);
        taken.add(r);
      } else {
        this.byId.delete(f.id); // 压扁/退化：静默移除（M1 超范围，见文件头注）
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
      s.byId.set(id, { id: f.id, outer: cloneRing(f.outer), holes: f.holes.map(cloneRing) });
    }
    return s;
  }

  // ---------------- 内部 ----------------

  private mint(r: Region): Face {
    const f: Face = { id: this.nextId++, outer: r.outer, holes: r.holes };
    this.byId.set(f.id, f);
    return f;
  }

  private adopt(f: Face, r: Region): void {
    f.outer = r.outer;
    f.holes = r.holes;
  }

  private refreshRingPts(g: PlanarGraph, f: Face): void {
    for (const ring of [f.outer, ...f.holes]) {
      ring.pts = ring.edges.map((d) => g.pt(d.forward ? g.edge(d.edge).a : g.edge(d.edge).b));
    }
  }

  /** faceLinks 权威重建：per 出现（桥边在同面双现 → 同 id 两次）。 */
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

/** 顶点序列的内部代表点（move 匹配用）：非退化时用扫描线同款思路的简化版。 */
function polygonProbe(pts: Pt[]): Pt | undefined {
  if (pts.length < 3) return undefined;
  const ring: Ring = { edges: [], pts };
  return representativePoint({ outer: ring, holes: [] });
}

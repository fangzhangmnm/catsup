// kernel.ts —— 公共 facade：批量 mutations + queries + 事件日志。
// 批量是一等公民：一批 = 一次手势 = 一次结算 + 一批 FaceEvent。
// 验收①（drill L79）：Rect 工具 = addEdges(4 段)——本文件（及全内核）没有任何让调用方构造/注入 Face 的入口；
// face 只经结算机（settle.ts）的认领诞生。
//
// 2026-10-21 重写（Claude Fable 5.1）：**动词 = 像表，设面 = 一台机器**（settle.ts 头注释）。
//   draw   = 手势线段；move = 顶点搬迁 + 被牵连膜的像；pp = 帽（XOR）+ 侧壁 + 褶边邻膜改写的像 + 源留面；
//   erase  = 擦边自己的 loop 身份规则（face-lifecycle.ts）；eraseFaces = 纯出库。
//   rotate / scale = move（顶点映射不同而已）。

import {
  type Pt3,
  type PlaneParams,
  normalize3,
  signedArea,
  add3,
  dist3,
  dot3,
  scale3,
  distToPlane,
  distToSegment3,
  projectToPlane,
  ptKey3,
  quantize3,
  samePt3,
} from "./geom.ts";
import { type Edge, type EdgeId, type FaceId, type Vertex, type VertexId, PlanarGraph } from "./topology.ts";
import { type Face, type FaceEvent, FaceStore } from "./face-lifecycle.ts";
import { PlaneRegistry } from "./planes.ts";
import { type Image, type Seg3, ringsOf, settle, translateImage } from "./settle.ts";

export type { Face, FaceEvent } from "./face-lifecycle.ts";
export type { Edge, EdgeId, FaceId, Vertex, VertexId } from "./topology.ts";
export type { Pt, Pt3 } from "./geom.ts";
export type { PlaneId, PlaneRec } from "./planes.ts";
export type { Image, ImageTable, Seg3 } from "./settle.ts";

/** API 取点：z 缺省 = 0（2D 场景/测试直接传 {x,y}）。 */
export interface PtIn { x: number; y: number; z?: number; }
const toPt3 = (p: PtIn): Pt3 => ({ x: p.x, y: p.y, z: p.z ?? 0 });

export interface HitResult { vertex?: VertexId; edge?: EdgeId; face?: FaceId; }

/** 褶边判据（pp 哪条环边让邻膜跟着伸缩）：邻膜平面含推向 ⟺ n_邻·n̂ = 0。数值门限：法向夹角余弦。 */
export const CREASE_COS = 1e-3;

/**
 * 内核 B-rep 的**存储态快照**（持久化契约 ai-docs/20260919-persistence-data-contract.md §5.2 的内存形状；
 * src/format 负责它与字节的互换，内核只认这个）。全部用**索引**不用 id（不铸 id）；坐标 = 米（装载时量化）。
 * 只装状态：顶点、边、平面（τ 合并后的注册参数——重建不等价，必须存）、膜（顶点环，外环 CCW / 洞 CW，
 * 相对该平面的 canonical 基）。不装派生：faceLinks / 环 2D pts / 基 / id / 事件。created 2026-09-20 by Claude Fable 5.1
 */
export interface BrepSnapshot {
  readonly coplanarTol: number;
  readonly vertices: readonly Pt3[];
  readonly edges: readonly (readonly [number, number])[];
  readonly planes: readonly PlaneParams[];
  readonly faces: readonly { readonly plane: number; readonly outer: readonly number[]; readonly holes: readonly (readonly number[])[] }[];
}

export class Kernel {
  private _graph = new PlanarGraph();
  private store = new FaceStore();
  private eventLog: FaceEvent[] = [];
  private planes = new PlaneRegistry();
  /** coplanarity 容差 τ——头号 UX 旋钮（drill L297）。只管平面分组/归属；几何保持精确共面。 */
  readonly coplanarTol: number;

  constructor(opts?: { coplanarTol?: number }) {
    this.coplanarTol = opts?.coplanarTol ?? 1e-3;
  }

  /** 只读窥视用（渲染/测试断言）；改图必须走下面的批量 mutations。 */
  get graph(): PlanarGraph { return this._graph; }

  /**
   * 持久化装载 = **复原存储态**，不是构造（「没有让调用方构造/注入 Face 的入口」仍成立：这里只吃 BrepSnapshot 这一种形状，
   * 且全量校验面环自洽——校验失败整份拒开报出，不修不猜）。不跑 face-finding（A4：闭环可以无面，文件说有几张膜就是几张）。
   * created 2026-09-20 by Claude Fable 5.1
   */
  static fromBrep(snap: BrepSnapshot): Kernel {
    const k = new Kernel({ coplanarTol: snap.coplanarTol });
    const g = k._graph;
    const fail = (msg: string): never => { throw new Error(`fromBrep: ${msg}`); };
    const vid: VertexId[] = [];
    for (let i = 0; i < snap.vertices.length; i++) {
      const q = quantize3(snap.vertices[i]);
      if (g.vertexAt(q) !== undefined) fail(`vertex ${i} collides with an earlier vertex on the grid`);
      vid.push(g.ensureVertex(q));
    }
    for (let i = 0; i < snap.edges.length; i++) {
      const [a, b] = snap.edges[i];
      if (!(a in vid) || !(b in vid)) fail(`edge ${i} references a missing vertex`);
      if (a === b) fail(`edge ${i} is a loop`);
      if (g.edgeBetween(vid[a], vid[b]) !== undefined) fail(`edge ${i} duplicates an earlier edge`);
      g.addEdge(vid[a], vid[b]);
    }
    const pid = snap.planes.map((pl) => k.planes.restore({ n: normalize3(pl.n), d: pl.d }).id);
    const ringKeys = new Set<string>();
    for (let i = 0; i < snap.faces.length; i++) {
      const f = snap.faces[i];
      if (!(f.plane in pid)) fail(`face ${i} references a missing plane`);
      const rec = k.planes.rec(pid[f.plane]);
      const rings = [f.outer, ...f.holes];
      for (const r of rings) {
        if (r.length < 3) fail(`face ${i} has a ring with fewer than 3 vertices`);
        for (const v of r) {
          if (!(v in vid)) fail(`face ${i} references a missing vertex`);
          if (distToPlane(g.pt(vid[v]), rec.plane) > snap.coplanarTol) fail(`face ${i} vertex ${v} is off its plane`);
        }
      }
      const key = rings.map((r) => [...r].sort((a, b) => a - b).join(",")).join("|");
      if (ringKeys.has(key)) fail(`face ${i} duplicates an earlier face (same rings)`);
      ringKeys.add(key);
      let face: Face;
      try {
        face = k.store.restoreFace(g, k.planes, rec.id, f.outer.map((v) => vid[v]), f.holes.map((h) => h.map((v) => vid[v])));
      } catch (e) { fail(`face ${i}: ${(e as Error).message}`); }
      if (!(signedArea(face!.outer.pts) > 0)) fail(`face ${i} outer ring is not CCW in its plane basis`);
      for (const h of face!.holes) if (!(signedArea(h.pts) < 0)) fail(`face ${i} has a hole ring that is not CW`);
    }
    k.store.rebuildFaceLinks(g);
    for (const v of g.vertices()) if (v.edges.size === 0) fail(`vertex ${v.id} is isolated`);
    return k;
  }

  /** 存储态快照（fromBrep 的逆）：索引 = 当前枚举顺序；只含被膜引用的平面。规范排序归 src/format。 */
  toBrep(): BrepSnapshot {
    const vs = this.graph.vertices();
    const vIdx = new Map<VertexId, number>(vs.map((v, i) => [v.id, i]));
    const planeIds = [...new Set(this.store.faces().map((f) => f.planeId))];
    const pIdx = new Map<number, number>(planeIds.map((id, i) => [id, i]));
    const ringVids = (r: { edges: { edge: EdgeId; forward: boolean }[] }): number[] =>
      r.edges.map((d) => vIdx.get(d.forward ? this.graph.edge(d.edge).a : this.graph.edge(d.edge).b)!);
    return {
      coplanarTol: this.coplanarTol,
      vertices: vs.map((v) => ({ x: v.x, y: v.y, z: v.z })),
      edges: this.graph.edges().map((e) => [vIdx.get(e.a)!, vIdx.get(e.b)!] as const),
      planes: planeIds.map((id) => this.planes.rec(id).plane),
      faces: this.store.faces().map((f) => ({ plane: pIdx.get(f.planeId)!, outer: ringVids(f.outer), holes: f.holes.map(ringVids) })),
    };
  }

  /**
   * 影子副本（preview 架构）：clone → 在副本上跑**同一套** mutation → 渲染 diff → 松手对真身重放。
   * id 计数器一起拷 → 副本上的事件与真身提交的事件逐字相同。
   */
  clone(): Kernel {
    const k = new Kernel({ coplanarTol: this.coplanarTol });
    k._graph = this._graph.clone();
    k.store = this.store.clone();
    k.planes = this.planes.clone();
    return k; // 事件日志不拷：副本的 log 只属于预演
  }

  // ---------------- mutations（全部批量收口；每个动词 = 一张像表） ----------------

  /** 构造手势：一批线段（Rect = 4 段）。 */
  addEdges(segs: readonly (readonly [PtIn, PtIn])[]): FaceEvent[] {
    const gesture: Seg3[] = segs.map(([a, b]) => ({ a: toPt3(a), b: toPt3(b) }));
    return this.emit(settle(this.graph, this.store, this.planes, this.coplanarTol, { consumed: new Set(), images: [], gesture }));
  }

  /** 擦边：裁决快照以批开始时的环结构为准，再统一删除（删除顺序无关）。 */
  eraseEdges(ids: readonly EdgeId[]): FaceEvent[] {
    const valid = [...new Set(ids)].filter((id) => this.graph.hasEdge(id));
    const verdicts = this.store.snapshotEraseVerdicts(valid);
    for (const id of valid) this.graph.removeEdge(id);
    return this.emit(this.store.reconcileErase(this.graph, this.planes, this.coplanarTol, verdicts));
  }

  /** 只删膜不动拓扑（「闭环无面」态；之后 retrace 可复生）。 */
  eraseFaces(ids: readonly FaceId[]): FaceEvent[] {
    return this.emit(this.store.eraseFaces(this.graph, ids));
  }

  /**
   * 移动顶点 —— sticky geometry 协议（spec = ai-docs/20260901-move-spec.md）：
   * ① 合并组预判（按**终态**位置分组，撞格 = 合并——绝无幽灵中间态裁决）② 批量刚移（纯坐标）
   * ③ 像表 = 每张被牵连膜的环按新坐标读出（OR、继承自身）→ 结算机（planarize 自愈 / autofold 折 / 认领设面）。
   * 不注入手势 → 永不生膜（守恒律 by construction）。rotate / scale 同走此路（顶点映射不同）。
   */
  moveVertices(moves: readonly { id: VertexId; to: PtIn }[]): FaceEvent[] {
    const snaps = this.store.captureSnaps(this.graph);
    const targets = new Map<VertexId, Pt3>();
    for (const mv of moves) if (this.graph.hasVertex(mv.id)) targets.set(mv.id, quantize3(toPt3(mv.to)));
    const touched = new Set<FaceId>();
    for (const vid of targets.keys()) {
      for (const eid of this.graph.vertex(vid).edges) for (const fid of this.graph.edge(eid).faceLinks) touched.add(fid);
    }
    // ① 合并组：所有顶点按终态格点分组；同格 = 合并（幸存者优先取未移动者）
    const byFinal = new Map<string, VertexId[]>();
    for (const v of this.graph.vertices()) {
      const p = targets.get(v.id) ?? { x: v.x, y: v.y, z: v.z };
      const k = ptKey3(p);
      (byFinal.get(k) ?? byFinal.set(k, []).get(k)!).push(v.id);
    }
    const merged = new Map<VertexId, VertexId>();
    for (const group of byFinal.values()) {
      if (group.length < 2) continue;
      const survivor = group.find((id) => !targets.has(id)) ?? Math.min(...group);
      for (const other of group) {
        if (other === survivor) continue;
        merged.set(other, survivor);
        for (const eid of [...this.graph.vertex(other).edges]) for (const fid of this.graph.edge(eid).faceLinks) touched.add(fid);
        this.absorbVertex(other, survivor);
        targets.delete(other);
      }
    }
    // ② 批量刚移（先摘 key 后上 key，无瞬态碰撞）
    const batch = [...targets]
      .filter(([id, to]) => this.graph.hasVertex(id) && !samePt3(this.graph.pt(id), to))
      .map(([id, to]) => ({ id, to }));
    this.graph.relocateVertices(batch);
    if (!batch.length && !merged.size) return [];
    // ③ 像表：被牵连膜的环（快照 vid → 合并映射 → 新坐标）
    const chase = (vid: VertexId): VertexId => { while (merged.has(vid)) vid = merged.get(vid)!; return vid; };
    const ringPts = (vids: readonly VertexId[]): Pt3[] => {
      const out: Pt3[] = [];
      for (const v0 of vids) { const v = chase(v0); if (this.graph.hasVertex(v)) out.push(this.graph.pt(v)); }
      return out;
    };
    const images: Image[] = [];
    for (const fid of touched) {
      const snap = snaps.get(fid);
      if (!snap || !this.store.face(fid)) continue;
      images.push({ rings: [ringPts(snap.outer), ...snap.holes.map(ringPts)], algebra: "or", inherit: fid });
    }
    return this.emit(settle(this.graph, this.store, this.planes, this.coplanarTol, { consumed: touched, images }));
  }

  /**
   * push/pull —— 像表（2026-10-21；取代 v3 的边分类 / frontier / riser / 蒸发 + rename / toggle）：
   *   · 帽 = 膜整体平移 δ = h·n̂，**XOR**（落地与既有膜成对湮灭 = SU 推穿；预演 settleLanding:false 用 OR 不湮灭）、继承原 id（身份跟随）
   *   · 每条环边 e=(a,b)：**褶边**（全部邻膜 ∥ n̂，CREASE_COS）→ 改写邻膜 G 的像：环里的 e 段换成 a→a+δ→b+δ→b（拉 = 伸、推 = 缩，同一句话）；
   *     否则（裸边 / 任一邻膜不平行）→ 侧壁像 band(e) = (a, b, b+δ, a+δ)，OR、新膜
   *   · 有裸边 → 原位留一张源像 F₀（拉孤面成闭盒）
   * 顶点守卫 / 频谱整段退役：第三张只共享顶点的膜的像没动 → 它不动（邻居形状不可侵犯 by construction）。
   */
  pushPull(id: FaceId, dist: number, opts?: { settleLanding?: boolean }): FaceEvent[] {
    const settleLanding = opts?.settleLanding !== false;
    const f = this.store.face(id);
    if (!f) return [];
    if (Math.abs(dist) < 1e-6) return [];
    const g = this.graph;
    const n = this.planes.rec(f.planeId).plane.n;
    const delta = scale3(n, dist);
    const parallel = (gid: FaceId): boolean => {
      const other = this.store.face(gid);
      return other ? Math.abs(dot3(this.planes.rec(other.planeId).plane.n, n)) <= CREASE_COS : true;
    };
    const consumed = new Set<FaceId>([id]);
    const images: Image[] = [];
    images.push({ rings: translateImage(ringsOf(g, f), delta), algebra: settleLanding ? "xor" : "or", inherit: id });
    const rewrite = new Map<FaceId, Set<EdgeId>>();
    let anyBare = false;
    for (const ring of [f.outer, ...f.holes]) {
      for (const d of ring.edges) {
        const e = g.edge(d.edge);
        const a = g.pt(d.forward ? e.a : e.b), b = g.pt(d.forward ? e.b : e.a);
        const others = e.faceLinks.filter((x) => x !== id);
        if (others.length > 0 && others.every(parallel)) {
          for (const gid of others) { (rewrite.get(gid) ?? rewrite.set(gid, new Set()).get(gid)!).add(e.id); consumed.add(gid); }
          continue;
        }
        if (others.length === 0) anyBare = true;
        images.push({ rings: [[a, b, add3(b, delta), add3(a, delta)]], algebra: "or" });
      }
    }
    for (const [gid, eids] of rewrite) {
      const gf = this.store.face(gid)!;
      const rings: Pt3[][] = [];
      for (const ring of [gf.outer, ...gf.holes]) {
        const pts: Pt3[] = [];
        for (const d of ring.edges) {
          const e = g.edge(d.edge);
          const p = g.pt(d.forward ? e.a : e.b), q = g.pt(d.forward ? e.b : e.a);
          pts.push(p);
          if (eids.has(e.id)) { pts.push(add3(p, delta)); pts.push(add3(q, delta)); }
        }
        rings.push(pts);
      }
      images.push({ rings, algebra: "or", inherit: gid });
    }
    if (anyBare) images.push({ rings: ringsOf(g, f), algebra: "or" });
    return this.emit(settle(g, this.store, this.planes, this.coplanarTol, { consumed, images, buryOrphans: true }));
  }

  // ---------------- queries ----------------

  vertices(): Vertex[] { return this.graph.vertices(); }
  edges(): Edge[] { return this.graph.edges(); }
  faces(): Face[] { return this.store.faces(); }
  face(id: FaceId): Face | undefined { return this.store.face(id); }
  log(): readonly FaceEvent[] { return this.eventLog; }

  /** 命中测试（3D 距离；面 = 落在平面 τ 邻域内且投影在环内）：顶点 > 边 > 面。 */
  hitTest(pIn: PtIn, tol: number): HitResult {
    const p = toPt3(pIn);
    let bestV: VertexId | undefined, bestVd = tol;
    for (const v of this.graph.vertices()) {
      const d = dist3(p, { x: v.x, y: v.y, z: v.z });
      if (d <= bestVd) { bestVd = d; bestV = v.id; }
    }
    if (bestV !== undefined) return { vertex: bestV };
    let bestE: EdgeId | undefined, bestEd = tol;
    for (const e of this.graph.edges()) {
      const d = distToSegment3(p, this.graph.pt(e.a), this.graph.pt(e.b));
      if (d <= bestEd) { bestEd = d; bestE = e.id; }
    }
    if (bestE !== undefined) return { edge: bestE };
    for (const f of this.store.faces()) {
      const rec = this.planes.rec(f.planeId);
      if (distToPlane(p, rec.plane) > Math.max(tol, this.coplanarTol)) continue;
      if (this.store.faceContains(f, projectToPlane(p, rec.basis))) return { face: f.id };
    }
    return {};
  }

  /** face 的世界坐标环（渲染层用；沿环取每条有向边的起点顶点，精确无投影往返误差）。 */
  faceRings3(id: FaceId): { outer: Pt3[]; holes: Pt3[][] } | undefined {
    const f = this.store.face(id);
    if (!f) return undefined;
    const [outer, ...holes] = ringsOf(this.graph, f);
    return { outer, holes };
  }

  planeOf(id: FaceId) { return this.store.face(id) ? this.planes.rec(this.store.face(id)!.planeId) : undefined; }

  // ---------------- 内部 ----------------

  private emit(events: FaceEvent[]): FaceEvent[] {
    this.eventLog.push(...events);
    return events;
  }

  /**
   * 合并组执行体：from 的边全部搬到 to（坍缩边丢弃、平行边去重——sticky 有损，公理 3）；
   * from 随最后一条边消亡。先加后删，防对端顶点被中途 GC。edited by Claude Fable 5 2026-09-01
   */
  private absorbVertex(from: VertexId, to: VertexId): void {
    for (const eid of [...this.graph.vertex(from).edges]) {
      const e = this.graph.edge(eid);
      const other = this.graph.otherEnd(e, from);
      if (other !== to && this.graph.edgeBetween(to, other) === undefined) {
        const ne = this.graph.addEdge(to, other);
        this.graph.edge(ne).faceLinks = [...e.faceLinks];
      }
      this.graph.removeEdge(eid);
    }
  }
}

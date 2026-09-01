// kernel.ts —— 公共 facade：批量 mutations + queries + 事件日志。
// 批量是一等公民：一批 = 一次手势 = 一次重跑 + 一次 reconcile + 一批 FaceEvent。
// 验收①（drill L79）：Rect 工具 = addEdges(4 段)——本文件（及全内核）没有任何
// 让调用方构造/注入 Face 的入口；face 只经 face-lifecycle 的事件诞生。

import {
  type Pt,
  type Pt3,
  dist3,
  distToPlane,
  distToSegment3,
  projectToPlane,
  ptKey3,
  quantize3,
  samePt3,
} from "./geom.ts";
import { type Edge, type EdgeId, type FaceId, type Vertex, type VertexId, PlanarGraph } from "./topology.ts";
import { insertSegment } from "./subdivide.ts";
import { planarize } from "./planarize.ts";
import { type Face, type FaceEvent, FaceStore } from "./face-lifecycle.ts";
import { PlaneRegistry } from "./planes.ts";

export type { Face, FaceEvent } from "./face-lifecycle.ts";
export type { Edge, EdgeId, FaceId, Vertex, VertexId } from "./topology.ts";
export type { Pt, Pt3 } from "./geom.ts";
export type { PlaneId, PlaneRec } from "./planes.ts";

/** API 取点：z 缺省 = 0（2D 场景/测试直接传 {x,y}）。 */
export interface PtIn { x: number; y: number; z?: number; }
const toPt3 = (p: PtIn): Pt3 => ({ x: p.x, y: p.y, z: p.z ?? 0 });

export interface HitResult { vertex?: VertexId; edge?: EdgeId; face?: FaceId; }

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

  /** 只读窥视用（playground 渲染/测试断言）；改图必须走下面的批量 mutations。 */
  get graph(): PlanarGraph { return this._graph; }

  /**
   * 影子副本（preview 架构）：clone → 在副本上跑**同一套** mutation → 渲染 diff →
   * 松手对真身重放。不另写预测路径（第二套推演必然漂移 → 预览撒谎）。
   * id 计数器一起拷 → 副本上的事件与真身提交的事件逐字相同。
   * 大模型后的增量化与「局部 face-finding」同一条命门，接缝同处。
   */
  clone(): Kernel {
    const k = new Kernel({ coplanarTol: this.coplanarTol });
    k._graph = this._graph.clone();
    k.store = this.store.clone();
    k.planes = this.planes.clone();
    return k; // 事件日志不拷：副本的 log 只属于预演
  }

  // ---------------- mutations（全部批量收口） ----------------

  /** 构造手势：一批线段（Rect = 4 段）。 */
  addEdges(segs: readonly (readonly [PtIn, PtIn])[]): FaceEvent[] {
    const gesture = new Set<EdgeId>();
    for (const [a, b] of segs) {
      const r = insertSegment(this.graph, toPt3(a), toPt3(b), (parent, c1, c2) => {
        // 手势边被后续段切开 → 子边继承手势身份
        if (gesture.delete(parent)) { gesture.add(c1); gesture.add(c2); }
      });
      for (const e of r.created) gesture.add(e);
      for (const e of r.retraced) gesture.add(e);
    }
    return this.emit(this.store.reconcileConstructive(this.graph, this.planes, this.coplanarTol, gesture));
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
   * ① 合并组预判（按**终态**位置分组，撞格=合并——绝无幽灵中间态裁决）
   * ② 批量刚移（纯坐标）③ planarize 自愈（不注入手势 → 永不生膜，守恒律 by construction）
   * ④ 覆盖 reconcile 设面（胞腔填 ⟺ 被 ≥1 旧膜像覆盖，1+1=1）。
   * rotate/duplicate/scale 未来同走此协议。edited by Claude Fable 5 2026-09-01
   */
  moveVertices(moves: readonly { id: VertexId; to: PtIn }[]): FaceEvent[] {
    // 快照：每面全环（外+洞）顶点 id + 受牵连面
    const snaps = new Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>();
    const ringVids = (r: { edges: { edge: EdgeId; forward: boolean }[] }): VertexId[] =>
      r.edges.map((d) => (d.forward ? this.graph.edge(d.edge).a : this.graph.edge(d.edge).b));
    for (const f of this.store.faces()) {
      snaps.set(f.id, { outer: ringVids(f.outer), holes: f.holes.map(ringVids) });
    }
    const targets = new Map<VertexId, Pt3>();
    for (const mv of moves) {
      if (this.graph.hasVertex(mv.id)) targets.set(mv.id, quantize3(toPt3(mv.to)));
    }
    const movedFaces = new Set<FaceId>();
    for (const vid of targets.keys()) {
      for (const eid of this.graph.vertex(vid).edges) {
        for (const fid of this.graph.edge(eid).faceLinks) movedFaces.add(fid);
      }
    }
    // ① 合并组预判：所有顶点按终态格点分组；同格 = 合并（幸存者优先取未移动者）
    const byFinal = new Map<string, VertexId[]>();
    for (const v of this.graph.vertices()) {
      const p = targets.get(v.id) ?? { x: v.x, y: v.y, z: v.z };
      const k = ptKey3(p);
      const list = byFinal.get(k) ?? [];
      list.push(v.id);
      byFinal.set(k, list);
    }
    const mergedVerts = new Map<VertexId, VertexId>();
    let mergesHappened = false;
    for (const group of byFinal.values()) {
      if (group.length < 2) continue;
      mergesHappened = true;
      const survivor = group.find((id) => !targets.has(id)) ?? Math.min(...group);
      for (const other of group) {
        if (other === survivor) continue;
        mergedVerts.set(other, survivor);
        this.absorbVertex(other, survivor);
        targets.delete(other);
      }
    }
    // ② 批量刚移（先摘 key 后上 key，无瞬态碰撞）
    const batch = [...targets]
      .filter(([id, to]) => this.graph.hasVertex(id) && !samePt3(this.graph.pt(id), to))
      .map(([id, to]) => ({ id, to }));
    this.graph.relocateVertices(batch);
    // ③ 自愈
    const { changed } = planarize(this.graph);
    // ④ 覆盖 reconcile
    return this.emit(this.store.reconcileCoverage(
      this.graph, this.planes, this.coplanarTol, snaps, mergedVerts, movedFaces, mergesHappened || changed,
    ));
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
    const ring3 = (r: { edges: { edge: EdgeId; forward: boolean }[] }): Pt3[] =>
      r.edges.map((d) => this.graph.pt(d.forward ? this.graph.edge(d.edge).a : this.graph.edge(d.edge).b));
    return { outer: ring3(f.outer), holes: f.holes.map(ring3) };
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
        this.graph.addEdge(to, other);
      }
      this.graph.removeEdge(eid);
    }
  }
}

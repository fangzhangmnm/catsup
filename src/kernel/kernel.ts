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
  pointOnSegment3,
  projectToPlane,
  quantize3,
  samePt3,
  segIntersections3,
} from "./geom.ts";
import { type Edge, type EdgeId, type FaceId, type Vertex, type VertexId, PlanarGraph } from "./topology.ts";
import { insertSegment } from "./subdivide.ts";
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
   * 移动顶点（sticky：落点撞顶点=合并、落边内部=切开再合并、拖出交叉=重新 subdivide）。
   * 结构上不传手势边集 → move 永不生膜（守恒律）。
   * M1 范围注：move 拖边横穿他面的 DIVIDE、压扁成零面积的面 → 未实现（golden 挂 todo）。
   */
  moveVertices(moves: readonly { id: VertexId; to: PtIn }[]): FaceEvent[] {
    // anchor 快照：每面外环顶点 id（sticky 变拓扑后用当前坐标重建多边形）
    const ringVerts = new Map<FaceId, VertexId[]>();
    for (const f of this.store.faces()) {
      ringVerts.set(
        f.id,
        f.outer.edges.map((d) => {
          const e = this.graph.edge(d.edge);
          return d.forward ? e.a : e.b;
        }),
      );
    }
    const movedFaces = new Set<FaceId>();
    const mergeMap = new Map<VertexId, VertexId>();
    let topologyChanged = false;

    for (const mv of moves) {
      let vid = mv.id;
      while (mergeMap.has(vid)) vid = mergeMap.get(vid)!;
      if (!this.graph.hasVertex(vid)) continue;
      const target = quantize3(toPt3(mv.to));
      const cur = this.graph.pt(vid);
      if (samePt3(cur, target)) continue;

      for (const eid of this.graph.vertex(vid).edges) {
        for (const fid of this.graph.edge(eid).faceLinks) movedFaces.add(fid);
      }

      const occupant = this.graph.vertexAt(target);
      if (occupant !== undefined && occupant !== vid) {
        // sticky：落点撞既有顶点 → 合并（重合即同一）
        topologyChanged = true;
        this.mergeVertexInto(vid, occupant, mergeMap);
        continue;
      }
      const hostEdge = this.findEdgeContaining(target, vid);
      if (hostEdge !== undefined) {
        // sticky：落点在他边内部 → 切开，然后并入切点
        topologyChanged = true;
        this.graph.splitEdge(hostEdge, target);
        this.mergeVertexInto(vid, this.graph.vertexAt(target)!, mergeMap);
        continue;
      }
      this.graph.relocateVertex(vid, target);
      // 移动后 incident 边可能与他边交叉 / 他顶点落上来 → rip & reinsert（无手势身份）
      const dirty = this.dirtyIncidentEdges(vid);
      if (dirty.length) {
        topologyChanged = true;
        for (const eid of dirty) {
          if (!this.graph.hasEdge(eid)) continue;
          const e = this.graph.edge(eid);
          const pa = this.graph.pt(e.a), pb = this.graph.pt(e.b);
          this.graph.removeEdge(eid);
          insertSegment(this.graph, pa, pb);
        }
      }
    }
    return this.emit(this.store.reconcileMove(this.graph, this.planes, this.coplanarTol, ringVerts, mergeMap, topologyChanged, movedFaces));
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

  /** 把 from 的边全部搬到 to（平行边去重丢弃；坍缩边丢弃）；from 随最后一条边消亡。 */
  private mergeVertexInto(from: VertexId, to: VertexId, mergeMap: Map<VertexId, VertexId>): void {
    mergeMap.set(from, to);
    for (const eid of [...this.graph.vertex(from).edges]) {
      const e = this.graph.edge(eid);
      const other = this.graph.otherEnd(e, from);
      this.graph.removeEdge(eid);
      if (other === to) continue;                                  // 边坍缩
      if (this.graph.edgeBetween(to, other) !== undefined) continue; // 平行边去重（sticky 有损）
      this.graph.addEdge(to, other);
    }
  }

  /** target 落在哪条边内部（排除 vid 的 incident 边——顶点滑到自家边上是折叠，暂不处理）。 */
  private findEdgeContaining(target: Pt3, vid: VertexId): EdgeId | undefined {
    for (const e of this.graph.edges()) {
      if (e.a === vid || e.b === vid) continue;
      const pa = this.graph.pt(e.a), pb = this.graph.pt(e.b);
      if (!pointOnSegment3(target, pa, pb)) continue;
      if (samePt3(target, pa) || samePt3(target, pb)) continue;
      return e.id;
    }
    return undefined;
  }

  /** vid 的 incident 边中，与他边交叉或被他顶点骑上的（需要 rip & reinsert）。 */
  private dirtyIncidentEdges(vid: VertexId): EdgeId[] {
    const dirty: EdgeId[] = [];
    for (const eid of this.graph.vertex(vid).edges) {
      const e = this.graph.edge(eid);
      const pa = this.graph.pt(e.a), pb = this.graph.pt(e.b);
      let isDirty = false;
      for (const o of this.graph.edges()) {
        if (o.id === eid) continue;
        if (o.a === e.a || o.a === e.b || o.b === e.a || o.b === e.b) continue; // 共端点相邻边不算
        if (segIntersections3(pa, pb, this.graph.pt(o.a), this.graph.pt(o.b)).length) { isDirty = true; break; }
      }
      if (!isDirty) {
        for (const v of this.graph.vertices()) {
          if (v.id === e.a || v.id === e.b) continue;
          if (pointOnSegment3({ x: v.x, y: v.y, z: v.z }, pa, pb)) { isDirty = true; break; }
        }
      }
      if (isDirty) dirty.push(eid);
    }
    return dirty;
  }
}

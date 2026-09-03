// kernel.ts —— 公共 facade：批量 mutations + queries + 事件日志。
// 批量是一等公民：一批 = 一次手势 = 一次重跑 + 一次 reconcile + 一批 FaceEvent。
// 验收①（drill L79）：Rect 工具 = addEdges(4 段)——本文件（及全内核）没有任何
// 让调用方构造/注入 Face 的入口；face 只经 face-lifecycle 的事件诞生。

import {
  type Pt,
  type Pt3,
  add3,
  dist3,
  dot3,
  scale3,
  distToPlane,
  distToSegment3,
  planeFromPoints,
  projectToPlane,
  ptKey3,
  quantize3,
  samePt3,
} from "./geom.ts";
import { type Edge, type EdgeId, type FaceId, type Vertex, type VertexId, PlanarGraph } from "./topology.ts";
import { insertSegment } from "./subdivide.ts";
import { planarize } from "./planarize.ts";
import { foldDecompose } from "./autofold.ts";
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
    return this.addSegmentsMixed(segs.map(([a, b]) => ({ a, b, gesture: true })));
  }

  /**
   * 混合手势批：每段自带手势身份开关（pp 补壁用——洞环底边只分割不生膜，管孔保持贯通；
   * 2026-09-02 方管案）。非手势段仍走同一 sticky 插入与 reconcile，只是不入 BIRTH 依据。
   */
  private addSegmentsMixed(segs: readonly { a: PtIn; b: PtIn; gesture: boolean }[], toggleWith?: Set<EdgeId>): FaceEvent[] {
    const gesture = new Set<EdgeId>();
    for (const { a, b, gesture: g } of segs) {
      const r = insertSegment(this.graph, toPt3(a), toPt3(b), (parent, c1, c2) => {
        // 手势边被后续段切开 → 子边继承手势身份
        if (gesture.delete(parent)) { gesture.add(c1); gesture.add(c2); }
      });
      if (g) {
        for (const e of r.created) gesture.add(e);
        for (const e of r.retraced) gesture.add(e);
      }
    }
    return this.emit(this.store.reconcileConstructive(this.graph, this.planes, this.coplanarTol, gesture, toggleWith));
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
  moveVertices(moves: readonly { id: VertexId; to: PtIn }[], algebra: "or" | "xor" = "or"): FaceEvent[] {
    // 快照：每面全环（外+洞）顶点 id + 受牵连面
    const snaps = new Map<FaceId, { outer: VertexId[]; holes: VertexId[][] }>();
    // 容错版环快照（2026-09-02 pp v3：frontier 边可在 move 之前被宏删除——缺失边的起点
    // 用前一条边的终点补齐，环折线不失顶点）
    const ringVids = (r: { edges: { edge: EdgeId; forward: boolean }[] }): VertexId[] => {
      const out: VertexId[] = [];
      const es = r.edges;
      for (let i = 0; i < es.length; i++) {
        const d = es[i];
        if (this.graph.hasEdge(d.edge)) {
          const e = this.graph.edge(d.edge);
          out.push(d.forward ? e.a : e.b);
        } else {
          const prev = es[(i - 1 + es.length) % es.length];
          if (this.graph.hasEdge(prev.edge)) {
            const pe = this.graph.edge(prev.edge);
            out.push(prev.forward ? pe.b : pe.a);
          }
        }
      }
      return out;
    };
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
    // ③ 自愈（第一员：planarize 治交叉）
    const { changed } = planarize(this.graph);
    // ③.5 自愈第二员：autofold 治非平面（最少折缝，user 2026-09-01 拍板「十边形对折只出一条缝」）。
    //     成功 → 加折缝弦 + 按片认领（膜折而不破=DIVIDE 叙事）；失败/带洞 → 交还覆盖 reconcile BURST 兜底。
    const chase = (vid0: VertexId): VertexId => {
      let vid = vid0;
      while (mergedVerts.has(vid)) vid = mergedVerts.get(vid)!;
      return vid;
    };
    const folds = new Map<FaceId, VertexId[][]>();
    for (const [fid, snap] of snaps) {
      if (snap.holes.length) continue; // v1：带洞非平面面不折，BURST 兜底
      const vids: VertexId[] = [];
      for (const vid0 of snap.outer) {
        const vid = chase(vid0);
        if (!this.graph.hasVertex(vid)) continue;
        if (vids.length && vids[vids.length - 1] === vid) continue;
        vids.push(vid);
      }
      while (vids.length >= 2 && vids[0] === vids[vids.length - 1]) vids.pop();
      if (vids.length < 4) continue;
      const pts = vids.map((vid) => this.graph.pt(vid));
      let plane = null;
      for (let i = 0; i + 2 < pts.length && !plane; i++) plane = planeFromPoints(pts[i], pts[i + 1], pts[i + 2]);
      if (plane && pts.every((p) => distToPlane(p, plane!) <= this.coplanarTol)) continue; // 仍平面
      const d = foldDecompose(pts, this.coplanarTol);
      if (!d) continue;
      for (const [i, j] of d.creases) {
        const a = vids[i], b = vids[j];
        if (a === b || this.graph.edgeBetween(a, b) !== undefined) continue;
        this.graph.addEdge(a, b);
      }
      folds.set(fid, d.pieces.map((idxs) => idxs.map((i) => vids[i])));
    }
    if (folds.size) planarize(this.graph); // 折缝弦可能穿越他物/骑上顶点
    // ④ 覆盖 reconcile。动到任何膜的顶点必走全路径——快路径的 refreshRingPts 不检测
    //   出平面/平面平移，曾把非平面膜假装成平的（2026-09-01 立方体移墙案，详 move-spec §4）
    const topologyChanged = mergesHappened || changed || movedFaces.size > 0;
    return this.emit(this.store.reconcileCoverage(
      this.graph, this.planes, this.coplanarTol, snaps, mergedVerts, movedFaces, topologyChanged, folds, algebra,
    ));
  }

  /**
   * push/pull —— 宏动词（2026-09-01 pp 纪元 v1）：**零新原语，骑两个既有协议**。
   * = ① moveVertices(面全环顶点, dist·n̂)（sticky geometry：邻壁自动伸缩/换平面跟随/autofold）
   *   ② addEdges(裸边界补壁线，带手势身份)：faceLinks==1 的环边在原位补画底环+竖棱 →
   *      侧壁/底面经正常 BIRTH 涌现——与手绘逐字等价（golden 钉死）。
   * 盒面再拉 = 纯 ①（邻壁伸缩，无补壁）。挖洞（1+1=0 意图特例）与暗礁② 待真机裁决，v1 不做：
   * 推到与他面重合 = 普通 sticky 语义（dedup 1+1=1）。
   */
  /**
   * push/pull v3（2026-09-02 垂直判据拍板，user 论证：move 只有在**不改变被引用面斜度**时合法）：
   * 边分类 = **平面不变式**——边沿 δ=h·n̂ 平移仍留在邻膜平面内 ⟺ n_邻·n̂=0：
   *   · 裸边（无邻）→ MOVE+原位补底（SU 拉孤面成闭盒）
   *   · 全部邻膜平行于拉方向 → MOVE（墙 sticky 伸缩/结构性缺口，无缝无 parity 戏法）
   *   · 任一邻膜不平行（共面半、棱台斜面）→ COPY（原边留守邻膜，目标副本下/上潜）
   * frontier（MOVE 边的某端被 COPY 边扣留）→ 删原画新（dest 段+端点竖棱）——loose 残线病根即此。
   * 含 COPY 时被拉膜先蒸发（防非平面快照触 autofold），目标环 BIRTH；纯 MOVE 时膜随行。
   * 着陆 XOR/口 parity/裸线收尾照旧。多选 pull＝park（SU 亦多年后才有）。
   */
  pushPull(id: FaceId, dist: number): FaceEvent[] {
    const f = this.store.face(id);
    if (!f) return [];
    const rec = this.planes.rec(f.planeId);
    const nrm = rec.plane.n;
    const delta = scale3(nrm, dist);
    if (Math.abs(dist) < 1e-6) return [];
    const beforeEdges = new Set(this.graph.edges().map((e) => e.id));
    const rings = [f.outer, ...f.holes];

    // ---- 分类（平面不变式判据） ----
    type Cls = "move" | "copy";
    const cls = new Map<EdgeId, Cls>();
    const fRing = new Set<EdgeId>();
    const bare = new Set<EdgeId>();
    const ringOf = new Map<EdgeId, number>();
    for (let ri = 0; ri < rings.length; ri++) {
      for (const de of rings[ri].edges) {
        const e = this.graph.edge(de.edge);
        fRing.add(e.id);
        ringOf.set(e.id, ri);
        const others = e.faceLinks.filter((x) => x !== id);
        if (others.length === 0) {
          cls.set(e.id, "move");
          bare.add(e.id);
        } else if (others.every((o) => {
          const g = this.store.face(o);
          return g ? Math.abs(dot3(this.planes.rec(g.planeId).plane.n, nrm)) <= 1e-3 : true;
        })) {
          cls.set(e.id, "move");
        } else {
          cls.set(e.id, "copy");
        }
      }
    }
    // 顶点：incident 环边全 MOVE → 随行；含 COPY → 留守（frontier 顶点）
    const vertCls = new Map<VertexId, { hasMove: boolean; hasCopy: boolean }>();
    for (const eid of fRing) {
      const e = this.graph.edge(eid);
      const c = cls.get(eid)!;
      for (const v of [e.a, e.b]) {
        const rec2 = vertCls.get(v) ?? { hasMove: false, hasCopy: false };
        if (c === "move") rec2.hasMove = true;
        else rec2.hasCopy = true;
        vertCls.set(v, rec2);
      }
    }
    const travels = (v: VertexId): boolean => {
      const c = vertCls.get(v)!;
      return c.hasMove && !c.hasCopy;
    };

    const oldPos = new Map<VertexId, Pt3>();
    for (const v of vertCls.keys()) oldPos.set(v, this.graph.pt(v));

    const segs: { a: PtIn; b: PtIn; gesture: boolean }[] = [];
    const hasCopyAny = [...cls.values()].some((c) => c === "copy");

    // ---- COPY 边：目标副本 ----
    for (const eid of fRing) {
      if (cls.get(eid) !== "copy") continue;
      const e = this.graph.edge(eid);
      segs.push({ a: add3(oldPos.get(e.a)!, delta), b: add3(oldPos.get(e.b)!, delta), gesture: true });
    }
    // ---- frontier MOVE 边：删原画新（一端被扣留，随行会拉斜——残线病根） ----
    for (const eid of [...fRing]) {
      if (cls.get(eid) !== "move" || bare.has(eid)) continue;
      const e = this.graph.edge(eid);
      if (travels(e.a) && travels(e.b)) continue; // 纯伸缩：随 moveVertices
      segs.push({ a: add3(oldPos.get(e.a)!, delta), b: add3(oldPos.get(e.b)!, delta), gesture: true });
      this.graph.removeEdge(eid);
    }
    // ---- 裸边：补底副本（洞环不带手势——管孔贯通） + frontier 裸边同删原画新 ----
    for (const eid of [...bare]) {
      if (!this.graph.hasEdge(eid)) continue;
      const e = this.graph.edge(eid);
      segs.push({ a: oldPos.get(e.a)!, b: oldPos.get(e.b)!, gesture: ringOf.get(eid) === 0 });
      if (!(travels(e.a) && travels(e.b))) {
        segs.push({ a: add3(oldPos.get(e.a)!, delta), b: add3(oldPos.get(e.b)!, delta), gesture: true });
        this.graph.removeEdge(eid);
      }
    }
    // ---- 竖棱：frontier 顶点的 riser + 随行裸边顶点的侧棱 ----
    for (const [v, c] of vertCls) {
      const p = oldPos.get(v)!;
      if (c.hasCopy) {
        segs.push({ a: p, b: add3(p, delta), gesture: true });          // riser（COPY 顶点全体：井壁/frontier）
      } else if (travels(v) && [...bare].some((eid) => {
        if (!beforeEdges.has(eid)) return false;
        const stillHas = this.graph.hasEdge(eid);
        const e0 = stillHas ? this.graph.edge(eid) : null;
        return e0 ? (e0.a === v || e0.b === v) : false;
      })) {
        segs.push({ a: p, b: add3(p, delta), gesture: true });          // 拉孤面的四侧棱
      }
    }

    // ---- 含 COPY：被拉膜先蒸发（口开），目标环经手势 BIRTH ----
    const evErase = hasCopyAny ? this.eraseFaces([id]) : [];
    // ---- 随行批（XOR 着陆） ----
    const moves = [...vertCls.keys()].filter((v) => travels(v) && this.graph.hasVertex(v))
      .map((v) => ({ id: v, to: add3(oldPos.get(v)!, delta) }));
    const ev1 = moves.length ? this.moveVertices(moves, "xor") : [];
    // ---- 构造批（parity 设面） ----
    // parity toggle 只属于 copy/开口世界；纯 MOVE 的随行膜绝不能被自己的环 id 误杀
    const ev2 = segs.length ? this.addSegmentsMixed(segs, hasCopyAny ? fRing : new Set<EdgeId>()) : [];
    this.cleanupNakedEdges(beforeEdges, fRing);
    return [...evErase, ...ev1, ...ev2];
  }

  // ---------------- queries ----------------  // ---------------- queries ----------------

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
   * pp 收尾清裸线（user 2026-09-02「L 的线没删掉」+ WYSIWYG 黄线）：只清**本次操作涉及**的边
   * （原环 ∪ 新增）中两侧膜全灭者（faceLinks==0）——用户手画的 wire 不碰；E5 空环天然免疫
   * （顶环 dedup 让位给底环 id，不入候选）。SU 同款：扫带顶边/井口悬线随膜一起走。
   */
  private cleanupNakedEdges(beforeEdges: ReadonlySet<EdgeId>, opRing: ReadonlySet<EdgeId>): void {
    const cand = new Set<EdgeId>(opRing);
    for (const e of this.graph.edges()) if (!beforeEdges.has(e.id)) cand.add(e.id);
    for (const eid of cand) {
      if (this.graph.hasEdge(eid) && this.graph.edge(eid).faceLinks.length === 0) this.graph.removeEdge(eid);
    }
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

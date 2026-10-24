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
  sub3,
  cross3,
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
import { type Image, type ImageTable, type Seg3, ringsOf, settle, translateImage } from "./settle.ts";
import { EdgeLayers, FaceLayers, riserLayers } from "./layers.ts";
import { type Curve, type CurveId, type CurveParams, type CurveSpec, CurveRegistry } from "./curves.ts";
import { alignClosedPath, dedupeRing, simplifyPath, sweepStations } from "./sweep.ts";

export type { Face, FaceEvent } from "./face-lifecycle.ts";
export type { Edge, EdgeId, FaceId, Vertex, VertexId } from "./topology.ts";
export type { Pt, Pt3 } from "./geom.ts";
export type { PlaneId, PlaneRec } from "./planes.ts";
export type { Image, ImageTable, Seg3 } from "./settle.ts";
export { EDGE_LAYERS, FACE_LAYERS, EdgeLayers, FaceLayers } from "./layers.ts";
export type { Curve, CurveId, CurveKind, CurveParams, CurveSpec } from "./curves.ts";

/** API 取点：z 缺省 = 0（2D 场景/测试直接传 {x,y}）。 */
export interface PtIn { x: number; y: number; z?: number; }
const toPt3 = (p: PtIn): Pt3 => ({ x: p.x, y: p.y, z: p.z ?? 0 });

export interface HitResult { vertex?: VertexId; edge?: EdgeId; face?: FaceId; }

/**
 * 褶边判据（pp 哪条环边让邻膜跟着伸缩）：邻膜平面含推向 ⟺ n_邻·n̂ = 0。
 * 2026-10-23 起与 τ 一致（Claude Fable 5.1，总账 #26 清障）：邻膜被拉伸后环的离面量 = |n_邻·n̂|·|h|，**≤ τ 才算褶边**（拉伸像仍在 τ 内平面），
 * 另有角度上限 CREASE_COS_MAX。此前固定 1e-3 弧度：mm 吸附的斜矩形两面墙差 ~5e-4 弧度，正好骑在门槛上——判成「不是褶边」时长出来的侧壁像
 * 离邻膜平面只有零点几毫米（τ 内）→ 同一张平面上两套边投影互撞 → 邻膜胞腔丢失（旧内核静默 BURST 三张面；fuzz clean 种子 418916）。
 * 判据跟 τ 走之后，「不是褶边」就保证侧壁像离邻膜平面 > τ，不会落进同一张平面。
 */
export const CREASE_COS_MAX = 0.1;

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
  /** 边属性层：名字 → 有标记的边下标（soft / curve / smooth / hidden…；layers.ts）。缺省 = 无。 */
  readonly edgeLayers?: Readonly<Record<string, readonly number[]>>;
  /** 面属性层：名字 → 每面一个整数（与 faces 对齐；−1 = 无）。material = definition 槽号。 */
  readonly faceLayers?: Readonly<Record<string, readonly number[]>>;
  /** 曲线（0.10，契约 §5 brep.curves）：有序边下标 + 种类 + 闭合 + 圆弧参数（本地坐标，米）。缺省 = 无。 */
  readonly curves?: readonly { readonly edges: readonly number[]; readonly kind: "circle" | "arc" | "polyline"; readonly closed: boolean; readonly params?: CurveParams }[];
}

export class Kernel {
  private _graph = new PlanarGraph();
  private store = new FaceStore();
  private eventLog: FaceEvent[] = [];
  private planes = new PlaneRegistry();
  /** 边属性层登记处（soft / curve / smooth / hidden；规则全在 layers.ts）。 */
  edgeLayers = new EdgeLayers();
  /** 面属性层登记处（material = definition 槽号；按事件血缘继承）。 */
  faceLayers = new FaceLayers();
  /** 曲线登记处（0.10）：一串有序边 = 一个实体，可带圆弧参数；结算机经像表钩子维护。 */
  private curveReg = new CurveRegistry();
  /** 池版本号：每个改写动词 +1（渲染 / 合成视图按池缓存的键；#22 池级局部性）。clone 继承当前值（副本从同一代起算）。 */
  private _rev = 0;
  get rev(): number { return this._rev; }
  /** 便利视图：软边集（不画线）/ 曲线成员边集（圆 / 弧近似边，画线；推拉侧棱软）。 */
  get soft(): Set<EdgeId> { return this.edgeLayers.layer("soft"); }
  get curve(): Set<EdgeId> { return this.edgeLayers.layer("curve"); }
  /** coplanarity 容差 τ——头号 UX 旋钮（drill L297）。只管平面分组/归属；几何保持精确共面。 */
  readonly coplanarTol: number;
  /** 结算模式：local = 影响域局部结算（默认）；global = 全平面全膜（差分 oracle 用，结果必须与 local 逐字相同——立宪页 §3「局部性定理」）。 */
  readonly settleMode: "local" | "global";

  constructor(opts?: { coplanarTol?: number; settleMode?: "local" | "global" }) {
    this.coplanarTol = opts?.coplanarTol ?? 1e-3;
    this.settleMode = opts?.settleMode ?? "local";
  }
  private _settle(table: ImageTable): FaceEvent[] {
    return settle(this.graph, this.store, this.planes, this.coplanarTol, { ...table, curves: this.curveReg }, { global: this.settleMode === "global" });
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
    const faceIds: FaceId[] = [];
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
      faceIds.push(face!.id);
    }
    k.store.rebuildFaceLinks(g);
    for (const v of g.vertices()) if (v.edges.size === 0) fail(`vertex ${v.id} is isolated`);
    const edgeIds = g.edges().map((e) => e.id);
    k.edgeLayers = EdgeLayers.fromIndex(snap.edgeLayers, edgeIds, fail);
    k.faceLayers = FaceLayers.fromIndex(snap.faceLayers, faceIds);
    k.curveReg = CurveRegistry.fromIndex(g, snap.curves, edgeIds, fail);
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
    const es = this.graph.edges();
    const fs = this.store.faces();
    const edgeLayers = this.edgeLayers.toIndex(es.map((e) => e.id));
    const faceLayers = this.faceLayers.toIndex(fs.map((f) => f.id));
    const curves = this.curveReg.toIndex(es.map((e) => e.id));
    return {
      coplanarTol: this.coplanarTol,
      vertices: vs.map((v) => ({ x: v.x, y: v.y, z: v.z })),
      edges: es.map((e) => [vIdx.get(e.a)!, vIdx.get(e.b)!] as const),
      planes: planeIds.map((id) => this.planes.rec(id).plane),
      faces: fs.map((f) => ({ plane: pIdx.get(f.planeId)!, outer: ringVids(f.outer), holes: f.holes.map(ringVids) })),
      ...(edgeLayers ? { edgeLayers } : {}),
      ...(faceLayers ? { faceLayers } : {}),
      ...(curves ? { curves } : {}),
    };
  }

  /**
   * 影子副本（preview 架构）：clone → 在副本上跑**同一套** mutation → 渲染 diff → 松手对真身重放。
   * id 计数器一起拷 → 副本上的事件与真身提交的事件逐字相同。
   */
  clone(): Kernel {
    const k = new Kernel({ coplanarTol: this.coplanarTol, settleMode: this.settleMode });
    k._graph = this._graph.clone();
    k.store = this.store.clone();
    k.planes = this.planes.clone();
    k.edgeLayers = this.edgeLayers.clone();
    k.faceLayers = this.faceLayers.clone();
    k.curveReg = this.curveReg.clone();
    k._rev = this._rev;
    return k; // 事件日志不拷：副本的 log 只属于预演
  }

  // ---------------- mutations（全部批量收口；每个动词 = 一张像表） ----------------

  /**
   * 构造手势：一批线段（Rect = 4 段）。opts.layers = 这批线落下的边带哪些边层；
   * opts.curve = 这批线段（按给的顺序）是一条曲线：true = 无参数的闭合折线（旧接口），CurveSpec = 圆 / 弧（0.10）——落下的边带 curve 层并登记成一个实体。
   */
  addEdges(segs: readonly (readonly [PtIn, PtIn])[], opts?: { layers?: readonly string[]; curve?: boolean | CurveSpec }): FaceEvent[] {
    this._rev++;
    const gesture: Seg3[] = segs.map(([a, b]) => ({ a: toPt3(a), b: toPt3(b) }));
    const names = [...(opts?.layers ?? []), ...(opts?.curve ? ["curve"] : [])];
    const layerSegs: Record<string, Seg3[]> = {};
    for (const n of names) layerSegs[n] = gesture;
    // 曲线登记与断点（线切过圆 = 两弧、画线碰到圆周 = 360° 弧、盒底边穿过圆 = 1/4 + 3/4）全在结算机尾声（settle ⑫ / curves.ts rechain），动词只提交规格
    const spec: CurveSpec | undefined = opts?.curve ? (typeof opts.curve === "object" ? opts.curve : { kind: "polyline", closed: true }) : undefined;
    return this.emit(this._settle({ consumed: new Set(), images: [], gesture, edgeLayers: this.edgeLayers, layerSegs, faceLayers: this.faceLayers, ...(spec ? { newCurves: [{ segs: gesture, spec }] } : {}) }));
  }

  /** 擦边：裁决快照以批开始时的环结构为准，再统一删除（删除顺序无关）。擦到曲线的一段 = 整条曲线（SU；0.10）。 */
  eraseEdges(ids: readonly EdgeId[]): FaceEvent[] {
    this._rev++;
    const set = new Set<EdgeId>();
    for (const id of ids) {
      if (!this.graph.hasEdge(id)) continue;
      set.add(id);
      const cid = this.curveReg.curveOf(id);
      if (cid !== undefined) for (const e of this.curveReg.curve(cid)!.edges) if (this.graph.hasEdge(e)) set.add(e);
    }
    const valid = [...set];
    const verdicts = this.store.snapshotEraseVerdicts(valid);
    for (const id of valid) { this.curveReg.onRemove(id); this.graph.removeEdge(id); }
    return this.emit(this.store.reconcileErase(this.graph, this.planes, this.coplanarTol, verdicts));
  }
  /** 炸开曲线（SU Explode Curve）：实体没了，边留着、不再带 curve 层（之后推拉它们的侧棱是硬的）。 */
  explodeCurves(ids: readonly CurveId[]): FaceEvent[] {
    this._rev++;
    for (const id of ids) {
      const c = this.curveReg.curve(id);
      if (!c) continue;
      for (const e of c.edges) this.edgeLayers.delete("curve", e);
      this.curveReg.explode(id);
    }
    return [];
  }

  /** 只删膜不动拓扑（「闭环无面」态；之后 retrace 可复生）。 */
  eraseFaces(ids: readonly FaceId[]): FaceEvent[] {
    this._rev++;
    return this.emit(this.store.eraseFaces(this.graph, ids));
  }

  /**
   * 移动顶点 —— sticky geometry 协议（spec = ai-docs/20260901-move-spec.md）：
   * ① 合并组预判（按**终态**位置分组，撞格 = 合并——绝无幽灵中间态裁决）② 批量刚移（纯坐标）
   * ③ 像表 = 每张被牵连膜的环按新坐标读出（OR、继承自身）→ 结算机（planarize 自愈 / autofold 折 / 认领设面）。
   * 不注入手势 → 永不生膜（守恒律 by construction）。rotate / scale 同走此路（顶点映射不同）。
   */
  moveVertices(moves: readonly { id: VertexId; to: PtIn }[]): FaceEvent[] {
    this._rev++;
    const targets = new Map<VertexId, Pt3>();
    for (const mv of moves) if (this.graph.hasVertex(mv.id)) targets.set(mv.id, quantize3(toPt3(mv.to)));
    const touched = new Set<FaceId>();
    for (const vid of targets.keys()) {
      for (const eid of this.graph.vertex(vid).edges) for (const fid of this.graph.edge(eid).faceLinks) touched.add(fid);
    }
    // ① 合并组：只看被移动的顶点——按终态格点分组，再问格点上有没有不动的既有顶点（vertexAt，O(目标数)，不扫全部顶点；2026-10-23）
    const byFinal = new Map<string, Set<VertexId>>();
    for (const [id, p] of targets) {
      const k = ptKey3(p);
      const group = byFinal.get(k) ?? byFinal.set(k, new Set()).get(k)!;
      group.add(id);
      const ex = this.graph.vertexAt(p);
      if (ex !== undefined && ex !== id && !targets.has(ex)) group.add(ex);
    }
    const merged = new Map<VertexId, VertexId>();
    const plan: { other: VertexId; survivor: VertexId }[] = [];
    for (const group of byFinal.values()) {
      if (group.size < 2) continue;
      const ids = [...group];
      const survivor = ids.find((id) => !targets.has(id)) ?? Math.min(...ids);
      for (const other of ids) if (other !== survivor) plan.push({ other, survivor });
    }
    for (const { other } of plan) for (const eid of this.graph.vertex(other).edges) for (const fid of this.graph.edge(eid).faceLinks) touched.add(fid);
    const snaps = this.store.captureSnaps(this.graph, touched);   // 只拍被牵连的膜（合并前拍：顶点 id 环）
    // 曲线：被挪 / 被合并的顶点所在的曲线——整条曲线的顶点都挪了同一个 δ → 参数平移；否则参数作废（身份留着）
    const deltaOf = new Map<VertexId, Pt3>();
    for (const [id, to] of targets) { const p = this.graph.pt(id); deltaOf.set(id, { x: to.x - p.x, y: to.y - p.y, z: to.z - p.z }); }
    const curveTouched = new Set<CurveId>();
    for (const vid of [...targets.keys(), ...plan.map((p) => p.other)]) for (const eid of this.graph.vertex(vid).edges) { const cid = this.curveReg.curveOf(eid); if (cid !== undefined) curveTouched.add(cid); }
    const curveVerts = new Map<CurveId, Set<VertexId>>();
    for (const cid of curveTouched) { const vs = new Set<VertexId>(); for (const e of this.curveReg.curve(cid)!.edges) { const x = this.graph.edge(e); vs.add(x.a); vs.add(x.b); } curveVerts.set(cid, vs); }
    for (const { other, survivor } of plan) {
      merged.set(other, survivor);
      this.absorbVertex(other, survivor);
      targets.delete(other);
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
    // 局部性：动过坐标的顶点（含合并幸存者）的邻边 = 脏边，结算机只围绕它们自愈 / 认领
    const dirtyEdges = new Set<EdgeId>();
    for (const { id } of batch) if (this.graph.hasVertex(id)) for (const eid of this.graph.vertex(id).edges) dirtyEdges.add(eid);
    for (const sv of new Set(merged.values())) if (this.graph.hasVertex(sv)) for (const eid of this.graph.vertex(sv).edges) dirtyEdges.add(eid);
    const events = this.emit(this._settle({ consumed: touched, images, edgeLayers: this.edgeLayers, faceLayers: this.faceLayers, dirtyEdges }));
    for (const [cid, vs] of curveVerts) {
      const c = this.curveReg.curve(cid);
      if (!c) continue;
      let delta: Pt3 | undefined, rigid = merged.size === 0;
      for (const v of vs) { const d = deltaOf.get(v); if (!d) { rigid = false; break; } if (!delta) delta = d; else if (!samePt3(quantize3(d), quantize3(delta))) { rigid = false; break; } }
      if (rigid && delta && c.params) this.curveReg.setParams(cid, c.kind, { ...c.params, center: add3(c.params.center, delta) });
      else this.curveReg.invalidate(cid);
    }
    return events;
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
    this._rev++;
    const settleLanding = opts?.settleLanding !== false;
    const f = this.store.face(id);
    if (!f) return [];
    if (Math.abs(dist) < 1e-6) return [];
    const g = this.graph;
    const n = this.planes.rec(f.planeId).plane.n;
    const delta = scale3(n, dist);
    const parallel = (gid: FaceId): boolean => {
      const other = this.store.face(gid);
      if (!other) return true;
      const c = Math.abs(dot3(this.planes.rec(other.planeId).plane.n, n));
      return c <= CREASE_COS_MAX && c * Math.abs(dist) <= this.coplanarTol;   // 拉伸后离面量 ≤ τ 才褶
    };
    const consumed = new Set<FaceId>([id]);
    const images: Image[] = [];
    images.push({ rings: translateImage(ringsOf(g, f), delta), algebra: settleLanding ? "xor" : "or", inherit: id });
    const rewrite = new Map<FaceId, Set<EdgeId>>();
    // 边层推拉策略（layers.ts EDGE_LAYER_POLICY）：帽边继承原边的全部层；侧棱按表（soft / curve / smooth → 侧棱 soft+smooth）
    const layerSegs: Record<string, Seg3[]> = {};
    const push = (n: string, sg: Seg3): void => { (layerSegs[n] ?? (layerSegs[n] = [])).push(sg); };
    let anyBare = false;
    for (const ring of [f.outer, ...f.holes]) {
      const ringLayers = ring.edges.map((d) => this.edgeLayers.of(d.edge));
      ring.edges.forEach((d, j) => {
        const e = g.edge(d.edge);
        const a = g.pt(d.forward ? e.a : e.b);
        // 顶点 a 的侧棱：两侧环边（j−1、j）都带策略层才软（layers.ts riserLayers）
        for (const R of riserLayers(ringLayers[(j + ring.edges.length - 1) % ring.edges.length], ringLayers[j])) push(R, { a, b: add3(a, delta) });
      });
      for (const d of ring.edges) {
        const e = g.edge(d.edge);
        const a = g.pt(d.forward ? e.a : e.b), b = g.pt(d.forward ? e.b : e.a);
        const others = e.faceLinks.filter((x) => x !== id);
        for (const L of this.edgeLayers.of(e.id)) push(L, { a: add3(a, delta), b: add3(b, delta) });
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
    // 曲线：环上的曲线随帽平移成**新曲线**（圆心 + δ；SU 推拉圆柱顶圈仍是 Circle）——帽边继承层那条规则的实体版
    const capCurves: { segs: Seg3[]; spec: CurveSpec }[] = [];
    {
      const seen = new Set<CurveId>();
      for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
        const cid = this.curveReg.curveOf(d.edge);
        if (cid === undefined || seen.has(cid)) continue;
        seen.add(cid);
        const c = this.curveReg.curve(cid)!;
        const segs: Seg3[] = c.edges.filter((e) => g.hasEdge(e)).map((e) => { const x = g.edge(e); return { a: add3(g.pt(x.a), delta), b: add3(g.pt(x.b), delta) }; });
        capCurves.push({ segs, spec: { kind: c.kind, closed: c.closed, ...(c.params ? { params: { ...c.params, center: add3(c.params.center, delta) } } : {}) } });
      }
    }
    return this.emit(this._settle({ consumed, images, buryOrphans: true, edgeLayers: this.edgeLayers, layerSegs, faceLayers: this.faceLayers, newCurves: capCurves }));
  }

  /**
   * 跟随（SU Follow Me）—— 轮廓面 id 沿折线 path 扫掠（几何 = sweep.ts 斜切投影），像表提交规则（2026-10-21，Claude Fable 5.1）：
   *   · 扫出的全部面（侧面 + 开路径的两端帽）一律 **XOR**：与既有膜重合的部分成对湮灭 = 沿实体的棱倒角时顶条 / 侧条自动消失（SU 同款）；
   *     按体积说 = 模型 △ 扫掠体（∂(B △ S) = ∂B △ ∂S），倒角 = 减、接管 = 加，一句话。
   *   · 轮廓面**依附**于别的膜（任一环边有第二张膜）→ 它是模型表面的一部分，留在表里参加 XOR（开路径的起始帽与它湮灭 = 棱的起点也切掉）；
   *     **孤立**轮廓面（画在空中的圆 / 方）→ 出库，开路径时起始帽继承它的身份（= 推拉的底帽），闭路径不留横截面。
   *   · 闭路径 + 依附轮廓面没被扫到（扫掠体没盖住它）→ 结算后它还在 → 当横截面删掉（SU：闭路径删起始面）。
   *   · 层：路径关节两侧都是曲线成员（圆 / 弧路径）→ 该站环边 soft+smooth（旋转体侧面光滑）；否则站环边继承轮廓边的层（圆轮廓的拐角圈 = curve 画黑边）；
   *     沿扫掠方向的棱按 riserLayers（圆弧内部顶点软、端点硬）；开路径末帽继承轮廓边的层。
   * 预检用 sweepStations（编辑器选取向 / 起点时已跑过）；这里失败就 throw，commitOp 回滚。
   */
  followMe(id: FaceId, pathIn: readonly Pt3[], opts: { closed: boolean; smoothJoints?: readonly boolean[] }): FaceEvent[] {
    this._rev++;
    const f = this.store.face(id);
    if (!f) return [];
    const g = this.graph;
    const rings = ringsOf(g, f);
    const simp = simplifyPath(pathIn, opts.closed, opts.smoothJoints);   // 共线关节不设站
    const { path, smoothJoints } = opts.closed ? alignClosedPath(rings, simp.path, simp.smoothJoints) : simp;   // 闭路径：第 0 段横穿轮廓平面（环起点任意）
    const st = sweepStations(rings, path, opts.closed);
    if (typeof st === "string") throw new Error(`followMe: ${st}`);
    const ringEdges = [f.outer, ...f.holes].map((r) => r.edges.map((d) => d.edge));
    const ringLayers = ringEdges.map((es) => es.map((e) => this.edgeLayers.of(e)));
    const attached = ringEdges.some((es) => es.some((e) => g.edge(e).faceLinks.length >= 2));
    const nSt = st.length, segs = opts.closed ? nSt : nSt - 1;
    const smooth = (i: number): boolean => !!smoothJoints?.[i];
    const images: Image[] = [];
    const layerSegs: Record<string, Seg3[]> = {};
    const push = (n: string, sg: Seg3): void => { (layerSegs[n] ?? (layerSegs[n] = [])).push(sg); };
    for (let i = 0; i < segs; i++) {
      const A = st[i], B = st[(i + 1) % nSt];
      for (let r = 0; r < A.length; r++) {
        const m = A[r].length;
        for (let j = 0; j < m; j++) {
          const quad = dedupeRing([A[r][j], A[r][(j + 1) % m], B[r][(j + 1) % m], B[r][j]]);
          if (quad.length) images.push({ rings: [quad], algebra: "xor" });
          for (const R of riserLayers(ringLayers[r][(j + m - 1) % m], ringLayers[r][j])) push(R, { a: A[r][j], b: B[r][j] });
        }
      }
    }
    // 站环的层：关节（闭路径全部站；开路径中间站）平滑 → soft+smooth，否则继承；开路径末帽继承
    const jointStations = opts.closed ? [...Array(nSt).keys()] : [...Array(Math.max(0, nSt - 2)).keys()].map((i) => i + 1);
    for (const i of jointStations) for (let r = 0; r < st[i].length; r++) { const m = st[i][r].length; for (let j = 0; j < m; j++) { const sg = { a: st[i][r][j], b: st[i][r][(j + 1) % m] }; if (smooth(i)) { push("soft", sg); push("smooth", sg); } else for (const L of ringLayers[r][j]) push(L, sg); } }
    const consumed = new Set<FaceId>();
    if (!opts.closed) {
      images.push({ rings: rings.map((r) => r.map((p) => ({ ...p }))), algebra: "xor", ...(attached ? {} : { inherit: id }) });
      const E = st[nSt - 1];
      images.push({ rings: E.map((r) => r.map((p) => ({ ...p }))), algebra: "xor" });
      for (let r = 0; r < E.length; r++) { const m = E[r].length; for (let j = 0; j < m; j++) for (const L of ringLayers[r][j]) push(L, { a: E[r][j], b: E[r][(j + 1) % m] }); }
    }
    if (!attached) consumed.add(id);
    // 曲线：轮廓环上的曲线在每一站的圈上各成一条（斜切投影不保圆 → polyline，只留身份；开路径末帽同）
    const stationCurves: { segs: Seg3[]; spec: CurveSpec }[] = [];
    for (let r = 0; r < ringEdges.length; r++) {
      const m = ringEdges[r].length;
      const runs = new Map<CurveId, number[]>();
      ringEdges[r].forEach((e, j) => { const cid = this.curveReg.curveOf(e); if (cid !== undefined) (runs.get(cid) ?? runs.set(cid, []).get(cid)!).push(j); });
      for (const [cid, js] of runs) {
        const cv = this.curveReg.curve(cid)!;
        const whole = js.length === m && cv.closed;
        // 单段直路径（开）：末站 = 轮廓整体平移 → 圆保圆（圆心 + 路径向量）；其余站（斜切）只留身份
        const straight = !opts.closed && path.length === 2;
        st.forEach((S, i) => {
          if (!opts.closed && i === 0) return;   // 起始帽 = 轮廓自己（身份像承继），曲线原地不动
          const ring = S[r];
          const segs: Seg3[] = js.map((j) => ({ a: ring[j], b: ring[(j + 1) % m] })).filter((sg) => dist3(sg.a, sg.b) > 1e-9);
          if (!segs.length) return;
          const rigid = straight && i === nSt - 1 && whole && cv.kind === "circle" && cv.params;
          stationCurves.push({ segs, spec: rigid ? { kind: "circle", closed: true, params: { ...cv.params!, center: add3(cv.params!.center, sub3(path[1], path[0])) } } : { kind: "polyline", closed: whole } });
        });
      }
    }
    const events = this.emit(this._settle({ consumed, images, buryOrphans: true, edgeLayers: this.edgeLayers, layerSegs, faceLayers: this.faceLayers, newCurves: stationCurves }));
    if (opts.closed && attached && this.store.face(id)) events.push(...this.eraseFaces([id]));
    return events;
  }

  /**
   * 吸收外来几何（炸开 group / 粘贴 / 导入）：膜当像（OR、新 id）、裸边当线段，走结算机——与既有几何 sticky（切割 / 合并 / 共面 dedup）。
   * added 2026-10-21 by Claude Fable 5.1（group / component 纪元）
   */
  absorb(faces: readonly (readonly (readonly Pt3[])[])[], wires: readonly Seg3[], opts?: { edgeSegs?: Readonly<Record<string, readonly Seg3[]>>; faceLayers?: readonly (Readonly<Record<string, number>> | undefined)[]; curves?: readonly { segs: readonly Seg3[]; spec: CurveSpec }[] }): FaceEvent[] {
    this._rev++;
    const images: Image[] = faces.map((rings, i) => ({ rings: rings.map((r) => r.map((p) => ({ x: p.x, y: p.y, z: p.z }))), algebra: "or", ...(opts?.faceLayers?.[i] ? { face: opts.faceLayers[i] } : {}) }));
    return this.emit(this._settle({ consumed: new Set(), images, wires, edgeLayers: this.edgeLayers, layerSegs: opts?.edgeSegs, faceLayers: this.faceLayers, newCurves: opts?.curves }));
  }

  /** 全池变换（group 整体 move / rotate / scale）：全部顶点按 fn 映射，走 moveVertices（仿射保平面，planarize 无事）。曲线参数按 fn 重算：相似变换保圆，非均匀缩放 → polyline。 */
  transformAll(fn: (p: Pt3) => Pt3): FaceEvent[] {
    this._rev++;
    const before = this.curveReg.curves().filter((c) => c.params).map((c) => ({ id: c.id, kind: c.kind, params: { ...c.params! } }));
    const events = this.moveVertices(this.graph.vertices().map((v) => ({ id: v.id, to: fn({ x: v.x, y: v.y, z: v.z }) })));
    for (const b of before) {
      if (!this.curveReg.curve(b.id)) continue;
      const p = b.params, c0 = fn(p.center);
      const dir = (d: Pt3): Pt3 => sub3(fn(add3(p.center, d)), c0);
      const yax = normalize3(cross3(p.normal, p.xaxis));
      const rx = dist3(fn(add3(p.center, scale3(p.xaxis, p.radius))), c0), ry = dist3(fn(add3(p.center, scale3(yax, p.radius))), c0);
      if (Math.abs(rx - ry) > 1e-6 * Math.max(rx, ry, 1e-9) || rx < 1e-9) { this.curveReg.invalidate(b.id); continue; }
      this.curveReg.setParams(b.id, b.kind, { center: c0, radius: rx, normal: normalize3(dir(p.normal)), xaxis: normalize3(dir(p.xaxis)), segments: p.segments });
    }
    return events;
  }

  // ---------------- queries ----------------

  vertices(): Vertex[] { return this.graph.vertices(); }
  edges(): Edge[] { return this.graph.edges(); }
  isSoft(id: EdgeId): boolean { return this.soft.has(id); }
  isCurve(id: EdgeId): boolean { return this.curve.has(id); }
  isSmooth(id: EdgeId): boolean { return this.edgeLayers.has("smooth", id); }
  /** 两膜之间的边的二面角（度）；不是恰好两膜 → null。软化工具按角度阈值用。 */
  dihedralDeg(id: EdgeId): number | null {
    const e = this.graph.edge(id);
    const fl = [...new Set(e.faceLinks)];
    if (fl.length !== 2) return null;
    const a = this.planeOf(fl[0]), b = this.planeOf(fl[1]);
    if (!a || !b) return null;
    const c = Math.min(1, Math.abs(dot3(a.plane.n, b.plane.n)));
    return (Math.acos(c) * 180) / Math.PI;
  }
  /** GeomView 契约：裸内核不知道材质表（槽号在 faceMat），渲染单内核时一律默认。 */
  faceMaterial(_id: FaceId): null { return null; }
  faces(): Face[] { return this.store.faces(); }
  face(id: FaceId): Face | undefined { return this.store.face(id); }
  /** 曲线实体（0.10）：全部 / 按 id / 这条边属于哪条。 */
  curves(): Curve[] { return this.curveReg.curves(); }
  curveById(id: CurveId): Curve | undefined { return this.curveReg.curve(id); }
  curveOf(edge: EdgeId): CurveId | undefined { return this.curveReg.curveOf(edge); }
  /** 曲线自洽校验（fuzz / 测试）：边存在、链相邻共顶点、每边至多一条、闭合首尾相接；空 = 好。 */
  curveProblems(): string[] { return this.curveReg.validate(this.graph); }
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

  /** 涂材质（槽号；null = 回默认）。 */
  setFaceMaterial(ids: readonly FaceId[], slot: number | null): void {
    this._rev++;
    for (const id of ids) { if (!this.store.face(id)) continue; if (slot === null) this.faceLayers.delete("material", id); else this.faceLayers.set("material", id, slot); }
  }
  faceMaterialOf(id: FaceId): number | undefined { return this.faceLayers.get("material", id); }
  /** 给一批边打 / 去一个边层（软化 / 硬化工具）。 */
  setEdgeLayer(name: string, ids: readonly EdgeId[], on: boolean): void {
    this._rev++;
    for (const id of ids) { if (!this.graph.hasEdge(id)) continue; if (on) this.edgeLayers.add(name, id); else this.edgeLayers.delete(name, id); }
  }

  private emit(events: FaceEvent[]): FaceEvent[] {
    this.eventLog.push(...events);
    this.faceLayers.applyEvents(events);           // 面层跟着血缘走（layers.ts）
    this.faceLayers.prune((id) => !!this.store.face(id));
    this.edgeLayers.prune((id) => this.graph.hasEdge(id));
    this.curveReg.prune(this.graph);
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
        this.edgeLayers.copy(eid, ne);
        this.curveReg.copy(eid, ne);
      }
      this.edgeLayers.onRemove(eid);
      this.curveReg.onRemove(eid);
      this.graph.removeEdge(eid);
    }
  }
}

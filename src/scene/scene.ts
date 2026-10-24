// scene.ts —— 场景模型：definition（component 定义 = 自己的几何池 + 嵌套 group + 实例）/ group（sticky 隔离域 + 轴框，顶点烘在所在
// definition 的坐标里）/ instance（definition + 变换 = ECS entity 形状）。
// 本体论（user 2026-09-06/07，far-horizon §1 / §3.2）：group 不是 object——「同一个 mesh 上的编辑时上下文」，只是把「谁和谁粘」的判定域
// 隔开（立宪 A3 的 context 槽 = 每个 group 自己一个 Kernel 池，重合即同一只在池内成立）+ 一个轴框；渲染时就是三角汤。
// component = object：定义 + 实例，实例只有变换 + 引用 + 覆盖，不能单独改形状（Make Unique 才能）。
// 运行时 id（DefId / GroupId / InstId）由本类顺序铸造：op 日志重放同序列 → 同 id（与顶点 µm 寻址同理，联机也成立）。
// created 2026-10-21 by Claude Fable 5.1（group / component 纪元；user「supersprint where at least i have groups and components」）

import { add3, sub3, scale3, dist3, normalize3, cross3 } from "../kernel/geom.ts";
import { Kernel, type BrepSnapshot, type EdgeId, type FaceId, type Pt3, type Seg3 } from "../kernel/kernel.ts";
import { type Frame, type Xform, IDENTITY, WORLD_FRAME, applyPlane, applyPt, compose, frameAt, transformFrame } from "./xform.ts";
import { type Guides, cloneGuides, emptyGuides } from "./guides.ts";

export type DefId = number;
export type GroupId = number;
export type InstId = number;

/** 材质（文档级，= glTF core material）：颜色（sRGB 0..1）+ 可选贴图（原图字节 + 物理尺寸 米）。只增不删（面按索引引用）。 */
export interface Material {
  readonly name: string;
  readonly color: readonly [number, number, number];
  readonly texture?: { readonly mimeType: string; readonly bytes: Uint8Array; readonly sizeM: readonly [number, number] };
}
export interface Group { readonly id: GroupId; parent: GroupId | null; axes: Frame; kernel: Kernel; name?: string; /** 参考几何（0.11；本 definition 坐标）。 */ guides: Guides; }
export interface Instance { readonly id: InstId; def: DefId; parent: GroupId | null; xform: Xform; name?: string; }
export interface Definition {
  readonly id: DefId;
  name: string;
  kernel: Kernel;                       // 根池（不在任何 group 里的几何）
  groups: Map<GroupId, Group>;
  instances: Map<InstId, Instance>;
  nextGroup: number;
  nextInst: number;
  /** 材质槽：槽号 → 文档材质索引（契约 §5.3；面存槽号，实例可重映射——重映射未做）。 */
  materialSlots: number[];
  /** 根池的参考几何（0.11；definition 坐标）。group 的在 Group.guides。 */
  guides: Guides;
}

/** 几何池地址 = (definition, group | null)。 */
export interface PoolRef { def: DefId; group: GroupId | null; }
export const poolKey = (p: PoolRef): string => `${p.def}/${p.group ?? "root"}`;
export const samePool = (a: PoolRef, b: PoolRef): boolean => a.def === b.def && a.group === b.group;

/** 编辑上下文：从根 definition 进了哪些实例（链）+ 当前在哪个 group 里。运行时态，不落盘、不进 op。 */
export interface EditContext { chain: readonly InstId[]; group: GroupId | null; }
export const ROOT_CONTEXT: EditContext = { chain: [], group: null };

export class Scene {
  readonly defs = new Map<DefId, Definition>();
  readonly root: DefId;
  /** 文档材质表（只增）。 */
  readonly materials: Material[] = [];
  /** 绘图轴（0.11 尺规纪元）：根上下文的轴，世界坐标；轴工具可搬 / 转，默认 = 世界帧。进 CATSUP_document.axes。 */
  axes: Frame = WORLD_FRAME;
  private nextDef = 1;

  constructor(rootKernel?: Kernel) {
    this.root = this.mintDef("model", rootKernel ?? new Kernel()).id;
  }

  // ---------- 铸造 ----------
  mintDef(name: string, kernel: Kernel): Definition {
    const d: Definition = { id: this.nextDef++, name, kernel, groups: new Map(), instances: new Map(), nextGroup: 1, nextInst: 1, materialSlots: [], guides: emptyGuides() };
    this.defs.set(d.id, d);
    return d;
  }
  mintGroup(defId: DefId, parent: GroupId | null, kernel: Kernel, axes: Frame): Group {
    const d = this.def(defId);
    const g: Group = { id: d.nextGroup++, parent, axes, kernel, guides: emptyGuides() };
    d.groups.set(g.id, g);
    return g;
  }
  mintInstance(defId: DefId, parent: GroupId | null, target: DefId, xform: Xform): Instance {
    const d = this.def(defId);
    const inst: Instance = { id: d.nextInst++, def: target, parent, xform };
    d.instances.set(inst.id, inst);
    return inst;
  }

  /** 材质在某 definition 里的槽号（没有就开一个）。 */
  slotFor(defId: DefId, material: number): number {
    const d = this.def(defId);
    const i = d.materialSlots.indexOf(material);
    if (i >= 0) return i;
    d.materialSlots.push(material);
    return d.materialSlots.length - 1;
  }
  /** 槽号 → 材质（无 / 越界 = null）。 */
  materialOfSlot(defId: DefId, slot: number | undefined): Material | null {
    if (slot === undefined) return null;
    const idx = this.def(defId).materialSlots[slot];
    return idx === undefined ? null : (this.materials[idx] ?? null);
  }
  addMaterial(m: Material): number { this.materials.push(m); return this.materials.length - 1; }

  // ---------- 查 ----------
  def(id: DefId): Definition {
    const d = this.defs.get(id);
    if (!d) throw new Error(`definition ${id} does not exist`);
    return d;
  }
  group(ref: { def: DefId; group: GroupId }): Group {
    const g = this.def(ref.def).groups.get(ref.group);
    if (!g) throw new Error(`group ${ref.group} does not exist in definition ${ref.def}`);
    return g;
  }
  instance(defId: DefId, id: InstId): Instance {
    const inst = this.def(defId).instances.get(id);
    if (!inst) throw new Error(`instance ${id} does not exist in definition ${defId}`);
    return inst;
  }
  kernelOf(p: PoolRef): Kernel { return p.group === null ? this.def(p.def).kernel : this.group({ def: p.def, group: p.group }).kernel; }
  hasPool(p: PoolRef): boolean { const d = this.defs.get(p.def); return !!d && (p.group === null || d.groups.has(p.group)); }

  /** 上下文的 definition（链末实例的定义；空链 = 根）。 */
  defOfContext(ctx: EditContext): DefId {
    let def = this.root;
    for (const iid of ctx.chain) def = this.instance(def, iid).def;
    return def;
  }
  poolOfContext(ctx: EditContext): PoolRef { return { def: this.defOfContext(ctx), group: ctx.group }; }
  /** 池的参考几何（可变引用；池本地坐标）。 */
  guidesOf(ref: PoolRef): Guides { return ref.group !== null ? this.group({ def: ref.def, group: ref.group }).guides : this.def(ref.def).guides; }
  /**
   * 上下文的帧（世界坐标）= 推断引擎的「纸的边」（0.11 尺规纪元 ①）：根 = 绘图轴；进了 group = 那个 group 的轴；
   * 进了组件实例 = 那个 definition 的轴（= 单位帧，组件的轴工具未做）——都乘上链上的实例变换。
   */
  frameOfContext(ctx: EditContext): Frame {
    const m = this.xformOfContext(ctx);
    if (ctx.group !== null) return transformFrame(m, this.group({ def: this.defOfContext(ctx), group: ctx.group }).axes);
    if (!ctx.chain.length) return this.axes;
    return transformFrame(m, WORLD_FRAME);
  }
  /** 上下文的世界变换（链上实例变换的乘积；group 不带变换）。 */
  xformOfContext(ctx: EditContext): Xform {
    let def = this.root, m: Xform = IDENTITY;
    for (const iid of ctx.chain) { const inst = this.instance(def, iid); m = compose(m, inst.xform); def = inst.def; }
    return m;
  }
  /** group 的子 group / 子实例（同一 definition 内，按 parent 链）。 */
  childGroups(defId: DefId, parent: GroupId | null): Group[] { return [...this.def(defId).groups.values()].filter((g) => g.parent === parent); }
  childInstances(defId: DefId, parent: GroupId | null): Instance[] { return [...this.def(defId).instances.values()].filter((i) => i.parent === parent); }
  /** definition 是否（直接或间接）引用 target——防循环引用。 */
  references(defId: DefId, target: DefId, seen = new Set<DefId>()): boolean {
    if (defId === target) return true;
    if (seen.has(defId)) return false;
    seen.add(defId);
    for (const inst of this.def(defId).instances.values()) if (this.references(inst.def, target, seen)) return true;
    return false;
  }
  /** 某 definition 的实例总数（跨所有 definition）。 */
  instanceCount(target: DefId): number {
    let n = 0;
    for (const d of this.defs.values()) for (const inst of d.instances.values()) if (inst.def === target) n++;
    return n;
  }

  /** 全场景的「池 + 世界变换」展开（渲染 / 拾取 / 吸附的输入；嵌套实例递归；深度上限防循环）。 */
  *pools(ctx: EditContext = ROOT_CONTEXT, opts?: { into?: EditContext }): Generator<{ pool: PoolRef; xform: Xform; chain: readonly InstId[]; depth: number }> {
    const walk = function* (this: Scene, def: DefId, chain: readonly InstId[], xform: Xform, depth: number): Generator<{ pool: PoolRef; xform: Xform; chain: readonly InstId[]; depth: number }> {
      if (depth > 32) return;
      const d = this.def(def);
      yield { pool: { def, group: null }, xform, chain, depth };
      for (const g of d.groups.values()) yield { pool: { def, group: g.id }, xform, chain, depth };
      for (const inst of d.instances.values()) yield* walk.call(this, inst.def, [...chain, inst.id], compose(xform, inst.xform), depth + 1);
    };
    void ctx; void opts;
    yield* walk.call(this, this.root, [], IDENTITY, 0);
  }

  // ---------- 深拷贝 ----------
  clone(): Scene {
    const s = Object.create(Scene.prototype) as Scene;
    (s as { defs: Map<DefId, Definition> }).defs = new Map();
    (s as { root: DefId }).root = this.root;
    (s as unknown as { nextDef: number }).nextDef = this.nextDef;
    (s as { materials: Material[] }).materials = [...this.materials];   // 材质对象不可变，浅拷安全
    s.axes = { origin: { ...this.axes.origin }, x: { ...this.axes.x }, y: { ...this.axes.y }, z: { ...this.axes.z } };
    for (const [id, d] of this.defs) {
      const groups = new Map<GroupId, Group>();
      for (const [gid, g] of d.groups) groups.set(gid, { id: g.id, parent: g.parent, axes: g.axes, kernel: g.kernel.clone(), guides: cloneGuides(g.guides), ...(g.name !== undefined ? { name: g.name } : {}) });
      const instances = new Map<InstId, Instance>();
      for (const [iid, i] of d.instances) instances.set(iid, { id: i.id, def: i.def, parent: i.parent, xform: i.xform, ...(i.name !== undefined ? { name: i.name } : {}) });
      s.defs.set(id, { id: d.id, name: d.name, kernel: d.kernel.clone(), groups, instances, nextGroup: d.nextGroup, nextInst: d.nextInst, materialSlots: [...d.materialSlots], guides: cloneGuides(d.guides) });
    }
    return s;
  }
}

// ---------------- 几何搬家（建组 / 建组件 / 炸开的底层） ----------------

/** 从池里抠出一份子快照：选中的膜（含其环边）+ 选中的边（含端点）。索引 = 本地顺序。 */
export function extractSnapshot(k: Kernel, faces: readonly FaceId[], edges: readonly EdgeId[]): BrepSnapshot {
  const vIdx = new Map<number, number>();
  const vertices: Pt3[] = [];
  const vid = (id: number): number => {
    let i = vIdx.get(id);
    if (i === undefined) { i = vertices.length; vIdx.set(id, i); vertices.push(k.graph.pt(id)); }
    return i;
  };
  const edgeSet = new Set<EdgeId>(edges);
  const planeIdx = new Map<number, number>();
  const planes: { n: Pt3; d: number }[] = [];
  const outFaces: { plane: number; outer: number[]; holes: number[][] }[] = [];
  const faceIds: FaceId[] = [];
  for (const fid of faces) {
    const f = k.face(fid);
    const rec = k.planeOf(fid);
    if (!f || !rec) continue;
    let pi = planeIdx.get(f.planeId);
    if (pi === undefined) { pi = planes.length; planeIdx.set(f.planeId, pi); planes.push(rec.plane); }
    const ring = (r: { edges: { edge: EdgeId; forward: boolean }[] }): number[] => r.edges.map((d) => { edgeSet.add(d.edge); const e = k.graph.edge(d.edge); return vid(d.forward ? e.a : e.b); });
    outFaces.push({ plane: pi, outer: ring(f.outer), holes: f.holes.map(ring) });
    faceIds.push(fid);
  }
  const outEdges: [number, number][] = [];
  const edgeIds: EdgeId[] = [];
  for (const eid of edgeSet) {
    if (!k.graph.hasEdge(eid)) continue;
    const e = k.graph.edge(eid);
    edgeIds.push(eid);
    outEdges.push([vid(e.a), vid(e.b)]);
  }
  const edgeLayers = k.edgeLayers.toIndex(edgeIds), faceLayers = k.faceLayers.toIndex(faceIds);
  return { coplanarTol: k.coplanarTol, vertices, edges: outEdges, planes, faces: outFaces, ...(edgeLayers ? { edgeLayers } : {}), ...(faceLayers ? { faceLayers } : {}) };
}

/** 快照整体变换（坐标 + 平面）。 */
export function transformSnapshot(snap: BrepSnapshot, m: Xform): BrepSnapshot {
  return { coplanarTol: snap.coplanarTol, vertices: snap.vertices.map((p) => applyPt(m, p)), edges: snap.edges, planes: snap.planes.map((pl) => applyPlane(m, pl)), faces: snap.faces, ...(snap.edgeLayers ? { edgeLayers: snap.edgeLayers } : {}), ...(snap.faceLayers ? { faceLayers: snap.faceLayers } : {}) };
}

/** 把一份快照（经变换）并进池：膜当像（OR、新 id）、裸边当线段，走结算机（sticky）。炸开 / 粘贴用。
 *  materialMap：快照的槽号 → 目标池 definition 的槽号（跨 definition 搬家时重映射；缺省恒等）。 */
export function absorbSnapshot(k: Kernel, snap: BrepSnapshot, m: Xform = IDENTITY, materialMap?: (slot: number) => number): void {
  const P = snap.vertices.map((p) => applyPt(m, p));
  const faces = snap.faces.map((f) => [f.outer.map((i) => P[i]), ...f.holes.map((h) => h.map((i) => P[i]))]);
  const inFace = new Set<string>();
  for (const f of snap.faces) for (const r of [f.outer, ...f.holes]) for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; inFace.add(a < b ? `${a}-${b}` : `${b}-${a}`); }
  const wires = snap.edges.filter(([a, b]) => !inFace.has(a < b ? `${a}-${b}` : `${b}-${a}`)).map(([a, b]) => ({ a: P[a], b: P[b] }));
  // 曲线随行（0.10）：边链按变换后的点给线段；参数用两点之差换方向、半径按变换后距离（非相似 → 作废成 polyline）
  const curves = (snap.curves ?? []).map((c) => {
    const segs = c.edges.map((i) => ({ a: P[snap.edges[i][0]], b: P[snap.edges[i][1]] }));
    let params = c.params ? { ...c.params } : undefined;
    let kind = c.kind;
    if (params) {
      const c0 = applyPt(m, params.center);
      const dir = (d: Pt3): Pt3 => normalize3(sub3(applyPt(m, add3(params!.center, d)), c0));
      const yax = normalize3(cross3(params.normal, params.xaxis));
      const rx = dist3(applyPt(m, add3(params.center, scale3(normalize3(params.xaxis), params.radius))), c0), ry = dist3(applyPt(m, add3(params.center, scale3(yax, params.radius))), c0);
      if (Math.abs(rx - ry) > 1e-6 * Math.max(rx, ry, 1e-9) || rx < 1e-9) { params = undefined; kind = "polyline"; }
      else params = { center: c0, radius: rx, normal: dir(params.normal), xaxis: dir(params.xaxis), segments: params.segments };
    }
    return { segs, spec: { kind, closed: c.closed, ...(params ? { params } : {}) } };
  });
  k.absorb(faces, wires, { ...snapshotLayerPayload(snap, P, materialMap), curves });
}

/** 快照的属性层 → absorb 载荷（边层按线段、面层按每面值；material 可重映射）。 */
export function snapshotLayerPayload(snap: BrepSnapshot, P: readonly Pt3[], materialMap?: (slot: number) => number): { edgeSegs: Record<string, Seg3[]>; faceLayers: (Record<string, number> | undefined)[] } {
  const edgeSegs: Record<string, Seg3[]> = {};
  for (const [n, idx] of Object.entries(snap.edgeLayers ?? {})) edgeSegs[n] = idx.map((i) => ({ a: P[snap.edges[i][0]], b: P[snap.edges[i][1]] }));
  const faceLayers = snap.faces.map((_, i) => {
    const vals: Record<string, number> = {};
    for (const [n, arr] of Object.entries(snap.faceLayers ?? {})) { let v = arr[i] ?? -1; if (v >= 0 && n === "material" && materialMap) v = materialMap(v); if (v >= 0) vals[n] = v; }
    return Object.keys(vals).length ? vals : undefined;
  });
  return { edgeSegs, faceLayers };
}
/** 快照里 material 面层按映射改写（跨 definition 搬家）。 */
export function remapSnapshotMaterial(snap: BrepSnapshot, remap: (slot: number) => number): BrepSnapshot {
  const mat = snap.faceLayers?.material;
  if (!mat) return snap;
  return { ...snap, faceLayers: { ...snap.faceLayers, material: mat.map((v) => (v >= 0 ? remap(v) : -1)) } };
}

/** 轴框默认：选区包围盒的最小角（SU 把组件轴放在包围盒角）。 */
export function bboxMin(pts: readonly Pt3[]): Pt3 {
  let x = Infinity, y = Infinity, z = Infinity;
  for (const p of pts) { x = Math.min(x, p.x); y = Math.min(y, p.y); z = Math.min(z, p.z); }
  return pts.length ? { x, y, z } : { x: 0, y: 0, z: 0 };
}
export function poolBounds(k: Kernel, m: Xform = IDENTITY): { min: Pt3; max: Pt3 } | null {
  let min = { x: Infinity, y: Infinity, z: Infinity }, max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const v of k.vertices()) {
    const p = applyPt(m, v);
    min = { x: Math.min(min.x, p.x), y: Math.min(min.y, p.y), z: Math.min(min.z, p.z) };
    max = { x: Math.max(max.x, p.x), y: Math.max(max.y, p.y), z: Math.max(max.z, p.z) };
  }
  return Number.isFinite(min.x) ? { min, max } : null;
}
export { WORLD_FRAME, frameAt, transformFrame };

// world-view.ts —— 把场景所有几何池变换到世界坐标、合成一份**只读**几何视图（GeomView），给渲染 / 拾取 / 吸附用。
// 求解器 / 拾取 / 渲染只认 GeomView（Kernel 结构上就是一个 GeomView）；id 全局化 = 池序号 × ID_STRIDE + 本地 id，
// `local(gid)` 反查回池。活动池可被「影子副本」替换（手势预演）；可对若干池叠加临时变换（整体 move / rotate / scale 的预演，渲染用）。
// created 2026-10-21 by Claude Fable 5.1
// **按槽缓存（#22 池级局部性，2026-10-21）**：每个槽变换到世界坐标的那份几何（parts）按 (kernel 对象, 槽序号) 缓存，键 = 池版本号 Kernel.rev + 变换；
// 新建一份 WorldView 只重算「池变了 / 变换变了」的槽（预演 = 只有活动池的影子副本），其余槽直接复用上一份的 part。查询按 gid 的槽序号路由到 part。
import { bboxOfRing } from "../kernel/face-lifecycle.ts";
import type { Kernel } from "../kernel/kernel.ts";
import type { Edge, EdgeId, FaceId, Pt3, Vertex, VertexId } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import type { Ring } from "../kernel/facefind.ts";
import { type PlaneParams, planeBasis, projectToPlane } from "../kernel/geom.ts";
import { COPLANAR_TOL_DEFAULT } from "../kernel/geom.ts";
import { type EditContext, type InstId, type Material, type PoolRef, Scene, poolKey, samePool } from "./scene.ts";
import { type Frame, type Xform, applyPlane, applyPt, compose, isIdentity } from "./xform.ts";
import { chainVisible } from "./layers.ts";
import { type GuidesWorld, guidesToWorld } from "./guides.ts";

/** 绝对网格（0.11 ⑤）：帧 = 上下文的帧（绘图轴），step = 显示格距（米），sub = 吸附细分（吸附步 = step / sub）。 */
export interface GridSpec { frame: Frame; step: number; sub: number; }

/** 求解器 / 拾取 / 渲染认识的几何读接口（Kernel 结构上满足）。 */
export interface GeomView {
  vertices(): Vertex[];
  edges(): Edge[];
  faces(): Face[];
  face(id: FaceId): Face | undefined;
  planeOf(id: FaceId): PlaneRec | undefined;
  faceRings3(id: FaceId): { outer: Pt3[]; holes: Pt3[][] } | undefined;
  /** 软边：渲染不画线。 */
  isSoft(id: EdgeId): boolean;
  /** 平滑边：两侧膜的法向跨边插值（平滑组）。 */
  isSmooth(id: EdgeId): boolean;
  /** 面的材质（null = 默认灰）。 */
  faceMaterial(id: FaceId): Material | null;
  /** 共面容差 τ（米）：编辑器判「点在哪张面的平面上」与内核同一把尺子（2026-10-24 起不再各写 1e-3）。 */
  readonly coplanarTol: number;
  /** 上下文的帧（世界坐标；0.11 尺规纪元）：推断的原点与三轴。不给 = 世界帧。 */
  frame?(): Frame;
  /** 活动池的参考几何（世界坐标；0.11）。不给 = 没有。 */
  guides?(): GuidesWorld;
  /** 绝对网格（0.11 ⑤）：开着才有；格点是最低秩的 0-D 目标，整数长度沿锚点方向取整。 */
  grid?(): GridSpec | null;
  /** 候选所在池离活动上下文的层级距离（#30，user 2026-10-24「4听你的」）：0 = 自己；1 = 父母 / 孩子 / 父母的孩子；2 = 其他。不给 = 全 0。 */
  tierOf?(id: number): 0 | 1 | 2;
  /** 圆 / 弧曲线实体的圆心（世界坐标；DT15 吸附「圆心」）。不给 = 没有。 */
  centers?(): readonly Pt3[];
  graph: { pt(id: VertexId): Pt3; edge(id: EdgeId): Edge; vertex(id: VertexId): Vertex; hasEdge(id: EdgeId): boolean; hasVertex(id: VertexId): boolean };
}

export const ID_STRIDE = 1 << 22;

export interface PoolSlot { index: number; pool: PoolRef; chain: readonly InstId[]; xform: Xform; kernel: Kernel; active: boolean; inContext: boolean; /** 层级距离（#30）：0 自己 / 1 近亲 / 2 其他。 */ tier: 0 | 1 | 2; /** 正被整体变换预演的池（在手里：不吸、不遮）。 */ overridden: boolean; /** 复制预演的副本槽（DT14）：同一个池多画一份、在手里待遇（空 part），key 带 +copy；原槽照常。 */ ghost?: boolean; }


/** 一个槽变换到世界坐标后的几何（只读缓存单元）。 */
export interface SlotPart {
  rev: number; xform: Xform;
  verts: Map<VertexId, Vertex>; edges: Map<EdgeId, Edge>; faces: Map<FaceId, Face>; planes: Map<FaceId, PlaneRec>;
  soft: Set<EdgeId>; smooth: Set<EdgeId>;
  /** 圆 / 弧的圆心（世界坐标，DT15）。 */
  centers: Pt3[];
}
/** kernel 对象 → 槽序号 → part（同一 definition 的多个实例 = 同一 kernel、不同槽 / 变换）。 */
const PART_CACHE = new WeakMap<Kernel, Map<number, SlotPart>>();
/** 本进程累计的 part 重算统计（编辑器把它抄进 perf；scene 层不 import editor）。 */
export const PART_STATS = { ms: 0, n: 0 };
/** 在手里（整体变换预演）的槽不算世界坐标：它不吸附、不遮挡、渲染只改矩阵——拖最大的 uber 组每帧成本 ≈ 0（user 2026-10-21「如果transform最大的uber组会发生什么」）。 */
const OVERRIDDEN_PARTS_EMPTY = true;
const emptyPart = (m: Xform): SlotPart => ({ rev: -1, xform: m, verts: new Map(), edges: new Map(), faces: new Map(), planes: new Map(), soft: new Set(), smooth: new Set(), centers: [] });
const sameXform = (a: Xform, b: Xform): boolean => { for (let i = 0; i < 12; i++) if (a[i] !== b[i]) return false; return true; };

function buildPart(index: number, k: Kernel, m: Xform): SlotPart {
  const off = index * ID_STRIDE;
  const ident = isIdentity(m);
  const part: SlotPart = { rev: k.rev, xform: m, verts: new Map(), edges: new Map(), faces: new Map(), planes: new Map(), soft: new Set(), smooth: new Set(), centers: [] };
  for (const c of k.curves()) if (c.params && (c.kind === "circle" || c.kind === "arc")) part.centers.push(ident ? { ...c.params.center } : applyPt(m, c.params.center));
  for (const v of k.vertices()) {
    const p = ident ? v : applyPt(m, v);
    part.verts.set(v.id + off, { id: v.id + off, x: p.x, y: p.y, z: p.z, edges: new Set([...v.edges].map((e) => e + off)) });
  }
  for (const e of k.edges()) part.edges.set(e.id + off, { id: e.id + off, a: e.a + off, b: e.b + off, faceLinks: e.faceLinks.map((f) => f + off) });
  for (const e of k.soft) part.soft.add(e + off);
  for (const e of k.edgeLayers.layer("smooth")) part.smooth.add(e + off);
  for (const f of k.faces()) {
    const rec = k.planeOf(f.id)!;
    let plane: PlaneParams = rec.plane, basis = rec.basis;
    const mapRing = (r: Ring): Ring => ({ edges: r.edges.map((d) => ({ edge: d.edge + off, forward: d.forward })), pts: r.pts, vids: r.vids.map((v) => v + off) });
    let outer = mapRing(f.outer), holes = f.holes.map(mapRing);
    if (!ident) {
      plane = applyPlane(m, rec.plane);
      basis = planeBasis(plane);
      const reproject = (r: Ring, src: Ring): Ring => ({ edges: r.edges, vids: r.vids, pts: src.edges.map((d) => { const e = k.graph.edge(d.edge); return projectToPlane(applyPt(m, k.graph.pt(d.forward ? e.a : e.b)), basis); }) });
      outer = reproject(outer, f.outer);
      holes = holes.map((h, i) => reproject(h, f.holes[i]));
    }
    const gid = f.id + off;
    part.faces.set(gid, { id: gid, planeId: rec.id + off, outer, holes, bbox: ident ? f.bbox : bboxOfRing(outer) });
    part.planes.set(gid, { id: rec.id + off, plane, basis });
  }
  return part;
}

/**
 * 层级距离（#30）：相对活动上下文 (chainA, groupA)，近亲 = 自己的孩子（同 definition 里 parent 链上有 groupA 的 group、parent === groupA 的实例及其整棵）、
 * 父母（groupA 的 parent 池；进了实例则是放它的那个池）、父母的孩子（兄弟 group / 兄弟实例）。其余 = 2。
 */
function tierOfSlot(scene: Scene, ctx: EditContext, pool: PoolRef, chain: readonly InstId[]): 0 | 1 | 2 {
  const chainA = ctx.chain, groupA = ctx.group, defA = scene.defOfContext(ctx);
  const sameChain = chain.length === chainA.length && chain.every((c, i) => c === chainA[i]);
  const prefix = chain.length > chainA.length && chainA.every((c, i) => c === chain[i]);
  const groupParent = (def: number, gid: number | null): number | null => (gid === null ? null : scene.group({ def, group: gid }).parent);
  const ancestors = (def: number, gid: number | null): Set<number | null> => { const out = new Set<number | null>(); let g = gid; let guard = 64; while (g !== null && guard-- > 0) { g = groupParent(def, g); out.add(g); } return out; };
  if (sameChain && pool.def === defA) {
    if (pool.group === groupA) return 0;
    if (ancestors(defA, pool.group).has(groupA)) return 1;                         // 孩子（任意深）
    const parentA = groupParent(defA, groupA);
    if (groupA !== null && pool.group === parentA) return 1;                       // 父母
    if (pool.group !== null && groupParent(defA, pool.group) === parentA) return 1;   // 兄弟
    return 2;
  }
  if (prefix) {
    const inst = scene.instance(defA, chain[chainA.length]);                       // 从活动 definition 出去的第一个实例
    const parentA = groupParent(defA, groupA);
    if (inst.parent === groupA || ancestors(defA, inst.parent).has(groupA)) return 1;   // 孩子实例（及其整棵）
    if (inst.parent === parentA && chain.length === chainA.length + 1 && groupA !== null) return 1;   // 兄弟实例
    return 2;
  }
  if (chainA.length && chain.length === chainA.length - 1 && chain.every((c, i) => c === chainA[i])) {
    // 父母那一层：放着当前实例的池 = 父母；父母的其他孩子 = 兄弟
    const up = chainA.length === 1 ? scene.root : scene.instance(scene.defOfContext({ chain: chainA.slice(0, -2), group: null }), chainA[chainA.length - 2]).def;
    const inst = scene.instance(up, chainA[chainA.length - 1]);
    if (pool.def !== up) return 2;
    if (pool.group === inst.parent) return 1;                                      // 父母
    if (pool.group !== null && groupParent(up, pool.group) === inst.parent) return 1;   // 兄弟 group
    return 2;
  }
  if (chainA.length && chain.length === chainA.length && chain.slice(0, -1).every((c, i) => c === chainA[i])) {
    // 兄弟实例：同一父池里放的别的实例
    const up = chainA.length === 1 ? scene.root : scene.instance(scene.defOfContext({ chain: chainA.slice(0, -2), group: null }), chainA[chainA.length - 2]).def;
    const mine = scene.instance(up, chainA[chainA.length - 1]), theirs = scene.instance(up, chain[chain.length - 1]);
    return mine.parent === theirs.parent ? 1 : 2;
  }
  return 2;
}

export class WorldView implements GeomView {
  readonly slots: PoolSlot[] = [];
  /** 每槽一份世界坐标几何（缓存单元；屏幕索引也按它缓存）。在手里的槽 = 空 part（见 OVERRIDDEN_PARTS_EMPTY）。 */
  readonly parts: SlotPart[] = [];
  private byKey = new Map<string, number>();
  readonly graph: GeomView["graph"];
  /** 各池 τ 取最大（同一文档里本来一样；混了老文档的池就按最宽的）。 */
  readonly coplanarTol: number;

  /**
   * @param scene 场景
   * @param ctx 编辑上下文（活动池 = ctx 的池；链上的池 = inContext）
   * @param live 活动池的影子副本（手势预演）；null = 用 checkpoint
   * @param overrides 叠加变换（整体变换预演，渲染 / 吸附同见）：谓词匹配到的池在世界侧再乘一个变换
   */
  readonly scene: Scene;
  readonly ctx: EditContext;
  private readonly ctxFrame: Frame;
  private readonly ctxGuides: GuidesWorld;
  private readonly ctxGrid: GridSpec | null;
  frame(): Frame { return this.ctxFrame; }
  guides(): GuidesWorld { return this.ctxGuides; }
  grid(): GridSpec | null { return this.ctxGrid; }
  constructor(scene: Scene, ctx: EditContext, live: Kernel | null = null, overrides?: readonly { match(pool: PoolRef, chain: readonly InstId[]): boolean; xform: Xform }[], extras?: { grid?: { step: number; sub: number; frame?: Frame } | null; copies?: readonly { match(pool: PoolRef, chain: readonly InstId[]): boolean; xform: Xform }[] }) {
    this.scene = scene; this.ctx = ctx;   // 不用参数属性：node strip-types 不支持
    const activePool = scene.poolOfContext(ctx);
    this.ctxFrame = scene.frameOfContext(ctx);
    this.ctxGrid = extras?.grid ? { frame: extras.grid.frame ?? this.ctxFrame, step: extras.grid.step, sub: extras.grid.sub } : null;   // 网格面可换（yz / xz 立面）：帧由编辑器按 gridFrame 换好递来
    this.ctxGuides = guidesToWorld(scene.guidesOf(activePool), scene.xformOfContext(ctx));
    const chainKey = ctx.chain.join("/");
    const used = new Map<Kernel, Set<number>>();
    for (const { pool, xform, chain } of scene.pools()) {
      if (scene.kindOf(pool.def) !== "brep") continue;   // 门 1：只有 brep 池有 kernel 可 bake；card 等别的 kind 以后各自 bake
      if (chain.length && chain.join("/") !== chainKey && !chainVisible(scene, chain)) continue;   // 层藏掉的（含祖先藏）不进推断世界、不画（契约 §4；上下文自己所在的链永远算可见——你站在里面）
      const isActive = samePool(pool, activePool) && chain.join("/") === chainKey;
      const sameDefChain = chain.join("/") === chainKey;
      const index = this.slots.length;
      const key = `${chain.join("/")}#${poolKey(pool)}`;
      let m = xform, overridden = false;
      if (overrides) for (const ov of overrides) if (ov.match(pool, chain)) { m = compose(ov.xform, m); overridden = true; }
      // DT13（user 2026-10-25「编辑组件的时候能不能其他组件一起实时更新？」）：同一个池在别的链里的那几份（同一组件的其他实例）手势中也画预演内核，
      // 但当「在手里」（空 part：不吸附、不遮挡、点不中）——它们跟着光标动，再当吸附目标就是自己吸自己（user「会不会自己卡住自己」；周账 F-89 Fable 审）。
      const twin = !isActive && !!live && samePool(pool, activePool);
      if (twin) overridden = true;
      const kernel = (isActive || twin) && live ? live : scene.kernelOf(pool);
      this.slots.push({ index, pool, chain, xform: m, kernel, active: isActive, inContext: sameDefChain, overridden, tier: isActive ? 0 : tierOfSlot(scene, ctx, pool, chain) });
      this.byKey.set(key, index);
      // part：命中缓存（同 kernel 对象 + 同槽序号 + 池版本没变 + 变换没变）就复用，否则重算这一个槽
      if (overridden && OVERRIDDEN_PARTS_EMPTY) { this.parts.push(emptyPart(m)); continue; }
      let perK = PART_CACHE.get(kernel);
      if (!perK) { perK = new Map(); PART_CACHE.set(kernel, perK); }
      let part = perK.get(index);
      if (!part || part.rev !== kernel.rev || !sameXform(part.xform, m)) { const t = performance.now(); part = buildPart(index, kernel, m); PART_STATS.ms += performance.now() - t; PART_STATS.n++; perK.set(index, part); }
      this.parts.push(part);
      (used.get(kernel) ?? used.set(kernel, new Set()).get(kernel)!).add(index);
    }
    // 修剪：一个 kernel 在本次没用到的槽序号（池增删后序号挪了）丢掉，缓存体积 = 槽数
    // 复制预演（DT14，user 2026-10-25「move 复制的时候没有预览」）：原件不动、照常可吸；命中的池另加一个副本槽，在手里待遇（空 part = 不吸附、不遮挡、点不中），只按矩阵渲染——
    // 副本不进推断世界，就不会自己吸自己（user「会不会自己卡住自己」）。排在全部正常槽之后：正常槽的序号（全局 id 前缀）和缓存不受影响。
    if (extras?.copies?.length) {
      const n0 = this.slots.length;
      for (let i = 0; i < n0; i++) {
        const sl = this.slots[i];
        let m = sl.xform, hit = false;
        for (const cp of extras.copies) if (cp.match(sl.pool, sl.chain)) { m = compose(cp.xform, m); hit = true; }
        if (!hit) continue;
        const index = this.slots.length;
        this.slots.push({ ...sl, index, xform: m, active: false, overridden: true, ghost: true, tier: 2 });
        this.parts.push(emptyPart(m));
      }
    }
    for (const [k, idxs] of used) { const perK = PART_CACHE.get(k)!; for (const i of [...perK.keys()]) if (!idxs.has(i)) perK.delete(i); }
    const parts = this.parts;
    const partOf = (id: number): SlotPart | undefined => parts[Math.floor(id / ID_STRIDE)];
    this.coplanarTol = this.slots.reduce((m, sl) => Math.max(m, sl.kernel.coplanarTol), 0) || COPLANAR_TOL_DEFAULT;
    this.graph = {
      pt: (id) => { const v = partOf(id)?.verts.get(id); if (!v) throw new Error(`vertex ${id} 不存在`); return { x: v.x, y: v.y, z: v.z }; },
      edge: (id) => { const e = partOf(id)?.edges.get(id); if (!e) throw new Error(`edge ${id} 不存在`); return e; },
      vertex: (id) => { const v = partOf(id)?.verts.get(id); if (!v) throw new Error(`vertex ${id} 不存在`); return v; },
      hasEdge: (id) => partOf(id)?.edges.has(id) ?? false,
      hasVertex: (id) => partOf(id)?.verts.has(id) ?? false,
    };
  }
  private partOf(id: number): SlotPart | undefined { return this.parts[Math.floor(id / ID_STRIDE)]; }

  vertices(): Vertex[] { const out: Vertex[] = []; for (const p of this.parts) for (const v of p.verts.values()) out.push(v); return out; }
  edges(): Edge[] { const out: Edge[] = []; for (const p of this.parts) for (const e of p.edges.values()) out.push(e); return out; }
  centers(): Pt3[] { const out: Pt3[] = []; for (const p of this.parts) for (const c of p.centers) out.push(c); return out; }
  isSoft(id: EdgeId): boolean { return this.partOf(id)?.soft.has(id) ?? false; }
  isSmooth(id: EdgeId): boolean { return this.partOf(id)?.smooth.has(id) ?? false; }
  faceMaterial(id: FaceId): Material | null {
    const ps = this.faceSlotOf(id);
    if (!ps) return null;
    const { id: local } = this.local(id);
    return this.scene.materialOfSlot(ps.pool.def, ps.kernel.faceMaterialOf(local));
  }
  faces(): Face[] { const out: Face[] = []; for (const p of this.parts) for (const f of p.faces.values()) out.push(f); return out; }
  face(id: FaceId): Face | undefined { return this.partOf(id)?.faces.get(id); }
  planeOf(id: FaceId): PlaneRec | undefined { return this.partOf(id)?.planes.get(id); }
  faceRings3(id: FaceId): { outer: Pt3[]; holes: Pt3[][] } | undefined {
    const f = this.face(id);
    if (!f) return undefined;
    const ring3 = (r: Ring): Pt3[] => r.edges.map((d) => this.graph.pt(d.forward ? this.graph.edge(d.edge).a : this.graph.edge(d.edge).b));
    return { outer: ring3(f.outer), holes: f.holes.map(ring3) };
  }
  /** 某个槽的几何（按池遍历：渲染 / 拾取先按槽筛）。 */
  slotFaces(index: number): Iterable<Face> { return this.parts[index]?.faces.values() ?? []; }
  slotEdges(index: number): Iterable<Edge> { return this.parts[index]?.edges.values() ?? []; }

  // ---------- 全局 id ↔ 池 ----------
  slotOf(gid: number): PoolSlot { return this.slots[Math.floor(gid / ID_STRIDE)]; }
  tierOf(gid: number): 0 | 1 | 2 { return this.slots[Math.floor(gid / ID_STRIDE)]?.tier ?? 2; }
  local(gid: number): { slot: PoolSlot; id: number } { const slot = this.slotOf(gid); return { slot, id: gid - slot.index * ID_STRIDE }; }
  /** 活动池的本地 id → 全局 id。 */
  global(localId: number): number { return localId + this.activeSlot().index * ID_STRIDE; }
  activeSlot(): PoolSlot { const s = this.slots.find((x) => x.active); if (!s) throw new Error("world view: no active pool"); return s; }
  isActive(gid: number): boolean { return this.slotOf(gid)?.active ?? false; }
  slotByKey(key: string): PoolSlot | undefined { const i = this.byKey.get(key); return i === undefined ? undefined : this.slots[i]; }
  /** 面所在的池槽。 */
  faceSlotOf(gid: FaceId): PoolSlot | undefined { const i = Math.floor(gid / ID_STRIDE); return this.parts[i]?.faces.has(gid) ? this.slots[i] : undefined; }
}

export const slotKey = (s: { chain: readonly InstId[]; pool: PoolRef; ghost?: boolean }): string => `${s.chain.join("/")}#${poolKey(s.pool)}${s.ghost ? "+copy" : ""}`;

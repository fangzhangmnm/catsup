// world-view.ts —— 把场景所有几何池变换到世界坐标、合成一份**只读**几何视图（GeomView），给渲染 / 拾取 / 吸附用。
// 求解器 / 拾取 / 渲染只认 GeomView（Kernel 结构上就是一个 GeomView）；id 全局化 = 池序号 × ID_STRIDE + 本地 id，
// `local(gid)` 反查回池。活动池可被「影子副本」替换（手势预演）；可对若干池叠加临时变换（整体 move / rotate / scale 的预演，渲染用）。
// created 2026-10-21 by Claude Fable 5.1
import type { Kernel } from "../kernel/kernel.ts";
import type { Edge, EdgeId, FaceId, Pt3, Vertex, VertexId } from "../kernel/kernel.ts";
import type { Face } from "../kernel/face-lifecycle.ts";
import type { PlaneRec } from "../kernel/planes.ts";
import type { Ring } from "../kernel/facefind.ts";
import { type PlaneParams, planeBasis, projectToPlane } from "../kernel/geom.ts";
import { type EditContext, type InstId, type Material, type PoolRef, Scene, poolKey, samePool } from "./scene.ts";
import { type Xform, applyPlane, applyPt, compose, isIdentity } from "./xform.ts";

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
  graph: { pt(id: VertexId): Pt3; edge(id: EdgeId): Edge; vertex(id: VertexId): Vertex; hasEdge(id: EdgeId): boolean; hasVertex(id: VertexId): boolean };
}

export const ID_STRIDE = 1 << 22;

export interface PoolSlot { index: number; pool: PoolRef; chain: readonly InstId[]; xform: Xform; kernel: Kernel; active: boolean; inContext: boolean; /** 正被整体变换预演的池（在手里：不吸、不遮）。 */ overridden: boolean; }

export class WorldView implements GeomView {
  private verts = new Map<VertexId, Vertex>();
  private edgeMap = new Map<EdgeId, Edge>();
  private faceMap = new Map<FaceId, Face>();
  private planeMap = new Map<FaceId, PlaneRec>();
  private faceSlot = new Map<FaceId, number>();
  private softSet = new Set<EdgeId>();
  private smoothSet = new Set<EdgeId>();
  readonly slots: PoolSlot[] = [];
  private byKey = new Map<string, number>();
  readonly graph: GeomView["graph"];

  /**
   * @param scene 场景
   * @param ctx 编辑上下文（活动池 = ctx 的池；链上的池 = inContext）
   * @param live 活动池的影子副本（手势预演）；null = 用 checkpoint
   * @param overrides 叠加变换（整体变换预演，渲染 / 吸附同见）：谓词匹配到的池在世界侧再乘一个变换
   */
  readonly scene: Scene;
  readonly ctx: EditContext;
  constructor(scene: Scene, ctx: EditContext, live: Kernel | null = null, overrides?: readonly { match(pool: PoolRef, chain: readonly InstId[]): boolean; xform: Xform }[]) {
    this.scene = scene; this.ctx = ctx;   // 不用参数属性：node strip-types 不支持
    const activePool = scene.poolOfContext(ctx);
    const chainKey = ctx.chain.join("/");
    for (const { pool, xform, chain } of scene.pools()) {
      const isActive = samePool(pool, activePool) && chain.join("/") === chainKey;
      const sameDefChain = chain.join("/") === chainKey;
      const index = this.slots.length;
      const key = `${chain.join("/")}#${poolKey(pool)}`;
      let m = xform, overridden = false;
      if (overrides) for (const ov of overrides) if (ov.match(pool, chain)) { m = compose(ov.xform, m); overridden = true; }
      const kernel = isActive && live ? live : scene.kernelOf(pool);
      this.slots.push({ index, pool, chain, xform: m, kernel, active: isActive, inContext: sameDefChain, overridden });
      this.byKey.set(key, index);
      this.ingest(index, kernel, m);
    }
    const verts = this.verts, edges = this.edgeMap;
    this.graph = {
      pt: (id) => { const v = verts.get(id); if (!v) throw new Error(`vertex ${id} 不存在`); return { x: v.x, y: v.y, z: v.z }; },
      edge: (id) => { const e = edges.get(id); if (!e) throw new Error(`edge ${id} 不存在`); return e; },
      vertex: (id) => { const v = verts.get(id); if (!v) throw new Error(`vertex ${id} 不存在`); return v; },
      hasEdge: (id) => edges.has(id),
      hasVertex: (id) => verts.has(id),
    };
  }

  private ingest(index: number, k: Kernel, m: Xform): void {
    const off = index * ID_STRIDE;
    const ident = isIdentity(m);
    for (const v of k.vertices()) {
      const p = ident ? v : applyPt(m, v);
      this.verts.set(v.id + off, { id: v.id + off, x: p.x, y: p.y, z: p.z, edges: new Set([...v.edges].map((e) => e + off)) });
    }
    for (const e of k.edges()) this.edgeMap.set(e.id + off, { id: e.id + off, a: e.a + off, b: e.b + off, faceLinks: e.faceLinks.map((f) => f + off) });
    for (const e of k.soft) this.softSet.add(e + off);
    for (const e of k.edgeLayers.layer("smooth")) this.smoothSet.add(e + off);
    for (const f of k.faces()) {
      const rec = k.planeOf(f.id)!;
      let plane: PlaneParams = rec.plane, basis = rec.basis;
      const mapRing = (r: Ring): Ring => ({ edges: r.edges.map((d) => ({ edge: d.edge + off, forward: d.forward })), pts: r.pts });
      let outer = mapRing(f.outer), holes = f.holes.map(mapRing);
      if (!ident) {
        plane = applyPlane(m, rec.plane);
        basis = planeBasis(plane);
        const reproject = (r: Ring, src: Ring): Ring => ({ edges: r.edges, pts: src.edges.map((d) => { const e = k.graph.edge(d.edge); return projectToPlane(applyPt(m, k.graph.pt(d.forward ? e.a : e.b)), basis); }) });
        outer = reproject(outer, f.outer);
        holes = holes.map((h, i) => reproject(h, f.holes[i]));
      }
      const gid = f.id + off;
      this.faceMap.set(gid, { id: gid, planeId: rec.id + off, outer, holes });
      this.planeMap.set(gid, { id: rec.id + off, plane, basis });
      this.faceSlot.set(gid, index);
    }
  }

  vertices(): Vertex[] { return [...this.verts.values()]; }
  edges(): Edge[] { return [...this.edgeMap.values()]; }
  isSoft(id: EdgeId): boolean { return this.softSet.has(id); }
  isSmooth(id: EdgeId): boolean { return this.smoothSet.has(id); }
  faceMaterial(id: FaceId): Material | null {
    const slot = this.faceSlot.get(id);
    if (slot === undefined) return null;
    const ps = this.slots[slot];
    const { id: local } = this.local(id);
    return this.scene.materialOfSlot(ps.pool.def, ps.kernel.faceMaterialOf(local));
  }
  faces(): Face[] { return [...this.faceMap.values()]; }
  face(id: FaceId): Face | undefined { return this.faceMap.get(id); }
  planeOf(id: FaceId): PlaneRec | undefined { return this.planeMap.get(id); }
  faceRings3(id: FaceId): { outer: Pt3[]; holes: Pt3[][] } | undefined {
    const f = this.faceMap.get(id);
    if (!f) return undefined;
    const ring3 = (r: Ring): Pt3[] => r.edges.map((d) => this.graph.pt(d.forward ? this.graph.edge(d.edge).a : this.graph.edge(d.edge).b));
    return { outer: ring3(f.outer), holes: f.holes.map(ring3) };
  }

  // ---------- 全局 id ↔ 池 ----------
  slotOf(gid: number): PoolSlot { return this.slots[Math.floor(gid / ID_STRIDE)]; }
  local(gid: number): { slot: PoolSlot; id: number } { const slot = this.slotOf(gid); return { slot, id: gid - slot.index * ID_STRIDE }; }
  /** 活动池的本地 id → 全局 id。 */
  global(localId: number): number { return localId + this.activeSlot().index * ID_STRIDE; }
  activeSlot(): PoolSlot { const s = this.slots.find((x) => x.active); if (!s) throw new Error("world view: no active pool"); return s; }
  isActive(gid: number): boolean { return this.slotOf(gid)?.active ?? false; }
  slotByKey(key: string): PoolSlot | undefined { const i = this.byKey.get(key); return i === undefined ? undefined : this.slots[i]; }
  /** 面所在的池槽。 */
  faceSlotOf(gid: FaceId): PoolSlot | undefined { const i = this.faceSlot.get(gid); return i === undefined ? undefined : this.slots[i]; }
}

export const slotKey = (s: { chain: readonly InstId[]; pool: PoolRef }): string => `${s.chain.join("/")}#${poolKey(s.pool)}`;

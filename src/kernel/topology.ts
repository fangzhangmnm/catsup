// topology.ts —— PlanarGraph：vertex/edge 的原始增删（拓扑 ⊥ 几何：本层只管谁连谁 + 顶点坐标）。
// 公理 2（非流形连接）预留：Edge.faceLinks 是**变长列表**不是左/右两指针——
// 升维（M3 多平面）后一条边可挂 N 张面，这根 radial cycle 的位置现在就留好。
// 公理 3（重合即同一）：顶点身份 = 量化格点 Map；两点落同格 = 同一个 vertex。

import { type Pt3, ptKey3 } from "./geom.ts";
import type { ChangeLog } from "./change-log.ts";
import { IdMap, IdSet } from "./id-table.ts";

export type VertexId = number;
export type EdgeId = number;
/** face 实体住在 face-lifecycle.ts；本层只把 FaceId 当不透明号码挂在 faceLinks 上。 */
export type FaceId = number;

export interface Vertex { readonly id: VertexId; x: number; y: number; z: number; readonly edges: Set<EdgeId>; }
export interface Edge { readonly id: EdgeId; a: VertexId; b: VertexId; faceLinks: FaceId[]; }

/**
 * 边的空间网格（#14 性能第二轮，2026-10-21，Claude Fable 5.1）：查询「离线段 ab 不远的边」返回**超集**，调用方照旧做几何判定。
 * **多级、不写死特征长度**（2026-10-26，Claude Opus 5.5；user 10-26「不应该写死特征长度」）：原来格子固定 1 m、查询扩 26 邻格——1 m 量级的物件
 * （轮子、导入的网格）全挤在几格里，每次查询 ≈ 全扫，结算一步随模型变大线性变慢、导入三角面成平方。现在：
 *   · 每条边按自己的长度住一级（格边 2^L 米、2^L ≥ 边长，下限 2^MIN_LEVEL）；登记在它的包围盒外扩 MARGIN 碰到的格里（≤ 2×2×2 格为常）；
 *   · 查询逐级：只看查询线段真正穿过的格（三维 DDA）/ 包围盒盖住的格，不再扩邻格；某级要看的格比这级的边还多 → 这级全扫 + 包围盒（旧的退化行为）。
 * 超集保证：离查询线段 < MARGIN / 2（≈ 0.24 mm）的边一定在结果里——远大于内核用到的容差（µm 级）；DDA 在格角的浮点抖动由余下那半个 MARGIN 吃掉。
 * 结果按 id 排序：索引怎么摆不影响调用方看到的顺序。
 */
const MIN_LEVEL = -10;   // 2^-10 m ≈ 0.98 mm
const MAX_LEVEL = 60;
const MARGIN = 2 ** (MIN_LEVEL - 1);   // ≈ 0.49 mm
const levelOf = (len: number): number => {
  if (!(len > 0) || !Number.isFinite(len)) return MIN_LEVEL;
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, Math.ceil(Math.log2(len))));
};
const cellKey = (ix: number, iy: number, iz: number): number => ((ix * 73856093) ^ (iy * 19349663) ^ (iz * 83492791)) | 0;
interface GridLevel { readonly size: number; readonly cells: Map<number, Set<EdgeId>>; readonly edges: Set<EdgeId>; }

/** 线段 ab 在格边 s 的格里穿过的格（三维 DDA，Amanatides–Woo）。 */
function cellsOnSegment(a: Pt3, b: Pt3, s: number, visit: (ix: number, iy: number, iz: number) => void): void {
  let ix = Math.floor(a.x / s), iy = Math.floor(a.y / s), iz = Math.floor(a.z / s);
  const ex = Math.floor(b.x / s), ey = Math.floor(b.y / s), ez = Math.floor(b.z / s);
  const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
  const sx = Math.sign(dx), sy = Math.sign(dy), sz = Math.sign(dz);
  let tx = dx ? ((ix + (sx > 0 ? 1 : 0)) * s - a.x) / dx : Infinity, ty = dy ? ((iy + (sy > 0 ? 1 : 0)) * s - a.y) / dy : Infinity, tz = dz ? ((iz + (sz > 0 ? 1 : 0)) * s - a.z) / dz : Infinity;
  const tdx = dx ? s / Math.abs(dx) : Infinity, tdy = dy ? s / Math.abs(dy) : Infinity, tdz = dz ? s / Math.abs(dz) : Infinity;
  visit(ix, iy, iz);
  for (let n = Math.abs(ex - ix) + Math.abs(ey - iy) + Math.abs(ez - iz); n > 0; n--) {
    if (tx <= ty && tx <= tz) { ix += sx; tx += tdx; } else if (ty <= tz) { iy += sy; ty += tdy; } else { iz += sz; tz += tdz; }
    visit(ix, iy, iz);
  }
}

export class PlanarGraph {
  /** 改动日志（Kernel 接上；DT96）：顶点表 / 边表是带记账的表；原地改坐标 / 改端点的几处另外显式记。
   *  表是按 id 下标的数组（id-table.ts，O3 数组制度）：遍历按 id 升序、和增删历史无关；顶点的星（edges）也是有序集。 */
  log: ChangeLog | null = null;
  private vertsById: IdMap<Vertex> = new IdMap<Vertex>((id) => this.log?.v(id));
  private edgesById: IdMap<Edge> = new IdMap<Edge>((id) => this.log?.e(id));
  private vertByKey = new Map<string, VertexId>();
  private nextV = 1;
  private nextE = 1;
  private levels = new Map<number, GridLevel>();
  private edgeCells = new Map<EdgeId, { level: number; keys: number[] }>();
  /** 删过的边（id 从不复用）：Kernel.emit 只拿它们去清边层 / 曲线，不再全量扫（2026-10-26 Claude Opus 5.5，纪元账本 DT93）。 */
  private removedE: EdgeId[] = [];
  drainRemovedEdges(): EdgeId[] { const r = this.removedE; this.removedE = []; return r; }
  /** 上次 drain 以来删过的边（只看不清：结算机尾声用，emit 再 drain）。 */
  removedSinceDrain(): readonly EdgeId[] { return this.removedE; }

  private indexEdge(id: EdgeId): void {
    const e = this.edge(id);
    const a = this.pt(e.a), b = this.pt(e.b);
    const L = levelOf(Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
    let lv = this.levels.get(L);
    if (!lv) { lv = { size: 2 ** L, cells: new Map(), edges: new Set() }; this.levels.set(L, lv); }
    const s = lv.size, keys: number[] = [];
    const x0 = Math.floor((Math.min(a.x, b.x) - MARGIN) / s), x1 = Math.floor((Math.max(a.x, b.x) + MARGIN) / s);
    const y0 = Math.floor((Math.min(a.y, b.y) - MARGIN) / s), y1 = Math.floor((Math.max(a.y, b.y) + MARGIN) / s);
    const z0 = Math.floor((Math.min(a.z, b.z) - MARGIN) / s), z1 = Math.floor((Math.max(a.z, b.z) + MARGIN) / s);
    for (let ix = x0; ix <= x1; ix++) for (let iy = y0; iy <= y1; iy++) for (let iz = z0; iz <= z1; iz++) {
      const k = cellKey(ix, iy, iz);
      const set = lv.cells.get(k) ?? lv.cells.set(k, new Set()).get(k)!;
      if (set.has(id)) continue;   // 哈希撞格
      set.add(id); keys.push(k);
    }
    lv.edges.add(id);
    this.edgeCells.set(id, { level: L, keys });
  }
  private unindexEdge(id: EdgeId): void {
    const rec = this.edgeCells.get(id);
    if (!rec) return;
    const lv = this.levels.get(rec.level);
    if (lv) {
      for (const k of rec.keys) { const set = lv.cells.get(k); if (set) { set.delete(id); if (!set.size) lv.cells.delete(k); } }
      lv.edges.delete(id);
      if (!lv.edges.size) this.levels.delete(rec.level);
    }
    this.edgeCells.delete(id);
  }
  /** 边 id 的包围盒与 [lo, hi] 外扩 m 相交？ */
  private boxHit(id: EdgeId, lo: Pt3, hi: Pt3, m: number): boolean {
    const e = this.edgesById.get(id);
    if (!e) return false;
    const a = this.vertsById.get(e.a)!, b = this.vertsById.get(e.b)!;
    return !(Math.max(a.x, b.x) < lo.x - m || Math.min(a.x, b.x) > hi.x + m || Math.max(a.y, b.y) < lo.y - m || Math.min(a.y, b.y) > hi.y + m || Math.max(a.z, b.z) < lo.z - m || Math.min(a.z, b.z) > hi.z + m);
  }
  private collect(ids: Set<EdgeId>): Edge[] {
    const out: Edge[] = [];
    for (const id of [...ids].sort((p, q) => p - q)) { const e = this.edgesById.get(id); if (e) out.push(e); }
    return out;
  }
  /** 离线段 ab 不远的边（超集；a = b = 点查）。 */
  edgesNear(a: Pt3, b: Pt3): Edge[] {
    const ids = new Set<EdgeId>();
    const lo = { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), z: Math.min(a.z, b.z) }, hi = { x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), z: Math.max(a.z, b.z) };
    for (const lv of this.levels.values()) {
      const s = lv.size;
      const steps = Math.abs(Math.floor(b.x / s) - Math.floor(a.x / s)) + Math.abs(Math.floor(b.y / s) - Math.floor(a.y / s)) + Math.abs(Math.floor(b.z / s) - Math.floor(a.z / s)) + 1;
      if (!(steps <= lv.edges.size)) { for (const id of lv.edges) if (this.boxHit(id, lo, hi, MARGIN)) ids.add(id); continue; }
      cellsOnSegment(a, b, s, (ix, iy, iz) => { const set = lv.cells.get(cellKey(ix, iy, iz)); if (set) for (const id of set) ids.add(id); });
    }
    return this.collect(ids);
  }
  /**
   * 包围盒 [min, max] 里（碰到即算）的边（超集；调用方照旧做几何判定）。影响域定理的第四项用它：
   * 新膜包围盒里不连通的旧闭环 = 它的洞，不走顶点传递也得进边集。某级格太多（盒比这级的边还多）就这级全扫 + 包围盒相交测试。
   * added 2026-10-23 by Claude Fable 5.1
   */
  edgesInBox(min: Pt3, max: Pt3): Edge[] {
    const ids = new Set<EdgeId>();
    for (const lv of this.levels.values()) {
      const s = lv.size;
      const ix0 = Math.floor(min.x / s), iy0 = Math.floor(min.y / s), iz0 = Math.floor(min.z / s);
      const ix1 = Math.floor(max.x / s), iy1 = Math.floor(max.y / s), iz1 = Math.floor(max.z / s);
      const cells = (ix1 - ix0 + 1) * (iy1 - iy0 + 1) * (iz1 - iz0 + 1);
      if (!(cells <= lv.edges.size)) { for (const id of lv.edges) if (this.boxHit(id, min, max, MARGIN)) ids.add(id); continue; }
      for (let ix = ix0; ix <= ix1; ix++) for (let iy = iy0; iy <= iy1; iy++) for (let iz = iz0; iz <= iz1; iz++) {
        const set = lv.cells.get(cellKey(ix, iy, iz));
        if (set) for (const id of set) ids.add(id);
      }
    }
    return this.collect(ids);
  }
  /** 离线段 ab 不远的顶点（= 近边的端点；孤立顶点不存在，所以这就是全集的超集）。 */
  verticesNear(a: Pt3, b: Pt3): Vertex[] {
    const ids = new Set<VertexId>();
    for (const e of this.edgesNear(a, b)) { ids.add(e.a); ids.add(e.b); }
    const out: Vertex[] = [];
    for (const id of [...ids].sort((p, q) => p - q)) { const v = this.vertsById.get(id); if (v) out.push(v); }
    return out;
  }

  vertices(): Vertex[] { return [...this.vertsById.values()]; }
  edges(): Edge[] { return [...this.edgesById.values()]; }
  vertexCount(): number { return this.vertsById.size; }
  edgeCount(): number { return this.edgesById.size; }

  vertex(id: VertexId): Vertex {
    const v = this.vertsById.get(id);
    if (!v) throw new Error(`vertex ${id} 不存在`);
    return v;
  }
  edge(id: EdgeId): Edge {
    const e = this.edgesById.get(id);
    if (!e) throw new Error(`edge ${id} 不存在`);
    return e;
  }
  hasEdge(id: EdgeId): boolean { return this.edgesById.has(id); }
  hasVertex(id: VertexId): boolean { return this.vertsById.has(id); }
  /** 下一个会分配的 id（单调递增）——结算机用它划「本次操作前就存在」的旧 / 新界线（τ-flatten 的参照物选择）。 */
  get nextVertexId(): number { return this.nextV; }
  get nextEdgeId(): number { return this.nextE; }
  pt(id: VertexId): Pt3 { const v = this.vertex(id); return { x: v.x, y: v.y, z: v.z }; }
  otherEnd(e: Edge, v: VertexId): VertexId { return e.a === v ? e.b : e.a; }

  /** p 须已量化。 */
  vertexAt(p: Pt3): VertexId | undefined { return this.vertByKey.get(ptKey3(p)); }

  /** 重合即同一：同格点返回既有 vertex。p 须已量化。 */
  ensureVertex(p: Pt3): VertexId {
    const k = ptKey3(p);
    const existing = this.vertByKey.get(k);
    if (existing !== undefined) return existing;
    const id = this.nextV++;
    this.vertsById.set(id, { id, x: p.x, y: p.y, z: p.z, edges: new IdSet() });
    this.vertByKey.set(k, id);
    return id;
  }

  /** 直线世界里两点间至多一条边。 */
  edgeBetween(v1: VertexId, v2: VertexId): EdgeId | undefined {
    const star = this.vertex(v1).edges;
    for (const eid of star) {
      const e = this.edge(eid);
      if (e.a === v2 || e.b === v2) return eid;
    }
    return undefined;
  }

  /** 调用方负责先查 edgeBetween（重合即同一）；自环拒绝。 */
  addEdge(v1: VertexId, v2: VertexId): EdgeId {
    if (v1 === v2) throw new Error("拒绝自环边");
    if (this.edgeBetween(v1, v2) !== undefined) throw new Error(`边 ${v1}-${v2} 已存在（重合即同一，调用方应报 retrace）`);
    const id = this.nextE++;
    this.edgesById.set(id, { id, a: v1, b: v2, faceLinks: [] });
    this.vertex(v1).edges.add(id);
    this.vertex(v2).edges.add(id);
    this.indexEdge(id);
    return id;
  }

  /** 删边；孤立顶点顺带回收（无边的顶点不是一等实体——SU 的 stray vertex 不存在）。 */
  removeEdge(id: EdgeId): void {
    const e = this.edge(id);
    this.unindexEdge(id);
    this.edgesById.delete(id);
    this.removedE.push(id);
    for (const vid of [e.a, e.b]) {
      const v = this.vertex(vid);
      v.edges.delete(id);
      if (v.edges.size === 0) {
        this.vertsById.delete(vid);
        this.vertByKey.delete(ptKey3({ x: v.x, y: v.y, z: v.z }));
      }
    }
  }

  /**
   * 在 p（须已量化、落在边内部）把边切成两半。faceLinks 复制给两半
   * （几何上两半仍贴着同一批面；权威值由 face-lifecycle 重建）。
   */
  splitEdge(id: EdgeId, p: Pt3): { v: VertexId; e1: EdgeId; e2: EdgeId } {
    const e = this.edge(id);
    const links = [...e.faceLinks];
    const a = e.a, b = e.b;
    this.removeEdgeKeepVerts(id);
    const v = this.ensureVertex(p);
    // 重合即同一：切点落进既有顶点的格、而该顶点已与某端相连 → 那半边就是既有边（retrace），不新建也不 throw；
    // 复用的既有边 faceLinks 取并集（覆盖会清掉它原有的面链接——2026-09-07 v0.4.2 首版之误）
    const half = (x: VertexId, y: VertexId): EdgeId => {
      const ex = this.edgeBetween(x, y);
      if (ex === undefined) { const id = this.addEdge(x, y); this.edge(id).faceLinks = [...links]; return id; }
      const fl = this.edge(ex).faceLinks;
      for (const f of links) if (!fl.includes(f)) fl.push(f);
      this.log?.e(ex);
      return ex;
    };
    const e1 = half(a, v);
    const e2 = half(v, b);
    return { v, e1, e2 };
  }

  /**
   * 批量顶点搬迁（planarize 协议第 1 步的底层写：全部先摘 key、再改坐标、再上 key——
   * 中途无「一半已动」的 key 冲突瞬态）。调用方保证终态无 key 碰撞（碰撞=合并，须先在
   * kernel 层做完顶点合并再来）。added by Claude Fable 5 2026-09-01
   */
  relocateVertices(batch: readonly { id: VertexId; to: Pt3 }[]): void {
    const touched = new Set<EdgeId>();
    for (const { id } of batch) {
      const v = this.vertex(id);
      this.vertByKey.delete(ptKey3({ x: v.x, y: v.y, z: v.z }));
      for (const eid of v.edges) touched.add(eid);
    }
    for (const eid of touched) this.unindexEdge(eid);
    for (const { id, to } of batch) {
      const v = this.vertex(id);
      const k = ptKey3(to);
      if (this.vertByKey.has(k)) throw new Error("relocateVertices 终态 key 碰撞——合并该在调用方先做");
      v.x = to.x; v.y = to.y; v.z = to.z;
      this.log?.v(id);
      this.vertByKey.set(k, id);
    }
    for (const eid of touched) this.indexEdge(eid);
  }

  /**
   * 把边替换为沿 a→b 的顶点链（planarize 的切割原语；splitEdge 的批量+去重容忍版）：
   * 链段若与既有边重合 → 复用既有边（重合即同一，公理 3）；顶点全程保留（不 GC 端点）。
   * pts 须已量化、按 a→b 参数序、不含 a/b 本身。返回沿 a→b 的有向子边序列。
   * added by Claude Fable 5 2026-09-01
   */
  replaceEdgeWithChain(id: EdgeId, pts: readonly Pt3[]): { edge: EdgeId; fwd: boolean }[] {
    const e = this.edge(id);
    const links = [...e.faceLinks];
    const a = e.a, b = e.b;
    this.removeEdgeKeepVerts(id);
    const chain: VertexId[] = [a, ...pts.map((p) => this.ensureVertex(p)), b];
    const out: { edge: EdgeId; fwd: boolean }[] = [];
    for (let i = 0; i + 1 < chain.length; i++) {
      const v1 = chain[i], v2 = chain[i + 1];
      if (v1 === v2) continue;
      const existing = this.edgeBetween(v1, v2);
      if (existing !== undefined) {
        out.push({ edge: existing, fwd: this.edge(existing).a === v1 });
        continue;
      }
      const ne = this.addEdge(v1, v2);
      this.edge(ne).faceLinks = [...links];
      out.push({ edge: ne, fwd: true });
    }
    return out;
  }

  /** 顶点移动的底层写（sticky 语义在 kernel 层编排；这里只改坐标 + 换 key）。 */
  relocateVertex(id: VertexId, p: Pt3): void {
    const v = this.vertex(id);
    const oldKey = ptKey3({ x: v.x, y: v.y, z: v.z });
    if (this.vertByKey.get(ptKey3(p)) !== undefined && this.vertByKey.get(ptKey3(p)) !== id) {
      throw new Error("relocateVertex 目标格点已被占用——sticky 合并该在调用方先做");
    }
    this.vertByKey.delete(oldKey);
    for (const eid of v.edges) this.unindexEdge(eid);
    v.x = p.x; v.y = p.y; v.z = p.z;
    this.log?.v(id);
    this.vertByKey.set(ptKey3(p), id);
    for (const eid of v.edges) this.indexEdge(eid);
  }

  /**
   * 把顶点 from 并进 to（身份分辨率：两点 ≤ r 就是一个点；planarize 的合并原语，2026-10-24 D11）。
   * 尽量**保边 id**：from 的边改接到 to（曲线 / 层登记的 id 不变）；坍缩边（另一端就是 to）删；与 to 已有边平行重合的删（faceLinks 并进既有边）。from 随之消亡。
   */
  mergeVertex(from: VertexId, to: VertexId): void {
    if (from === to) return;
    const vf = this.vertex(from), vt = this.vertex(to);
    for (const eid of [...vf.edges]) {
      const e = this.edge(eid);
      const o = e.a === from ? e.b : e.a;
      if (o === to) { this.removeEdge(eid); continue; }   // 坍缩
      const dup = this.edgeBetween(o, to);
      if (dup !== undefined) {   // 平行重合：并进既有边
        const d = this.edge(dup);
        for (const f of e.faceLinks) if (!d.faceLinks.includes(f)) d.faceLinks.push(f);
        this.removeEdge(eid);
        continue;
      }
      this.unindexEdge(eid);
      if (e.a === from) e.a = to; else e.b = to;
      this.log?.e(eid); this.log?.v(to);
      vf.edges.delete(eid); vt.edges.add(eid);
      this.indexEdge(eid);
    }
    if (this.vertsById.has(from) && this.vertex(from).edges.size === 0) {
      this.vertsById.delete(from);
      this.vertByKey.delete(ptKey3({ x: vf.x, y: vf.y, z: vf.z }));
    }
  }

  private removeEdgeKeepVerts(id: EdgeId): void {
    const e = this.edge(id);
    this.unindexEdge(id);
    this.edgesById.delete(id);
    this.removedE.push(id);
    this.vertex(e.a).edges.delete(id);
    this.vertex(e.b).edges.delete(id);
  }

  /**
   * 倒带（拖动预演「拷一次 + 每帧退回」，O1）：把这几个顶点 / 边恢复成 base（真身，预演期间一个字节没动）里的样子——base 有的照 base 深拷回来、base 没有的删掉；
   * 派生索引（格点键、空间网格）只对这几条重算；计数器 / 删过的边表照 base。调用方（Kernel.rewindTo）负责把触碰集按邻接扩全。
   */
  restoreFrom(base: PlanarGraph, vids: ReadonlySet<VertexId>, eids: ReadonlySet<EdgeId>): void {
    for (const eid of eids) if (this.edgesById.has(eid)) { this.unindexEdge(eid); this.edgesById.delete(eid); }
    for (const vid of vids) { const v = this.vertsById.get(vid); if (v) { this.vertByKey.delete(ptKey3({ x: v.x, y: v.y, z: v.z })); this.vertsById.delete(vid); } }
    for (const vid of vids) { const bv = base.vertsById.get(vid); if (bv) { this.vertsById.set(vid, { id: bv.id, x: bv.x, y: bv.y, z: bv.z, edges: new IdSet(bv.edges) }); this.vertByKey.set(ptKey3({ x: bv.x, y: bv.y, z: bv.z }), vid); } }
    for (const eid of eids) { const be = base.edgesById.get(eid); if (be) { this.edgesById.set(eid, { id: be.id, a: be.a, b: be.b, faceLinks: [...be.faceLinks] }); this.indexEdge(eid); } }
    this.nextV = base.nextV; this.nextE = base.nextE;
    this.removedE = [...base.removedE];
  }
  /** 顶点 / 边是否在表里（倒带扩触碰集用）；星 / 端点的只读访问走 vertex / edge。 */
  vertexOrNull(id: VertexId): Vertex | undefined { return this.vertsById.get(id); }
  edgeOrNull(id: EdgeId): Edge | undefined { return this.edgesById.get(id); }
  /** 深拷贝（含 id 计数器——preview 影子副本的 id 分配与真身逐一致）。 */
  clone(): PlanarGraph {
    const g = new PlanarGraph();
    g.nextV = this.nextV;
    g.nextE = this.nextE;
    for (const [id, v] of this.vertsById) g.vertsById.set(id, { id: v.id, x: v.x, y: v.y, z: v.z, edges: new IdSet(v.edges) });
    for (const [id, e] of this.edgesById) g.edgesById.set(id, { id: e.id, a: e.a, b: e.b, faceLinks: [...e.faceLinks] });
    for (const [k, vid] of this.vertByKey) g.vertByKey.set(k, vid);
    for (const [L, lv] of this.levels) { const cells = new Map<number, Set<EdgeId>>(); for (const [k, set] of lv.cells) cells.set(k, new Set(set)); g.levels.set(L, { size: lv.size, cells, edges: new Set(lv.edges) }); }
    for (const [id, rec] of this.edgeCells) g.edgeCells.set(id, { level: rec.level, keys: [...rec.keys] });
    g.removedE = [...this.removedE];
    return g;
  }
}

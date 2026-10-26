// pool-mesh.ts —— 一个几何池的渲染缓存（纪元账本 DT96「拖动预演差量」的渲染那半，2026-10-26 Claude Opus 5.5）。
// user 10-26「做，可以按照初中甚至高中需要的标准需要的算法的思路做」；思路 = WeebPaint 那套（内存 = 唯一真相，显卡上 = 能丢的副本，只更新脏的）搬到 3D：
//   · 每张面一条记录（三角 + 扇内平滑法线 + 两侧材质），每条看得见的边一条记录——贵的活（三角化、法线）只对改过的面做；
//   · 记录按块塞进几张大数组（RegionStore：块 = 一段连续区间；删掉的地方清零 = 退化三角 / 零长线；一块洞过半就整理），
//     改了哪段只报哪段 → 渲染器只上传那段（WebGL2 bufferSubData）；一个池仍是一份几何、绘制次数不变；
//   · 跟哪个内核：原件 / 预演副本 / 撤销快照之间按「克隆族谱 + 改动日志」（kernel/change-log.ts）算出差的编号（diffTo），
//     只重建它们 + 它们顶点周围一圈（平滑法线的扇会变）；族谱断了 / 日志说不知道 = 全量重建。
// 平滑法线 = 每个顶点处按硬边把周围的面分成一扇一扇、在扇内按内角加权（Blender 分裂法线同款）：局部、增量友好；
//   取代旧的「整组并查集 + 整组朝向统一」（那个在一个平滑组跨过硬接缝绕回来的地方会把接缝抹平）。
// 纯数据，零 three（three 只在 render3.ts，build lint）；颜色由宿主注入（调色板在 render3）。
import type { EdgeId, FaceId, Kernel, Pt3, VertexId } from "../kernel/kernel.ts";
import type { ChangeSet } from "../kernel/change-log.ts";
import type { Material } from "../scene/scene.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { faceLeftSign } from "../kernel/flood.ts";
import { inwardAcrossEdge } from "./profile-edges.ts";

// ---------------------------------------------------------------- 区间仓库

export interface AttrSpec { readonly name: string; readonly size: number; /** 空位填什么（缺省 0）。 */ readonly empty?: number; }
type Fill = (a: Record<string, Float32Array>, off: number) => void;
interface Chunk { start: number; cap: number; used: number; holes: number; ids: Set<number>; }

/**
 * 几张同步增长的大数组（每个属性一张，单位 = 顶点或实例），按块分区存一条条记录。改写同长的记录原地写；长度变了 = 挪到最后一块。
 * takeDirty() = 自上次以来改过的单位区间（宿主据此局部上传）+ 是否换过数组（换了 = 宿主重建缓冲）。
 */
export class RegionStore {
  readonly specs: readonly AttrSpec[];
  arrays: Record<string, Float32Array> = {};
  /** 数组容量（单位）。 */
  cap = 0;
  /** 用到的最高单位（绘制范围）。 */
  end = 0;
  private grown = false;
  private dirty: [number, number][] = [];
  private chunks: Chunk[] = [];
  private items = new Map<number, { chunk: number; off: number; len: number; fill: Fill }>();
  private readonly chunkUnits: number;
  constructor(specs: readonly AttrSpec[], chunkUnits: number) { this.specs = specs; this.chunkUnits = chunkUnits; }
  get count(): number { return this.items.size; }
  has(id: number): boolean { return this.items.has(id); }
  put(id: number, len: number, fill: Fill): void {
    const it = this.items.get(id);
    if (it && it.len === len) { it.fill = fill; fill(this.arrays, it.off); this.mark(it.off, len); return; }
    if (it) this.remove(id);
    if (len <= 0) return;
    let ci = this.chunks.length - 1;
    if (ci < 0 || this.chunks[ci].cap - this.chunks[ci].used < len) ci = this.newChunk(Math.max(this.chunkUnits, len));
    const c = this.chunks[ci], off = c.start + c.used;
    c.used += len; c.ids.add(id);
    this.items.set(id, { chunk: ci, off, len, fill });
    fill(this.arrays, off); this.mark(off, len);
    if (off + len > this.end) this.end = off + len;
  }
  remove(id: number): void {
    const it = this.items.get(id);
    if (!it) return;
    this.items.delete(id);
    const c = this.chunks[it.chunk];
    c.ids.delete(id); c.holes += it.len;
    this.clear(it.off, it.len); this.mark(it.off, it.len);
    if (c.holes * 2 > c.cap) this.compact(it.chunk);
  }
  /** 改过的区间（合并、排好序）+ 是否换过数组；取完清零。 */
  takeDirty(): { grown: boolean; ranges: [number, number][] } {
    const g = this.grown, r = this.dirty.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [a, b] of r) { const last = merged[merged.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]); }
    this.dirty = []; this.grown = false;
    return { grown: g, ranges: g ? [] : merged };
  }
  private compact(ci: number): void {
    const c = this.chunks[ci];
    this.clear(c.start, c.used);
    let off = c.start;
    for (const id of c.ids) { const it = this.items.get(id)!; it.off = off; it.fill(this.arrays, off); off += it.len; }
    c.used = off - c.start; c.holes = 0;
    this.mark(c.start, c.start + c.cap > this.end ? this.end - c.start : c.cap);
  }
  private newChunk(cap: number): number {
    const last = this.chunks[this.chunks.length - 1], start = last ? last.start + last.cap : 0;
    if (start + cap > this.cap) this.grow(start + cap);
    this.chunks.push({ start, cap, used: 0, holes: 0, ids: new Set() });
    return this.chunks.length - 1;
  }
  private grow(need: number): void {
    let cap = Math.max(1024, this.cap);
    while (cap < need) cap *= 2;
    for (const s of this.specs) {
      const a = new Float32Array(cap * s.size);
      if (s.empty) a.fill(s.empty);
      const old = this.arrays[s.name];
      if (old) a.set(old);
      this.arrays[s.name] = a;
    }
    this.cap = cap; this.grown = true;
  }
  private clear(off: number, len: number): void { for (const s of this.specs) this.arrays[s.name].fill(s.empty ?? 0, off * s.size, (off + len) * s.size); }
  private mark(off: number, len: number): void { if (len > 0) this.dirty.push([off, off + len]); }
}

// ---------------------------------------------------------------- 记录

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
type RingView = { readonly vids: readonly VertexId[]; readonly edges: readonly { readonly edge: EdgeId }[] };

/** 环上第 j 个顶点的内角（三维）。 */
function cornerAngle(k: Kernel, ring: RingView, j: number): number {
  const m = ring.vids.length, g = k.graph;
  const p = g.pt(ring.vids[j]), u = sub(g.pt(ring.vids[(j - 1 + m) % m]), p), v = sub(g.pt(ring.vids[(j + 1) % m]), p);
  const lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
  return lu > 0 && lv > 0 ? Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (lu * lv)))) : 0;
}
/** 面在顶点 v 处、边 e 之外的另一条环边（vids[i] = edges[i] 的起点）。 */
function otherEdgeAt(k: Kernel, fid: FaceId, e: EdgeId, v: VertexId): EdgeId | null {
  const f = k.face(fid);
  if (!f) return null;
  for (const r of [f.outer, ...f.holes]) {
    const m = r.edges.length;
    for (let i = 0; i < m; i++) {
      if (r.edges[i].edge !== e) continue;
      if (r.vids[i] === v) return r.edges[(i - 1 + m) % m].edge;
      if (r.vids[(i + 1) % m] === v) return r.edges[(i + 1) % m].edge;
    }
  }
  return null;
}
/**
 * 面 fid 外环第 j 个角的平滑法线：从这张面出发，在这个顶点处向两边跨平滑边 / 折线（硬边、边界、非流形就停），把扇里每张面的法向按内角加权；
 * 跨边时按「两张面在共享边上面在左的符号相反 = 朝向一致」统一朝向（kernel/flood.ts faceLeftSign）。结果翻到本面法向那一侧。扇里只有自己 = 平面法向。
 */
export function fanNormal(k: Kernel, fid: FaceId, j: number): Pt3 {
  const f = k.face(fid)!, n = k.planeOf(fid)!.plane.n, ring = f.outer, m = ring.vids.length, v = ring.vids[j];
  const w0 = cornerAngle(k, ring, j);
  let ax = n.x * w0, ay = n.y * w0, az = n.z * w0, crossed = false;
  const seen = new Set<FaceId>([fid]);
  for (const start of [ring.edges[j].edge, ring.edges[(j - 1 + m) % m].edge]) {
    let cur = fid, sign = 1, e = start;
    for (let step = 0; step < 256; step++) {
      if (!(k.isSmooth(e) || k.isFold(e))) break;
      const others = [...new Set(k.graph.edge(e).faceLinks)].filter((x) => x !== cur && k.face(x));
      if (others.length !== 1) break;
      const nx = others[0];
      if (seen.has(nx)) break;
      const la = faceLeftSign(k, cur, e), lb = faceLeftSign(k, nx, e);
      if (la === null || lb === null) break;
      sign *= la * lb < 0 ? 1 : -1;
      seen.add(nx); crossed = true;
      const F = k.face(nx)!, rn = k.planeOf(nx)!.plane.n, jj = F.outer.vids.indexOf(v);
      if (jj >= 0) { const w = cornerAngle(k, F.outer, jj) * sign; ax += rn.x * w; ay += rn.y * w; az += rn.z * w; }
      const ne = otherEdgeAt(k, nx, e, v);
      if (ne === null) break;
      e = ne; cur = nx;
    }
  }
  if (!crossed) return n;
  const l = Math.hypot(ax, ay, az);
  if (l < 1e-12) return n;
  const s = (ax * n.x + ay * n.y + az * n.z) < 0 ? -1 / l : 1 / l;
  return { x: ax * s, y: ay * s, z: az * s };
}

export interface FaceRec {
  /** 每个三角顶点 3 个数（池本地坐标）；绕向统一成绕平面法向 +n 逆时针（两个表面靠 gl_FrontFacing 分正反）。 */
  readonly pos: Float32Array;
  readonly nor: Float32Array;
  readonly mF: Material | null;
  readonly mB: Material | null;
  /** 平面基（贴图 uv = 点乘基 / 贴图物理尺寸）。 */
  readonly u: Pt3; readonly v: Pt3;
}
export function buildFaceRec(k: Kernel, fid: FaceId, matOf: (slot: number | undefined) => Material | null): FaceRec | null {
  const f = k.face(fid), rec = k.planeOf(fid);
  if (!f || !rec || k.isFaceHidden(fid)) return null;
  const g = k.graph, pts: Pt3[] = [], outer: number[] = [], holes: number[][] = [];
  [f.outer, ...f.holes].forEach((r, ri) => {
    const idx: number[] = [];
    for (const v of r.vids) { idx.push(pts.length); pts.push(g.pt(v)); }
    if (ri === 0) outer.push(...idx); else holes.push(idx);
  });
  const n = rec.plane.n, nOuter = f.outer.vids.length;
  const pn = pts.map((_, i) => (i < nOuter ? fanNormal(k, fid, i) : n));
  const tris = triangulateRings(pts, rec.plane, outer, holes);
  const pos = new Float32Array(tris.length * 9), nor = new Float32Array(tris.length * 9);
  let o = 0;
  for (const [a, b0, c0] of tris) {
    const flip = dot(cross(sub(pts[b0], pts[a]), sub(pts[c0], pts[a])), n) < 0;
    const b = flip ? c0 : b0, c = flip ? b0 : c0;
    for (const i of [a, b, c]) { pos[o] = pts[i].x; pos[o + 1] = pts[i].y; pos[o + 2] = pts[i].z; nor[o] = pn[i].x; nor[o + 1] = pn[i].y; nor[o + 2] = pn[i].z; o += 3; }
  }
  return { pos, nor, mF: matOf(k.faceMaterialOf(fid, 0)), mB: matOf(k.faceMaterialOf(fid, 1)), u: rec.basis.u, v: rec.basis.v };
}

export interface EdgeRec { readonly a: Pt3; readonly b: Pt3; readonly loose: boolean; readonly w1: Pt3; readonly w2: Pt3; readonly flag: number; }
/** 看得见的边（软边 / 折线 / 隐藏的不画）一条记录；粗线轮廓要两侧面各自往面里走的方向 + 面数（profile-edges.ts）。 */
export function buildEdgeRec(k: Kernel, eid: EdgeId): EdgeRec | null {
  const g = k.graph;
  if (!g.hasEdge(eid) || k.isSoft(eid) || k.isFold(eid) || k.isEdgeHidden(eid)) return null;
  const e = g.edge(eid), a = g.pt(e.a), b = g.pt(e.b);
  const inward = (fid: FaceId | undefined): Pt3 => (fid === undefined ? { x: 0, y: 0, z: 0 } : inwardAcrossEdge(k, fid, eid, a, b));
  const fl = e.faceLinks.length > 1 ? [...e.faceLinks].sort((x, y) => x - y) : e.faceLinks;   // 按 id 取两张：画面不随链接顺序变
  const w1 = inward(fl[0]), w2 = fl[1] !== undefined ? inward(fl[1]) : w1;
  return { a, b, loose: e.faceLinks.length === 0, w1, w2, flag: Math.min(e.faceLinks.length, 3) };
}

// ---------------------------------------------------------------- 池网格

export type TexSide = "front" | "back" | "double";
export interface PoolMeshEnv {
  /** 槽号 → 材质（scene.materialOfSlot 绑好 definition）。 */
  matOf(slot: number | undefined): Material | null;
  /** 定义的材质槽表签名：只追加 = 照旧；变了别的 = 全量重建。 */
  slotsSig: string;
  faceColor(mat: Material | null, dim: boolean): readonly [number, number, number];
  edgeColor(loose: boolean, dim: boolean): readonly [number, number, number];
  /** 粗线（LineSegments2 实例）还是像素线。 */
  thick: boolean;
}
export interface FaceGroup { readonly key: string; readonly mat: Material | null; readonly side: TexSide | null; readonly store: RegionStore; }

const PLAIN_SPECS: AttrSpec[] = [{ name: "position", size: 3 }, { name: "normal", size: 3 }, { name: "aColor", size: 3 }, { name: "aColorB", size: 3 }, { name: "aColorDim", size: 3 }, { name: "aColorBDim", size: 3 }];
const TEX_SPECS: AttrSpec[] = [{ name: "position", size: 3 }, { name: "normal", size: 3 }, { name: "aColor", size: 3 }, { name: "aColorDim", size: 3 }, { name: "aUv", size: 2 }];
const PIXEL_SPECS: AttrSpec[] = [{ name: "position", size: 3 }, { name: "color", size: 3 }, { name: "colorDim", size: 3 }];
const THICK_SPECS: AttrSpec[] = [{ name: "seg", size: 6 }, { name: "col", size: 6 }, { name: "colDim", size: 6 }, { name: "w1", size: 3 }, { name: "w2", size: 3 }, { name: "flag", size: 1, empty: -1 }];
/** 每块多少单位：面 = 顶点（≈ 5400 个三角一块），线 = 像素线的顶点 / 粗线的实例。 */
const FACE_CHUNK = 16384, LINE_CHUNK = 8192;
const NONE: readonly [number, number, number] = [-1, -1, -1];

export class PoolMesh {
  /** 现在反映的是哪个内核到第几号。 */
  private src: Kernel | null = null;
  private srcSeq = 0;
  private sig = "";
  private thick = false;
  readonly faces = new Map<FaceId, FaceRec>();
  readonly edges = new Map<EdgeId, EdgeRec>();
  /**
   * 缓存反映的每张面 / 每条边的结构（哪几个角、哪几条边 / 两个端点），画不画都记——隐藏的面、软边没有画的记录，
   * 但它们被删 / 被改的时候，要靠这里知道当时连着谁（不然它旁边该重画的漏掉：测试抓到过隐藏面删掉后边的面链接换了序没重建）。
   */
  private faceTopo = new Map<FaceId, { vids: number[]; edges: EdgeId[] }>();
  private edgeEnds = new Map<EdgeId, readonly [number, number]>();
  private faceGroups = new Map<FaceId, string[]>();
  readonly groups = new Map<string, FaceGroup>();
  lines: RegionStore = new RegionStore(PIXEL_SPECS, LINE_CHUNK);
  private matIds = new Map<Material, number>();
  /** 上一次同步：全量还是增量、重建了多少（计时 / 测试用）。 */
  last = { full: true, faces: 0, edges: 0 };

  /** 让缓存反映内核 T（池本地坐标）。返回这次重建了多少。 */
  sync(T: Kernel, env: PoolMeshEnv): { full: boolean; faces: number; edges: number } {
    const sigOk = this.src !== null && (env.slotsSig === this.sig || env.slotsSig.startsWith(this.sig + ","));
    const d = sigOk && env.thick === this.thick ? this.diffTo(T) : null;
    this.sig = env.slotsSig;
    if (!d) return this.last = this.full(T, env);
    const F = new Set(d.faces), E = new Set(d.edges), V = new Set(d.verts);
    for (const fid of d.faces) {
      const old = this.faceTopo.get(fid);
      if (old) { for (const v of old.vids) V.add(v); for (const e of old.edges) E.add(e); }
      const f = T.face(fid);
      if (f) for (const r of [f.outer, ...f.holes]) { for (const v of r.vids) V.add(v); for (const x of r.edges) E.add(x.edge); }
    }
    for (const eid of d.edges) {
      const old = this.edgeEnds.get(eid);
      if (old) { V.add(old[0]); V.add(old[1]); }
      if (T.graph.hasEdge(eid)) { const e = T.graph.edge(eid); V.add(e.a); V.add(e.b); }
    }
    // 顶点周围一圈：法线扇、轮廓线方向都看邻居
    for (const v of V) {
      if (!T.graph.hasVertex(v)) continue;
      for (const eid of T.graph.vertex(v).edges) { E.add(eid); for (const fid of T.graph.edge(eid).faceLinks) F.add(fid); }
    }
    for (const fid of F) { this.noteFace(T, fid); this.writeFace(fid, buildFaceRec(T, fid, (s) => env.matOf(s)), env); }
    for (const eid of E) { this.noteEdge(T, eid); this.writeEdge(eid, buildEdgeRec(T, eid), env); }
    this.src = T; this.srcSeq = T.changes.seq;
    return this.last = { full: false, faces: F.size, edges: E.size };
  }

  /**
   * 现在反映的状态 → 目标 T 之间可能不同的编号：沿克隆族谱找最近的共同祖先 A，把两边各段的日志并起来
   * （每个副本从它的拷贝点起改过的 + A 在两个分叉点之间改过的）。找不到 / 有一段说不知道 = null（全量）。
   */
  private diffTo(T: Kernel): ChangeSet | null {
    const S = this.src;
    if (!S) return null;
    const chain = (K: Kernel, seq: number): { k: Kernel; seq: number }[] => {
      const out = [{ k: K, seq }];
      let c = K;
      for (let i = 0; i < 16; i++) { const p = c.cloneOf; if (!p) break; out.push({ k: p, seq: c.clonedAt }); c = p; }
      return out;
    };
    const cs = chain(S, this.srcSeq), ct = chain(T, T.changes.seq);
    let i = -1, j = -1;
    for (let a = 0; a < cs.length && i < 0; a++) { const b = ct.findIndex((x) => x.k === cs[a].k); if (b >= 0) { i = a; j = b; } }
    if (i < 0) return null;
    const out: ChangeSet = { verts: new Set(), edges: new Set(), faces: new Set() };
    const add = (K: Kernel, from: number, to: number): boolean => {
      const c = K.changes.since(from, to);
      if (!c) return false;
      for (const x of c.verts) out.verts.add(x); for (const x of c.edges) out.edges.add(x); for (const x of c.faces) out.faces.add(x);
      return true;
    };
    for (let m = 0; m < i; m++) if (!add(cs[m].k, cs[m].k.clonedAt, cs[m].seq)) return null;
    for (let m = 0; m < j; m++) if (!add(ct[m].k, ct[m].k.clonedAt, ct[m].seq)) return null;
    const lo = Math.min(cs[i].seq, ct[j].seq), hi = Math.max(cs[i].seq, ct[j].seq);
    if (hi > lo && !add(cs[i].k, lo, hi)) return null;
    return out;
  }

  private full(T: Kernel, env: PoolMeshEnv): { full: boolean; faces: number; edges: number } {
    this.faces.clear(); this.edges.clear(); this.faceTopo.clear(); this.edgeEnds.clear(); this.faceGroups.clear(); this.groups.clear(); this.matIds.clear();
    this.thick = env.thick;
    this.lines = new RegionStore(env.thick ? THICK_SPECS : PIXEL_SPECS, LINE_CHUNK);
    for (const f of T.faces()) { this.noteFace(T, f.id); this.writeFace(f.id, buildFaceRec(T, f.id, (s) => env.matOf(s)), env); }
    for (const e of T.edges()) { this.noteEdge(T, e.id); this.writeEdge(e.id, buildEdgeRec(T, e.id), env); }
    this.src = T; this.srcSeq = T.changes.seq;
    return { full: true, faces: this.faces.size, edges: this.edges.size };
  }

  private noteFace(T: Kernel, fid: FaceId): void {
    const f = T.face(fid);
    if (!f) { this.faceTopo.delete(fid); return; }
    const vids: number[] = [], edges: EdgeId[] = [];
    for (const r of [f.outer, ...f.holes]) { for (const v of r.vids) vids.push(v); for (const x of r.edges) edges.push(x.edge); }
    this.faceTopo.set(fid, { vids, edges });
  }
  private noteEdge(T: Kernel, eid: EdgeId): void {
    if (!T.graph.hasEdge(eid)) { this.edgeEnds.delete(eid); return; }
    const e = T.graph.edge(eid); this.edgeEnds.set(eid, [e.a, e.b]);
  }

  private group(key: string, mat: Material | null, side: TexSide | null): FaceGroup {
    let g = this.groups.get(key);
    if (!g) { g = { key, mat, side, store: new RegionStore(side ? TEX_SPECS : PLAIN_SPECS, FACE_CHUNK) }; this.groups.set(key, g); }
    return g;
  }
  private matKey(m: Material): number { let i = this.matIds.get(m); if (i === undefined) { i = this.matIds.size; this.matIds.set(m, i); } return i; }

  /** 一张面落进哪几组（同 buildKernelGeom 的规则）：两侧同一张贴图 = 双面贴图组；各自的贴图 = 正 / 背贴图组；有一侧不是贴图 = 纯色组（贴图那侧填 −1 = 纯色网格不画）。 */
  private writeFace(fid: FaceId, rec: FaceRec | null, env: PoolMeshEnv): void {
    const oldKeys = this.faceGroups.get(fid) ?? [];
    const parts: { key: string; mat: Material | null; side: TexSide | null; fill: Fill }[] = [];
    if (rec) {
      const tF = rec.mF?.texture ? rec.mF : null, tB = rec.mB?.texture ? rec.mB : null;
      const tex = (m: Material, side: TexSide): void => {
        const c = env.faceColor(m, false), cd = env.faceColor(m, true), [tw, th] = m.texture!.sizeM;
        parts.push({ key: `tex:${this.matKey(m)}:${side}`, mat: m, side, fill: (a, off) => {
          a.position.set(rec.pos, off * 3); a.normal.set(rec.nor, off * 3);
          const nv = rec.pos.length / 3;
          for (let i = 0; i < nv; i++) {
            const o3 = (off + i) * 3, o2 = (off + i) * 2, x = rec.pos[i * 3], y = rec.pos[i * 3 + 1], z = rec.pos[i * 3 + 2];
            a.aColor[o3] = c[0]; a.aColor[o3 + 1] = c[1]; a.aColor[o3 + 2] = c[2];
            a.aColorDim[o3] = cd[0]; a.aColorDim[o3 + 1] = cd[1]; a.aColorDim[o3 + 2] = cd[2];
            a.aUv[o2] = (x * rec.u.x + y * rec.u.y + z * rec.u.z) / (tw || 1); a.aUv[o2 + 1] = (x * rec.v.x + y * rec.v.y + z * rec.v.z) / (th || 1);
          }
        } });
      };
      if (tF && tF === tB) tex(tF, "double");
      else {
        if (tF) tex(tF, "front");
        if (tB) tex(tB, "back");
        if (!tF || !tB) {
          const cF = tF ? NONE : env.faceColor(rec.mF, false), cB = tB ? NONE : env.faceColor(rec.mB, false);
          const cFd = tF ? NONE : env.faceColor(rec.mF, true), cBd = tB ? NONE : env.faceColor(rec.mB, true);
          parts.push({ key: "plain", mat: null, side: null, fill: (a, off) => {
            a.position.set(rec.pos, off * 3); a.normal.set(rec.nor, off * 3);
            const nv = rec.pos.length / 3;
            for (let i = 0; i < nv; i++) {
              const o = (off + i) * 3;
              a.aColor[o] = cF[0]; a.aColor[o + 1] = cF[1]; a.aColor[o + 2] = cF[2];
              a.aColorB[o] = cB[0]; a.aColorB[o + 1] = cB[1]; a.aColorB[o + 2] = cB[2];
              a.aColorDim[o] = cFd[0]; a.aColorDim[o + 1] = cFd[1]; a.aColorDim[o + 2] = cFd[2];
              a.aColorBDim[o] = cBd[0]; a.aColorBDim[o + 1] = cBd[1]; a.aColorBDim[o + 2] = cBd[2];
            }
          } });
        }
      }
    }
    for (const k of oldKeys) if (!parts.some((p) => p.key === k)) this.groups.get(k)?.store.remove(fid);
    for (const p of parts) this.group(p.key, p.mat, p.side).store.put(fid, rec!.pos.length / 3, p.fill);
    if (rec) { this.faces.set(fid, rec); this.faceGroups.set(fid, parts.map((p) => p.key)); }
    else { this.faces.delete(fid); this.faceGroups.delete(fid); }
  }

  private writeEdge(eid: EdgeId, rec: EdgeRec | null, env: PoolMeshEnv): void {
    if (!rec) { this.lines.remove(eid); this.edges.delete(eid); return; }
    this.edges.set(eid, rec);
    const c = env.edgeColor(rec.loose, false), cd = env.edgeColor(rec.loose, true);
    if (this.thick) {
      this.lines.put(eid, 1, (a, off) => {
        const s6 = off * 6;
        a.seg[s6] = rec.a.x; a.seg[s6 + 1] = rec.a.y; a.seg[s6 + 2] = rec.a.z; a.seg[s6 + 3] = rec.b.x; a.seg[s6 + 4] = rec.b.y; a.seg[s6 + 5] = rec.b.z;
        for (let q = 0; q < 6; q++) { a.col[s6 + q] = c[q % 3]; a.colDim[s6 + q] = cd[q % 3]; }
        const s3 = off * 3;
        a.w1[s3] = rec.w1.x; a.w1[s3 + 1] = rec.w1.y; a.w1[s3 + 2] = rec.w1.z; a.w2[s3] = rec.w2.x; a.w2[s3 + 1] = rec.w2.y; a.w2[s3 + 2] = rec.w2.z;
        a.flag[off] = rec.flag;
      });
    } else {
      this.lines.put(eid, 2, (a, off) => {
        const o = off * 3;
        a.position[o] = rec.a.x; a.position[o + 1] = rec.a.y; a.position[o + 2] = rec.a.z; a.position[o + 3] = rec.b.x; a.position[o + 4] = rec.b.y; a.position[o + 5] = rec.b.z;
        for (let q = 0; q < 6; q++) { a.color[o + q] = c[q % 3]; a.colorDim[o + q] = cd[q % 3]; }
      });
    }
  }
}

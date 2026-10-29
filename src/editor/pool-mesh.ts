// pool-mesh.ts —— 一个几何池的渲染缓存（纪元账本 DT96「拖动预演差量」的渲染那半，2026-10-26 Claude Opus 5.5）。
// user 10-26「做，可以按照初中甚至高中需要的标准需要的算法的思路做」；思路 = WeebPaint 那套（内存 = 唯一真相，显卡上 = 能丢的副本，只更新脏的）搬到 3D：
//   · 每张面一条记录（三角 + 扇内平滑法线 + 两侧材质），每条看得见的边一条记录——贵的活（三角化、法线）只对改过的面做；
//   · 记录塞进几张大数组：面按块分区（RegionStore；删掉的地方清零 = 退化三角，一块洞过半就整理），线永远挤紧（DenseStore；删一条 = 最后一条搬过来），
//     改了哪段只报哪段 → 渲染器只上传那段（WebGL2 bufferSubData）；一个池仍是一份几何、绘制次数不变；
//   · 跟哪个内核：原件 / 预演副本 / 撤销快照之间按「克隆族谱 + 改动日志」（kernel/change-log.ts）算出差的编号（diffTo），
//     只重建它们 + 它们顶点周围一圈（平滑法线的扇会变）；族谱断了 / 日志说不知道 = 全量重建。
// 平滑法线 = 每个顶点处按硬边把周围的面分成一扇一扇、在扇内按内角加权（Blender 分裂法线同款）：局部、增量友好；
//   取代旧的「整组并查集 + 整组朝向统一」（那个在一个平滑组跨过硬接缝绕回来的地方会把接缝抹平）。
// 纯数据，零 three（three 只在 render3.ts，build lint）；颜色由宿主注入（调色板在 render3）。
import type { EdgeId, FaceId, Pt3, VertexId } from "../kernel/kernel.ts";
import type { KernelView } from "../scene/kernel-view.ts";
import type { ChangeSet, Lineage } from "../kernel/change-log.ts";
import type { Material } from "../scene/scene.ts";
import type { GeomView } from "../scene/world-view.ts";
import { triangulateRings } from "../format/triangulate.ts";
import { inwardAcrossEdge } from "./profile-edges.ts";

// ---------------------------------------------------------------- 区间仓库

/** 属性的存法：f32 = 浮点（位置 / 粗线端点 / uv）；i16n / i8n = 归一化整数（法线 / 面颜色；显卡读成 −1…1 的浮点，省一半到四分之三的内存）。 */
export type AttrType = "f32" | "i16n" | "i8n";
export interface AttrSpec { readonly name: string; readonly size: number; readonly type?: AttrType; }
export type AttrArray = Float32Array | Int16Array | Int8Array;
type Fill = (a: Record<string, AttrArray>, off: number) => void;
interface Chunk { start: number; cap: number; used: number; holes: number; ids: Set<number>; }
const makeArray = (t: AttrType | undefined, n: number): AttrArray => (t === "i16n" ? new Int16Array(n) : t === "i8n" ? new Int8Array(n) : new Float32Array(n));
/** 浮点 → 归一化整数（法线 ×32767、颜色 ×127；−1 = 「这一侧归贴图网格画」的记号，存成 −127 读回来正好 −1）。 */
export const q16 = (x: number): number => Math.round(Math.max(-1, Math.min(1, x)) * 32767);
export const q8 = (x: number): number => Math.round(Math.max(-1, Math.min(1, x)) * 127);

/** 几张同步增长的大数组（每个属性一张，单位 = 顶点或实例）+ 改过的区间（宿主据此局部上传）。 */
abstract class ArrayStore {
  readonly specs: readonly AttrSpec[];
  arrays: Record<string, AttrArray> = {};
  /** 数组容量（单位）。 */
  cap = 0;
  /** 用到的最高单位（绘制范围）。 */
  end = 0;
  protected grown = false;
  protected dirty: [number, number][] = [];
  constructor(specs: readonly AttrSpec[]) { this.specs = specs; }
  /** 改过的区间（合并、排好序）+ 是否换过数组（换了 = 宿主重建缓冲）；取完清零。 */
  takeDirty(): { grown: boolean; ranges: [number, number][] } {
    const g = this.grown, r = this.dirty.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const [a, b] of r) { const last = merged[merged.length - 1]; if (last && a <= last[1]) last[1] = Math.max(last[1], b); else merged.push([a, b]); }
    this.dirty = []; this.grown = false;
    return { grown: g, ranges: g ? [] : merged };
  }
  /** 一份数组占多少字节（容量 / 用到的；内存账用）。 */
  bytes(): { cap: number; used: number } {
    let per = 0;
    for (const s of this.specs) per += s.size * (s.type === "i16n" ? 2 : s.type === "i8n" ? 1 : 4);
    return { cap: this.cap * per, used: this.end * per };
  }
  /** 换成恰好 cap 个单位的数组（长大按 1.5 倍；收紧 = 全量建完之后）。 */
  protected realloc(cap: number): void {
    for (const s of this.specs) {
      const a = makeArray(s.type, cap * s.size), old = this.arrays[s.name];
      if (old) (a as Float32Array).set((old.length > a.length ? old.subarray(0, a.length) : old) as Float32Array);   // 同一种类型的数组之间拷
      this.arrays[s.name] = a;
    }
    this.cap = cap; this.grown = true;
  }
  protected grow(need: number): void { this.realloc(Math.max(need, 1024, Math.ceil(this.cap * 1.5))); }
  protected clear(off: number, len: number): void { for (const s of this.specs) this.arrays[s.name].fill(0, off * s.size, (off + len) * s.size); }
  protected mark(off: number, len: number): void { if (len > 0) this.dirty.push([off, off + len]); }
}

/**
 * 面用：按块分区存长短不一的记录（一张面几个三角不定）。改写同长的记录原地写；长度变了 = 挪到最后一块。
 * 删掉的地方清零 = 退化三角（显卡保证不出像素）；一块洞过半就整理（字节原样往前搬，不用重算）。
 * 每条记录只记「从第几个单位起、多长」两个整数（不留回调、不留副本：内存只花在显卡要的那几张数组上）。
 * 对齐：显卡从第 0 个顶点起每 3 个当一个三角，所以块的起点 / 容量都是 align（= 3）的倍数、记录长度也是——
 * 不然第二块起的三角整体错一个顶点（2026-10-26 加压对拍抓到：块容量 16384 不是 3 的倍数，大模型从第二块起全画花）。
 */
export class RegionStore extends ArrayStore {
  private chunks: Chunk[] = [];
  private offOf = new Map<number, number>();
  private lenOf = new Map<number, number>();
  private readonly chunkUnits: number;
  private readonly align: number;
  constructor(specs: readonly AttrSpec[], chunkUnits: number, align = 1) { super(specs); this.align = align; this.chunkUnits = this.up(chunkUnits); }
  private up(n: number): number { return Math.ceil(n / this.align) * this.align; }
  get count(): number { return this.offOf.size; }
  has(id: number): boolean { return this.offOf.has(id); }
  /** 这个 id 占的段（顶点偏移 / 顶点数）；没有 = null。 */
  range(id: number): readonly [number, number] | null { const off = this.offOf.get(id); return off === undefined ? null : [off, this.lenOf.get(id)!]; }
  put(id: number, len: number, fill: Fill): void {
    const off0 = this.offOf.get(id);
    if (off0 !== undefined && this.lenOf.get(id) === len) { fill(this.arrays, off0); this.mark(off0, len); return; }
    if (off0 !== undefined) this.remove(id);
    if (len <= 0) return;
    let ci = this.chunks.length - 1;
    if (ci < 0 || this.chunks[ci].cap - this.chunks[ci].used < len) ci = this.newChunk(Math.max(this.chunkUnits, this.up(len)));
    const c = this.chunks[ci], off = c.start + c.used;
    c.used += len; c.ids.add(id);
    this.offOf.set(id, off); this.lenOf.set(id, len);
    fill(this.arrays, off); this.mark(off, len);
    if (off + len > this.end) this.end = off + len;
  }
  remove(id: number): void {
    const off = this.offOf.get(id);
    if (off === undefined) return;
    const len = this.lenOf.get(id)!, ci = this.chunkAt(off), c = this.chunks[ci];
    this.offOf.delete(id); this.lenOf.delete(id);
    c.ids.delete(id); c.holes += len;
    this.clear(off, len); this.mark(off, len);
    if (c.holes * 2 > c.cap) this.compact(ci);
  }
  /** 全量建完：最后一块收紧到用到的 + 八分之一余量（之后加面先用余量，不够再按 1.5 倍长）。 */
  trim(): void {
    const c = this.chunks[this.chunks.length - 1];
    if (!c) return;
    c.cap = Math.min(c.cap, this.up(c.used + Math.max(256, c.used >> 3)));
    const cap = c.start + c.cap;
    if (cap < this.cap) this.realloc(cap);
  }
  private chunkAt(off: number): number {
    let lo = 0, hi = this.chunks.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (this.chunks[mid].start <= off) lo = mid; else hi = mid - 1; }
    return lo;
  }
  private compact(ci: number): void {
    const c = this.chunks[ci];
    const items = [...c.ids].map((id) => [id, this.offOf.get(id)!] as const).sort((a, b) => a[1] - b[1]);
    let off = c.start;
    for (const [id, from] of items) {
      const len = this.lenOf.get(id)!;
      if (from !== off) for (const s of this.specs) this.arrays[s.name].copyWithin(off * s.size, from * s.size, (from + len) * s.size);
      this.offOf.set(id, off); off += len;
    }
    this.clear(off, c.start + c.used - off);
    this.mark(c.start, c.used);
    c.used = off - c.start; c.holes = 0;
  }
  private newChunk(cap: number): number {
    const last = this.chunks[this.chunks.length - 1], start = last ? last.start + last.cap : 0;
    if (start + cap > this.cap) this.grow(start + cap);
    this.chunks.push({ start, cap, used: 0, holes: 0, ids: new Set() });
    return this.chunks.length - 1;
  }
}

/**
 * 线用：每条记录一样长（一条边 = 一个实例 / 两个顶点），永远挤紧——删一条 = 把最后一条搬进它的位置（O(1)）。
 * 不留洞：零长线有的显卡会出一个点、粗线的零长段会在原点画一个方块，所以线不能像面那样靠「清零 = 不画」。
 */
export class DenseStore extends ArrayStore {
  private readonly unit: number;
  private slotOf = new Map<number, number>();
  private idAt: number[] = [];
  constructor(specs: readonly AttrSpec[], unit: number) { super(specs); this.unit = unit; }
  get count(): number { return this.idAt.length; }
  has(id: number): boolean { return this.slotOf.has(id); }
  put(id: number, fill: Fill): void {
    let slot = this.slotOf.get(id);
    if (slot === undefined) {
      slot = this.idAt.length;
      if ((slot + 1) * this.unit > this.cap) this.grow((slot + 1) * this.unit);
      this.idAt.push(id); this.slotOf.set(id, slot); this.end = this.idAt.length * this.unit;
    }
    fill(this.arrays, slot * this.unit); this.mark(slot * this.unit, this.unit);
  }
  remove(id: number): void {
    const slot = this.slotOf.get(id);
    if (slot === undefined) return;
    const last = this.idAt.length - 1, u = this.unit;
    if (slot !== last) {
      const moved = this.idAt[last];
      for (const s of this.specs) this.arrays[s.name].copyWithin(slot * u * s.size, last * u * s.size, (last + 1) * u * s.size);
      this.idAt[slot] = moved; this.slotOf.set(moved, slot); this.mark(slot * u, u);
    }
    this.clear(last * u, u);
    this.idAt.pop(); this.slotOf.delete(id); this.end = this.idAt.length * u;
  }
  /** 全量建完：收紧到用到的 + 八分之一余量。 */
  trim(): void { const cap = this.end + Math.max(256, this.end >> 3); if (cap < this.cap) this.realloc(cap); }
}

// ---------------------------------------------------------------- 记录

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
export { fanNormal, type FanView } from "../scene/fan-normal.ts";   // 2026-10-28 搬去 scene/（导出也用）；这里照旧导出，老引用不用改
import { fanNormal } from "../scene/fan-normal.ts";

export interface FaceRec {
  /** 每个三角顶点 3 个数（池本地坐标）；绕向统一成绕平面法向 +n 逆时针（两个表面靠 gl_FrontFacing 分正反）。 */
  readonly pos: Float32Array;
  readonly nor: Float32Array;
  readonly mF: Material | null;
  readonly mB: Material | null;
  /** 平面基（贴图 uv = 点乘基 / 贴图物理尺寸）。 */
  readonly u: Pt3; readonly v: Pt3;
}
export function buildFaceRec(k: KernelView, fid: FaceId, matOf: (slot: number | undefined) => Material | null): FaceRec | null {
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
export function buildEdgeRec(k: KernelView, eid: EdgeId): EdgeRec | null {
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
  /** 定义的材质槽表签名（每个槽的材质身份，逗号连）：一边是另一边的前缀 = 增量；别的变化 = 全量重建。 */
  slotsSig: string;
  faceColor(mat: Material | null, dim: boolean): readonly [number, number, number];
  edgeColor(loose: boolean, dim: boolean): readonly [number, number, number];
  /** 粗线（LineSegments2 实例）还是像素线。 */
  thick: boolean;
  /** 单面的身体（mesh）：渲染剔背面（render3 换 FrontSide 材质）。 */
  singleSided: boolean;
}
export interface FaceGroup { readonly key: string; readonly mat: Material | null; readonly side: TexSide | null; readonly store: RegionStore; }

// 一个纯色顶点 = 位置 12 + 法线 6 + 四个颜色 12 = 30 字节（全浮点时 72）；面颜色是 sRGB 里的值，八位够（法线十六位）
const PLAIN_SPECS: AttrSpec[] = [{ name: "position", size: 3 }, { name: "normal", size: 3, type: "i16n" }, { name: "aColor", size: 3, type: "i8n" }, { name: "aColorB", size: 3, type: "i8n" }, { name: "aColorDim", size: 3, type: "i8n" }, { name: "aColorBDim", size: 3, type: "i8n" }];
const TEX_SPECS: AttrSpec[] = [{ name: "position", size: 3 }, { name: "normal", size: 3, type: "i16n" }, { name: "aColor", size: 3, type: "i8n" }, { name: "aColorDim", size: 3, type: "i8n" }, { name: "aUv", size: 2 }];
// 线的颜色是线性空间的值（THREE.Color），暗处八位会出台阶 → 留浮点（线比面少）
const PIXEL_SPECS: AttrSpec[] = [{ name: "position", size: 3 }, { name: "color", size: 3 }, { name: "colorDim", size: 3 }];
const THICK_SPECS: AttrSpec[] = [{ name: "seg", size: 6 }, { name: "col", size: 6 }, { name: "colDim", size: 6 }, { name: "w1", size: 3 }, { name: "w2", size: 3 }, { name: "flag", size: 1 }];
/** 面每块多少个顶点（= 5461 个三角；3 的倍数，见 RegionStore 的对齐）。 */
const FACE_CHUNK = 16383;
const NONE: readonly [number, number, number] = [-1, -1, -1];

/** 一条面记录的位置（浮点）和法线（十六位）写进仓库第 off 个单位起。 */
function writeGeom(a: Record<string, AttrArray>, off: number, rec: FaceRec): void {
  (a.position as Float32Array).set(rec.pos, off * 3);
  const nor = a.normal, o = off * 3;
  for (let i = 0; i < rec.nor.length; i++) nor[o + i] = q16(rec.nor[i]);
}

export class PoolMesh {
  /** 现在反映的是哪个内核到第几号。 */
  private src: KernelView | null = null;
  private srcSeq = 0;
  /** 画的那一刻那份日志的族谱（2026-10-27 Opus 5.5）：提交 / 撤销会在内核对象之间整份换日志（swapTablesWith / swapWith），事后再读 src.changes 拿到的是换过的那份 → 差算错、该重建的没重建。所以画的时候就把族谱存下来。 */
  private srcLin: { data: unknown; seq: number }[] = [];
  private sig = "";
  private thick = false;
  /** 现在反映的池是不是单面（渲染器据此挑剔背面的材质）。 */
  singleSided = false;
  /**
   * 缓存反映的每张面当时的环边（画不画都记——隐藏的面没有画的记录）：面被删 / 被改的时候，靠这里知道它当时挨着哪些边，
   * 那些边的面链接变了、边两头的法线扇也可能变（日志只记了面）。只记边编号：顶点从边的两头来（边被删了 = 日志里有那条边 + 它两侧的面）。
   */
  private faceTopo = new Map<FaceId, EdgeId[]>();
  /** 每张面落在哪组（绝大多数一组 = 一个字符串；两侧各自贴图 = 数组）。 */
  private faceGroups = new Map<FaceId, string | string[]>();
  readonly groups = new Map<string, FaceGroup>();
  lines = new DenseStore(PIXEL_SPECS, 2);
  private matIds = new Map<Material, number>();
  /** 现在反映的是哪个内核（渲染器挑「本来就画着它的那份」用）。 */
  get source(): KernelView | null { return this.src; }
  /** 上一次同步：全量还是增量、重建了多少（计时 / 测试用）。 */
  last = { full: true, faces: 0, edges: 0 };

  /** 让缓存反映内核 T（池本地坐标）。返回这次重建了多少。 */
  sync(T: KernelView, env: PoolMeshEnv): { full: boolean; faces: number; edges: number } {
    // 材质槽表：一边是另一边的前缀（加了槽 / 撤销了加槽）= 共同那段槽号 → 材质不变，用了多出来那段槽号的面都在差里（换槽号 = 改面层，日志记着）
    const pre = (x: string, y: string): boolean => x === "" || y === x || y.startsWith(x + ",");
    const sigOk = this.src !== null && (pre(this.sig, env.slotsSig) || pre(env.slotsSig, this.sig));
    const d = sigOk && env.thick === this.thick && env.singleSided === this.singleSided ? this.diffTo(T) : null;
    this.sig = env.slotsSig;
    if (!d) return this.last = this.full(T, env);
    const F = new Set(d.faces), E = new Set(d.edges), V = new Set(d.verts);
    for (const fid of d.faces) {
      const old = this.faceTopo.get(fid);
      if (old) for (const e of old) E.add(e);
      const f = T.face(fid);
      if (f) for (const r of [f.outer, ...f.holes]) { for (const v of r.vids) V.add(v); for (const x of r.edges) E.add(x.edge); }
    }
    for (const eid of E) if (T.graph.hasEdge(eid)) { const e = T.graph.edge(eid); V.add(e.a); V.add(e.b); }
    // 顶点周围一圈：法线扇、轮廓线方向都看邻居
    for (const v of V) {
      if (!T.graph.hasVertex(v)) continue;
      for (const eid of T.graph.vertex(v).edges) { E.add(eid); for (const fid of T.graph.edge(eid).faceLinks) F.add(fid); }
    }
    for (const fid of F) { this.noteFace(T, fid); this.writeFace(fid, buildFaceRec(T, fid, (s) => env.matOf(s)), env); }
    for (const eid of E) this.writeEdge(eid, buildEdgeRec(T, eid), env);
    this.src = T; this.srcSeq = T.changes.seq; this.srcLin = T.changes.lineage();
    return this.last = { full: false, faces: F.size, edges: E.size };
  }

  /**
   * 现在反映的状态 → 目标 T 之间可能不同的编号：沿族谱（ChangeLog.lineage：每格 = 一份日志数据 + 到第几号）找最近的共同祖先，
   * 把两边各段的日志并起来（每个后代从它分出来那号起改过的 + 共同祖先在两个分叉点之间改过的）。找不到 / 有一段说不知道 = null（全量）。
   */
  private diffTo(T: KernelView): ChangeSet | null {
    const S = this.src;
    if (!S) return null;
    const cs = this.srcLin.slice() as ReturnType<typeof T.changes.lineage>, ct = T.changes.lineage();   // 缓存反映的是画那一刻的那份日志（不是 S 现在挂着的那份）
    if (!cs.length) return null;
    let i = -1, j = -1;
    for (let a = 0; a < cs.length && i < 0; a++) { const b = ct.findIndex((x) => x.data === cs[a].data); if (b >= 0) { i = a; j = b; } }
    if (i < 0) return null;
    const out: ChangeSet = { verts: new Set(), edges: new Set(), faces: new Set() };
    const add = (L: Lineage, from: number, to: number): boolean => {
      const c = L.data.since(from, to);
      if (!c) return false;
      for (const x of c.verts) out.verts.add(x); for (const x of c.edges) out.edges.add(x); for (const x of c.faces) out.faces.add(x);
      return true;
    };
    for (let m = 0; m < i; m++) if (!add(cs[m], cs[m].data.start, cs[m].seq)) return null;
    for (let m = 0; m < j; m++) if (!add(ct[m], ct[m].data.start, ct[m].seq)) return null;
    const lo = Math.min(cs[i].seq, ct[j].seq), hi = Math.max(cs[i].seq, ct[j].seq);
    if (hi > lo && !add(cs[i], lo, hi)) return null;
    return out;
  }

  private full(T: KernelView, env: PoolMeshEnv): { full: boolean; faces: number; edges: number } {
    this.faceTopo.clear(); this.faceGroups.clear(); this.groups.clear(); this.matIds.clear();
    this.thick = env.thick; this.singleSided = env.singleSided;
    this.lines = new DenseStore(env.thick ? THICK_SPECS : PIXEL_SPECS, env.thick ? 1 : 2);
    for (const f of T.faces()) { this.noteFace(T, f.id); this.writeFace(f.id, buildFaceRec(T, f.id, (s) => env.matOf(s)), env); }
    for (const e of T.edges()) this.writeEdge(e.id, buildEdgeRec(T, e.id), env);
    for (const g of this.groups.values()) g.store.trim();
    this.lines.trim();
    this.src = T; this.srcSeq = T.changes.seq; this.srcLin = T.changes.lineage();
    return { full: true, faces: this.faceGroups.size, edges: this.lines.count };
  }

  /** 一张面在各组里占的段（顶点偏移 / 顶点数；两侧材质不同的面在两组里）：标记（选中 / 悬停）按段换材质用（窄接口刀 b）。 */
  faceRanges(fid: FaceId): { key: string; off: number; len: number }[] {
    const k = this.faceGroups.get(fid);
    if (k === undefined) return [];
    const out: { key: string; off: number; len: number }[] = [];
    for (const key of typeof k === "string" ? [k] : k) { const r = this.groups.get(key)?.store.range(fid); if (r) out.push({ key, off: r[0], len: r[1] }); }
    return out;
  }
  private noteFace(T: KernelView, fid: FaceId): void {
    const f = T.face(fid);
    if (!f) { this.faceTopo.delete(fid); return; }
    const edges: EdgeId[] = [];
    for (const r of [f.outer, ...f.holes]) for (const x of r.edges) edges.push(x.edge);
    this.faceTopo.set(fid, edges);
  }

  private group(key: string, mat: Material | null, side: TexSide | null): FaceGroup {
    let g = this.groups.get(key);
    if (!g) { g = { key, mat, side, store: new RegionStore(side ? TEX_SPECS : PLAIN_SPECS, FACE_CHUNK, 3) }; this.groups.set(key, g); }
    return g;
  }
  private matKey(m: Material): number { let i = this.matIds.get(m); if (i === undefined) { i = this.matIds.size; this.matIds.set(m, i); } return i; }

  /** 一张面落进哪几组（同 buildKernelGeom 的规则）：两侧同一张贴图 = 双面贴图组；各自的贴图 = 正 / 背贴图组；有一侧不是贴图 = 纯色组（贴图那侧填 −1 = 纯色网格不画）。 */
  private writeFace(fid: FaceId, rec: FaceRec | null, env: PoolMeshEnv): void {
    const ok0 = this.faceGroups.get(fid), oldKeys = ok0 === undefined ? [] : typeof ok0 === "string" ? [ok0] : ok0;
    const parts: { key: string; mat: Material | null; side: TexSide | null; fill: Fill }[] = [];
    if (rec) {
      const tF = rec.mF?.texture ? rec.mF : null, tB = rec.mB?.texture ? rec.mB : null;
      const tex = (m: Material, side: TexSide): void => {
        const c = env.faceColor(m, false), cd = env.faceColor(m, true), [tw, th] = m.texture!.sizeM;
        const qc = c.map(q8), qd = cd.map(q8);
        parts.push({ key: `tex:${this.matKey(m)}:${side}`, mat: m, side, fill: (a, off) => {
          writeGeom(a, off, rec);
          const nv = rec.pos.length / 3;
          for (let i = 0; i < nv; i++) {
            const o3 = (off + i) * 3, o2 = (off + i) * 2, x = rec.pos[i * 3], y = rec.pos[i * 3 + 1], z = rec.pos[i * 3 + 2];
            a.aColor[o3] = qc[0]; a.aColor[o3 + 1] = qc[1]; a.aColor[o3 + 2] = qc[2];
            a.aColorDim[o3] = qd[0]; a.aColorDim[o3 + 1] = qd[1]; a.aColorDim[o3 + 2] = qd[2];
            a.aUv[o2] = (x * rec.u.x + y * rec.u.y + z * rec.u.z) / (tw || 1); a.aUv[o2 + 1] = (x * rec.v.x + y * rec.v.y + z * rec.v.z) / (th || 1);
          }
        } });
      };
      if (tF && tF === tB) tex(tF, "double");
      else {
        if (tF) tex(tF, "front");
        if (tB) tex(tB, "back");
        if (!tF || !tB) {
          const cF = (tF ? NONE : env.faceColor(rec.mF, false)).map(q8), cB = (tB ? NONE : env.faceColor(rec.mB, false)).map(q8);
          const cFd = (tF ? NONE : env.faceColor(rec.mF, true)).map(q8), cBd = (tB ? NONE : env.faceColor(rec.mB, true)).map(q8);
          parts.push({ key: "plain", mat: null, side: null, fill: (a, off) => {
            writeGeom(a, off, rec);
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
    if (parts.length) this.faceGroups.set(fid, parts.length === 1 ? parts[0].key : parts.map((p) => p.key));
    else this.faceGroups.delete(fid);
  }

  private writeEdge(eid: EdgeId, rec: EdgeRec | null, env: PoolMeshEnv): void {
    if (!rec) { this.lines.remove(eid); return; }
    const c = env.edgeColor(rec.loose, false), cd = env.edgeColor(rec.loose, true);
    if (this.thick) {
      this.lines.put(eid, (a, off) => {
        const s6 = off * 6;
        a.seg[s6] = rec.a.x; a.seg[s6 + 1] = rec.a.y; a.seg[s6 + 2] = rec.a.z; a.seg[s6 + 3] = rec.b.x; a.seg[s6 + 4] = rec.b.y; a.seg[s6 + 5] = rec.b.z;
        for (let q = 0; q < 6; q++) { a.col[s6 + q] = c[q % 3]; a.colDim[s6 + q] = cd[q % 3]; }
        const s3 = off * 3;
        a.w1[s3] = rec.w1.x; a.w1[s3 + 1] = rec.w1.y; a.w1[s3 + 2] = rec.w1.z; a.w2[s3] = rec.w2.x; a.w2[s3 + 1] = rec.w2.y; a.w2[s3 + 2] = rec.w2.z;
        a.flag[off] = rec.flag;
      });
    } else {
      this.lines.put(eid, (a, off) => {
        const o = off * 3;
        a.position[o] = rec.a.x; a.position[o + 1] = rec.a.y; a.position[o + 2] = rec.a.z; a.position[o + 3] = rec.b.x; a.position[o + 4] = rec.b.y; a.position[o + 5] = rec.b.z;
        for (let q = 0; q < 6; q++) { a.color[o + q] = c[q % 3]; a.colorDim[o + q] = cd[q % 3]; }
      });
    }
  }
}

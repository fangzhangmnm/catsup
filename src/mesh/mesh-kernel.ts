// mesh/mesh-kernel.ts —— mesh 内核（自由建模的身体；提案 ai-docs/20261027-mesh-kernel-proposal.md §1–§2，user 10-27 拍：另做网格内核、列式 + 纯函数、
// 面 = 简单顶点环（任意边数、允许不平、不带洞、单面）、顶点 id 寻址、没有几何公理只有拓扑不变量）。created 2026-10-27 by Claude Fable 5.1
//
// 列式：所有表都是定长类型数组 + 活跃位图 + 空闲表（id = 下标，删了不挪；复用取最小空位 = 确定性）。邻接见下一行。
// 邻接（点 → 边、边 → 面）W-11 起增量维护：增删一条边 / 一张面只碰它自己的几个格子，查询 O(度数)；只改坐标的算子不碰它（软挪 / 雕每帧只写 pos）。
// 不变量（test/mesh-kernel.test.ts 逐算子查）：(M1) 活面的环 ≥ 3 个不同的活顶点、环里没有重复顶点 (M2) 环上相邻顶点对都在边表里、边表里的边至少属于一张面或标为裸线
// (M3) 标记只在活边上 (M4) 封闭流形块 V − E + F = 2 − 2g（只对流形块查）(M5) 删了的 id 不被任何活元素引用 (M6) 同算子在克隆上跑 = 同结果。
// 这里只有数据 + 查询 + 最基本的生长 / 删除原语；拓扑算子在 mesh/ops/*.ts（每个一个文件，可扔）。
// 角上的一列数 + 面的来历（2026-11-10 Claude Opus 5.5，贴图主线 1-2）：内核多一张「列」的表（和 loopVert 平行，NaN = 这个角没值）；
// addFace / setFaceRing 必须交代来历（mesh/corner-columns.ts 的五种，那一段代码只有一份）。没有列的网格体：每次只多一个分支，行为逐字不变。
// (M7) 一张面在一列上要么每个角都有值、要么都没有；列的数组装得下所有的角。
// (M8) 增量维护的邻接 = 当场从头重建的邻接（每个点连着的边、每条边挨着的面，逐项、含先后；W-11）。
import type { Pt3 } from "../kernel/geom.ts";
import { triangulateFace } from "../format/triangulate.ts";
import { ChangeLog } from "../kernel/change-log.ts";
import { writeCorners, type ColumnDef, type CornerColumn, type FaceOrigin, type FaceShape } from "./corner-columns.ts";
export type { ColumnDef, CornerColumn, FaceOrigin, FaceShape } from "./corner-columns.ts";

export const F_SOFT = 1, F_SMOOTH = 2, F_SEAM = 4, F_HIDDEN = 8, F_WIRE = 16;   // F_WIRE = 裸线（不属于任何面也合法）
/** 手标硬边（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM131）：压过网格体的「默认平滑」，这条边永远是棱（画线、明暗断开）。和 F_SOFT / F_SMOOTH 互斥（标的时候清掉另两位）。 */
export const F_SHARP = 32;
/** 网格体的「默认平滑」（几何属性，不是画法——user 10-28「不要叫明暗方式，我们的语义就是几何，和representation没关系。默认平滑之类的？」；每个网格体一个；mesh/edge-smooth.ts 按它判没手标的边）：angle = 两侧面夹角小于 deg 算平滑（硬表面）/ smooth = 全平滑（软角色）/ hard = 全是棱（低多边形；
 *  也是老文件的语义——没这个键的文件 = 只看手标，和以前逐字一样）。 */
export type SmoothDefaultMode = "angle" | "smooth" | "hard";
export interface SmoothDefault { readonly mode: SmoothDefaultMode; readonly deg: number }
export const SMOOTH_DEFAULT_LEGACY: SmoothDefault = { mode: "hard", deg: 30 };
/** 面标记：隐藏（user 10-27「show and hide faces」；点 / 边的显隐从面推导，游离的才自己带 F_HIDDEN）。 */
export const FF_HIDDEN = 1;

export interface MeshSnapshot {
  readonly version: 1; readonly minor: 0; readonly patch: 0;
  readonly positions: number[];          // x y z × 顶点（紧凑、重编）
  readonly faces: number[][];            // 每面顶点下标环
  readonly faceMat: number[];            // 每面材质槽（-1 = 默认）
  readonly edges: [number, number, number][];   // 带标记的边：[a, b, flags]（没标记的边不存，读回时由面推）
  /** 角上的列（有列才有这个键）：每列每张面一项 = 角数 × arity 个数，或 null（这张面在这一列上没值）。 */
  readonly columns?: readonly { readonly guid: string; readonly arity: number; readonly faces: readonly (readonly number[] | null)[] }[];
}

const grow = <T extends Float64Array | Int32Array | Uint8Array>(a: T, n: number): T => { if (n <= a.length) return a; const b = new (a.constructor as new (n: number) => T)(Math.max(n, a.length * 2, 16)); b.set(a as never); return b; };
/** 列的数组长大：新长的那段填 NaN（= 没值）。 */
const growCol = (a: Float32Array, n: number): Float32Array => { if (n <= a.length) return a; const b = new Float32Array(Math.max(n, a.length * 2, 16)).fill(NaN); b.set(a); return b; };

/**
 * 改动计数的全局时钟（2026-10-27 Claude Opus 5.5；user「undo完全是坏的」「undo之后操作还锁住了」的根）：rev 以前是每个内核自己的计数器，
 * 撤销 = 整表互换把旧 rev 换回来，之后再做同样多步就撞上撤销前用过的号 → 按 (内核, rev) 缓存的视图 / 合成视图 / 渲染给出旧几何，拾取点到不存在的面，工具看起来全锁住。
 * 全局递增 = 每个内容一个独一无二的号（撤销换回来的旧号对应的就是那份旧内容），同 brep 的 revClock。
 */
let meshRevClock = 0;

export class MeshKernel {
  // 顶点
  pos = new Float64Array(0); vAlive = new Uint8Array(0); private vCount = 0; private vFree: number[] = [];
  // 面：loopVert[faceStart[f] .. +faceLen[f])
  faceStart = new Int32Array(0); faceLen = new Int32Array(0); fAlive = new Uint8Array(0); faceMat = new Int32Array(0); faceFlags = new Uint8Array(0); private fCount = 0; private fFree: number[] = [];
  loopVert = new Int32Array(0); private loopCount = 0;
  // 边
  edgeA = new Int32Array(0); edgeB = new Int32Array(0); eAlive = new Uint8Array(0); edgeFlags = new Uint8Array(0); private eCount = 0; private eFree: number[] = [];
  private edgeKey = new Map<number, number>();   // a * 2^26 + b（a < b）→ 边 id
  // 邻接（增量维护，W-11 2026-11-10 Claude Opus 5.5；以前是整张懒重建：每改一下拓扑就标脏、下一次查询整张重建，「改一下、查一下」交替的循环随整个网格体涨）。
  // 两套挂在扁平数组上的单链表，存「下标 + 1」（0 = 空：数组长大时补的 0 正好是空）。增删一条边 / 一张面只碰它自己的几个格子。
  //   点 → 边：边 e 有两个格子，2e 挂在 edgeA[e] 的链上、2e+1 挂在 edgeB[e] 的链上；vHead[v] = 第一个格子 + 1，eNext[格子] = 下一个 + 1。
  //   边 → 面：面上的每一段（loopVert 的槽 l = 从 loopVert[l] 到环上下一个点的那条边）挂在那条边的链上；eFHead[e] = 第一个槽 + 1，lNext[l] = 下一个 + 1，
  //            lEdge / lFace = 这个槽是哪条边 / 哪张面的（摘的时候用）。loopVert 只往后接，这三张跟着长；以后谁给 loopVert 做整理，必须连这三张和列一起挪。
  //   查询（vEdges / eFaces）把链取出来按编号从小到大排好、返回一份新数组：和以前整张重建出来的逐项、先后都一样（check() 的 M8 当场从头重建来比），
  //   拿着上一次结果的调用方也不受之后修改影响（以前返回的是旧表的视图，同样不变）。
  private vHead = new Int32Array(0); private eNext = new Int32Array(0); private eFHead = new Int32Array(0);
  private lNext = new Int32Array(0); private lEdge = new Int32Array(0); private lFace = new Int32Array(0);
  // 派生
  private triCache: { tris: Int32Array; faceOfTri: Int32Array; rev: number } | null = null;
  /** 改动计数（渲染缓存 / 预演差量的钥匙；拓扑或坐标改了就 +1）。 */
  rev = 0;
  /** 默认平滑（FM129；新内核 = 老语义 hard，转换 / 导入时设 angle）。改它走 setSmoothDefault（整体标改动，渲染全量重建法向）。 */
  smoothDefault: SmoothDefault = SMOOTH_DEFAULT_LEGACY;
  /** 改动日志（编号 + 族谱，kernel/change-log.ts 同一份实现）：每个原语记下碰到的点 / 边 / 面；渲染缓存据此只重建改过的；clone = 分叉。 */
  changes = new ChangeLog();
  /** 角上的列（贴图主线 1-2）：先后没有意思、认 GUID；data 和 loopVert 平行。只经 addColumn / ensureColumns 加。 */
  columns: CornerColumn[] = [];
  /** 这些算子里有几张面在某一列上丢了值（并面对不上）：算子的调用方 takeDroppedFaces() 拿走并清零。不许悄悄丢。 */
  private dropped = 0;

  // ---------------- 基本查询
  vertexCount(): number { let n = 0; for (let i = 0; i < this.vCount; i++) if (this.vAlive[i]) n++; return n; }
  edgeCount(): number { let n = 0; for (let i = 0; i < this.eCount; i++) if (this.eAlive[i]) n++; return n; }
  faceCount(): number { let n = 0; for (let i = 0; i < this.fCount; i++) if (this.fAlive[i]) n++; return n; }
  verts(): number[] { const o: number[] = []; for (let i = 0; i < this.vCount; i++) if (this.vAlive[i]) o.push(i); return o; }
  edges(): number[] { const o: number[] = []; for (let i = 0; i < this.eCount; i++) if (this.eAlive[i]) o.push(i); return o; }
  faces(): number[] { const o: number[] = []; for (let i = 0; i < this.fCount; i++) if (this.fAlive[i]) o.push(i); return o; }
  hasV(v: number): boolean { return v >= 0 && v < this.vCount && this.vAlive[v] === 1; }
  hasE(e: number): boolean { return e >= 0 && e < this.eCount && this.eAlive[e] === 1; }
  hasF(f: number): boolean { return f >= 0 && f < this.fCount && this.fAlive[f] === 1; }
  pt(v: number): Pt3 { return { x: this.pos[3 * v], y: this.pos[3 * v + 1], z: this.pos[3 * v + 2] }; }
  faceVerts(f: number): number[] { const s = this.faceStart[f], n = this.faceLen[f]; const o: number[] = new Array(n); for (let i = 0; i < n; i++) o[i] = this.loopVert[s + i]; return o; }
  facePts(f: number): Pt3[] { return this.faceVerts(f).map((v) => this.pt(v)); }
  edgeOf(a: number, b: number): number { const e = this.edgeKey.get(a < b ? a * 67108864 + b : b * 67108864 + a); return e === undefined ? -1 : e; }
  /** 点 v 连着的边（编号从小到大，一份新数组）。O(这个点的度数)。 */
  vEdges(v: number): Int32Array {
    if (!(v >= 0 && v < this.vCount)) return new Int32Array(0);
    let n = 0; for (let s = this.vHead[v]; s; s = this.eNext[s - 1]) n++;
    const o = new Int32Array(n); n = 0; for (let s = this.vHead[v]; s; s = this.eNext[s - 1]) o[n++] = (s - 1) >> 1;
    return o.sort();
  }
  /** 边 e 挨着的面（编号从小到大，一份新数组）。O(挨着的面数)。 */
  eFaces(e: number): Int32Array {
    if (!(e >= 0 && e < this.eCount)) return new Int32Array(0);
    let n = 0; for (let l = this.eFHead[e]; l; l = this.lNext[l - 1]) n++;
    const o = new Int32Array(n); n = 0; for (let l = this.eFHead[e]; l; l = this.lNext[l - 1]) o[n++] = this.lFace[l - 1];
    return o.sort();
  }
  fEdges(f: number): number[] { const vs = this.faceVerts(f); return vs.map((v, i) => this.edgeOf(v, vs[(i + 1) % vs.length])); }
  /** 面的朝向法向（Newell，**不**规范化符号：单面网格里环的绕向就是朝向；planeOfRing 的 canonical 会丢符号，别用它判朝向）。 */
  faceNormal(f: number): Pt3 {
    const r = this.facePts(f); let nx = 0, ny = 0, nz = 0;
    for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length]; nx += (a.y - b.y) * (a.z + b.z); ny += (a.z - b.z) * (a.x + b.x); nz += (a.x - b.x) * (a.y + b.y); }
    const l = Math.hypot(nx, ny, nz); return l > 0 ? { x: nx / l, y: ny / l, z: nz / l } : { x: 0, y: 0, z: 1 };
  }

  // ---------------- 生长 / 删除原语（算子用；每个都保持 (M1)–(M5)）
  addVertex(p: Pt3): number {
    const v = this.vFree.length ? this.vFree.pop()! : this.vCount++;
    this.pos = grow(this.pos, 3 * this.vCount); this.vAlive = grow(this.vAlive, this.vCount); this.vHead = grow(this.vHead, this.vCount); this.vHead[v] = 0;
    this.pos[3 * v] = p.x; this.pos[3 * v + 1] = p.y; this.pos[3 * v + 2] = p.z; this.vAlive[v] = 1;
    this.changes.v(v); this.touch(true); return v;
  }
  /** 加一张面（顶点环）；相邻顶点对没有边的自动补边。环 < 3 个不同顶点 / 有重复 / 顶点不活 → 抛（人话）。origin = 这张面从哪来（必填：角上的数怎么来，corner-columns.ts）。 */
  addFace(ring: readonly number[], mat: number, origin: FaceOrigin): number {
    const distinct = new Set(ring);
    if (ring.length < 3 || distinct.size !== ring.length) throw new Error(`addFace: ring must have ≥ 3 distinct vertices (got ${ring.length}, ${distinct.size} distinct)`);
    for (const v of ring) if (!this.hasV(v)) throw new Error(`addFace: vertex ${v} is not alive`);
    const f = this.fFree.length ? this.fFree.pop()! : this.fCount++;
    this.faceStart = grow(this.faceStart, this.fCount); this.faceLen = grow(this.faceLen, this.fCount); this.fAlive = grow(this.fAlive, this.fCount); this.faceMat = grow(this.faceMat, this.fCount); this.faceFlags = grow(this.faceFlags, this.fCount);
    this.faceStart[f] = this.loopCount; this.faceLen[f] = ring.length; this.fAlive[f] = 1; this.faceMat[f] = mat; this.faceFlags[f] = 0; this.changes.f(f);
    this.writeRing(ring, origin);
    for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
    this.linkRing(f);
    this.touch(true); return f;
  }
  /** 删面；它独占的边（没别的面、不是裸线）一起删；孤立的顶点留着（Blender 同款：删面留点线，要删干净用 ops 的 deleteFaces(onlyFaces=false)）。 */
  removeFace(f: number): void {
    if (!this.hasF(f)) return;
    const vs = this.faceVerts(f);
    this.unlinkRing(f);
    this.fAlive[f] = 0; this.fFree.push(f); this.fFree.sort((a, b) => b - a);
    this.changes.f(f); this.touch(true);
    for (let i = 0; i < vs.length; i++) { const e = this.edgeOf(vs[i], vs[(i + 1) % vs.length]); if (e >= 0 && this.eFaces(e).length === 0 && !(this.edgeFlags[e] & F_WIRE)) this.removeEdge(e); }
  }
  /**
   * 一次删一批面（连同只属于这批面的边；裸线不删）。结果和对每张逐个 removeFace 一样：删掉的面和边、空出来的编号都一样
   * （空闲编号表本来就一直排着序，之后分到的编号也一样），但空闲编号只排一次序（W-10：细分 6400 面要 44–54 秒，样本 test/mesh-subdivide-golden.test.ts；
   * 那时逐个删还要每张整张重建一次邻接表，W-11 起邻接是增量的）。
   */
  removeFaces(fs: readonly number[]): void {
    const gone = new Set<number>();
    for (const f of fs) if (this.hasF(f)) gone.add(f);
    if (!gone.size) return;
    const cand = new Set<number>();   // 这一批的环边：全摘下之后没面了（又不是裸线）= 跟着删
    for (const f of gone) { const vs = this.faceVerts(f); for (let i = 0; i < vs.length; i++) { const e = this.edgeOf(vs[i], vs[(i + 1) % vs.length]); if (e >= 0) cand.add(e); } this.unlinkRing(f); }
    const doomed: number[] = [];
    for (const e of cand) if (!this.eFHead[e] && !(this.edgeFlags[e] & F_WIRE)) doomed.push(e);
    for (const f of gone) { this.fAlive[f] = 0; this.fFree.push(f); this.changes.f(f); }
    for (const e of doomed) { this.vUnlink(this.edgeA[e], 2 * e); this.vUnlink(this.edgeB[e], 2 * e + 1); this.edgeKey.delete(this.keyOf(this.edgeA[e], this.edgeB[e])); this.eAlive[e] = 0; this.edgeFlags[e] = 0; this.eFree.push(e); this.changes.e(e); }
    this.fFree.sort((a, b) => b - a); this.eFree.sort((a, b) => b - a);
    this.touch(true);
  }
  /** 一次删一批孤立的点（没有边的；有边的 → 抛，和 removeVertex 一样）。邻接表只查一次（W-10）。 */
  removeVertices(vs: readonly number[]): void {
    const list = [...new Set(vs)].filter((v) => this.hasV(v));
    if (!list.length) return;
    for (const v of list) if (this.vEdges(v).length) throw new Error(`removeVertices: vertex ${v} still has edges`);
    for (const v of list) { this.vAlive[v] = 0; this.vFree.push(v); this.changes.v(v); }
    this.vFree.sort((a, b) => b - a);
    this.touch(true);
  }
  removeEdge(e: number): void {
    if (!this.hasE(e)) return;
    if (this.eFaces(e).length) throw new Error(`removeEdge: edge ${e} still belongs to a face`);
    this.vUnlink(this.edgeA[e], 2 * e); this.vUnlink(this.edgeB[e], 2 * e + 1);
    this.edgeKey.delete(this.keyOf(this.edgeA[e], this.edgeB[e]));
    this.eAlive[e] = 0; this.edgeFlags[e] = 0; this.eFree.push(e); this.eFree.sort((a, b) => b - a);
    this.changes.e(e); this.touch(true);
  }
  removeVertex(v: number): void {
    if (!this.hasV(v)) return;
    if (this.vEdges(v).length) throw new Error(`removeVertex: vertex ${v} still has edges`);
    this.vAlive[v] = 0; this.vFree.push(v); this.vFree.sort((a, b) => b - a);
    this.changes.v(v); this.touch(true);
  }
  ensureEdge(a: number, b: number): number {
    if (a === b) throw new Error("ensureEdge: loop edge");
    const have = this.edgeOf(a, b); if (have >= 0) return have;
    const e = this.eFree.length ? this.eFree.pop()! : this.eCount++;
    this.edgeA = grow(this.edgeA, this.eCount); this.edgeB = grow(this.edgeB, this.eCount); this.eAlive = grow(this.eAlive, this.eCount); this.edgeFlags = grow(this.edgeFlags, this.eCount);
    this.edgeA[e] = Math.min(a, b); this.edgeB[e] = Math.max(a, b); this.eAlive[e] = 1; this.edgeFlags[e] = 0;
    this.eNext = grow(this.eNext, 2 * this.eCount); this.eFHead = grow(this.eFHead, this.eCount); this.eFHead[e] = 0;
    this.vLink(this.edgeA[e], 2 * e); this.vLink(this.edgeB[e], 2 * e + 1);
    this.edgeKey.set(this.keyOf(a, b), e);
    this.changes.e(e); this.touch(true); return e;
  }
  /** 原地改一张面的环（劈面 / 并面 / 并点用）：旧环独占的边删掉、新环缺的边补上。origin = 新环从哪来（必填；旧样子要在改之前 shapeOf 记下）。 */
  setFaceRing(f: number, ring: readonly number[], origin: FaceOrigin): void {
    const old = this.faceVerts(f);
    const distinct = new Set(ring);
    if (ring.length < 3 || distinct.size !== ring.length) throw new Error(`setFaceRing: ring must have ≥ 3 distinct vertices`);
    this.unlinkRing(f);
    this.faceStart[f] = this.loopCount; this.faceLen[f] = ring.length;
    this.writeRing(ring, origin);
    for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
    this.linkRing(f);
    this.changes.f(f); this.touch(true);
    for (let i = 0; i < old.length; i++) { const e = this.edgeOf(old[i], old[(i + 1) % old.length]); if (e >= 0 && this.eFaces(e).length === 0 && !(this.edgeFlags[e] & F_WIRE)) this.removeEdge(e); }
  }
  /** 环接在 loopVert 末尾（旧环的槽作废）；有列就按来历写角上的数（corner-columns.ts writeCorners，全仓唯一的那一段）。 */
  private writeRing(ring: readonly number[], origin: FaceOrigin): void {
    const slot = this.loopCount, n = ring.length;
    this.loopVert = grow(this.loopVert, slot + n);
    for (let i = 0; i < n; i++) this.loopVert[slot + i] = ring[i];
    this.loopCount += n;
    if (!this.columns.length) return;
    for (const c of this.columns) c.data = growCol(c.data, this.loopCount * c.arity);
    if (writeCorners(this, origin, ring, slot)) this.dropped++;
  }

  // ---------------- 角上的列（贴图主线 1-2）
  /** 加一列（已经有同一个 GUID = 不动；arity 对不上 = 抛）。原有的面在这一列上全没值。 */
  addColumn(def: ColumnDef): void {
    const have = this.columns.find((c) => c.guid === def.guid);
    if (have) { if (have.arity !== def.arity) throw new Error(`addColumn: column ${def.guid} already has arity ${have.arity}`); return; }
    if (!(def.arity >= 1 && Number.isInteger(def.arity))) throw new Error(`addColumn: arity must be a positive integer`);
    this.columns.push({ guid: def.guid, arity: def.arity, data: new Float32Array(Math.max(16, this.loopCount * def.arity)).fill(NaN) });
    this.rev = ++meshRevClock;
  }
  /** 别的内核的列在这边补上（整张面搬过来之前；原有的面在补上的列上全没值）。 */
  ensureColumns(defs: readonly ColumnDef[]): void { for (const d of defs) this.addColumn(d); }
  columnDefs(): ColumnDef[] { return this.columns.map((c) => ({ guid: c.guid, arity: c.arity })); }
  /** 面的旧样子（改之前记）：没有列 = 只记材质。 */
  shapeOf(f: number): FaceShape {
    if (!this.columns.length) return { mat: this.faceMat[f], ring: null, pts: null, vals: null };
    const ring = this.faceVerts(f), pts = new Float64Array(3 * ring.length);
    for (let i = 0; i < ring.length; i++) { const v = ring[i]; pts[3 * i] = this.pos[3 * v]; pts[3 * i + 1] = this.pos[3 * v + 1]; pts[3 * i + 2] = this.pos[3 * v + 2]; }
    return { mat: this.faceMat[f], ring, pts, vals: this.faceValues(f) };
  }
  /** 这张面在这一列上各角的值（角数 × arity，拷一份）；没值 / 没这一列 = null。 */
  cornerValues(f: number, guid: string): Float32Array | null {
    const c = this.columns.find((x) => x.guid === guid);
    if (!c || !this.hasF(f)) return null;
    const s = this.faceStart[f] * c.arity, n = this.faceLen[f] * c.arity;
    return Number.isNaN(c.data[s]) ? null : c.data.slice(s, s + n);
  }
  /**
   * 这一列（每角两个数）上有值的每张活面的包围盒，摊平成 [横小, 纵小, 横大, 纵大, …]（贴图主线 1-3b：补面时「画布上哪里被占着」，一趟扫完、不拷每张面的值）。
   * 没有这一列 / 不是每角两个数 = 空。
   */
  columnBoxes(guid: string): Float64Array {
    const c = this.columns.find((x) => x.guid === guid);
    if (!c || c.arity !== 2) return new Float64Array(0);
    const out: number[] = [], d = c.data;
    for (let f = 0; f < this.fCount; f++) {
      if (!this.fAlive[f]) continue;
      const s = this.faceStart[f] * 2, n = this.faceLen[f];
      if (Number.isNaN(d[s])) continue;
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < n; i++) { const x = d[s + 2 * i], y = d[s + 2 * i + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      out.push(x0, y0, x1, y1);
    }
    return Float64Array.from(out);
  }
  /** 这张面在每一列上的值（GUID → 角数 × arity）；没值的列不在表里。整张面搬到别的内核时交给 fresh。 */
  faceValues(f: number): Map<string, Float32Array> {
    const out = new Map<string, Float32Array>();
    for (const c of this.columns) { const v = this.cornerValues(f, c.guid); if (v) out.set(c.guid, v); }
    return out;
  }
  /** 给一张面在一列上整张写值（values = 角数 × arity；null = 清成没值）。进改动日志、rev 动。往角上放数的只有 1-3 的铺法和测试。 */
  setFaceValues(f: number, guid: string, values: ArrayLike<number> | null): void {
    const c = this.columns.find((x) => x.guid === guid);
    if (!c) throw new Error(`setFaceValues: no column ${guid}`);
    if (!this.hasF(f)) throw new Error(`setFaceValues: face ${f} is not alive`);
    const s = this.faceStart[f] * c.arity, n = this.faceLen[f] * c.arity;
    if (values && values.length !== n) throw new Error(`setFaceValues: need ${n} numbers, got ${values.length}`);
    for (let i = 0; i < n; i++) c.data[s + i] = values ? values[i] : NaN;
    this.changes.f(f); this.rev = ++meshRevClock;
  }
  /** 上一次拿走之后有几张面在某一列上丢了值（并面对不上 / 缺值）；拿走即清零。 */
  takeDroppedFaces(): number { const n = this.dropped; this.dropped = 0; return n; }
  setPos(v: number, p: Pt3): void { this.pos[3 * v] = p.x; this.pos[3 * v + 1] = p.y; this.pos[3 * v + 2] = p.z; this.changes.v(v); this.touch(false); }
  setFlags(e: number, mask: number, on: boolean): void { if (!this.hasE(e)) return; this.edgeFlags[e] = on ? this.edgeFlags[e] | mask : this.edgeFlags[e] & ~mask; this.changes.e(e); this.rev = ++meshRevClock; }
  /** 整字节写边标记（算子搬标记用）；记日志。 */
  setEdgeFlags(e: number, flags: number): void { if (!this.hasE(e)) return; this.edgeFlags[e] = flags; this.changes.e(e); this.rev = ++meshRevClock; }
  setFaceMat(f: number, slot: number): void { if (!this.hasF(f)) return; this.faceMat[f] = slot; this.changes.f(f); this.rev = ++meshRevClock; }
  setFaceFlags(f: number, mask: number, on: boolean): void { if (!this.hasF(f)) return; this.faceFlags[f] = on ? this.faceFlags[f] | mask : this.faceFlags[f] & ~mask; this.changes.f(f); this.rev = ++meshRevClock; }
  /** 换默认平滑：每条边的「平滑吗 / 画线吗」都可能变 → 所有边和面都记进改动日志（渲染按日志增量重建）。 */
  setSmoothDefault(sd: SmoothDefault): void {
    if (sd.mode === this.smoothDefault.mode && sd.deg === this.smoothDefault.deg) return;
    this.smoothDefault = { mode: sd.mode, deg: sd.deg };
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e]) this.changes.e(e);
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) this.changes.f(f);
    this.rev = ++meshRevClock;
  }
  isFaceHidden(f: number): boolean { return this.hasF(f) && (this.faceFlags[f] & FF_HIDDEN) !== 0; }
  hasFlag(e: number, mask: number): boolean { return this.hasE(e) && (this.edgeFlags[e] & mask) !== 0; }

  private keyOf(a: number, b: number): number { return a < b ? a * 67108864 + b : b * 67108864 + a; }
  private touch(_topo: boolean): void { this.rev = ++meshRevClock; this.triCache = null; }   // 邻接是增量维护的（W-11），不再标脏

  // ---------------- 邻接的链（W-11）：挂 / 摘
  private vLink(v: number, s: number): void { this.eNext[s] = this.vHead[v]; this.vHead[v] = s + 1; }
  private vUnlink(v: number, s: number): void {
    if (this.vHead[v] === s + 1) { this.vHead[v] = this.eNext[s]; this.eNext[s] = 0; return; }
    for (let p = this.vHead[v]; p; p = this.eNext[p - 1]) if (this.eNext[p - 1] === s + 1) { this.eNext[p - 1] = this.eNext[s]; this.eNext[s] = 0; return; }
  }
  /** 面 f 现在这一圈（loopVert 的 faceStart[f] 起 faceLen[f] 个槽）挂到各自的边上。环上的边都要已经在（addFace / setFaceRing 先补边再挂）。 */
  private linkRing(f: number): void {
    const s0 = this.faceStart[f], n = this.faceLen[f], end = s0 + n;
    this.lNext = grow(this.lNext, end); this.lEdge = grow(this.lEdge, end); this.lFace = grow(this.lFace, end);
    for (let i = 0; i < n; i++) {
      const l = s0 + i, e = this.edgeOf(this.loopVert[l], this.loopVert[s0 + ((i + 1) % n)]);
      this.lEdge[l] = e; this.lFace[l] = f;
      if (e >= 0) { this.lNext[l] = this.eFHead[e]; this.eFHead[e] = l + 1; } else this.lNext[l] = 0;
    }
  }
  /** 把面 f 现在这一圈从各自的边上摘下来（删面 / 换环之前）。 */
  private unlinkRing(f: number): void {
    const s0 = this.faceStart[f], end = s0 + this.faceLen[f];
    for (let l = s0; l < end; l++) {
      const e = this.lEdge[l];
      if (e < 0) continue;
      if (this.eFHead[e] === l + 1) this.eFHead[e] = this.lNext[l];
      else for (let p = this.eFHead[e]; p; p = this.lNext[p - 1]) if (this.lNext[p - 1] === l + 1) { this.lNext[p - 1] = this.lNext[l]; break; }
      this.lNext[l] = 0; this.lEdge[l] = -1;
    }
  }

  // ---------------- 邻接的从头重建（只给 check() 的 M8 比对；平时是增量的，见上面字段那一段）
  /** 邻接表整张从头重建过几次（W-10 的测试看它；W-11 起维护是增量的，只有 check() 的 M8 为了比对从头建一份）。 */
  get adjacencyBuilds(): number { return this.adjBuilds; }
  private adjBuilds = 0;
  /** 从头重建邻接（以前的做法，原样）：每个点连着的边、每条边挨着的面，都按编号从小到大。只给 check() 的 M8 比对用。 */
  private adjacencyFromScratch(): { vE: number[][]; eF: number[][] } {
    this.adjBuilds++;
    const vE: number[][] = Array.from({ length: this.vCount }, () => []), eF: number[][] = Array.from({ length: this.eCount }, () => []);
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e]) { vE[this.edgeA[e]].push(e); vE[this.edgeB[e]].push(e); }
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) { const r = this.faceVerts(f); for (let i = 0; i < r.length; i++) { const e = this.edgeOf(r[i], r[(i + 1) % r.length]); if (e >= 0) eF[e].push(f); } }
    for (const l of vE) l.sort((a, b) => a - b);
    for (const l of eF) l.sort((a, b) => a - b);
    return { vE, eF };
  }

  // ---------------- 派生：三角化（约束 Delaunay，format/triangulate.ts），改过才重算
  /**
   * 一张面切成哪几个三角形（下标 = 环上的位置，按面自己的绕向；FM130）。**网格体的面切三角形全仓只从这里来**（贴图主线 1-3a 第一节，2026-11-10）：
   * 内核的 triangles()、导出、屏幕上画的（MeshView.faceTriangles → pool-mesh.ts buildFaceRec）、选中高亮 / OBJ（editor/face-triangles.ts）。
   * 以前屏幕上那条路用视图的平面自己另切，四点共圆的面（正方形、长方形）两条对角线一样好，两条路可能选得不一样。O(这张面的点数)。
   */
  faceTriangles(f: number): [number, number, number][] {
    if (!this.hasF(f)) return [];
    const vs = this.faceVerts(f);
    return vs.length === 3 ? [[0, 1, 2]] : triangulateFace(vs.map((v) => this.pt(v)));
  }
  triangles(): { tris: Int32Array; faceOfTri: Int32Array } {
    if (this.triCache && this.triCache.rev === this.rev) return this.triCache;
    const tris: number[] = [], of: number[] = [];
    for (let f = 0; f < this.fCount; f++) {
      if (!this.fAlive[f]) continue;
      const vs = this.faceVerts(f);
      for (const [a, b, c] of this.faceTriangles(f)) { tris.push(vs[a], vs[b], vs[c]); of.push(f); }
    }
    this.triCache = { tris: Int32Array.from(tris), faceOfTri: Int32Array.from(of), rev: this.rev };
    return this.triCache;
  }

  // ---------------- 拷贝 / 快照
  clone(): MeshKernel {
    const m = new MeshKernel();
    m.pos = this.pos.slice(); m.vAlive = this.vAlive.slice(); m.vCount = this.vCount; m.vFree = [...this.vFree];
    m.faceStart = this.faceStart.slice(); m.faceLen = this.faceLen.slice(); m.fAlive = this.fAlive.slice(); m.faceMat = this.faceMat.slice(); m.fCount = this.fCount; m.fFree = [...this.fFree];
    m.loopVert = this.loopVert.slice(); m.loopCount = this.loopCount;
    m.edgeA = this.edgeA.slice(); m.edgeB = this.edgeB.slice(); m.eAlive = this.eAlive.slice(); m.edgeFlags = this.edgeFlags.slice(); m.eCount = this.eCount; m.eFree = [...this.eFree];
    m.edgeKey = new Map(this.edgeKey); m.rev = this.rev; m.faceFlags = this.faceFlags.slice(); m.smoothDefault = this.smoothDefault;
    m.changes = this.changes.fork();   // 族谱：渲染缓存从原件切到副本只重建差的
    m.columns = this.columns.map((c) => ({ guid: c.guid, arity: c.arity, data: c.data.slice() }));
    m.vHead = this.vHead.slice(); m.eNext = this.eNext.slice(); m.eFHead = this.eFHead.slice(); m.lNext = this.lNext.slice(); m.lEdge = this.lEdge.slice(); m.lFace = this.lFace.slice();   // 邻接跟着拷（W-11）
    return m;
  }
  /**
   * 整份表互换（对象身份不变；brep Kernel.swapTablesWith 同款）：撤销记录 = 提交前的拷贝，撤 / 重做 = 和真身互换——自反、不重跑算子。
   * rev / 改动日志一起换：换回来的表配的是它自己那本日志（渲染缓存按日志族谱算差）。
   */
  swapWith(o: MeshKernel): void {
    [this.pos, o.pos] = [o.pos, this.pos]; [this.vAlive, o.vAlive] = [o.vAlive, this.vAlive]; [this.vCount, o.vCount] = [o.vCount, this.vCount]; [this.vFree, o.vFree] = [o.vFree, this.vFree];
    [this.faceStart, o.faceStart] = [o.faceStart, this.faceStart]; [this.faceLen, o.faceLen] = [o.faceLen, this.faceLen]; [this.fAlive, o.fAlive] = [o.fAlive, this.fAlive]; [this.faceMat, o.faceMat] = [o.faceMat, this.faceMat]; [this.faceFlags, o.faceFlags] = [o.faceFlags, this.faceFlags]; [this.fCount, o.fCount] = [o.fCount, this.fCount]; [this.fFree, o.fFree] = [o.fFree, this.fFree];
    [this.loopVert, o.loopVert] = [o.loopVert, this.loopVert]; [this.loopCount, o.loopCount] = [o.loopCount, this.loopCount];
    [this.edgeA, o.edgeA] = [o.edgeA, this.edgeA]; [this.edgeB, o.edgeB] = [o.edgeB, this.edgeB]; [this.eAlive, o.eAlive] = [o.eAlive, this.eAlive]; [this.edgeFlags, o.edgeFlags] = [o.edgeFlags, this.edgeFlags]; [this.eCount, o.eCount] = [o.eCount, this.eCount]; [this.eFree, o.eFree] = [o.eFree, this.eFree];
    [this.edgeKey, o.edgeKey] = [o.edgeKey, this.edgeKey]; [this.vHead, o.vHead] = [o.vHead, this.vHead]; [this.eNext, o.eNext] = [o.eNext, this.eNext]; [this.eFHead, o.eFHead] = [o.eFHead, this.eFHead]; [this.lNext, o.lNext] = [o.lNext, this.lNext]; [this.lEdge, o.lEdge] = [o.lEdge, this.lEdge]; [this.lFace, o.lFace] = [o.lFace, this.lFace]; [this.triCache, o.triCache] = [o.triCache, this.triCache];
    [this.rev, o.rev] = [o.rev, this.rev]; [this.changes, o.changes] = [o.changes, this.changes]; [this.smoothDefault, o.smoothDefault] = [o.smoothDefault, this.smoothDefault];
    [this.columns, o.columns] = [o.columns, this.columns]; [this.dropped, o.dropped] = [o.dropped, this.dropped];
  }
  /** 紧凑快照（去空位、id 重编：存 / 导出时整理，user 10-27「catsup rule: organize in export/save」）。 */
  toSnapshot(): MeshSnapshot {
    const map = new Int32Array(this.vCount).fill(-1); const positions: number[] = []; let n = 0;
    for (let v = 0; v < this.vCount; v++) if (this.vAlive[v]) { map[v] = n++; positions.push(this.pos[3 * v], this.pos[3 * v + 1], this.pos[3 * v + 2]); }
    const faces: number[][] = [], faceMat: number[] = [], live: number[] = [];
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) { faces.push(this.faceVerts(f).map((v) => map[v])); faceMat.push(this.faceMat[f]); live.push(f); }
    const edges: [number, number, number][] = [];
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e] && this.edgeFlags[e]) edges.push([map[this.edgeA[e]], map[this.edgeB[e]], this.edgeFlags[e]]);
    const columns = this.columns.map((c) => ({ guid: c.guid, arity: c.arity, faces: live.map((f) => { const v = this.cornerValues(f, c.guid); return v ? Array.from(v) : null; }) }));
    return { version: 1, minor: 0, patch: 0, positions, faces, faceMat, edges, ...(columns.length ? { columns } : {}) };   // 没有列 = 和以前逐字一样
  }
  static fromSnapshot(s: MeshSnapshot): MeshKernel {
    const m = new MeshKernel();
    for (let i = 0; i + 2 < s.positions.length; i += 3) m.addVertex({ x: s.positions[i], y: s.positions[i + 1], z: s.positions[i + 2] });
    for (const c of s.columns ?? []) m.addColumn({ guid: c.guid, arity: c.arity });
    s.faces.forEach((r, i) => { const values = new Map<string, Float32Array>(); for (const c of s.columns ?? []) { const v = c.faces[i]; if (v) values.set(c.guid, Float32Array.from(v)); } m.addFace(r, s.faceMat[i] ?? -1, { kind: "fresh", values }); });   // 快照装载 = 凭空来的、直接给值
    for (const [a, b, fl] of s.edges) { const e = m.ensureEdge(a, b); m.edgeFlags[e] = fl; }
    m.rev = ++meshRevClock;
    return m;
  }

  // ---------------- 不变量自检（测试每算子后跑；生产里修复面板用）
  check(): string[] {
    const bad: string[] = [];
    const used = new Set<number>();
    for (let f = 0; f < this.fCount; f++) {
      if (!this.fAlive[f]) continue;
      const r = this.faceVerts(f);
      if (r.length < 3) bad.push(`face ${f}: ring < 3`);
      if (new Set(r).size !== r.length) bad.push(`face ${f}: repeated vertex in ring`);
      for (let i = 0; i < r.length; i++) {
        if (!this.hasV(r[i])) bad.push(`face ${f}: dead vertex ${r[i]}`);
        const e = this.edgeOf(r[i], r[(i + 1) % r.length]);
        if (e < 0 || !this.hasE(e)) bad.push(`face ${f}: missing edge ${r[i]}-${r[(i + 1) % r.length]}`); else used.add(e);
      }
    }
    for (let e = 0; e < this.eCount; e++) {
      if (!this.eAlive[e]) { if (this.edgeFlags[e]) bad.push(`edge ${e}: flags on dead edge`); continue; }
      if (!this.hasV(this.edgeA[e]) || !this.hasV(this.edgeB[e])) bad.push(`edge ${e}: dead endpoint`);
      if (!used.has(e) && !(this.edgeFlags[e] & F_WIRE)) bad.push(`edge ${e}: belongs to no face and is not a wire`);
      if (this.edgeKey.get(this.keyOf(this.edgeA[e], this.edgeB[e])) !== e) bad.push(`edge ${e}: key index mismatch`);
    }
    for (const [k, e] of this.edgeKey) if (!this.hasE(e) || this.keyOf(this.edgeA[e], this.edgeB[e]) !== k) bad.push(`edge key ${k} → ${e} stale`);
    // (M7) 角上的列：数组装得下所有的角；一张面在一列上要么每个角（每个分量）都有值、要么都没有
    for (const c of this.columns) {
      if (c.data.length < this.loopCount * c.arity) bad.push(`column ${c.guid}: array shorter than the corners`);
      for (let f = 0; f < this.fCount; f++) {
        if (!this.fAlive[f]) continue;
        const s = this.faceStart[f] * c.arity, n = this.faceLen[f] * c.arity;
        let nan = 0; for (let i = 0; i < n; i++) if (Number.isNaN(c.data[s + i])) nan++;
        if (nan !== 0 && nan !== n) bad.push(`face ${f}: column ${c.guid} has values on some corners but not all`);
      }
    }
    // (M8) 邻接（增量维护，W-11）= 当场从头重建的表：每个点连着的边、每条边挨着的面，逐项、含先后（Fable 11-10 定的主门）
    {
      const A = this.adjacencyFromScratch(), same = (a: Int32Array, b: number[]): boolean => a.length === b.length && b.every((x, i) => a[i] === x);
      for (let v = 0; v < this.vCount; v++) { const got = this.vEdges(v); if (!same(got, A.vE[v])) { bad.push(`adjacency: vertex ${v} edges [${[...got]}] ≠ rebuilt [${A.vE[v]}]`); break; } }
      for (let e = 0; e < this.eCount; e++) { const got = this.eFaces(e); if (!same(got, A.eF[e])) { bad.push(`adjacency: edge ${e} faces [${[...got]}] ≠ rebuilt [${A.eF[e]}]`); break; } }
    }
    return bad;
  }
  /** 封闭流形块的欧拉示性数（只算流形块：每条边恰两张面、每个顶点的面扇连通）；非流形 / 有边界的块跳过。返回每块的 V − E + F。 */
  eulerOfClosedManifoldComponents(): number[] {
    const fs = this.faces(); if (!fs.length) return [];
    const parent = new Map<number, number>(fs.map((f) => [f, f]));
    const find = (x: number): number => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)!; } return x; };
    const nonManifold = new Set<number>();
    for (const e of this.edges()) { const l = this.eFaces(e); if (l.length === 2) { const a = find(l[0]), b = find(l[1]); if (a !== b) parent.set(a, b); } else for (const f of l) nonManifold.add(f); }
    const comps = new Map<number, number[]>(); for (const f of fs) (comps.get(find(f)) ?? comps.set(find(f), []).get(find(f))!).push(f);
    const out: number[] = [];
    for (const members of comps.values()) {
      if (members.some((f) => nonManifold.has(find(f)))) continue;
      const vs = new Set<number>(), es = new Set<number>();
      let boundary = false;
      for (const f of members) { for (const v of this.faceVerts(f)) vs.add(v); for (const e of this.fEdges(f)) { es.add(e); if (this.eFaces(e).length !== 2) boundary = true; } }
      if (boundary) continue;
      out.push(vs.size - es.size + members.length);
    }
    return out;
  }
}

// mesh/mesh-kernel.ts —— mesh 内核（自由建模的身体；提案 ai-docs/20261027-mesh-kernel-proposal.md §1–§2，user 10-27 拍：另做网格内核、列式 + 纯函数、
// 面 = 简单顶点环（任意边数、允许不平、不带洞、单面）、顶点 id 寻址、没有几何公理只有拓扑不变量）。created 2026-10-27 by Claude Fable 5.1
//
// 列式：所有表都是定长类型数组 + 活跃位图 + 空闲表（id = 下标，删了不挪；复用取最小空位 = 确定性）。邻接见下一行。
// 邻接（点 → 边、边 → 面）W-11 起增量维护：增删一条边 / 一张面只碰它自己的几个格子，查询 O(度数)；只改坐标的算子不碰它（软挪 / 雕每帧只写 pos）。
// 不变量（test/mesh-kernel.test.ts 逐算子查）：(M1) 活面的环 ≥ 3 个不同的活顶点、环里没有重复顶点 (M2) 环上相邻顶点对都在边表里、边表里的边至少属于一张面或标为裸线
// (M3) 标记只在活边上 (M4) 封闭流形块 V − E + F = 2 − 2g（只对流形块查）(M5) 删了的 id 不被任何活元素引用 (M6) 同算子在克隆上跑 = 同结果。
// 这里只有数据 + 查询 + 最基本的生长 / 删除原语；拓扑算子在 mesh/ops/*.ts（每个一个文件，可扔）。
// 通用的列 + 面的来历（2026-11-10 Claude Opus 5.5 起；2026-11-13 施工单十八第 1½ 刀改成对属性无感，mesh/columns.ts 头注释是全文）：
// 角上的列（和 loopVert 平行，每角永远有数）+ 面上的列（每面一个整数）；addFace / setFaceRing 必须交代来历（columns.ts 的五种，那一段代码只有一份）。
// 内核不知道列是什么意思，只报告「哪几列在来源之间对不上」（takeReport）。没有列的网格体：每次只多一个分支，行为逐字不变。
// 边上的列（3a，2026-11-13 夜）：每条边一个整数 / 布尔；边的值在造它的那一刻按来历填好（addEdge 申报；addFace / setFaceRing 顺手补的缺边 = 新长），
//   对已经在的边申报来历 = 抛（规程第九½节）。读的人拿 column(id) 那个对象（data 永远是现在那条），rev 变了再问。
// (M7) 列的数组装得下所有的角 / 所有的面 / 所有的边。(M7¼) 布尔列的值只有 0 / 1。(M7½) 带 quantum 的角上的列：值 × quantum 是整数。
// (M8) 增量维护的邻接 = 当场从头重建的邻接（每个点连着的边、每条边挨着的面，逐项、含先后；W-11）。
import type { Pt3 } from "../kernel/geom.ts";
import { triangulateFace } from "../format/triangulate.ts";
import { ChangeLog } from "../kernel/change-log.ts";
import { checkColumnDef, sameColumnDef, mergeCornerValues, typeName, writeColumns, edgeColumnValues, writeEdgeColumns, GROWN_EDGE, type Column, type ColumnDef, type CornerColumn, type EdgeColumn, type EdgeOrigin, type EdgeShape, type FaceColumn, type FaceOrigin, type FaceReport, type FaceShape, type GoneFace, type GoneWhy, type OddEdge, type OddFace } from "./columns.ts";
import { planMerge, ringKey, type MergeGroup } from "./merge-points.ts";
export type { Column, ColumnDef, ColumnType, CornerColumn, CornerOdd, Domain, EdgeColumn, EdgeOrigin, EdgeShape, FaceColumn, FaceOrigin, FaceReport, FaceShape, GoneFace, GoneWhy, MergeRule, OddEdge, OddFace } from "./columns.ts";
export type { MergeGroup, MergeTo } from "./merge-points.ts";

import { F_WIRE } from "./edge-bits.ts";
export { F_SOFT, F_SMOOTH, F_SEAM, F_HIDDEN, F_WIRE, F_SHARP } from "./edge-bits.ts";   // 边上的位住 edge-bits.ts（合并点那张规则表要按名字列它们，又不能 import 内核）
/** 网格体的「默认平滑」（几何属性，不是画法——user 10-28「不要叫明暗方式，我们的语义就是几何，和representation没关系。默认平滑之类的？」；每个网格体一个；mesh/edge-smooth.ts 按它判没手标的边）：angle = 两侧面夹角小于 deg 算平滑（硬表面）/ smooth = 全平滑（软角色）/ hard = 全是棱（低多边形；
 *  新建的网格体默认这一档；文件里缺这一项怎么办归读的门口 format/migrate/mesh.ts）。 */
export type SmoothDefaultMode = "angle" | "smooth" | "hard";
export interface SmoothDefault { readonly mode: SmoothDefaultMode; readonly deg: number }
/** 新建的网格体的默认平滑：全是棱（只看手标）。老文件缺这一项怎么办归读的门口（format/migrate/mesh.ts smoothDefaultOf；2026-11-12 起内核不认「老文件」）。 */
export const SMOOTH_DEFAULT_NEW: SmoothDefault = { mode: "hard", deg: 30 };

export interface MeshSnapshot {
  readonly version: 3; readonly minor: 0; readonly patch: 0;   // 3（属性地基轮 3b）：材质、面的隐藏不再是单独的字段，是面上的列（有才有）。2（施工单十八第 1½ 刀）：列换成 corner / face 两种、每角都有数。只是内核自己的快照（测试、对拍），不落盘
  readonly positions: number[];          // x y z × 顶点（紧凑、重编）
  readonly faces: number[][];            // 每面顶点下标环
  readonly edges: [number, number, number][];   // 带标记的边：[a, b, flags]（没标记的边不存，读回时由面推）
  /** 角上的列（有才有这个键）：声明 + 每张面一项 = 角数 × 每角几个数。 */
  readonly corner?: readonly { readonly def: ColumnDef; readonly faces: readonly (readonly number[])[] }[];
  /** 面上的列（有才有这个键）：声明 + 每张面一个数。 */
  readonly face?: readonly { readonly def: ColumnDef; readonly values: readonly number[] }[];
  /** 边上的列（有才有这个键）：声明 + 每条活边一项 [a, b, 值]（a、b = 重编后的点）。 */
  readonly edge?: readonly { readonly def: ColumnDef; readonly values: readonly (readonly [number, number, number])[] }[];
}

const grow = <T extends Float64Array | Int32Array | Uint8Array>(a: T, n: number): T => { if (n <= a.length) return a; const b = new (a.constructor as new (n: number) => T)(Math.max(n, a.length * 2, 16)); b.set(a as never); return b; };
/** 列的数组长大：新长的那段填这一列的 fill。 */
const growCol = <T extends Float32Array | Int32Array | Uint8Array>(a: T, n: number, fill: number): T => { if (n <= a.length) return a; const b = new (a.constructor as new (n: number) => T)(Math.max(n, a.length * 2, 16)); b.fill(fill); b.set(a as never); return b; };

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
  faceStart = new Int32Array(0); faceLen = new Int32Array(0); fAlive = new Uint8Array(0); private fCount = 0; private fFree: number[] = [];
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
  smoothDefault: SmoothDefault = SMOOTH_DEFAULT_NEW;
  /** 改动日志（编号 + 族谱，kernel/change-log.ts 同一份实现）：每个原语记下碰到的点 / 边 / 面；渲染缓存据此只重建改过的；clone = 分叉。 */
  changes = new ChangeLog();
  /** 角上的列：先后没有意思、认 id；data 和 loopVert 平行。只经 addColumn / ensureColumns 加。 */
  cornerCols: CornerColumn[] = [];
  /** 面上的列：data[面编号]。只经 addColumn / ensureColumns 加。 */
  faceCols: FaceColumn[] = [];
  /** 边上的列：data[边编号]。只经 addColumn / ensureColumns 加。 */
  edgeCols: EdgeColumn[] = [];
  /** 「对不上」的边（边编号 → 哪几列，并成时来源不一样）：takeReport 拿走并清空；piece / copy / joined 时跟着传给新边。 */
  private oddEdges = new Map<number, OddEdge>();
  /** 「对不上」的面（面编号 → 哪几列）：用的那一层 takeReport() 拿走并清空；跟着来历传给新面（columns.ts）。 */
  private odd = new Map<number, OddFace>();
  /** 这段时间里没了的面（removeFaceReported / 合并点；takeReport 拿走并清空；跟着 swapWith 换，拷贝不带）。 */
  private goneList: GoneFace[] = [];

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
  /** 加一张面（顶点环）；相邻顶点对没有边的自动补边。环 < 3 个不同顶点 / 有重复 / 顶点不活 → 抛（人话）。origin = 这张面从哪来（必填：角上的数怎么来，columns.ts）。 */
  addFace(ring: readonly number[], origin: FaceOrigin): number {
    const distinct = new Set(ring);
    if (ring.length < 3 || distinct.size !== ring.length) throw new Error(`addFace: ring must have ≥ 3 distinct vertices (got ${ring.length}, ${distinct.size} distinct)`);
    for (const v of ring) if (!this.hasV(v)) throw new Error(`addFace: vertex ${v} is not alive`);
    const f = this.fFree.length ? this.fFree.pop()! : this.fCount++;
    this.faceStart = grow(this.faceStart, this.fCount); this.faceLen = grow(this.faceLen, this.fCount); this.fAlive = grow(this.fAlive, this.fCount);
    this.faceStart[f] = this.loopCount; this.faceLen[f] = ring.length; this.fAlive[f] = 1; this.changes.f(f);
    for (const c of this.faceCols) c.data = growCol(c.data, this.fCount, c.def.fill);
    this.writeRing(f, ring, origin);
    for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
    this.linkRing(f);
    this.touch(true); return f;
  }
  /** 删面；它独占的边（没别的面、不是裸线）一起删；孤立的顶点留着（Blender 同款：删面留点线，要删干净用 ops 的 deleteFaces(onlyFaces=false)）。 */
  removeFace(f: number): void {
    if (!this.hasF(f)) return;
    const vs = this.faceVerts(f);
    this.unlinkRing(f);
    this.fAlive[f] = 0; this.fFree.push(f); this.fFree.sort((a, b) => b - a); this.odd.delete(f);
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
    for (const e of doomed) { this.vUnlink(this.edgeA[e], 2 * e); this.vUnlink(this.edgeB[e], 2 * e + 1); this.edgeKey.delete(this.keyOf(this.edgeA[e], this.edgeB[e])); this.eAlive[e] = 0; this.edgeFlags[e] = 0; this.oddEdges.delete(e); this.eFree.push(e); this.changes.e(e); }
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
    this.dropEdge(e); this.eFree.sort((a, b) => b - a);
    this.touch(true);
  }
  /** 删边不排空位表（一批删完调用方排一次：合并点那几段里中途不分配边，排一次和每次都排结果一样）。 */
  private dropEdge(e: number): void {
    if (this.eFaces(e).length) throw new Error(`removeEdge: edge ${e} still belongs to a face`);
    this.vUnlink(this.edgeA[e], 2 * e); this.vUnlink(this.edgeB[e], 2 * e + 1);
    this.edgeKey.delete(this.keyOf(this.edgeA[e], this.edgeB[e]));
    this.eAlive[e] = 0; this.edgeFlags[e] = 0; this.oddEdges.delete(e); this.eFree.push(e);
    this.changes.e(e);
  }
  private dropEdges(es: Iterable<number>): void { let n = 0; for (const e of es) if (this.hasE(e)) { this.dropEdge(e); n++; } if (n) { this.eFree.sort((a, b) => b - a); this.touch(true); } }
  removeVertex(v: number): void {
    if (!this.hasV(v)) return;
    if (this.vEdges(v).length) throw new Error(`removeVertex: vertex ${v} still has edges`);
    this.vAlive[v] = 0; this.vFree.push(v); this.vFree.sort((a, b) => b - a);
    this.changes.v(v); this.touch(true);
  }
  /** 有就返回那条边；没有就造一条新长的（边上的列全是缺省值）。要带着来历造 = addEdge。 */
  ensureEdge(a: number, b: number): number {
    if (a === b) throw new Error("ensureEdge: loop edge");
    const have = this.edgeOf(a, b); if (have >= 0) return have;
    return this.makeEdge(a, b, GROWN_EDGE);
  }
  /**
   * 造一条新边，值按来历填好（规程第九½节：边的值在它被造出来的那一刻按来历填好，不许造完再回头补）。这条边已经在 = 抛（对已经在的边申报来历不算数）；
   * 两头一样 / 点不活 = 抛。来历里的旧样子要在旧边删掉之前用 edgeShape 记下。
   */
  addEdge(a: number, b: number, origin: EdgeOrigin): number {
    if (a === b) throw new Error("addEdge: loop edge");
    if (!this.hasV(a) || !this.hasV(b)) throw new Error(`addEdge: vertex ${this.hasV(a) ? b : a} is not alive`);
    if (this.edgeOf(a, b) >= 0) throw new Error(`addEdge: edge ${a}-${b} already exists (an origin can only be declared when the edge is made)`);
    return this.makeEdge(a, b, origin);
  }
  private makeEdge(a: number, b: number, origin: EdgeOrigin): number {
    const w = this.edgeCols.length ? edgeColumnValues(this.edgeCols, origin) : null;   // 先算好、核过（会抛的都在这里），再动表：造边全有或全无
    const e = this.eFree.length ? this.eFree.pop()! : this.eCount++;
    this.edgeA = grow(this.edgeA, this.eCount); this.edgeB = grow(this.edgeB, this.eCount); this.eAlive = grow(this.eAlive, this.eCount); this.edgeFlags = grow(this.edgeFlags, this.eCount);
    this.edgeA[e] = Math.min(a, b); this.edgeB[e] = Math.max(a, b); this.eAlive[e] = 1; this.edgeFlags[e] = 0;
    this.eNext = grow(this.eNext, 2 * this.eCount); this.eFHead = grow(this.eFHead, this.eCount); this.eFHead[e] = 0;
    this.vLink(this.edgeA[e], 2 * e); this.vLink(this.edgeB[e], 2 * e + 1);
    this.edgeKey.set(this.keyOf(a, b), e);
    if (w) {   // 空出来的编号上可能还留着上一条边的值：一律按来历重写
      this.edgeCols.forEach((c, i) => { c.data = growCol(c.data, this.eCount, c.def.fill); c.data[e] = w.values[i]; });
      if (w.odd) this.oddEdges.set(e, w.odd); else this.oddEdges.delete(e);
    }
    this.changes.e(e); this.touch(true); return e;
  }
  /** 边的旧样子（改 / 删之前记，交给新边的来历）：两头 + 每一列的值（没有边上的列 = null）+ 身上还没交出去的「对不上」。 */
  edgeShape(e: number): EdgeShape {
    if (!this.hasE(e)) throw new Error(`edgeShape: edge ${e} is not alive`);
    const odd = this.oddEdges.get(e);
    const values = this.edgeCols.length ? new Map(this.edgeCols.map((c) => [c.id, c.data[e]] as const)) : null;
    return { a: this.edgeA[e], b: this.edgeB[e], values, ...(odd ? { odd } : {}) };
  }
  /** 原地改一张面的环（劈面 / 并面 / 并点用）：旧环独占的边删掉、新环缺的边补上。origin = 新环从哪来（必填；旧样子要在改之前 shapeOf 记下）。 */
  setFaceRing(f: number, ring: readonly number[], origin: FaceOrigin): void {
    const old = this.faceVerts(f);
    const distinct = new Set(ring);
    if (ring.length < 3 || distinct.size !== ring.length) throw new Error(`setFaceRing: ring must have ≥ 3 distinct vertices`);
    this.unlinkRing(f);
    this.faceStart[f] = this.loopCount; this.faceLen[f] = ring.length;
    this.writeRing(f, ring, origin);
    for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
    this.linkRing(f);
    this.changes.f(f); this.touch(true);
    for (let i = 0; i < old.length; i++) { const e = this.edgeOf(old[i], old[(i + 1) % old.length]); if (e >= 0 && this.eFaces(e).length === 0 && !(this.edgeFlags[e] & F_WIRE)) this.removeEdge(e); }
  }
  /** 环接在 loopVert 末尾（旧环的槽作废）；有列就按来历写面上的列和角上的数（columns.ts writeColumns，全仓唯一的那一段），对不上的记下来。 */
  private writeRing(f: number, ring: readonly number[], origin: FaceOrigin): void {
    const slot = this.loopCount, n = ring.length;
    this.loopVert = grow(this.loopVert, slot + n);
    for (let i = 0; i < n; i++) this.loopVert[slot + i] = ring[i];
    this.loopCount += n;
    if (!this.cornerCols.length && !this.faceCols.length) return;
    for (const c of this.cornerCols) c.data = growCol(c.data, this.loopCount * c.arity, c.def.fill);
    const odd = writeColumns(this, origin, f, ring, slot);
    if (odd) this.odd.set(f, odd); else this.odd.delete(f);
  }

  // ---------------- 列（施工单十八第 1½ 刀：内核不知道列是什么意思）
  /** 加一列（同一个 id 已经有 = 声明一样就不动，不一样 = 抛；这一刀做不了的组合 = 抛「还没做」，columns.ts checkColumnDef）。原有的角 / 面填 fill。 */
  addColumn(def: ColumnDef): void {
    const arity = checkColumnDef(def), have = this.columnDef(def.id);
    if (have) { if (!sameColumnDef(have, def)) throw new Error(`addColumn: column ${def.id} already exists with a different declaration`); return; }
    const d: ColumnDef = Object.freeze({ ...def });
    const ints = (n: number): Int32Array | Uint8Array => (d.type === "bool" ? new Uint8Array(Math.max(16, n)) : new Int32Array(Math.max(16, n))).fill(d.fill);
    if (def.on === "corner") this.cornerCols.push({ def: d, id: d.id, arity, data: new Float32Array(Math.max(16, this.loopCount * arity)).fill(d.fill) });
    else if (def.on === "face") this.faceCols.push({ def: d, id: d.id, data: ints(this.fCount) });
    else this.edgeCols.push({ def: d, id: d.id, data: ints(this.eCount) });
    this.rev = ++meshRevClock;
  }
  /** 删一列（属性页「删」= 全部回缺省值；可以撤销：撤销记录是整份表）。没有这一列 = false。身上记着的「对不上」里这一列一起去掉。 */
  removeColumn(id: string): boolean {
    const drop = <T extends { id: string }>(xs: T[]): T[] | null => (xs.some((c) => c.id === id) ? xs.filter((c) => c.id !== id) : null);
    const cc = drop(this.cornerCols), fc = drop(this.faceCols), ec = drop(this.edgeCols);
    if (!cc && !fc && !ec) return false;
    if (cc) this.cornerCols = cc; if (fc) this.faceCols = fc; if (ec) this.edgeCols = ec;
    const without = <K>(m: Map<K, OddFace>): Map<K, OddFace> => { const o = new Map<K, OddFace>(); for (const [k, v] of m) { const face = new Map(v.face), corner = new Map(v.corner); face.delete(id); corner.delete(id); if (face.size || corner.size) o.set(k, { face, corner }); } return o; };
    this.odd = without(this.odd);
    const oe = new Map<number, OddEdge>(); for (const [e, v] of this.oddEdges) { const edge = new Map(v.edge); edge.delete(id); if (edge.size) oe.set(e, { edge }); } this.oddEdges = oe;
    this.touch(true);
    return true;
  }
  /**
   * 一列（读的人长期拿在手里的那个对象，data 永远是现在那一条；没有 = null）。整份换表（撤销、提交）、加删列之后 rev 会变，变了再问一次（columns.ts Column 头注释）。
   */
  column(id: string): Column | null { return this.cornerCols.find((c) => c.id === id) ?? this.faceCols.find((c) => c.id === id) ?? this.edgeCols.find((c) => c.id === id) ?? null; }
  /** 列清单（属性页第一版只看用）：每一列的名字、挂在哪、类型、多少个（那一类活着的元素数）、占多大（逻辑上的字节数）。 */
  columnList(): { id: string; on: ColumnDef["on"]; type: string; count: number; bytes: number }[] {
    const n = this.elementCounts(), per = (d: ColumnDef): number => (d.type === "bool" ? 1 : d.type === "int" ? 4 : 4 * d.type.floats);
    const countOf = (d: ColumnDef): number => (d.on === "corner" ? n.corners : d.on === "face" ? n.faces : d.on === "edge" ? n.edges : 0);
    return this.columnDefs().map((d) => ({ id: d.id, on: d.on, type: typeName(d.type), count: countOf(d), bytes: countOf(d) * per(d) }));
  }
  /** 几何本身有多少（属性页「几何」那一块）：点、边、面、角（每张面的角数之和）、不挂面的线。 */
  elementCounts(): { points: number; edges: number; faces: number; corners: number; wires: number } {
    let corners = 0, wires = 0;
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) corners += this.faceLen[f];
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e] && !this.eFHead[e]) wires++;
    return { points: this.vertexCount(), edges: this.edgeCount(), faces: this.faceCount(), corners, wires };
  }
  /** 别的内核的列在这边补上（整张面搬过来之前；原有的面在补上的列上填 fill）。 */
  ensureColumns(defs: readonly ColumnDef[]): void { for (const d of defs) this.addColumn(d); }
  /** 全部列的声明（先角上的、再面上的；先后没有意思）。 */
  columnDefs(): ColumnDef[] { return [...this.cornerCols.map((c) => c.def), ...this.faceCols.map((c) => c.def), ...this.edgeCols.map((c) => c.def)]; }
  /** 一列的声明；没有 = null。 */
  columnDef(id: string): ColumnDef | null { return this.column(id)?.def ?? null; }
  /** 有没有这一列（三种都算）。 */
  hasColumn(id: string): boolean { return this.column(id) !== null; }
  /** 面的旧样子（改之前记）：没有列 = 只记材质。 */
  shapeOf(f: number): FaceShape {
    const odd = this.odd.get(f);
    if (!this.cornerCols.length && !this.faceCols.length) return { ring: null, pts: null, corner: null, face: null, ...(odd ? { odd } : {}) };
    const ring = this.faceVerts(f), pts = new Float64Array(3 * ring.length);
    for (let i = 0; i < ring.length; i++) { const v = ring[i]; pts[3 * i] = this.pos[3 * v]; pts[3 * i + 1] = this.pos[3 * v + 1]; pts[3 * i + 2] = this.pos[3 * v + 2]; }
    const c = this.columnsOf(f);
    return { ring, pts, corner: c.corner, face: c.face, ...(odd ? { odd } : {}) };
  }
  /** 这张面在一列角上的列上各角的值（角数 × arity，拷一份）；没有这一列 / 面不在 = null。 */
  cornerValues(f: number, id: string): Float32Array | null {
    const c = this.cornerCols.find((x) => x.id === id);
    if (!c || !this.hasF(f)) return null;
    const s = this.faceStart[f] * c.arity;
    return c.data.slice(s, s + this.faceLen[f] * c.arity);
  }
  /** 这张面在一列面上的列上的值；没有这一列 / 面不在 = null。 */
  faceValue(f: number, id: string): number | null {
    const c = this.faceCols.find((x) => x.id === id);
    return c && this.hasF(f) ? c.data[f] : null;
  }
  /** 这张面在每一列上的值（整张面搬到别的内核时交给 fresh；shapeOf 也用它）。 */
  columnsOf(f: number): { corner: Map<string, Float32Array>; face: Map<string, number> } {
    const corner = new Map<string, Float32Array>(), face = new Map<string, number>();
    for (const c of this.cornerCols) { const s = this.faceStart[f] * c.arity; corner.set(c.id, c.data.slice(s, s + this.faceLen[f] * c.arity)); }
    for (const c of this.faceCols) face.set(c.id, c.data[f]);
    return { corner, face };
  }
  /** 给一张面在一列角上的列上整张写值（角数 × arity 个）。进改动日志、rev 动。 */
  setCornerValues(f: number, id: string, values: ArrayLike<number>): void {
    const c = this.cornerCols.find((x) => x.id === id);
    if (!c) throw new Error(`setCornerValues: no corner column ${id}`);
    if (!this.hasF(f)) throw new Error(`setCornerValues: face ${f} is not alive`);
    const s = this.faceStart[f] * c.arity, n = this.faceLen[f] * c.arity;
    if (values.length !== n) throw new Error(`setCornerValues: need ${n} numbers, got ${values.length}`);
    for (let i = 0; i < n; i++) c.data[s + i] = values[i];
    this.changes.f(f); this.rev = ++meshRevClock;
  }
  /** 给一张面在一列面上的列上写值。进改动日志、rev 动。 */
  setFaceValue(f: number, id: string, v: number): void {
    const c = this.faceCols.find((x) => x.id === id);
    if (!c) throw new Error(`setFaceValue: no face column ${id}`);
    if (!this.hasF(f)) throw new Error(`setFaceValue: face ${f} is not alive`);
    if (!Number.isInteger(v)) throw new Error(`setFaceValue: ${v} is not an integer`);
    if (c.def.type === "bool" && v !== 0 && v !== 1) throw new Error(`setFaceValue: bool column ${id} takes 0 or 1, got ${v}`);
    c.data[f] = v; this.changes.f(f); this.rev = ++meshRevClock;
  }
  /** 这条边在一列边上的列上的值；没有这一列 / 边不在 = null。 */
  edgeValue(e: number, id: string): number | null {
    const c = this.edgeCols.find((x) => x.id === id);
    return c && this.hasE(e) ? c.data[e] : null;
  }
  /** 给一条已经在的边在一列边上的列上写值（操作本意要写的〔倒角写平滑〕、指令点名写的〔手标〕；不是「造完回头补来历」——来历在 addEdge 时给）。进改动日志、rev 动。 */
  setEdgeValue(e: number, id: string, v: number): void {
    const c = this.edgeCols.find((x) => x.id === id);
    if (!c) throw new Error(`setEdgeValue: no edge column ${id}`);
    if (!this.hasE(e)) throw new Error(`setEdgeValue: edge ${e} is not alive`);
    if (!Number.isInteger(v)) throw new Error(`setEdgeValue: ${v} is not an integer`);
    if (c.def.type === "bool" && v !== 0 && v !== 1) throw new Error(`setEdgeValue: bool column ${id} takes 0 or 1, got ${v}`);
    c.data[e] = v; this.changes.e(e); this.rev = ++meshRevClock;
  }
  /** 上一次拿走之后「对不上」的面（还活着的；面编号 → 哪几列）和没了的面，拿走即清空。 */
  takeReport(): FaceReport {
    const odd = new Map<number, OddFace>();
    for (const [f, o] of this.odd) if (this.hasF(f)) odd.set(f, o);
    const oddEdges = new Map<number, OddEdge>();
    for (const [e, o] of this.oddEdges) if (this.hasE(e)) oddEdges.set(e, o);
    const gone = this.goneList;
    this.odd = new Map(); this.goneList = []; this.oddEdges = new Map();
    return { odd, gone, oddEdges };
  }
  /** 删面并记进报告「没了的面」（原因由调用方给，内核不认它；with = 和哪张重叠之类）：记下删之前的样子，再照 removeFace 删。 */
  removeFaceReported(f: number, why: GoneWhy, withFace?: number): void {
    if (!this.hasF(f)) return;
    this.goneList.push({ why, ...(withFace !== undefined ? { with: withFace } : {}), shape: this.shapeOf(f) });
    this.removeFace(f);
  }
  /**
   * 把边 e 的一头从 from 换成 to（还是那条边：编号、标记都不变）。要求：这条边现在不挂面（调用方先把面摘下来）、to 活着、换完的那一对点上还没有边。
   * 合并点用（第七¾节第 2 条「只是一头换了点的边还是那条边」）；增量邻接一起改（check 的 M8 对拍守着）。
   */
  relinkEdgeEnd(e: number, from: number, to: number): void {
    if (!this.hasE(e)) throw new Error(`relinkEdgeEnd: edge ${e} is not alive`);
    if (!this.hasV(to)) throw new Error(`relinkEdgeEnd: vertex ${to} is not alive`);
    const a = this.edgeA[e], b = this.edgeB[e];
    if (from !== a && from !== b) throw new Error(`relinkEdgeEnd: ${from} is not an end of edge ${e}`);
    const other = from === a ? b : a;
    if (to === other) throw new Error(`relinkEdgeEnd: would make a loop edge`);
    if (this.eFHead[e]) throw new Error(`relinkEdgeEnd: edge ${e} still belongs to a face`);
    if (this.edgeOf(other, to) >= 0) throw new Error(`relinkEdgeEnd: there is already an edge between ${other} and ${to}`);
    this.vUnlink(a, 2 * e); this.vUnlink(b, 2 * e + 1);
    this.edgeKey.delete(this.keyOf(a, b));
    this.edgeA[e] = Math.min(other, to); this.edgeB[e] = Math.max(other, to);
    this.vLink(this.edgeA[e], 2 * e); this.vLink(this.edgeB[e], 2 * e + 1);
    this.edgeKey.set(this.keyOf(other, to), e);
    this.changes.e(e); this.touch(true);
  }
  /**
   * 合并点（规程第七¾节第二稿；规划在 merge-points.ts、角上的数在 columns.ts mergeCornerValues）：若干组点各合并成一个，所有组一次做完、和组的先后无关。
   * 返回每组的幸存点（每组第一个点；照传进来的先后）。塌掉的面、合并出来同一圈点的重叠面删掉、进报告「没了的面」（原因 collapsed / overlap）。
   */
  mergePoints(groups: readonly MergeGroup[]): number[] {
    const plan = planMerge(this, groups);
    const vals = mergeCornerValues(this.cornerCols, plan.faces, plan.weight);
    for (const p of plan.faces) this.unlinkRing(p.f);   // ① 受影响的面从边上摘下来（摘的时候按角上记着的边号，不按端点查）
    const joinedShapes = this.edgeCols.length ? new Map(plan.edges.filter((ep) => ep.drop.length).flatMap((ep) => [ep.keep, ...ep.drop].map((e) => [e, this.edgeShape(e)] as const))) : null;   // 边上的列：并掉之前记下各来源的值
    this.dropEdges([...plan.collapsed, ...plan.edges.flatMap((ep) => ep.drop)]);   // ② 边：两头合并到一起的、并掉的删（现在都不挂面了）；留下的改端点、并标记
    for (const ep of plan.edges) {
      const e = ep.keep;
      for (const end of [this.edgeA[e], this.edgeB[e]]) { const to = plan.rep.get(end); if (to !== undefined && to !== end) this.relinkEdgeEnd(e, end, to); }   // 并掉的都删过了：中途换出来的那一对点上不会已经有边
      if (this.edgeFlags[e] !== ep.flags) { this.edgeFlags[e] = ep.flags; this.changes.e(e); }
      if (joinedShapes && ep.drop.length) {   // 几条并成一条 = 并成（先后 = 原来的编号从小到大）：每一列照自己的 merge 取，不一样进边的报告
        const odd = writeEdgeColumns(this.edgeCols, { kind: "joined", of: [e, ...ep.drop].map((x) => joinedShapes.get(x)!) }, e);
        if (odd) this.oddEdges.set(e, odd); else this.oddEdges.delete(e);
        this.changes.e(e);
      }
    }
    this.removeVertices(plan.gone);   // ③ 被合并掉的点（它的边上面都处理掉了；一批删、空位表排一次）
    const touched: number[] = [], spurs: [number, number][] = [];
    plan.faces.forEach((p, pi) => {   // ④ 面：编号从小到大
      if (p.main < 0) {   // 塌了（剪出来的刺照样留成线）
        this.fAlive[p.f] = 0; this.fFree.push(p.f); this.fFree.sort((a, b) => b - a); this.odd.delete(p.f); this.changes.f(p.f);
        this.goneList.push({ why: "collapsed", shape: p.shape });
        for (const loop of p.loops) if (loop.length === 2) spurs.push([p.corners[loop[0]].v, p.corners[loop[1]].v]);
        return;
      }
      const put = (loop: readonly number[], f: number | null): number => {
        const ring = loop.map((c) => p.corners[c].v), origin: FaceOrigin = { kind: "copy", of: p.shape, corners: loop.map((c) => p.corners[c].src[0]) };
        let g: number;
        if (f === null) g = this.addFace(ring, origin);   // 剪出来的别的圈 = 原面的一份（面上的列照抄，材质、隐藏都在里面）
        else {
          g = f; this.faceStart[g] = this.loopCount; this.faceLen[g] = ring.length;
          this.writeRing(g, ring, origin);
          for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
          this.linkRing(g); this.changes.f(g);
        }
        for (const c of this.cornerCols) { const v = vals[pi].get(c.id); if (!v) continue; const o = new Float32Array(loop.length * c.arity); loop.forEach((ci, j) => o.set(v.subarray(ci * c.arity, ci * c.arity + c.arity), j * c.arity)); this.setCornerValues(g, c.id, o); }
        touched.push(g);
        return g;
      };
      put(p.loops[p.main], p.f);
      p.loops.forEach((loop, li) => {
        if (li === p.main) return;
        if (loop.length >= 3) put(loop, null);
        else if (loop.length === 2) spurs.push([p.corners[loop[0]].v, p.corners[loop[1]].v]);
      });
    });
    for (const [a, b] of spurs) { const e = this.edgeOf(a, b); if (e >= 0 && !this.eFHead[e] && !(this.edgeFlags[e] & F_WIRE)) { this.edgeFlags[e] |= F_WIRE; this.changes.e(e); } }   // ⑤ 刺 = 不挂面的线（刺尖的点不删）；那条边还挂着别的面就不用打
    this.dropEdges(plan.edges.map((ep) => ep.keep).filter((e) => this.hasE(e) && !this.eFHead[e] && !(this.edgeFlags[e] & F_WIRE)));   // ⑥ 塌掉的面留下的、不挂面又不是线的边
    const seen = new Set<number>();   // ⑦ 重叠：同一圈点（同向或反向）留编号最小的
    for (const f of touched.sort((a, b) => a - b)) {
      if (!this.hasF(f) || seen.has(f)) continue;
      const ring = this.faceVerts(f), key = ringKey(ring), same: number[] = [f], has = new Set(ring);
      for (const e of this.vEdges(ring[0])) for (const g of this.eFaces(e)) {   // 先看角数和点都对得上（便宜），再比一圈
        if (same.includes(g) || this.faceLen[g] !== ring.length) continue;
        const gv = this.faceVerts(g);
        if (gv.every((x) => has.has(x)) && ringKey(gv) === key) same.push(g);
      }
      same.sort((a, b) => a - b);
      for (const g of same) seen.add(g);
      for (const g of same.slice(1)) this.removeFaceReported(g, "overlap", same[0]);
    }
    for (const v of [...plan.pos.keys()].sort((a, b) => a - b)) this.setPos(v, plan.pos.get(v)!);   // ⑧ 点挪到最后的位置
    this.touch(true);
    return [...plan.survivors];
  }
  setPos(v: number, p: Pt3): void { this.pos[3 * v] = p.x; this.pos[3 * v + 1] = p.y; this.pos[3 * v + 2] = p.z; this.changes.v(v); this.touch(false); }
  setFlags(e: number, mask: number, on: boolean): void { if (!this.hasE(e)) return; this.edgeFlags[e] = on ? this.edgeFlags[e] | mask : this.edgeFlags[e] & ~mask; this.changes.e(e); this.rev = ++meshRevClock; }
  /** 整字节写边标记（算子搬标记用）；记日志。 */
  /** 裸线位（结构位，不是属性：「这条边可以不挂面」，规程第二½节算几何本身）。3a 先给口，存法照旧（边标记字节的 F_WIRE 那一位）；3d 老数组删掉时换成自己的一张位表。 */
  isWire(e: number): boolean { return this.hasE(e) && (this.edgeFlags[e] & F_WIRE) !== 0; }
  setWire(e: number, on: boolean): void { if (!this.hasE(e)) return; this.edgeFlags[e] = on ? this.edgeFlags[e] | F_WIRE : this.edgeFlags[e] & ~F_WIRE; this.changes.e(e); this.rev = ++meshRevClock; }
  setEdgeFlags(e: number, flags: number): void { if (!this.hasE(e)) return; this.edgeFlags[e] = flags; this.changes.e(e); this.rev = ++meshRevClock; }
  /** 换默认平滑：每条边的「平滑吗 / 画线吗」都可能变 → 所有边和面都记进改动日志（渲染按日志增量重建）。 */
  setSmoothDefault(sd: SmoothDefault): void {
    if (sd.mode === this.smoothDefault.mode && sd.deg === this.smoothDefault.deg) return;
    this.smoothDefault = { mode: sd.mode, deg: sd.deg };
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e]) this.changes.e(e);
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) this.changes.f(f);
    this.rev = ++meshRevClock;
  }
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
   * 一张面切成哪几个三角形（下标 = 环上的位置，按面自己的绕向；FM130）。**网格体的面切三角形全仓只从这里来**（2026-11-10 起：别处要用面的三角形都从这里拿）：
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
    m.faceStart = this.faceStart.slice(); m.faceLen = this.faceLen.slice(); m.fAlive = this.fAlive.slice(); m.fCount = this.fCount; m.fFree = [...this.fFree];
    m.loopVert = this.loopVert.slice(); m.loopCount = this.loopCount;
    m.edgeA = this.edgeA.slice(); m.edgeB = this.edgeB.slice(); m.eAlive = this.eAlive.slice(); m.edgeFlags = this.edgeFlags.slice(); m.eCount = this.eCount; m.eFree = [...this.eFree];
    m.edgeKey = new Map(this.edgeKey); m.rev = this.rev; m.smoothDefault = this.smoothDefault;
    m.changes = this.changes.fork();   // 族谱：渲染缓存从原件切到副本只重建差的
    m.cornerCols = this.cornerCols.map((c) => ({ ...c, data: c.data.slice() })); m.faceCols = this.faceCols.map((c) => ({ ...c, data: c.data.slice() })); m.edgeCols = this.edgeCols.map((c) => ({ ...c, data: c.data.slice() }));   // 「对不上」的标记不带过去（新的一本）
    m.vHead = this.vHead.slice(); m.eNext = this.eNext.slice(); m.eFHead = this.eFHead.slice(); m.lNext = this.lNext.slice(); m.lEdge = this.lEdge.slice(); m.lFace = this.lFace.slice();   // 邻接跟着拷（W-11）
    return m;
  }
  /**
   * 整份表互换（对象身份不变；brep Kernel.swapTablesWith 同款）：撤销记录 = 提交前的拷贝，撤 / 重做 = 和真身互换——自反、不重跑算子。
   * rev / 改动日志一起换：换回来的表配的是它自己那本日志（渲染缓存按日志族谱算差）。
   */
  swapWith(o: MeshKernel): void {
    [this.pos, o.pos] = [o.pos, this.pos]; [this.vAlive, o.vAlive] = [o.vAlive, this.vAlive]; [this.vCount, o.vCount] = [o.vCount, this.vCount]; [this.vFree, o.vFree] = [o.vFree, this.vFree];
    [this.faceStart, o.faceStart] = [o.faceStart, this.faceStart]; [this.faceLen, o.faceLen] = [o.faceLen, this.faceLen]; [this.fAlive, o.fAlive] = [o.fAlive, this.fAlive]; [this.fCount, o.fCount] = [o.fCount, this.fCount]; [this.fFree, o.fFree] = [o.fFree, this.fFree];
    [this.loopVert, o.loopVert] = [o.loopVert, this.loopVert]; [this.loopCount, o.loopCount] = [o.loopCount, this.loopCount];
    [this.edgeA, o.edgeA] = [o.edgeA, this.edgeA]; [this.edgeB, o.edgeB] = [o.edgeB, this.edgeB]; [this.eAlive, o.eAlive] = [o.eAlive, this.eAlive]; [this.edgeFlags, o.edgeFlags] = [o.edgeFlags, this.edgeFlags]; [this.eCount, o.eCount] = [o.eCount, this.eCount]; [this.eFree, o.eFree] = [o.eFree, this.eFree];
    [this.edgeKey, o.edgeKey] = [o.edgeKey, this.edgeKey]; [this.vHead, o.vHead] = [o.vHead, this.vHead]; [this.eNext, o.eNext] = [o.eNext, this.eNext]; [this.eFHead, o.eFHead] = [o.eFHead, this.eFHead]; [this.lNext, o.lNext] = [o.lNext, this.lNext]; [this.lEdge, o.lEdge] = [o.lEdge, this.lEdge]; [this.lFace, o.lFace] = [o.lFace, this.lFace]; [this.triCache, o.triCache] = [o.triCache, this.triCache];
    [this.rev, o.rev] = [o.rev, this.rev]; [this.changes, o.changes] = [o.changes, this.changes]; [this.smoothDefault, o.smoothDefault] = [o.smoothDefault, this.smoothDefault];
    [this.cornerCols, o.cornerCols] = [o.cornerCols, this.cornerCols]; [this.faceCols, o.faceCols] = [o.faceCols, this.faceCols]; [this.edgeCols, o.edgeCols] = [o.edgeCols, this.edgeCols]; [this.odd, o.odd] = [o.odd, this.odd]; [this.oddEdges, o.oddEdges] = [o.oddEdges, this.oddEdges]; [this.goneList, o.goneList] = [o.goneList, this.goneList];
  }
  /** 紧凑快照（去空位、id 重编：存 / 导出时整理，user 10-27「catsup rule: organize in export/save」）。 */
  toSnapshot(): MeshSnapshot {
    const map = new Int32Array(this.vCount).fill(-1); const positions: number[] = []; let n = 0;
    for (let v = 0; v < this.vCount; v++) if (this.vAlive[v]) { map[v] = n++; positions.push(this.pos[3 * v], this.pos[3 * v + 1], this.pos[3 * v + 2]); }
    const faces: number[][] = [], live: number[] = [];
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) { faces.push(this.faceVerts(f).map((v) => map[v])); live.push(f); }
    const edges: [number, number, number][] = [];
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e] && this.edgeFlags[e]) edges.push([map[this.edgeA[e]], map[this.edgeB[e]], this.edgeFlags[e]]);
    const corner = this.cornerCols.map((c) => ({ def: c.def, faces: live.map((f) => Array.from(this.cornerValues(f, c.id)!)) }));
    const face = this.faceCols.map((c) => ({ def: c.def, values: live.map((f) => c.data[f]) }));
    const liveE = this.edges(), edge = this.edgeCols.map((c) => ({ def: c.def, values: liveE.map((e) => [map[this.edgeA[e]], map[this.edgeB[e]], c.data[e]] as const) }));
    return { version: 3, minor: 0, patch: 0, positions, faces, edges, ...(corner.length ? { corner } : {}), ...(face.length ? { face } : {}), ...(edge.length ? { edge } : {}) };
  }
  static fromSnapshot(s: MeshSnapshot): MeshKernel {
    const m = new MeshKernel();
    for (let i = 0; i + 2 < s.positions.length; i += 3) m.addVertex({ x: s.positions[i], y: s.positions[i + 1], z: s.positions[i + 2] });
    for (const c of s.corner ?? []) m.addColumn(c.def);
    for (const c of s.face ?? []) m.addColumn(c.def);
    if (s.edge?.length) {   // 边上的列：先把每条边带着值造好（快照装载 = 凭空来的、直接给值），再加面（面找到已经在的边）
      for (const c of s.edge) m.addColumn(c.def);
      const vals = new Map<string, Map<string, number>>();
      for (const c of s.edge) for (const [a, b, v] of c.values) { const k = a < b ? `${a},${b}` : `${b},${a}`; (vals.get(k) ?? vals.set(k, new Map()).get(k)!).set(c.def.id, v); }
      for (const [k, values] of vals) { const [a, b] = k.split(",").map(Number); m.addEdge(a, b, { kind: "fresh", values }); }
    }
    s.faces.forEach((r, i) => { m.addFace(r, { kind: "fresh", corner: new Map((s.corner ?? []).map((c) => [c.def.id, Float32Array.from(c.faces[i])])), face: new Map((s.face ?? []).map((c) => [c.def.id, c.values[i]])) }); });   // 快照装载 = 凭空来的、直接给值
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
    // (M7) 列的数组装得下所有的角 / 所有的面
    for (const c of this.cornerCols) if (c.data.length < this.loopCount * c.arity) bad.push(`corner column ${c.id}: array shorter than the corners`);
    for (const c of this.faceCols) if (c.data.length < this.fCount) bad.push(`face column ${c.id}: array shorter than the faces`);
    for (const c of this.edgeCols) if (c.data.length < this.eCount) bad.push(`edge column ${c.id}: array shorter than the edges`);
    // (M7¼) 布尔列的值只有 0 / 1（活的元素上）
    for (const c of this.faceCols) if (c.def.type === "bool") for (let f = 0; f < this.fCount; f++) if (this.fAlive[f] && c.data[f] > 1) { bad.push(`face ${f}: bool column ${c.id} = ${c.data[f]}`); break; }
    for (const c of this.edgeCols) if (c.def.type === "bool") for (let e = 0; e < this.eCount; e++) if (this.eAlive[e] && c.data[e] > 1) { bad.push(`edge ${e}: bool column ${c.id} = ${c.data[e]}`); break; }
    // (M7½) 带 quantum 的角上的列：每张活面上的值 × quantum 是整数（这列数的格子，由声明给）
    for (const c of this.cornerCols) {
      const qn = c.def.quantum;
      if (qn === undefined) continue;
      for (let f = 0; f < this.fCount; f++) {
        if (!this.fAlive[f]) continue;
        const s = this.faceStart[f] * c.arity, n = this.faceLen[f] * c.arity;
        for (let i = 0; i < n; i++) { const q = c.data[s + i] * qn; if (q !== Math.round(q)) { bad.push(`face ${f}: corner column ${c.id} value ${c.data[s + i]} is not a multiple of 1/${qn}`); break; } }
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

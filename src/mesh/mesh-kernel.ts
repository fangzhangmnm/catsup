// mesh/mesh-kernel.ts —— mesh 内核（自由建模的身体；提案 ai-docs/20261027-mesh-kernel-proposal.md §1–§2，user 10-27 拍：另做网格内核、列式 + 纯函数、
// 面 = 简单顶点环（任意边数、允许不平、不带洞、单面）、顶点 id 寻址、没有几何公理只有拓扑不变量）。created 2026-10-27 by Claude Fable 5.1
//
// 列式：所有表都是定长类型数组 + 活跃位图 + 空闲表（id = 下标，删了不挪；复用取最小空位 = 确定性）。邻接（点 → 边、边 → 面、面 → 边）是派生的压缩数组，
// 拓扑算子改完标脏、下次查询前 O(n) 重建；只改坐标的算子不碰它（软挪 / 雕每帧只写 pos）。
// 不变量（test/mesh-kernel.test.ts 逐算子查）：(M1) 活面的环 ≥ 3 个不同的活顶点、环里没有重复顶点 (M2) 环上相邻顶点对都在边表里、边表里的边至少属于一张面或标为裸线
// (M3) 标记只在活边上 (M4) 封闭流形块 V − E + F = 2 − 2g（只对流形块查）(M5) 删了的 id 不被任何活元素引用 (M6) 同算子在克隆上跑 = 同结果。
// 这里只有数据 + 查询 + 最基本的生长 / 删除原语；拓扑算子在 mesh/ops/*.ts（每个一个文件，可扔）。
import { type Pt3, planeOfRing } from "../kernel/geom.ts";
import { triangulateRings } from "../format/triangulate.ts";

export const F_SOFT = 1, F_SMOOTH = 2, F_SEAM = 4, F_HIDDEN = 8, F_WIRE = 16;   // F_WIRE = 裸线（不属于任何面也合法）

export interface MeshSnapshot {
  readonly version: 1; readonly minor: 0; readonly patch: 0;
  readonly positions: number[];          // x y z × 顶点（紧凑、重编）
  readonly faces: number[][];            // 每面顶点下标环
  readonly faceMat: number[];            // 每面材质槽（-1 = 默认）
  readonly edges: [number, number, number][];   // 带标记的边：[a, b, flags]（没标记的边不存，读回时由面推）
}

const grow = <T extends Float64Array | Int32Array | Uint8Array>(a: T, n: number): T => { if (n <= a.length) return a; const b = new (a.constructor as new (n: number) => T)(Math.max(n, a.length * 2, 16)); b.set(a as never); return b; };

export class MeshKernel {
  // 顶点
  pos = new Float64Array(0); vAlive = new Uint8Array(0); private vCount = 0; private vFree: number[] = [];
  // 面：loopVert[faceStart[f] .. +faceLen[f])
  faceStart = new Int32Array(0); faceLen = new Int32Array(0); fAlive = new Uint8Array(0); faceMat = new Int32Array(0); private fCount = 0; private fFree: number[] = [];
  loopVert = new Int32Array(0); private loopCount = 0;
  // 边
  edgeA = new Int32Array(0); edgeB = new Int32Array(0); eAlive = new Uint8Array(0); edgeFlags = new Uint8Array(0); private eCount = 0; private eFree: number[] = [];
  private edgeKey = new Map<number, number>();   // a * 2^26 + b（a < b）→ 边 id
  // 派生
  private adjDirty = true;
  private vE = { start: new Int32Array(0), list: new Int32Array(0) };
  private eF = { start: new Int32Array(0), list: new Int32Array(0) };
  private triCache: { tris: Int32Array; faceOfTri: Int32Array; rev: number } | null = null;
  /** 改动计数（渲染缓存 / 预演差量的钥匙；拓扑或坐标改了就 +1）。 */
  rev = 0;

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
  vEdges(v: number): Int32Array { this.adjacency(); return this.vE.list.subarray(this.vE.start[v], this.vE.start[v + 1]); }
  eFaces(e: number): Int32Array { this.adjacency(); return this.eF.list.subarray(this.eF.start[e], this.eF.start[e + 1]); }
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
    this.pos = grow(this.pos, 3 * this.vCount); this.vAlive = grow(this.vAlive, this.vCount);
    this.pos[3 * v] = p.x; this.pos[3 * v + 1] = p.y; this.pos[3 * v + 2] = p.z; this.vAlive[v] = 1;
    this.touch(true); return v;
  }
  /** 加一张面（顶点环）；相邻顶点对没有边的自动补边。环 < 3 个不同顶点 / 有重复 / 顶点不活 → 抛（人话）。 */
  addFace(ring: readonly number[], mat = -1): number {
    const distinct = new Set(ring);
    if (ring.length < 3 || distinct.size !== ring.length) throw new Error(`addFace: ring must have ≥ 3 distinct vertices (got ${ring.length}, ${distinct.size} distinct)`);
    for (const v of ring) if (!this.hasV(v)) throw new Error(`addFace: vertex ${v} is not alive`);
    const f = this.fFree.length ? this.fFree.pop()! : this.fCount++;
    this.faceStart = grow(this.faceStart, this.fCount); this.faceLen = grow(this.faceLen, this.fCount); this.fAlive = grow(this.fAlive, this.fCount); this.faceMat = grow(this.faceMat, this.fCount);
    this.faceStart[f] = this.loopCount; this.faceLen[f] = ring.length; this.fAlive[f] = 1; this.faceMat[f] = mat;
    this.loopVert = grow(this.loopVert, this.loopCount + ring.length);
    for (let i = 0; i < ring.length; i++) this.loopVert[this.loopCount + i] = ring[i];
    this.loopCount += ring.length;
    for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
    this.touch(true); return f;
  }
  /** 删面；它独占的边（没别的面、不是裸线）一起删；孤立的顶点留着（Blender 同款：删面留点线，要删干净用 ops 的 deleteFaces(onlyFaces=false)）。 */
  removeFace(f: number): void {
    if (!this.hasF(f)) return;
    const vs = this.faceVerts(f);
    this.fAlive[f] = 0; this.fFree.push(f); this.fFree.sort((a, b) => b - a);
    this.touch(true);
    for (let i = 0; i < vs.length; i++) { const e = this.edgeOf(vs[i], vs[(i + 1) % vs.length]); if (e >= 0 && this.eFaces(e).length === 0 && !(this.edgeFlags[e] & F_WIRE)) this.removeEdge(e); }
  }
  removeEdge(e: number): void {
    if (!this.hasE(e)) return;
    if (this.eFaces(e).length) throw new Error(`removeEdge: edge ${e} still belongs to a face`);
    this.edgeKey.delete(this.keyOf(this.edgeA[e], this.edgeB[e]));
    this.eAlive[e] = 0; this.edgeFlags[e] = 0; this.eFree.push(e); this.eFree.sort((a, b) => b - a);
    this.touch(true);
  }
  removeVertex(v: number): void {
    if (!this.hasV(v)) return;
    if (this.vEdges(v).length) throw new Error(`removeVertex: vertex ${v} still has edges`);
    this.vAlive[v] = 0; this.vFree.push(v); this.vFree.sort((a, b) => b - a);
    this.touch(true);
  }
  ensureEdge(a: number, b: number): number {
    if (a === b) throw new Error("ensureEdge: loop edge");
    const have = this.edgeOf(a, b); if (have >= 0) return have;
    const e = this.eFree.length ? this.eFree.pop()! : this.eCount++;
    this.edgeA = grow(this.edgeA, this.eCount); this.edgeB = grow(this.edgeB, this.eCount); this.eAlive = grow(this.eAlive, this.eCount); this.edgeFlags = grow(this.edgeFlags, this.eCount);
    this.edgeA[e] = Math.min(a, b); this.edgeB[e] = Math.max(a, b); this.eAlive[e] = 1; this.edgeFlags[e] = 0;
    this.edgeKey.set(this.keyOf(a, b), e);
    this.touch(true); return e;
  }
  /** 原地改一张面的环（劈面 / 并面 / 并点用）：旧环独占的边删掉、新环缺的边补上。 */
  setFaceRing(f: number, ring: readonly number[]): void {
    const old = this.faceVerts(f);
    const distinct = new Set(ring);
    if (ring.length < 3 || distinct.size !== ring.length) throw new Error(`setFaceRing: ring must have ≥ 3 distinct vertices`);
    this.faceStart[f] = this.loopCount; this.faceLen[f] = ring.length;
    this.loopVert = grow(this.loopVert, this.loopCount + ring.length);
    for (let i = 0; i < ring.length; i++) this.loopVert[this.loopCount + i] = ring[i];
    this.loopCount += ring.length;
    for (let i = 0; i < ring.length; i++) this.ensureEdge(ring[i], ring[(i + 1) % ring.length]);
    this.touch(true);
    for (let i = 0; i < old.length; i++) { const e = this.edgeOf(old[i], old[(i + 1) % old.length]); if (e >= 0 && this.eFaces(e).length === 0 && !(this.edgeFlags[e] & F_WIRE)) this.removeEdge(e); }
  }
  setPos(v: number, p: Pt3): void { this.pos[3 * v] = p.x; this.pos[3 * v + 1] = p.y; this.pos[3 * v + 2] = p.z; this.touch(false); }
  setFlags(e: number, mask: number, on: boolean): void { if (!this.hasE(e)) return; this.edgeFlags[e] = on ? this.edgeFlags[e] | mask : this.edgeFlags[e] & ~mask; this.rev++; }
  hasFlag(e: number, mask: number): boolean { return this.hasE(e) && (this.edgeFlags[e] & mask) !== 0; }

  private keyOf(a: number, b: number): number { return a < b ? a * 67108864 + b : b * 67108864 + a; }
  private touch(topo: boolean): void { this.rev++; this.triCache = null; if (topo) this.adjDirty = true; }

  // ---------------- 邻接（派生，O(n) 重建）
  private adjacency(): void {
    if (!this.adjDirty) return;
    const vs = new Int32Array(this.vCount + 1), ve: number[][] = Array.from({ length: this.vCount }, () => []);
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e]) { ve[this.edgeA[e]].push(e); ve[this.edgeB[e]].push(e); }
    let total = 0; for (let v = 0; v < this.vCount; v++) { vs[v] = total; total += ve[v].length; } vs[this.vCount] = total;
    const vl = new Int32Array(total); for (let v = 0; v < this.vCount; v++) { const l = ve[v].sort((a, b) => a - b); for (let i = 0; i < l.length; i++) vl[vs[v] + i] = l[i]; }
    const es = new Int32Array(this.eCount + 1), ef: number[][] = Array.from({ length: this.eCount }, () => []);
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) { const r = this.faceVerts(f); for (let i = 0; i < r.length; i++) { const e = this.edgeOf(r[i], r[(i + 1) % r.length]); if (e >= 0) ef[e].push(f); } }
    total = 0; for (let e = 0; e < this.eCount; e++) { es[e] = total; total += ef[e].length; } es[this.eCount] = total;
    const el = new Int32Array(total); for (let e = 0; e < this.eCount; e++) { const l = ef[e].sort((a, b) => a - b); for (let i = 0; i < l.length; i++) el[es[e] + i] = l[i]; }
    this.vE = { start: vs, list: vl }; this.eF = { start: es, list: el }; this.adjDirty = false;
  }

  // ---------------- 派生：三角化（约束 Delaunay，format/triangulate.ts），改过才重算
  triangles(): { tris: Int32Array; faceOfTri: Int32Array } {
    if (this.triCache && this.triCache.rev === this.rev) return this.triCache;
    const tris: number[] = [], of: number[] = [];
    for (let f = 0; f < this.fCount; f++) {
      if (!this.fAlive[f]) continue;
      const vs = this.faceVerts(f);
      if (vs.length === 3) { tris.push(vs[0], vs[1], vs[2]); of.push(f); continue; }
      const pts = vs.map((v) => this.pt(v)), plane = planeOfRing(pts);
      if (!plane) continue;
      for (const [a, b, c] of triangulateRings(pts, plane, vs.map((_, i) => i), [])) { tris.push(vs[a], vs[b], vs[c]); of.push(f); }
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
    m.edgeKey = new Map(this.edgeKey); m.rev = this.rev;
    return m;
  }
  /** 紧凑快照（去空位、id 重编：存 / 导出时整理，user 10-27「catsup rule: organize in export/save」）。 */
  toSnapshot(): MeshSnapshot {
    const map = new Int32Array(this.vCount).fill(-1); const positions: number[] = []; let n = 0;
    for (let v = 0; v < this.vCount; v++) if (this.vAlive[v]) { map[v] = n++; positions.push(this.pos[3 * v], this.pos[3 * v + 1], this.pos[3 * v + 2]); }
    const faces: number[][] = [], faceMat: number[] = [];
    for (let f = 0; f < this.fCount; f++) if (this.fAlive[f]) { faces.push(this.faceVerts(f).map((v) => map[v])); faceMat.push(this.faceMat[f]); }
    const edges: [number, number, number][] = [];
    for (let e = 0; e < this.eCount; e++) if (this.eAlive[e] && this.edgeFlags[e]) edges.push([map[this.edgeA[e]], map[this.edgeB[e]], this.edgeFlags[e]]);
    return { version: 1, minor: 0, patch: 0, positions, faces, faceMat, edges };
  }
  static fromSnapshot(s: MeshSnapshot): MeshKernel {
    const m = new MeshKernel();
    for (let i = 0; i + 2 < s.positions.length; i += 3) m.addVertex({ x: s.positions[i], y: s.positions[i + 1], z: s.positions[i + 2] });
    s.faces.forEach((r, i) => m.addFace(r, s.faceMat[i] ?? -1));
    for (const [a, b, fl] of s.edges) { const e = m.ensureEdge(a, b); m.edgeFlags[e] = fl; }
    m.rev = 0;
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
    return bad;
  }
  /** 封闭流形块的欧拉示性数（只算流形块：每条边恰两张面、每个顶点的面扇连通）；非流形 / 有边界的块跳过。返回每块的 V − E + F。 */
  eulerOfClosedManifoldComponents(): number[] {
    this.adjacency();
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

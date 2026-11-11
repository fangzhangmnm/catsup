// paint/layout.ts —— 最笨的铺法：一张面在画布上占一块（贴图主线 1-3a 第二节，施工单 ai-docs/20261110-paint-workorders-7.md）。created 2026-11-10 by Claude Opus 5.5
// 纯计算：不改内核、不碰显卡和页面。输出每张面每个角的贴图坐标（单位 = 格，画布左上角是原点，横轴朝右、纵轴朝下）+ 画布的宽高；写进哪一列由调用的人做。
// 每张面怎么摆：n = 面的朝向（环的绕向）、e = 最长那条边的方向（一样长取环上靠前的）、t = n × e；横 = p·e、纵 = −(p·t)（画布纵轴朝下：倒过来之后从正面看
// 不是镜像的，最长的边是横着的），都乘密度；整块平移，让包围盒的左上角落在整数格点上。边长乘密度是整数的长方形，四个角正好落在格点上。
// 块怎么排：按高从大到小（一样高看宽，再一样看面的编号），一行一行从左往右，放不下换行；块和块、块和画布边之间都留 gap 格。同样的输入永远同样的结果。
// 2026-11-11（施工单十五，Claude Opus 5.5）：多一种铺法 style = "patches"（按朝向连成片 = 自动展开 0.1）：面按面积从大到小当种子，沿公共的边收朝向和种子夹角
//   小于 PATCH_MAX_DEG 的邻面、压平后不和片里已有的面叠在一起（共边共点不算）；整片用种子的 e / t 压平、当一块排。只有一张面的片和「一张面一块」逐位相同。
//   空隙跟着画布走：gapForCanvas（128 / 256 留 1、512 留 2、1024 留 4、2048 留 8）；铺的空隙和归属表往外延的 2 格是两回事（texel-table.ts 照旧传 4）。
import type { Pt3 } from "../kernel/geom.ts";

/** 铺法要的那一点内核（MeshKernel 满足；测试可以给假的）。 */
export interface LayoutMesh {
  facePts(f: number): Pt3[];
  faceNormal(f: number): Pt3;
  cornerValues(f: number, guid: string): Float32Array | null;
  /** 可选（MeshKernel 有）：这一列上有值的每张面的包围盒 [横小, 纵小, 横大, 纵大, …]。有它 = 补面时「哪里被占着」一趟扫完（不按 placed 逐张拷值）。 */
  columnBoxes?(guid: string): ArrayLike<number>;
  /** 连成片要（MeshKernel 有）：环上的点编号（认公共的边）、显示用的那套三角形（角的下标；查压平后叠没叠）。 */
  faceVerts?(f: number): number[];
  faceTriangles?(f: number): readonly (readonly [number, number, number])[];
}
export interface LayoutOptions {
  /** 每米多少格。不给 = 画布定成 base 见方，二分找出能放下的最大密度（精确到每米一格）。 */
  readonly density?: number;
  /** 块和块之间、块和画布边之间留几格（整数，默认 4）。 */
  readonly gap?: number;
  /** 画布的宽 / 高上限（默认 4096）；超过 = 不铺，说原因。 */
  readonly maxSize?: number;
  /** 画布的基准宽（默认 1024）。 */
  readonly base?: number;
  /** 铺法：faces = 一张面一块（默认，1-3a）；patches = 按朝向连成片（施工单十五）。 */
  readonly style?: "faces" | "patches";
  /** 连成片的门槛（度；默认 PATCH_MAX_DEG；量门槛时用）。 */
  readonly maxDeg?: number;
}
/** 连成片的门槛：和种子的朝向夹角小于它才收进这一片（施工单十五第五节：先定 45°，量过可能调）。 */
export const PATCH_MAX_DEG = 45;
/** 铺的时候块之间、块和画布边留几格：画布基准边长 ÷ 256 四舍五入、最少 1、最多 8（user 11-11「所以 4 格能减：留的格数跟着画布走。 同意」）。1024 = 4（和以前一样）。 */
export function gapForCanvas(side: number): number { return Math.min(8, Math.max(1, Math.round(side / 256))); }
export interface Block { readonly face: number; readonly x: number; readonly y: number; readonly w: number; readonly h: number }
export type LayoutResult =
  | { readonly ok: true; readonly width: number; readonly height: number; readonly density: number; readonly blocks: readonly Block[]; readonly values: ReadonlyMap<number, Float64Array>; /** layoutAppend 的 partial：加到上限还放不下、没铺的面（升序）。 */ readonly unplaced?: readonly number[] }
  | { readonly ok: false; readonly reason: string; readonly face?: number; readonly need?: number };

const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const len = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
const EPS = 1e-9;
const ceilCells = (x: number): number => Math.max(1, Math.ceil(x - 1e-7));   // 浮点误差别多占一格（10.0000001 → 10）
/** 往上取到 step 的倍数、至少 step。step = 256；画布比 256 小时跟着画布走（开始画时选 128 见方，2026-11-11）。 */
const upStep = (x: number, step: number): number => Math.max(step, Math.ceil(x / step) * step);
const stepOf = (w: number): number => Math.max(1, Math.min(256, w));

/** 一张面的面积。 */
function areaOf(pts: readonly Pt3[]): number {
  let area = 0;
  for (let i = 1; i + 1 < pts.length; i++) { const a = pts[0], b = pts[i], c = pts[i + 1]; area += len(cross({ x: b.x - a.x, y: b.y - a.y, z: b.z - a.z }, { x: c.x - a.x, y: c.y - a.y, z: c.z - a.z })) / 2; }
  return area;
}
/** 一张面压平用的方向：e = 最长那条边的方向（一样长取环上靠前的）、t = n × e（单位长）。退化（面积是零 / 摆不出方向）= null。flatten 和连成片的种子共用这一份。 */
function frameOf(m: LayoutMesh, f: number): { e: Pt3; t: Pt3; bl: number } | null {
  const pts = m.facePts(f), n = pts.length;
  let best = -1, bl = 0;
  for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n], l = Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z); if (l > bl + EPS) { bl = l; best = i; } }
  const nrm = m.faceNormal(f);
  if (best < 0 || areaOf(pts) <= EPS) return null;
  const a = pts[best], b = pts[(best + 1) % n], e = { x: (b.x - a.x) / bl, y: (b.y - a.y) / bl, z: (b.z - a.z) / bl };
  const t0 = cross(nrm, e), tl = len(t0);
  if (tl < 1e-12) return null;
  return { e, t: { x: t0.x / tl, y: t0.y / tl, z: t0.z / tl }, bl };
}
/** 一组面按同一个方向（e, t）压平之后：每张面的角在块里的坐标（左上角 = 0,0）+ 块的宽高。一张面的时候就是以前的「一张面一块」（同一串算式，逐位相同）。 */
function flattenAll(m: LayoutMesh, faces: readonly number[], fr: { e: Pt3; t: Pt3 }, density: number): { w: number; h: number; uvs: Map<number, Float64Array> } {
  const { e, t } = fr, uvs = new Map<number, Float64Array>();
  let minU = Infinity, minV = Infinity, maxU = -Infinity, maxV = -Infinity;
  for (const f of faces) {
    const pts = m.facePts(f), n = pts.length, uv = new Float64Array(2 * n);
    for (let i = 0; i < n; i++) {
      const u = dot(pts[i], e) * density, v = -dot(pts[i], t) * density;   // 纵轴朝下：倒过来
      uv[2 * i] = u; uv[2 * i + 1] = v;
      minU = Math.min(minU, u); minV = Math.min(minV, v); maxU = Math.max(maxU, u); maxV = Math.max(maxV, v);
    }
    uvs.set(f, uv);
  }
  for (const uv of uvs.values()) for (let i = 0; i < uv.length; i += 2) { uv[i] -= minU; uv[i + 1] -= minV; }
  return { w: ceilCells(maxU - minU), h: ceilCells(maxV - minV), uvs };
}
/** 一张面摆平之后（还没放到画布上）：角在块里的坐标（左上角 = 0,0）+ 块的宽高。退化的面（面积是零 / 摆不出方向）占一格、角都在格子中心。 */
function flatten(m: LayoutMesh, f: number, density: number): { w: number; h: number; uv: Float64Array } {
  const fr = frameOf(m, f);
  if (!fr) { const uv = new Float64Array(2 * m.facePts(f).length); uv.fill(0.5); return { w: 1, h: 1, uv }; }
  const r = flattenAll(m, [f], fr, density);
  return { w: r.w, h: r.h, uv: r.uvs.get(f)! };
}

/** 排的单位：一张面一块（frame = null：照 flatten），或者一片（种子的方向，整片一块）。 */
interface Unit { readonly seed: number; readonly faces: readonly number[]; readonly frame: { e: Pt3; t: Pt3 } | null }
const unitsByFace = (faces: readonly number[]): Unit[] => faces.map((f) => ({ seed: f, faces: [f], frame: null }));
function placeUnit(m: LayoutMesh, u: Unit, density: number): { w: number; h: number; uvs: Map<number, Float64Array> } {
  if (!u.frame) { const r = flatten(m, u.seed, density); return { w: r.w, h: r.h, uvs: new Map([[u.seed, r.uv]]) }; }
  return flattenAll(m, u.faces, u.frame, density);
}

/**
 * 按朝向连成片（施工单十五第五节；同样的输入永远同样的结果、和面的列表先后无关）：面按面积从大到小（一样大看编号），还没归片的面里最大的当种子；
 * 从种子沿公共的边往外走（先进先出、邻面按编号），邻面在这批面里、还没归片、不是退化的、朝向和**种子**的朝向夹角小于 maxDeg、按种子的方向压平之后不和片里
 * 已有的面叠在一起（共边共点不算），就收进来。退化的面各自一片（照 flatten 占一格）。
 */
export function patchesOf(m: LayoutMesh, faces: readonly number[], maxDeg = PATCH_MAX_DEG): Unit[] {
  if (!m.faceVerts || !m.faceTriangles) throw new Error("patchesOf: mesh lacks faceVerts / faceTriangles");
  const fv = m.faceVerts.bind(m), ft = m.faceTriangles.bind(m);
  const batch = new Set(faces), area = new Map<number, number>();
  for (const f of batch) area.set(f, areaOf(m.facePts(f)));
  const sorted = [...batch].sort((a, b) => area.get(b)! - area.get(a)! || a - b);
  // 公共的边 → 面（按点编号认，小号在前）
  const byEdge = new Map<string, number[]>();
  for (const f of sorted) { const vs = fv(f); for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length], k = a < b ? `${a},${b}` : `${b},${a}`; const l = byEdge.get(k); if (l) l.push(f); else byEdge.set(k, [f]); } }
  const cosMax = Math.cos((maxDeg * Math.PI) / 180), done = new Set<number>(), out: Unit[] = [];
  for (const seed of sorted) {
    if (done.has(seed)) continue;
    done.add(seed);
    const fr = frameOf(m, seed);
    if (!fr) { out.push({ seed, faces: [seed], frame: null }); continue; }
    // 片真正压平到的那个面 = e、t 张成的（法向 ∝ e × t）。不平的种子上最长的边不一定垂直于它的平均朝向，所以拿这个比，不拿 faceNormal：拉伸的上界才是严格的
    const nRaw = cross(fr.e, fr.t), nl = len(nRaw), nS = { x: nRaw.x / nl, y: nRaw.y / nl, z: nRaw.z / nl }, members = [seed];
    const tris = new PatchTris(fr.e, fr.t, fr.bl);
    tris.add(m.facePts(seed), ft(seed));
    const queue = [seed];
    for (let qi = 0; qi < queue.length; qi++) {
      const f = queue[qi], vs = fv(f), nbs = new Set<number>();
      for (let i = 0; i < vs.length; i++) { const a = vs[i], b = vs[(i + 1) % vs.length]; for (const g of byEdge.get(a < b ? `${a},${b}` : `${b},${a}`) ?? []) if (g !== f) nbs.add(g); }
      for (const g of [...nbs].sort((a, b) => a - b)) {
        if (done.has(g) || !frameOf(m, g)) continue;
        const pts = m.facePts(g), tg = ft(g);
        if (!trisWithin(pts, tg, nS, cosMax)) continue;   // 夹角不小于门槛（按这张面的每个三角形比：导入的四边形常常不平，面的平均朝向在门槛里、某个三角形可能不在）
        if (tris.overlaps(pts, tg)) continue;   // 压平之后叠在一起：留给后面的种子
        done.add(g); members.push(g); queue.push(g); tris.add(pts, tg);
      }
    }
    out.push({ seed, faces: members, frame: fr });
  }
  return out;
}
/**
 * 这张面的每个（不退化的）三角形朝向和种子的朝向夹角都小于门槛。面上任何一条边都在某个三角形里，投到种子的平面上最多压短到 cos(夹角)，
 * 所以一片里每条边的拉伸都在 [cos 门槛, 1] 以内（只看面的平均朝向不够：不平的四边形里一个三角形可以歪出去）。
 */
function trisWithin(pts: readonly Pt3[], tris: readonly (readonly number[])[], nS: Pt3, cosMax: number): boolean {
  for (const [a, b, c] of tris) {
    const n = cross({ x: pts[b].x - pts[a].x, y: pts[b].y - pts[a].y, z: pts[b].z - pts[a].z }, { x: pts[c].x - pts[a].x, y: pts[c].y - pts[a].y, z: pts[c].z - pts[a].z }), l = len(n);
    if (l < 1e-15) continue;   // 退化的三角形没有朝向
    if (!(dot(n, nS) / l > cosMax)) return false;
  }
  return true;
}
/** 一片里已经收了的三角形（按片的方向压平到 (p·e, −p·t)，没乘密度）：查新的面叠没叠上。格子哈希（格长 = 种子最长的边）。 */
class PatchTris {
  private readonly cells = new Map<string, number[]>();
  private readonly tris: number[] = [];   // 每个三角形 6 个数
  private readonly h: number; private readonly tol: number; private readonly e: Pt3; private readonly t: Pt3;
  constructor(e: Pt3, t: Pt3, scale: number) { this.e = e; this.t = t; this.h = Math.max(scale, 1e-9); this.tol = 1e-9 * Math.max(scale, 1e-9); }
  private proj(pts: readonly Pt3[], tri: readonly number[]): number[] { const o: number[] = []; for (const i of tri) o.push(dot(pts[i], this.e), -dot(pts[i], this.t)); return o; }
  private keys(q: readonly number[]): string[] {
    const x0 = Math.floor(Math.min(q[0], q[2], q[4]) / this.h), x1 = Math.floor(Math.max(q[0], q[2], q[4]) / this.h), y0 = Math.floor(Math.min(q[1], q[3], q[5]) / this.h), y1 = Math.floor(Math.max(q[1], q[3], q[5]) / this.h), out: string[] = [];
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push(`${x},${y}`);
    return out;
  }
  add(pts: readonly Pt3[], tris: readonly (readonly number[])[]): void {
    for (const tr of tris) { const q = this.proj(pts, tr), id = this.tris.length / 6; this.tris.push(...q); for (const k of this.keys(q)) { const l = this.cells.get(k); if (l) l.push(id); else this.cells.set(k, [id]); } }
  }
  overlaps(pts: readonly Pt3[], tris: readonly (readonly number[])[]): boolean {
    for (const tr of tris) {
      const q = this.proj(pts, tr), seen = new Set<number>();
      for (const k of this.keys(q)) for (const id of this.cells.get(k) ?? []) {
        if (seen.has(id)) continue;
        seen.add(id);
        if (triOverlap(q, this.tris, 6 * id, this.tol)) return true;
      }
    }
    return false;
  }
}
/** 两个三角形的里面叠在一起（分离轴：六条边的法向上投影区间重叠超过 tol 才算；共边 / 共点 = 区间只碰到 = 不算）。 */
function triOverlap(a: readonly number[], B: readonly number[], o: number, tol: number): boolean {
  const b = [B[o], B[o + 1], B[o + 2], B[o + 3], B[o + 4], B[o + 5]];
  for (const P of [a, b]) for (let i = 0; i < 3; i++) {
    const j = (i + 1) % 3, nx = -(P[2 * j + 1] - P[2 * i + 1]), ny = P[2 * j] - P[2 * i], l = Math.hypot(nx, ny);
    if (l < 1e-15) continue;
    let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
    for (let k = 0; k < 3; k++) { const pa = (a[2 * k] * nx + a[2 * k + 1] * ny) / l, pb = (b[2 * k] * nx + b[2 * k + 1] * ny) / l; a0 = Math.min(a0, pa); a1 = Math.max(a1, pa); b0 = Math.min(b0, pb); b1 = Math.max(b1, pb); }
    if (a1 <= b0 + tol || b1 <= a0 + tol) return false;   // 分开了（碰到不算叠）
  }
  return true;
}

/** 一行一行排：返回每块的左上角，或者放不下（宽度不够 / 超过 maxH）。 */
function pack(sizes: readonly { face: number; w: number; h: number }[], W: number, gap: number, maxH: number): { x: number; y: number }[] | null {
  const out: { x: number; y: number }[] = new Array(sizes.length);
  let x = gap, y = gap, rowH = 0;
  for (let i = 0; i < sizes.length; i++) {
    const s = sizes[i];
    if (s.w + 2 * gap > W) return null;
    if (x + s.w + gap > W) { y += rowH + gap; x = gap; rowH = 0; }
    if (y + s.h + gap > maxH) return null;
    out[i] = { x, y };
    x += s.w + gap; rowH = Math.max(rowH, s.h);
  }
  return out;
}
const order = <T extends { face: number; w: number; h: number }>(xs: T[]): T[] => xs.sort((a, b) => b.h - a.h || b.w - a.w || a.face - b.face);

/** 按一个密度试着铺：画布宽 W、高的上限 maxH。units = 排的单位（一张面一块 / 一片一块）；块的 face = 那一块的种子。 */
function tryDensity(m: LayoutMesh, units: readonly Unit[], density: number, W: number, gap: number, maxH: number): { blocks: Block[]; values: Map<number, Float64Array>; height: number } | null {
  const flat = new Map(units.map((u) => [u.seed, placeUnit(m, u, density)] as const));
  const sizes = order(units.map((u) => ({ face: u.seed, w: flat.get(u.seed)!.w, h: flat.get(u.seed)!.h })));
  const at = pack(sizes, W, gap, maxH);
  if (!at) return null;
  const blocks: Block[] = [], values = new Map<number, Float64Array>();
  let bottom = 0;
  sizes.forEach((s, i) => {
    const { x, y } = at[i], fl = flat.get(s.face)!;
    for (const [f, uv] of fl.uvs) { const v = new Float64Array(uv.length); for (let j = 0; j < v.length; j += 2) { v[j] = uv[j] + x; v[j + 1] = uv[j + 1] + y; } values.set(f, v); }
    blocks.push({ face: s.face, x, y, w: s.w, h: s.h }); bottom = Math.max(bottom, y + s.h);
  });
  return { blocks, values, height: bottom + gap };
}

/** 给一批面铺贴图坐标（一张面一块）。不改内核：values = 每张面每个角的 [横, 纵, 横, 纵…]（格）。 */
export function layoutFaces(m: LayoutMesh, faces: readonly number[], opts: LayoutOptions = {}): LayoutResult {
  const gap = Math.max(0, Math.round(opts.gap ?? 4)), maxSize = opts.maxSize ?? 4096, base = opts.base ?? 1024;
  const fs = [...new Set(faces)].sort((a, b) => a - b);
  if (!fs.length) return { ok: true, width: base, height: 256, density: opts.density ?? 0, blocks: [], values: new Map() };
  const units = opts.style === "patches" ? patchesOf(m, fs, opts.maxDeg ?? PATCH_MAX_DEG) : unitsByFace(fs);
  const what = opts.style === "patches" ? "片" : "面";
  if (opts.density !== undefined) {
    const d = opts.density, flat = units.map((u) => ({ face: u.seed, ...placeUnit(m, u, d) }));
    const widest = flat.reduce((a, b) => (b.w > a.w ? b : a));
    const W = widest.w + 2 * gap > base ? upStep(widest.w + 2 * gap, stepOf(base)) : base;
    if (W > maxSize) return { ok: false, reason: `${what} ${widest.face} 在每米 ${d} 格下要 ${widest.w + 2 * gap} 格宽，超过上限 ${maxSize}`, face: widest.face, need: widest.w + 2 * gap };
    const r = tryDensity(m, units, d, W, gap, Infinity)!;
    const H = upStep(r.height, stepOf(W));
    if (H > maxSize) return { ok: false, reason: `每米 ${d} 格铺这 ${fs.length} 张面要 ${H} 格高，超过上限 ${maxSize}`, need: H };
    return { ok: true, width: W, height: H, density: d, blocks: r.blocks, values: r.values };
  }
  // 没给密度：base 见方里二分找最大的整数密度
  const fits = (d: number): boolean => tryDensity(m, units, d, base, gap, base) !== null;
  if (!fits(1)) {
    const flat = units.map((u) => ({ face: u.seed, ...placeUnit(m, u, 1) })), big = flat.reduce((a, b) => (b.w * b.h > a.w * a.h ? b : a));
    return { ok: false, reason: `每米 1 格也放不进 ${base} 见方（最大的是${what} ${big.face}，${big.w} × ${big.h} 格；一共 ${units.length} 块、每块之间留 ${gap} 格）`, face: big.face, need: Math.max(big.w, big.h) + 2 * gap };
  }
  let lo = 1, hi = 2;
  while (fits(hi) && hi < 1 << 24) { lo = hi; hi *= 2; }
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (fits(mid)) lo = mid; else hi = mid; }
  const r = tryDensity(m, units, lo, base, gap, base)!;
  return { ok: true, width: base, height: base, density: lo, blocks: r.blocks, values: r.values };
}

/**
 * 给新面补一块（以后加面用）：已经铺好的面（在 guid 这一列上有值的）一个数都不变；新面各铺一块，放在画布上空着的地方（左上优先），放不下就把画布往下加高
 * （256 的倍数；画布比 256 窄时按画布宽度的倍数）。坐标的单位是格、不是零到一的比例，所以加高不会动到已有的东西。
 * 怎么找空（1-3b 改，Claude Opus 5.5，2026-11-10：原来每补一张面都把「每块的右边 / 下边」当候选全排一遍、逐块比，四万面的网格体补十张面要 0.2 秒、随面数涨）：
 *   画布按 C × C 格划成粗格子（C = 宽 / 256 向上取整，至少 1）；已有的块各向外扩 gap 格，碰到的粗格子都算占了（保守）。新块只放在粗格子的角上，
 *   从上到下、从左到右找第一个放得下的地方。每行记着「从这格往右连着几格空」，找的时候只看这个数。代价随画布大小涨、不随面数涨（只有收集已有块那一步随面数涨）。
 * partial（meshLayoutPaint 用）：加到上限还放不下的面不铺、记进 unplaced，其余照铺；不给 = 放不下就整个不铺、说原因（1-3a 的行为）。
 */
export function layoutAppend(m: LayoutMesh, guid: string, placed: readonly number[], add: readonly number[], canvas: { width: number; height: number }, density: number, opts: Omit<LayoutOptions, "density" | "base"> & { readonly partial?: boolean } = {}): LayoutResult {
  const gap = Math.max(0, Math.round(opts.gap ?? 4)), maxSize = opts.maxSize ?? 4096, W = canvas.width;
  const C = Math.max(1, Math.ceil(W / 256)), gw = Math.ceil(W / C), gh = Math.ceil(Math.max(maxSize, canvas.height) / C);
  const occ = new Uint8Array(gw * gh), run = new Int32Array(gw * gh);   // run[j·gw + i] = 第 j 行从第 i 格往右连着几格空
  const rerun = (j0: number, j1: number): void => { for (let j = j0; j < j1; j++) { let n = 0; for (let i = gw - 1; i >= 0; i--) { n = occ[j * gw + i] ? 0 : n + 1; run[j * gw + i] = n; } } };
  /** 格子坐标的块 [x0, x1) × [y0, y1) 向外扩 gap，碰到的粗格子标成占了；只重算动到的那几行。 */
  const mark = (x0: number, y0: number, x1: number, y1: number, recompute: boolean): void => {
    const i0 = Math.max(0, Math.floor((x0 - gap) / C)), i1 = Math.min(gw, Math.ceil((x1 + gap) / C)), j0 = Math.max(0, Math.floor((y0 - gap) / C)), j1 = Math.min(gh, Math.ceil((y1 + gap) / C));
    if (i0 >= i1 || j0 >= j1) return;
    for (let j = j0; j < j1; j++) occ.fill(1, j * gw + i0, j * gw + i1);
    if (recompute) rerun(j0, j1);
  };
  const box = (x0: number, y0: number, x1: number, y1: number): void => mark(Math.floor(x0), Math.floor(y0), Math.max(Math.floor(x0) + 1, Math.ceil(x1)), Math.max(Math.floor(y0) + 1, Math.ceil(y1)), false);
  if (m.columnBoxes) { const b = m.columnBoxes(guid); for (let i = 0; i + 3 < b.length; i += 4) box(b[i], b[i + 1], b[i + 2], b[i + 3]); }   // 这一列上有值的面全算占着（不管它现在走不走画）
  else for (const f of placed) {
    const v = m.cornerValues(f, guid);
    if (!v) continue;
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < v.length; i += 2) { x0 = Math.min(x0, v[i]); x1 = Math.max(x1, v[i]); y0 = Math.min(y0, v[i + 1]); y1 = Math.max(y1, v[i + 1]); }
    box(x0, y0, x1, y1);
  }
  rerun(0, gh);
  const lo = Math.ceil(gap / C);   // 块的左上角至少离画布边 gap 格
  /** 第一个放得下 w × h、而且底边加 gap 不超过 limit 的粗格子角（从上到下、从左到右）；没有 = null。 */
  const find = (w: number, h: number, limit: number): { x: number; y: number } | null => {
    const cw = Math.ceil(w / C), ch = Math.ceil(h / C), iMax = Math.floor((W - w - gap) / C);
    for (let j = lo; j + ch <= gh && j * C + h + gap <= limit; j++) {
      for (let i = lo; i <= iMax; i++) {
        if (run[j * gw + i] < cw) { i += run[j * gw + i]; continue; }   // 这一格起不够宽：跳过这段空的
        let ok = true;
        for (let t = 1; t < ch && ok; t++) if (run[(j + t) * gw + i] < cw) ok = false;
        if (ok) return { x: i * C, y: j * C };
      }
    }
    return null;
  };
  const done = new Set(placed), fs = [...new Set(add)].filter((f) => !done.has(f) && !m.cornerValues(f, guid)).sort((a, b) => a - b);   // 已经有值的不动
  const sizes = order(fs.map((f) => ({ face: f, ...flatten(m, f, density) })));
  let H = canvas.height;
  const blocks: Block[] = [], values = new Map<number, Float64Array>(), unplaced: number[] = [];
  for (const s of sizes) {
    if (s.w + 2 * gap > W) { if (opts.partial) { unplaced.push(s.face); continue; } return { ok: false, reason: `面 ${s.face} 要 ${s.w + 2 * gap} 格宽，画布只有 ${W}`, face: s.face, need: s.w + 2 * gap }; }
    let at = find(s.w, s.h, H);
    if (!at) {   // 现在的画布里放不下：往下找，画布加高（256 的倍数；画布比 256 窄时按画布宽度的倍数）
      at = find(s.w, s.h, maxSize);
      if (!at) { if (opts.partial) { unplaced.push(s.face); continue; } return { ok: false, reason: `补面 ${s.face} 要把画布加高到超过上限 ${maxSize}`, face: s.face, need: maxSize + 1 }; }
      H = Math.max(H, upStep(at.y + s.h + gap, stepOf(W)));
    }
    const v = new Float64Array(s.uv.length);
    for (let j = 0; j < v.length; j += 2) { v[j] = s.uv[j] + at.x; v[j + 1] = s.uv[j + 1] + at.y; }
    blocks.push({ face: s.face, x: at.x, y: at.y, w: s.w, h: s.h }); values.set(s.face, v);
    mark(at.x, at.y, at.x + s.w, at.y + s.h, true);
  }
  return { ok: true, width: W, height: H, density, blocks, values, ...(opts.partial ? { unplaced: unplaced.sort((a, b) => a - b) } : {}) };
}

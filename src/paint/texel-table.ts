// paint/texel-table.ts —— 画布上每一格属于哪块画布多边形 + 每格的取样点 + 一格在某张面上的空间位置（贴图主线 1-3a 第三节，施工单 ai-docs/20261110-paint-workorders-7.md）。
// created 2026-11-10 by Claude Opus 5.5。纯计算：不碰显卡、不碰页面、不 import 画画内核。
// Fable 11-10 深夜裁定 B（施工单第三节的「画布三角形」一律按「画布多边形」读）：一张面切成哪几个三角形由点的位置和环的起点决定（长方形四点共圆，两条对角线一样好），
// 镜过去 / 挪了点就可能换一条，所以归属不能按三角形认。
//   ① 归属的单位 = 画布多边形：一张面在画布上的多边形。贴图坐标完全相同的面（不管环从哪开始、朝哪个方向）并成同一个。每一格归最近的画布多边形
//      （在里面 = 0，一样近归编号小的，超过间隔的一半 = 没人要）。只看贴图坐标：挪点不变。编号 = 按面的编号从小到大第一次出现的先后。
//   ② 取样点：格子中心在它那块多边形里面（含边上）→ 就是中心；在外面（块边上多归的那几格）→ 中心在这块多边形上最近的那一点。也只看贴图坐标。
//      1-4c（统筹 11-11 裁定）：在外面的那几格，取样点量化到 1/1024 格——中心 + 整数 / SAMPLE_Q 格（四舍五入）。这是定义本身：标准答案、软件版、显卡版、
//      落点都用量化后的这一点（显卡的每格表里存的就是这两个整数，32 位浮点里正好精确，画布每边到 16352 格都精确，space-layer.ts MAX_CANVAS_SIDE 卡着）。离真正的最近点每个轴最多半份 = 1/2048 格。
//   ③ 一格在某一张面上的空间位置 = 这张面自己显示用的那套三角形（MeshKernel.faceTriangles）里，贴图坐标上离取样点最近的那个（在里面 = 0，一样近取编号小的），
//      用它的公式在取样点上算。镜像的两半、复制出来的面各用各的三角形。取样点压在两个三角形的公共边 / 公共点上时哪个算出来都一样；在多边形的边上时和怎么切无关。
// · 花费：每块多边形只扫它的包围盒（向外扩间隔的一半），按行扫——随所有块的面积涨，不随画布涨（只有两张 宽 × 高 的表要清零）。取样点现算（多边形的几个角）。
import type { Pt3 } from "../kernel/geom.ts";
import { UV_Q } from "../scene/uv.ts";

/** 一个三角形：tri = 这张面的第几个三角形（MeshKernel.faceTriangles 的先后；落点 surface-pick.ts 返回同一个号）、三个角的贴图坐标（格）和空间位置。 */
export interface PaintTri { readonly face: number; readonly tri: number; readonly uv: readonly [number, number, number, number, number, number]; readonly pos: readonly [Pt3, Pt3, Pt3] }
/** 一张走这一列贴图坐标的面：环上各角的贴图坐标（环的先后）+ 显示用的那套三角形。 */
export interface PaintFace { readonly face: number; readonly ring: Float64Array; readonly tris: readonly PaintTri[] }
/** 位置公式：画布上的位置 (x, y) → 空间位置 o + du·x + dv·y。 */
export interface Formula { readonly o: Pt3; readonly du: Pt3; readonly dv: Pt3 }
export interface FacePaint { readonly face: number; readonly poly: number; readonly tris: readonly (PaintTri & { readonly uvf: Float64Array; readonly formula: Formula })[] }
export interface TexelTable {
  readonly width: number; readonly height: number; readonly gap: number;
  /** 画布多边形（并过的）：环上各角的贴图坐标 [x0, y0, x1, y1…]（第一次出现的那张面的环序）。 */
  readonly polys: readonly Float64Array[];
  /** 每块画布多边形是哪几张面的（镜像两半、复制出来的面在同一块里）。 */
  readonly polyFaces: readonly (readonly number[])[];
  /** 每一格（行 × 宽 + 列）归哪块画布多边形；−1 = 没人要。 */
  readonly owner: Int32Array;
  /** 每张面：它在哪块画布多边形里 + 它的三角形和公式。 */
  readonly faces: ReadonlyMap<number, FacePaint>;
  /** 被两块以上画布多边形盖住（中心严格在它们里面，压在边上不算）的格数：第一段的铺法不会有；以后手动拖贴图坐标的工具用它提示。 */
  readonly overlapCells: number;
}

/** 网格体那一点（MeshKernel 满足）。 */
export interface PaintMesh {
  faces(): number[];
  faceVerts(f: number): number[];
  pt(v: number): Pt3;
  faceTriangles(f: number): readonly (readonly [number, number, number])[];
  /** 这张面在排法 uvSet 上的坐标；不在 = null（scene/uv.ts uvMesh；施工单十八第 1½ 刀起不直接问内核）。 */
  uvAt(f: number, uvSet: string): Float32Array | null;
}
/** 这个网格体走 guid 这一列的所有面（角上没有值的面不算），按面的编号。三角形 = 第一节那一套（MeshKernel.faceTriangles）。 */
export function paintFaces(m: PaintMesh, guid: string): PaintFace[] {
  const out: PaintFace[] = [];
  for (const f of m.faces()) {
    const v = m.uvAt(f, guid);
    if (!v) continue;
    const vs = m.faceVerts(f), tris: PaintTri[] = [];
    m.faceTriangles(f).forEach(([a, b, c], tri) => tris.push({ face: f, tri, uv: [v[2 * a], v[2 * a + 1], v[2 * b], v[2 * b + 1], v[2 * c], v[2 * c + 1]], pos: [m.pt(vs[a]), m.pt(vs[b]), m.pt(vs[c])] }));
    out.push({ face: f, ring: Float64Array.from(v.subarray(0, 2 * vs.length)), tris });
  }
  return out;
}

/** 三角形三个角的贴图坐标和空间位置 → 位置公式。贴图坐标退化（面积是零）= 常数公式（三个角的平均）。 */
export function formulaOf(uv: ArrayLike<number>, pos: readonly [Pt3, Pt3, Pt3]): Formula {
  const ua = uv[0], va = uv[1], ub = uv[2], vb = uv[3], uc = uv[4], vc = uv[5], [A, B, C] = pos;
  const m00 = ub - ua, m01 = uc - ua, m10 = vb - va, m11 = vc - va, det = m00 * m11 - m01 * m10;
  if (Math.abs(det) < 1e-12) return { o: { x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3, z: (A.z + B.z + C.z) / 3 }, du: { x: 0, y: 0, z: 0 }, dv: { x: 0, y: 0, z: 0 } };
  const i00 = m11 / det, i01 = -m01 / det, i10 = -m10 / det, i11 = m00 / det;
  const AB = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z }, AC = { x: C.x - A.x, y: C.y - A.y, z: C.z - A.z };
  const du = { x: AB.x * i00 + AC.x * i10, y: AB.y * i00 + AC.y * i10, z: AB.z * i00 + AC.z * i10 };
  const dv = { x: AB.x * i01 + AC.x * i11, y: AB.y * i01 + AC.y * i11, z: AB.z * i01 + AC.z * i11 };
  return { o: { x: A.x - du.x * ua - dv.x * va, y: A.y - du.y * ua - dv.y * va, z: A.z - du.z * ua - dv.z * va }, du, dv };
}
export const positionAt = (f: Formula, x: number, y: number): Pt3 => ({ x: f.o.x + f.du.x * x + f.dv.x * y, y: f.o.y + f.du.y * x + f.dv.y * y, z: f.o.z + f.du.z * x + f.dv.z * y });

/** 点到线段上最近的那一点。 */
function nearestOnSeg(px: number, py: number, x0: number, y0: number, x1: number, y1: number): [number, number] {
  const dx = x1 - x0, dy = y1 - y0, l2 = dx * dx + dy * dy, s = l2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0;
  return [x0 + s * dx, y0 + s * dy];
}
/** 点和多边形：2 = 压在边上，1 = 里面，0 = 外面（奇偶规则，环朝哪边都行）。压在边上 = 和某条边叉积为零且在它的范围里（不分配，建表时每格都要问）。 */
export function polyWhere(r: ArrayLike<number>, px: number, py: number): 0 | 1 | 2 {
  const n = r.length / 2;
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = r[2 * i], yi = r[2 * i + 1], xj = r[2 * j], yj = r[2 * j + 1];
    if ((xj - xi) * (py - yi) - (yj - yi) * (px - xi) === 0 && px >= Math.min(xi, xj) && px <= Math.max(xi, xj) && py >= Math.min(yi, yj) && py <= Math.max(yi, yj)) return 2;
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside ? 1 : 0;
}
/** 点在不在多边形里（含边上）。 */
export const inPoly = (r: ArrayLike<number>, px: number, py: number): boolean => polyWhere(r, px, py) !== 0;
/** 多边形边界上离点最近的那一点。 */
export function nearestOnPoly(r: ArrayLike<number>, px: number, py: number): [number, number] {
  const n = r.length / 2;
  let best: [number, number] = [r[0], r[1]], bd = Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, q = nearestOnSeg(px, py, r[2 * i], r[2 * i + 1], r[2 * j], r[2 * j + 1]), d = Math.hypot(q[0] - px, q[1] - py);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}
/** 点到多边形边界的距离（不分配；建表时块边上那一圈格子每格都要问）。 */
function distToBoundary(r: ArrayLike<number>, px: number, py: number): number {
  const n = r.length / 2;
  let bd = Infinity;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n, x0 = r[2 * i], y0 = r[2 * i + 1], dx = r[2 * j] - x0, dy = r[2 * j + 1] - y0, l2 = dx * dx + dy * dy;
    const s = l2 > 0 ? Math.max(0, Math.min(1, ((px - x0) * dx + (py - y0) * dy) / l2)) : 0, ex = x0 + s * dx - px, ey = y0 + s * dy - py, d2 = ex * ex + ey * ey;
    if (d2 < bd) bd = d2;
  }
  return Math.sqrt(bd);
}
/** 点到多边形的距离（在里面 / 边上 = 0）。 */
export function distToPoly(r: ArrayLike<number>, px: number, py: number): number {
  if (inPoly(r, px, py)) return 0;
  const [qx, qy] = nearestOnPoly(r, px, py);
  return Math.hypot(qx - px, qy - py);
}
/** 点到三角形的距离（在里面 / 边上 = 0）。 */
export const distToTri = (t: ArrayLike<number>, px: number, py: number): number => distToPoly(t, px, py);

/** 多边形的身份：贴图坐标逐位相同的一圈点，不管从哪开始、朝哪个方向（所有起点、两个方向里字典序最小的那一串）。 */
function polyKey(r: ArrayLike<number>): string {
  const n = r.length / 2, pts = Array.from({ length: n }, (_, i) => `${r[2 * i]},${r[2 * i + 1]}`);
  let best = "";
  for (const seq of [pts, [...pts].reverse()]) for (let s = 0; s < n; s++) { const k = [...seq.slice(s), ...seq.slice(0, s)].join("|"); if (!best || k < best) best = k; }
  return best;
}

/** 取样点偏移的量化：1/SAMPLE_Q 格（1-4c）。和贴图坐标的量化是同一个数（施工单十八第四节：收成一个常量，从网格体的列模块来）。 */
export const SAMPLE_Q = UV_Q;
/** 取样点离格子中心最多几格（每格的表里偏移是 16 位、加 32768 存：−32768 … 32767 份）。取样点离中心不超过间隔的一半，所以 gap 最多 MAX_GAP。 */
export const MAX_GAP = 63;

/** 建表。gap = 铺的时候块之间留的格数（没人要的界线 = 它的一半；最多 MAX_GAP，超了 = 抛）。 */
export function buildTexelTable(width: number, height: number, faces: readonly PaintFace[], gap = 4): TexelTable {
  if (!(gap >= 0 && gap <= MAX_GAP)) throw new Error(`buildTexelTable: gap ${gap} out of range 0..${MAX_GAP} (sample offsets are stored as 16-bit 1/${SAMPLE_Q} cell units)`);
  const W = Math.max(0, Math.floor(width)), H = Math.max(0, Math.floor(height)), R = gap / 2;
  const idx = new Map<string, number>(), polys: Float64Array[] = [], polyFaces: number[][] = [], fp = new Map<number, FacePaint>();
  for (const pf of [...faces].sort((a, b) => a.face - b.face)) {
    const k = polyKey(pf.ring);
    let p = idx.get(k);
    if (p === undefined) { p = polys.length; idx.set(k, p); polys.push(pf.ring); polyFaces.push([]); }
    polyFaces[p].push(pf.face);
    fp.set(pf.face, { face: pf.face, poly: p, tris: pf.tris.map((t) => ({ ...t, uvf: Float64Array.from(t.uv), formula: formulaOf(t.uv, t.pos) })) });
  }
  const owner = new Int32Array(W * H).fill(-1), best = new Float64Array(W * H).fill(Infinity), inside = new Uint8Array(W * H);
  let overlapCells = 0;
  polys.forEach((r, i) => {
    let mx = Infinity, my = Infinity, Mx = -Infinity, My = -Infinity;
    for (let j = 0; j < r.length; j += 2) { mx = Math.min(mx, r[j]); Mx = Math.max(Mx, r[j]); my = Math.min(my, r[j + 1]); My = Math.max(My, r[j + 1]); }
    const x0 = Math.max(0, Math.floor(mx - R - 0.5)), x1 = Math.min(W - 1, Math.ceil(Mx + R - 0.5)), y0 = Math.max(0, Math.floor(my - R - 0.5)), y1 = Math.min(H - 1, Math.ceil(My + R - 0.5));
    const n = r.length / 2, xs: number[] = [];
    for (let y = y0; y <= y1; y++) {
      // 按行扫：这一行的中心线和多边形的交点（和 polyWhere 同一个算式）；交点之间 = 里面，正好压在交点上 = 边上；交点之外才算最近点。
      // 中心线正好过某个角的那一行退回逐格判断（交点会算重）。
      const cy = y + 0.5;
      let slow = false;
      xs.length = 0;
      for (let a = 0, b = n - 1; a < n; b = a++) {
        const xa = r[2 * a], ya = r[2 * a + 1], xb = r[2 * b], yb = r[2 * b + 1];
        if (ya === cy) { slow = true; break; }
        if ((ya > cy) !== (yb > cy)) xs.push(((xb - xa) * (cy - ya)) / (yb - ya) + xa);
      }
      if (!slow) xs.sort((p, q) => p - q);
      for (let x = x0; x <= x1; x++) {
        const cx = x + 0.5;
        let where: 0 | 1 | 2;
        if (slow) where = polyWhere(r, cx, cy);
        else { let k = 0; while (k < xs.length && xs[k] < cx) k++; where = k < xs.length && xs[k] === cx ? 2 : k % 2 === 1 ? 1 : 0; }
        let d = 0;
        if (where === 0) { d = distToBoundary(r, cx, cy); if (d > R) continue; }
        const c = y * W + x;
        if (where === 1 && ++inside[c] === 2) overlapCells++;   // 压在边上的不算重叠
        if (d < best[c]) { best[c] = d; owner[c] = i; }   // 一样近：先来的（编号小的）留着
      }
    }
  });
  return { width: W, height: H, gap, polys, polyFaces, owner, faces: fp, overlapCells };
}

/**
 * 每块画布多边形有哪些格（归属表 owner 的另一种排法，油漆桶用；2026-11-13 Claude Opus 5.5，统筹「按『哪块多边形有哪些格』记一次、表变了再重算」）：
 * runs[p] = 这块的行段 [x, y, 长度, x, y, 长度…]（按行、行内从左到右），cells[p] = 格数。和 owner 逐格相同（守卫 test/paint-bucket.test.ts）。
 * 记一次 = 扫整张 owner 一遍（2048² 四百万格，十来毫秒）；缓存在表对象上（WeakMap），表重建了（准备过期重建 = 新对象）自然重算，不另记版本号。
 */
export interface PolyRuns { readonly runs: readonly Int32Array[]; readonly cells: readonly number[] }
const runsCache = new WeakMap<TexelTable, PolyRuns>();
export function polyRunsOf(t: TexelTable): PolyRuns {
  const hit = runsCache.get(t);
  if (hit) return hit;
  const n = t.polys.length, acc: number[][] = Array.from({ length: n }, () => []), cells = new Array<number>(n).fill(0), W = t.width, o = t.owner;
  for (let y = 0; y < t.height; y++) {
    const row = y * W;
    for (let x = 0; x < W;) {
      const p = o[row + x];
      if (p < 0) { x++; continue; }
      let e = x + 1;
      while (e < W && o[row + e] === p) e++;
      acc[p].push(x, y, e - x); cells[p] += e - x;
      x = e;
    }
  }
  const out: PolyRuns = { runs: acc.map((a) => Int32Array.from(a)), cells };
  runsCache.set(t, out);
  return out;
}

/** 一格的取样点离格子中心的偏移（②，量化过的）：以 1/SAMPLE_Q 格为单位的两个整数。中心在它那块多边形里（含边上）= [0, 0]；在外面 = 多边形上离中心最近的那一点，四舍五入到份。没人要的格子 = null。 */
export function sampleOffset(t: TexelTable, x: number, y: number): [number, number] | null {
  if (x < 0 || y < 0 || x >= t.width || y >= t.height) return null;
  const p = t.owner[y * t.width + x];
  if (p < 0) return null;
  const r = t.polys[p], cx = x + 0.5, cy = y + 0.5;
  if (inPoly(r, cx, cy)) return [0, 0];
  const q = nearestOnPoly(r, cx, cy);
  return [Math.round((q[0] - cx) * SAMPLE_Q) || 0, Math.round((q[1] - cy) * SAMPLE_Q) || 0];   // || 0：不要 −0
}
/** 一格的取样点（②）：中心 + 量化过的偏移。中心在多边形里 = 中心；在外面 = 离多边形上最近那一点不到 1/2048 格（每个轴）。没人要的格子 = null。 */
export function samplePoint(t: TexelTable, x: number, y: number): [number, number] | null {
  const o = sampleOffset(t, x, y);
  return o && [x + 0.5 + o[0] / SAMPLE_Q, y + 0.5 + o[1] / SAMPLE_Q];
}
/** 画布上一点 (sx, sy) 在某张面上的空间位置（③）：这张面自己的三角形里贴图坐标上离它最近的那个（一样近取编号小的），用它的公式算。面不走这张画 = null。 */
export function positionOnFace(t: TexelTable, face: number, sx: number, sy: number): { pos: Pt3; tri: number } | null {
  const fp = t.faces.get(face);
  if (!fp || !fp.tris.length) return null;
  let bi = 0, bd = Infinity;
  fp.tris.forEach((tr, i) => { const d = distToTri(tr.uvf, sx, sy); if (d < bd) { bd = d; bi = i; } });
  return { pos: positionAt(fp.tris[bi].formula, sx, sy), tri: fp.tris[bi].tri };
}
/** 一格在某张面上的空间位置：取样点（②）→ 这张面上的位置（③）。这张面不在这一格那块画布多边形里（或者这格没人要）= null。 */
export function cellPosition(t: TexelTable, face: number, x: number, y: number): Pt3 | null {
  const s = samplePoint(t, x, y), fp = t.faces.get(face);
  if (!s || !fp || fp.poly !== t.owner[y * t.width + x]) return null;
  return positionOnFace(t, face, s[0], s[1])?.pos ?? null;
}

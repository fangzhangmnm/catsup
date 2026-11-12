// mesh/unwrap.ts —— 展开：一片面摊到平面上，拉伸尽量小（SLIM：最小化对称狄利克雷能量）。created 2026-11-12 by Claude Opus 5.5（施工单二十二第 2 刀；统筹 D / E / G）
// 纯函数：只读内核、不碰显卡和页面、不用随机数，同样的输入同样的结果（循环都按编号）。能取消（每一轮问一次 shouldStop）。放进 worker 是接线那一刀的事（第 3 刀）。
// 单位：结果的坐标是米（能量的最小点是「不拉不挤」= 和三维一样大）；画布上多少格由调用的人按密度乘。
//
// 一片（chart-mesh.ts 的工作副本：点按扇面拆开、朝向统一、边界串成圈）要能摊平 = 可定向、亏格为零、至少一条边界（统筹 G）。步骤：
//   1. 三角形 = 网格内核给显示用的同一套（MeshKernel.faceTriangles；每个三角形按面的朝向摆正）。
//   2. 带洞的片（边界不止一圈）：除了最长那圈，每圈补一把虚的扇面（圈上各点连到圈的形心，形心是一个虚点）→ 变成一张盘（照 Blender 展开的「补洞」）。虚的面只活在这份副本里。
//   3. 起步（Tutte）：最长那圈按三维里的弧长摆在圆上（圆周 = 圈长），里面的点（含洞的圈和虚点）= 邻居的平均（均匀权，正的）→ 解拉普拉斯方程。
//      边界是严格凸的圆、权全是正的 → 一个三角形都不翻（Tutte / Floater）。
//   4. 每一轮（SLIM，Rabinovich 等 2017）：每个三角形把雅可比 J（三维的三角形摊在它自己的平面里 → 平面上）做 2×2 奇异值分解，
//      最近的旋转 R、权 W（w² = (σ+1)(σ²+1)/σ³，σ = 1 时 = 4）→ 解一次加权最小二乘 Σ A‖W(J − R)‖²（u、v 一起，共轭梯度、对角预条件、上一轮的解热启动；加一点点近端项防平移）
//      → 方向 d；按「不翻面的最大步长」（每个三角形的面积沿 d 是 t 的二次式，取最小的正根）× 0.9 截一下；再往回退步，直到能量不升（每一轮的能量只降不升）。
//      停：能量相对下降 < tol、或到 maxIters 轮、或 shouldStop()。
//   5. 每一步都查所有边界圈在平面上有没有交叉（格子哈希）：会交叉 = 这一步走不了，步子折半再试（起步那一轮一定不交叉，所以交出去的永远不交叉）。
// 不变量（每片都查、测试钉住）：没有翻过来的三角形（含退化的、含虚的：洞不许翻过来）；边界不交叉；亏格为零、至少一条边界（不满足的不展开，说原因）；每一轮能量不升。
// 退化的三角形（三维里面积几乎为零 / 三点共线 / 重复的点）：不进能量、跟着邻居走、报个数；照样不许翻。
// 拉伸的数（统筹 E；只算真的、不退化的三角形，按三维面积加权）：
//   面积比 = 平面面积 ÷ 三维面积（= σ1·σ2）：最大、最小、加权平均；角度 = 两个方向伸缩之比 σ1 / σ2（1 = 不歪）：最大、加权平均；另附三个角平均差几度。
//   另附按面积加权的分位（面积比 5% / 95%、角度比 95%）：最大最小常被三维里很细的碎三角形撑出来，分位看的是整片。
import type { ChartSource, ChartMesh } from "./chart-mesh.ts";
import { chartsOf, flattenable } from "./chart-mesh.ts";

export interface UnwrapOptions {
  /** 最多几轮（默认 40）。 */
  readonly maxIters?: number;
  /** 能量相对下降小于这个就停（默认 1e-4）。 */
  readonly tol?: number;
  /** 补洞的虚面在能量里的权（× 它在三维里的面积；0 = 不进能量、只管不翻）。默认 0.1：可莉 / wip2020 / 熊 / Metasequoia 坦克带洞的片上比过 0 / 0.01 / 0.1 / 1，0.1 整体最好（施工单二十二第 2 刀施工记录）。 */
  readonly virtualWeight?: number;
  /** 每一轮问一次：true = 停（交当前这一轮，照样满足不变量）。 */
  readonly shouldStop?: () => boolean;
}
export interface Stretch {
  /** 真的三角形几个、其中退化的几个（不进拉伸的数）。 */
  readonly triangles: number;
  readonly degenerate: number;
  /** 平面面积 ÷ 三维面积：最大、最小、按三维面积加权的平均；另附按面积加权的 5% / 95% 分位（最大最小常被三维里很细的碎三角形撑出来，分位看整片）。 */
  readonly area: { readonly max: number; readonly min: number; readonly mean: number; readonly p05: number; readonly p95: number };
  /** σ1 / σ2（≥ 1）：最大、加权平均、加权 95% 分位；三个角和三维比平均差几度。 */
  readonly angle: { readonly max: number; readonly mean: number; readonly p95: number; readonly meanDeg: number };
}
export type ChartUnwrap =
  | { readonly ok: true; readonly faces: readonly number[]; /** 每张面每个角（按 mesh 里环的顺序）的平面坐标（米）：[u0, v0, u1, v1, …]。 */ readonly corners: ReadonlyMap<number, Float64Array>;
      readonly stretch: Stretch; readonly iterations: number; /** 起步那一轮起每一轮的能量（每张三维面积上的对称狄利克雷，最小 = 4）。 */ readonly energies: readonly number[];
      /** 边界贴上了：最后一轮的步子被「边界会交叉」砍过（这片想自己叠上才能更平，停在贴着的地方；拉伸多半大，要再切）。 */ readonly blockedByCrossing: boolean; readonly cancelled: boolean;
      /** 补了几个洞；两条边的「洞」（一条切开的边、两头都还连着 = 张不开）不补、当它没切，记在 slits。 */ readonly holesFilled: number; readonly slits: number;
      /** 为了和邻居一致、在副本里绕向倒过来的面（模型里这几张面的绕向和邻居不一致）：它们在平面上和自己的三维法向相反，这是对的。 */ readonly flipped: ReadonlySet<number> }
  | { readonly ok: false; readonly faces: readonly number[]; readonly reason: "non-orientable" | "genus" | "closed" | "broken-loops" | "tiny-boundary" | "start-flipped" };

// ---------- 2×2 ----------
/** J = rot(φ) · diag(s1, s2) · rot(θ)（s1 ≥ |s2|；s2 < 0 = 翻了）。 */
export function svd2(a: number, b: number, c: number, d: number): { s1: number; s2: number; phi: number; theta: number } {
  const E = (a + d) / 2, F = (a - d) / 2, G = (c + b) / 2, H = (c - b) / 2;
  const Q = Math.hypot(E, H), R = Math.hypot(F, G), a1 = Math.atan2(G, F), a2 = Math.atan2(H, E);
  return { s1: Q + R, s2: Q - R, phi: (a2 + a1) / 2, theta: (a2 - a1) / 2 };
}

interface Work {
  n: number;                // 点数（份 + 虚点）
  tri: Int32Array;          // 3 × T
  real: Uint8Array;         // 1 = 真的三角形
  weight: Float64Array;     // 能量里的权（× 面积已经乘进去）
  G: Float64Array;          // 6 × T：梯度算子（3 × 2，按行）
  A: Float64Array;          // 三维面积
  degenerate: Uint8Array;
  rest: Float64Array;       // 6 × T：三维三角形摊在自己平面里的三个角 (0,0) (x1,0) (x2,y2)
}

export function unwrap(m: ChartSource, faces: readonly number[], cut: (e: number) => boolean, opts: UnwrapOptions = {}): ChartUnwrap[] {
  return chartsOf(m, faces, cut).map((ch) => unwrapChart(m, ch, opts));
}

export function unwrapChart(m: ChartSource, ch: ChartMesh, opts: UnwrapOptions = {}): ChartUnwrap {
  if (!flattenable(ch)) return { ok: false, faces: ch.faces, reason: !ch.orientable ? "non-orientable" : ch.brokenLoops ? "broken-loops" : ch.genus !== 0 ? "genus" : "closed" };
  const maxIters = opts.maxIters ?? 40, tol = opts.tol ?? 1e-4, vw = opts.virtualWeight ?? 0.1;
  const W = ch.wedgeVertex.length, P: number[] = [];
  for (let w = 0; w < W; w++) { const p = m.pt(ch.wedgeVertex[w]); P.push(p.x, p.y, p.z); }
  // 1. 三角形（按面的朝向摆正；副本里翻过的面再倒过来）
  const tris: number[] = [], real: number[] = [];
  for (const f of ch.faces) {
    const cw = ch.cornerWedge.get(f)!, n = m.faceNormal(f), flip = ch.flipped.has(f);
    for (const [i, j, k] of m.faceTriangles(f)) {
      const a = cw[i], b0 = cw[j], c0 = cw[k];
      const ab = sub3(P, b0, a), ac = sub3(P, c0, a), cr = cross(ab, ac);
      let b = b0, c = c0;
      if (cr[0] * n.x + cr[1] * n.y + cr[2] * n.z < 0) { b = c0; c = b0; }
      if (flip) { const t = b; b = c; c = t; }
      tris.push(a, b, c); real.push(1);
    }
  }
  // 2. 补洞：最长那圈（至少三条边）是外圈，别的每圈补一把虚的扇面；两条边的圈 = 一条切开的边、两头还连着（张不开），不补、当它没切
  const loopLen = ch.loops.map((l) => l.reduce((s, k) => s + dist3(P, ch.boundary[k].a, ch.boundary[k].b), 0));
  let outer = -1;
  ch.loops.forEach((l, i) => { if (l.length >= 3 && (outer < 0 || loopLen[i] > loopLen[outer] + 1e-12)) outer = i; });
  if (outer < 0) return { ok: false, faces: ch.faces, reason: "tiny-boundary" };
  let nV = W, holesFilled = 0, slits = 0;
  ch.loops.forEach((l, li) => {
    if (li === outer) return;
    if (l.length < 3) { slits++; return; }
    const c = nV++; holesFilled++;
    let cx = 0, cy = 0, cz = 0;
    for (const k of l) { const a = ch.boundary[k].a; cx += P[3 * a]; cy += P[3 * a + 1]; cz += P[3 * a + 2]; }
    P.push(cx / l.length, cy / l.length, cz / l.length);
    for (const k of l) { const h = ch.boundary[k]; tris.push(h.b, h.a, c); real.push(0); }
  });
  const wk = buildWork(P, Int32Array.from(tris), Uint8Array.from(real), nV, vw);
  // 3. 起步：外圈摆圆上，里面解拉普拉斯
  const outerLoop = ch.loops[outer].map((k) => ch.boundary[k].a);
  const X = tutte(P, wk, outerLoop, loopLen[outer]);
  // 4. SLIM
  const loopsWedges = ch.loops.filter((l) => l.length >= 3).map((l) => l.map((k) => ch.boundary[k].a));
  const energies = [energy(wk, X)];
  if (!Number.isFinite(energies[0])) return { ok: false, faces: ch.faces, reason: "start-flipped" };   // 起步就有翻的 / 压扁的（不该发生）：如实说，不带着它往下跑
  let iterations = 0, blockedByCrossing = false, cancelled = false;
  for (; iterations < maxIters; ) {
    if (opts.shouldStop?.()) { cancelled = true; break; }
    const target = slimTarget(wk, X);
    const d = new Float64Array(2 * nV);
    for (let i = 0; i < 2 * nV; i++) d[i] = target[i] - X[i];
    const tMax = maxStep(wk, X, d);
    let s = Math.min(1, 0.9 * tMax), E1 = Infinity, Xn = X, crossed = false;
    const E0 = energies[energies.length - 1];
    for (let tries = 0; tries < 40 && s > 1e-14; tries++, s *= 0.5) {
      const Y = new Float64Array(2 * nV);
      for (let i = 0; i < 2 * nV; i++) Y[i] = X[i] + s * d[i];
      const e = energy(wk, Y);
      if (!(e <= E0)) continue;
      if (boundariesCross(Y, loopsWedges)) { crossed = true; continue; }   // 边界会交叉 = 这一步走不了，步子再小一半
      E1 = e; Xn = Y; break;
    }
    blockedByCrossing = crossed;
    if (Xn === X) break;   // 走不动了 = 收敛（或被交叉拦住）
    X.set(Xn); iterations++; energies.push(E1);
    if ((E0 - E1) / E0 < tol || (crossed && s < 1e-6)) break;   // 收敛了；或者边界贴上了、步子被砍到很小 = 别空转
  }
  // 5. 交出来：每张面每个角
  const corners = new Map<number, Float64Array>();
  for (const f of ch.faces) { const cw = ch.cornerWedge.get(f)!, out = new Float64Array(2 * cw.length); for (let i = 0; i < cw.length; i++) { out[2 * i] = X[cw[i]]; out[2 * i + 1] = X[nV + cw[i]]; } corners.set(f, out); }
  return { ok: true, faces: ch.faces, corners, stretch: stretchOf(wk, X), iterations, energies, blockedByCrossing, cancelled, holesFilled, slits, flipped: ch.flipped };
}

// ---------- 三维小工具 ----------
const sub3 = (P: number[], b: number, a: number): [number, number, number] => [P[3 * b] - P[3 * a], P[3 * b + 1] - P[3 * a + 1], P[3 * b + 2] - P[3 * a + 2]];
const cross = (u: readonly number[], v: readonly number[]): [number, number, number] => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const dist3 = (P: number[], a: number, b: number): number => Math.hypot(P[3 * a] - P[3 * b], P[3 * a + 1] - P[3 * b + 1], P[3 * a + 2] - P[3 * b + 2]);

function buildWork(P: number[], tri: Int32Array, real: Uint8Array, n: number, vw: number): Work {
  const T = tri.length / 3, G = new Float64Array(6 * T), A = new Float64Array(T), weight = new Float64Array(T), degenerate = new Uint8Array(T), rest = new Float64Array(6 * T);
  let edgeSum = 0, edgeN = 0;
  for (let t = 0; t < T; t++) if (real[t]) for (let k = 0; k < 3; k++) { edgeSum += dist3(P, tri[3 * t + k], tri[3 * t + (k + 1) % 3]); edgeN++; }
  const L = edgeN ? edgeSum / edgeN : 1, areaEps = 1e-10 * L * L, lenEps = 1e-9 * L;
  for (let t = 0; t < T; t++) {
    const a = tri[3 * t], b = tri[3 * t + 1], c = tri[3 * t + 2];
    const e1 = sub3(P, b, a), e2 = sub3(P, c, a), x1 = Math.hypot(e1[0], e1[1], e1[2]);
    let x2 = 0, y2 = 0;
    if (x1 > lenEps) { x2 = (e2[0] * e1[0] + e2[1] * e1[1] + e2[2] * e1[2]) / x1; const cr = cross(e1, e2); y2 = Math.hypot(cr[0], cr[1], cr[2]) / x1; }
    const area = 0.5 * x1 * y2;
    A[t] = area; rest.set([0, 0, x1, 0, x2, y2], 6 * t);
    if (area <= areaEps || x1 <= lenEps || y2 <= lenEps) { degenerate[t] = 1; continue; }
    // G = D · E⁻¹，E = [[x1, x2], [0, y2]]
    G[6 * t] = -1 / x1; G[6 * t + 1] = x2 / (x1 * y2) - 1 / y2;
    G[6 * t + 2] = 1 / x1; G[6 * t + 3] = -x2 / (x1 * y2);
    G[6 * t + 4] = 0; G[6 * t + 5] = 1 / y2;
    weight[t] = (real[t] ? 1 : vw) * area;
  }
  return { n, tri, real, weight, G, A, degenerate, rest };
}

/** J（2 × 2，按行 a b / c d）。X = [u…, v…]。 */
function jac(wk: Work, X: Float64Array, t: number): [number, number, number, number] {
  const n = wk.n, i0 = wk.tri[3 * t], i1 = wk.tri[3 * t + 1], i2 = wk.tri[3 * t + 2], g = wk.G, o = 6 * t;
  const u0 = X[i0], u1 = X[i1], u2 = X[i2], v0 = X[n + i0], v1 = X[n + i1], v2 = X[n + i2];
  return [u0 * g[o] + u1 * g[o + 2] + u2 * g[o + 4], u0 * g[o + 1] + u1 * g[o + 3] + u2 * g[o + 5], v0 * g[o] + v1 * g[o + 2] + v2 * g[o + 4], v0 * g[o + 1] + v1 * g[o + 3] + v2 * g[o + 5]];
}
/** 平面上三角形的有向面积 × 2。 */
function det2(wk: Work, X: Float64Array, t: number): number {
  const n = wk.n, i0 = wk.tri[3 * t], i1 = wk.tri[3 * t + 1], i2 = wk.tri[3 * t + 2];
  return (X[i1] - X[i0]) * (X[n + i2] - X[n + i0]) - (X[i2] - X[i0]) * (X[n + i1] - X[n + i0]);
}
/** 能量（每张三维面积上的对称狄利克雷；任何三角形翻了 / 压扁 = ∞）。 */
function energy(wk: Work, X: Float64Array): number {
  const T = wk.tri.length / 3;
  let e = 0, wsum = 0;
  for (let t = 0; t < T; t++) {
    if (!(det2(wk, X, t) > 0)) return Infinity;
    const w = wk.weight[t];
    if (!(w > 0)) continue;
    const [a, b, c, d] = jac(wk, X, t), det = a * d - b * c, fro = a * a + b * b + c * c + d * d;
    if (!(det > 0)) return Infinity;
    e += w * (fro + fro / (det * det)); wsum += w;
  }
  return wsum > 0 ? e / wsum : 0;
}

/** 起步：外圈按弧长摆圆上（圆周 = 圈长），别的点 = 邻居的平均（均匀权）。 */
function tutte(P: number[], wk: Work, outer: readonly number[], len: number): Float64Array {
  const n = wk.n, X = new Float64Array(2 * n), fixed = new Uint8Array(n), R = len / (2 * Math.PI) || 1;
  let s = 0;
  for (let i = 0; i < outer.length; i++) {
    const a = outer[i], th = (2 * Math.PI * s) / (len || 1);
    X[a] = R * Math.cos(th); X[n + a] = R * Math.sin(th); fixed[a] = 1;
    s += dist3(P, a, outer[(i + 1) % outer.length]);
  }
  // 邻接（三角形的边，去重）
  const nb: Set<number>[] = Array.from({ length: n }, () => new Set<number>());
  const T = wk.tri.length / 3;
  for (let t = 0; t < T; t++) for (let k = 0; k < 3; k++) { const a = wk.tri[3 * t + k], b = wk.tri[3 * t + (k + 1) % 3]; nb[a].add(b); nb[b].add(a); }
  const free: number[] = []; for (let i = 0; i < n; i++) if (!fixed[i]) free.push(i);
  if (!free.length) return X;
  const idx = new Int32Array(n).fill(-1); free.forEach((v, k) => { idx[v] = k; });
  const nbs = free.map((v) => [...nb[v]].sort((a, b) => a - b));
  for (const axis of [0, 1]) {
    const off = axis * n, rhs = new Float64Array(free.length), x = new Float64Array(free.length);
    free.forEach((v, k) => { let r = 0; for (const u of nbs[k]) if (fixed[u]) r += X[off + u]; rhs[k] = r; });
    const mul = (y: Float64Array, z: Float64Array): void => { for (let k = 0; k < free.length; k++) { let acc = nbs[k].length * y[k]; for (const u of nbs[k]) { const j = idx[u]; if (j >= 0) acc -= y[j]; } z[k] = acc; } };
    const diag = Float64Array.from(nbs, (l) => l.length);
    pcg(mul, rhs, x, diag, 1e-12, 20 * free.length + 200);
    free.forEach((v, k) => { X[off + v] = x[k]; });
  }
  return X;
}

/** SLIM 的一步：每个三角形的权和最近的旋转 → 解加权最小二乘，返回目标位置。 */
function slimTarget(wk: Work, X: Float64Array): Float64Array {
  const n = wk.n, T = wk.tri.length / 3;
  const M = new Float64Array(3 * T), K = new Float64Array(6 * T), c = new Float64Array(T);   // M = 对称 2×2（m00 m01 m11）；K = G Gᵀ（对称 3×3：00 01 02 11 12 22）
  const rhs = new Float64Array(2 * n), diag = new Float64Array(2 * n);
  for (let t = 0; t < T; t++) {
    const w = wk.weight[t];
    if (!(w > 0)) continue;
    const [a, b, cc, d] = jac(wk, X, t), sv = svd2(a, b, cc, d);
    const w1 = ((sv.s1 + 1) * (sv.s1 * sv.s1 + 1)) / (sv.s1 ** 3), w2 = ((sv.s2 + 1) * (sv.s2 * sv.s2 + 1)) / (sv.s2 ** 3);   // = w²
    const cp = Math.cos(sv.phi), sp = Math.sin(sv.phi);
    const m00 = cp * cp * w1 + sp * sp * w2, m01 = cp * sp * (w1 - w2), m11 = sp * sp * w1 + cp * cp * w2;
    const rang = Math.atan2(cc - b, a + d), rc = Math.cos(rang), rs = Math.sin(rang);   // 最近的旋转 [[rc, −rs], [rs, rc]]
    const o = 6 * t, g = wk.G;
    const k00 = g[o] * g[o] + g[o + 1] * g[o + 1], k01 = g[o] * g[o + 2] + g[o + 1] * g[o + 3], k02 = g[o] * g[o + 4] + g[o + 1] * g[o + 5];
    const k11 = g[o + 2] * g[o + 2] + g[o + 3] * g[o + 3], k12 = g[o + 2] * g[o + 4] + g[o + 3] * g[o + 5], k22 = g[o + 4] * g[o + 4] + g[o + 5] * g[o + 5];
    M[3 * t] = m00; M[3 * t + 1] = m01; M[3 * t + 2] = m11; K.set([k00, k01, k02, k11, k12, k22], 6 * t); c[t] = 2 * w;
    // 右边：c · (G Rᵀ M)_{i,a}
    const RtM00 = rc * m00 + rs * m01, RtM01 = rc * m01 + rs * m11, RtM10 = -rs * m00 + rc * m01, RtM11 = -rs * m01 + rc * m11;   // Rᵀ M
    const ids = [wk.tri[3 * t], wk.tri[3 * t + 1], wk.tri[3 * t + 2]], kd = [k00, k11, k22];
    for (let i = 0; i < 3; i++) {
      const gi0 = g[o + 2 * i], gi1 = g[o + 2 * i + 1];
      rhs[ids[i]] += c[t] * (gi0 * RtM00 + gi1 * RtM10); rhs[n + ids[i]] += c[t] * (gi0 * RtM01 + gi1 * RtM11);
      diag[ids[i]] += c[t] * m00 * kd[i]; diag[n + ids[i]] += c[t] * m11 * kd[i];
    }
  }
  // 近端项（防平移的零空间；很小，不改方向）
  let mean = 0, cnt = 0; for (let i = 0; i < 2 * n; i++) if (diag[i] > 0) { mean += diag[i]; cnt++; }
  const lam = 1e-8 * (cnt ? mean / cnt : 1) + 1e-300;
  for (let i = 0; i < 2 * n; i++) { diag[i] += 2 * lam; rhs[i] += 2 * lam * X[i]; }
  const tri = wk.tri;
  const mul = (y: Float64Array, z: Float64Array): void => {   // 热路径（剖析里占大头）：不分配，全用局部变量
    z.fill(0);
    for (let t = 0; t < T; t++) {
      const ct = c[t];
      if (!(ct > 0)) continue;
      const i0 = tri[3 * t], i1 = tri[3 * t + 1], i2 = tri[3 * t + 2], k = 6 * t;
      const k00 = K[k], k01 = K[k + 1], k02 = K[k + 2], k11 = K[k + 3], k12 = K[k + 4], k22 = K[k + 5];
      const u0 = y[i0], u1 = y[i1], u2 = y[i2], v0 = y[n + i0], v1 = y[n + i1], v2 = y[n + i2];
      const ku0 = k00 * u0 + k01 * u1 + k02 * u2, ku1 = k01 * u0 + k11 * u1 + k12 * u2, ku2 = k02 * u0 + k12 * u1 + k22 * u2;
      const kv0 = k00 * v0 + k01 * v1 + k02 * v2, kv1 = k01 * v0 + k11 * v1 + k12 * v2, kv2 = k02 * v0 + k12 * v1 + k22 * v2;
      const a = ct * M[3 * t], b = ct * M[3 * t + 1], d = ct * M[3 * t + 2];
      z[i0] += a * ku0 + b * kv0; z[i1] += a * ku1 + b * kv1; z[i2] += a * ku2 + b * kv2;
      z[n + i0] += b * ku0 + d * kv0; z[n + i1] += b * ku1 + d * kv1; z[n + i2] += b * ku2 + d * kv2;
    }
    const l2 = 2 * lam;
    for (let i = 0; i < 2 * n; i++) z[i] += l2 * y[i];
  };
  const x = Float64Array.from(X);
  pcg(mul, rhs, x, diag, 1e-6, 300);   // 方向够用就行（退步那一步保证能量不升）；收到 1e-10 时剖析里这一步占四分之三
  return x;
}

/** 预条件（对角）共轭梯度：x 是起点，就地改。 */
function pcg(mul: (y: Float64Array, z: Float64Array) => void, b: Float64Array, x: Float64Array, diag: Float64Array, rtol: number, maxIt: number): number {
  const N = b.length, r = new Float64Array(N), z = new Float64Array(N), p = new Float64Array(N), Ap = new Float64Array(N);
  mul(x, Ap);
  let bn = 0; for (let i = 0; i < N; i++) { r[i] = b[i] - Ap[i]; bn += b[i] * b[i]; }
  bn = Math.sqrt(bn) || 1;
  for (let i = 0; i < N; i++) { z[i] = diag[i] > 0 ? r[i] / diag[i] : r[i]; p[i] = z[i]; }
  let rz = 0; for (let i = 0; i < N; i++) rz += r[i] * z[i];
  let it = 0;
  for (; it < maxIt; it++) {
    let rn = 0; for (let i = 0; i < N; i++) rn += r[i] * r[i];
    if (Math.sqrt(rn) <= rtol * bn) break;
    mul(p, Ap);
    let pAp = 0; for (let i = 0; i < N; i++) pAp += p[i] * Ap[i];
    if (!(pAp > 0)) break;
    const al = rz / pAp;
    for (let i = 0; i < N; i++) { x[i] += al * p[i]; r[i] -= al * Ap[i]; }
    for (let i = 0; i < N; i++) z[i] = diag[i] > 0 ? r[i] / diag[i] : r[i];
    let rz2 = 0; for (let i = 0; i < N; i++) rz2 += r[i] * z[i];
    const be = rz2 / rz; rz = rz2;
    for (let i = 0; i < N; i++) p[i] = z[i] + be * p[i];
  }
  return it;
}

/** 沿 d 走多远不会有三角形翻（所有三角形：真的、退化的、虚的）：每个三角形的有向面积是 t 的二次式，取最小的正根。 */
function maxStep(wk: Work, X: Float64Array, d: Float64Array): number {
  const n = wk.n, T = wk.tri.length / 3;
  let tMax = Infinity;
  for (let t = 0; t < T; t++) {
    const i0 = wk.tri[3 * t], i1 = wk.tri[3 * t + 1], i2 = wk.tri[3 * t + 2];
    const a = X[i1] - X[i0], b = X[i2] - X[i0], c = X[n + i1] - X[n + i0], e = X[n + i2] - X[n + i0];
    const da = d[i1] - d[i0], db = d[i2] - d[i0], dc = d[n + i1] - d[n + i0], de = d[n + i2] - d[n + i0];
    const q0 = a * e - b * c, q1 = a * de + da * e - b * dc - db * c, q2 = da * de - db * dc;
    tMax = Math.min(tMax, smallestPositiveRoot(q2, q1, q0));
  }
  return tMax;
}
function smallestPositiveRoot(a: number, b: number, c: number): number {
  const eps = 1e-14 * (Math.abs(a) + Math.abs(b) + Math.abs(c));
  if (Math.abs(a) <= eps) { if (Math.abs(b) <= eps) return Infinity; const t = -c / b; return t > 0 ? t : Infinity; }
  const disc = b * b - 4 * a * c;
  if (disc < 0) return Infinity;
  const sq = Math.sqrt(disc), q = -0.5 * (b + Math.sign(b || 1) * sq);
  const r1 = q / a, r2 = q !== 0 ? c / q : Infinity;
  let best = Infinity; for (const r of [r1, r2]) if (r > 0 && r < best) best = r;
  return best;
}

/** 边界圈在平面上有没有交叉（不相邻的两段相交 = 交叉）。格子哈希：格宽 = 段的平均长。 */
export function boundariesCross(X: Float64Array, loops: readonly (readonly number[])[]): boolean {
  const n = X.length / 2, segs: [number, number][] = [];
  for (const l of loops) for (let i = 0; i < l.length; i++) segs.push([l[i], l[(i + 1) % l.length]]);
  if (segs.length < 4) return false;
  let len = 0; for (const [a, b] of segs) len += Math.hypot(X[b] - X[a], X[n + b] - X[n + a]);
  const cell = Math.max(len / segs.length, 1e-12), grid = new Map<string, number[]>();
  segs.forEach(([a, b], k) => {
    const x0 = Math.floor(Math.min(X[a], X[b]) / cell), x1 = Math.floor(Math.max(X[a], X[b]) / cell), y0 = Math.floor(Math.min(X[n + a], X[n + b]) / cell), y1 = Math.floor(Math.max(X[n + a], X[n + b]) / cell);
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) { const key = `${x},${y}`; const l = grid.get(key); if (l) l.push(k); else grid.set(key, [k]); }
  });
  const orient = (p: number, q: number, r: number): number => (X[q] - X[p]) * (X[n + r] - X[n + p]) - (X[n + q] - X[n + p]) * (X[r] - X[p]);
  const seen = new Set<string>();
  for (const l of grid.values()) for (let i = 0; i < l.length; i++) for (let j = i + 1; j < l.length; j++) {
    const [p, q] = segs[l[i]], [r, s] = segs[l[j]];
    if (p === r || p === s || q === r || q === s) continue;   // 相邻的段（共一个点）
    const key = l[i] < l[j] ? `${l[i]},${l[j]}` : `${l[j]},${l[i]}`;
    if (seen.has(key)) continue; seen.add(key);
    const d1 = orient(p, q, r), d2 = orient(p, q, s), d3 = orient(r, s, p), d4 = orient(r, s, q);
    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) return true;
  }
  return false;
}

/** 拉伸的数（真的、不退化的三角形，按三维面积加权）。 */
function stretchOf(wk: Work, X: Float64Array): Stretch {
  const T = wk.tri.length / 3, n = wk.n;
  let tris = 0, degenerate = 0, wsum = 0, aMax = 0, aMin = Infinity, aMean = 0, qMax = 0, qMean = 0, degMean = 0;
  const areas: [number, number][] = [], quals: [number, number][] = [];
  for (let t = 0; t < T; t++) {
    if (!wk.real[t]) continue;
    tris++;
    if (wk.degenerate[t]) { degenerate++; continue; }
    const [a, b, c, d] = jac(wk, X, t), sv = svd2(a, b, c, d), s1 = Math.max(Math.abs(sv.s1), Math.abs(sv.s2)), s2 = Math.min(Math.abs(sv.s1), Math.abs(sv.s2));
    const area = s1 * s2, q = s2 > 0 ? s1 / s2 : Infinity, w = wk.A[t];
    // 三个角：三维（摊在自己平面里的）和平面上
    const r = wk.rest, o = 6 * t, ids = [wk.tri[3 * t], wk.tri[3 * t + 1], wk.tri[3 * t + 2]];
    const ang = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => Math.atan2(Math.abs((bx - ax) * (cy - ay) - (by - ay) * (cx - ax)), (bx - ax) * (cx - ax) + (by - ay) * (cy - ay));
    let dsum = 0;
    for (let k = 0; k < 3; k++) {
      const k1 = (k + 1) % 3, k2 = (k + 2) % 3;
      const a3 = ang(r[o + 2 * k], r[o + 2 * k + 1], r[o + 2 * k1], r[o + 2 * k1 + 1], r[o + 2 * k2], r[o + 2 * k2 + 1]);
      const a2 = ang(X[ids[k]], X[n + ids[k]], X[ids[k1]], X[n + ids[k1]], X[ids[k2]], X[n + ids[k2]]);
      dsum += Math.abs(a2 - a3);
    }
    aMax = Math.max(aMax, area); aMin = Math.min(aMin, area); aMean += w * area; qMax = Math.max(qMax, q); qMean += w * q; degMean += w * (dsum / 3) * (180 / Math.PI); wsum += w;
    areas.push([area, w]); quals.push([q, w]);
  }
  return { triangles: tris, degenerate, area: { max: aMax, min: wsum ? aMin : 0, mean: wsum ? aMean / wsum : 0, p05: quantile(areas, 0.05), p95: quantile(areas, 0.95) }, angle: { max: qMax, mean: wsum ? qMean / wsum : 0, p95: quantile(quals, 0.95), meanDeg: wsum ? degMean / wsum : 0 } };
}
/** 按权的分位数（值从小到大累加权，过了 p 的那个值）。 */
function quantile(xs: [number, number][], p: number): number {
  if (!xs.length) return 0;
  xs.sort((a, b) => a[0] - b[0]);
  const total = xs.reduce((s, x) => s + x[1], 0);
  let acc = 0;
  for (const [v, w] of xs) { acc += w; if (acc >= p * total) return v; }
  return xs[xs.length - 1][0];
}

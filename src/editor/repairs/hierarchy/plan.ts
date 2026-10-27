// hierarchy.ts —— 修复指令「恢复层级」的规划：纯函数（零 DOM，node 直测）。纪元账本 DT99 / 排期 T15。created 2026-10-26 by Claude Opus 5.5
// user 10-26：「形状一样的块自动合并好主意！！！这样的话其实如果已经是组件了也可以所有的子子孙孙这么做。自动恢复层级做着吧。虽然感觉这一波的很多可能一辈子用不到，但是先放着试用」。
// 一个池里：①含面的每个连通块（经边和点连着）各成一个组；②形状一样的块（旋转 + 平移能完全对上：点、边、面、材质、软 / 平滑 / 隐藏 / 折线层都一样）
//   合成同一个组件的几份；这一层已有的「素」组（里面只有散几何）也参加比对——一排各自成组的轮子同样合成组件。
// 子子孙孙 = 修复的「含子物体」：每个组 / 组件定义各跑一遍（editor.ts 深的先跑）。
// AI 定的（默认 + 披露，user 没拍）：只有线没有面的块不动（那是清理碎渣的事）；只有一块就不包组（多一层没用）；
//   镜像对上的也算一样（负变换实例，SketchUp 做左右对称件的老办法；真坦克上 6 对左右件靠它才合上），开关在马后炮。
import type { BrepSnapshot, EdgeId, FaceId, Kernel, Pt3 } from "../../../kernel/kernel.ts";
import { connectedFrom } from "../../../kernel/flood.ts";
import { type Xform, IDENTITY } from "../../../scene/xform.ts";
import { transformSnapshot } from "../../../scene/scene.ts";

export interface Piece { faces: FaceId[]; edges: EdgeId[]; }

/** 含面的连通块；按块里最小的面 id 排（确定）。scope 有 = 只要碰到这些面 / 边的块。 */
export function piecesOf(k: Kernel, scope?: { faces: readonly FaceId[]; edges: readonly EdgeId[] } | null): Piece[] {
  const seen = new Set<FaceId>(), seenE = new Set<EdgeId>(), out: Piece[] = [];
  // 有范围就只从范围里出发（选区一般很小，不用扫整个池）；块按块里最小的面 id 排
  const seeds: { face?: FaceId; edge?: EdgeId }[] = scope
    ? [...scope.faces.filter((f) => k.face(f)).map((f) => ({ face: f })), ...scope.edges.filter((e) => k.graph.hasEdge(e)).map((e) => ({ edge: e }))]
    : [...k.faces()].sort((a, b) => a.id - b.id).map((f) => ({ face: f.id }));
  for (const sd of seeds) {
    if ((sd.face !== undefined && seen.has(sd.face)) || (sd.edge !== undefined && seenE.has(sd.edge))) continue;
    const c = sd.face !== undefined ? connectedFrom(k, [], [sd.face]) : connectedFrom(k, [sd.edge!], []);
    for (const x of c.faces) seen.add(x);
    for (const x of c.edges) seenE.add(x);
    if (!c.faces.size) continue;
    out.push({ faces: [...c.faces].sort((a, b) => a - b), edges: [...c.edges].sort((a, b) => a - b) });
  }
  return out.sort((a, b) => a.faces[0] - b.faces[0]);
}

/** 比对的容差（米）：内核坐标量化 1 µm，复制 / 旋转出来的件差几 µm；大件按尺寸放宽。 */
export function congruenceTol(snap: BrepSnapshot): number {
  let lo = { x: Infinity, y: Infinity, z: Infinity }, hi = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of snap.vertices) { lo = { x: Math.min(lo.x, p.x), y: Math.min(lo.y, p.y), z: Math.min(lo.z, p.z) }; hi = { x: Math.max(hi.x, p.x), y: Math.max(hi.y, p.y), z: Math.max(hi.z, p.z) }; }
  return Math.max(2e-5, 1e-6 * Math.hypot(hi.x - lo.x, hi.y - lo.y, hi.z - lo.z));
}

/** 便宜的指纹：点 / 边 / 面数 + 各面外环边数的分布。指纹不同 = 一定不一样。 */
export function shapeKey(s: BrepSnapshot): string {
  const rings = s.faces.map((f) => `${f.outer.length}.${f.holes.length}`).sort().join(",");
  return `${s.vertices.length}|${s.edges.length}|${s.faces.length}|${rings}`;
}

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const len = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
const unit = (a: Pt3): Pt3 => { const l = len(a); return { x: a.x / l, y: a.y / l, z: a.z / l }; };
const mean = (ps: readonly Pt3[]): Pt3 => { let x = 0, y = 0, z = 0; for (const p of ps) { x += p.x; y += p.y; z += p.z; } const n = ps.length || 1; return { x: x / n, y: y / n, z: z / n }; };
/** 两点 + 中心张成的右手正交架（列 = e1 e2 e3）。p、q 和中心共线 = null。 */
function frame(c: Pt3, p: Pt3, q: Pt3): [Pt3, Pt3, Pt3] | null {
  const u = sub(p, c), w = sub(q, c), lu = len(u);
  if (lu < 1e-12) return null;
  const e1 = { x: u.x / lu, y: u.y / lu, z: u.z / lu }, d = dot(w, e1), v = { x: w.x - e1.x * d, y: w.y - e1.y * d, z: w.z - e1.z * d }, lv = len(v);
  if (lv < 1e-9 * Math.max(1, len(w))) return null;
  const e2 = { x: v.x / lv, y: v.y / lv, z: v.z / lv };
  return [e1, e2, cross(e1, e2)];
}

/** 不比的边层（曲线登记是附带的：模板有、副本没认出来，合成组件后副本也有了——是好事）。 */
const IGNORED_EDGE_LAYERS = new Set(["curve"]);

/** a 经 m 之后和 b 是不是同一个东西（点按位置配对，边、面、面层、边层逐个对上）。 */
function sameAfter(a: BrepSnapshot, b: BrepSnapshot, m: Xform, tol: number): boolean {
  const A = transformSnapshot(a, m);
  if (A.vertices.length !== b.vertices.length || A.edges.length !== b.edges.length || A.faces.length !== b.faces.length) return false;
  const cell = tol * 4, key = (x: number, y: number, z: number): string => `${x},${y},${z}`, grid = new Map<string, number[]>();
  b.vertices.forEach((p, i) => { const k = key(Math.floor(p.x / cell), Math.floor(p.y / cell), Math.floor(p.z / cell)); const g = grid.get(k); if (g) g.push(i); else grid.set(k, [i]); });
  const map = new Int32Array(A.vertices.length).fill(-1), used = new Uint8Array(b.vertices.length);
  for (let i = 0; i < A.vertices.length; i++) {
    const p = A.vertices[i], cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
    let hit = -1;
    for (let dx = -1; dx <= 1 && hit < 0; dx++) for (let dy = -1; dy <= 1 && hit < 0; dy++) for (let dz = -1; dz <= 1 && hit < 0; dz++) {
      for (const j of grid.get(key(cx + dx, cy + dy, cz + dz)) ?? []) { if (used[j]) continue; const q = b.vertices[j]; if (Math.abs(q.x - p.x) <= tol && Math.abs(q.y - p.y) <= tol && Math.abs(q.z - p.z) <= tol) { hit = j; break; } }
    }
    if (hit < 0) return false;
    map[i] = hit; used[hit] = 1;
  }
  const ek = (x: number, y: number): string => (x < y ? `${x}-${y}` : `${y}-${x}`);
  const bEdge = new Map<string, number>(b.edges.map(([x, y], i) => [ek(x, y), i]));
  const eMap = new Int32Array(A.edges.length);
  for (let i = 0; i < A.edges.length; i++) { const j = bEdge.get(ek(map[A.edges[i][0]], map[A.edges[i][1]])); if (j === undefined) return false; eMap[i] = j; }
  const fk = (outer: readonly number[], holes: number): string => `${[...outer].sort((x, y) => x - y).join(",")}|${holes}`;
  const bFace = new Map<string, number>(b.faces.map((f, i) => [fk(f.outer, f.holes.length), i]));
  const fMap = new Int32Array(A.faces.length);
  for (let i = 0; i < A.faces.length; i++) { const f = A.faces[i], j = bFace.get(fk(f.outer.map((v) => map[v]), f.holes.length)); if (j === undefined) return false; fMap[i] = j; }
  for (const name of new Set([...Object.keys(A.faceLayers ?? {}), ...Object.keys(b.faceLayers ?? {})])) {
    const fa = A.faceLayers?.[name], fb = b.faceLayers?.[name];
    for (let i = 0; i < A.faces.length; i++) if ((fa?.[i] ?? -1) !== (fb?.[fMap[i]] ?? -1)) return false;
  }
  for (const name of new Set([...Object.keys(A.edgeLayers ?? {}), ...Object.keys(b.edgeLayers ?? {})])) {
    if (IGNORED_EDGE_LAYERS.has(name)) continue;
    const sa = A.edgeLayers?.[name] ?? [], sb = new Set(b.edgeLayers?.[name] ?? []);
    if (sa.length !== sb.size) return false;
    for (const i of sa) if (!sb.has(eMap[i])) return false;
  }
  return true;
}

/** 试的上限：对称件（轮子一圈几十个点半径一样）每次第一下就中；不中的才会试满。 */
const MAX_TRIES = 20000;

/**
 * 把 a 摆成 b 的刚体变换（旋转 + 平移；mirror = 也试带镜像的，先试不带的）；对不上 = null。
 * 做法：点的重心对重心；a 里挑两个「离重心的距离最少撞车」的点 p、q（不和重心共线），b 里找离重心一样远、彼此一样远的 p′、q′，
 * 两组点各张一个右手架 → 旋转；每个候选都整件验一遍（sameAfter）。
 */
export function congruentXform(a: BrepSnapshot, b: BrepSnapshot, opt: { mirror?: boolean; tol?: number; /** 试满上限还没比完（太对称）时叫一声——不静默当成「不一样」。 */ onGiveUp?: () => void; /** 试的上限（缺 = MAX_TRIES；测试用）。 */ maxTries?: number } = {}): Xform | null {
  const tol = opt.tol ?? Math.max(congruenceTol(a), congruenceTol(b));
  if (shapeKey(a) !== shapeKey(b)) return null;
  const ca = mean(a.vertices), cb = mean(b.vertices);
  const ra = a.vertices.map((p) => len(sub(p, ca))), rb = b.vertices.map((p) => len(sub(p, cb)));
  const sa = [...ra].sort((x, y) => x - y), sb = [...rb].sort((x, y) => x - y);
  for (let i = 0; i < sa.length; i++) if (Math.abs(sa[i] - sb[i]) > 4 * tol) return null;
  const bucket = (r: number): number => Math.round(r / (10 * tol)), count = new Map<number, number>();
  for (const r of ra) count.set(bucket(r), (count.get(bucket(r)) ?? 0) + 1);
  const order = ra.map((r, i) => i).filter((i) => ra[i] > 10 * tol).sort((i, j) => (count.get(bucket(ra[i]))! - count.get(bucket(ra[j]))!) || (ra[j] - ra[i]) || (i - j));
  if (!order.length) return null;
  const p = order[0];
  const q = order.find((i) => i !== p && frame(ca, a.vertices[p], a.vertices[i]) !== null);
  if (q === undefined) return null;
  const Fa = frame(ca, a.vertices[p], a.vertices[q])!, dpq = len(sub(a.vertices[p], a.vertices[q]));
  const P = rb.map((r, j) => j).filter((j) => Math.abs(rb[j] - ra[p]) <= 4 * tol), Q = rb.map((r, j) => j).filter((j) => Math.abs(rb[j] - ra[q]) <= 4 * tol);
  let tries = 0;
  for (const flip of opt.mirror ? [false, true] : [false]) for (const pj of P) for (const qj of Q) {
    if (pj === qj || Math.abs(len(sub(b.vertices[pj], b.vertices[qj])) - dpq) > 4 * tol) continue;
    if (++tries > (opt.maxTries ?? MAX_TRIES)) { opt.onGiveUp?.(); return null; }
    const Fb0 = frame(cb, b.vertices[pj], b.vertices[qj]);
    if (!Fb0) continue;
    const Fb: [Pt3, Pt3, Pt3] = flip ? [Fb0[0], Fb0[1], { x: -Fb0[2].x, y: -Fb0[2].y, z: -Fb0[2].z }] : Fb0;   // 左手架 → 带镜像的变换（行列式 −1）
    // R = Fb · Faᵀ（列向量架）；t = cb − R·ca
    const R = (r: number, c: number): number => { let v = 0; for (let k = 0; k < 3; k++) v += (r === 0 ? Fb[k].x : r === 1 ? Fb[k].y : Fb[k].z) * (c === 0 ? Fa[k].x : c === 1 ? Fa[k].y : Fa[k].z); return v; };
    const m0 = [R(0, 0), R(0, 1), R(0, 2), R(1, 0), R(1, 1), R(1, 2), R(2, 0), R(2, 1), R(2, 2)];
    const t = { x: cb.x - (m0[0] * ca.x + m0[1] * ca.y + m0[2] * ca.z), y: cb.y - (m0[3] * ca.x + m0[4] * ca.y + m0[5] * ca.z), z: cb.z - (m0[6] * ca.x + m0[7] * ca.y + m0[8] * ca.z) };
    const m: Xform = [m0[0], m0[1], m0[2], t.x, m0[3], m0[4], m0[5], t.y, m0[6], m0[7], m0[8], t.z];
    if (sameAfter(a, b, m, tol)) return m;
  }
  return null;
}

/**
 * 分门别类：形状一样的归一类。classes[c] = 这一类的成员下标（第一个 = 模板）；xf[i] = 模板 → 第 i 个的刚体变换（模板自己 = 单位）。
 * 贪心：按顺序，每个先和同指纹的各类模板比，对上就进那类，都对不上就自己开一类。
 */
export function classifyShapes(snaps: readonly BrepSnapshot[], opt: { mirror?: boolean } = {}): { classes: number[][]; xf: Xform[]; gaveUp: number } {
  const classes: number[][] = [], xf: Xform[] = snaps.map(() => IDENTITY), byKey = new Map<string, number[]>();
  let gaveUp = 0;
  const o = { ...opt, onGiveUp: () => { gaveUp++; } };
  snaps.forEach((s, i) => {
    const key = shapeKey(s), cands = byKey.get(key) ?? [];
    for (const c of cands) { const m = congruentXform(snaps[classes[c][0]], s, o); if (m) { classes[c].push(i); xf[i] = m; return; } }
    classes.push([i]); cands.push(classes.length - 1); byKey.set(key, cands);
  });
  return { classes, xf, gaveUp };
}

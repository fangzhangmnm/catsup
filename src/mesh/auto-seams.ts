// mesh/auto-seams.ts —— 自动标接缝：找出要补哪些接缝，让每一片都能摊平。created 2026-11-12 by Claude Opus 5.5（施工单二十二第 1 刀后半；第 2 刀按统筹 G 改）
// 纯函数、只读内核、同样的输入同样的结果（不用随机数；所有选择按编号打平）。**只加不减**：user 自己标的接缝原样留着、当已经切开的地方用；补的接缝是普通的接缝标记。
// 「能摊平」= 统筹 G（11-12）：一片亏格为零、至少一条边界、可定向，不必是一张盘（带洞的片由展开在工作副本里补虚的扇面，unwrap.ts）。
// 怎么找：
//   ① 非流形的边（三张以上的面）一定切。
//   ② 二面角 ≥ angleDeg 的边当折痕切（两张面法向的夹角；起点 60°）。
//   ③ 沿没切的边连成片（chart-mesh.ts 的工作副本：点按扇面拆开、朝向统一、边界串成圈）。能摊平的片不动——**开口和开口之间不连线**（v0.19.64 连过，第 2 刀撤）。
//   ④ 有把手的片（亏格 > 0）、不可定向的片：把每圈边界补成一张虚的面（只在算的时候），变成封闭的面；对偶生成树（面当点、没切的边当连线）按「先留平的边」选
//      （Kruskal：二面角小的先连、一样按边长长的、再按编号；虚的面的边最后连 = 优先切在本来就是边界的地方），不在树里的边都切开 = 一张盘；
//      再反复把「一头只有它一条切口」的边粘回去，粘到不动——剩下的里面，真的、片里的边就是要补的（每个把手两圈）。虚的面拿掉以后 = 亏格为零、边界还在。
//   ⑤ 封闭、没有把手的壳（没有边界；只有两条边的切口 = 一条接缝两头还连着，也算没有）：从一个点找最远的点、再从它找最远的点，两点之间沿边走最短路切一刀。
//   ⑥「展开后拉伸太大再切」：统筹 H，等第 2 刀的展开有了拉伸的数再比。
import type { MeshKernel } from "./mesh-kernel.ts";
import { UV_SEAM } from "./reserved-columns.ts";
import { chartsOf, flattenable, realBoundaries, DSU, type ChartMesh } from "./chart-mesh.ts";

/** 读到的那点网格体（MeshKernel 满足）。 */
export type AutoSeamMesh = Pick<MeshKernel, "faces" | "faceVerts" | "edgeOf" | "eFaces" | "edgeA" | "edgeB" | "column" | "pt" | "faceNormal" | "faceTriangles" | "hasF">;

export interface AutoSeamOptions {
  /** 折痕：两张面法向夹角 ≥ 这么多度的边切。 */
  readonly angleDeg: number;
}
export interface AutoSeamResult {
  /** 要新标成接缝的边（升序；不含已经是接缝的）。 */
  readonly add: number[];
  /** 补的理由各几条（一条边只算第一个理由）：非流形 / 折痕 / 把手（有把手的、不可定向的片）/ 封闭的壳切一刀。 */
  readonly why: { readonly nonManifold: number; readonly crease: number; readonly handle: number; readonly closed: number };
  /** 补完以后分成几片。 */
  readonly charts: number;
  /** 补之前（只算 user 的接缝 + ①②）有几片摊不平（有把手 / 封闭 / 不可定向）。 */
  readonly needCut: number;
}
/** 一片的形状（测试、报数用）。 */
export interface ChartShape { readonly faces: readonly number[]; readonly chi: number; readonly boundaries: number; readonly genus: number; readonly orientable: boolean; readonly flattenable: boolean }

const angleBetween = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
  const la = Math.hypot(a.x, a.y, a.z), lb = Math.hypot(b.x, b.y, b.z);
  if (la === 0 || lb === 0) return Math.PI;   // 退化的面（面积为零）：当折痕，别让它把两边粘成一片
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c)));
};
const edgeLen = (m: AutoSeamMesh, e: number): number => { const a = m.pt(m.edgeA[e]), b = m.pt(m.edgeB[e]); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); };

/** 按「切口」cut 把范围里的面分片，报每片的形状。 */
export function chartShapes(m: AutoSeamMesh, faces: readonly number[], cut: (e: number) => boolean): ChartShape[] {
  return chartsOf(m, faces, cut).map((c) => ({ faces: c.faces, chi: c.chi, boundaries: c.loops.length, genus: c.genus, orientable: c.orientable, flattenable: flattenable(c) }));
}

/**
 * 自动标接缝。faces = 范围（null = 整个网格体）；范围外的面不碰，范围的外沿当片的边界（不补接缝）。
 */
export function autoSeams(m: AutoSeamMesh, faces: readonly number[] | null, opts: AutoSeamOptions): AutoSeamResult {
  const scope = [...new Set(faces ?? m.faces())].filter((f) => m.hasF(f)).sort((a, b) => a - b), inScope = new Set(scope);
  const crease = (opts.angleDeg * Math.PI) / 180;
  const seamCol = m.column(UV_SEAM.id), isSeam = (e: number): boolean => !!seamCol && seamCol.data[e] === 1;   // 保留名 uv_seam（没有这一列 = 没有接缝）
  const add = new Map<number, keyof AutoSeamResult["why"]>();
  const normals = new Map<number, { x: number; y: number; z: number }>();
  const nrm = (f: number): { x: number; y: number; z: number } => { let n = normals.get(f); if (!n) { n = m.faceNormal(f); normals.set(f, n); } return n; };
  const bend = new Map<number, number>();
  // ① ②（范围里的每条边一次，按编号）
  const edges = new Set<number>();
  for (const f of scope) { const r = m.faceVerts(f); for (let i = 0; i < r.length; i++) { const e = m.edgeOf(r[i], r[(i + 1) % r.length]); if (e >= 0) edges.add(e); } }
  for (const e of [...edges].sort((a, b) => a - b)) {
    if (isSeam(e)) continue;
    const all = m.eFaces(e);
    if (all.length > 2) { add.set(e, "nonManifold"); continue; }
    const fs = [...all].filter((g) => inScope.has(g));
    if (fs.length !== 2) continue;   // 边界（或范围的外沿）
    const a = angleBetween(nrm(fs[0]), nrm(fs[1]));
    bend.set(e, a);
    if (a >= crease - 1e-12) add.set(e, "crease");
  }
  const cut = (e: number): boolean => isSeam(e) || add.has(e);
  let needCut = 0;
  for (const ch of chartsOf(m, scope, cut)) {
    if (flattenable(ch)) continue;
    needCut++;
    if (ch.orientable && ch.genus === 0 && realBoundaries(ch) === 0) { for (const e of shortestCut(m, ch.joined.map((j) => j.e))) add.set(e, "closed"); continue; }   // 封闭的壳（只有两条边的切口也算封闭）
    for (const e of handleCuts(m, ch, bend)) add.set(e, "handle");
  }
  const after = chartsOf(m, scope, (e) => isSeam(e) || add.has(e));
  const why = { nonManifold: 0, crease: 0, handle: 0, closed: 0 };
  for (const w of add.values()) why[w]++;
  return { add: [...add.keys()].sort((a, b) => a - b), why, charts: after.length, needCut };
}

/**
 * 有把手（或不可定向）的片要切哪些边（第 ④ 步）：每圈边界补成一张虚的面 → 封闭的面；对偶生成树先留平的边、虚的面的边最后连；
 * 不在树里的边都切开、再把一头悬空的粘回去；剩下的里面真的、片里的边 = 要补的。
 */
function handleCuts(m: AutoSeamMesh, ch: ChartMesh, bend: ReadonlyMap<number, number>): number[] {
  // 对偶图的连线：片里的边（面 ↔ 面）+ 边界半边（面 ↔ 那一圈的虚面，节点号 = −1 − 圈号）
  type Link = { readonly kind: "joined" | "cap"; readonly x: number; readonly y: number; readonly a: number; readonly b: number; readonly e: number };
  const loopOf = new Int32Array(ch.boundary.length);
  ch.loops.forEach((l, li) => { for (const k of l) loopOf[k] = li; });
  const joined: Link[] = ch.joined.map((j) => ({ kind: "joined", x: j.f, y: j.g, a: j.a, b: j.b, e: j.e }));
  joined.sort((p, q) => ((bend.get(p.e) ?? 0) - (bend.get(q.e) ?? 0)) || (edgeLen(m, q.e) - edgeLen(m, p.e)) || (p.e - q.e));
  const caps: Link[] = ch.boundary.map((h, k) => ({ kind: "cap", x: h.f, y: -1 - loopOf[k], a: h.a, b: h.b, e: h.e }));
  const dsu = new DSU(), C: Link[] = [];
  for (const l of [...joined, ...caps]) if (!dsu.union(l.x, l.y)) C.push(l);
  // 粘回去：一头只有它一条切口的（粘到不动点的结果和顺序无关）
  const deg = new Map<number, number>(), at = new Map<number, number[]>();
  C.forEach((l, i) => { for (const v of [l.a, l.b]) { deg.set(v, (deg.get(v) ?? 0) + 1); const s = at.get(v); if (s) s.push(i); else at.set(v, [i]); } });
  const alive = new Uint8Array(C.length).fill(1);
  const leaf = (i: number): boolean => alive[i] === 1 && ((deg.get(C[i].a) ?? 0) <= 1 || (deg.get(C[i].b) ?? 0) <= 1);
  const queue = C.map((_, i) => i).filter(leaf);
  while (queue.length) {
    const i = queue.shift()!;
    if (!leaf(i)) continue;
    alive[i] = 0;
    for (const v of [C[i].a, C[i].b]) { deg.set(v, deg.get(v)! - 1); for (const n of at.get(v)!) if (leaf(n)) queue.push(n); }
  }
  return [...new Set(C.filter((l, i) => alive[i] && l.kind === "joined").map((l) => l.e))].sort((a, b) => a - b);
}

/** 一张封闭的壳上沿边走：从最小编号的点找最远的点 A，从 A 找最远的点 B，返回 A→B 的最短路上的边（边长当距离；打平按编号）。 */
function shortestCut(m: AutoSeamMesh, edges: readonly number[]): number[] {
  const adj = new Map<number, { v: number; e: number; w: number }[]>();
  for (const e of [...edges].sort((a, b) => a - b)) {
    const a = m.edgeA[e], b = m.edgeB[e], w = edgeLen(m, e);
    (adj.get(a) ?? adj.set(a, []).get(a)!).push({ v: b, e, w });
    (adj.get(b) ?? adj.set(b, []).get(b)!).push({ v: a, e, w });
  }
  if (!adj.size) return [];
  const dijkstra = (src: number): { dist: Map<number, number>; via: Map<number, number> } => {
    const dist = new Map<number, number>([[src, 0]]), via = new Map<number, number>(), done = new Set<number>();
    const heap: [number, number][] = [[0, src]];
    while (heap.length) {
      let bi = 0; for (let i = 1; i < heap.length; i++) if (heap[i][0] < heap[bi][0] || (heap[i][0] === heap[bi][0] && heap[i][1] < heap[bi][1])) bi = i;
      const [d, v] = heap.splice(bi, 1)[0];
      if (done.has(v)) continue; done.add(v);
      for (const n of adj.get(v) ?? []) { const nd = d + n.w, od = dist.get(n.v); if (od === undefined || nd < od - 1e-15) { dist.set(n.v, nd); via.set(n.v, n.e); heap.push([nd, n.v]); } }
    }
    return { dist, via };
  };
  const far = (dist: Map<number, number>): number => { let best = -1, bd = -1; for (const [v, d] of [...dist].sort((p, q) => p[0] - q[0])) if (d > bd + 1e-12) { bd = d; best = v; } return best; };
  const start = Math.min(...adj.keys()), A = far(dijkstra(start).dist), { dist, via } = dijkstra(A), B = far(dist);
  const out: number[] = [];
  for (let v = B; v !== A; ) { const e = via.get(v); if (e === undefined) break; out.push(e); v = m.edgeA[e] === v ? m.edgeB[e] : m.edgeA[e]; }
  return out.sort((a, b) => a - b);
}

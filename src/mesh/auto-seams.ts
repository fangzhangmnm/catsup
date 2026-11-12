// mesh/auto-seams.ts —— 自动标接缝：找出要补哪些接缝，让每一片都能摊平（拓扑上是一张盘）。created 2026-11-12 by Claude Opus 5.5（施工单二十二第 1 刀后半；统筹 11-12 C 选 Y）
// 纯函数、只读内核、同样的输入同样的结果（不用随机数；所有选择按编号打平）。**只加不减**：user 自己标的接缝原样留着、当已经切开的地方用；补的接缝是普通的接缝标记。
// 怎么找（第 0 刀侦察第四节 ①–④；⑤「展开后拉伸太大再切」要等展开那一刀）：
//   ① 非流形的边（三张以上的面）一定切。
//   ② 二面角 ≥ angleDeg 的边当折痕切（两张面法向的夹角；起点 60°）。
//   ③ 沿「不是接缝的流形边」连成片。已经是一张盘的片（切开后欧拉数 = 1）不动。
//   ④ 别的片（筒、有把手的、封闭的壳）补成一张盘：对偶生成树（面当点、片里没切的边当连线）按「先留平的边」选（Kruskal：二面角小的先连，打平按边长长的先连、再按编号）；
//      不在树里的边都切开 = 一定是一张盘（一串面沿一棵树粘起来）；然后反复把「一头悬空」的新切口粘回去（那一头只有它一条切口 = 粘回去还是盘），粘到不能再粘为止
//      ——剩下的就是要补的：几个开口圈之间的连线、每个把手两圈。封闭、没有把手的壳（球、盒子没折痕时）会粘到一条都不剩：从一个点出发找最远的点、再从它找最远的点，两点之间沿边走最短路切一刀。
// 「是不是一张盘」按切开后的欧拉数判（chartTopology）：点按「绕着这个点、隔着没切的边连得上的面」分成几份就算几个点（非流形的点自然分开），边按切开后数，χ = 点 − 边 + 面；连通、有边界的曲面 χ = 1 ⇔ 一张盘。
import type { MeshKernel } from "./mesh-kernel.ts";
import { F_SEAM } from "./mesh-kernel.ts";

/** 读到的那点网格体（MeshKernel 满足）。 */
export type AutoSeamMesh = Pick<MeshKernel, "faces" | "faceVerts" | "edgeOf" | "eFaces" | "edgeA" | "edgeB" | "edgeFlags" | "pt" | "faceNormal" | "hasF">;

export interface AutoSeamOptions {
  /** 折痕：两张面法向夹角 ≥ 这么多度的边切。 */
  readonly angleDeg: number;
}
export interface AutoSeamResult {
  /** 要新标成接缝的边（升序；不含已经是接缝的）。 */
  readonly add: number[];
  /** 补的理由各几条（一条边只算第一个理由）：非流形 / 折痕 / 为了摊平（几个开口之间连线、把手）/ 封闭的壳切一刀。 */
  readonly why: { readonly nonManifold: number; readonly crease: number; readonly flatten: number; readonly closed: number };
  /** 补完以后分成几片。 */
  readonly charts: number;
  /** 补之前（只算 user 的接缝 + ①②）有几片不是盘。 */
  readonly notDisk: number;
}

/** 范围里每条边：两头的点、挨着范围里的哪几张面（按面编号升序）。 */
interface ScopeEdge { readonly e: number; readonly faces: number[]; }

function scopeEdges(m: AutoSeamMesh, faces: readonly number[]): Map<number, ScopeEdge> {
  const inScope = new Set(faces), out = new Map<number, ScopeEdge>();
  for (const f of faces) {
    const r = m.faceVerts(f);
    for (let i = 0; i < r.length; i++) {
      const e = m.edgeOf(r[i], r[(i + 1) % r.length]);
      if (e < 0 || out.has(e)) continue;
      out.set(e, { e, faces: [...m.eFaces(e)].filter((g) => inScope.has(g)).sort((a, b) => a - b) });
    }
  }
  return out;
}

const angleBetween = (a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number => {
  const la = Math.hypot(a.x, a.y, a.z), lb = Math.hypot(b.x, b.y, b.z);
  if (la === 0 || lb === 0) return Math.PI;   // 退化的面（面积为零）：当折痕，别让它把两边粘成一片
  const c = (a.x * b.x + a.y * b.y + a.z * b.z) / (la * lb);
  return Math.acos(Math.max(-1, Math.min(1, c)));
};
const edgeLen = (m: AutoSeamMesh, e: number): number => { const a = m.pt(m.edgeA[e]), b = m.pt(m.edgeB[e]); return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z); };

/** 并查集（按编号小的当根：结果不随合并顺序变）。 */
class DSU {
  private p = new Map<number, number>();
  find(x: number): number { let r = x; for (let n = this.p.get(r); n !== undefined && n !== r; n = this.p.get(r)) r = n; let y = x; while (y !== r) { const n = this.p.get(y) ?? y; this.p.set(y, r); y = n; } return r; }
  union(a: number, b: number): boolean { const ra = this.find(a), rb = this.find(b); if (ra === rb) return false; if (ra < rb) this.p.set(rb, ra); else this.p.set(ra, rb); return true; }
}

/**
 * 按「切口」cut（边 → 是不是切开）把范围里的面分片，并算每片切开后的欧拉数。
 * 片 = 隔着「挨两张范围里的面、没切」的边连得上的面。返回每片的面（升序）和 χ。
 */
export function chartTopology(m: AutoSeamMesh, faces: readonly number[], cut: (e: number) => boolean): { faces: number[]; chi: number }[] {
  const se = scopeEdges(m, faces), joins = (x: ScopeEdge): boolean => x.faces.length === 2 && !cut(x.e);
  const dsu = new DSU();
  for (const f of faces) dsu.find(f);
  for (const x of se.values()) if (joins(x)) dsu.union(x.faces[0], x.faces[1]);
  const byRoot = new Map<number, number[]>();
  for (const f of [...faces].sort((a, b) => a - b)) { const r = dsu.find(f); const l = byRoot.get(r); if (l) l.push(f); else byRoot.set(r, [f]); }
  const out: { faces: number[]; chi: number }[] = [];
  for (const fs of byRoot.values()) {
    const fset = new Set(fs);
    // 边：没切、两边都在这片 = 1 条；切开的（或只挨这片一张面的）= 这片里挨着它的每张面各算一条
    let E = 0;
    const vertFaces = new Map<number, number[]>();
    for (const f of fs) for (const v of m.faceVerts(f)) { const l = vertFaces.get(v); if (l) l.push(f); else vertFaces.set(v, [f]); }
    const seen = new Set<number>();
    for (const f of fs) {
      const r = m.faceVerts(f);
      for (let i = 0; i < r.length; i++) {
        const e = m.edgeOf(r[i], r[(i + 1) % r.length]), x = se.get(e)!;
        const mine = x.faces.filter((g) => fset.has(g));
        if (joins(x) && mine.length === 2) { if (!seen.has(e)) { seen.add(e); E++; } } else E++;
      }
    }
    // 点：绕着点 v、隔着「过 v、没切、两边都在这片」的边连得上的面算一份
    let V = 0;
    for (const [v, vf] of vertFaces) {
      const d = new DSU();
      for (const f of vf) d.find(f);
      for (const f of vf) {
        const r = m.faceVerts(f), i = r.indexOf(v), n = r.length;
        for (const w of [r[(i + 1) % n], r[(i + n - 1) % n]]) { const x = se.get(m.edgeOf(v, w)); if (x && joins(x) && fset.has(x.faces[0]) && fset.has(x.faces[1])) d.union(x.faces[0], x.faces[1]); }
      }
      V += new Set(vf.map((f) => d.find(f))).size;
    }
    out.push({ faces: fs, chi: V - E + fs.length });
  }
  return out;
}

/**
 * 自动标接缝。faces = 范围（null = 整个网格体）；范围外的面不碰，范围的外沿当片的边界（不补接缝）。
 */
export function autoSeams(m: AutoSeamMesh, faces: readonly number[] | null, opts: AutoSeamOptions): AutoSeamResult {
  const scope = [...new Set(faces ?? m.faces())].filter((f) => m.hasF(f)).sort((a, b) => a - b);
  const se = scopeEdges(m, scope), crease = (opts.angleDeg * Math.PI) / 180;
  const isSeam = (e: number): boolean => (m.edgeFlags[e] & F_SEAM) !== 0;
  const add = new Map<number, keyof AutoSeamResult["why"]>();
  const normals = new Map<number, { x: number; y: number; z: number }>();
  const nrm = (f: number): { x: number; y: number; z: number } => { let n = normals.get(f); if (!n) { n = m.faceNormal(f); normals.set(f, n); } return n; };
  const bend = new Map<number, number>();
  // ① ②
  for (const x of [...se.values()].sort((a, b) => a.e - b.e)) {
    if (isSeam(x.e)) continue;
    const all = m.eFaces(x.e).length;
    if (all > 2) { add.set(x.e, "nonManifold"); continue; }
    if (x.faces.length !== 2) continue;   // 边界（或范围的外沿）
    const a = angleBetween(nrm(x.faces[0]), nrm(x.faces[1]));
    bend.set(x.e, a);
    if (a >= crease - 1e-12) add.set(x.e, "crease");
  }
  const cut = (e: number): boolean => isSeam(e) || add.has(e);
  const before = chartTopology(m, scope, cut);
  let notDisk = 0;
  for (const ch of before) {
    if (ch.chi === 1) continue;
    notDisk++;
    const fset = new Set(ch.faces);
    // 片里没切的边（对偶图的连线）
    const inner = [...se.values()].filter((x) => x.faces.length === 2 && fset.has(x.faces[0]) && fset.has(x.faces[1]) && !cut(x.e));
    inner.sort((p, q) => (bend.get(p.e)! - bend.get(q.e)!) || (edgeLen(m, q.e) - edgeLen(m, p.e)) || (p.e - q.e));
    const dsu = new DSU(), tree = new Set<number>();
    for (const x of inner) if (dsu.union(x.faces[0], x.faces[1])) tree.add(x.e);
    // 切口 = 片里所有边减去树；固定的（已经切开的 / 边界）不许粘回去
    const chartEdges = [...se.values()].filter((x) => x.faces.some((g) => fset.has(g)));
    const C = new Set<number>(), fixed = new Set<number>(), innerIds = new Set(inner.map((x) => x.e));
    for (const x of chartEdges) { if (tree.has(x.e)) continue; C.add(x.e); if (!innerIds.has(x.e)) fixed.add(x.e); }
    const deg = new Map<number, number>();
    const bump = (v: number, d: number): void => { deg.set(v, (deg.get(v) ?? 0) + d); };
    for (const e of C) { bump(m.edgeA[e], 1); bump(m.edgeB[e], 1); }
    // 粘回去：一头只有它一条切口的新切口（队列按编号；粘到不动点的结果和顺序无关）
    const leafOf = (e: number): boolean => !fixed.has(e) && C.has(e) && ((deg.get(m.edgeA[e]) ?? 0) === 1 || (deg.get(m.edgeB[e]) ?? 0) === 1);
    const vEdgesInC = new Map<number, number[]>();
    for (const e of C) for (const v of [m.edgeA[e], m.edgeB[e]]) { const l = vEdgesInC.get(v); if (l) l.push(e); else vEdgesInC.set(v, [e]); }
    const queue = [...C].filter(leafOf).sort((a, b) => a - b);
    while (queue.length) {
      const e = queue.shift()!;
      if (!leafOf(e)) continue;
      C.delete(e); bump(m.edgeA[e], -1); bump(m.edgeB[e], -1);
      for (const v of [m.edgeA[e], m.edgeB[e]]) for (const n of vEdgesInC.get(v) ?? []) if (leafOf(n)) queue.push(n);
    }
    const kept = [...C].filter((e) => !fixed.has(e)).sort((a, b) => a - b);
    if (kept.length) { for (const e of kept) add.set(e, "flatten"); continue; }
    // 封闭、没有把手的壳：两个最远的点之间沿边切一刀
    const hasBoundary = chartEdges.some((x) => fixed.has(x.e));
    if (hasBoundary) continue;   // 有边界、粘完一条不剩 = 本来就该是盘（χ 算错了才会到这里；不补，守卫测试会抓）
    for (const e of shortestCut(m, inner.map((x) => x.e))) add.set(e, "closed");
  }
  const after = chartTopology(m, scope, (e) => isSeam(e) || add.has(e));
  const why = { nonManifold: 0, crease: 0, flatten: 0, closed: 0 };
  for (const w of add.values()) why[w]++;
  return { add: [...add.keys()].sort((a, b) => a - b), why, charts: after.length, notDisk };
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

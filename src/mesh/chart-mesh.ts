// mesh/chart-mesh.ts —— 「片」的工作副本：自动标接缝（auto-seams.ts）和展开（unwrap.ts）共用。created 2026-11-12 by Claude Opus 5.5（施工单二十二第 2 刀；统筹 G：一片 = 亏格为零、至少一条边界，不必是盘）
// 纯函数、只读内核、同样的输入同样的结果（所有选择按编号打平）。不改模型：拆点、翻面都只在这份副本里。
// 片 = 范围里隔着「挨两张范围里的面、没切」的边连得上的面。副本里：
//   · 点按扇面拆开（wedge）：绕着点 v、隔着片里没切的边连得上的面算一份；非流形的点、切口两边的点自然分开。
//   · 朝向：从编号最小的面起，沿没切的边把相邻的面翻到一致（共用的边在两张面里方向相反）；翻不齐 = 不可定向（莫比乌斯带那种），记下来。
//   · 边：没切的边 = 片里的边（两张面共用、两头是同两份点）；别的 = 边界上的半边（按这张面在副本里的绕向，a → b）。
//   · 边界圈：每份边界点正好出一条边界半边，顺着串成圈。
//   · χ = 点（份数）− 边（片里的 + 边界半边）+ 面；b = 圈数；亏格 = (2 − χ − b) / 2（可定向时）。
import type { MeshKernel } from "./mesh-kernel.ts";

export type ChartSource = Pick<MeshKernel, "faces" | "faceVerts" | "edgeOf" | "eFaces" | "edgeA" | "edgeB" | "pt" | "faceNormal" | "faceTriangles" | "hasF">;

/** 片里的一条边（两张面共用、没切）：mesh 边编号、两张面、两头的点份（a < b 不保证）。 */
export interface JoinedEdge { readonly e: number; readonly f: number; readonly g: number; readonly a: number; readonly b: number }
/** 边界上的一条半边：哪张面、mesh 边编号、按副本里的绕向从点份 a 到点份 b。 */
export interface BoundaryHalf { readonly f: number; readonly e: number; readonly a: number; readonly b: number }
export interface ChartMesh {
  /** 片里的面（升序）。 */
  readonly faces: readonly number[];
  /** 在副本里绕向倒过来的面（为了和片里别的面一致）。 */
  readonly flipped: ReadonlySet<number>;
  /** 每份点是哪个 mesh 点。 */
  readonly wedgeVertex: readonly number[];
  /** 每张面每个角（按 mesh 里环的顺序）是哪份点。 */
  readonly cornerWedge: ReadonlyMap<number, Int32Array>;
  readonly joined: readonly JoinedEdge[];
  readonly boundary: readonly BoundaryHalf[];
  /** 边界圈：每圈 = boundary 里的下标，按顺序首尾相接。 */
  readonly loops: readonly (readonly number[])[];
  readonly chi: number;
  readonly orientable: boolean;
  /** 亏格（可定向时）；不可定向 = NaN。 */
  readonly genus: number;
  /** 边界串不成圈（不该发生：说明点份拆得不对）。 */
  readonly brokenLoops: boolean;
}

/** 并查集（按编号小的当根：结果不随合并顺序变）。 */
export class DSU {
  private p = new Map<number, number>();
  find(x: number): number { let r = x; for (let n = this.p.get(r); n !== undefined && n !== r; n = this.p.get(r)) r = n; let y = x; while (y !== r) { const n = this.p.get(y) ?? y; this.p.set(y, r); y = n; } return r; }
  union(a: number, b: number): boolean { const ra = this.find(a), rb = this.find(b); if (ra === rb) return false; if (ra < rb) this.p.set(rb, ra); else this.p.set(ra, rb); return true; }
}

/** 范围里的面按 cut 分成片，每片建一份工作副本（按片里最小的面编号排）。 */
export function chartsOf(m: ChartSource, faces: readonly number[], cut: (e: number) => boolean): ChartMesh[] {
  const scope = [...new Set(faces)].filter((f) => m.hasF(f)).sort((a, b) => a - b), inScope = new Set(scope);
  const edgeFaces = new Map<number, number[]>();
  for (const f of scope) { const r = m.faceVerts(f); for (let i = 0; i < r.length; i++) { const e = m.edgeOf(r[i], r[(i + 1) % r.length]); if (e < 0) continue; const l = edgeFaces.get(e); if (!l) edgeFaces.set(e, [...m.eFaces(e)].filter((g) => inScope.has(g)).sort((a, b) => a - b)); } }
  const joins = (e: number): boolean => { const l = edgeFaces.get(e); return !!l && l.length === 2 && !cut(e); };
  const dsu = new DSU();
  for (const f of scope) dsu.find(f);
  for (const [e, l] of edgeFaces) if (joins(e)) dsu.union(l[0], l[1]);
  const groups = new Map<number, number[]>();
  for (const f of scope) { const r = dsu.find(f); const l = groups.get(r); if (l) l.push(f); else groups.set(r, [f]); }
  return [...groups.values()].map((fs) => buildChart(m, fs, edgeFaces, joins));
}

function buildChart(m: ChartSource, fs: number[], edgeFaces: Map<number, number[]>, joins: (e: number) => boolean): ChartMesh {
  const fset = new Set(fs), ring = new Map<number, number[]>();
  for (const f of fs) ring.set(f, m.faceVerts(f));
  /** 面 f 里边 (v → w) 是不是按环的方向走的。 */
  const forward = (f: number, v: number, w: number): boolean => { const r = ring.get(f)!, n = r.length; for (let i = 0; i < n; i++) if (r[i] === v && r[(i + 1) % n] === w) return true; return false; };
  const inner = (e: number): boolean => joins(e) && edgeFaces.get(e)!.every((g) => fset.has(g));
  // 朝向：BFS（按面编号起、邻居按编号）
  const flip = new Map<number, boolean>(); let orientable = true;
  for (const start of fs) {
    if (flip.has(start)) continue;
    flip.set(start, false);
    const queue = [start];
    while (queue.length) {
      const f = queue.shift()!, r = ring.get(f)!, n = r.length;
      for (let i = 0; i < n; i++) {
        const v = r[i], w = r[(i + 1) % n], e = m.edgeOf(v, w);
        if (e < 0 || !inner(e)) continue;
        const [x, y] = edgeFaces.get(e)!, g = x === f ? y : x;
        // 一致 = 共用的边在两张面里方向相反；同向 = 要翻一张
        const same = forward(g, v, w), want = flip.get(f)! !== same;
        if (!flip.has(g)) { flip.set(g, want); queue.push(g); } else if (flip.get(g) !== want) orientable = false;
      }
    }
  }
  // 点份：绕着每个点、隔着片里没切的边连得上的面
  const vertFaces = new Map<number, number[]>();
  for (const f of fs) for (const v of ring.get(f)!) { const l = vertFaces.get(v); if (l) { if (l[l.length - 1] !== f) l.push(f); } else vertFaces.set(v, [f]); }
  const wedgeVertex: number[] = [], wedgeAt = new Map<string, number>();
  for (const v of [...vertFaces.keys()].sort((a, b) => a - b)) {
    const vf = vertFaces.get(v)!, d = new DSU();
    for (const f of vf) d.find(f);
    for (const f of vf) { const r = ring.get(f)!, n = r.length, i = r.indexOf(v); for (const w of [r[(i + 1) % n], r[(i + n - 1) % n]]) { const e = m.edgeOf(v, w); if (e >= 0 && inner(e)) { const [x, y] = edgeFaces.get(e)!; d.union(x, y); } } }
    const ids = new Map<number, number>();
    for (const f of vf) { const root = d.find(f); let id = ids.get(root); if (id === undefined) { id = wedgeVertex.length; wedgeVertex.push(v); ids.set(root, id); } wedgeAt.set(`${v},${f}`, id); }
  }
  const cornerWedge = new Map<number, Int32Array>();
  for (const f of fs) cornerWedge.set(f, Int32Array.from(ring.get(f)!, (v) => wedgeAt.get(`${v},${f}`)!));
  // 边：片里的（一次）/ 边界半边（按副本里的绕向）
  const joined: JoinedEdge[] = [], boundary: BoundaryHalf[] = [], seenJoined = new Set<number>();
  for (const f of fs) {
    const r = ring.get(f)!, n = r.length, cw = cornerWedge.get(f)!, fl = flip.get(f)!;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n, e = m.edgeOf(r[i], r[j]);
      if (e >= 0 && inner(e)) { if (!seenJoined.has(e)) { seenJoined.add(e); const [x, y] = edgeFaces.get(e)!; joined.push({ e, f: x, g: y, a: cw[i], b: cw[j] }); } continue; }
      boundary.push(fl ? { f, e, a: cw[j], b: cw[i] } : { f, e, a: cw[i], b: cw[j] });
    }
  }
  // 边界圈
  const outOf = new Map<number, number[]>();
  boundary.forEach((h, k) => { const l = outOf.get(h.a); if (l) l.push(k); else outOf.set(h.a, [k]); });
  const used = new Uint8Array(boundary.length), loops: number[][] = [];
  let brokenLoops = false;
  for (let s0 = 0; s0 < boundary.length; s0++) {
    if (used[s0]) continue;
    const loop: number[] = [];
    for (let k = s0; ;) {
      used[k] = 1; loop.push(k);
      const end = boundary[k].b;
      if (end === boundary[s0].a) break;
      const nx = (outOf.get(end) ?? []).find((x) => !used[x]);
      if (nx === undefined) { brokenLoops = true; break; }
      k = nx;
    }
    loops.push(loop);
  }
  const chi = wedgeVertex.length - (joined.length + boundary.length) + fs.length;
  return { faces: fs, flipped: new Set(fs.filter((f) => flip.get(f))), wedgeVertex, cornerWedge, joined, boundary, loops, chi, orientable, genus: orientable ? (2 - chi - loops.length) / 2 : NaN, brokenLoops };
}

/** 真的边界圈有几圈：两条边的圈不算（一条切开的边、两头还连着 = 张不开，展开时当它没切；unwrap.ts）。 */
export const realBoundaries = (c: ChartMesh): number => c.loops.filter((l) => l.length >= 3).length;
/** 片能不能直接展开（统筹 G）：可定向、亏格为零、至少一圈真的边界、边界串得成圈。 */
export const flattenable = (c: ChartMesh): boolean => c.orientable && !c.brokenLoops && c.genus === 0 && realBoundaries(c) >= 1;

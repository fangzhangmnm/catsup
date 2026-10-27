// repairs/resegment/plan.ts —— 修复「改段数」（回转体重新细分）的规划：纯函数（零 DOM，node 直测）。纪元账本 DT94 / 排期 T20。created 2026-10-26 by Claude Opus 5.5
// user 10-26：「像现在记住『这是一个圆，圆心、半径』一样，也记住『这片光滑面是一个圆柱，轴、半径』……和放在修复里面。类似重细分」；
//   「圆柱 如果是多段的圆柱怎么办，你想一下坦克的炮管是怎么拉的」→ 回转体；「多段圆柱 可以……反正先做试一下，大不了以后改」「记住可以，没必要提示」。
// 不另记：推拉 / 偏移 / 绕圆心缩放之后每一圈本来就被曲线登记记成「圆」（圆心、半径、法向、起始方向、段数，存进文件）——回转体 = 同一根轴上、
//   段数一样、点的角度对齐的一串圆 + 圈之间的面，用的时候现场认（= 自动记住、不出提示、不改格式、不碰内核）。研究稿 ai-docs/20261026-cylinder-memory-research.md。
// v1 只认「干净」的：一整块连在一起的几何全是这个回转体（自己是一个组 / 组件，或者散在那里谁也不挨）；每张面是 圆盘 / 两圈间的圆环 / 两圈间的四边形长条
//   之一，长条整圈都在，每一段颜色一样。和别的几何粘着的（根部嵌在炮塔面上、侧面粘了东西）下一步。
import type { BrepSnapshot, EdgeId, FaceId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";
import { connectedFrom } from "../../../kernel/flood.ts";

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const add = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const dot = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
const cross = (a: Pt3, b: Pt3): Pt3 => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
const len = (a: Pt3): number => Math.hypot(a.x, a.y, a.z);
const unit = (a: Pt3): Pt3 => mul(a, 1 / len(a));

/** 一侧一个材质槽（[朝外, 朝里]，−1 = 没上色）。 */
type Sides = [number, number];
export interface RevolvedBody {
  /** 这一块的面 / 边（池里的 id，执行时删掉换新的）。 */
  faces: FaceId[]; edges: EdgeId[];
  /** 轴：c = 第一圈的圆心，n = 单位法向；u = 起始方向（角度 0），v = n × u。 */
  c: Pt3; n: Pt3; u: Pt3; v: Pt3;
  segments: number;
  /** 各圈：沿轴的位置 t、半径 r；cap = 这一圈封着一张圆盘（它的颜色）。 */
  rings: { t: number; r: number; cap: Sides | null }[];
  /** 圈和圈之间：band = 四边形长条一圈（soft = 长条之间的边是软边），annulus = 同一平面上的圆环。 */
  links: { a: number; b: number; kind: "band" | "annulus"; mat: Sides; soft: boolean; smooth: boolean }[];
}

/** 比对容差：位置 20 µm（和恢复层级同一个量级）；角度按弧长换（半径 × 角度 ≤ 位置容差）。 */
const POS_TOL = 2e-5;

/** 一圈：点（按角度位排）+ 圆的参数。fromMesh = 从网格认出来的（没有曲线登记）。 */
interface Ring { vs: VertexId[]; center: Pt3; radius: number; normal: Pt3; xaxis: Pt3; segments: number; fromMesh: boolean }
/** 从网格认圈的最少边数：正方形 / 六角也是正多边形——立方体、螺母改成 24 段就成圆柱了；画圆画的（有曲线登记）不受这条限制。 */
const MESH_MIN_SEGMENTS = 8;

/** 一串有序的点是不是正多边形（在一张平面上、到重心等距、每段等长，容差 τ）。 */
function regularPolygon(pts: Pt3[], tol: number): { center: Pt3; radius: number; normal: Pt3; xaxis: Pt3 } | null {
  const n = pts.length;
  if (n < 3) return null;
  const c = mul(pts.reduce((a, p) => add(a, p), { x: 0, y: 0, z: 0 }), 1 / n);
  let m = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < n; i++) m = add(m, cross(sub(pts[i], c), sub(pts[(i + 1) % n], c)));
  if (len(m) < 1e-18) return null;
  const nn = unit(m), r = len(sub(pts[0], c));
  if (!(r > tol) || pts.some((p) => Math.abs(dot(sub(p, c), nn)) > tol || Math.abs(len(sub(p, c)) - r) > tol)) return null;
  const segs = pts.map((p, i) => len(sub(p, pts[(i + 1) % n])));
  if (Math.max(...segs) - Math.min(...segs) > 2 * tol) return null;
  return { center: c, radius: r, normal: nn, xaxis: unit(sub(pts[0], c)) };
}

/** 这一块里的圈：曲线登记里的圆 + 网格里硬边围成的正多边形闭环（≥ MESH_MIN_SEGMENTS 边）。 */
function ringsOf(k: Kernel, edges: Set<EdgeId>): Ring[] {
  const g = k.graph, out: Ring[] = [], used = new Set<EdgeId>();
  for (const c of [...k.curves()].sort((a, b) => a.id - b.id)) {
    if (c.kind !== "circle" || !c.closed || !c.params || !c.edges.length || !c.edges.every((e) => edges.has(e))) continue;
    const vs = new Set<VertexId>(); for (const e of c.edges) { const E = g.edge(e); vs.add(E.a); vs.add(E.b); used.add(e); }
    out.push({ vs: [...vs], ...c.params, fromMesh: false });
  }
  // 网格：硬边（不软不平滑、不在登记过的圆上）组成的、每个点恰好连两条的闭环
  const hard = [...edges].filter((e) => !used.has(e) && !k.isSoft(e) && !k.isSmooth(e) && !k.isFold(e)).sort((a, b) => a - b);
  const deg = new Map<VertexId, EdgeId[]>();
  for (const e of hard) { const E = g.edge(e); for (const v of [E.a, E.b]) { const a = deg.get(v); if (a) a.push(e); else deg.set(v, [e]); } }
  const seen = new Set<EdgeId>();
  for (const e0 of hard) {
    if (seen.has(e0)) continue;
    const comp: EdgeId[] = [], st = [e0]; seen.add(e0);
    while (st.length) { const e = st.pop()!; comp.push(e); const E = g.edge(e); for (const v of [E.a, E.b]) for (const e2 of deg.get(v)!) if (!seen.has(e2)) { seen.add(e2); st.push(e2); } }
    if (comp.length < MESH_MIN_SEGMENTS) continue;
    const vset = new Set<VertexId>(); for (const e of comp) { const E = g.edge(e); vset.add(E.a); vset.add(E.b); }
    if ([...vset].some((v) => deg.get(v)!.length !== 2)) continue;
    const order: VertexId[] = [], walked = new Set<EdgeId>();
    let e = Math.min(...comp), v = g.edge(e).a;
    for (let i = 0; i < comp.length; i++) { order.push(v); walked.add(e); const E = g.edge(e); v = E.a === v ? E.b : E.a; e = deg.get(v)!.find((x) => !walked.has(x)) ?? e; }
    const fit = regularPolygon(order.map((x) => g.pt(x)), Math.max(POS_TOL, k.coplanarTol));
    if (fit) out.push({ vs: order, ...fit, segments: order.length, fromMesh: true });
  }
  return out;
}

/** 一块连在一起的几何是不是干净的回转体；是 = 返回它，不是 = null（looksLike = 有两圈以上同轴同段数的圈，只是不干净）。 */
function asRevolved(k: Kernel, faces: FaceId[], edges: Set<EdgeId>): { body: RevolvedBody | null; looksLike: boolean } {
  const g = k.graph, none = { body: null, looksLike: false };
  const all = ringsOf(k, edges);
  if (!all.length) return none;
  const r0 = all[0], n = unit(r0.normal), c = r0.center, N = r0.segments;
  const u = unit(sub(r0.xaxis, mul(n, dot(r0.xaxis, n)))), v = cross(n, u);
  const coax = all.filter((rg) => { if (len(cross(unit(rg.normal), n)) > 1e-6 || rg.segments !== N) return false; const d = sub(rg.center, c); return len(sub(d, mul(n, dot(d, n)))) <= POS_TOL; });
  const looksLike = coax.length >= 2;
  if (coax.length !== all.length) return { body: null, looksLike };
  // 每个点 → (第几圈, 第几个角度位)；角度位按 u 起算、步长 2π/N
  const step = (2 * Math.PI) / N, slot = new Map<VertexId, { ring: number; j: number }>(), rings: RevolvedBody["rings"] = [];
  for (let ri = 0; ri < coax.length; ri++) {
    const rg = coax[ri];
    if (rg.vs.length !== N || !(rg.radius > POS_TOL)) return { body: null, looksLike };
    for (const vid of rg.vs) {
      const q = sub(g.pt(vid), rg.center), a = Math.atan2(dot(q, v), dot(q, u)), j = ((Math.round(a / step) % N) + N) % N;
      if (Math.abs(a - Math.round(a / step) * step) * rg.radius > POS_TOL || slot.has(vid)) return { body: null, looksLike };
      slot.set(vid, { ring: ri, j });
    }
    rings.push({ t: dot(sub(rg.center, c), n), r: rg.radius, cap: null });
  }
  for (const e of edges) { const E = g.edge(e); if (!slot.has(E.a) || !slot.has(E.b)) return { body: null, looksLike }; }   // 圈外还有点 = 粘了别的
  const same = (x: Sides, y: Sides): boolean => x[0] === y[0] && x[1] === y[1];
  const mats = (f: FaceId, out: Pt3): Sides => { const m = k.planeOf(f)!.plane.n, fr = k.faceMaterialOf(f, 0) ?? -1, bk = k.faceMaterialOf(f, 1) ?? -1; return dot(m, out) >= 0 ? [fr, bk] : [bk, fr]; };
  const meanT = rings.reduce((s, r) => s + r.t, 0) / rings.length;
  const capOut = (ri: number): Pt3 => (rings.length > 1 && rings[ri].t > meanT ? n : rings.length > 1 ? mul(n, -1) : n);
  const coplanarRings = (a: number, b: number): boolean => Math.abs(rings[a].t - rings[b].t) <= POS_TOL;
  // 面按点归属分类（画的 = 一张圆盘 / 一张圆环 / 一格一张四边形；导入的 = 三角扇 / 两个三角一格，中间是软对角线）
  type Link = RevolvedBody["links"][number] & { spans: Set<number> };
  const links = new Map<string, Link>(), capFaces = new Map<number, Sides>(), annFace = new Map<string, FaceId[]>();
  const key = (a: number, b: number): string => `${Math.min(a, b)}-${Math.max(a, b)}`;
  for (const fid of faces) {
    const f = k.face(fid)!, ss = [f.outer, ...f.holes].flatMap((r) => r.vids.map((x) => slot.get(x)!));
    const ringIds = [...new Set(ss.map((s) => s.ring))];
    if (ringIds.length === 1) {   // 圆盘（或它的一块三角）
      const ri = ringIds[0], m = mats(fid, capOut(ri)), prev = capFaces.get(ri);
      if (prev && !same(prev, m)) return { body: null, looksLike };
      capFaces.set(ri, m); continue;
    }
    if (ringIds.length !== 2) return { body: null, looksLike };
    const [a, b] = ringIds, kk = key(a, b);
    if (coplanarRings(a, b)) { const arr = annFace.get(kk); if (arr) arr.push(fid); else annFace.set(kk, [fid]); continue; }   // 圆环（或它的一块）
    // 长条的一格（或半格三角）：两圈上的角度位都落在某个 {j, j+1} 里
    const js = [...new Set(ss.map((s) => s.j))].sort((x, y) => x - y);
    let span: number | null = null;
    if (js.length === 1) span = js[0];
    else if (js.length === 2) span = js[1] === js[0] + 1 ? js[0] : js[0] === 0 && js[1] === N - 1 ? N - 1 : null;
    if (span === null) return { body: null, looksLike };
    const mid = mul(ss.reduce((acc, s0, i) => add(acc, g.pt([f.outer, ...f.holes].flatMap((r) => r.vids)[i])), { x: 0, y: 0, z: 0 }), 1 / ss.length), dm = sub(mid, c), out = unit(sub(dm, mul(n, dot(dm, n))));
    const m = mats(fid, out);
    let L = links.get(kk);
    if (!L) { L = { a: Math.min(a, b), b: Math.max(a, b), kind: "band", mat: m, soft: false, smooth: false, spans: new Set() }; links.set(kk, L); }
    else if (!same(L.mat, m)) return { body: null, looksLike };   // 长条上涂了不同颜色
    L.spans.add(span);
  }
  for (const [ri, m] of capFaces) rings[ri].cap = m;
  // 长条整圈都在；长条之间的边（同角度位的两圈连线）：软 / 平滑（取第一条）；从网格认的圈要求是软边（看起来本来就想做成圆的）
  for (const L of links.values()) {
    if (L.spans.size !== N) return { body: null, looksLike };
    const gen = [...edges].sort((x, y) => x - y).find((e) => { const E = g.edge(e), sa = slot.get(E.a)!, sb = slot.get(E.b)!; return sa.j === sb.j && ((sa.ring === L.a && sb.ring === L.b) || (sa.ring === L.b && sb.ring === L.a)); });
    if (gen !== undefined) { L.soft = k.isSoft(gen); L.smooth = k.isSmooth(gen); }
    if ((coax[L.a].fromMesh || coax[L.b].fromMesh) && !L.soft) return { body: null, looksLike };
  }
  // 圆环：朝外 = 背着外圈长条的那一侧
  const linksOut: RevolvedBody["links"] = [...links.values()].map(({ spans: _s, ...l }) => l);
  for (const [kk, fids] of annFace) {
    const [a, b] = kk.split("-").map(Number), outerRing = rings[a].r >= rings[b].r ? a : b;
    const band = linksOut.find((x) => x.kind === "band" && (x.a === outerRing || x.b === outerRing));
    let out = n;
    if (band) { const other = band.a === outerRing ? band.b : band.a; out = rings[other].t > rings[outerRing].t ? mul(n, -1) : n; }
    const m = mats(fids[0], out);
    if (fids.some((f) => !same(mats(f, out), m))) return { body: null, looksLike };
    linksOut.push({ a, b, kind: "annulus", mat: m, soft: false, smooth: false });
  }
  // 每条边都得是：圈上相邻两点 / 同一格里两圈的连线 / 对角线（导入的三角网：圆盘、圆环、长条一格里的）——对角线必须是看不见的软边，
  //   看得见的硬线 = 人画上去的（侧面画了一条线）= 不干净
  const diagonalOk = (e: EdgeId): boolean => k.isSoft(e) || k.isSmooth(e);
  for (const e of edges) {
    const E = g.edge(e), sa = slot.get(E.a)!, sb = slot.get(E.b)!;
    if (sa.ring === sb.ring) {
      const dj = Math.abs(sa.j - sb.j);
      if (dj === 1 || dj === N - 1) continue;   // 圈上的边
      if ((rings[sa.ring].cap || linksOut.some((l) => l.kind === "annulus" && (l.a === sa.ring || l.b === sa.ring))) && diagonalOk(e)) continue;
      return { body: null, looksLike };
    }
    const l = linksOut.find((x) => (x.a === sa.ring && x.b === sb.ring) || (x.a === sb.ring && x.b === sa.ring));
    if (!l) return { body: null, looksLike };
    if (l.kind === "annulus") { if (diagonalOk(e)) continue; return { body: null, looksLike }; }
    const dj = Math.abs(sa.j - sb.j);
    if (dj === 0) continue;   // 同角度位的连线（长条之间的边）
    if ((dj === 1 || dj === N - 1) && diagonalOk(e)) continue;   // 一格里的软对角线
    return { body: null, looksLike };
  }
  return { body: { faces: [...faces].sort((x, y) => x - y), edges: [...edges].sort((x, y) => x - y), c, n, u, v, segments: N, rings, links: linksOut }, looksLike };
}

/** 池里干净的回转体（一块一个）；scopeFaces 有 = 只要碰到这些面的块。notClean = 看着像（两圈以上同轴同段数的圆）但不干净的块数。 */
export function findRevolved(k: Kernel, scopeFaces: ReadonlySet<FaceId> | null): { bodies: RevolvedBody[]; notClean: number } {
  const seen = new Set<FaceId>(), bodies: RevolvedBody[] = [];
  let notClean = 0;
  // 有范围就只从范围里的面出发（选区一般很小，不用扫整个池）
  const seeds = scopeFaces ? [...scopeFaces].filter((f) => k.face(f)).sort((a, b) => a - b) : [...k.faces()].map((f) => f.id).sort((a, b) => a - b);
  for (const fid of seeds) {
    if (seen.has(fid)) continue;
    const comp = connectedFrom(k, [], [fid]);
    for (const x of comp.faces) seen.add(x);
    const r = asRevolved(k, [...comp.faces], comp.edges);
    if (r.body) bodies.push(r.body); else if (r.looksLike) notClean++;
  }
  return { bodies, notClean };
}

/** 按新段数造一份快照（池本地坐标）：圈 = 带参数的圆，长条之间的边照原来的软 / 平滑，颜色按朝外 / 朝里对上。 */
export function revolvedSnapshot(b: RevolvedBody, N: number, coplanarTol: number): BrepSnapshot {
  const vertices: Pt3[] = [], edges: [number, number][] = [], planes: { n: Pt3; d: number }[] = [], faces: { plane: number; outer: number[]; holes: number[][] }[] = [];
  const material: number[] = [], materialBack: number[] = [], soft: number[] = [], smooth: number[] = [];
  const curves: NonNullable<BrepSnapshot["curves"]>[number][] = [];
  const centerOf = (ri: number): Pt3 => add(b.c, mul(b.n, b.rings[ri].t));
  const idx = (ri: number, j: number): number => ri * N + (((j % N) + N) % N);
  for (let ri = 0; ri < b.rings.length; ri++) for (let j = 0; j < N; j++) { const a = (2 * Math.PI * j) / N, r = b.rings[ri].r; vertices.push(add(centerOf(ri), add(mul(b.u, r * Math.cos(a)), mul(b.v, r * Math.sin(a))))); }
  const edgeIx = new Map<string, number>();
  const edge = (x: number, y: number): number => { const key = x < y ? `${x}-${y}` : `${y}-${x}`; let i = edgeIx.get(key); if (i === undefined) { i = edges.length; edges.push([x, y]); edgeIx.set(key, i); } return i; };
  for (let ri = 0; ri < b.rings.length; ri++) {
    const es: number[] = []; for (let j = 0; j < N; j++) es.push(edge(idx(ri, j), idx(ri, j + 1)));
    curves.push({ edges: es, kind: "circle", closed: true, params: { center: centerOf(ri), radius: b.rings[ri].r, normal: b.n, xaxis: b.u, segments: N } });
  }
  /** 一张面：外环按「朝外」方向逆时针排（面的 +n 侧 = 朝外 → material = 朝外的颜色）。 */
  const face = (outer: number[], holes: number[][], out: Pt3, mat: Sides): void => {
    let m = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < outer.length; i++) { const p = vertices[outer[i]], q = vertices[outer[(i + 1) % outer.length]]; m = add(m, cross(p, q)); }
    if (dot(m, out) < 0) { outer = [...outer].reverse(); holes = holes.map((h) => [...h].reverse()); m = mul(m, -1); }
    const nn = unit(m);
    planes.push({ n: nn, d: dot(nn, vertices[outer[0]]) });
    faces.push({ plane: planes.length - 1, outer, holes });
    material.push(mat[0]); materialBack.push(mat[1]);
  };
  const meanT = b.rings.reduce((s, r) => s + r.t, 0) / b.rings.length;
  for (let ri = 0; ri < b.rings.length; ri++) {
    const cap = b.rings[ri].cap;
    if (cap) face(Array.from({ length: N }, (_, j) => idx(ri, j)), [], b.rings.length > 1 && !(b.rings[ri].t > meanT) ? mul(b.n, -1) : b.n, cap);   // 和认的时候同一个判法
  }
  for (const L of b.links) {
    if (L.kind === "annulus") {
      const outerRing = b.rings[L.a].r >= b.rings[L.b].r ? L.a : L.b, inner = outerRing === L.a ? L.b : L.a;
      const band = b.links.find((x) => x.kind === "band" && (x.a === outerRing || x.b === outerRing));
      let out = b.n;
      if (band) { const other = band.a === outerRing ? band.b : band.a; out = b.rings[other].t > b.rings[outerRing].t ? mul(b.n, -1) : b.n; }
      face(Array.from({ length: N }, (_, j) => idx(outerRing, j)), [Array.from({ length: N }, (_, j) => idx(inner, j))], out, L.mat);
      continue;
    }
    for (let j = 0; j < N; j++) {
      const a0 = idx(L.a, j), a1 = idx(L.a, j + 1), b1 = idx(L.b, j + 1), b0 = idx(L.b, j);
      const g0 = edge(a0, b0);
      if (L.soft) soft.push(g0);
      if (L.smooth) smooth.push(g0);
      const mid = mul(add(add(vertices[a0], vertices[a1]), add(vertices[b0], vertices[b1])), 0.25), dm = sub(mid, b.c);
      face([a0, a1, b1, b0], [], unit(sub(dm, mul(b.n, dot(dm, b.n)))), L.mat);
    }
  }
  const edgeLayers: Record<string, number[]> = {};
  if (soft.length) edgeLayers.soft = [...new Set(soft)];
  if (smooth.length) edgeLayers.smooth = [...new Set(smooth)];
  const anyMat = material.some((x) => x >= 0) || materialBack.some((x) => x >= 0);
  return { coplanarTol, vertices, edges, planes, faces, ...(Object.keys(edgeLayers).length ? { edgeLayers } : {}), ...(anyMat ? { faceLayers: { material, materialBack } } : {}), curves };
}

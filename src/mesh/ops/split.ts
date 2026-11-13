// mesh/ops/split.ts —— 劈：劈边 / 沿折线劈面 / 刀（面上一串点，切之前验一道）。纯函数，原地改 k；只切不长：永远不会多出一张没人要的面。created 2026-10-27 by Claude Fable 5.1
import { type Pt3, COPLANAR_TOL_DEFAULT, EPS, cross3, dist3, distToPlane, distToSegment3, dot3, planeBasis, planeOfRing, projectToPlane, segIntersections, sub3 } from "../../kernel/geom.ts";
import { MeshKernel, type EdgeOrigin } from "../mesh-kernel.ts";
import { declareRingEdges } from "./ring-edges.ts";

/** 劈边：e 在参数 t 处加一个顶点；e 所在的每张面的环都插进这个点；标记两半都带。返回新顶点。 */
export function splitEdge(k: MeshKernel, e: number, t = 0.5): number {
  if (!k.hasE(e)) throw new Error(`splitEdge: edge ${e} is not alive`);
  const a = k.edgeA[e], b = k.edgeB[e], pa = k.pt(a), pb = k.pt(b);
  const v = k.addVertex({ x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t, z: pa.z + (pb.z - pa.z) * t });
  const piece: EdgeOrigin = { kind: "piece", of: k.edgeShape(e) }, wire = k.isWire(e);   // 两半 = 原来那条边的一块（边上的列全照抄）
  const half = (x: number, y: number): boolean => (x === v || y === v) && (x === a || y === a || x === b || y === b);
  const faces = [...k.eFaces(e)];
  for (const f of faces) {
    const r = k.faceVerts(f), out: number[] = [], of = k.shapeOf(f);
    for (let i = 0; i < r.length; i++) { out.push(r[i]); const n = r[(i + 1) % r.length]; if ((r[i] === a && n === b) || (r[i] === b && n === a)) out.push(v); }
    declareRingEdges(k, out, (x, y) => (half(x, y) ? piece : null));   // 两半先带着来历造好（造在第一张面的环上，和以前顺手造的编号一样）
    k.setFaceRing(f, out, { kind: "piece", of });   // 劈边：两边的面都是原来那张的一块（新点在边上，按原面的三角形插值）
  }
  if (!faces.length) { k.removeEdge(e); for (const [x, y] of [[a, v], [v, b]] as const) k.addEdge(x, y, piece); }   // 裸线：原边删、两半各成裸线
  if (wire || !faces.length) for (const [x, y] of [[a, v], [v, b]] as const) k.setWire(k.edgeOf(x, y), true);   // 裸线位（结构位）：原来是线 / 没有面 = 两半是线
  return v;
}

/**
 * 沿折线劈面（笔的设计稿第八节第 1 条；全仓唯一劈面的原子——以前的 splitFace = 面里零个点的特例，收成这一个）：
 * 面 f 的环上两个不同的顶点 vIn → vOut，中间经过面里的点 inner（定义坐标，按折线的先后；可以零个）。
 *   原面 f（保 id）的环 = 环上 vIn → vOut 那一段 + 倒着的面里点；新面 = vOut → vIn 那一段 + 正着的面里点。
 *   两张面的来历都是原面的一块（角上的列按原面的三角形取值，面里的点一样）；新边 = 新长；面里的点是新点（点上没有列）。
 * 只管拓扑，不看几何：折线出没出面、交不交叉、离面多远都不管——验在 knife 那一层（knifeCheck，先验后切）。
 * 抛：面不活 / 两点不在环上 / 同一个点 / 没有面里的点又相邻（切不出东西）。返回新面、新点（按折线的先后）。
 */
export function splitFaceAlong(k: MeshKernel, f: number, vIn: number, vOut: number, inner: readonly Pt3[] = []): { face: number; verts: number[] } {
  if (!k.hasF(f)) throw new Error(`splitFaceAlong: face ${f} is not alive`);
  const r = k.faceVerts(f), n = r.length, ia = r.indexOf(vIn), ib = r.indexOf(vOut);
  if (ia < 0 || ib < 0) throw new Error(`splitFaceAlong: ${vIn} / ${vOut} not on face ${f}`);
  if (ia === ib) throw new Error(`splitFaceAlong: ${vIn} and ${vOut} are the same vertex`);
  if (!inner.length && ((ib - ia + n) % n === 1 || (ia - ib + n) % n === 1)) throw new Error(`splitFaceAlong: ${vIn} and ${vOut} are adjacent and there is nothing in between`);
  const of = k.shapeOf(f), verts = inner.map((p) => k.addVertex(p));
  const ring1: number[] = [], ring2: number[] = [];
  for (let i = ia; ; i = (i + 1) % n) { ring1.push(r[i]); if (i === ib) break; }
  for (let i = ib; ; i = (i + 1) % n) { ring2.push(r[i]); if (i === ia) break; }
  for (let i = verts.length - 1; i >= 0; i--) ring1.push(verts[i]);
  ring2.push(...verts);
  k.setFaceRing(f, ring1, { kind: "piece", of });   // 劈面：两半都是原来那张的一块（角都是原来的角 = 原值）
  return { face: k.addFace(ring2, { kind: "piece", of }), verts };   // 面上的列（材质、隐藏）照抄：藏着的面切开，两半都藏着
}

/** 刀的一个落点：已有顶点 / 边上的点（参数 t）/ 面里的点（定义坐标；只能夹在两个前两种之间，笔的设计稿第八节第 3 条）。 */
export type KnifeStop = { v: number } | { e: number; t: number } | { p: Pt3 };
/** 刀被拦下（knifeCheck 说了原因）：真身一个数都没动。指令层翻成规矩拒绝（提示行），不是错误。 */
export class KnifeRefused extends Error {}

/**
 * 切之前验一道（笔的设计稿第八节第 2 条；只读，不改 k）。路径里有面里的点 = 必须是「环上一点 → 面里的点… → 环上一点」，两头都在面 f 的环上：
 *   先在副本上（只算位置）拼出劈开后的两个环，各自投到自己的拟合平面上（和三角化同一个投影：planeOfRing + planeBasis）：
 *   新长的那几段不许和别的边相交、不许折回去，两个环的绕向都和原面一样（Newell 同向）；面里的每个点离原面的三角形不超过 COPLANAR_TOL_DEFAULT。
 * 只有两个环上点、没有面里的点（一刀直的）照同一道验（刀线出了凹的面 = 拦）。一刀只有两头：三个以上的环上点 = 拦（统筹审后 1：不留不验的旁路）。
 * 通过 = null；拦 = 一句说事实的话。工具预演刀线的颜色用同一个函数。
 */
export function knifeCheck(k: MeshKernel, f: number, path: readonly KnifeStop[]): string | null {
  if (!k.hasF(f)) return "这张面已经不在了";
  const ringStops = path.filter((s) => !("p" in s)), inner = path.filter((s): s is { p: Pt3 } => "p" in s).map((s) => s.p);
  if (path.length && "p" in path[0]) return "从面中间起刀还没做：第一个点要在点或边上";
  if (path.length && "p" in path[path.length - 1]) return "刀线还没切到边上：最后一个点要在这张面的点或边上";
  if (ringStops.length > 2) return "一刀只能在一张面里拐弯：中间不能再碰到边";
  if (ringStops.length < 2) return "一刀要两个点";
  const r = k.faceVerts(f), n = r.length, P = r.map((v) => k.pt(v));
  // 环上点在原环上的位置：顶点 = 它的下标；边上的点 = 那条边起点的下标 + 沿环方向的参数（0..1）
  const at = (s: KnifeStop): { i: number; u: number; p: Pt3 } | string => {
    if ("v" in s) { const i = r.indexOf(s.v); return i < 0 ? "这个点不在这张面的边上" : { i, u: 0, p: P[i] }; }
    if ("e" in s) {
      if (!k.hasE(s.e)) return "这条边已经不在了";
      if (!(s.t > 0 && s.t < 1)) return "边上的点要落在边的中间";   // t = 0 / 1 = 和端点重合（统筹审后 2：工具夹在 0.001–0.999，这一道给重放和小窗改数）
      const A = k.edgeA[s.e], B = k.edgeB[s.e];
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        if (r[i] === A && r[j] === B) return { i, u: s.t, p: lerp(P[i], P[j], s.t) };
        if (r[i] === B && r[j] === A) return { i, u: 1 - s.t, p: lerp(P[i], P[j], 1 - s.t) };
      }
      return "这一点不在这张面的边上";
    }
    return "面里的点不能当两头";
  };
  const A0 = at(ringStops[0]), B0 = at(ringStops[1]);
  if (typeof A0 === "string") return A0;
  if (typeof B0 === "string") return B0;
  // 原环加上两个落点（边上的点插在它那条边里，同一条边上两个按沿环的参数排），按沿环的位置排成一圈
  type Node = { key: number; p: Pt3; tag: "ring" | "in" | "out" };
  const nodes: Node[] = P.map((p, i) => ({ key: i, p, tag: "ring" as const }));
  const put = (x: { i: number; u: number; p: Pt3 }, tag: "in" | "out"): void => {
    if (x.u === 0) { const at0 = nodes.find((m) => m.tag === "ring" && m.key === x.i)!; (at0 as { tag: string }).tag = tag; return; }   // 落在顶点上 = 就是那个顶点
    nodes.push({ key: x.i + x.u, p: x.p, tag });
  };
  if (A0.i === B0.i && A0.u === B0.u) return "刀线回到了同一个点（在面里切一个圈还没做）";
  put(A0, "in"); put(B0, "out");
  nodes.sort((a, b) => a.key - b.key);
  const iIn = nodes.findIndex((m) => m.tag === "in"), iOut = nodes.findIndex((m) => m.tag === "out"), N = nodes.length;
  if (!inner.length && ((iOut - iIn + N) % N === 1 || (iIn - iOut + N) % N === 1)) return "这两个点之间已经有边了，切不出东西";
  const ring1: Pt3[] = [], ring2: Pt3[] = [];
  for (let i = iIn; ; i = (i + 1) % N) { ring1.push(nodes[i].p); if (i === iOut) break; }
  for (let i = iOut; ; i = (i + 1) % N) { ring2.push(nodes[i].p); if (i === iIn) break; }
  const cut = ringStops.length === 2 ? [A0.p, ...inner, B0.p] : [];   // 新长的那几段（刀线），按进 → 出
  for (let i = inner.length - 1; i >= 0; i--) ring1.push(inner[i]);
  ring2.push(...inner);
  // 面里的点离原面的三角形多远
  const tris = k.faceTriangles(f);
  for (const q of inner) {
    let d = Infinity;
    for (const [a, b, c] of tris) d = Math.min(d, distToTri(q, P[a], P[b], P[c]));
    if (d <= COPLANAR_TOL_DEFAULT) continue;
    const pl0 = planeOfRing(P), dp = pl0 ? distToPlane(q, pl0) : d;   // 在面的平面上、只是在边外面 = 刀线出了面；离开平面 = 离面太远
    return dp <= COPLANAR_TOL_DEFAULT ? "刀线出了这张面" : `面里的点离这张面太远（${(d * 1000).toFixed(2)} 毫米）`;
  }
  const n0 = newell(P);
  for (let i = 0; i + 1 < cut.length; i++) if (dist3(cut[i], cut[i + 1]) <= EPS) return "刀线上有两个点重合了";   // 只看刀线自己的几段（原面本来就有的零长的边不归刀管）
  for (const ring of [ring1, ring2]) {
    const pl = planeOfRing(ring);
    if (!pl) return "切出来的面没有面积";
    const nr = newell(ring);
    if (dot3(nr, n0) <= 0) return "刀线出了这张面";   // 劈开后的环绕向反了 = 刀线绕到面外面去了
    const basis = planeBasis(pl), q = ring.map((x) => projectToPlane(x, basis)), m = q.length;
    // 新长的边（刀线那几段）在这个环里的下标：环里连续两点都在刀线上、且是刀线上相邻的两点
    const isCut = (i: number): boolean => { const a = ring[i], b = ring[(i + 1) % m]; return cutSeg(cut, a, b); };
    const x = ringCrossing(q, isCut);
    if (x) return isCut(x.j) ? "刀线自己交叉了" : "刀线出了这张面";
  }
  return null;
}

/**
 * 刀：面 f 上一刀 = 「环上一点 → 面里的点… → 环上一点」（KnifeStop；面里的点可以零个）。返回沿刀口的顶点序列（面里的点 = 新点，按折线的先后）。
 * 先 knifeCheck，拦下来就抛 KnifeRefused、一个数都不动；过了 = 劈边（边上的点）+ splitFaceAlong。两点之间已经有边、没有拐点 = 什么都不切（和以前一样）。
 */
export function knife(k: MeshKernel, f: number, path: readonly KnifeStop[]): number[] {
  const ringStops = path.filter((s) => !("p" in s)) as ({ v: number } | { e: number; t: number })[];
  const inner = path.filter((s): s is { p: Pt3 } => "p" in s).map((s) => s.p);
  const why = knifeCheck(k, f, path);
  if (why && !(why.startsWith("这两个点之间已经有边了") && !inner.length)) throw new KnifeRefused(why);
  const s0 = ringStops[0], A = "e" in s0 ? k.edgeA[s0.e] : -1, B = "e" in s0 ? k.edgeB[s0.e] : -1;   // 两个点在同一条边上：劈完第一个，那条边就没了，第二个改指劈出来的那一半
  const a = toVert(k, s0), s1 = ringStops[1];
  const b = toVert(k, "e" in s0 && "e" in s1 && s1.e === s0.e ? onHalf(k, A, a, B, s0.t, s1.t) : s1);
  if (why) return [a, b];   // 已经相邻：边已在（和以前一样，什么都不切）
  return [a, ...splitFaceAlong(k, f, a, b, inner).verts, b];
}

const toVert = (k: MeshKernel, s: { v: number } | { e: number; t: number }): number => ("v" in s ? s.v : splitEdge(k, s.e, s.t));
/** 边 A–B 在 t1 处已经劈出点 m 之后，原来在 t2（同样从 A 量）的那一点落在哪一半、那一半上的参数（按那条边自己的 edgeA → edgeB 量）。 */
function onHalf(k: MeshKernel, A: number, m: number, B: number, t1: number, t2: number): { e: number; t: number } {
  const [from, to, u] = t2 < t1 ? [A, m, t2 / t1] : [m, B, (t2 - t1) / (1 - t1)], e = k.edgeOf(from, to);
  return { e, t: k.edgeA[e] === from ? u : 1 - u };
}
const lerp = (a: Pt3, b: Pt3, t: number): Pt3 => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, z: a.z + (b.z - a.z) * t });
/**
 * 平面上的一圈点（已投到面的二维坐标里）自己交不交叉：第 i 段（只看 which(i) 为真的那些段，缺 = 全看）和第 j 段——相邻的交点多于一个（叠回去）、不相邻的有交点 = 交叉。
 * 返回第一对（i 在外层、j 在内层，都按下标升序）；不交叉 = null。刀验刀线（只看刀线那几段）和造面验点序（全看，duplicate.ts faceBlocker）共用这一份。
 */
export function ringCrossing(q: readonly { x: number; y: number }[], which?: (i: number) => boolean): { i: number; j: number } | null {
  const m = q.length;
  for (let i = 0; i < m; i++) {
    if (which && !which(i)) continue;
    const a1 = q[i], a2 = q[(i + 1) % m];
    for (let j = 0; j < m; j++) {
      if (j === i) continue;
      const hits = segIntersections(a1, a2, q[j], q[(j + 1) % m]), adjacent = j === (i + 1) % m || i === (j + 1) % m;
      if (adjacent ? hits.length > 1 : hits.length > 0) return { i, j };
    }
  }
  return null;
}
function newell(ring: readonly Pt3[]): Pt3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < ring.length; i++) { const a = ring[i], b = ring[(i + 1) % ring.length]; x += (a.y - b.y) * (a.z + b.z); y += (a.z - b.z) * (a.x + b.x); z += (a.x - b.x) * (a.y + b.y); }
  return { x, y, z };
}
/** a → b 是不是刀线上相邻的两点（任一方向；按坐标认，刀线上的点都是拼环时原样放进去的同一个对象）。 */
function cutSeg(cut: readonly Pt3[], a: Pt3, b: Pt3): boolean {
  for (let i = 0; i + 1 < cut.length; i++) if ((cut[i] === a && cut[i + 1] === b) || (cut[i] === b && cut[i + 1] === a)) return true;
  return false;
}
/** 点到三角形的距离（最近点：面内 = 到平面的距离，不然 = 到三条边的最近距离）。 */
function distToTri(p: Pt3, a: Pt3, b: Pt3, c: Pt3): number {
  const ab = sub3(b, a), ac = sub3(c, a), nrm = cross3(ab, ac), nn = dot3(nrm, nrm);
  if (nn > 0) {
    const t = dot3(sub3(p, a), nrm) / nn, q = sub3(p, { x: nrm.x * t, y: nrm.y * t, z: nrm.z * t });
    const c1 = dot3(cross3(sub3(b, a), sub3(q, a)), nrm), c2 = dot3(cross3(sub3(c, b), sub3(q, b)), nrm), c3 = dot3(cross3(sub3(a, c), sub3(q, c)), nrm);
    if (c1 >= 0 && c2 >= 0 && c3 >= 0) return Math.abs(t) * Math.sqrt(nn);
  }
  return Math.min(distToSegment3(p, a, b), distToSegment3(p, b, c), distToSegment3(p, c, a));
}

// mesh/ops/subdivide.ts —— 细分（Catmull-Clark，破坏性：烘进网格、一步撤销）。created 2026-10-28 by Claude Opus 5.5
// user 10-27「工具式的subdiv反而可以，不就是破坏性吗」「就是shader的细分是预制，然后建模的细分是另外一个东西。」（纪元账本 FM133）：这是建模那个——
// 做完就是普通的面，不留修改器、不留笼子。
// 规则（写死，任何实现照这个算；FM131「进 model 的语义要数学上有定义」）：
//   面点 = 面的角平均；边点：光滑边 = (两端 + 两侧面点) / 4，折痕 = 中点；
//   点：折痕 ≥ 3 条 = 不动（角）；恰 2 条 = (6P + 两条折痕的另一端) / 8；0 或 1 条 = (Q + 2R + (n − 3)P) / n（Q = 周围面点平均、R = 周围边中点平均、n = 边数）。
//   折痕 = 手标的棱（F_SHARP）+ 网格边缘（只挨一张面）+ 非流形（三张以上）。「默认平滑」不算折痕（它管的是明暗，硬边多的网格照样细分得圆）。
//   每张 n 边形 → n 个四边形（绕向不变）；原来一条边对半分开的两段带原来的标记，新长出来的边不带。
// 裸线 / 孤立的点：不做（细分只认面），调用方说出来。
import { MeshKernel, F_SHARP, F_WIRE } from "../mesh-kernel.ts";
import type { Pt3 } from "../../kernel/kernel.ts";

const add = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x + b.x, y: a.y + b.y, z: a.z + b.z });
const mul = (a: Pt3, s: number): Pt3 => ({ x: a.x * s, y: a.y * s, z: a.z * s });
const avg = (ps: readonly Pt3[]): Pt3 => mul(ps.reduce(add, { x: 0, y: 0, z: 0 }), 1 / Math.max(1, ps.length));

/** 裸线和孤立的点有几个（> 0 = 细分不做）。 */
export function looseBits(m: MeshKernel): number {
  let n = 0;
  for (const e of m.edges()) if (!m.eFaces(e).length || (m.edgeFlags[e] & F_WIRE)) n++;
  for (const v of m.verts()) if (!m.vEdges(v).length) n++;
  return n;
}

/** 细分一次（原地；id 全部重编）。返回新的面数。有裸线 / 孤立的点 = 抛。 */
export function catmullClark(m: MeshKernel): number {
  if (looseBits(m)) throw new Error("catmullClark: the mesh has loose edges or vertices");
  const verts = m.verts(), edges = m.edges(), faces = m.faces();
  const crease = (e: number): boolean => m.eFaces(e).length !== 2 || (m.edgeFlags[e] & F_SHARP) !== 0;
  const other = (e: number, v: number): number => (m.edgeA[e] === v ? m.edgeB[e] : m.edgeA[e]);
  // ---- 读：三种新点的位置 ----
  const fp = new Map<number, Pt3>();
  for (const f of faces) fp.set(f, avg(m.facePts(f)));
  const ep = new Map<number, Pt3>();
  for (const e of edges) {
    const a = m.pt(m.edgeA[e]), b = m.pt(m.edgeB[e]);
    if (crease(e)) ep.set(e, mul(add(a, b), 0.5));
    else { const [f0, f1] = m.eFaces(e); ep.set(e, mul(add(add(a, b), add(fp.get(f0)!, fp.get(f1)!)), 0.25)); }
  }
  const vp = new Map<number, Pt3>();
  for (const v of verts) {
    const P = m.pt(v), es = [...m.vEdges(v)], cs = es.filter(crease);
    if (cs.length >= 3) { vp.set(v, P); continue; }
    if (cs.length === 2) { vp.set(v, mul(add(mul(P, 6), add(m.pt(other(cs[0], v)), m.pt(other(cs[1], v)))), 1 / 8)); continue; }
    const fs = new Set<number>(); for (const e of es) for (const f of m.eFaces(e)) fs.add(f);
    const n = es.length, Q = avg([...fs].map((f) => fp.get(f)!)), R = avg(es.map((e) => mul(add(P, m.pt(other(e, v))), 0.5)));
    vp.set(v, mul(add(add(Q, mul(R, 2)), mul(P, n - 3)), 1 / n));
  }
  // ---- 读：新的面（老 id 记着，写的时候换成新 id）和要搬的边标记 ----
  const quads: { ring: ["v" | "e" | "f", number][]; mat: number }[] = [];
  for (const f of faces) {
    const r = m.faceVerts(f), n = r.length;
    for (let i = 0; i < n; i++) {
      const prev = r[(i - 1 + n) % n], cur = r[i], next = r[(i + 1) % n];
      quads.push({ ring: [["v", cur], ["e", m.edgeOf(cur, next)], ["f", f], ["e", m.edgeOf(prev, cur)]], mat: m.faceMat[f] });
    }
  }
  const halves: { a: number; b: number; e: number; fl: number }[] = [];
  for (const e of edges) if (m.edgeFlags[e]) halves.push({ a: m.edgeA[e], b: m.edgeB[e], e, fl: m.edgeFlags[e] });
  // ---- 写：清空、按 点 → 边点 → 面点 的顺序加回来（确定性）----
  for (const f of faces) m.removeFace(f);
  for (const v of verts) if (m.hasV(v) && !m.vEdges(v).length) m.removeVertex(v);
  const nv = new Map<number, number>(), ne = new Map<number, number>(), nf = new Map<number, number>();
  for (const v of verts) nv.set(v, m.addVertex(vp.get(v)!));
  for (const e of edges) ne.set(e, m.addVertex(ep.get(e)!));
  for (const f of faces) nf.set(f, m.addVertex(fp.get(f)!));
  const id = ([k, x]: ["v" | "e" | "f", number]): number => (k === "v" ? nv : k === "e" ? ne : nf).get(x)!;
  for (const q of quads) m.addFace(q.ring.map(id), q.mat);
  for (const h of halves) for (const [x, y] of [[nv.get(h.a)!, ne.get(h.e)!], [ne.get(h.e)!, nv.get(h.b)!]]) { const k = m.edgeOf(x, y); if (k >= 0) m.setEdgeFlags(k, h.fl & ~F_WIRE); }
  return quads.length;
}

/** 细分 levels 次。 */
export function subdivide(m: MeshKernel, levels = 1): number {
  let n = m.faceCount();
  for (let i = 0; i < levels; i++) n = catmullClark(m);
  return n;
}

// repairs/orient/plan.ts —— 修复「统一朝向」「自动朝外」的规划：纯函数（零 DOM，node 直测）。单面 / 双面第四版（计划书 §9.3-4）；不进任何默认路径，用户点了才跑、报改了几张。
// 统一朝向 = 机械：从选中的、有朝向的面出发，沿「恰好两张面」的边灌（kernel/flood.ts floodSides）。
// 自动朝外 = 猜（user 11-04「aha这个应该修复管。包括曲率」）：把面的两侧连成「同一片空气」的区（一条边上多张面按角度找紧挨的那张；开口边不绕），
//   带符号体积最大的区 = 外面；这一区的高斯曲率总和（开口边上的点不算）判够不够鼓：够 = 壳，朝外；不够 = 片，不动（平面、栅栏、脸）。功能账有 17 个真模型的实测。
// created 2026-11-04 by Claude Opus 5.5
import { backSideOf } from "../../../kernel/face-sides.ts";
import { floodSides, faceLeftSign } from "../../../kernel/flood.ts";
import { dot3, cross3, normalize3, signedArea, sub3, type Pt3 } from "../../../kernel/geom.ts";
import type { EdgeId, FaceId, Kernel, VertexId } from "../../../kernel/kernel.ts";
import { triangulateRings } from "../../../format/triangulate.ts";

type Side = 0 | 1;
/** 改法：flip = 两侧互换（朝向反了）；back = 这张面这一侧写默认背面（原来没朝向）。 */
export interface OrientPlan { flip: FaceId[]; back: { face: FaceId; side: Side }[]; /** 想定朝向但动不了的（那一侧涂了真材质 / 灌到了两侧）。 */ stuck: number }

/** 目标（面 → 哪侧该是默认背面）→ 改法。已经对的不动；要写默认背面的那一侧涂了真材质 = 不覆盖（用户的颜色不许被修复工具吃掉）。 */
function toChanges(k: Pick<Kernel, "faceMaterialOf">, back: number, target: ReadonlyMap<FaceId, Side>): OrientPlan {
  const out: OrientPlan = { flip: [], back: [], stuck: 0 };
  for (const [f, side] of [...target].sort((a, b) => a[0] - b[0])) {
    const cur = backSideOf(k, f, back);
    if (cur === side) continue;
    if (cur !== null) { out.flip.push(f); continue; }
    if (k.faceMaterialOf(f, side) === undefined) out.back.push({ face: f, side });
    else out.stuck++;
  }
  return out;
}

/** 这条边上恰好两张面（T 字边、开口边不灌）。 */
const twoFaces = (k: Pick<Kernel, "graph">) => (e: EdgeId): boolean => new Set(k.graph.edge(e).faceLinks).size === 2;

/** 统一朝向：以 seeds 里有朝向的面为准。noSeed = 选中的面都分不出哪侧是正面（两侧都不是默认背面）。 */
export function planUnify(k: Kernel, back: number, seeds: readonly FaceId[]): OrientPlan & { noSeed: boolean } {
  const target = new Map<FaceId, Side>(), split = new Set<FaceId>();
  let any = false;
  for (const seed of [...seeds].sort((a, b) => a - b)) {
    if (!k.face(seed) || target.has(seed) || split.has(seed)) continue;
    const s0 = backSideOf(k, seed, back);
    if (s0 === null) continue;
    any = true;
    for (const { face, side } of floodSides(k, seed, s0, twoFaces(k))) {   // 灌的是「和种子的背面同一边」的侧
      const had = target.get(face);
      if (had !== undefined && had !== side) split.add(face); else target.set(face, side);
    }
  }
  for (const f of split) target.delete(f);
  const out = toChanges(k, back, target);
  return { ...out, stuck: out.stuck + split.size, noSeed: !any };
}

export interface OutwardOpts { /** 这一区的高斯曲率总和够这么多（弧度）才算壳。封闭壳 = 4π。 */ minCurvature: number }
class Dsu { p: Int32Array; constructor(n: number) { this.p = new Int32Array(n).map((_, i) => i); } find(x: number): number { while (this.p[x] !== x) { this.p[x] = this.p[this.p[x]]; x = this.p[x]; } return x; } union(a: number, b: number): void { this.p[this.find(a)] = this.find(b); } }

/** 自动朝外。scope = 看哪些面（null = 整个池）；sheets = 几块不够鼓、没动；shells = 几块按壳处理。 */
export function planOutward(k: Kernel, back: number, scope: Iterable<FaceId> | null, o: OutwardOpts): OrientPlan & { sheets: number; shells: number } {
  const faces = scope ? [...new Set(scope)].filter((f) => k.face(f)).sort((a, b) => a - b) : k.faces().map((f) => f.id).sort((a, b) => a - b);
  const idx = new Map<FaceId, number>(faces.map((f, i) => [f, i])), g = k.graph;
  const side = new Dsu(2 * faces.length), comp = new Dsu(faces.length), open = new Set<VertexId>(), seen = new Set<EdgeId>();
  for (const f of faces) {
    const F = k.face(f)!;
    for (const r of [F.outer, ...F.holes]) for (const d of r.edges) {
      if (seen.has(d.edge)) continue;
      seen.add(d.edge);
      const E = g.edge(d.edge), links = [...new Set(E.faceLinks)].filter((x) => idx.has(x));
      if (links.length < 2) { open.add(E.a); open.add(E.b); continue; }
      for (let i = 1; i < links.length; i++) comp.union(idx.get(links[0])!, idx.get(links[i])!);
      const e = normalize3(sub3(g.pt(E.b), g.pt(E.a)));
      // 每张面在这条边上往面里走的方向 d = ±(n × e)（faceLeftSign：面在 a→b 的左手边 = +）；绕边按角度排，相邻两张面夹的那块空气 = 同一区
      const around = links.map((x) => { const n = k.planeOf(x)!.plane.n, l = faceLeftSign(k, x, d.edge) ?? 1, c = cross3(n, e); return { x, n, d: { x: c.x * l, y: c.y * l, z: c.z * l } }; });
      const u = around[0].d, v = cross3(e, u);
      const sorted = around.map((a) => ({ ...a, ang: (Math.atan2(dot3(a.d, v), dot3(a.d, u)) + 2 * Math.PI) % (2 * Math.PI) })).sort((a, b) => a.ang - b.ang || a.x - b.x);
      for (let i = 0; i < sorted.length; i++) {
        const a = sorted[i], b = sorted[(i + 1) % sorted.length];
        side.union(2 * idx.get(a.x)! + (dot3(a.n, cross3(e, a.d)) > 0 ? 0 : 1), 2 * idx.get(b.x)! + (dot3(b.n, cross3(e, b.d)) > 0 ? 1 : 0));
      }
    }
  }
  const blocks = new Map<number, number[]>();
  faces.forEach((_, i) => { const r = comp.find(i); const l = blocks.get(r); if (l) l.push(i); else blocks.set(r, [i]); });
  const target = new Map<FaceId, Side>();
  let sheets = 0, shells = 0, stuck = 0;
  const trisOf = (f: FaceId): [Pt3, Pt3, Pt3][] => {
    const F = k.face(f)!, n = k.planeOf(f)!.plane.n, pts: Pt3[] = [], outer: number[] = [], holes: number[][] = [];
    for (const v of F.outer.vids) { outer.push(pts.length); pts.push(g.pt(v)); }
    for (const h of F.holes) { const hh: number[] = []; for (const v of h.vids) { hh.push(pts.length); pts.push(g.pt(v)); } holes.push(hh); }
    return triangulateRings(pts, k.planeOf(f)!.plane, outer, holes).map(([a, b, c]) => (dot3(cross3(sub3(pts[b], pts[a]), sub3(pts[c], pts[a])), n) < 0 ? [pts[a], pts[c], pts[b]] : [pts[a], pts[b], pts[c]]) as [Pt3, Pt3, Pt3]);
  };
  for (const members of [...blocks.values()].sort((a, b) => a[0] - b[0])) {
    const vs = new Set<VertexId>();
    for (const i of members) { const F = k.face(faces[i])!; for (const r of [F.outer, ...F.holes]) for (const v of r.vids) vs.add(v); }
    const c = { x: 0, y: 0, z: 0 };
    for (const v of vs) { const p = g.pt(v); c.x += p.x / vs.size; c.y += p.y / vs.size; c.z += p.z / vs.size; }
    const vol = new Map<number, number>();
    for (const i of members) {
      let a = 0;
      for (const [p, q, r] of trisOf(faces[i])) a += dot3(sub3(p, c), cross3(sub3(q, c), sub3(r, c))) / 6;
      const r0 = side.find(2 * i), r1 = side.find(2 * i + 1);
      vol.set(r0, (vol.get(r0) ?? 0) + a); vol.set(r1, (vol.get(r1) ?? 0) - a);
    }
    let best = -1, bv = -Infinity;
    for (const [r, v] of [...vol].sort((x, y) => x[0] - y[0])) if (v > bv + 1e-12) { best = r; bv = v; }
    // 这一区的高斯曲率总和：外面这层膜每个点 2π − 角度和；开口边上的点不算（开窗不改变它）
    const ang = new Map<VertexId, number>();
    for (const i of members) {
      if (side.find(2 * i) !== best && side.find(2 * i + 1) !== best) continue;
      const F = k.face(faces[i])!, n = k.planeOf(faces[i])!.plane.n;
      [F.outer, ...F.holes].forEach((r, ri) => {
        const m = r.vids.length, interiorLeft = (signedArea(r.pts) > 0) === (ri === 0);   // 环的 2D 坐标在平面的右手基下（u × v = n）：走环时面在左手边 = 内角从下一条边逆时针转到上一条边
        for (let j = 0; j < m; j++) {
          if (open.has(r.vids[j])) continue;
          const p = g.pt(r.vids[j]), nx = sub3(g.pt(r.vids[(j + 1) % m]), p), pv = sub3(g.pt(r.vids[(j - 1 + m) % m]), p), a = interiorLeft ? nx : pv, b = interiorLeft ? pv : nx;
          let t = Math.atan2(dot3(n, cross3(a, b)), dot3(a, b));
          if (t < 0) t += 2 * Math.PI;
          ang.set(r.vids[j], (ang.get(r.vids[j]) ?? 0) + t);
        }
      });
    }
    let K = 0;
    for (const s of ang.values()) K += 2 * Math.PI - s;
    if (K < o.minCurvature) { sheets++; continue; }
    shells++;
    for (const i of members) {
      const a = side.find(2 * i) === best, b = side.find(2 * i + 1) === best;
      if (a === b) { stuck++; continue; }   // 两侧同一片空气（莫比乌斯）/ 都不朝外（壳里的隔墙）：不猜
      target.set(faces[i], a ? 1 : 0);
    }
  }
  const out = toChanges(k, back, target);
  return { ...out, stuck: out.stuck + stuck, sheets, shells };
}

// mesh/ops/extrude.ts —— 长：挤出一组面（区域的顶点复制一份、面改指向新点、区域边界每条边长一张四边形侧面；内部边不长）。不挪：挪归工具。
// created 2026-10-27 by Claude Fable 5.1
import { MeshKernel, F_WIRE, F_SHARP, F_SMOOTH, F_SOFT } from "../mesh-kernel.ts";

export interface ExtrudeResult { newVerts: Map<number, number>; sides: number[]; }

const MARKS = F_SHARP | F_SMOOTH | F_SOFT;

/**
 * inheritMarks（2026-10-28 Claude Opus 5.5；硬软边设计稿 §3）：挤出来的那块是原来那几张面的复制，所以它的边（帽子那一圈 + 区域里面的边）带上原来那些边的手标；
 * 侧面的竖边不标；原来的边界留在老面和侧面之间，手标不动。插入传 false（新的一圈在面里，夹角 0，交给默认平滑）。
 */
export function extrudeFaces(k: MeshKernel, fs: readonly number[], inheritMarks = true): ExtrudeResult {
  const region = new Set([...fs].filter((f) => k.hasF(f)));
  if (!region.size) throw new Error("extrudeFaces: no alive faces");
  // 区域顶点 → 新顶点（同位置）
  const newVerts = new Map<number, number>();
  for (const f of [...region].sort((a, b) => a - b)) for (const v of k.faceVerts(f)) if (!newVerts.has(v)) newVerts.set(v, k.addVertex(k.pt(v)));
  // 边界边 = 恰有一张区域内的面（按区域内那张面的绕向记 a→b）
  const boundary: [number, number, number][] = [];   // [a, b, 面]
  for (const f of [...region].sort((a, b) => a - b)) {
    const r = k.faceVerts(f);
    for (let i = 0; i < r.length; i++) {
      const a = r[i], b = r[(i + 1) % r.length], e = k.edgeOf(a, b);
      const inRegion = [...k.eFaces(e)].filter((ff) => region.has(ff)).length;
      if (inRegion === 1) boundary.push([a, b, f]);
    }
  }
  // 区域里每条边的手标（面改指向新点以后，内部边会被删、帽子那圈是新边）
  const marks: [number, number, number][] = [];
  if (inheritMarks) for (const f of [...region].sort((a, b) => a - b)) {
    const r = k.faceVerts(f);
    for (let i = 0; i < r.length; i++) { const a = r[i], b = r[(i + 1) % r.length], m = k.edgeFlags[k.edgeOf(a, b)] & MARKS; if (m) marks.push([a, b, m]); }
  }
  // 面改指向新点
  for (const f of [...region].sort((a, b) => a - b)) k.setFaceRing(f, k.faceVerts(f).map((v) => newVerts.get(v)!));
  for (const [a, b, m] of marks) { const e = k.edgeOf(newVerts.get(a)!, newVerts.get(b)!); if (e >= 0) k.setEdgeFlags(e, (k.edgeFlags[e] & ~MARKS) | m); }
  // 侧面：顶面绕向 a→b（朝外时从外面看逆时针），侧面 (a, b, b', a') 的右手法向 = (b−a) × (b'−b) 朝外（盒子顶面 y=0 那条边：(1,0,0) × (0,0,1) = (0,−1,0)）
  const sides: number[] = [];
  for (const [a, b, f] of boundary) sides.push(k.addFace([a, b, newVerts.get(b)!, newVerts.get(a)!], k.faceMat[f]));
  return { newVerts, sides };
}

/**
 * 挤出边（2026-10-27 Claude Opus 5.5；设计稿 §2-2「选中的一条边拉成一堵墙」、FM15）：边的端点各复制一份（相连的边共用），每条边长一张四边形 (a, b, b', a')；
 * 绕向跟它原来那张面相反（共用边上方向相反 = 法向一致）：边属于恰一张面且那张面里是 a→b → 新面走 b→a。没有面 / 两张面的边按 a→b。不挪：挪归调用方。
 */
export function extrudeEdges(k: MeshKernel, es: readonly number[]): ExtrudeResult {
  const edges = [...new Set(es)].filter((e) => k.hasE(e)).sort((a, b) => a - b);
  if (!edges.length) throw new Error("extrudeEdges: no alive edges");
  const newVerts = new Map<number, number>();
  const dup = (v: number): number => { let n = newVerts.get(v); if (n === undefined) { n = k.addVertex(k.pt(v)); newVerts.set(v, n); } return n; };
  const plan: { a: number; b: number; mat: number }[] = [];
  for (const e of edges) {
    let a = k.edgeA[e], b = k.edgeB[e], mat = -1;
    const fs = [...k.eFaces(e)];
    if (fs.length === 1) { const r = k.faceVerts(fs[0]), i = r.indexOf(a); if (r[(i + 1) % r.length] === b) [a, b] = [b, a]; mat = k.faceMat[fs[0]]; }
    plan.push({ a, b, mat });
  }
  for (const { a, b } of plan) { dup(a); dup(b); }
  const sides: number[] = [];
  for (const { a, b, mat } of plan) sides.push(k.addFace([a, b, newVerts.get(b)!, newVerts.get(a)!], mat));
  return { newVerts, sides };
}

/** 挤出点（「一个点拉成一条线」）：每个点复制一份、连一条裸线（F_WIRE）。不挪。 */
export function extrudeVerts(k: MeshKernel, vs: readonly number[]): ExtrudeResult {
  const verts = [...new Set(vs)].filter((v) => k.hasV(v)).sort((a, b) => a - b);
  if (!verts.length) throw new Error("extrudeVerts: no alive vertices");
  const newVerts = new Map<number, number>();
  for (const v of verts) { const n = k.addVertex(k.pt(v)); newVerts.set(v, n); const e = k.ensureEdge(v, n); k.setEdgeFlags(e, k.edgeFlags[e] | F_WIRE); }
  return { newVerts, sides: [] };
}

/**
 * 拉（自由建模工作台的挤出一下 = 一条 op）：有面 = 挤出这组面（区域一起挤，内部边不长）；否则有边 = 挤出边；否则挤出点。新点整体平移 offset（本地坐标）。
 * 确定性：同一份内核 + 同一组参数 → 同一批新 id（数组制度：空闲链和计数器都在内核里，克隆保号）。
 */
export function extrudeAndOffset(k: MeshKernel, t: { faces?: readonly number[]; edges?: readonly number[]; verts?: readonly number[] }, offset: { x: number; y: number; z: number }): ExtrudeResult {
  const r = t.faces?.length ? extrudeFaces(k, t.faces) : t.edges?.length ? extrudeEdges(k, t.edges) : extrudeVerts(k, t.verts ?? []);
  for (const n of r.newVerts.values()) { const p = k.pt(n); k.setPos(n, { x: p.x + offset.x, y: p.y + offset.y, z: p.z + offset.z }); }
  return r;
}

const ZUP = { x: 0, y: 0, z: 1 };
const nrm = (v: { x: number; y: number; z: number }): { x: number; y: number; z: number } | null => { const L = Math.hypot(v.x, v.y, v.z); return L > 1e-12 ? { x: v.x / L, y: v.y / L, z: v.z / L } : null; };
/**
 * 边 / 点挤出的「垂直」方向（user 2026-10-27「拉边 / 拉点默认往哪走 默认垂直」；纪元账本 FM110）：挤出之前按原几何算，每个源点一个单位方向（本地坐标）。
 * 边：每条选中的边 = 它两侧面法向的平均（边界边 = 它那张面的法向；拉一圈裙摆的下沿 = 各自往外）；点的方向 = 连着它的选中边的方向之和。
 * 点：连着它的面的法向平均。没有面（孤立的边 / 点）或相互抵消 = 本地 +Z（拉墙）。确定性：只读内核、按 id 序累加。
 */
export function extrudeNormalDirs(k: MeshKernel, t: { edges?: readonly number[]; verts?: readonly number[] }): Map<number, { x: number; y: number; z: number }> {
  const acc = new Map<number, { x: number; y: number; z: number }>();
  const add = (v: number, d: { x: number; y: number; z: number }): void => { const a = acc.get(v) ?? { x: 0, y: 0, z: 0 }; acc.set(v, { x: a.x + d.x, y: a.y + d.y, z: a.z + d.z }); };
  const faceSum = (fs: Iterable<number>): { x: number; y: number; z: number } => { let s = { x: 0, y: 0, z: 0 }; for (const f of fs) { const n = k.faceNormal(f); s = { x: s.x + n.x, y: s.y + n.y, z: s.z + n.z }; } return s; };
  if (t.edges?.length) {
    for (const e of [...new Set(t.edges)].filter((x) => k.hasE(x)).sort((a, b) => a - b)) {
      const n = nrm(faceSum([...k.eFaces(e)].sort((a, b) => a - b))) ?? { x: 0, y: 0, z: 0 };
      add(k.edgeA[e], n); add(k.edgeB[e], n);
    }
  } else for (const v of [...new Set(t.verts ?? [])].filter((x) => k.hasV(x)).sort((a, b) => a - b)) {
    const fs = new Set<number>();
    for (const e of k.vEdges(v)) for (const f of k.eFaces(e)) fs.add(f);
    add(v, faceSum([...fs].sort((a, b) => a - b)));
  }
  const out = new Map<number, { x: number; y: number; z: number }>();
  for (const [v, d] of [...acc].sort((a, b) => a[0] - b[0])) out.set(v, nrm(d) ?? ZUP);
  return out;
}
/** 边 / 点挤出、每个新点沿它源点的「垂直」方向走 dist（本地长度）。面不走这条（面 = 区域一起沿平均法向平移，extrudeAndOffset）。 */
export function extrudeAlongNormals(k: MeshKernel, t: { edges?: readonly number[]; verts?: readonly number[] }, dist: number): ExtrudeResult {
  const dirs = extrudeNormalDirs(k, t);
  const r = t.edges?.length ? extrudeEdges(k, t.edges) : extrudeVerts(k, t.verts ?? []);
  for (const [src, n] of r.newVerts) { const d = dirs.get(src) ?? ZUP, p = k.pt(n); k.setPos(n, { x: p.x + d.x * dist, y: p.y + d.y * dist, z: p.z + d.z * dist }); }
  return r;
}

// mesh/ops/split.ts —— 劈：劈边 / 劈面 / 刀（面上一串点）。纯函数，原地改 k；只切不长：永远不会多出一张没人要的面。created 2026-10-27 by Claude Fable 5.1
import type { Pt3 } from "../../kernel/geom.ts";
import { MeshKernel, F_WIRE } from "../mesh-kernel.ts";

/** 劈边：e 在参数 t 处加一个顶点；e 所在的每张面的环都插进这个点；标记两半都带。返回新顶点。 */
export function splitEdge(k: MeshKernel, e: number, t = 0.5): number {
  if (!k.hasE(e)) throw new Error(`splitEdge: edge ${e} is not alive`);
  const a = k.edgeA[e], b = k.edgeB[e], pa = k.pt(a), pb = k.pt(b);
  const v = k.addVertex({ x: pa.x + (pb.x - pa.x) * t, y: pa.y + (pb.y - pa.y) * t, z: pa.z + (pb.z - pa.z) * t });
  const flags = k.edgeFlags[e];
  const faces = [...k.eFaces(e)];
  for (const f of faces) {
    const r = k.faceVerts(f), out: number[] = [];
    for (let i = 0; i < r.length; i++) { out.push(r[i]); const n = r[(i + 1) % r.length]; if ((r[i] === a && n === b) || (r[i] === b && n === a)) out.push(v); }
    k.setFaceRing(f, out);
  }
  if (!faces.length) { k.removeEdge(e); }   // 裸线：原边删、两半各成裸线
  for (const [x, y] of [[a, v], [v, b]] as const) { const ne = k.ensureEdge(x, y); k.edgeFlags[ne] = flags | (faces.length ? 0 : F_WIRE); }
  return v;
}

/** 劈面：面 f 上两个不相邻的顶点之间加一条边，f 分成两张（f 保 id、另一张新 id）。返回新面。 */
export function splitFace(k: MeshKernel, f: number, va: number, vb: number): number {
  if (!k.hasF(f)) throw new Error(`splitFace: face ${f} is not alive`);
  const r = k.faceVerts(f), ia = r.indexOf(va), ib = r.indexOf(vb);
  if (ia < 0 || ib < 0) throw new Error(`splitFace: ${va} / ${vb} not on face ${f}`);
  if (ia === ib || (ib - ia + r.length) % r.length === 1 || (ia - ib + r.length) % r.length === 1) throw new Error(`splitFace: ${va} and ${vb} are adjacent or equal`);
  const ring1: number[] = [], ring2: number[] = [];
  for (let i = ia; ; i = (i + 1) % r.length) { ring1.push(r[i]); if (i === ib) break; }
  for (let i = ib; ; i = (i + 1) % r.length) { ring2.push(r[i]); if (i === ia) break; }
  const mat = k.faceMat[f];
  k.setFaceRing(f, ring1);
  return k.addFace(ring2, mat);
}

/** 刀：面 f 上按顺序一串落点，每个落点 = 已有顶点 { v } 或边上的点 { e, t }；相邻两点之间连边劈面。返回沿刀口的顶点序列。 */
export function knife(k: MeshKernel, f: number, path: readonly ({ v: number } | { e: number; t: number })[]): number[] {
  const verts: number[] = [];
  for (const p of path) verts.push("v" in p ? p.v : splitEdge(k, p.e, p.t));
  let cur = f;
  for (let i = 0; i + 1 < verts.length; i++) {
    const a = verts[i], b = verts[i + 1];
    // 找到同时含 a、b 的面（刀切过一次后 b 可能在新面上）
    const cand = [cur, ...k.faces()].find((ff) => k.hasF(ff) && k.faceVerts(ff).includes(a) && k.faceVerts(ff).includes(b));
    if (cand === undefined) throw new Error(`knife: no face contains both ${a} and ${b}`);
    const r = k.faceVerts(cand), ia = r.indexOf(a), ib = r.indexOf(b);
    if ((ib - ia + r.length) % r.length === 1 || (ia - ib + r.length) % r.length === 1) { cur = cand; continue; }   // 已经相邻：边已在
    const nf = splitFace(k, cand, a, b);
    cur = k.faceVerts(nf).includes(b) ? nf : cand;
  }
  return verts;
}

// mesh/mesh-doc.ts —— mesh 内核 ↔ 文件载荷（format/document.ts MeshDoc = CATSUP_mesh 1.0.0 的多边形形）。created 2026-10-27 by Claude Fable 5.1
// 存：去空位、id 重编（user 10-27「catsup rule: organize in export/save」）；坐标 f64 逐字；只列带标记的边。读：坏环（< 3 个不同顶点 / 下标越界）= 文件坏了，抛人话、不静默丢。
import type { MeshDoc } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";

export function meshDocFromKernel(m: MeshKernel): MeshDoc {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float64Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const faces = m.faces(), faceStart = new Int32Array(faces.length), faceLen = new Int32Array(faces.length), faceMat = new Int32Array(faces.length), faceFlags = new Uint8Array(faces.length);
  const loop: number[] = [];
  faces.forEach((f, i) => { const vs = m.faceVerts(f); faceStart[i] = loop.length; faceLen[i] = vs.length; faceMat[i] = m.faceMat[f]; faceFlags[i] = m.faceFlags[f]; for (const v of vs) loop.push(map.get(v)!); });
  const pairs: number[] = [], flags: number[] = [];
  for (const e of m.edges()) if (m.edgeFlags[e]) { pairs.push(map.get(m.edgeA[e])!, map.get(m.edgeB[e])!); flags.push(m.edgeFlags[e]); }
  return { positions, faceStart, faceLen, loopVert: Int32Array.from(loop), faceMat, faceFlags, edgePairs: Int32Array.from(pairs), edgeFlags: Uint8Array.from(flags), smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg } };
}

export function kernelFromMeshDoc(d: MeshDoc, where = "mesh"): MeshKernel {
  const m = new MeshKernel(), nV = Math.floor(d.positions.length / 3);
  for (let i = 0; i < nV; i++) m.addVertex({ x: d.positions[3 * i], y: d.positions[3 * i + 1], z: d.positions[3 * i + 2] });
  if (d.faceLen.length !== d.faceStart.length || d.faceMat.length !== d.faceStart.length || d.faceFlags.length !== d.faceStart.length) throw new Error(`${where}: face tables disagree on face count`);
  for (let f = 0; f < d.faceStart.length; f++) {
    const s = d.faceStart[f], n = d.faceLen[f];
    if (s < 0 || n < 3 || s + n > d.loopVert.length) throw new Error(`${where}: face ${f} loop out of range`);
    const ring = Array.from(d.loopVert.subarray(s, s + n));
    for (const v of ring) if (v < 0 || v >= nV) throw new Error(`${where}: face ${f} references vertex ${v} (have ${nV})`);
    let fid: number;
    try { fid = m.addFace(ring, d.faceMat[f]); } catch (e) { throw new Error(`${where}: face ${f} invalid (${e instanceof Error ? e.message : String(e)})`); }
    if (d.faceFlags[f]) m.setFaceFlags(fid, d.faceFlags[f], true);
  }
  if (d.edgeFlags.length * 2 !== d.edgePairs.length) throw new Error(`${where}: edgePairs / edgeFlags disagree`);
  for (let i = 0; i < d.edgeFlags.length; i++) {
    const a = d.edgePairs[2 * i], b = d.edgePairs[2 * i + 1];
    if (a < 0 || b < 0 || a >= nV || b >= nV || a === b) throw new Error(`${where}: flagged edge ${i} invalid`);
    m.setEdgeFlags(m.ensureEdge(a, b), d.edgeFlags[i]);   // 不属于任何面的 = 裸线（F_WIRE 由标记自己带）
  }
  if (d.smoothDefault) m.setSmoothDefault(d.smoothDefault);   // 缺 = 老文件 = 全硬（MeshKernel 默认；老文件语义 = 只看手标）
  return m;
}

// mesh/mesh-doc.ts —— mesh 内核 ↔ 文件载荷（format/document.ts MeshDoc = CATSUP_mesh 1.0.0 的多边形形）。created 2026-10-27 by Claude Fable 5.1
// 存：去空位、id 重编（user 10-27「catsup rule: organize in export/save」）；坐标 f64 逐字；只列带标记的边。读：坏环（< 3 个不同顶点 / 下标越界）= 文件坏了，抛人话、不静默丢。
// 贴图坐标（1-2½）：存 = 每一套从内核里同 GUID 的列取（和 loopVert 同序，这一套没值的面写 NaN）；读 = 每一套建一列、每张面整面有值才给（读的那一层 mesh-payload.ts 已经收口成整面有或整面没有）。
import type { MeshDoc, UvSetMeta } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
import { FRESH } from "./corner-columns.ts";

/** uvSets = 这个网格体的贴图坐标表（MeshBody.uvSets 的行）：每一行从内核里同 GUID 的列取角上的数。不给 = 不带贴图坐标。 */
export function meshDocFromKernel(m: MeshKernel, uvSets: readonly UvSetMeta[] = []): MeshDoc {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float64Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const faces = m.faces(), faceStart = new Int32Array(faces.length), faceLen = new Int32Array(faces.length), faceMat = new Int32Array(faces.length), faceFlags = new Uint8Array(faces.length);
  const loop: number[] = [];
  faces.forEach((f, i) => { const vs = m.faceVerts(f); faceStart[i] = loop.length; faceLen[i] = vs.length; faceMat[i] = m.faceMat[f]; faceFlags[i] = m.faceFlags[f]; for (const v of vs) loop.push(map.get(v)!); });
  const pairs: number[] = [], flags: number[] = [];
  for (const e of m.edges()) if (m.edgeFlags[e]) { pairs.push(map.get(m.edgeA[e])!, map.get(m.edgeB[e])!); flags.push(m.edgeFlags[e]); }
  const uv = uvSets.map((r) => {
    const loopUv = new Float32Array(2 * loop.length).fill(NaN);
    faces.forEach((f, i) => { const v = m.cornerValues(f, r.guid); if (v) loopUv.set(v, 2 * faceStart[i]); });
    return { guid: r.guid, name: r.name, width: r.width, height: r.height, pxPerM: r.pxPerM, loopUv };
  });
  return { positions, faceStart, faceLen, loopVert: Int32Array.from(loop), faceMat, faceFlags, edgePairs: Int32Array.from(pairs), edgeFlags: Uint8Array.from(flags), smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg }, ...(uv.length ? { uvSets: uv } : {}) };
}

export function kernelFromMeshDoc(d: MeshDoc, where = "mesh"): MeshKernel {
  const m = new MeshKernel(), nV = Math.floor(d.positions.length / 3), sets = d.uvSets ?? [];
  for (const u of sets) m.addColumn({ guid: u.guid, arity: 2 });
  for (let i = 0; i < nV; i++) m.addVertex({ x: d.positions[3 * i], y: d.positions[3 * i + 1], z: d.positions[3 * i + 2] });
  if (d.faceLen.length !== d.faceStart.length || d.faceMat.length !== d.faceStart.length || d.faceFlags.length !== d.faceStart.length) throw new Error(`${where}: face tables disagree on face count`);
  for (let f = 0; f < d.faceStart.length; f++) {
    const s = d.faceStart[f], n = d.faceLen[f];
    if (s < 0 || n < 3 || s + n > d.loopVert.length) throw new Error(`${where}: face ${f} loop out of range`);
    const ring = Array.from(d.loopVert.subarray(s, s + n));
    for (const v of ring) if (v < 0 || v >= nV) throw new Error(`${where}: face ${f} references vertex ${v} (have ${nV})`);
    let fid: number;
    let origin = FRESH;
    if (sets.length) {   // 读文件 = 凭空来的、直接给值（每一套整面有值才给）
      const values = new Map<string, Float32Array>();
      for (const u of sets) if (!Number.isNaN(u.loopUv[2 * s])) values.set(u.guid, u.loopUv.slice(2 * s, 2 * (s + n)));
      origin = { kind: "fresh", values };
    }
    try { fid = m.addFace(ring, d.faceMat[f], origin); } catch (e) { throw new Error(`${where}: face ${f} invalid (${e instanceof Error ? e.message : String(e)})`); }
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

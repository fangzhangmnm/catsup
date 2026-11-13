// mesh/mesh-doc.ts —— mesh 内核 ↔ 文件载荷（format/document.ts MeshDoc = CATSUP_mesh 1.0.0 的多边形形）。created 2026-10-27 by Claude Fable 5.1
// 存：去空位、id 重编（user 10-27「catsup rule: organize in export/save」）；坐标 f64 逐字；只列带标记的边。读：坏环（< 3 个不同顶点 / 下标越界）= 文件坏了，抛人话、不静默丢。
// 角上的列（CATSUP_mesh 3.0，施工单十八；1-2½ 起有贴图坐标）：存 = 内核里每一列原样（种类、每角几个数、不认识的键），值和 loopVert 同序、没值的面写 NaN；
//   读 = 每一列建回来、每张面整面有值才给（读的那一层 mesh-payload.ts 已经收口成整面有或整面没有）。排法表那一行不在这里（场景这一层，CATSUP_uvsets）。
import type { CarriedJson, ColumnDoc, MeshDoc } from "../format/document.ts";
import { MeshKernel } from "./mesh-kernel.ts";
import { FRESH } from "./corner-columns.ts";
import { smoothDefaultOf } from "../format/migrate/mesh.ts";

/** 内核 → 载荷：每一列原样带上（没有列 = 不写 columns，和以前逐字节一样）。 */
export function meshDocFromKernel(m: MeshKernel): MeshDoc {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float64Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const faces = m.faces(), faceStart = new Int32Array(faces.length), faceLen = new Int32Array(faces.length), faceMat = new Int32Array(faces.length), faceFlags = new Uint8Array(faces.length);
  const loop: number[] = [];
  faces.forEach((f, i) => { const vs = m.faceVerts(f); faceStart[i] = loop.length; faceLen[i] = vs.length; faceMat[i] = m.faceMat[f]; faceFlags[i] = m.faceFlags[f]; for (const v of vs) loop.push(map.get(v)!); });
  const pairs: number[] = [], flags: number[] = [];
  for (const e of m.edges()) if (m.edgeFlags[e]) { pairs.push(map.get(m.edgeA[e])!, map.get(m.edgeB[e])!); flags.push(m.edgeFlags[e]); }
  const columns: ColumnDoc[] = m.columnDefs().map((c) => {
    const values = new Float32Array(c.arity * loop.length).fill(NaN);
    faces.forEach((f, i) => { const v = m.cornerValues(f, c.guid); if (v) values.set(v, c.arity * faceStart[i]); });
    return { guid: c.guid, kind: c.kind, arity: c.arity, values, ...(c.extra !== undefined ? { extra: c.extra as CarriedJson } : {}) };
  });
  return { positions, faceStart, faceLen, loopVert: Int32Array.from(loop), faceMat, faceFlags, edgePairs: Int32Array.from(pairs), edgeFlags: Uint8Array.from(flags), smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg }, ...(columns.length ? { columns } : {}) };
}

export function kernelFromMeshDoc(d: MeshDoc, where = "mesh"): MeshKernel {
  const m = new MeshKernel(), nV = Math.floor(d.positions.length / 3), cols = d.columns ?? [];
  for (const c of cols) m.addColumn({ guid: c.guid, arity: c.arity, kind: c.kind, ...(c.extra !== undefined ? { extra: c.extra } : {}) });
  for (let i = 0; i < nV; i++) m.addVertex({ x: d.positions[3 * i], y: d.positions[3 * i + 1], z: d.positions[3 * i + 2] });
  if (d.faceLen.length !== d.faceStart.length || d.faceMat.length !== d.faceStart.length || d.faceFlags.length !== d.faceStart.length) throw new Error(`${where}: face tables disagree on face count`);
  for (let f = 0; f < d.faceStart.length; f++) {
    const s = d.faceStart[f], n = d.faceLen[f];
    if (s < 0 || n < 3 || s + n > d.loopVert.length) throw new Error(`${where}: face ${f} loop out of range`);
    const ring = Array.from(d.loopVert.subarray(s, s + n));
    for (const v of ring) if (v < 0 || v >= nV) throw new Error(`${where}: face ${f} references vertex ${v} (have ${nV})`);
    let fid: number;
    let origin = FRESH;
    if (cols.length) {   // 读文件 = 凭空来的、直接给值（每一列整面有值才给）
      const values = new Map<string, Float32Array>();
      for (const c of cols) if (!Number.isNaN(c.values[c.arity * s])) values.set(c.guid, c.values.slice(c.arity * s, c.arity * (s + n)));
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
  m.setSmoothDefault(smoothDefaultOf(d));   // 缺了怎么办归读的门口（format/migrate/mesh.ts：老文件 = 全是棱、只看手标）
  return m;
}

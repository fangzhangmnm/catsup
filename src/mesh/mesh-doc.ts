// mesh/mesh-doc.ts —— mesh 内核 ↔ 文件载荷（format/document.ts MeshDoc = CATSUP_mesh 1.0.0 的多边形形）。created 2026-10-27 by Claude Fable 5.1
// 存：去空位、id 重编（user 10-27「catsup rule: organize in export/save」）；坐标 f64 逐字；只列带标记的边。读：坏环（< 3 个不同顶点 / 下标越界）= 文件坏了，抛人话、不静默丢。
// 列（施工单十八第 1½ 刀：对属性无感）：存 = 内核里角上的每一列原样（种类、每角几个数、不认识的键），值和 loopVert 同序；skip 里的名字不写（用的那一层另写：
//   format/scene-doc.ts 把画画那一层的两列交给 scene/uv.ts 走 uv 通道）。读 = 每一列建回来（连续的小数、缺省 0、取最前的）、值原样给。
//   面上的列：文件里没有通用的地方，skip 之外还有 = 抛（不悄悄丢）。
import type { CarriedJson, ColumnDoc, MeshDoc } from "../format/document.ts";
import { MeshKernel, type ColumnDef } from "./mesh-kernel.ts";
import { FRESH } from "./columns.ts";
import { smoothDefaultOf } from "../format/migrate/mesh.ts";

/** 内核 → 载荷：角上的每一列原样带上（没有列 = 不写 columns，和以前逐字节一样）；skip 里的 id 不写。 */
export function meshDocFromKernel(m: MeshKernel, skip: ReadonlySet<string> = new Set()): MeshDoc {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float64Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const faces = m.faces(), faceStart = new Int32Array(faces.length), faceLen = new Int32Array(faces.length), faceMat = new Int32Array(faces.length), faceFlags = new Uint8Array(faces.length);
  const loop: number[] = [];
  faces.forEach((f, i) => { const vs = m.faceVerts(f); faceStart[i] = loop.length; faceLen[i] = vs.length; faceMat[i] = m.faceMat[f]; faceFlags[i] = m.faceFlags[f]; for (const v of vs) loop.push(map.get(v)!); });
  const pairs: number[] = [], flags: number[] = [];
  for (const e of m.edges()) if (m.edgeFlags[e]) { pairs.push(map.get(m.edgeA[e])!, map.get(m.edgeB[e])!); flags.push(m.edgeFlags[e]); }
  const defs = m.columnDefs().filter((c) => !skip.has(c.id));
  const extraFace = defs.find((c) => c.on !== "corner");
  if (extraFace) throw new Error(`meshDocFromKernel: ${extraFace.on} column ${extraFace.id} has no place in the file`);
  const columns: ColumnDoc[] = defs.map((c) => {
    const arity = typeof c.type === "string" ? 1 : c.type.floats, values = new Float32Array(arity * loop.length);
    faces.forEach((f, i) => { values.set(m.cornerValues(f, c.id)!, arity * faceStart[i]); });
    return { guid: c.id, kind: c.kind ?? "", arity, values, ...(c.extra !== undefined ? { extra: c.extra as CarriedJson } : {}) };
  });
  return { positions, faceStart, faceLen, loopVert: Int32Array.from(loop), faceMat, faceFlags, edgePairs: Int32Array.from(pairs), edgeFlags: Uint8Array.from(flags), smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg }, ...(columns.length ? { columns } : {}) };
}

/** 文件里一列角上的数（不认识它的意思）在内核里的声明：连续的小数、缺省 0、并成取最前的（照基类的规矩走，内核不猜它是什么）。 */
const fileColumnDef = (c: ColumnDoc): ColumnDef => ({ id: c.guid, on: "corner", type: { floats: c.arity }, continuous: true, fill: 0, merge: "first", kind: c.kind, ...(c.extra !== undefined ? { extra: c.extra } : {}) });

export function kernelFromMeshDoc(d: MeshDoc, where = "mesh"): MeshKernel {
  const m = new MeshKernel(), nV = Math.floor(d.positions.length / 3), cols = d.columns ?? [];
  for (const c of cols) m.addColumn(fileColumnDef(c));
  for (let i = 0; i < nV; i++) m.addVertex({ x: d.positions[3 * i], y: d.positions[3 * i + 1], z: d.positions[3 * i + 2] });
  if (d.faceLen.length !== d.faceStart.length || d.faceMat.length !== d.faceStart.length || d.faceFlags.length !== d.faceStart.length) throw new Error(`${where}: face tables disagree on face count`);
  for (let f = 0; f < d.faceStart.length; f++) {
    const s = d.faceStart[f], n = d.faceLen[f];
    if (s < 0 || n < 3 || s + n > d.loopVert.length) throw new Error(`${where}: face ${f} loop out of range`);
    const ring = Array.from(d.loopVert.subarray(s, s + n));
    for (const v of ring) if (v < 0 || v >= nV) throw new Error(`${where}: face ${f} references vertex ${v} (have ${nV})`);
    let fid: number;
    let origin = FRESH;
    if (cols.length) origin = { kind: "fresh", corner: new Map(cols.map((c) => [c.guid, c.values.slice(c.arity * s, c.arity * (s + n))])) };   // 读文件 = 凭空来的、直接给值
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

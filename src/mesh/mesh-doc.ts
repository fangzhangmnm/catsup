// mesh/mesh-doc.ts —— mesh 内核 ↔ 文件载荷（format/document.ts MeshDoc = CATSUP_mesh 1.0.0 的多边形形）。created 2026-10-27 by Claude Fable 5.1
// 存：去空位、id 重编（user 10-27「catsup rule: organize in export/save」）；坐标 f64 逐字；只列带标记的边。读：坏环（< 3 个不同顶点 / 下标越界）= 文件坏了，抛人话、不静默丢。
// 列（施工单十八第 1½ 刀：对属性无感）：存 = 内核里角上的每一列原样（种类、每角几个数、不认识的键），值和 loopVert 同序；skip 里的名字不写（用的那一层另写：
//   format/scene-doc.ts 把画画那一层的两列交给 scene/uv.ts 走 uv 通道）。读 = 每一列建回来（连续的小数、缺省 0、取最前的）、值原样给。
//   面上的列：文件里没有通用的地方，skip 之外还有 = 抛（不悄悄丢）。
import type { CarriedJson, ColumnDoc, MeshDoc } from "../format/document.ts";
import { MeshKernel, type ColumnDef } from "./mesh-kernel.ts";
import { FRESH } from "./columns.ts";
import { EDGE_BYTE_KNOWN, faceHidden, faceMaterial, givenFaceValues, packEdgeByte, RESERVED_EDGE, RESERVED_FACE, unpackEdgeByte } from "./reserved-columns.ts";

/** 文件里面的那个字节（MeshDoc.faceFlags）：第 1 位 = 面上的隐藏（hide_poly）；别的位没有定义。属性地基轮 3b 起内存里是两列，文件的形状不变，门口来回换。 */
export const FILE_FACE_HIDDEN = 1;
/** 文件里那两个字节这一版认识的位：面 = 隐藏；边 = 五列 + 裸线（reserved-columns.ts EDGE_BYTE_BITS）。别的位 = 更新版写的、这一版不认识。 */
export const FILE_FACE_KNOWN = FILE_FACE_HIDDEN, FILE_EDGE_KNOWN = EDGE_BYTE_KNOWN;
/**
 * 读的门口（format/mesh-payload.ts decodeMeshItem，读文件只这一处调）：载荷里这一版不认识的位就地去掉，返回带着它们的面、边各几个。
 * 统筹 11-13（规程第九½节末）：不认识的位不拒开文件——不读、打开时说一句（notes.unknownMarks）、保存时不写（内存里没有它们）。
 * 真坏了（环越界、表长对不上）照旧抛，那是 kernelFromMeshDoc 的事。去掉之后一个位都不剩的边那一行 = 读的时候跳过（「这条边没有标记」）。
 */
export function dropUnknownMarks(d: MeshDoc): { faces: number; edges: number } {
  let faces = 0, edges = 0;
  for (let i = 0; i < d.faceFlags.length; i++) if (d.faceFlags[i] & ~FILE_FACE_KNOWN) { faces++; d.faceFlags[i] &= FILE_FACE_KNOWN; }
  for (let i = 0; i < d.edgeFlags.length; i++) if (d.edgeFlags[i] & ~FILE_EDGE_KNOWN) { edges++; d.edgeFlags[i] &= FILE_EDGE_KNOWN; }
  return { faces, edges };
}
/** 塞进那三条老形状（faceMat / faceFlags / edgeFlags）的保留名：不当通用的列写。 */
const RESERVED_IDS: ReadonlySet<string> = new Set([...RESERVED_FACE, ...RESERVED_EDGE].map((d) => d.id));
import { smoothDefaultOf } from "../format/migrate/mesh.ts";

/** 内核 → 载荷：角上的每一列原样带上（没有列 = 不写 columns，和以前逐字节一样）；skip 里的 id 不写。 */
export function meshDocFromKernel(m: MeshKernel, skip: ReadonlySet<string> = new Set()): MeshDoc {
  const alive = m.verts(), map = new Map<number, number>();
  const positions = new Float64Array(alive.length * 3);
  alive.forEach((v, i) => { map.set(v, i); positions[3 * i] = m.pos[3 * v]; positions[3 * i + 1] = m.pos[3 * v + 1]; positions[3 * i + 2] = m.pos[3 * v + 2]; });
  const faces = m.faces(), faceStart = new Int32Array(faces.length), faceLen = new Int32Array(faces.length), faceMat = new Int32Array(faces.length), faceFlags = new Uint8Array(faces.length);
  const loop: number[] = [];
  faces.forEach((f, i) => { const vs = m.faceVerts(f); faceStart[i] = loop.length; faceLen[i] = vs.length; faceMat[i] = faceMaterial(m, f); faceFlags[i] = faceHidden(m, f) ? FILE_FACE_HIDDEN : 0; for (const v of vs) loop.push(map.get(v)!); });
  const pairs: number[] = [], flags: number[] = [];
  for (const e of m.edges()) { const b = packEdgeByte(m, e); if (b) { pairs.push(map.get(m.edgeA[e])!, map.get(m.edgeB[e])!); flags.push(b); } }   // 边上的五列 + 裸线位打包回那个字节（3c；形状和以前一样）
  const defs = m.columnDefs().filter((c) => !skip.has(c.id) && !RESERVED_IDS.has(c.id));   // 面上的两个保留名在上面塞进了 faceMat / faceFlags，边上的五个塞进了 edgeFlags
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
    if (d.faceFlags[f] & ~FILE_FACE_KNOWN) throw new Error(`${where}: face ${f} has face flag bits ${d.faceFlags[f]} this version does not understand (the read door drops them first)`);   // 读文件时门口已经去掉、记了一笔；到这里还有 = 没走门口，是程序的毛病
    const face = givenFaceValues(m, { material: d.faceMat[f], hidden: (d.faceFlags[f] & FILE_FACE_HIDDEN) !== 0 });   // 第一次碰到非缺省值才建那一列
    const corner = cols.length ? new Map(cols.map((c) => [c.guid, c.values.slice(c.arity * s, c.arity * (s + n))])) : null;
    const origin = corner || face.size ? { kind: "fresh" as const, ...(corner ? { corner } : {}), ...(face.size ? { face } : {}) } : FRESH;   // 读文件 = 凭空来的、直接给值
    try { m.addFace(ring, origin); } catch (e) { throw new Error(`${where}: face ${f} invalid (${e instanceof Error ? e.message : String(e)})`); }
  }
  if (d.edgeFlags.length * 2 !== d.edgePairs.length) throw new Error(`${where}: edgePairs / edgeFlags disagree`);
  for (let i = 0; i < d.edgeFlags.length; i++) {
    const a = d.edgePairs[2 * i], b = d.edgePairs[2 * i + 1];
    if (a < 0 || b < 0 || a >= nV || b >= nV || a === b) throw new Error(`${where}: flagged edge ${i} invalid`);
    if (!d.edgeFlags[i]) continue;   // 没有标记的一行（门口去掉不认识的位以后剩下的）= 没有要读的
    unpackEdgeByte(m, m.ensureEdge(a, b), d.edgeFlags[i]);   // 字节拆回五列（第一次有值才建列）+ 裸线位；不属于任何面的 = 裸线（F_WIRE 由字节自己带）
  }
  m.setSmoothDefault(smoothDefaultOf(d));   // 缺了怎么办归读的门口（format/migrate/mesh.ts：老文件 = 全是棱、只看手标）
  return m;
}

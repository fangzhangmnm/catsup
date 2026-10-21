// brep-codec.ts —— 内核 BrepSnapshot ↔ `CATSUP_brep` 扩展（JSON + bufferView 二进制流）。
// 契约 = ai-docs/20260919-persistence-data-contract.md §5.2（rev9）：全二进制、最低位宽、规范序、存平面（定点）、
// 面 = 顶点索引环、按域命名属性层。零 DOM / 零 three。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21）：group 搬到 definition 层（v1 占位 `groups` 退场）；第一个真属性层 attributes.edge.soft（软边：每边 1 字节 0/1，
// 全无则不写）——其余未知属性层仍原样保留。

import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { PlaneParams, Pt3 } from "../kernel/geom.ts";
import { type UintType, decodeUints, encodeUints, isUintType, pickUintType } from "./binary.ts";

export const BREP_VERSION = 3;
const NO_MATERIAL = 0xffff;
const UM = 1e-6;                       // 内核格点 Q（立宪 §0）；文件坐标单位是它的 10^k 倍
const N_FIX = 2 ** 30;                 // 平面法向定点比例
const UNIT_LADDER_UM = [10000, 1000, 100, 10, 1];   // 1 cm … 1 µm

/** 写入器要的 bufferView 登记口（write.ts 提供；index = glTF bufferViews 索引）。 */
export interface ViewSink { add(bytes: Uint8Array): number; }
/** 读取器给的 bufferView 取用口。 */
export type ViewSource = (index: number) => Uint8Array;

export interface BrepStream { readonly bufferView: number; readonly componentType?: UintType; readonly indexType?: UintType; }
export interface CatsupBrepJson {
  version: number;
  coplanarTol: number;
  unit: number;                          // 米 / 整数单位
  origin: readonly [number, number, number];   // 整数微米（包围盒角）
  vertexCount: number; vertices: BrepStream;
  edgeCount: number; edges: BrepStream;
  planeCount: number; planes: BrepStream;
  faceCount: number; faces: BrepStream; facePlane: BrepStream;
  attributes: Record<string, Record<string, unknown>>;   // 按域：edge / face / corner / vertex；edge.soft 本版读写，其余原样保留
  curves: unknown[];
  extras?: Record<string, unknown>;
  [k: string]: unknown;                  // 未知键保留（round-trip 保真）
}

const toUm = (x: number): number => Math.round(x / UM);

/** 规范序：顶点按整数 (z,y,x)、边按 (min,max)、环旋到最小顶点起、面按 (平面, 外环)。同一几何 → 同一字节。 */
export function canonicalize(snap: BrepSnapshot): BrepSnapshot {
  const vum = snap.vertices.map((p) => [toUm(p.x), toUm(p.y), toUm(p.z)] as const);
  const order = vum.map((_, i) => i).sort((a, b) => vum[a][2] - vum[b][2] || vum[a][1] - vum[b][1] || vum[a][0] - vum[b][0]);
  const remap = new Array<number>(order.length);
  order.forEach((old, i) => { remap[old] = i; });
  const vertices = order.map((i) => snap.vertices[i]);
  const edgesTagged = snap.edges.map(([a, b], i) => { const x = remap[a], y = remap[b]; return { e: (x < y ? [x, y] : [y, x]) as readonly [number, number], soft: snap.softEdges?.includes(i) ?? false, curve: snap.curveEdges?.includes(i) ?? false }; })
    .sort((p, q) => p.e[0] - q.e[0] || p.e[1] - q.e[1]);
  const edges = edgesTagged.map((t) => t.e);
  const softEdges = edgesTagged.map((t, i) => (t.soft ? i : -1)).filter((i) => i >= 0);
  const curveEdges = edgesTagged.map((t, i) => (t.curve ? i : -1)).filter((i) => i >= 0);
  const planeKey = (pl: PlaneParams): number[] => [Math.round(pl.n.x * N_FIX), Math.round(pl.n.y * N_FIX), Math.round(pl.n.z * N_FIX), toUm(pl.d)];
  const pkeys = snap.planes.map(planeKey);
  const porder = pkeys.map((_, i) => i).sort((a, b) => { for (let k = 0; k < 4; k++) if (pkeys[a][k] !== pkeys[b][k]) return pkeys[a][k] - pkeys[b][k]; return 0; });
  const premap = new Array<number>(porder.length);
  porder.forEach((old, i) => { premap[old] = i; });
  const planes = porder.map((i) => snap.planes[i]);
  const rotate = (ring: readonly number[]): number[] => {
    const r = ring.map((v) => remap[v]);
    let m = 0;
    for (let i = 1; i < r.length; i++) if (r[i] < r[m]) m = i;
    return [...r.slice(m), ...r.slice(0, m)];
  };
  const cmpArr = (a: readonly number[], b: readonly number[]): number => {
    for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) return a[i] - b[i];
    return a.length - b.length;
  };
  const facesTagged = snap.faces.map((f, i) => ({ f: { plane: premap[f.plane], outer: rotate(f.outer), holes: f.holes.map(rotate).sort(cmpArr) }, mat: snap.faceMaterial?.[i] ?? -1 }))
    .sort((a, b) => a.f.plane - b.f.plane || cmpArr(a.f.outer, b.f.outer));
  const faces = facesTagged.map((t) => t.f);
  const faceMaterial = facesTagged.map((t) => t.mat);
  return { coplanarTol: snap.coplanarTol, vertices, edges, planes, faces, ...(softEdges.length ? { softEdges } : {}), ...(curveEdges.length ? { curveEdges } : {}), ...(faceMaterial.some((m) => m >= 0) ? { faceMaterial } : {}) };
}

function pickUnitUm(vum: readonly (readonly [number, number, number])[]): number {
  for (const u of UNIT_LADDER_UM) {
    if (vum.every((v) => v[0] % u === 0 && v[1] % u === 0 && v[2] % u === 0)) return u;
  }
  return 1;
}

/** 编码（先规范化）。返回的 JSON 里 bufferView 索引由 sink 分配。 */
export function encodeBrep(snapIn: BrepSnapshot, sink: ViewSink, keep?: Partial<Pick<CatsupBrepJson, "attributes" | "curves" | "extras">>): CatsupBrepJson {
  const snap = canonicalize(snapIn);
  const vum = snap.vertices.map((p) => [toUm(p.x), toUm(p.y), toUm(p.z)] as const);
  const origin: [number, number, number] = vum.length
    ? [Math.min(...vum.map((v) => v[0])), Math.min(...vum.map((v) => v[1])), Math.min(...vum.map((v) => v[2]))]
    : [0, 0, 0];
  const unitUm = pickUnitUm(vum.map((v) => [v[0] - origin[0], v[1] - origin[1], v[2] - origin[2]] as const));
  const rel = vum.flatMap((v) => [(v[0] - origin[0]) / unitUm, (v[1] - origin[1]) / unitUm, (v[2] - origin[2]) / unitUm]);
  const vType = pickUintType(rel.length ? Math.max(...rel) : 0);
  const vIdxType = pickUintType(Math.max(0, snap.vertices.length - 1));
  const pIdxType = pickUintType(Math.max(0, snap.planes.length - 1));

  const vertices = sink.add(encodeUints(rel, vType));
  const edges = sink.add(encodeUints(snap.edges.flatMap((e) => [e[0], e[1]]), vIdxType));
  const pb = new Uint8Array(snap.planes.length * 20);
  const pdv = new DataView(pb.buffer);
  snap.planes.forEach((pl, i) => {
    pdv.setInt32(i * 20, Math.round(pl.n.x * N_FIX), true);
    pdv.setInt32(i * 20 + 4, Math.round(pl.n.y * N_FIX), true);
    pdv.setInt32(i * 20 + 8, Math.round(pl.n.z * N_FIX), true);
    pdv.setBigInt64(i * 20 + 12, BigInt(toUm(pl.d)), true);
  });
  const planes = sink.add(pb);
  const ringStream: number[] = [];
  for (const f of snap.faces) {
    ringStream.push(1 + f.holes.length);
    for (const r of [f.outer, ...f.holes]) { ringStream.push(r.length); ringStream.push(...r); }
  }
  const fStreamType = pickUintType(Math.max(vIdxType === "uint8" ? 255 : 0, ...ringStream, 0));
  const faces = sink.add(encodeUints(ringStream, fStreamType));
  const facePlane = sink.add(encodeUints(snap.faces.map((f) => f.plane), pIdxType));
  // 属性层：未知层原样保留；edge.soft 由本版生成（覆盖旧值）
  const attributes: Record<string, Record<string, unknown>> = { vertex: {}, edge: {}, face: {}, corner: {}, ...(keep?.attributes ?? {}) };
  attributes.edge = { ...(attributes.edge ?? {}) };
  delete attributes.edge.soft;
  if (snap.softEdges?.length) {
    const bytes = new Uint8Array(snap.edges.length);
    for (const i of snap.softEdges) bytes[i] = 1;
    attributes.edge.soft = { bufferView: sink.add(bytes), componentType: "uint8" };
  }
  delete attributes.edge.curve;
  if (snap.curveEdges?.length) {
    const bytes = new Uint8Array(snap.edges.length);
    for (const i of snap.curveEdges) bytes[i] = 1;
    attributes.edge.curve = { bufferView: sink.add(bytes), componentType: "uint8" };
  }
  attributes.face = { ...(attributes.face ?? {}) };
  delete attributes.face.material;
  if (snap.faceMaterial?.some((m) => m >= 0)) {
    // 契约 §5.2：u16x2 = [+n 侧槽, −n 侧槽]，0xFFFF = 无；本版两侧同值（哪一侧 = 总账 B17）
    const u = new Uint16Array(snap.faces.length * 2);
    snap.faceMaterial.forEach((m, i) => { const v = m >= 0 ? m : NO_MATERIAL; u[i * 2] = v; u[i * 2 + 1] = v; });
    attributes.face.material = { bufferView: sink.add(new Uint8Array(u.buffer)), componentType: "uint16", type: "u16x2" };
  }

  return {
    version: BREP_VERSION,
    coplanarTol: snap.coplanarTol,
    unit: unitUm * UM,
    origin,
    vertexCount: snap.vertices.length, vertices: { bufferView: vertices, componentType: vType },
    edgeCount: snap.edges.length, edges: { bufferView: edges, indexType: vIdxType },
    planeCount: snap.planes.length, planes: { bufferView: planes },
    faceCount: snap.faces.length, faces: { bufferView: faces, indexType: fStreamType }, facePlane: { bufferView: facePlane, indexType: pIdxType },
    attributes,
    curves: keep?.curves ?? [],
    ...(keep?.extras ? { extras: keep.extras } : {}),
  };
}

const fail = (msg: string): never => { throw new Error(`CATSUP_brep: ${msg}`); };

function stream(j: unknown, what: string): BrepStream {
  const s = j as Partial<BrepStream> | undefined;
  if (!s || typeof s.bufferView !== "number") fail(`${what}: missing bufferView`);
  if (s!.componentType !== undefined && !isUintType(s!.componentType)) fail(`${what}: bad componentType`);
  if (s!.indexType !== undefined && !isUintType(s!.indexType)) fail(`${what}: bad indexType`);
  return s as BrepStream;
}

/** 解码成内核快照（不校验拓扑——那是 Kernel.fromBrep 的活；这里只校验流的形状与范围）。 */
export function decodeBrep(json: CatsupBrepJson, view: ViewSource): BrepSnapshot {
  if (json.version !== BREP_VERSION) fail(`version ${json.version} is not ${BREP_VERSION} (migrate first)`);
  const unitUm = Math.round(json.unit / UM);
  if (!UNIT_LADDER_UM.includes(unitUm)) fail(`unit ${json.unit} not on the ladder`);
  const origin = json.origin;
  if (!Array.isArray(origin) || origin.length !== 3) fail("origin must be [x,y,z]");
  const vs = stream(json.vertices, "vertices");
  const rel = decodeUints(view(vs.bufferView), vs.componentType ?? "uint32", json.vertexCount * 3);
  const vertices: Pt3[] = [];
  for (let i = 0; i < json.vertexCount; i++) {
    vertices.push({ x: (origin[0] + rel[i * 3] * unitUm) * UM, y: (origin[1] + rel[i * 3 + 1] * unitUm) * UM, z: (origin[2] + rel[i * 3 + 2] * unitUm) * UM });
  }
  const es = stream(json.edges, "edges");
  const eflat = decodeUints(view(es.bufferView), es.indexType ?? "uint32", json.edgeCount * 2);
  const edges: [number, number][] = [];
  for (let i = 0; i < json.edgeCount; i++) {
    const a = eflat[i * 2], b = eflat[i * 2 + 1];
    if (a >= json.vertexCount || b >= json.vertexCount) fail(`edge ${i} index out of range`);
    edges.push([a, b]);
  }
  const ps = stream(json.planes, "planes");
  const pb = view(ps.bufferView);
  if (pb.byteLength < json.planeCount * 20) fail("planes stream too short");
  const pdv = new DataView(pb.buffer, pb.byteOffset, pb.byteLength);
  const planes: PlaneParams[] = [];
  for (let i = 0; i < json.planeCount; i++) {
    const n = { x: pdv.getInt32(i * 20, true) / N_FIX, y: pdv.getInt32(i * 20 + 4, true) / N_FIX, z: pdv.getInt32(i * 20 + 8, true) / N_FIX };
    const d64 = pdv.getBigInt64(i * 20 + 12, true);
    if (d64 > BigInt(Number.MAX_SAFE_INTEGER) || d64 < -BigInt(Number.MAX_SAFE_INTEGER)) fail(`plane ${i} d exceeds 2^53 µm`);
    planes.push({ n, d: Number(d64) * UM });
  }
  const fs = stream(json.faces, "faces");
  const fpl = stream(json.facePlane, "facePlane");
  const fbytes = view(fs.bufferView);
  const fType = fs.indexType ?? "uint32";
  const width = fType === "uint8" ? 1 : fType === "uint16" ? 2 : fType === "uint32" ? 4 : 8;
  const fstream = decodeUints(fbytes, fType, Math.floor(fbytes.byteLength / width));
  const facePlane = decodeUints(view(fpl.bufferView), fpl.indexType ?? "uint32", json.faceCount);
  const faces: { plane: number; outer: number[]; holes: number[][] }[] = [];
  let p = 0;
  for (let i = 0; i < json.faceCount; i++) {
    if (p >= fstream.length) fail(`faces stream truncated at face ${i}`);
    const nRings = fstream[p++];
    if (nRings < 1) fail(`face ${i} has no rings`);
    const rings: number[][] = [];
    for (let r = 0; r < nRings; r++) {
      const len = fstream[p++];
      if (p + len > fstream.length) fail(`faces stream truncated in face ${i}`);
      const ring = fstream.slice(p, p + len);
      p += len;
      for (const v of ring) if (v >= json.vertexCount) fail(`face ${i} vertex index out of range`);
      rings.push(ring);
    }
    if (facePlane[i] >= json.planeCount) fail(`face ${i} plane index out of range`);
    faces.push({ plane: facePlane[i], outer: rings[0], holes: rings.slice(1) });
  }
  // 软边层（可选）
  let softEdges: number[] | undefined;
  const softJ = json.attributes?.edge?.soft as { bufferView?: number } | undefined;
  if (softJ && typeof softJ.bufferView === "number") {
    const bytes = view(softJ.bufferView);
    if (bytes.byteLength < json.edgeCount) fail("attributes.edge.soft stream too short");
    softEdges = [];
    for (let i = 0; i < json.edgeCount; i++) if (bytes[i]) softEdges.push(i);
  }
  let curveEdges: number[] | undefined;
  const curveJ = json.attributes?.edge?.curve as { bufferView?: number } | undefined;
  if (curveJ && typeof curveJ.bufferView === "number") {
    const bytes = view(curveJ.bufferView);
    if (bytes.byteLength < json.edgeCount) fail("attributes.edge.curve stream too short");
    curveEdges = [];
    for (let i = 0; i < json.edgeCount; i++) if (bytes[i]) curveEdges.push(i);
  }
  // 面材质层（可选；u16x2，取 +n 侧；0xFFFF = 无）
  let faceMaterial: number[] | undefined;
  const matJ = json.attributes?.face?.material as { bufferView?: number } | undefined;
  if (matJ && typeof matJ.bufferView === "number") {
    const bytes = view(matJ.bufferView);
    if (bytes.byteLength < json.faceCount * 4) fail("attributes.face.material stream too short");
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    faceMaterial = [];
    for (let i = 0; i < json.faceCount; i++) { const v = dv.getUint16(i * 4, true); faceMaterial.push(v === NO_MATERIAL ? -1 : v); }
  }
  return { coplanarTol: json.coplanarTol, vertices, edges, planes, faces, ...(softEdges?.length ? { softEdges } : {}), ...(curveEdges?.length ? { curveEdges } : {}), ...(faceMaterial?.some((m) => m >= 0) ? { faceMaterial } : {}) };
}

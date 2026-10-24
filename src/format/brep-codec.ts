// brep-codec.ts —— 内核 BrepSnapshot ↔ `CATSUP_brep` 扩展（JSON + bufferView 二进制流）。
// 契约 = ai-docs/20260919-persistence-data-contract.md §5.2（rev9）：全二进制、最低位宽、规范序、存平面（定点）、
// 面 = 顶点索引环、按域命名属性层。零 DOM / 零 three。created 2026-09-20 by Claude Fable 5.1
// v2（2026-10-21）：group 搬到 definition 层（v1 占位 `groups` 退场）；第一个真属性层 attributes.edge.soft（软边：每边 1 字节 0/1，
// 全无则不写）——其余未知属性层仍原样保留。

import type { CurveParams } from "../kernel/curves.ts";
import type { BrepSnapshot } from "../kernel/kernel.ts";
import type { PlaneParams, Pt3 } from "../kernel/geom.ts";
import { type UintType, decodeUints, encodeUints, isUintType, pickUintType } from "./binary.ts";

export const BREP_VERSION = 4;   // v4（2026-10-24 曲线与曲面纪元）：curves[] 本版读写（契约 §5）
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
  /** 曲线（v4 起本版读写）：{ edges:[边下标…有序链], kind, closed, params?:{ center:[µm×3], radius:µm, normal:[2^-30×3], xaxis:[2^-30×3], segments } } */
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
  const edgesTagged = snap.edges.map(([a, b], i) => { const x = remap[a], y = remap[b]; return { e: (x < y ? [x, y] : [y, x]) as readonly [number, number], i }; })
    .sort((p, q) => p.e[0] - q.e[0] || p.e[1] - q.e[1]);
  const edges = edgesTagged.map((t) => t.e);
  const edgeLayers: Record<string, number[]> = {};
  for (const [n, idx] of Object.entries(snap.edgeLayers ?? {})) { const set = new Set(idx); const out = edgesTagged.map((t, j) => (set.has(t.i) ? j : -1)).filter((j) => j >= 0); if (out.length) edgeLayers[n] = out; }
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
  const facesTagged = snap.faces.map((f, i) => ({ f: { plane: premap[f.plane], outer: rotate(f.outer), holes: f.holes.map(rotate).sort(cmpArr) }, i }))
    .sort((a, b) => a.f.plane - b.f.plane || cmpArr(a.f.outer, b.f.outer));
  const faces = facesTagged.map((t) => t.f);
  const faceLayers: Record<string, number[]> = {};
  for (const [n, vals] of Object.entries(snap.faceLayers ?? {})) { const out = facesTagged.map((t) => vals[t.i] ?? -1); if (out.some((v) => v >= 0)) faceLayers[n] = out; }
  const eremap = new Array<number>(edgesTagged.length);
  edgesTagged.forEach((t, j) => { eremap[t.i] = j; });
  const curves = (snap.curves ?? []).map((c) => ({ ...c, edges: c.edges.map((i) => eremap[i]) }));   // 链的顺序不动，只换下标
  return { coplanarTol: snap.coplanarTol, vertices, edges, planes, faces, ...(Object.keys(edgeLayers).length ? { edgeLayers } : {}), ...(Object.keys(faceLayers).length ? { faceLayers } : {}), ...(curves.length ? { curves } : {}) };
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
  // 边层：每层一条 u8 流（每边 0/1）；本版写的层覆盖同名旧层，未知层原样保留
  attributes.edge = { ...(attributes.edge ?? {}) };
  for (const [n, idx] of Object.entries(snap.edgeLayers ?? {})) {
    const bytes = new Uint8Array(snap.edges.length);
    for (const i of idx) bytes[i] = 1;
    attributes.edge[n] = { bufferView: sink.add(bytes), componentType: "uint8", type: "u8" };
  }
  // 面层：material = 契约 §5.2 的 u16x2（[+n 侧槽, −n 侧槽]，0xFFFF = 无；本版两侧同值——哪一侧 = 总账 B17）；其余层 u16（0xFFFF = 无）
  attributes.face = { ...(attributes.face ?? {}) };
  for (const [n, vals] of Object.entries(snap.faceLayers ?? {})) {
    const two = n === "material";
    const u = new Uint16Array(snap.faces.length * (two ? 2 : 1));
    vals.forEach((m, i) => { const v = m >= 0 ? m : NO_MATERIAL; if (two) { u[i * 2] = v; u[i * 2 + 1] = v; } else u[i] = v; });
    attributes.face[n] = { bufferView: sink.add(new Uint8Array(u.buffer)), componentType: "uint16", type: two ? "u16x2" : "u16" };
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
    // 曲线（v4）：本版生成，覆盖旧值（未知的 keep.curves 不再原样带回——它们在 v3 文件里一直是空表）
    curves: (snap.curves ?? []).map((c) => ({
      edges: [...c.edges], kind: c.kind, closed: c.closed,
      ...(c.params ? { params: {
        center: [toUm(c.params.center.x), toUm(c.params.center.y), toUm(c.params.center.z)],
        radius: toUm(c.params.radius),
        normal: [Math.round(c.params.normal.x * N_FIX), Math.round(c.params.normal.y * N_FIX), Math.round(c.params.normal.z * N_FIX)],
        xaxis: [Math.round(c.params.xaxis.x * N_FIX), Math.round(c.params.xaxis.y * N_FIX), Math.round(c.params.xaxis.z * N_FIX)],
        segments: Math.round(c.params.segments),
      } } : {}),
    })),
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
  // 属性层：边层 = u8 每边一字节（u8 流）；面层 = u16 / u16x2（取 +n 侧），0xFFFF = 无。其它编码的层留在 attributes 原样携带
  const edgeLayers: Record<string, number[]> = {};
  for (const [n, j] of Object.entries(json.attributes?.edge ?? {})) {
    const st = j as { bufferView?: number; componentType?: string; type?: string } | undefined;
    if (!st || typeof st.bufferView !== "number" || (st.componentType ?? "uint8") !== "uint8") continue;
    const bytes = view(st.bufferView);
    if (bytes.byteLength < json.edgeCount) fail(`attributes.edge.${n} stream too short`);
    const idx: number[] = [];
    for (let i = 0; i < json.edgeCount; i++) if (bytes[i]) idx.push(i);
    if (idx.length) edgeLayers[n] = idx;
  }
  const faceLayers: Record<string, number[]> = {};
  for (const [n, j] of Object.entries(json.attributes?.face ?? {})) {
    const st = j as { bufferView?: number; componentType?: string; type?: string } | undefined;
    if (!st || typeof st.bufferView !== "number" || st.componentType !== "uint16") continue;
    const two = st.type === "u16x2";
    const bytes = view(st.bufferView);
    if (bytes.byteLength < json.faceCount * (two ? 4 : 2)) fail(`attributes.face.${n} stream too short`);
    const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const vals: number[] = [];
    for (let i = 0; i < json.faceCount; i++) { const v = dv.getUint16(i * (two ? 4 : 2), true); vals.push(v === NO_MATERIAL ? -1 : v); }
    if (vals.some((v) => v >= 0)) faceLayers[n] = vals;
  }
  // 曲线（v4）：形状校验在这里（下标范围 / 字段类型），链连通性归 Kernel.fromBrep（CurveRegistry.fromIndex）。未知 kind → polyline（身份留着，参数丢）
  const curves: NonNullable<BrepSnapshot["curves"]>[number][] = [];
  if (Array.isArray(json.curves)) {
    json.curves.forEach((raw, i) => {
      const c = raw as { edges?: unknown; kind?: unknown; closed?: unknown; params?: { center?: unknown; radius?: unknown; normal?: unknown; xaxis?: unknown; segments?: unknown } } | null;
      if (!c || !Array.isArray(c.edges)) fail(`curves[${i}]: missing edges`);
      const edges = (c!.edges as unknown[]).map((e) => { if (typeof e !== "number" || !Number.isInteger(e) || e < 0 || e >= json.edgeCount) fail(`curves[${i}]: edge index out of range`); return e as number; });
      const kind = c!.kind === "circle" || c!.kind === "arc" ? c!.kind : "polyline";
      const closed = c!.closed === true;
      let params: CurveParams | undefined;
      const p = c!.params;
      const v3 = (x: unknown): [number, number, number] | null => (Array.isArray(x) && x.length === 3 && x.every((n) => typeof n === "number") ? (x as [number, number, number]) : null);
      if (p && typeof p === "object") {
        const center = v3(p.center), normal = v3(p.normal), xaxis = v3(p.xaxis);
        if (!center || !normal || !xaxis || typeof p.radius !== "number") fail(`curves[${i}]: bad params`);
        const nrm = { x: normal![0] / N_FIX, y: normal![1] / N_FIX, z: normal![2] / N_FIX }, xa = { x: xaxis![0] / N_FIX, y: xaxis![1] / N_FIX, z: xaxis![2] / N_FIX };
        const ln = Math.hypot(nrm.x, nrm.y, nrm.z) || 1, lx = Math.hypot(xa.x, xa.y, xa.z) || 1;
        params = { center: { x: center![0] * UM, y: center![1] * UM, z: center![2] * UM }, radius: (p.radius as number) * UM, normal: { x: nrm.x / ln, y: nrm.y / ln, z: nrm.z / ln }, xaxis: { x: xa.x / lx, y: xa.y / lx, z: xa.z / lx }, segments: typeof p.segments === "number" ? Math.round(p.segments) : 24 };
      }
      curves.push({ edges, kind, closed, ...(params ? { params } : {}) });
    });
  }
  return { coplanarTol: json.coplanarTol, vertices, edges, planes, faces, ...(Object.keys(edgeLayers).length ? { edgeLayers } : {}), ...(Object.keys(faceLayers).length ? { faceLayers } : {}), ...(curves.length ? { curves } : {}) };
}

// mesh-payload.ts —— CATSUP_definitions 里 kind:"mesh" 定义的载荷 = CATSUP_mesh 子结构（自己的拍子 1.0.0；家族格式纪律：major 新拒开 / minor 新提示一次 / patch 静默；未知键直通归 carry）。
// 多边形是真相：positions（f64 xyz，定义坐标 Z-up）/ faceStart / faceLen / loopVert（i32；顶点下标空间 = positions）/ faceMat（i32，−1 = 默认槽）/ faceFlags（u8，bit0 隐藏）/
// edgePairs（i32 成对）+ edgeFlags（u8：软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16 / 手标硬 32（1.1）；只列带标记的边）。三角形不存（bake 的派生物，给别的查看器看）。
// 1.1（2026-10-28 Claude Opus 5.5，FM129）：smoothDefault { mode: angle | smooth | hard, deg }（JSON 键，可选）= 网格体的默认平滑（没手标的边算棱还是光滑过渡；几何属性）；缺 = hard（老文件语义：只看手标）。老读者看到 1.1 = 提示一次、照开（默认平滑丢了 = 全按手标，手标硬的位不认）。
// 1.2（2026-10-28 晚 Claude Fable 5.1，镜像重做第二刀；FM134「按网格体记、还没存进文件」收口）：mirror { mode: edit | force, axis: 0 | 1 | 2 }（JSON 键，可选）= 网格体的「对称」属性（UX 心智模型 §2.1：物体窗口里的字段）；缺 = 关。
//   老读者看到 1.2 = 提示一次、照开（对称设置丢了 = 关着）。
// 3.0（2026-11-13 Claude Opus 5.5，施工单十八 3.2）：columns[ { guid, kind, arity, data: { bufferView, count }, …别的键 } ] = 角上的列（count = 角数）。
//   kind = uv（贴图坐标）：arity 必须 2、GUID = 顶层排法表 CATSUP_uvsets 里那一行的号、data = 每角两个 32 位有符号整数（小端、和 loopVert 同序），单位 1/1024 格，
//   没有值 = 两个 −2147483648。别的 kind（这一版一种都不造）：GUID 是这一列自己的号、data = 每角 arity 个 32 位浮点、NaN = 没有值；当普通的一列带着走完每一步建模、
//   kind 和别的键原样写回。只有带列的网格体盖 3.0；不带的照旧盖 1.2，字节和以前一样。
//   以前的 uvSets 键（2.x）现行格式里没有：读的门口不带回、记一笔（notes.oldUvColumns），没有「2.x 按老的算」。
//   两条规矩：① 以后跟着角走的数据一律做成新的一列，不许塞进列的行里当别的键（旧版本改了网格它就过时了）；② 换编码、或者哪个种类受不了线性继承 = 大版本。
// 没有 faceStart 键 = 0.14 的三角汤最小形（migrate/mesh.ts 读成每三角一面）。created 2026-10-27 by Claude Fable 5.1
import type { ColumnDoc, MeshDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
import { MESH_STAMP_NO_UV, migrateExtension, stampOf, type FormatReadNotes, type Stamp, type UvDropWhy } from "./migrate/index.ts";
import { carryJson, landCarried } from "./texture-table.ts";
import { UV_Q } from "../mesh/corner-columns.ts";

/** uv 列里「这个角没有值」的整数（施工单十八 3.2）。 */
export const UV_NONE = -2147483648;
import { isGuid } from "./guid.ts";
import { polygonsFromTriangles } from "./migrate/mesh.ts";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

/** 一列写进文件的字节：uv = 每个数 × 1024 的 32 位整数（值本来就是 1/1024 格的整数倍；没有值 = UV_NONE）；别的种类 = 32 位浮点原样。 */
function columnBytes(c: ColumnDoc): Int32Array | Float32Array {
  if (c.kind !== "uv") return c.values;
  const out = new Int32Array(c.values.length);
  for (let i = 0; i < out.length; i++) { const v = c.values[i]; out[i] = Number.isNaN(v) ? UV_NONE : Math.round(v * UV_Q); }
  return out;
}

export function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown> {
  const bv = (a: ArrayBufferView, count: number): { bufferView: number; count: number } => ({ bufferView: sink.add(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)), count });
  const cols = m.columns ?? [];
  const st = (x: Stamp): Record<string, number> => ({ version: x.major, ...(x.minor ? { minor: x.minor } : {}), ...(x.patch ? { patch: x.patch } : {}) });
  const stamp = cols.length ? stampOf("CATSUP_mesh") : st(MESH_STAMP_NO_UV);   // 没有列 = 照旧 1.2（逐字节）；有列 = 3.0
  return {
    ...stamp,
    positions: bv(m.positions, m.positions.length / 3),
    faceStart: bv(m.faceStart, m.faceStart.length), faceLen: bv(m.faceLen, m.faceLen.length), loopVert: bv(m.loopVert, m.loopVert.length),
    faceMat: bv(m.faceMat, m.faceMat.length), faceFlags: bv(m.faceFlags, m.faceFlags.length),
    edgePairs: bv(m.edgePairs, m.edgePairs.length / 2), edgeFlags: bv(m.edgeFlags, m.edgeFlags.length),
    ...(m.smoothDefault ? { smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg } } : {}),
    ...(m.mirror ? { mirror: { mode: m.mirror.mode, axis: m.mirror.axis } } : {}),
    ...(cols.length ? { columns: cols.map((c) => ({ ...(c.extra ? (landCarried(c.extra, sink) as Record<string, unknown>) : {}), guid: c.guid, kind: c.kind, arity: c.arity, data: bv(columnBytes(c), c.values.length / c.arity) })) } : {}),
  };
}

/** @param sliceOf bufferView 下标 → 独立的 ArrayBuffer（偏移 0，所以 f64 / i32 视图不受 BIN 对齐限制） */
export function decodeMeshItem(raw: Record<string, unknown>, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, where: string, fail: (msg: string) => never, owner?: { readonly guid: string; readonly name: string }): MeshDoc {
  const mj = migrateExtension("CATSUP_mesh", raw, notes);   // major 比本版新 → FormatTooNewError（拒开）；minor 新 → notes.newerMinor
  const bvOf = (k: string): number | null => { const o = mj[k]; return isObj(o) && typeof o.bufferView === "number" ? o.bufferView : null; };
  const need = (k: string): number => { const b = bvOf(k); if (b === null) fail(`${where} mesh ${k} missing`); return b as number; };
  if (bvOf("faceStart") === null) {
    // 0.14 三角汤最小形（没拍子、没多边形）
    const pb = need("positions"), ib = need("indices"), tm = bvOf("triMaterial");
    const { doc, skipped } = polygonsFromTriangles(new Float32Array(sliceOf(pb)), new Uint32Array(sliceOf(ib)), tm !== null ? new Uint16Array(sliceOf(tm)) : undefined);
    if (skipped) console.warn(`${where}: ${skipped} degenerate triangles dropped while reading the 0.14 triangle-soup mesh payload`);
    return doc;
  }
  const d: MeshDoc = {
    positions: new Float64Array(sliceOf(need("positions"))),
    faceStart: new Int32Array(sliceOf(need("faceStart"))), faceLen: new Int32Array(sliceOf(need("faceLen"))), loopVert: new Int32Array(sliceOf(need("loopVert"))),
    faceMat: new Int32Array(sliceOf(need("faceMat"))), faceFlags: new Uint8Array(sliceOf(need("faceFlags"))),
    edgePairs: new Int32Array(sliceOf(need("edgePairs"))), edgeFlags: new Uint8Array(sliceOf(need("edgeFlags"))),
  };
  const sh = mj.smoothDefault;
  if (isObj(sh) && (sh.mode === "angle" || sh.mode === "smooth" || sh.mode === "hard") && typeof sh.deg === "number" && Number.isFinite(sh.deg)) d.smoothDefault = { mode: sh.mode, deg: sh.deg };
  const mr = mj.mirror;
  if (isObj(mr) && (mr.mode === "edit" || mr.mode === "force") && (mr.axis === 0 || mr.axis === 1 || mr.axis === 2)) d.mirror = { mode: mr.mode, axis: mr.axis };   // 认不出的值 = 当没有（关），不拒开
  const nF = d.faceStart.length;
  if (d.positions.length % 3 !== 0) fail(`${where} mesh positions length ${d.positions.length} is not a multiple of 3`);
  if (d.faceLen.length !== nF || d.faceMat.length !== nF || d.faceFlags.length !== nF) fail(`${where} mesh face tables disagree (${nF} faces)`);
  if (d.edgePairs.length !== d.edgeFlags.length * 2) fail(`${where} mesh edgePairs / edgeFlags disagree`);
  if (mj.uvSets !== undefined) notes.oldUvColumns = (notes.oldUvColumns ?? 0) + 1;   // 以前的写法（2.x）：现行格式里没有这个键 = 不带回、记一笔（施工单十八第五节；读的门口只这一处）
  if (mj.columns !== undefined && owner) readColumns(mj.columns, d, sliceOf, notes, owner);
  return d;
}

/**
 * 角上的列的读和收口（施工单十八 3.2；规矩照 1-2½ 那条统一的：附属数据坏了模型照开，坏的那一部分按「没有」处理、记进 notes，打开之后明着说，再存盘会把坏的部分去掉）。
 * 交出去的每一列每张面整面有或整面没有。· 整个 columns 不是列表 → 全不认。· 一项的身份号 / 种类（字符串；uv 必须每角两个数）/ 每角几个数（正整数）/ 角上的数那一段
 * （在、长度 = arity × 角数）不对 → 这一列不认。· 同一个网格体里几列同一个号 → 这几列都不认（不挑第一个）。· 一张面在一列上一半有数一半没有、有无穷大 → 这张面整面写成没有。
 * uv 列的号在排法表里有没有、角落没落在画布里：要对着顶层的排法表看，在 paint-read.ts。
 */
function readColumns(raw: unknown, d: MeshDoc, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, def: { readonly guid: string; readonly name: string }): void {
  const drop = (col: { guid: string; name: string } | null, faces: number, why: UvDropWhy): void => { (notes.uvDropped ??= []).push({ def: { guid: def.guid, name: def.name }, uvSet: col, faces, why }); };
  if (!Array.isArray(raw)) { drop(null, 0, "not-a-list"); return; }
  const view = (bv: number): Uint8Array => new Uint8Array(sliceOf(bv)), corners = d.loopVert.length;
  const kept: ColumnDoc[] = [];
  for (const r of raw as unknown[]) {
    if (!isObj(r)) { drop(null, 0, "not-an-object"); continue; }
    if (!(typeof r.guid === "string" && isGuid(r.guid))) { drop(null, 0, "bad-guid"); continue; }
    const id = { guid: r.guid, name: "" };
    if (typeof r.kind !== "string" || !(typeof r.arity === "number" && Number.isInteger(r.arity) && r.arity > 0) || (r.kind === "uv" && r.arity !== 2)) { drop(id, 0, "bad-kind"); continue; }
    const db = isObj(r.data) && typeof r.data.bufferView === "number" ? r.data.bufferView : null;
    let buf: ArrayBuffer | null = null;
    if (db !== null) { try { buf = sliceOf(db); } catch { buf = null; } }
    if (!buf || buf.byteLength % 4 !== 0) { drop(id, 0, "no-data"); continue; }
    if (buf.byteLength / 4 !== r.arity * corners) { drop(id, 0, "bad-length"); continue; }
    let values: Float32Array;
    if (r.kind === "uv") { const ints = new Int32Array(buf); values = new Float32Array(ints.length); for (let i = 0; i < ints.length; i++) values[i] = ints[i] === UV_NONE ? NaN : ints[i] / UV_Q; }
    else values = new Float32Array(buf);
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) if (k !== "guid" && k !== "kind" && k !== "arity" && k !== "data") extra[k] = v;
    kept.push({ guid: r.guid, kind: r.kind, arity: r.arity, values, ...(Object.keys(extra).length ? { extra: carryJson(extra, view) } : {}) });
  }
  const count = new Map<string, number>();
  for (const c of kept) count.set(c.guid, (count.get(c.guid) ?? 0) + 1);
  const cols = kept.filter((c) => { if (count.get(c.guid) === 1) return true; drop({ guid: c.guid, name: "" }, 0, "duplicate-guid"); return false; });
  for (const c of cols) {
    let partial = 0, nonFinite = 0;
    for (let f = 0; f < d.faceStart.length; f++) {
      const s = c.arity * d.faceStart[f], e = s + c.arity * d.faceLen[f];
      let nan = 0, inf = false;
      for (let i = s; i < e; i++) { const v = c.values[i]; if (Number.isNaN(v)) nan++; else if (!Number.isFinite(v)) inf = true; }
      if (nan === e - s || (nan === 0 && !inf)) continue;   // 整面没有 / 整面有
      if (inf) nonFinite++; else partial++;
      c.values.fill(NaN, s, e);
    }
    const id = { guid: c.guid, name: "" };
    if (partial) drop(id, partial, "partial-corners");
    if (nonFinite) drop(id, nonFinite, "non-finite-corners");
  }
  if (cols.length) d.columns = cols;
}

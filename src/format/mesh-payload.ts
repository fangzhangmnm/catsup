// mesh-payload.ts —— CATSUP_definitions 里 kind:"mesh" 定义的载荷 = CATSUP_mesh 子结构（自己的拍子 1.0.0；家族格式纪律：major 新拒开 / minor 新提示一次 / patch 静默；未知键直通归 carry）。
// 多边形是真相：positions（f64 xyz，定义坐标 Z-up）/ faceStart / faceLen / loopVert（i32；顶点下标空间 = positions）/ faceMat（i32，−1 = 默认槽）/ faceFlags（u8，bit0 隐藏）/
// edgePairs（i32 成对）+ edgeFlags（u8：软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16 / 手标硬 32（1.1）；只列带标记的边）。三角形不存（bake 的派生物，给别的查看器看）。
// 1.1（2026-10-28 Claude Opus 5.5，FM129）：smoothDefault { mode: angle | smooth | hard, deg }（JSON 键，可选）= 网格体的默认平滑（没手标的边算棱还是光滑过渡；几何属性）；缺 = hard（老文件语义：只看手标）。老读者看到 1.1 = 提示一次、照开（默认平滑丢了 = 全按手标，手标硬的位不认）。
// 1.2（2026-10-28 晚 Claude Fable 5.1，镜像重做第二刀；FM134「按网格体记、还没存进文件」收口）：mirror { mode: edit | force, axis: 0 | 1 | 2 }（JSON 键，可选）= 网格体的「对称」属性（UX 心智模型 §2.1：物体窗口里的字段）；缺 = 关。
//   老读者看到 1.2 = 提示一次、照开（对称设置丢了 = 关着）。
// 3.0（2026-11-13 Claude Opus 5.5，施工单十八 3.2）：columns[ … ] = 角上的列，两种形状：
//   · kind = uv（贴图坐标）= 一个通道（统筹 11-13 改，user 问「为什么不是 id 列加 uv 列，而是每个画布一个 uv 列」）：
//     { kind: "uv", arity: 2, sets: [GUID, …], faceSet: { bufferView, count = 面数 }, data: { bufferView, count = 角数 } }
//     sets = 对照表（代号 → 顶层排法表 CATSUP_uvsets 里那一行的 GUID）；faceSet = 每张面一个 32 位有符号整数 = sets 的下标，−1 = 这张面在这个通道里没有位置；
//     data = 每角两个 32 位有符号整数（小端、和 loopVert 同序），单位 1/1024 格，面没有位置 = 两个 −2147483648。
//     通道数 = 一张面同时在几套排法上的最大值（平时 1）。写：每张面把它有位置的排法按 GUID 字典序排，第 k 个进第 k 个通道；每个通道的 sets = 这个通道里出现的 GUID（字典序）。
//     sets 里可以有没有任何面引用的 GUID = 这个网格体在那套排法上、零张面有位置（内存里那一列在、全空；统筹 11-13 同意）：写的时候进第 0 个通道，这时就算没有面有位置也写第 0 个通道。
//     读：每个通道展开回内存里按排法分的列（packUvChannels / 读的 readUvChannel）。uv 通道对象里不认识的键不带回（通道是写的时候现排的，没有地方挂）。
//   · 别的 kind（这一版一种都不造）：{ guid, kind, arity, data: { bufferView, count = 角数 }, …别的键 }：GUID 是这一列自己的号、data = 每角 arity 个 32 位浮点、NaN = 没有值；
//     当普通的一列带着走完每一步建模、kind 和别的键原样写回。
//   只有带列的网格体盖 3.0；不带的照旧盖 1.2，字节和以前一样。
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

/** 一个 uv 通道（写进文件前 / 读出来展开前）。 */
export interface UvChannel { readonly sets: string[]; readonly faceSet: Int32Array; readonly data: Int32Array }
/**
 * 按排法分的 uv 列 → 通道（文件头注释 3.0）。每张面有没有位置看它第一个角（内存里一张面在一列上整面有或整面没有）；坐标 × 1024 取整（值本来就是 1/1024 格的整数倍）。
 * 同一份列写出来逐字节一样：通道、sets、下标都只由「哪张面在哪几套上有位置」和 GUID 的字典序决定，和内存里列的先后无关。
 */
export function packUvChannels(uv: readonly ColumnDoc[], faceStart: Int32Array, faceLen: Int32Array, corners: number): UvChannel[] {
  const nF = faceStart.length, per: string[][] = Array.from({ length: nF }, () => []), byGuid = new Map(uv.map((c) => [c.guid, c])), empty: string[] = [];
  for (const c of uv) {
    let any = false;
    for (let f = 0; f < nF; f++) if (!Number.isNaN(c.values[2 * faceStart[f]])) { per[f].push(c.guid); any = true; }
    if (!any) empty.push(c.guid);   // 空列：在这套排法上、零张面有位置
  }
  let n = empty.length ? 1 : 0;
  for (const l of per) { l.sort(); n = Math.max(n, l.length); }
  const out: UvChannel[] = [];
  for (let k = 0; k < n; k++) {
    const used = new Set<string>(k === 0 ? empty : []);
    for (const l of per) if (l[k] !== undefined) used.add(l[k]);
    const sets = [...used].sort(), at = new Map(sets.map((g, i) => [g, i]));
    const faceSet = new Int32Array(nF).fill(-1), data = new Int32Array(2 * corners).fill(UV_NONE);
    for (let f = 0; f < nF; f++) {
      const g = per[f][k];
      if (g === undefined) continue;
      faceSet[f] = at.get(g)!;
      const v = byGuid.get(g)!.values, s0 = 2 * faceStart[f], e0 = s0 + 2 * faceLen[f];
      for (let i = s0; i < e0; i++) data[i] = Math.round(v[i] * UV_Q);
    }
    out.push({ sets, faceSet, data });
  }
  return out;
}

export function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown> {
  const bv = (a: ArrayBufferView, count: number): { bufferView: number; count: number } => ({ bufferView: sink.add(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)), count });
  const other = (m.columns ?? []).filter((c) => c.kind !== "uv"), uv = packUvChannels((m.columns ?? []).filter((c) => c.kind === "uv"), m.faceStart, m.faceLen, m.loopVert.length);
  const st = (x: Stamp): Record<string, number> => ({ version: x.major, ...(x.minor ? { minor: x.minor } : {}), ...(x.patch ? { patch: x.patch } : {}) });
  const any = other.length + uv.length > 0, stamp = any ? stampOf("CATSUP_mesh") : st(MESH_STAMP_NO_UV);   // 没有列 = 照旧 1.2（逐字节）；有列 = 3.0
  return {
    ...stamp,
    positions: bv(m.positions, m.positions.length / 3),
    faceStart: bv(m.faceStart, m.faceStart.length), faceLen: bv(m.faceLen, m.faceLen.length), loopVert: bv(m.loopVert, m.loopVert.length),
    faceMat: bv(m.faceMat, m.faceMat.length), faceFlags: bv(m.faceFlags, m.faceFlags.length),
    edgePairs: bv(m.edgePairs, m.edgePairs.length / 2), edgeFlags: bv(m.edgeFlags, m.edgeFlags.length),
    ...(m.smoothDefault ? { smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg } } : {}),
    ...(m.mirror ? { mirror: { mode: m.mirror.mode, axis: m.mirror.axis } } : {}),
    ...(any ? { columns: [
      ...other.map((c) => ({ ...(c.extra ? (landCarried(c.extra, sink) as Record<string, unknown>) : {}), guid: c.guid, kind: c.kind, arity: c.arity, data: bv(c.values, c.values.length / c.arity) })),
      ...uv.map((ch) => ({ kind: "uv", arity: 2, sets: ch.sets, faceSet: bv(ch.faceSet, ch.faceSet.length), data: bv(ch.data, ch.data.length / 2) })),
    ] } : {}),
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
 * 交出去的每一列每张面整面有或整面没有；uv 通道展开回按排法分的列（GUID = 排法那一行的号）。
 * · 整个 columns 不是列表 → 全不认。· 一项不是对象 → 这一项不认。
 * · 别的 kind：身份号 / 种类 / 每角几个数（正整数）/ 角上的数那一段（在、长度 = arity × 角数）不对 → 这一列不认；一张面一半有数一半没有、有无穷大 → 这张面整面写成没有。
 * · uv 通道：readUvChannel。
 * · 同一个网格体里别的 kind 的几列同一个号、或者和某套排法同号 → 这几列都不认（不挑第一个）。同一套排法出现在几个通道里是正常的（各管各的面）。
 * uv 列的号在排法表里有没有、角落没落在画布里：要对着顶层的排法表看，在 paint-read.ts。
 */
function readColumns(raw: unknown, d: MeshDoc, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, def: { readonly guid: string; readonly name: string }): void {
  const drop = (col: { guid: string; name: string } | null, faces: number, why: UvDropWhy): void => { (notes.uvDropped ??= []).push({ def: { guid: def.guid, name: def.name }, uvSet: col, faces, why }); };
  if (!Array.isArray(raw)) { drop(null, 0, "not-a-list"); return; }
  const view = (bv: number): Uint8Array => new Uint8Array(sliceOf(bv)), corners = d.loopVert.length;
  const buf = (o: unknown): ArrayBuffer | null => { const b = isObj(o) && typeof o.bufferView === "number" ? o.bufferView : null; if (b === null) return null; try { return sliceOf(b); } catch { return null; } };
  const kept: ColumnDoc[] = [], uv = new Map<string, Float32Array>();
  for (const r of raw as unknown[]) {
    if (!isObj(r)) { drop(null, 0, "not-an-object"); continue; }
    if (r.kind === "uv") { readUvChannel(r, d, buf, uv, drop); continue; }
    if (!(typeof r.guid === "string" && isGuid(r.guid))) { drop(null, 0, "bad-guid"); continue; }
    const id = { guid: r.guid, name: "" };
    if (typeof r.kind !== "string" || !(typeof r.arity === "number" && Number.isInteger(r.arity) && r.arity > 0)) { drop(id, 0, "bad-kind"); continue; }
    const b = buf(r.data);
    if (!b || b.byteLength % 4 !== 0) { drop(id, 0, "no-data"); continue; }
    if (b.byteLength / 4 !== r.arity * corners) { drop(id, 0, "bad-length"); continue; }
    const extra: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(r)) if (k !== "guid" && k !== "kind" && k !== "arity" && k !== "data") extra[k] = v;
    kept.push({ guid: r.guid, kind: r.kind, arity: r.arity, values: new Float32Array(b), ...(Object.keys(extra).length ? { extra: carryJson(extra, view) } : {}) });
  }
  const count = new Map<string, number>();
  for (const c of kept) count.set(c.guid, (count.get(c.guid) ?? 0) + 1);
  for (const g of uv.keys()) count.set(g, (count.get(g) ?? 0) + 1);
  const dup = (g: string): boolean => (count.get(g) ?? 0) > 1;
  const cols = kept.filter((c) => { if (!dup(c.guid)) return true; drop({ guid: c.guid, name: "" }, 0, "duplicate-guid"); return false; });
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
  for (const [g, values] of uv) { if (dup(g)) { drop({ guid: g, name: "" }, 0, "duplicate-guid"); continue; } cols.push({ guid: g, kind: "uv", arity: 2, values }); }
  if (cols.length) d.columns = cols;
}

/**
 * 一个 uv 通道展开进 uv（排法 GUID → 按角的坐标，NaN = 没有）。坏在哪，那一部分按「没有」，记一笔：
 * · arity 不是 2 → 这个通道不认（bad-kind）。sets 不是列表 → 不认（bad-sets）。faceSet / data 找不到 → 不认（no-data）；个数不是面数 / 角数 × 2 → 不认（bad-length）。
 * · sets 里每个是 GUID 的项都建一列（没有面引用 = 这个网格体在那套排法上、零张面有位置）；重复的 GUID 允许（指同一列）。
 * · 一张面：下标越界、或者 sets 里那一项不是 GUID → 这张面没有（bad-face-set）；faceSet 说有而角上是「没有」或一半有一半没有、faceSet 是 −1 而角上有数 → 这张面没有（face-set-mismatch）；
 *   同一张面在前一个通道里已经在这套排法上有位置 → 后一个不认（same-set-twice）。
 */
function readUvChannel(r: Record<string, unknown>, d: MeshDoc, buf: (o: unknown) => ArrayBuffer | null, uv: Map<string, Float32Array>, drop: (col: { guid: string; name: string } | null, faces: number, why: UvDropWhy) => void): void {
  const nF = d.faceStart.length, corners = d.loopVert.length;
  if (r.arity !== 2) { drop(null, 0, "bad-kind"); return; }
  if (!Array.isArray(r.sets)) { drop(null, 0, "bad-sets"); return; }
  const fb = buf(r.faceSet), db = buf(r.data);
  if (!fb || !db || fb.byteLength % 4 !== 0 || db.byteLength % 4 !== 0) { drop(null, 0, "no-data"); return; }
  if (fb.byteLength / 4 !== nF || db.byteLength / 4 !== 2 * corners) { drop(null, 0, "bad-length"); return; }
  const sets = (r.sets as unknown[]).map((x) => (typeof x === "string" && isGuid(x) ? x : null)), faceSet = new Int32Array(fb), data = new Int32Array(db);
  for (const g of sets) if (g !== null && !uv.has(g)) uv.set(g, new Float32Array(2 * corners).fill(NaN));
  let badIndex = 0;
  const mismatch = new Map<string | null, number>(), twice = new Map<string, number>(), bump = <K>(m: Map<K, number>, k: K): void => { m.set(k, (m.get(k) ?? 0) + 1); };
  for (let f = 0; f < nF; f++) {
    const s0 = 2 * d.faceStart[f], e0 = s0 + 2 * d.faceLen[f], i = faceSet[f];
    let none = 0;
    for (let c = s0; c < e0; c++) if (data[c] === UV_NONE) none++;
    if (i === -1) { if (none !== e0 - s0) bump(mismatch, null); continue; }
    const g = i >= 0 && i < sets.length ? sets[i] : null;
    if (g === null) { badIndex++; continue; }
    if (none) { bump(mismatch, g); continue; }
    const col = uv.get(g)!;
    if (!Number.isNaN(col[s0])) { bump(twice, g); continue; }
    for (let c = s0; c < e0; c++) col[c] = data[c] / UV_Q;
  }
  if (badIndex) drop(null, badIndex, "bad-face-set");
  for (const [g, n] of mismatch) drop(g === null ? null : { guid: g, name: "" }, n, "face-set-mismatch");
  for (const [g, n] of twice) drop({ guid: g, name: "" }, n, "same-set-twice");
}

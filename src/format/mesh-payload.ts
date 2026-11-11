// mesh-payload.ts —— CATSUP_definitions 里 kind:"mesh" 定义的载荷 = CATSUP_mesh 子结构（自己的拍子 1.0.0；家族格式纪律：major 新拒开 / minor 新提示一次 / patch 静默；未知键直通归 carry）。
// 多边形是真相：positions（f64 xyz，定义坐标 Z-up）/ faceStart / faceLen / loopVert（i32；顶点下标空间 = positions）/ faceMat（i32，−1 = 默认槽）/ faceFlags（u8，bit0 隐藏）/
// edgePairs（i32 成对）+ edgeFlags（u8：软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16 / 手标硬 32（1.1）；只列带标记的边）。三角形不存（bake 的派生物，给别的查看器看）。
// 1.1（2026-10-28 Claude Opus 5.5，FM129）：smoothDefault { mode: angle | smooth | hard, deg }（JSON 键，可选）= 网格体的默认平滑（没手标的边算棱还是光滑过渡；几何属性）；缺 = hard（老文件语义：只看手标）。老读者看到 1.1 = 提示一次、照开（默认平滑丢了 = 全按手标，手标硬的位不认）。
// 1.2（2026-10-28 晚 Claude Fable 5.1，镜像重做第二刀；FM134「按网格体记、还没存进文件」收口）：mirror { mode: edit | force, axis: 0 | 1 | 2 }（JSON 键，可选）= 网格体的「对称」属性（UX 心智模型 §2.1：物体窗口里的字段）；缺 = 关。
//   老读者看到 1.2 = 提示一次、照开（对称设置丢了 = 关着）。
// 2.0（2026-11-11 Claude Opus 5.5，贴图主线 1-2½）：uvSets[]（每套 { guid, name, width, height, pxPerM, loopUv: { bufferView, count } }，loopUv = 每角一对 f32、单位 = 格、和 loopVert 同序、不管的面的角 = NaN）。
//   只有带贴图坐标的网格体盖 2.0；不带的照旧盖 1.2，字节和以前一样（migrate/index.ts 头注释那一节）。旧版本读到 2.0 = 拒开、明说要更新。
// 没有 faceStart 键 = 0.14 的三角汤最小形（migrate/mesh.ts 读成每三角一面）。created 2026-10-27 by Claude Fable 5.1
import { UV_CANVAS_EPS, type MeshDoc, type UvSetDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
import { MESH_STAMP_NO_UV, MESH_STAMP_UV_NO_FIT, migrateExtension, stampOf, type FormatReadNotes, type Stamp, type UvDropWhy } from "./migrate/index.ts";
import { isGuid } from "./guid.ts";
import { polygonsFromTriangles } from "./migrate/mesh.ts";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown> {
  const bv = (a: ArrayBufferView, count: number): { bufferView: number; count: number } => ({ bufferView: sink.add(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)), count });
  const uv = m.uvSets ?? [];
  const st = (s: Stamp): Record<string, number> => ({ version: s.major, ...(s.minor ? { minor: s.minor } : {}), ...(s.patch ? { patch: s.patch } : {}) });
  const stamp = !uv.length ? st(MESH_STAMP_NO_UV) : uv.some((u) => u.fit === "density") ? stampOf("CATSUP_mesh") : st(MESH_STAMP_UV_NO_FIT);   // 没有贴图坐标 = 照旧 1.2；有坐标、没有按密度开的 = 照旧 2.0（逐字节）；有 fit = 2.1
  return {
    ...stamp,
    positions: bv(m.positions, m.positions.length / 3),
    faceStart: bv(m.faceStart, m.faceStart.length), faceLen: bv(m.faceLen, m.faceLen.length), loopVert: bv(m.loopVert, m.loopVert.length),
    faceMat: bv(m.faceMat, m.faceMat.length), faceFlags: bv(m.faceFlags, m.faceFlags.length),
    edgePairs: bv(m.edgePairs, m.edgePairs.length / 2), edgeFlags: bv(m.edgeFlags, m.edgeFlags.length),
    ...(m.smoothDefault ? { smoothDefault: { mode: m.smoothDefault.mode, deg: m.smoothDefault.deg } } : {}),
    ...(m.mirror ? { mirror: { mode: m.mirror.mode, axis: m.mirror.axis } } : {}),
    ...(uv.length ? { uvSets: uv.map((u) => ({ guid: u.guid, name: u.name, width: u.width, height: u.height, pxPerM: u.pxPerM, ...(u.fit === "density" ? { fit: "density" } : {}), loopUv: bv(u.loopUv, u.loopUv.length / 2) })) } : {}),
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
  if (mj.uvSets !== undefined && owner) readUvSets(mj.uvSets, d, sliceOf, notes, owner);
  return d;
}

/**
 * 贴图坐标的读和收口（1-2½；契约第五节 11-11 改过的那条统一的规矩）：贴图坐标是模型的附属数据。它坏了，模型照开；坏的那一部分按「没有」处理、记进 notes，
 * 打开之后明着告诉用户（再存盘会把坏的部分去掉）。规矩在这一层收口：交出去的每一套都过得了内存里的自检（scene/paint.ts paintIssues），每张面在每一套上整面有或整面没有。
 * · 整个 uvSets 不是列表 → 全不认。· 一套的身份号 / 宽高（正整数）/ 密度（正的有限数）/ loopUv（在、长度 = 2 × 角数）不对 → 这一整套不认（指着它的贴图变孤儿，paint-read.ts 记）。
 * · 同一个网格体里几套同一个身份号 → 这几套都不认（不挑第一个）。· 一张面在一套上一半有数一半是 NaN、有无穷大、落在画布外面 → 这张面在这一套上整面写成 NaN（不夹回画布里）。
 */
function readUvSets(raw: unknown, d: MeshDoc, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, def: { readonly guid: string; readonly name: string }): void {
  const drop = (uvSet: { guid: string; name: string } | null, faces: number, why: UvDropWhy): void => { (notes.uvDropped ??= []).push({ def: { guid: def.guid, name: def.name }, uvSet, faces, why }); };
  if (!Array.isArray(raw)) { drop(null, 0, "not-a-list"); return; }
  const posInt = (x: unknown): x is number => typeof x === "number" && Number.isInteger(x) && x > 0;
  const kept: UvSetDoc[] = [];
  for (const r of raw as unknown[]) {
    if (!isObj(r)) { drop(null, 0, "not-an-object"); continue; }
    const name = typeof r.name === "string" ? r.name : "", id = typeof r.guid === "string" && isGuid(r.guid) ? { guid: r.guid, name } : null;
    if (!id) { drop(null, 0, "bad-guid"); continue; }
    if (!posInt(r.width) || !posInt(r.height)) { drop(id, 0, "bad-size"); continue; }
    if (!(typeof r.pxPerM === "number" && Number.isFinite(r.pxPerM) && r.pxPerM > 0)) { drop(id, 0, "bad-density"); continue; }
    const lb = isObj(r.loopUv) && typeof r.loopUv.bufferView === "number" ? r.loopUv.bufferView : null;
    let loopUv: Float32Array | null = null;
    if (lb !== null) { try { loopUv = new Float32Array(sliceOf(lb)); } catch { loopUv = null; } }
    if (!loopUv) { drop(id, 0, "no-loopUv"); continue; }
    if (loopUv.length !== 2 * d.loopVert.length) { drop(id, 0, "bad-length"); continue; }
    kept.push({ guid: id.guid, name, width: r.width, height: r.height, pxPerM: r.pxPerM, ...(r.fit === "density" ? { fit: "density" as const } : {}), loopUv });   // fit 缺 / 不认识 = size（2.1）
  }
  const count = new Map<string, number>();
  for (const u of kept) count.set(u.guid, (count.get(u.guid) ?? 0) + 1);
  const sets = kept.filter((u) => { if (count.get(u.guid)! === 1) return true; drop({ guid: u.guid, name: u.name }, 0, "duplicate-guid"); return false; });
  for (const u of sets) {
    let partial = 0, nonFinite = 0, offCanvas = 0;
    for (let f = 0; f < d.faceStart.length; f++) {
      const s = 2 * d.faceStart[f], e = s + 2 * d.faceLen[f];
      let nan = 0, bad: UvDropWhy | null = null;
      for (let i = s; i < e; i++) {
        const v = u.loopUv[i];
        if (Number.isNaN(v)) { nan++; continue; }
        if (!Number.isFinite(v)) { bad = "non-finite-corners"; continue; }
        if (bad === null && (v < -UV_CANVAS_EPS || v > ((i & 1) === 0 ? u.width : u.height) + UV_CANVAS_EPS)) bad = "off-canvas-corners";
      }
      if (nan === e - s) continue;   // 整面没有：明着的「这一套不管这张面」
      if (bad === null && nan === 0) continue;
      const why: UvDropWhy = bad === "non-finite-corners" ? bad : nan ? "partial-corners" : "off-canvas-corners";
      if (why === "non-finite-corners") nonFinite++; else if (why === "partial-corners") partial++; else offCanvas++;
      u.loopUv.fill(NaN, s, e);
    }
    const id = { guid: u.guid, name: u.name };
    if (partial) drop(id, partial, "partial-corners");
    if (nonFinite) drop(id, nonFinite, "non-finite-corners");
    if (offCanvas) drop(id, offCanvas, "off-canvas-corners");
  }
  if (sets.length) d.uvSets = sets;
}

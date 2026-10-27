// mesh-payload.ts —— CATSUP_definitions 里 kind:"mesh" 定义的载荷 = CATSUP_mesh 子结构（自己的拍子 1.0.0；家族格式纪律：major 新拒开 / minor 新提示一次 / patch 静默；未知键直通归 carry）。
// 多边形是真相：positions（f64 xyz，定义坐标 Z-up）/ faceStart / faceLen / loopVert（i32；顶点下标空间 = positions）/ faceMat（i32，−1 = 默认槽）/ faceFlags（u8，bit0 隐藏）/
// edgePairs（i32 成对）+ edgeFlags（u8：软 1 / 平滑 2 / 接缝 4 / 隐藏 8 / 裸线 16；只列带标记的边）。三角形不存（bake 的派生物，给别的查看器看）。
// 没有 faceStart 键 = 0.14 的三角汤最小形（migrate/mesh.ts 读成每三角一面）。created 2026-10-27 by Claude Fable 5.1
import type { MeshDoc } from "./document.ts";
import type { ViewSink } from "./brep-codec.ts";
import { migrateExtension, stampOf, type FormatReadNotes } from "./migrate/index.ts";
import { polygonsFromTriangles } from "./migrate/mesh.ts";

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);

export function encodeMeshItem(m: MeshDoc, sink: ViewSink): Record<string, unknown> {
  const bv = (a: ArrayBufferView, count: number): { bufferView: number; count: number } => ({ bufferView: sink.add(new Uint8Array(a.buffer, a.byteOffset, a.byteLength)), count });
  return {
    ...stampOf("CATSUP_mesh"),
    positions: bv(m.positions, m.positions.length / 3),
    faceStart: bv(m.faceStart, m.faceStart.length), faceLen: bv(m.faceLen, m.faceLen.length), loopVert: bv(m.loopVert, m.loopVert.length),
    faceMat: bv(m.faceMat, m.faceMat.length), faceFlags: bv(m.faceFlags, m.faceFlags.length),
    edgePairs: bv(m.edgePairs, m.edgePairs.length / 2), edgeFlags: bv(m.edgeFlags, m.edgeFlags.length),
  };
}

/** @param sliceOf bufferView 下标 → 独立的 ArrayBuffer（偏移 0，所以 f64 / i32 视图不受 BIN 对齐限制） */
export function decodeMeshItem(raw: Record<string, unknown>, sliceOf: (bv: number) => ArrayBuffer, notes: FormatReadNotes, where: string, fail: (msg: string) => never): MeshDoc {
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
  const nF = d.faceStart.length;
  if (d.positions.length % 3 !== 0) fail(`${where} mesh positions length ${d.positions.length} is not a multiple of 3`);
  if (d.faceLen.length !== nF || d.faceMat.length !== nF || d.faceFlags.length !== nF) fail(`${where} mesh face tables disagree (${nF} faces)`);
  if (d.edgePairs.length !== d.edgeFlags.length * 2) fail(`${where} mesh edgePairs / edgeFlags disagree`);
  return d;
}

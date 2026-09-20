// bake.ts —— core = bake（契约 §4：只写不读；两原则 = 省流、三方 WYSIWYG；细则归导出器 spec）。
// v1：一个 definition → 一个 mesh：TRIANGLES（全部膜，共享顶点，float32 POSITION，无 NORMAL = 加载器自算平面法线）
// + LINES（全部边）。坐标换轴 Z-up → glTF Y-up：(x,y,z) → (x, z, -y)（与 obj-io 同规则）。created 2026-09-20 by Claude Fable 5.1

import type { BrepSnapshot } from "../kernel/kernel.ts";
import { encodeF32, encodeUints, pickUintType } from "./binary.ts";
import { triangulateRings } from "./triangulate.ts";
import type { ViewSink } from "./brep-codec.ts";

const GL_UNSIGNED_BYTE = 5121, GL_UNSIGNED_SHORT = 5123, GL_UNSIGNED_INT = 5125, GL_FLOAT = 5126;
const GL_ARRAY_BUFFER = 34962, GL_ELEMENT_ARRAY_BUFFER = 34963;
const MODE_LINES = 1, MODE_TRIANGLES = 4;

export interface BakeResult {
  accessors: Record<string, unknown>[];
  bufferViewTargets: Map<number, number>;   // bufferView index → target（写入器回填）
  mesh: Record<string, unknown>;
}

/** 把一个 definition 的 B-rep 烘成 glTF mesh（accessor 索引从 accessorBase 起）。 */
export function bakeDefinition(snap: BrepSnapshot, sink: ViewSink, accessorBase: number): BakeResult {
  const pos: number[] = [];
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of snap.vertices) {
    const y = [p.x, p.z, -p.y];   // Z-up → Y-up
    pos.push(y[0], y[1], y[2]);
    min = [Math.min(min[0], y[0]), Math.min(min[1], y[1]), Math.min(min[2], y[2])];
    max = [Math.max(max[0], y[0]), Math.max(max[1], y[1]), Math.max(max[2], y[2])];
  }
  const tris: number[] = [];
  for (const f of snap.faces) for (const t of triangulateRings(snap.vertices, snap.planes[f.plane], f.outer, f.holes)) tris.push(...t);
  const lines: number[] = snap.edges.flatMap((e) => [e[0], e[1]]);
  const idxType = pickUintType(Math.max(0, snap.vertices.length - 1));
  const idxGl = idxType === "uint8" ? GL_UNSIGNED_BYTE : idxType === "uint16" ? GL_UNSIGNED_SHORT : GL_UNSIGNED_INT;
  const idxEnc = idxType === "uint64" ? "uint32" : idxType;   // glTF 索引最大 uint32；2^32 顶点以上不在 v1 范围

  const posView = sink.add(encodeF32(pos));
  const triView = sink.add(encodeUints(tris, idxEnc));
  const lineView = sink.add(encodeUints(lines, idxEnc));
  const targets = new Map<number, number>([[posView, GL_ARRAY_BUFFER], [triView, GL_ELEMENT_ARRAY_BUFFER], [lineView, GL_ELEMENT_ARRAY_BUFFER]]);

  const accessors: Record<string, unknown>[] = [
    { bufferView: posView, componentType: GL_FLOAT, count: snap.vertices.length, type: "VEC3", min: snap.vertices.length ? min : [0, 0, 0], max: snap.vertices.length ? max : [0, 0, 0] },
    { bufferView: triView, componentType: idxGl, count: tris.length, type: "SCALAR" },
    { bufferView: lineView, componentType: idxGl, count: lines.length, type: "SCALAR" },
  ];
  const primitives: Record<string, unknown>[] = [];
  if (tris.length) primitives.push({ attributes: { POSITION: accessorBase }, indices: accessorBase + 1, mode: MODE_TRIANGLES });
  if (lines.length) primitives.push({ attributes: { POSITION: accessorBase }, indices: accessorBase + 2, mode: MODE_LINES });
  return { accessors, bufferViewTargets: targets, mesh: { primitives } };
}

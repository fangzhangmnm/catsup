// bake.ts —— core = bake（契约 §4：只写不读；两原则 = 省流、三方 WYSIWYG；细则归导出器 spec）。
// v1：一个 definition → 一个 mesh：TRIANGLES（全部膜，共享顶点，float32 POSITION，无 NORMAL = 加载器自算平面法线）
// + LINES（全部边）。坐标换轴 Z-up → glTF Y-up：(x,y,z) → (x, z, -y)（与 obj-io 同规则）。created 2026-09-20 by Claude Fable 5.1

import type { BrepSnapshot } from "../kernel/kernel.ts";
import { dot3, planeBasis } from "../kernel/geom.ts";
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

/** 多个池（definition 根池 + 各 group）合并成一份快照（索引平移；平面各自保留）。bake 用。added 2026-10-21 */
export function mergeBrep(snaps: readonly BrepSnapshot[]): BrepSnapshot {
  if (snaps.length === 1) return snaps[0];
  const vertices: BrepSnapshot["vertices"][number][] = [];
  const edges: [number, number][] = [];
  const planes: BrepSnapshot["planes"][number][] = [];
  const faces: { plane: number; outer: number[]; holes: number[][] }[] = [];
  const softEdges: number[] = [], curveEdges: number[] = [];
  const faceMaterial: number[] = [];
  for (const s of snaps) {
    const vo = vertices.length, eo = edges.length, po = planes.length;
    vertices.push(...s.vertices);
    for (const [a, b] of s.edges) edges.push([a + vo, b + vo]);
    planes.push(...s.planes);
    for (const f of s.faces) faces.push({ plane: f.plane + po, outer: f.outer.map((i) => i + vo), holes: f.holes.map((h) => h.map((i) => i + vo)) });
    for (const i of s.softEdges ?? []) softEdges.push(i + eo);
    for (const i of s.curveEdges ?? []) curveEdges.push(i + eo);
    for (let i = 0; i < s.faces.length; i++) faceMaterial.push(s.faceMaterial?.[i] ?? -1);
  }
  return { coplanarTol: snaps[0]?.coplanarTol ?? 1e-3, vertices, edges, planes, faces, ...(softEdges.length ? { softEdges } : {}), ...(curveEdges.length ? { curveEdges } : {}), ...(faceMaterial.some((m) => m >= 0) ? { faceMaterial } : {}) };
}

/** 材质槽 → glTF core 材质索引 + 贴图物理尺寸（bake 按材质拆 primitive、算 TEXCOORD_0 用）。 */
export interface BakeMaterials { slotToCore: (slot: number) => number | undefined; sizeOfCore: (core: number) => readonly [number, number] | null; }

/**
 * 把一个 definition 的 B-rep 烘成 glTF mesh（accessor 索引从 accessorBase 起）。软边不进 LINES（圆柱侧面不出竖线）。
 * 贴图纪元（2026-10-21）：按材质拆 primitive（契约「按 (材质, tag) 拆 prim」）——默认材质一份（共享顶点，无 UV）；每种材质一份
 * 自己的 POSITION（逐角，不共享）+ 有贴图时 TEXCOORD_0 = 沿面平面确定性基的平面投影 / 物理尺寸（契约「默认不存 UV」档：三方看到的就是 app 的默认贴法）。
 */
export function bakeDefinition(snap: BrepSnapshot, sink: ViewSink, accessorBase: number, mats?: BakeMaterials): BakeResult {
  const pos: number[] = [];
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const p of snap.vertices) {
    const y = [p.x, p.z, -p.y];   // Z-up → Y-up
    pos.push(y[0], y[1], y[2]);
    min = [Math.min(min[0], y[0]), Math.min(min[1], y[1]), Math.min(min[2], y[2])];
    max = [Math.max(max[0], y[0]), Math.max(max[1], y[1]), Math.max(max[2], y[2])];
  }
  const tris: number[] = [];
  const byMat = new Map<number, number[]>();   // core material → face indices
  snap.faces.forEach((f, i) => {
    const slot = snap.faceMaterial?.[i] ?? -1;
    const core = slot >= 0 ? mats?.slotToCore(slot) : undefined;
    if (core === undefined) { for (const t of triangulateRings(snap.vertices, snap.planes[f.plane], f.outer, f.holes)) tris.push(...t); }
    else (byMat.get(core) ?? byMat.set(core, []).get(core)!).push(i);
  });
  const soft = new Set(snap.softEdges ?? []);
  const lines: number[] = snap.edges.flatMap((e, i) => (soft.has(i) ? [] : [e[0], e[1]]));
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
  // 每种材质一份 primitive（逐角顶点；贴图材质带 UV）
  for (const [core, faceIdxs] of [...byMat.entries()].sort((a, b) => a[0] - b[0])) {
    const size = mats?.sizeOfCore(core) ?? null;
    const P: number[] = [], UV: number[] = [];
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const fi of faceIdxs) {
      const f = snap.faces[fi];
      const plane = snap.planes[f.plane];
      const basis = planeBasis(plane);
      for (const t of triangulateRings(snap.vertices, plane, f.outer, f.holes)) {
        for (const vi of t) {
          const p = snap.vertices[vi];
          const y = [p.x, p.z, -p.y];
          P.push(y[0], y[1], y[2]);
          mn = [Math.min(mn[0], y[0]), Math.min(mn[1], y[1]), Math.min(mn[2], y[2])];
          mx = [Math.max(mx[0], y[0]), Math.max(mx[1], y[1]), Math.max(mx[2], y[2])];
          if (size) UV.push(dot3(p, basis.u) / size[0], 1 - dot3(p, basis.v) / size[1]);   // glTF UV 原点左上
        }
      }
    }
    if (!P.length) continue;
    const pv = sink.add(encodeF32(P));
    targets.set(pv, GL_ARRAY_BUFFER);
    const posAcc = accessorBase + accessors.length;
    accessors.push({ bufferView: pv, componentType: GL_FLOAT, count: P.length / 3, type: "VEC3", min: mn, max: mx });
    const attributes: Record<string, number> = { POSITION: posAcc };
    if (size) {
      const uv = sink.add(encodeF32(UV));
      targets.set(uv, GL_ARRAY_BUFFER);
      attributes.TEXCOORD_0 = accessorBase + accessors.length;
      accessors.push({ bufferView: uv, componentType: GL_FLOAT, count: UV.length / 2, type: "VEC2" });
    }
    primitives.push({ attributes, mode: MODE_TRIANGLES, material: core });
  }
  return { accessors, bufferViewTargets: targets, mesh: { primitives } };
}

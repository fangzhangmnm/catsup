// bake.ts —— core = bake（契约 §4：只写不读；两原则 = 省流、三方 WYSIWYG；细则归导出器 spec）。
// v1：一个 definition → 一个 mesh：TRIANGLES（全部膜，共享顶点，float32 POSITION，无 NORMAL = 加载器自算平面法线）
// + LINES（全部边）。坐标换轴 Z-up → glTF Y-up：(x,y,z) → (x, z, -y)（与 obj-io 同规则）。created 2026-09-20 by Claude Fable 5.1

import type { BrepSnapshot } from "../kernel/kernel.ts";
import { COPLANAR_TOL_DEFAULT, dot3, planeBasis } from "../kernel/geom.ts";
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
  const edgeLayers: Record<string, number[]> = {}, faceLayers: Record<string, number[]> = {};
  const edgeNames = new Set(snaps.flatMap((s) => Object.keys(s.edgeLayers ?? {}))), faceNames = new Set(snaps.flatMap((s) => Object.keys(s.faceLayers ?? {})));
  for (const s of snaps) {
    const vo = vertices.length, eo = edges.length, po = planes.length, fo = faces.length;
    vertices.push(...s.vertices);
    for (const [a, b] of s.edges) edges.push([a + vo, b + vo]);
    planes.push(...s.planes);
    for (const f of s.faces) faces.push({ plane: f.plane + po, outer: f.outer.map((i) => i + vo), holes: f.holes.map((h) => h.map((i) => i + vo)) });
    for (const n of edgeNames) for (const i of s.edgeLayers?.[n] ?? []) (edgeLayers[n] ?? (edgeLayers[n] = [])).push(i + eo);
    for (const n of faceNames) { const arr = faceLayers[n] ?? (faceLayers[n] = []); while (arr.length < fo) arr.push(-1); for (let i = 0; i < s.faces.length; i++) arr.push(s.faceLayers?.[n]?.[i] ?? -1); }
  }
  return { coplanarTol: snaps[0]?.coplanarTol ?? COPLANAR_TOL_DEFAULT, vertices, edges, planes, faces, ...(Object.keys(edgeLayers).length ? { edgeLayers } : {}), ...(Object.keys(faceLayers).length ? { faceLayers } : {}) };
}

/** 法向按 brep 流的定点精度（2^-30）量化再单位化：现算的平面与文件里复原的平面得到同一组字节（写→读→写幂等）。 */
const N_FIX = 2 ** 30;
export function quantNormal(n: { x: number; y: number; z: number }): [number, number, number] {
  // `+ 0`：把 −0 归成 +0（cross3 会产出 −0 分量，float32 的符号位会让两次写的字节不同）
  const x = Math.round(n.x * N_FIX) / N_FIX + 0, y = Math.round(n.y * N_FIX) / N_FIX + 0, z = Math.round(n.z * N_FIX) / N_FIX + 0;
  const l = Math.hypot(x, y, z) || 1;
  return [x / l + 0, y / l + 0, z / l + 0];
}

/** 平滑组法向（快照版，与 render3.smoothNormals 同算法）：smooth 边连通的膜 = 一组；组内每个 (膜, 顶点) 的法向 = 组里含该顶点的膜法向按内角加权。
 *  返回 面下标 → (顶点下标 → 法向)；没平滑组的膜不在表里（用平面法向）。 */
export function smoothNormalsOf(snap: BrepSnapshot): Map<number, Map<number, [number, number, number]>> {
  const out = new Map<number, Map<number, [number, number, number]>>();
  const smooth = snap.edgeLayers?.smooth;
  if (!smooth?.length) return out;
  // 边 → 膜：按环边查
  const edgeKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const facesOfEdge = new Map<string, number[]>();
  snap.faces.forEach((f, fi) => { for (const r of [f.outer, ...f.holes]) for (let i = 0; i < r.length; i++) { const k = edgeKey(r[i], r[(i + 1) % r.length]); (facesOfEdge.get(k) ?? facesOfEdge.set(k, []).get(k)!).push(fi); } });
  const parent = new Map<number, number>();
  const find = (x: number): number => { let r = x; while (parent.get(r) !== undefined && parent.get(r) !== r) r = parent.get(r)!; return r; };
  const union = (a: number, b: number): void => { if (!parent.has(a)) parent.set(a, a); if (!parent.has(b)) parent.set(b, b); const ra = find(a), rb = find(b); if (ra !== rb) parent.set(ra, rb); };
  for (const ei of smooth) { const [a, b] = snap.edges[ei]; const fl = facesOfEdge.get(edgeKey(a, b)) ?? []; for (let i = 1; i < fl.length; i++) union(fl[0], fl[i]); }
  if (!parent.size) return out;
  const acc = new Map<string, [number, number, number]>();
  const V = snap.vertices;
  const sub = (p: { x: number; y: number; z: number }, q: { x: number; y: number; z: number }) => ({ x: p.x - q.x, y: p.y - q.y, z: p.z - q.z });
  snap.faces.forEach((f, fi) => {
    if (!parent.has(fi)) return;
    const g = find(fi), qn = quantNormal(snap.planes[f.plane].n), n = { x: qn[0], y: qn[1], z: qn[2] }, r = f.outer;
    for (let i = 0; i < r.length; i++) {
      const p = V[r[i]], a = V[r[(i + r.length - 1) % r.length]], b = V[r[(i + 1) % r.length]];
      const u = sub(a, p), v = sub(b, p);
      const lu = Math.hypot(u.x, u.y, u.z), lv = Math.hypot(v.x, v.y, v.z);
      const w = lu > 0 && lv > 0 ? Math.acos(Math.max(-1, Math.min(1, (u.x * v.x + u.y * v.y + u.z * v.z) / (lu * lv)))) : 0;
      const key = `${g}|${r[i]}`;
      const cur = acc.get(key) ?? [0, 0, 0];
      acc.set(key, [cur[0] + n.x * w, cur[1] + n.y * w, cur[2] + n.z * w]);
    }
  });
  snap.faces.forEach((f, fi) => {
    if (!parent.has(fi)) return;
    const g = find(fi), qn0 = quantNormal(snap.planes[f.plane].n), n = { x: qn0[0], y: qn0[1], z: qn0[2] };
    const m = new Map<number, [number, number, number]>();
    for (const vi of f.outer) {
      const v = acc.get(`${g}|${vi}`);
      if (!v) continue;
      const l = Math.hypot(v[0], v[1], v[2]);
      if (l < 1e-9) continue;
      let nn: [number, number, number] = [v[0] / l, v[1] / l, v[2] / l];
      if (nn[0] * n.x + nn[1] * n.y + nn[2] * n.z < 0) nn = [-nn[0], -nn[1], -nn[2]];
      m.set(vi, nn);
    }
    out.set(fi, m);
  });
  return out;
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
  const smooth = smoothNormalsOf(snap);
  const byMat = new Map<number, number[]>();   // core material → face indices；-1 = 默认材质
  const tris: number[] = [];                   // 省流档：没平滑组的默认材质面走共享顶点（无 NORMAL，加载器自算平面法向）
  snap.faces.forEach((f, i) => {
    const slot = snap.faceLayers?.material?.[i] ?? -1;
    const core = slot >= 0 ? mats?.slotToCore(slot) : undefined;
    if (core === undefined && !smooth.has(i)) { for (const t of triangulateRings(snap.vertices, snap.planes[f.plane], f.outer, f.holes)) tris.push(...t); return; }
    const key = core === undefined ? -1 : core;
    (byMat.get(key) ?? byMat.set(key, []).get(key)!).push(i);
  });
  const soft = new Set(snap.edgeLayers?.soft ?? []);
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
  // 每种材质一份 TRIANGLES primitive（逐角顶点：NORMAL 按平滑组、贴图材质带 TEXCOORD_0）；默认材质里**在平滑组内**的面也走这里（0.8：平滑法向逐角）
  for (const [core, faceIdxs] of [...byMat.entries()].sort((a, b) => a[0] - b[0])) {
    const size = core >= 0 ? (mats?.sizeOfCore(core) ?? null) : null;
    const P: number[] = [], N: number[] = [], UV: number[] = [];
    let mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const fi of faceIdxs) {
      const f = snap.faces[fi];
      const plane = snap.planes[f.plane];
      const basis = planeBasis(plane);
      const sm = smooth.get(fi);
      for (const t of triangulateRings(snap.vertices, plane, f.outer, f.holes)) {
        for (const vi of t) {
          const p = snap.vertices[vi];
          const y = [p.x, p.z, -p.y];
          P.push(y[0], y[1], y[2]);
          const nn = sm?.get(vi) ?? quantNormal(plane.n);
          N.push(nn[0], nn[2], -nn[1]);   // 法向同样换轴
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
    const nv = sink.add(encodeF32(N));
    targets.set(nv, GL_ARRAY_BUFFER);
    attributes.NORMAL = accessorBase + accessors.length;
    accessors.push({ bufferView: nv, componentType: GL_FLOAT, count: N.length / 3, type: "VEC3" });
    if (size) {
      const uv = sink.add(encodeF32(UV));
      targets.set(uv, GL_ARRAY_BUFFER);
      attributes.TEXCOORD_0 = accessorBase + accessors.length;
      accessors.push({ bufferView: uv, componentType: GL_FLOAT, count: UV.length / 2, type: "VEC2" });
    }
    primitives.push({ attributes, mode: MODE_TRIANGLES, ...(core >= 0 ? { material: core } : {}) });
  }
  return { accessors, bufferViewTargets: targets, mesh: { primitives } };
}

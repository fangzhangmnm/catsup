// bake.ts —— core = bake（契约 §4：只写不读；两原则 = 省流、三方 WYSIWYG；细则归导出器 spec）。
// v1：一个 definition → 一个 mesh：TRIANGLES（全部膜，共享顶点，float32 POSITION，无 NORMAL = 加载器自算平面法线）
// + LINES（全部边）。坐标换轴 Z-up → glTF Y-up：(x,y,z) → (x, z, -y)（与 obj-io 同规则）。created 2026-09-20 by Claude Fable 5.1

import type { BrepSnapshot } from "../kernel/kernel.ts";
import { COPLANAR_TOL_DEFAULT, dot3, planeBasis, type Pt3 } from "../kernel/geom.ts";
import type { MeshDoc } from "./document.ts";
import { encodeF32, encodeUints, pickUintType } from "./binary.ts";
import { triangulateFace, triangulateRings } from "./triangulate.ts";
import { kernelFromMeshDoc } from "../mesh/mesh-doc.ts";
import { meshViewOf } from "../mesh/mesh-view.ts";
import { F_HIDDEN, F_WIRE } from "../mesh/mesh-kernel.ts";
import { edgeSoft } from "../mesh/edge-smooth.ts";
import { fanNormal } from "../scene/fan-normal.ts";
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

/**
 * 平滑法向（快照版，与 editor/pool-mesh.ts fanNormal 同算法——屏幕上看到的 = 导出的；2026-10-26 DT96 起取代整组并查集版，Claude Opus 5.5）：
 * 每个 (膜, 外环角) 从这张膜出发，在这个顶点处向两边跨平滑边 / 折线（硬边、边界、非流形就停），扇里每张膜的法向按内角加权；
 * 跨边时「两张膜在共享边上走向相反 = 朝向一致」统一朝向；结果翻到本膜法向那一侧。硬边因此在平滑组里也断开明暗（旧版整组平均会把绕回来的硬接缝抹平）。
 * 返回 面下标 → (顶点下标 → 法向)；有平滑边连着别的膜的膜才在表里（其余用平面法向、走省流档）。
 */
export function smoothNormalsOf(snap: BrepSnapshot): Map<number, Map<number, [number, number, number]>> {
  const out = new Map<number, Map<number, [number, number, number]>>();
  const smooth = [...(snap.edgeLayers?.smooth ?? []), ...(snap.edgeLayers?.fold ?? [])];   // 折线（DT87）：面内部，明暗连续——和平滑边同待遇
  if (!smooth.length) return out;
  const edgeKey = (a: number, b: number): string => (a < b ? `${a}-${b}` : `${b}-${a}`);
  const facesOfEdge = new Map<string, number[]>();
  snap.faces.forEach((f, fi) => { for (const r of [f.outer, ...f.holes]) for (let i = 0; i < r.length; i++) { const k = edgeKey(r[i], r[(i + 1) % r.length]); (facesOfEdge.get(k) ?? facesOfEdge.set(k, []).get(k)!).push(fi); } });
  const smoothSet = new Set<string>();
  const members = new Set<number>();
  for (const ei of smooth) {
    const [a, b] = snap.edges[ei], k = edgeKey(a, b), fl = [...new Set(facesOfEdge.get(k) ?? [])];
    smoothSet.add(k);
    if (fl.length >= 2) for (const fi of fl) members.add(fi);
  }
  if (!members.size) return out;
  // 快照的环绕规范法向逆时针 = 面在环走向的左手边：+1 = 环里 a→b，−1 = b→a
  const dirOf = (fi: number, a: number, b: number): number => { for (const r of [snap.faces[fi].outer, ...snap.faces[fi].holes]) for (let i = 0; i < r.length; i++) { const x = r[i], y = r[(i + 1) % r.length]; if (x === a && y === b) return 1; if (x === b && y === a) return -1; } return 0; };
  /** 膜 fi 在顶点 v 处、边 (a, b) 之外的另一条环边。 */
  const otherEdgeAt = (fi: number, a: number, b: number, v: number): [number, number] | null => {
    for (const r of [snap.faces[fi].outer, ...snap.faces[fi].holes]) for (let i = 0; i < r.length; i++) {
      const x = r[i], y = r[(i + 1) % r.length];
      if (!((x === a && y === b) || (x === b && y === a))) continue;
      const m = r.length, j = r.indexOf(v);
      if (j < 0) return null;
      const prev = r[(j - 1 + m) % m], next = r[(j + 1) % m];
      const o = a === v ? b : a;
      return next === o ? [prev, v] : [v, next];
    }
    return null;
  };
  const V = snap.vertices;
  const nOf = (fi: number): { x: number; y: number; z: number } => { const q = quantNormal(snap.planes[snap.faces[fi].plane].n); return { x: q[0], y: q[1], z: q[2] }; };
  const angleAt = (fi: number, j: number): number => {
    const r = snap.faces[fi].outer, p = V[r[j]], a = V[r[(j + r.length - 1) % r.length]], b = V[r[(j + 1) % r.length]];
    const ux = a.x - p.x, uy = a.y - p.y, uz = a.z - p.z, vx = b.x - p.x, vy = b.y - p.y, vz = b.z - p.z;
    const lu = Math.hypot(ux, uy, uz), lv = Math.hypot(vx, vy, vz);
    return lu > 0 && lv > 0 ? Math.acos(Math.max(-1, Math.min(1, (ux * vx + uy * vy + uz * vz) / (lu * lv)))) : 0;
  };
  for (const fi of [...members].sort((a, b) => a - b)) {
    const r = snap.faces[fi].outer, n = nOf(fi), m = new Map<number, [number, number, number]>();
    for (let j = 0; j < r.length; j++) {
      const v = r[j], w0 = angleAt(fi, j);
      let ax = n.x * w0, ay = n.y * w0, az = n.z * w0;
      const seen = new Set<number>([fi]);
      for (const start of [[v, r[(j + 1) % r.length]], [r[(j - 1 + r.length) % r.length], v]] as [number, number][]) {
        let cur = fi, sign = 1, [x, y] = start;
        for (let step = 0; step < 256; step++) {
          const k = edgeKey(x, y);
          if (!smoothSet.has(k)) break;
          const others = [...new Set(facesOfEdge.get(k) ?? [])].filter((g) => g !== cur);
          if (others.length !== 1) break;
          const nx = others[0];
          if (seen.has(nx)) break;
          const da = dirOf(cur, x, y), db = dirOf(nx, x, y);
          if (!da || !db) break;
          sign *= da * db < 0 ? 1 : -1;
          seen.add(nx);
          const jj = snap.faces[nx].outer.indexOf(v);
          if (jj >= 0) { const rn = nOf(nx), w = angleAt(nx, jj) * sign; ax += rn.x * w; ay += rn.y * w; az += rn.z * w; }
          const ne = otherEdgeAt(nx, x, y, v);
          if (!ne) break;
          [x, y] = ne; cur = nx;
        }
      }
      const l = Math.hypot(ax, ay, az);
      if (l < 1e-9) continue;
      let nn: [number, number, number] = [ax / l, ay / l, az / l];
      if (nn[0] * n.x + nn[1] * n.y + nn[2] * n.z < 0) nn = [-nn[0], -nn[1], -nn[2]];
      m.set(v, nn);
    }
    out.set(fi, m);
  }
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
  const hiddenF = snap.faceLayers?.hidden;   // DT49 隐藏的面 / 边不出（契约 §4「hidden 不出」）
  snap.faces.forEach((f, i) => {
    if (hiddenF && (hiddenF[i] ?? -1) >= 0) return;
    const slot = snap.faceLayers?.material?.[i] ?? -1;
    const core = slot >= 0 ? mats?.slotToCore(slot) : undefined;
    if (core === undefined && !smooth.has(i)) { for (const t of triangulateRings(snap.vertices, snap.planes[f.plane], f.outer, f.holes)) tris.push(...t); return; }
    const key = core === undefined ? -1 : core;
    (byMat.get(key) ?? byMat.set(key, []).get(key)!).push(i);
  });
  const soft = new Set([...(snap.edgeLayers?.soft ?? []), ...(snap.edgeLayers?.hidden ?? []), ...(snap.edgeLayers?.fold ?? [])]);   // 软边 / 隐藏的边 / 折线（DT87：面内部的折痕，屏幕上不画）不出线——导出的 = 屏幕上的（2026-10-26 补折线）
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

/**
 * mesh 身体的 bake（M3，2026-10-27 Claude Fable 5.1；2026-10-28 Claude Opus 5.5 补法向 + 绕向，纪元账本 FM130）：真相在 CATSUP_mesh 载荷（多边形 / 标记 / 默认平滑）里，
 * 这里只出给别的查看器看的派生物。三角形按材质 core 分 primitive，**每组自己的 POSITION + NORMAL**（逐角法向 = scene/fan-normal.ts 扇内法线，平滑判定 = mesh/edge-smooth.ts——
 * 和屏幕上同一个算法；同一组里位置和法向都一样的角合成一个顶点：光滑的地方共用、棱上自然分开）；三角形按面自己的绕向切（triangulateFace）。
 * 以前没写 NORMAL（glTF：查看器自己按三角形算平面法向 = 一律一棱一棱）、且约一半三角形反了（user 10-27「导出的时候面的法向一堆错误」）。
 * LINES = 画线的边（mesh/edge-smooth.ts edgeSoft 判：手标软 / 没手标且默认平滑判成平滑的不出；隐藏的不出）+ 裸线，用全体顶点那份 POSITION（accessorBase）。
 */
export function bakeMesh(m: MeshDoc, sink: ViewSink, accessorBase: number, mats?: BakeMaterials): BakeResult {
  const accessors: Record<string, unknown>[] = [], targets = new Map<number, number>(), primitives: Record<string, unknown>[] = [];
  const nV = Math.floor(m.positions.length / 3);
  if (!nV) return { accessors, bufferViewTargets: targets, mesh: { primitives } };
  const k = kernelFromMeshDoc(m, "bake");   // 新内核：顶点 id = 载荷下标、面 id = 载荷面序号（按序加、没有空位）
  const view = meshViewOf(k);
  const yUp = (p: Pt3): [number, number, number] => [p.x, p.z, -p.y];
  const pos: number[] = [];
  let min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < nV; i++) {
    const y = yUp({ x: m.positions[3 * i], y: m.positions[3 * i + 1], z: m.positions[3 * i + 2] });
    pos.push(y[0], y[1], y[2]);
    min = [Math.min(min[0], y[0]), Math.min(min[1], y[1]), Math.min(min[2], y[2])];
    max = [Math.max(max[0], y[0]), Math.max(max[1], y[1]), Math.max(max[2], y[2])];
  }
  const posView = sink.add(encodeF32(pos));
  targets.set(posView, GL_ARRAY_BUFFER);
  accessors.push({ bufferView: posView, componentType: GL_FLOAT, count: nV, type: "VEC3", min, max });
  // 三角形：按材质 core 分组，每组逐角（位置 + 扇内法线）去重成顶点
  interface Group { P: number[]; N: number[]; idx: number[]; key: Map<string, number>; mn: number[]; mx: number[] }
  const groups = new Map<number, Group>();
  for (const f of k.faces()) {
    if (k.isFaceHidden(f)) continue;   // 隐藏的面不出
    const ring = k.faceVerts(f), slot = k.faceMat[f], core = slot >= 0 ? mats?.slotToCore(slot) : undefined, gk = core === undefined ? -1 : core;
    const G = groups.get(gk) ?? groups.set(gk, { P: [], N: [], idx: [], key: new Map(), mn: [Infinity, Infinity, Infinity], mx: [-Infinity, -Infinity, -Infinity] }).get(gk)!;
    const corner = ring.map((v, j) => {
      const nn = fanNormal(view, f, j), q = quantNormal(nn), key = `${v}|${q[0]},${q[1]},${q[2]}`;
      let id = G.key.get(key);
      if (id === undefined) {
        id = G.P.length / 3; G.key.set(key, id);
        const y = yUp(k.pt(v)); G.P.push(y[0], y[1], y[2]); G.N.push(q[0], q[2], -q[1]);   // 法向同样换轴
        G.mn = [Math.min(G.mn[0], y[0]), Math.min(G.mn[1], y[1]), Math.min(G.mn[2], y[2])]; G.mx = [Math.max(G.mx[0], y[0]), Math.max(G.mx[1], y[1]), Math.max(G.mx[2], y[2])];
      }
      return id;
    });
    for (const [a, b, c] of triangulateFace(ring.map((v) => k.pt(v)))) G.idx.push(corner[a], corner[b], corner[c]);
  }
  for (const [core, G] of [...groups].sort((a, b) => a[0] - b[0])) {
    if (!G.idx.length) continue;
    const t = pickUintType(Math.max(0, G.P.length / 3 - 1)), gl = t === "uint8" ? GL_UNSIGNED_BYTE : t === "uint16" ? GL_UNSIGNED_SHORT : GL_UNSIGNED_INT, enc = t === "uint64" ? "uint32" : t;
    const pv = sink.add(encodeF32(G.P)); targets.set(pv, GL_ARRAY_BUFFER);
    const posAcc = accessorBase + accessors.length;
    accessors.push({ bufferView: pv, componentType: GL_FLOAT, count: G.P.length / 3, type: "VEC3", min: G.mn, max: G.mx });
    const nv = sink.add(encodeF32(G.N)); targets.set(nv, GL_ARRAY_BUFFER);
    const norAcc = accessorBase + accessors.length;
    accessors.push({ bufferView: nv, componentType: GL_FLOAT, count: G.N.length / 3, type: "VEC3" });
    const tv = sink.add(encodeUints(G.idx, enc)); targets.set(tv, GL_ELEMENT_ARRAY_BUFFER);
    const idxAcc = accessorBase + accessors.length;
    accessors.push({ bufferView: tv, componentType: gl, count: G.idx.length, type: "SCALAR" });
    primitives.push({ attributes: { POSITION: posAcc, NORMAL: norAcc }, indices: idxAcc, mode: MODE_TRIANGLES, ...(core >= 0 ? { material: core } : {}) });
  }
  // 线：画线的边（不软、不隐藏）——面上的边看面显没显，裸线看自己
  const lines: number[] = [];
  for (const e of k.edges()) {
    const fl = k.edgeFlags[e], faces = k.eFaces(e);
    if (fl & F_HIDDEN) continue;
    if (!faces.length) { if (fl & F_WIRE) lines.push(k.edgeA[e], k.edgeB[e]); continue; }
    if ([...faces].every((f) => k.isFaceHidden(f))) continue;
    if (!edgeSoft(k, e)) lines.push(k.edgeA[e], k.edgeB[e]);
  }
  if (lines.length) {
    const t = pickUintType(Math.max(0, nV - 1)), gl = t === "uint8" ? GL_UNSIGNED_BYTE : t === "uint16" ? GL_UNSIGNED_SHORT : GL_UNSIGNED_INT, enc = t === "uint64" ? "uint32" : t;
    const lv = sink.add(encodeUints(lines, enc));
    targets.set(lv, GL_ELEMENT_ARRAY_BUFFER);
    const acc = accessorBase + accessors.length;
    accessors.push({ bufferView: lv, componentType: gl, count: lines.length, type: "SCALAR" });
    primitives.push({ attributes: { POSITION: accessorBase }, indices: acc, mode: MODE_LINES });
  }
  return { accessors, bufferViewTargets: targets, mesh: { primitives } };
}

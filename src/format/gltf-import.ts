// gltf-import.ts —— 外来 glb → 中间数据（纪元排期 T11 / 账本 DT2 前半段；纯函数、零 DOM、不碰场景）。created 2026-10-26 by Claude Opus 5.5
// user 10-25：「拒开glb，但是可以导入，现在先只做一个以后必然sunset的，然后导入的时候保持里面的hierarchy，map成component……以后肯定要变成mesh的然后mesh转brep」。
// 把要 sunset 的那段切到最小（账本 §3.1 T11 AI 看法，user 同意）：这里只管「glb → 节点树 + 每个网格的三角 + 变换 + 名字 + 丢了什么」，
// 后半段「中间数据 → brep 组件」在 scene/import-build.ts；以后有 mesh 了只换后半段，格式 × 去向 = N + M 不是 N × M。
// 坐标在文件边界做 Y-up → Z-up（同 OBJ：(X, Y, Z) → (X, −Z, Y)）：网格点 p' = C·p，节点矩阵 M' = C·M·C⁻¹（世界链 C·M₁·M₂·p 不变）。
import type { Pt3 } from "../kernel/kernel.ts";
import type { Xform } from "../scene/xform.ts";
import { decodeGlb } from "./glb.ts";
import { isCatsupGltf } from "./read.ts";

export interface ImportMesh { name: string; /** Z-up 坐标。 */ positions: Pt3[]; /** 每个顶点的文件法线（Z-up；这个图元没法线 = null）；整个网格都没有 = 不带。软硬边靠它（mesh/tri-soup.ts meshFromSplitTriangles）。 */ normals?: (Pt3 | null)[]; /** 三角（每 3 个下标一个）。 */ tris: number[];
  /** 多边形（OBJ：四边形 / n 边形原样；有它就不看 tris）+ 每个多边形的平滑组（OBJ 的 s；0 = 关）。format/obj-import.ts */ polys?: number[][]; smoothGroups?: number[] }
export interface ImportNode { name: string; /** 局部变换（Z-up）。 */ xform: Xform; mesh: number | null; children: number[] }
export interface ImportScene { name: string; nodes: ImportNode[]; meshes: ImportMesh[]; roots: number[]; /** 进门时丢掉的东西（人话，导入后说一次）。 */ losses: string[] }

type Json = Record<string, unknown>;
const arr = (v: unknown): Json[] => (Array.isArray(v) ? (v as Json[]) : []);

/** 是能读的 glb、但不是 CatsUp 的文件（别的软件导出的）——「打开」拒、「导入」收。 */
export function isForeignGlb(bytes: Uint8Array): boolean {
  try { const { json } = decodeGlb(bytes); return !!json && typeof json === "object" && !isCatsupGltf(json); } catch { return false; }
}

/** 读外来 glb。name = 文件名（做外层组件的名字）。不是 glb / 结构坏 → 抛（人话）。 */
export function readForeignGlb(bytes: Uint8Array, name: string): ImportScene {
  let parts: ReturnType<typeof decodeGlb>;
  try { parts = decodeGlb(bytes); } catch (e) { throw new Error(`不是能读的 glb：${e instanceof Error ? e.message : String(e)}`); }
  const g = (parts.json ?? {}) as Json, bin = parts.bin;
  const losses = new Set<string>();
  const buffers = arr(g.buffers), views = arr(g.bufferViews), accessors = arr(g.accessors);
  const bufferBytes = (i: number): Uint8Array | null => { const b = buffers[i]; if (!b) return null; if (b.uri !== undefined) { losses.add("外部缓冲文件（只读 glb 里自带的）"); return null; } return i === 0 ? bin : null; };
  /** 读一个 accessor 成数字数组（每元素 n 个分量）。 */
  const read = (ai: number): { data: number[]; n: number } | null => {
    const a = accessors[ai];
    if (!a) return null;
    if (a.sparse) losses.add("稀疏数据（sparse accessor）");
    const n = ({ SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 } as Record<string, number>)[String(a.type)] ?? 0;
    const count = Number(a.count) || 0, ct = Number(a.componentType);
    const size = ct === 5126 || ct === 5125 ? 4 : ct === 5123 || ct === 5122 ? 2 : ct === 5121 || ct === 5120 ? 1 : 0;
    if (!n || !size || a.bufferView === undefined) return null;
    const v = views[Number(a.bufferView)];
    if (!v) return null;
    const buf = bufferBytes(Number(v.buffer ?? 0));
    if (!buf) return null;
    const stride = Number(v.byteStride) || n * size, base = (Number(v.byteOffset) || 0) + (Number(a.byteOffset) || 0);
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength), out: number[] = [];
    for (let i = 0; i < count; i++) for (let c = 0; c < n; c++) {
      const o = base + i * stride + c * size;
      if (o + size > buf.byteLength) return null;
      out.push(ct === 5126 ? dv.getFloat32(o, true) : ct === 5125 ? dv.getUint32(o, true) : ct === 5123 ? dv.getUint16(o, true) : ct === 5122 ? dv.getInt16(o, true) : ct === 5121 ? dv.getUint8(o) : dv.getInt8(o));
    }
    return { data: out, n };
  };
  const toZup = (x: number, y: number, z: number): Pt3 => ({ x, y: -z, z: y });
  // 网格：所有三角形图元并进一个网格（材质丢掉）
  const meshes: ImportMesh[] = arr(g.meshes).map((m, mi) => {
    const positions: Pt3[] = [], tris: number[] = [], normals: (Pt3 | null)[] = [];
    let anyNormal = false;
    for (const p of arr(m.primitives)) {
      const mode = p.mode === undefined ? 4 : Number(p.mode);
      const attrs = (p.attributes ?? {}) as Json;
      for (const k of Object.keys(attrs)) if (k === "NORMAL") continue; else if (k.startsWith("TEXCOORD")) losses.add("贴图坐标（UV）"); else if (k.startsWith("JOINTS") || k.startsWith("WEIGHTS")) losses.add("蒙皮"); else if (k.startsWith("COLOR")) losses.add("顶点色");
      if (p.material !== undefined) losses.add("材质 / 贴图");
      if (p.targets) losses.add("变形目标（morph）");
      if (mode !== 4 && mode !== 5 && mode !== 6) { losses.add("点 / 线图元（只收三角面）"); continue; }
      const pos = attrs.POSITION === undefined ? null : read(Number(attrs.POSITION));
      if (!pos || pos.n !== 3) continue;
      const base = positions.length, count = pos.data.length / 3;
      for (let i = 0; i < count; i++) positions.push(toZup(pos.data[i * 3], pos.data[i * 3 + 1], pos.data[i * 3 + 2]));
      const nr = attrs.NORMAL === undefined ? null : read(Number(attrs.NORMAL));   // 法线只拿来判软硬边（平滑组），不存
      if (nr && nr.n === 3 && nr.data.length === count * 3) { anyNormal = true; for (let i = 0; i < count; i++) normals.push(toZup(nr.data[i * 3], nr.data[i * 3 + 1], nr.data[i * 3 + 2])); }
      else for (let i = 0; i < count; i++) normals.push(null);
      const idx = p.indices === undefined ? Array.from({ length: count }, (_, i) => i) : (read(Number(p.indices))?.data ?? []);
      if (mode === 4) for (let i = 0; i + 2 < idx.length; i += 3) tris.push(base + idx[i], base + idx[i + 1], base + idx[i + 2]);
      else if (mode === 5) for (let i = 0; i + 2 < idx.length; i++) tris.push(base + idx[i], base + idx[i + (i % 2 ? 2 : 1)], base + idx[i + (i % 2 ? 1 : 2)]);   // 三角带：奇数个翻绕向
      else for (let i = 1; i + 1 < idx.length; i++) tris.push(base + idx[0], base + idx[i], base + idx[i + 1]);   // 三角扇
    }
    return anyNormal ? { name: String(m.name ?? `网格 ${mi}`), positions, normals, tris } : { name: String(m.name ?? `网格 ${mi}`), positions, tris };
  });
  // 节点：TRS 或矩阵 → 3×4（Y-up），再换到 Z-up
  const nodes: ImportNode[] = arr(g.nodes).map((n, ni) => {
    let M: Xform;
    if (Array.isArray(n.matrix) && n.matrix.length === 16) {
      const c = n.matrix as number[];   // 列主序 4×4
      M = [c[0], c[4], c[8], c[12], c[1], c[5], c[9], c[13], c[2], c[6], c[10], c[14]];
    } else {
      const t = (n.translation as number[] | undefined) ?? [0, 0, 0], q = (n.rotation as number[] | undefined) ?? [0, 0, 0, 1], s = (n.scale as number[] | undefined) ?? [1, 1, 1];
      const [x, y, z, w] = q, R = [1 - 2 * (y * y + z * z), 2 * (x * y - z * w), 2 * (x * z + y * w), 2 * (x * y + z * w), 1 - 2 * (x * x + z * z), 2 * (y * z - x * w), 2 * (x * z - y * w), 2 * (y * z + x * w), 1 - 2 * (x * x + y * y)];
      M = [R[0] * s[0], R[1] * s[1], R[2] * s[2], t[0], R[3] * s[0], R[4] * s[1], R[5] * s[2], t[1], R[6] * s[0], R[7] * s[1], R[8] * s[2], t[2]];
    }
    if (n.skin !== undefined) losses.add("蒙皮");
    if (n.camera !== undefined) losses.add("相机");
    if (n.extensions && (n.extensions as Json).KHR_lights_punctual) losses.add("灯光");
    return { name: String(n.name ?? `节点 ${ni}`), xform: conjZup(M), mesh: n.mesh === undefined ? null : Number(n.mesh), children: Array.isArray(n.children) ? (n.children as number[]).map(Number) : [] };
  });
  if (arr(g.animations).length) losses.add("动画");
  const scenes = arr(g.scenes), sIdx = Number(g.scene ?? 0);
  let roots = Array.isArray(scenes[sIdx]?.nodes) ? (scenes[sIdx].nodes as number[]).map(Number) : [];
  if (!roots.length) { const child = new Set(nodes.flatMap((n) => n.children)); roots = nodes.map((_, i) => i).filter((i) => !child.has(i)); }
  return { name, nodes, meshes, roots, losses: [...losses] };
}

/** 文件的上方向（glTF 标准 = Y 朝上；有些导出器按 Z 朝上写）。 */
export type ImportUp = "y" | "z";
/** 文件单位 → 米（glTF 标准 = 米）。 */
export const IMPORT_UNITS: Readonly<Record<string, number>> = { m: 1, cm: 0.01, mm: 0.001, in: 0.0254, ft: 0.3048 };
/**
 * 按「上方向 + 文件单位」重新摆中间数据（DT84 导入后的参数小窗，user 10-26「import coordinate 方向可以设置吗，以及scaling。能预览吗」→「同意」）：
 * readForeignGlb 已按 Y 朝上换成 Z 朝上；文件其实是 Z 朝上 → 再乘回 C⁻¹（点 p → C⁻¹p、节点 M → C⁻¹MC）；单位 = 均匀缩放（点 × s、节点平移 × s）。
 * 纯函数、不改原数据。
 */
export function reorientImport(data: ImportScene, up: ImportUp, unitM: number): ImportScene {
  if (up === "y" && unitM === 1) return data;
  const s = unitM;
  // 线性部分 A = s · (up === "z" ? C⁻¹ : I)；C⁻¹ = (x, y, z) → (x, z, −y)
  const A = (p: Pt3): Pt3 => (up === "z" ? { x: p.x * s, y: p.z * s, z: -p.y * s } : { x: p.x * s, y: p.y * s, z: p.z * s });
  const Am: number[][] = up === "z" ? [[s, 0, 0], [0, 0, s], [0, -s, 0]] : [[s, 0, 0], [0, s, 0], [0, 0, s]];
  const Ai: number[][] = up === "z" ? [[1 / s, 0, 0], [0, 0, -1 / s], [0, 1 / s, 0]] : [[1 / s, 0, 0], [0, 1 / s, 0], [0, 0, 1 / s]];
  const mul = (P: number[][], Q: number[][]): number[][] => P.map((r) => [0, 1, 2].map((j) => r[0] * Q[0][j] + r[1] * Q[1][j] + r[2] * Q[2][j]));
  const conj = (M: Xform): Xform => {
    const L = mul(mul(Am, [[M[0], M[1], M[2]], [M[4], M[5], M[6]], [M[8], M[9], M[10]]]), Ai), t = A({ x: M[3], y: M[7], z: M[11] });
    return [L[0][0], L[0][1], L[0][2], t.x, L[1][0], L[1][1], L[1][2], t.y, L[2][0], L[2][1], L[2][2], t.z];
  };
  const R = (p: Pt3 | null): Pt3 | null => (p && up === "z" ? { x: p.x, y: p.z, z: -p.y } : p);   // 法线只转方向（只拿来互相比，缩放不影响）
  return { ...data, meshes: data.meshes.map((m) => ({ ...m, positions: m.positions.map(A), ...(m.normals ? { normals: m.normals.map(R) } : {}) })), nodes: data.nodes.map((n) => ({ ...n, xform: conj(n.xform) })) };
}

/** Y-up 的局部变换换到 Z-up：M' = C·M·C⁻¹，C = (x, y, z) → (x, −z, y)。 */
function conjZup(M: Xform): Xform {
  // C = [[1,0,0],[0,0,-1],[0,1,0]]，C⁻¹ = Cᵀ = [[1,0,0],[0,0,1],[0,-1,0]]
  const L = [[M[0], M[1], M[2]], [M[4], M[5], M[6]], [M[8], M[9], M[10]]], t = [M[3], M[7], M[11]];
  const C = [[1, 0, 0], [0, 0, -1], [0, 1, 0]], Ci = [[1, 0, 0], [0, 0, 1], [0, -1, 0]];
  const mul = (A: number[][], B: number[][]): number[][] => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  const R = mul(mul(C, L), Ci), tt = [t[0], -t[2], t[1]];
  return [R[0][0], R[0][1], R[0][2], tt[0], R[1][0], R[1][1], R[1][2], tt[1], R[2][0], R[2][1], R[2][2], tt[2]];
}

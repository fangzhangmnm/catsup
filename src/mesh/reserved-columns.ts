// mesh/reserved-columns.ts —— 带保留名的列（属性地基轮第三步；规程 ai-docs/20261112-attribute-protocol.md 第二½节、第八¾节的保留名表、第九½节）。created 2026-11-13 by Claude Opus 5.5
// 核心（mesh-kernel / columns / merge-points）不认任何名字、不 import 这里（守卫 test/reserved-columns.test.ts）；操作和读的人按名字从这里取。
// 带保留名的列和用户以后自己加的是同一种槽：可以没有（= 每个元素都是缺省值，第一次写进非缺省值时才建）、可以删（= 全部回缺省值）。
// 名字在整个物体里不重复：照 Blender 把类别写进名字（面上的隐藏 hide_poly、边上的隐藏 hide_edge；Blender 原名带前导点，我们不带）。
// 3b 落面上的两列，3c 落边上的五列。是不是保留名只看名字在不在 RESERVED_FACE / RESERVED_EDGE 这两张表里（统筹 11-13：声明上不另带「内置」记号）。
// 读的人：热路径（渲染、导出、拾取）先拿 hiddenColumn / materialColumn 那个列对象（data 永远是现在那条），没有 = 全是缺省值；rev 变了再拿一次。
import type { EdgeColumn, FaceColumn, MeshKernel } from "./mesh-kernel.ts";
import { F_HIDDEN, F_SEAM, F_SHARP, F_SMOOTH, F_SOFT, F_WIRE } from "./edge-bits.ts";
import type { ColumnDef } from "./columns.ts";

/** 面上的隐藏：不画、不吸、点不中、导出不出。都藏才藏（并面一藏一不藏 = 看得见，统筹 11-13）；新长的不跟旁边。 */
export const HIDE_POLY: ColumnDef = Object.freeze({ id: "hide_poly", on: "face", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" });
/**
 * 面用网格体材质槽表（MeshBody.materialSlots）的第几个：缺省 −1 = 没有槽 = 缺省材质（我们的物体可以一个槽都没有，−1 是一个真的状态，不照 Blender 的 0）；
 * 并面留排在最前的那张的；新长的跟旁边（挤出的侧面、倒角的补片照抄被挤 / 被倒的那张面）。
 */
export const MATERIAL_INDEX: ColumnDef = Object.freeze({ id: "material_index", on: "face", type: "int", continuous: false, fill: -1, merge: "first", followNeighbor: true });
/** 这一步的保留名（属性页、守卫用）。 */
export const RESERVED_FACE: readonly ColumnDef[] = Object.freeze([HIDE_POLY, MATERIAL_INDEX]);

const faceCol = (k: MeshKernel, d: ColumnDef): FaceColumn | null => { const c = k.column(d.id); return c && c.def.on === "face" ? (c as FaceColumn) : null; };
/** 面上的隐藏这一列（拿在手里读；没有 = null = 全都看得见）。 */
export const hiddenColumn = (k: MeshKernel): FaceColumn | null => faceCol(k, HIDE_POLY);
/** 材质槽号这一列（拿在手里读；没有 = null = 全是 −1）。 */
export const materialColumn = (k: MeshKernel): FaceColumn | null => faceCol(k, MATERIAL_INDEX);
/** 这张面藏着吗。 */
export function faceHidden(k: MeshKernel, f: number): boolean { const c = hiddenColumn(k); return !!c && k.hasF(f) && c.data[f] === 1; }
/** 这张面用第几个材质槽（−1 = 没有槽）。 */
export function faceMaterial(k: MeshKernel, f: number): number { const c = materialColumn(k); return c && k.hasF(f) ? c.data[f] : MATERIAL_INDEX.fill; }
/** 写一张面藏不藏（第一次写「藏」才建这一列；没有这一列时写「不藏」= 什么都不做）。 */
export function setFaceHidden(k: MeshKernel, f: number, on: boolean): void {
  if (!k.hasF(f)) return;
  if (!hiddenColumn(k)) { if (!on) return; k.addColumn(HIDE_POLY); }
  k.setFaceValue(f, HIDE_POLY.id, on ? 1 : 0);
}
/** 写一张面的材质槽号（第一次写非 −1 才建这一列）。 */
export function setFaceMaterial(k: MeshKernel, f: number, slot: number): void {
  if (!k.hasF(f)) return;
  if (!materialColumn(k)) { if (slot === MATERIAL_INDEX.fill) return; k.addColumn(MATERIAL_INDEX); }
  k.setFaceValue(f, MATERIAL_INDEX.id, slot);
}
/**
 * 凭空来的面（装载、基本体、导入、粘贴）给定的材质 / 隐藏：要写非缺省值的列先建好，返回交给 fresh 来历的面上的值（base 里别的列原样带上）。
 * 来历本身由调用方写（「凭空来的」只许出现在白名单里的文件，守卫 test/corner-columns.test.ts）。
 */
export function givenFaceValues(k: MeshKernel, o: { material?: number; hidden?: boolean }, base?: ReadonlyMap<string, number>): Map<string, number> {
  const face = new Map(base ?? []);
  if (o.material !== undefined && o.material !== MATERIAL_INDEX.fill) { if (!materialColumn(k)) k.addColumn(MATERIAL_INDEX); face.set(MATERIAL_INDEX.id, o.material); }
  if (o.hidden) { if (!hiddenColumn(k)) k.addColumn(HIDE_POLY); face.set(HIDE_POLY.id, 1); }
  return face;
}

// ---------------------------------------------------------------- 边上的五列（3c）
// 都是布尔、缺省 0。并成：棱、平滑、不画线、隐藏 = 都有才留（defaultIfMixed）；接缝 = 有一个就留（firstNonDefault）。新长的边全是缺省值。
/** 强制是棱（手标的棱）：明暗断开；画不画线由 soft 推（edge-smooth.ts）。Blender 的 sharp_edge。 */
export const SHARP_EDGE: ColumnDef = Object.freeze({ id: "sharp_edge", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" });
/** 平滑：明暗跨过这条边连续——压过物体的「默认平滑」的覆盖（SketchUp 的 smooth 是全部真相，硬表面归一时定，规程第九½节）。 */
export const SMOOTH: ColumnDef = Object.freeze({ id: "smooth", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" });
/** 柔边：不画线。SketchUp 的 soft 还有「两边的面算一整块」那一半，网格体的工具现在只读不画线那一半（选面连带一片按明暗判，归一时两个引擎定成一样）。 */
export const SOFT: ColumnDef = Object.freeze({ id: "soft", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" });
/** 展开的接缝（自动标接缝写、展开在这里剪开、画成红线）。Blender 的 uv_seam。 */
export const UV_SEAM: ColumnDef = Object.freeze({ id: "uv_seam", on: "edge", type: "bool", continuous: false, fill: 0, merge: "firstNonDefault" });
/** 边上的隐藏：不画、不导出成线、点不中、扩选跳过；读的人按这一列单独判，不从面推（规程第九½节）。名字照 Blender 把类别写进去。 */
export const HIDE_EDGE: ColumnDef = Object.freeze({ id: "hide_edge", on: "edge", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed" });
export const RESERVED_EDGE: readonly ColumnDef[] = Object.freeze([SHARP_EDGE, SMOOTH, SOFT, UV_SEAM, HIDE_EDGE]);

/** 边上的一列（拿在手里读；没有 = null = 全是 0）。 */
export const edgeColumn = (k: MeshKernel, d: ColumnDef): EdgeColumn | null => { const c = k.column(d.id); return c && c.def.on === "edge" ? (c as EdgeColumn) : null; };
/** 这条边有这个标记吗（没有这一列 = 没有）。 */
export function edgeMark(k: MeshKernel, e: number, d: ColumnDef): boolean { const c = edgeColumn(k, d); return !!c && k.hasE(e) && c.data[e] === 1; }
/**
 * 成批问一列（每条边都问的：画线、导出、整模型判平滑）：列对象一次拿在手里，返回「这条边有没有这个标记」（3d，统筹 11-13：单条问每次按名字找列，
 * 16 万面上整模型判一遍慢 28–45%）。只在这一趟用：内核改了（rev 变了，列数组扩容会换）要重拿；边要是活的（调用的地方按 k.edges() 走）。
 */
export function edgeMarkReader(k: MeshKernel, d: ColumnDef): (e: number) => boolean {
  const c = edgeColumn(k, d);
  if (!c) return () => false;
  const data = c.data;
  return (e) => data[e] === 1;
}
/** 写一条边的标记（操作本意 / 指令点名写的；第一次写「有」才建这一列，没有这一列时写「没有」= 什么都不做）。 */
export function setEdgeMark(k: MeshKernel, e: number, d: ColumnDef, on: boolean): void {
  if (!k.hasE(e)) return;
  if (!edgeColumn(k, d)) { if (!on) return; k.addColumn(d); }
  k.setEdgeValue(e, d.id, on ? 1 : 0);
}

// ---------------------------------------------------------------- 文件 / 剪贴板载荷里那个字节 ↔ 列（门口用；内存里是列，载荷的形状不变）
/** 字节里每一位是哪一列（edge-bits.ts 的位）；F_WIRE 是结构位（内核自己记），64 / 128 没有定义。 */
export const EDGE_BYTE_BITS: readonly (readonly [ColumnDef, number])[] = Object.freeze([[SOFT, F_SOFT], [SMOOTH, F_SMOOTH], [UV_SEAM, F_SEAM], [HIDE_EDGE, F_HIDDEN], [SHARP_EDGE, F_SHARP]] as const);
/** 字节里定义了的位（五列 + 裸线）；别的位 = 这一版不认识（读的门口去掉、记一笔）。 */
export const EDGE_BYTE_KNOWN = EDGE_BYTE_BITS.reduce((a, [, b]) => a | b, F_WIRE);
/** 一条边打包成那个字节。 */
export function packEdgeByte(k: MeshKernel, e: number): number {
  let b = k.isWire(e) ? F_WIRE : 0;
  for (const [d, bit] of EDGE_BYTE_BITS) if (edgeMark(k, e, d)) b |= bit;
  return b;
}
/** 那个字节拆回一条已经在的边（列第一次有值才建；裸线位 = 结构位）。字节里不认识的位调用的地方先去掉（读的门口）。 */
export function unpackEdgeByte(k: MeshKernel, e: number, b: number): void {
  if (b & ~EDGE_BYTE_KNOWN) throw new Error(`unpackEdgeByte: bits ${b & ~EDGE_BYTE_KNOWN} are not defined (the read door drops them first)`);
  for (const [d, bit] of EDGE_BYTE_BITS) setEdgeMark(k, e, d, (b & bit) !== 0);
  if (b & F_WIRE) k.setWire(e, true);
}

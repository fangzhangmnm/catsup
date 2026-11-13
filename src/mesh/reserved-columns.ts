// mesh/reserved-columns.ts —— 带保留名的列（属性地基轮第三步；规程 ai-docs/20261112-attribute-protocol.md 第二½节、第八¾节的保留名表、第九½节）。created 2026-11-13 by Claude Opus 5.5
// 核心（mesh-kernel / columns / merge-points）不认任何名字、不 import 这里（守卫 test/reserved-columns.test.ts）；操作和读的人按名字从这里取。
// 带保留名的列和用户以后自己加的是同一种槽：可以没有（= 每个元素都是缺省值，第一次写进非缺省值时才建）、可以删（= 全部回缺省值）。
// 名字在整个物体里不重复：照 Blender 把类别写进名字（面上的隐藏 hide_poly、边上的隐藏 hide_edge；Blender 原名带前导点，我们不带）。
// 3b 落面上的两列；边上的五列（sharp_edge / smooth / soft / uv_seam / hide_edge）3c 落。
// 读的人：热路径（渲染、导出、拾取）先拿 hiddenColumn / materialColumn 那个列对象（data 永远是现在那条），没有 = 全是缺省值；rev 变了再拿一次。
import type { FaceColumn, MeshKernel } from "./mesh-kernel.ts";
import type { ColumnDef } from "./columns.ts";

/** 面上的隐藏：不画、不吸、点不中、导出不出。都藏才藏（并面一藏一不藏 = 看得见，统筹 11-13）；新长的不跟旁边。 */
export const HIDE_POLY: ColumnDef = Object.freeze({ id: "hide_poly", on: "face", type: "bool", continuous: false, fill: 0, merge: "defaultIfMixed", kind: "builtin" });
/**
 * 面用网格体材质槽表（MeshBody.materialSlots）的第几个：缺省 −1 = 没有槽 = 缺省材质（我们的物体可以一个槽都没有，−1 是一个真的状态，不照 Blender 的 0）；
 * 并面留排在最前的那张的；新长的跟旁边（挤出的侧面、倒角的补片照抄被挤 / 被倒的那张面）。
 */
export const MATERIAL_INDEX: ColumnDef = Object.freeze({ id: "material_index", on: "face", type: "int", continuous: false, fill: -1, merge: "first", followNeighbor: true, kind: "builtin" });
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

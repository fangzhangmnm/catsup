// scene/attribute-list.ts —— 属性页（物体窗口「元素」页，属性地基轮第 3½ 步）要的只读清单：两种身体出同一种行（属性地基轮 3d；规程第九节第 3½ 步、接口草案第二节）。
// created 2026-11-13 by Claude Opus 5.5
// 网格体 = 内核的列（MeshKernel.columnList / elementCounts，3a 起就有）；硬表面体 = layers.ts 的边层（名字 → 边集）当「边上的布尔」、面层（名字 → 面 → 整数）当「面上的整数」，
//   只读、不进硬表面内核（改内核要回写立宪页；这里只读公开的 edgeLayers / faceLayers）。硬表面的层是稀疏存的：个数 = 有值的元素有几个、大小写不出来（null）。
// 显示名（保留名 → 中文）不在这里：归界面那一层（第 3½ 步的属性页）。
import type { MeshKernel } from "../mesh/mesh-kernel.ts";
import type { Kernel } from "../kernel/kernel.ts";

/** 一行：哪一列、挂在哪一类元素上、什么类型、个数、占多少字节（稀疏的 = null）。 */
export interface AttributeRow {
  readonly id: string;
  readonly on: "corner" | "face" | "edge";
  readonly type: string;
  /** 稠密的列 = 这一类元素有几个（每个都有一个值）；稀疏的层 = 有值的有几个。 */
  readonly count: number;
  readonly bytes: number | null;
  readonly sparse: boolean;
}
/** 几何本身有多少（属性页「几何」那一块）。corners 只有网格体有；wires = 不挂面的线。 */
export interface GeometryCounts { readonly points: number; readonly edges: number; readonly faces: number; readonly corners: number | null; readonly wires: number }
export interface AttributeList { readonly kind: "mesh" | "brep"; readonly geometry: GeometryCounts; readonly rows: readonly AttributeRow[] }

/** 网格体：内核的列，原样排成行（挂在哪、类型、个数、字节都是内核算的）。 */
export function meshAttributeList(k: MeshKernel): AttributeList {
  const g = k.elementCounts();
  return { kind: "mesh", geometry: { points: g.points, edges: g.edges, faces: g.faces, corners: g.corners, wires: g.wires },
    rows: k.columnList().map((r) => ({ id: r.id, on: r.on as AttributeRow["on"], type: r.type, count: r.count, bytes: r.bytes, sparse: false })) };
}
/** 硬表面体：边层 = 边上的布尔、面层 = 面上的整数（只列有值的层；名字照 layers.ts）。 */
export function brepAttributeList(k: Kernel): AttributeList {
  const edges = k.edges(), faces = k.faces();
  const wires = edges.filter((e) => !e.faceLinks.length).length;
  const rows: AttributeRow[] = [
    ...k.edgeLayers.names().map((n) => ({ id: n, on: "edge" as const, type: "bool", count: k.edgeLayers.layer(n).size, bytes: null, sparse: true })),
    ...k.faceLayers.names().map((n) => ({ id: n, on: "face" as const, type: "int", count: k.faceLayers.layer(n).size, bytes: null, sparse: true })),
  ];
  return { kind: "brep", geometry: { points: k.vertices().length, edges: edges.length, faces: faces.length, corners: null, wires }, rows };
}

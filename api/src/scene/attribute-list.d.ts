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
export interface GeometryCounts {
    readonly points: number;
    readonly edges: number;
    readonly faces: number;
    readonly corners: number | null;
    readonly wires: number;
}
export interface AttributeList {
    readonly kind: "mesh" | "brep";
    readonly geometry: GeometryCounts;
    readonly rows: readonly AttributeRow[];
}
/** 网格体：内核的列，原样排成行（挂在哪、类型、个数、字节都是内核算的）。 */
export declare function meshAttributeList(k: MeshKernel): AttributeList;
/** 硬表面体：边层 = 边上的布尔、面层 = 面上的整数（只列有值的层；名字照 layers.ts）。 */
export declare function brepAttributeList(k: Kernel): AttributeList;

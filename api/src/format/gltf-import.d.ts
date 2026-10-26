import type { Pt3 } from "../kernel/kernel.ts";
import type { Xform } from "../scene/xform.ts";
export interface ImportMesh {
    name: string; /** Z-up 坐标。 */
    positions: Pt3[]; /** 三角（每 3 个下标一个）。 */
    tris: number[];
}
export interface ImportNode {
    name: string; /** 局部变换（Z-up）。 */
    xform: Xform;
    mesh: number | null;
    children: number[];
}
export interface ImportScene {
    name: string;
    nodes: ImportNode[];
    meshes: ImportMesh[];
    roots: number[]; /** 进门时丢掉的东西（人话，导入后说一次）。 */
    losses: string[];
}
/** 是能读的 glb、但不是 CatsUp 的文件（别的软件导出的）——「打开」拒、「导入」收。 */
export declare function isForeignGlb(bytes: Uint8Array): boolean;
/** 读外来 glb。name = 文件名（做外层组件的名字）。不是 glb / 结构坏 → 抛（人话）。 */
export declare function readForeignGlb(bytes: Uint8Array, name: string): ImportScene;
/** 文件的上方向（glTF 标准 = Y 朝上；有些导出器按 Z 朝上写）。 */
export type ImportUp = "y" | "z";
/** 文件单位 → 米（glTF 标准 = 米）。 */
export declare const IMPORT_UNITS: Readonly<Record<string, number>>;
/**
 * 按「上方向 + 文件单位」重新摆中间数据（DT84 导入后的参数小窗，user 10-26「import coordinate 方向可以设置吗，以及scaling。能预览吗」→「同意」）：
 * readForeignGlb 已按 Y 朝上换成 Z 朝上；文件其实是 Z 朝上 → 再乘回 C⁻¹（点 p → C⁻¹p、节点 M → C⁻¹MC）；单位 = 均匀缩放（点 × s、节点平移 × s）。
 * 纯函数、不改原数据。
 */
export declare function reorientImport(data: ImportScene, up: ImportUp, unitM: number): ImportScene;

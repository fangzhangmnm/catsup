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

import { MeshKernel } from "../mesh-kernel.ts";
/** 删面。onlyFaces = true：只删面，留下的边成裸线、点留着（Blender「Only Faces」）；false：面独占的边和孤立的点一起删。 */
export declare function deleteFaces(k: MeshKernel, fs: readonly number[], onlyFaces?: boolean): void;
/** 删边：边所在的面一起删（Blender 同款），孤立的点一起删。 */
export declare function deleteEdges(k: MeshKernel, es: readonly number[]): void;
/** 删点：点所在的面和边一起删。 */
export declare function deleteVerts(k: MeshKernel, vs: readonly number[]): void;
/**
 * 删一个选区（自由建模的 X / Delete / 删除工具；2026-10-27 Claude Opus 5.5）：先删面（面独占的边和孤立的点一起走）、再删边（连着的面一起）、再删点（连着的边和面一起）——
 * Blender 按选区类型删的三档合成一次。dissolve = 溶解（不开洞）：边 → 两侧的面并成一张（恰两张面才行）、点 → 二度点去掉（两边并成一条）；溶解不了的跳过，返回跳过几个。
 */
export declare function deleteSelection(k: MeshKernel, t: {
    verts?: readonly number[];
    edges?: readonly number[];
    faces?: readonly number[];
}, dissolve?: boolean): number;

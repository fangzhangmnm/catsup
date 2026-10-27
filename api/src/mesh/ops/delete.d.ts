import { MeshKernel } from "../mesh-kernel.ts";
/** 删面。onlyFaces = true：只删面，留下的边成裸线、点留着（Blender「Only Faces」）；false：面独占的边和孤立的点一起删。 */
export declare function deleteFaces(k: MeshKernel, fs: readonly number[], onlyFaces?: boolean): void;
/** 删边：边所在的面一起删（Blender 同款），孤立的点一起删。 */
export declare function deleteEdges(k: MeshKernel, es: readonly number[]): void;
/** 删点：点所在的面和边一起删。 */
export declare function deleteVerts(k: MeshKernel, vs: readonly number[]): void;

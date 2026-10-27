import { MeshKernel } from "../mesh-kernel.ts";
export interface ExtrudeResult {
    newVerts: Map<number, number>;
    sides: number[];
}
export declare function extrudeFaces(k: MeshKernel, fs: readonly number[]): ExtrudeResult;

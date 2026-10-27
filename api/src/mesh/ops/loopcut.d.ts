import { MeshKernel } from "../mesh-kernel.ts";
export interface LoopCutResult {
    edges: number[];
    newVerts: number[];
    closed: boolean;
}
export declare function loopCut(k: MeshKernel, start: number, t?: number): LoopCutResult;

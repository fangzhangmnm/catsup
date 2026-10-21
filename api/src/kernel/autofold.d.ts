import { type Pt3 } from "./geom.ts";
export interface FoldResult {
    pieces: number[][];
    creases: [number, number][];
}
export declare function foldDecompose(pts: readonly Pt3[], tol: number): FoldResult | null;

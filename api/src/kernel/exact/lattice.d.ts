import type { Pt3 } from "../geom.ts";
/** 整数 2D / 3D 点（|坐标| < 2^31 = ±2147 m；超出 = 调用方的错，这里不防）。 */
export interface IPt2 {
    readonly x: number;
    readonly y: number;
}
export interface IPt3 {
    readonly x: number;
    readonly y: number;
    readonly z: number;
}
export declare const LATTICE_LIMIT: number;
export declare const toLattice3: (p: Pt3) => IPt3;
export declare const fromLattice3: (p: IPt3) => Pt3;
export declare const isLattice: (v: number) => boolean;
export declare const assertLattice3: (p: IPt3, what?: string) => void;

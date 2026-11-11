import type { Pt3 } from "../kernel/geom.ts";
/** 铺法要的那一点内核（MeshKernel 满足；测试可以给假的）。 */
export interface LayoutMesh {
    facePts(f: number): Pt3[];
    faceNormal(f: number): Pt3;
    cornerValues(f: number, guid: string): Float32Array | null;
}
export interface LayoutOptions {
    /** 每米多少格。不给 = 画布定成 base 见方，二分找出能放下的最大密度（精确到每米一格）。 */
    readonly density?: number;
    /** 块和块之间、块和画布边之间留几格（整数，默认 4）。 */
    readonly gap?: number;
    /** 画布的宽 / 高上限（默认 4096）；超过 = 不铺，说原因。 */
    readonly maxSize?: number;
    /** 画布的基准宽（默认 1024）。 */
    readonly base?: number;
}
export interface Block {
    readonly face: number;
    readonly x: number;
    readonly y: number;
    readonly w: number;
    readonly h: number;
}
export type LayoutResult = {
    readonly ok: true;
    readonly width: number;
    readonly height: number;
    readonly density: number;
    readonly blocks: readonly Block[];
    readonly values: ReadonlyMap<number, Float64Array>;
} | {
    readonly ok: false;
    readonly reason: string;
    readonly face?: number;
    readonly need?: number;
};
/** 给一批面铺贴图坐标（一张面一块）。不改内核：values = 每张面每个角的 [横, 纵, 横, 纵…]（格）。 */
export declare function layoutFaces(m: LayoutMesh, faces: readonly number[], opts?: LayoutOptions): LayoutResult;
/**
 * 给新面补一块（以后加面用）：已经铺好的面（在 guid 这一列上有值的）一个数都不变；新面各铺一块，放在画布上空着的地方（左上优先），放不下就把画布往下加高
 * （256 的倍数）。坐标的单位是格、不是零到一的比例，所以加高不会动到已有的东西。
 */
export declare function layoutAppend(m: LayoutMesh, guid: string, placed: readonly number[], add: readonly number[], canvas: {
    width: number;
    height: number;
}, density: number, opts?: Omit<LayoutOptions, "density" | "base">): LayoutResult;

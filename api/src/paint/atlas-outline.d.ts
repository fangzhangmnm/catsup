import type { PaintMesh } from "./texel-table.ts";
/** 要的那一点网格体（MeshKernel 满足）：环上的点编号（认公共的边）+ 角上的贴图坐标。 */
export type AtlasMesh = Pick<PaintMesh, "faceVerts" | "cornerValues">;
export interface AtlasOutline {
    readonly width: number;
    readonly height: number;
    /** 这张 atlas 上的面（升序）。 */
    readonly faces: readonly number[];
    /** 每张面在画布上的多边形 [x0, y0, x1, y1…]（格）。 */
    readonly rings: ReadonlyMap<number, Float32Array>;
    /** 片里的边（细线）：每条 4 个数 x0, y0, x1, y1；共用的边只画一次。 */
    readonly thin: Float32Array;
    /** 片的外沿（粗线）。 */
    readonly thick: Float32Array;
    /** 每张面在第几片（从 1 起，按画布上从上到下、从左到右）。 */
    readonly patchOf: ReadonlyMap<number, number>;
    readonly patches: number;
    /** 格子中心落在某张面里的格数 / 落在两张以上的面里的格数。 */
    readonly covered: number;
    readonly shared: number;
    /** 这一点（格坐标）落在哪几张面里（升序）。 */
    facesAt(x: number, y: number): number[];
}
export declare function atlasOutline(m: AtlasMesh, uvSet: string, faces: readonly number[], width: number, height: number): AtlasOutline;

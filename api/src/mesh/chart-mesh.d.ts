import type { MeshKernel } from "./mesh-kernel.ts";
export type ChartSource = Pick<MeshKernel, "faces" | "faceVerts" | "edgeOf" | "eFaces" | "edgeA" | "edgeB" | "pt" | "faceNormal" | "faceTriangles" | "hasF">;
/** 片里的一条边（两张面共用、没切）：mesh 边编号、两张面、两头的点份（a < b 不保证）。 */
export interface JoinedEdge {
    readonly e: number;
    readonly f: number;
    readonly g: number;
    readonly a: number;
    readonly b: number;
}
/** 边界上的一条半边：哪张面、mesh 边编号、按副本里的绕向从点份 a 到点份 b。 */
export interface BoundaryHalf {
    readonly f: number;
    readonly e: number;
    readonly a: number;
    readonly b: number;
}
export interface ChartMesh {
    /** 片里的面（升序）。 */
    readonly faces: readonly number[];
    /** 在副本里绕向倒过来的面（为了和片里别的面一致）。 */
    readonly flipped: ReadonlySet<number>;
    /** 每份点是哪个 mesh 点。 */
    readonly wedgeVertex: readonly number[];
    /** 每张面每个角（按 mesh 里环的顺序）是哪份点。 */
    readonly cornerWedge: ReadonlyMap<number, Int32Array>;
    readonly joined: readonly JoinedEdge[];
    readonly boundary: readonly BoundaryHalf[];
    /** 边界圈：每圈 = boundary 里的下标，按顺序首尾相接。 */
    readonly loops: readonly (readonly number[])[];
    readonly chi: number;
    readonly orientable: boolean;
    /** 亏格（可定向时）；不可定向 = NaN。 */
    readonly genus: number;
    /** 边界串不成圈（不该发生：说明点份拆得不对）。 */
    readonly brokenLoops: boolean;
}
/** 并查集（按编号小的当根：结果不随合并顺序变）。 */
export declare class DSU {
    private p;
    find(x: number): number;
    union(a: number, b: number): boolean;
}
/** 范围里的面按 cut 分成片，每片建一份工作副本（按片里最小的面编号排）。 */
export declare function chartsOf(m: ChartSource, faces: readonly number[], cut: (e: number) => boolean): ChartMesh[];
/** 真的边界圈有几圈：两条边的圈不算（一条切开的边、两头还连着 = 张不开，展开时当它没切；unwrap.ts）。 */
export declare const realBoundaries: (c: ChartMesh) => number;
/** 片能不能直接展开（统筹 G）：可定向、亏格为零、至少一圈真的边界、边界串得成圈。 */
export declare const flattenable: (c: ChartMesh) => boolean;

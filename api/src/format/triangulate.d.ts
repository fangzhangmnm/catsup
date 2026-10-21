import { type PlaneParams, type Pt3 } from "../kernel/geom.ts";
/** 返回 [a,b,c] 顶点索引（索引空间 = 传入的 vertices 数组）。绕向沿用 earcut（与外环一致）。 */
export declare function triangulateRings(vertices: readonly Pt3[], plane: PlaneParams, outer: readonly number[], holes: readonly (readonly number[])[]): [number, number, number][];

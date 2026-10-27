import type { Pt } from "./geom.ts";
export type Tri = [number, number, number];
/**
 * q = 顶点的 2D 坐标（投影后）；tris = 顶点下标三元组（同一绕向）；constrained = 不许翻的边（键 = 小下标-大下标）。
 * 返回翻完的三角形列表（顺序 / 绕向尽量沿用输入）。
 */
export declare function delaunayFlips(q: readonly Pt[], tris: readonly Tri[], constrained: ReadonlySet<string>): Tri[];

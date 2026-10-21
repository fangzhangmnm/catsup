import { type Pt3 } from "./geom.ts";
import { type EdgeId, PlanarGraph } from "./topology.ts";
/**
 * sticky 插入的「碰到」容差 = 量化格（2026-09-07 VR 真机案，edited by Claude Fable 5.1）：
 * 身份是逐轴 Q/2 的格（ptKey3），几何测试原先用 Euclid EPS=Q/2——格的半对角线 0.87Q 比 EPS 大，
 * 于是一条新段能在「离顶点 0.5Q~0.87Q」的带里擦过一个既有顶点而不把它切进来；之后任何切点落进该顶点的格
 * 就 ensureVertex 到它，splitEdge 撞上既有边 → 「边 4-3 已存在」。斜置矩形角点量化后边不精确沿轴，
 * 再沿理想轴向画过头就是这条带（fuzz 50 次内必中）。容差 ≥ 半对角线 = 洞封死：凡可能量化成同一顶点的都当碰到。
 */
export declare const INSERT_TOL = 0.000001;
export interface InsertResult {
    created: EdgeId[];
    retraced: EdgeId[];
}
/**
 * 把线段 [aIn,bIn] sticky 地插入平面图：
 * 与既有边的交点处双方都切开；与既有边共线重叠的段去重成同一条边（重合即同一）。
 * onSplit：既有边被切开时回调（调用方用它维护手势边集等跨切割身份）。
 */
export declare function insertSegment(g: PlanarGraph, aIn: Pt3, bIn: Pt3, onSplit?: (parent: EdgeId, child1: EdgeId, child2: EdgeId) => void): InsertResult;

import { type EdgeId, PlanarGraph } from "./topology.ts";
export interface PlanarizeResult {
    changed: boolean;
}
/** onSplit：既有边被切成链时回调（parent, children）——结算机用它维护手势集 / 随葬集的切割血缘。 */
/**
 * dirty（局部性接缝，2026-10-21 #14）：只有这些边是本次新来 / 动过的——前置状态已是平面化的，所以新切点必含至少一条脏边：
 * 脏边 × 全部边、脏边 × 全部顶点、全部边 × 脏边的端点。每轮切出的子边成为下一轮的脏边。不给 = 全对扫（旧行为）。
 */
export declare function planarize(g: PlanarGraph, onSplit?: (parent: EdgeId, children: readonly EdgeId[]) => void, dirtyIn?: ReadonlySet<EdgeId>): PlanarizeResult;

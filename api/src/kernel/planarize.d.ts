import { type EdgeId, PlanarGraph } from "./topology.ts";
export interface PlanarizeResult {
    changed: boolean;
}
/** onSplit：既有边被切成链时回调（parent, children）——结算机用它维护手势集 / 随葬集的切割血缘。 */
export declare function planarize(g: PlanarGraph, onSplit?: (parent: EdgeId, children: readonly EdgeId[]) => void): PlanarizeResult;

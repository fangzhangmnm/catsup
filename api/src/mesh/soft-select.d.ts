import type { Pt3 } from "../kernel/geom.ts";
/** 选区外每个点到选区的距离（世界）：只留 maxD 以内的（maxD 给半径滑条的上限，滑大了也够用）。O(点数 × 选中点数)，低模几千点以内零点几毫秒。 */
export declare function softDistances(verts: Iterable<number>, picked: ReadonlySet<number>, world: (v: number) => Pt3, maxD?: number): Map<number, number>;
/** 平滑衰减：d = 0 → 1，d ≥ R → 0（Blender Smooth）。 */
export declare function softFalloff(d: number, R: number): number;
/** 当前半径下的权重表（只含 > 0 的）。 */
export declare function softWeights(dist: ReadonlyMap<number, number>, R: number): Map<number, number>;

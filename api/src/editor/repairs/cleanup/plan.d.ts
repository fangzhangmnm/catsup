import type { EdgeId, Kernel, Pt3, VertexId } from "../../../kernel/kernel.ts";
/** 范围：边 id 集（有选区 = 选中的边 + 选中面的环边）；null = 整个池。 */
export type EdgeScope = ReadonlySet<EdgeId> | null;
/** ① 悬空的线：一张面都没挂的边。 */
export declare function strayEdges(k: Kernel, scope: EdgeScope): EdgeId[];
/** ② 很短的边连成的伙：每伙并成一个点（保留连边最多的点，平手留 id 小的）。返回挪点（id → 新位置），按 id 排。 */
export declare function tinyEdgeMoves(k: Kernel, scope: EdgeScope, len: number): {
    moves: {
        id: VertexId;
        to: Pt3;
    }[];
    clusters: number;
};
/** ③ 同一平面上切碎面的内线：恰好两张面、两张面同一平面、两侧材质都一样；曲线上的、隐藏的不算；soft = 看不见的软边也算（缺 = 不算）。 */
export declare function coplanarInnerEdges(k: Kernel, scope: EdgeScope, opt?: {
    soft?: boolean;
}): EdgeId[];

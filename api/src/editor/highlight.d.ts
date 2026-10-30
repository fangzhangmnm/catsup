import type { Mark } from "../minccino/index.ts";
import type { AuxLines } from "../look/aux.ts";
import type { EdgeId, FaceId } from "../kernel/kernel.ts";
import { type WorldView } from "../scene/world-view.ts";
export interface HighlightState {
    readonly selectionFaces: ReadonlySet<FaceId>;
    readonly hoverFace: FaceId | null;
    readonly selectionEdges: ReadonlySet<EdgeId>;
    readonly scrubEdges: ReadonlySet<EdgeId>;
    readonly warnEdges?: ReadonlySet<EdgeId> | null;
    readonly hoverEdge: EdgeId | null;
    readonly revision?: number;
    /** 上下文之外的槽（淡出）= 整槽的 faceDim / edgeDim 标记（刀 c）。 */
    readonly dimSlots?: ReadonlySet<number> | null;
    /** X 光：每个槽的边再提交一条 edgeHidden 标记（只画被挡住的那段，刀 d）；选中的边改走透视线。引擎不认识 X 光。 */
    readonly xray?: boolean;
}
/** 池网格的布局（流提供者给）：某个槽里一张面（池本地 id）在哪些块的哪一段。 */
export interface MarkLayout {
    rangeOf(slot: string, fid: FaceId): readonly {
        readonly chunk: string;
        readonly start: number;
        readonly count: number;
    }[];
    /** 某个槽里一条边（池本地 id）在线块的哪一段；不在线块里（软边 / 折线 / 藏起来的）= null。 */
    edgeRangeOf(slot: string, eid: EdgeId): {
        readonly chunk: string;
        readonly start: number;
        readonly count: number;
    } | null;
    /** 某个槽的全部块（整槽标记用：淡出）。 */
    chunksOf(slot: string): readonly {
        readonly chunk: string;
        readonly count: number;
        readonly kind: "tris" | "lines";
    }[];
}
export declare function highlightKey(world: WorldView, v: HighlightState): string;
/** 这一帧的高亮辅助几何（只剩线块里没有的边：被刮擦 / 检查标的软边；`pass: content`）；键没变就是上一帧那份。 */
export declare function highlightItems(world: WorldView, v: HighlightState, layout: MarkLayout): AuxLines[];
/** 这一帧的面标记（选中 = faceSelected、悬停 = faceHover）；键没变就是上一帧那份。拉完流之后才调（布局那时才稳定）。 */
export declare function highlightMarks(world: WorldView, v: HighlightState, layout: MarkLayout): Mark[];

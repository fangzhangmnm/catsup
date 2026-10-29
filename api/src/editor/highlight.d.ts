import type { OverlayItem } from "../minccino/index.ts";
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
}
export declare function highlightKey(world: WorldView, v: HighlightState): string;
/** 这一帧的高亮叠加层（没选没悬停 = 空数组）；键没变就是上一帧那份。 */
export declare function highlightItems(world: WorldView, v: HighlightState): OverlayItem[];

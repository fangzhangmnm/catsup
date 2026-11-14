import type { EdgeId, FaceId } from "../kernel/kernel.ts";
import type { FaceEvent } from "../kernel/face-lifecycle.ts";
import type { GeomView } from "../scene/world-view.ts";
export interface BornJudge {
    /** 这张面是这一下动作新生的吗（眼前世界里的编号）。 */
    face(f: FaceId): boolean;
    /** 这条边是这一下动作新生的吗（眼前世界里的编号）。 */
    edge(e: EdgeId): boolean;
}
export declare function bornThisGesture(stat: GeomView, live: GeomView, events: readonly FaceEvent[]): BornJudge;

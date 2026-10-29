import type { OverlayLabel, OverlayMarker, OverlayPoints, OverlayTris } from "../../overlay/index.ts";
import type { Vec3 } from "../../contract/geometry.ts";
export declare class OverlayMarksDrawer {
    private readonly scene;
    private points;
    private markers;
    private tris;
    private labels;
    private readonly up;
    private readonly v1;
    private readonly v2;
    private readonly v3;
    private readonly m4;
    constructor(scene: any);
    /** 探针：这个 id 这一帧画着没有。 */
    isVisible(id: string): boolean;
    /** 探针：现在挂着哪些字（id → 位图键 = 样式|dpr|文字）。 */
    labelKeys(): {
        id: string;
        key: string;
    }[];
    sync(items: readonly (OverlayPoints | OverlayMarker | OverlayTris | OverlayLabel)[], dpr: number, worldPerPx: (p: Vec3) => number): void;
}

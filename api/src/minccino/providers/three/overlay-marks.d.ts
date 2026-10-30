import type { OverlayMarker, OverlayPoints, OverlayTris } from "../../overlay/index.ts";
import { type AuxLayers, type AuxPass } from "./overlay-lines.ts";
export declare class OverlayMarksDrawer {
    private readonly scene;
    private readonly layers;
    private points;
    private markers;
    private tris;
    private readonly up;
    private readonly v1;
    private readonly v2;
    private readonly v3;
    private readonly m4;
    constructor(scene: any, layers: AuxLayers);
    private all;
    /** 这一帧有没有画在这一层的东西（没有就不画那一遍）。 */
    has(pass: AuxPass): boolean;
    /** 探针：这一帧画在这一层的 id。 */
    idsIn(pass: AuxPass): string[];
    /** 探针：这个 id 这一帧画着没有。 */
    isVisible(id: string): boolean;
    /** 探针：画着的点 / 三角的 id 和键。 */
    keys(): {
        id: string;
        key: string;
    }[];
    /** @param mainScale 主分辨率的点画进小图时的缩小倍数（小图一格 = 几个设备像素；不下采样 = 1）
     *  @param srgbOut 主分辨率画进小图（风格那条路）：标记 / 三角的颜色按 sRGB 原值写（点的 shader 本来就直接出 sRGB） */
    sync(items: readonly (OverlayPoints | OverlayMarker | OverlayTris)[], dpr: number, mainScale?: number, srgbOut?: boolean): void;
}

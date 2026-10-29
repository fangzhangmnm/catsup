import type { OverlayLines } from "../../overlay/index.ts";
/** 换粗线几何（dispose 旧的）。col = 每段 6 个分量（起 / 止顶点色，线性空间）或 null。 */
export declare function setLineGeometry(obj: any, pos: readonly number[], col: readonly number[] | null): void;
export type LineMatFactory = (px: number, opts: {
    offset?: boolean;
    vertexColors?: boolean;
}) => any;
/** `shared: "edge"` 的材质由后端给（每次 sync 都问一遍——X 光开关会换材质）。 */
export type SharedLineMats = {
    edge?: () => any;
};
export declare class OverlayLinesDrawer {
    private readonly scene;
    private readonly lineMat;
    private readonly shared;
    private mats;
    private edgeWidthMats;
    private objs;
    constructor(scene: any, lineMat: LineMatFactory, shared?: SharedLineMats);
    /** 探针：这个 id 的线这一帧画着没有（探针别摸 three 对象，摸契约 id）。 */
    isVisible(id: string): boolean;
    /** `widthPx: "edge"` 的材质每帧跟边线宽走（设备像素；render3 syncLineScale 调）。 */
    edgeWidth(linewidth: number): void;
    private materialFor;
    sync(items: readonly OverlayLines[]): void;
}

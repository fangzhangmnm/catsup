import type { OverlayLines } from "../../overlay/index.ts";
/** 线性 → sRGB（小图按 sRGB 原值存：three 往渲染目标里画时普通材质输出线性色、不换回 sRGB，画进小图的颜色要自己换好）。 */
export declare const linToSrgb: (c: number) => number;
/** 整组一色写到材质上：画进小图 = sRGB 原值（按「线性」存 = 原样写进去）；画到画布 = 照常（three 自己换）。 */
export declare function setMatColor(m: any, hex: number, srgbOut: boolean): void;
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
/** 三层：主分辨率跟内容（stage 0）/ 主分辨率排在后处理之后（stage 1）/ 原分辨率（resolution native）。 */
export type AuxPass = "main" | "late" | "native";
export type AuxLayers = Readonly<Record<AuxPass, number>>;
export declare const auxPassOf: (it: {
    stage?: 0 | 1;
    resolution?: "main" | "native";
}) => AuxPass;
export declare class OverlayLinesDrawer {
    private readonly scene;
    private readonly lineMat;
    private readonly shared;
    private readonly layers;
    private mats;
    private hairMats;
    private edgeWidthMats;
    private objs;
    /** 每份材质建的时候的线宽（CSS px）：主分辨率被下采样时那一遍按小图像素放大（scaleMain）。 */
    private baseWidth;
    constructor(scene: any, lineMat: LineMatFactory, shared: SharedLineMats, layers: AuxLayers);
    /** 小图那遍：主分辨率的粗线（自己建的材质）线宽 × f（LineSegments2 按画布视口算像素）；f = 1 还原。 */
    scaleMain(f: number): void;
    /** 这一帧有没有画在这一层的线（没有就不画那一遍）。 */
    has(pass: AuxPass): boolean;
    /** 探针：这一帧画在这一层的 id。 */
    idsIn(pass: AuxPass): string[];
    /** 探针：这个 id 的线这一帧画着没有 / 画着的那些的键。 */
    isVisible(id: string): boolean;
    keys(): {
        id: string;
        key: string;
    }[];
    /** `widthPx: "edge"` 的材质每帧跟边线宽走（设备像素；render3 syncLineScale 调）。 */
    edgeWidth(linewidth: number): void;
    private materialFor;
    /** 1 像素线的材质（同一组深度 / 透明度参数）。 */
    private hairMaterialFor;
    private depthOf;
    /** @param pixelated 主分辨率被下采样（像素那条路）：主分辨率的细线换成 1 像素的 GL 线
     *  @param srgbOut 主分辨率画进小图（风格那条路）：颜色按 sRGB 原值写 */
    sync(items: readonly OverlayLines[], pixelated: boolean, srgbOut: boolean): void;
}

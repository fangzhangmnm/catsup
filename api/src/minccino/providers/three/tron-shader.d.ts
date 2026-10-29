import type { TronShade } from "../../preset/index.ts";
export declare class TronMaterials {
    private readonly depthFace;
    private readonly depthOther;
    private readonly u;
    private readonly faces;
    private readonly profileAdd;
    readonly lineThick: any;
    readonly linePixel: any;
    readonly hiddenThick: any;
    readonly hiddenPixel: any;
    private hidden;
    constructor(depthFace: number, depthOther: number);
    /** 面材质：side / 深度偏移按槽；single = 贴图网格（只有 aColor）；sel = 选中 / 悬停的那份（认领色）。 */
    face(side: "front" | "back" | "double", active: boolean, single: boolean, sel?: boolean): any;
    /** 每帧：参数 + 线宽换算（pxScale = 画布 CSS 高 ÷ 小图高：LineSegments2 按画布视口算像素，见文件头）。 */
    sync(t: TronShade, pxScale: number): void;
    /** 辉光那遍：面只出轮廓光，被挡住的边 × 0.4（实验室 oGlow = uLine · a · 0.4）。 */
    setGlowPass(on: boolean): void;
    dispose(): void;
}

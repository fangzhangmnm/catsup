import { type AoUniforms } from "./ao-bake.ts";
import type { FlatShade } from "../../preset/index.ts";
/** 平涂的一组材质（同一套 uniform 对象：换参数 / 遮蔽烘好，大家一起变）。 */
export declare class PaperMaterials {
    private readonly ao;
    private readonly depthFace;
    private readonly depthOther;
    private readonly shade;
    private readonly aoModel;
    private readonly aoGround;
    private readonly mats;
    readonly ground: any;
    private readonly groundU;
    /** @param defaultFace 白模没上色的面那个灰（0xRRGGBB；认出来换成纸色） */
    constructor(ao: AoUniforms, depthFace: number, depthOther: number, defaultFace: number);
    /** 面材质：single = 贴图网格那份（只有 aColor）；side / 深度偏移按槽（活动池 / 别的池、单面 / 双面）。 */
    face(side: "front" | "back" | "double", active: boolean, single: boolean): any;
    /** 每帧：光（视空间，跟着相机）、参数、遮蔽开没开；地面的逆矩阵。 */
    sync(f: FlatShade, ao: {
        amount: number;
        radius: number;
        groundRadius: number;
        soft: number;
    } | null, aoReady: boolean, ground: {
        color: number;
        on: number;
        grid: number;
    } | null, background: number, cam: any, grid?: {
        line: number;
        r: number;
        fade: {
            x: number;
            y: number;
            z: number;
        };
    } | null): void;
    /** 辉光那遍：地面只出地格的光。 */
    setGlowPass(on: boolean): void;
    hide(): void;
    dispose(): void;
}

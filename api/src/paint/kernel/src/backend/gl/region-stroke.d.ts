import type { PooledFBO, Gl2Blend } from "../../common/gl2-port.ts";
import type { GlRoom } from "./gl-room.ts";
import type { LayerPixels } from "../tiles/tile-layer.ts";
import { type RegionProgramId } from "./region-programs.ts";
export type RegionTexFormat = "rgba-f32" | "rgba-u8" | "rgba16f-tex";
export interface RegionTex {
    readonly w: number;
    readonly h: number;
    readonly format: RegionTexFormat;
}
/** run 的写靶：状态纹理，或 "W"（工作区域本体；配 scissor 只写窗口）。 */
export type RegionDst = RegionTex | "W";
/** run 的采样源：状态纹理 / "W" / "W0"（起笔快照，构造时 snapshot:true 才有）/ "selection"（选区 r8 平面）。 */
export type RegionTexRef = RegionTex | "W" | "W0" | "selection";
export type RegionRect = {
    x: number;
    y: number;
    w: number;
    h: number;
};
export type Rect = [number, number, number, number];
export interface SelMaskPlane {
    data: Uint8Array;
    ox: number;
    oy: number;
    ow: number;
    oh: number;
}
export type RegionUniforms = Record<string, number | boolean | number[] | Float32Array>;
/** 显示 + 提交共用：W 当 overlay（doc 尺寸纹理，ox/oy=0）；bx..bh = 累计写过的矩形（提交 readback 范围）；bw=bh=0 = 还没写过。 */
export interface RegionOverlayInput {
    kind: "region";
    tex: PooledFBO;
    layerId: number;
    bx: number;
    by: number;
    bw: number;
    bh: number;
}
export declare class RegionStroke {
    readonly leafId: number;
    readonly docW: number;
    readonly docH: number;
    private readonly _room;
    private readonly _port;
    private _W;
    private _W0;
    private _sel;
    private _texes;
    private _dirty;
    private _disposed;
    /** 叶的锁 α（引擎读；同 StrokeShadow.lockAlpha）。 */
    readonly lockAlpha: boolean;
    /** 起笔时叶的紧内容框 [x0,y0,x1,y1)（pixels.contentBounds(true)，逐 tile 缓存，µs 级）；null = 空叶。液化的源矩形 / spline 预滤波范围。 */
    readonly contentBounds: Rect | null;
    constructor(room: GlRoom, leafId: number, pixels: LayerPixels, docW: number, docH: number, selMask: SelMaskPlane | null, opts?: {
        snapshot?: boolean;
        lockAlpha?: boolean;
    });
    private _load;
    private _alive;
    /** 选区平面（smudge-mask 的 u_selOrigin/u_selSize 用）；null = 无选区。 */
    get selection(): {
        ox: number;
        oy: number;
        ow: number;
        oh: number;
    } | null;
    /** 累计写过 W 的矩形（x0,y0,x1,y1）；null = 还没写。 */
    get dirty(): Rect | null;
    /** 状态纹理（借自 FBO 池，清零；dispose 归还）。 */
    alloc(w: number, h: number, format: RegionTexFormat): RegionTex;
    /** 上传只读纹理（spline 系数平面 rgba16f：CPU 预滤波产物；不能当 run 的 dst）。dispose / free 删除。 */
    upload(w: number, h: number, data: Float32Array): RegionTex;
    /** 提前归还一张状态纹理（区域尺寸的临时件按 flush 借还；不调也会在 dispose 归还）。 */
    free(t: RegionTex): void;
    /** 唯一算子：跑一个 program。dst 与任一采样源同一张 = 响亮 throw（读写冲突，GL 未定义行为）。写 W 时按 scissor 记 dirty。 */
    run(program: RegionProgramId, dst: RegionDst, textures: Record<string, RegionTexRef>, uniforms?: RegionUniforms, scissor?: RegionRect, blend?: Gl2Blend): void;
    private _resolve;
    private _markDirty;
    /** W 当 overlay（显示每帧 + 收口提交都用它）。 */
    overlay(): RegionOverlayInput;
    /** 显式慢路径：读回 W 的一块（straight RGBA8）。测试 / 诊断用；产品路径的提交走 bakeStamps。 */
    readPixels(x0: number, y0: number, w: number, h: number): Uint8Array;
    /** 归还全部 FBO / 纹理；之后任何动词 throw。幂等。 */
    dispose(): void;
    get bboxX(): number;
    get bboxY(): number;
    get bboxW(): number;
    get bboxH(): number;
    getImageData(_docX: number, _docY: number, _w: number, _h: number): ImageData;
    putImageData(_docX: number, _docY: number, _img: ImageData): void;
}

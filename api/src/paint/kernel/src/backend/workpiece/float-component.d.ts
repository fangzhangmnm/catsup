import { LayerPixels } from "../tiles/tile-layer.ts";
import type { RecordData } from "./undo-stack.ts";
import type { Workpiece, CollectorComponent } from "./workpiece.ts";
export interface FloatRect {
    x: number;
    y: number;
    w: number;
    h: number;
}
export type FloatMesh = {
    x: number;
    y: number;
}[][];
export interface WorkpieceFloat {
    id: number;
    sourceLayerId: number;
    /** lift 时像素的 identity 位置（doc 坐标；内容紧 bbox）；reject 按此写回，不走 warp 采样器。
     *  v0.9.2 起**允许越出画布**（x/y 可负、w/h 可 > doc）——导入「保持原尺寸」的浮层比画布大。 */
    rect: FloatRect;
    /** 浮层**本地坐标**的稀疏 tile：网格尺寸 = rect.w×rect.h，内容存在本地 (0,0)，
     *  落位由 rect 单独描述（池驻留、可压缩；不可变——变换只动 transform metadata）。
     *  v0.9.2 前是 doc 坐标 + doc 尺寸网格，因而**物理上装不下画布外的像素**（导入原大小丢外圈）。
     *  知情者只有三个：extractFloatPixels/makeFloatFromBytes 建、floatBytes 读、composeRigidWriteback 读。 */
    pixels: LayerPixels;
}
/** 参考 frame（v0.6.21 有向化，Procreate 方手柄语义）：p(u,v)=origin+u·ux+v·uy，u,v∈[0,1]。 */
export interface FloatPt {
    x: number;
    y: number;
}
export interface FloatFrame {
    origin: FloatPt;
    ux: FloatPt;
    uy: FloatPt;
}
/** 像素变换用过的最高自由度类（模式切换记账制，v0.6.34）：只升不降、随 undo 整点回退。 */
export type TransformClass = "similarity" | "affine" | "projective";
/** 共享 gizmo 的变换元数据（组 lift 多 float 共用一份；per-float dest quad 由 rect×单应性派生）。 */
export interface FloatTransformMeta {
    gizmoFrame: FloatFrame;
    mesh: FloatMesh;
    meshN: number;
    mode: "free" | "uniform" | "distort" | null;
    uniformAspect: number;
    usedClass?: TransformClass;
}
export interface FloatState {
    floats: WorkpieceFloat[];
    transform: FloatTransformMeta;
}
export declare function cloneFloatMeta(t: FloatTransformMeta): FloatTransformMeta;
export declare function estimateFloatStateBytes(fs: FloatState | null): number;
export declare class FloatLayerComponent implements CollectorComponent {
    readonly kind = "floatLayer";
    private _wp;
    private _fs;
    private _pending;
    constructor(wp: Workpiece);
    view(): Readonly<FloatState> | null;
    /** lift 收尾（token 写）：FloatState 所有权交入 substrate。已有浮层 → throw（引擎先查 view）。 */
    install(fs: FloatState): void;
    /** 变换整点（token 写）：只换 transform metadata（入参克隆，caller 的 live 网格不被引用）。 */
    setTransform(meta: FloatTransformMeta): void;
    /** 收摊（token 写；accept/reject 的收尾微步——像素落层由同 token 的 LayerTiles 扣押记账）。 */
    drop(): void;
    /** 换文档 escape hatch（clearHistory 流；栈随后清，不走 undo——旧 dropFloats 语义）。 */
    dropForLoad(): void;
    sealRecord(): RecordData | null;
    swapRecord(data: RecordData): RecordData;
    recordBytes(data: RecordData): number;
    disposeRecord(data: RecordData): void;
}

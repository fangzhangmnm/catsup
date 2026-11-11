import type { ViewLeaf } from "./painting-view.ts";
import type { FloatRect, WorkpieceFloat } from "./float-component.ts";
import type { Selection } from "../selection.ts";
export declare function extractFloatPixels(leaf: ViewLeaf, sel: Selection | null): WorkpieceFloat | null;
/** 任意字节 → 浮层（导入「保持原尺寸」用：图比画布大时经图层落地会被 doc 边界吃掉越界像素，
 *  这条路不碰图层，字节直接成浮层）。rect 允许越出画布（x/y 负、w/h > doc）；bytes = straight RGBA，
 *  行优先、rect.w 宽。不做透明边 trim —— 「原大小」的框就该等于原图框。 */
export declare function makeFloatFromBytes(sourceLayerId: number, bytes: Uint8ClampedArray, rect: FloatRect): WorkpieceFloat | null;
export declare function composeCutHole(leaf: ViewLeaf, sel: Selection | null, region: FloatRect): {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8ClampedArray;
} | null;
export declare function applyRegionBuf(leaf: ViewLeaf, r: {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8ClampedArray;
}): void;
export declare function composeIdentityWriteback(leaf: ViewLeaf, f: WorkpieceFloat, ox?: number, oy?: number): {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8ClampedArray;
};
/** 整数刚体写回映射（v0.6.34 90° 族置换快路）：dest 整数矩形 (dx0,dy0,dw,dh)，
 *  dest 内偏移 (u,v) 的源 texel 索引 = (m11·u+m12·v+s0x, m21·u+m22·v+s0y)。
 *  系数 ∈ {−1,0,1} + 整数平移 → 纯像素置换，零重采样。 */
export interface RigidMap {
    dx0: number;
    dy0: number;
    dw: number;
    dh: number;
    m11: number;
    m12: number;
    s0x: number;
    m21: number;
    m22: number;
    s0y: number;
}
export declare function composeOverWriteback(leaf: ViewLeaf, x: number, y: number, w: number, h: number, src: Uint8ClampedArray): {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8ClampedArray;
};
export declare function composeRigidWriteback(leaf: ViewLeaf, f: WorkpieceFloat, m: RigidMap): {
    x: number;
    y: number;
    w: number;
    h: number;
    data: Uint8ClampedArray;
};

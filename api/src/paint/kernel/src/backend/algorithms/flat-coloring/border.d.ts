export interface Keypoint {
    x: number;
    y: number;
    /** 端点处朝背景（断口方向）的单位法线，= 式 (3) 的 κ² 加权平均 */
    nx: number;
    ny: number;
    kappa: number;
}
export interface BorderParams {
    /** 法线平滑核半径 L（核宽 2L+1 条边），论文默认 5 */
    kernelL: number;
    /** 端点曲率阈值 θκ ∈ (0,1) */
    thetaKappa: number;
}
/** 追踪全部边界环。返回每环的边列表（编码 (y*w+x)*4+d，按遍历序）。 */
export declare function traceBorderCycles(Ib: Uint8Array, w: number, h: number): number[][];
/** 二值图 → 端点列表（每个高曲率 8-连通簇取曲率最大者）。 */
export declare function keypointsFromBinary(Ib: Uint8Array, w: number, h: number, params: BorderParams): Keypoint[];

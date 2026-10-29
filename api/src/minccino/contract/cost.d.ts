/** 一帧实测（血槽位三个数 + 两个后面要的）。 */
export interface Measurement {
    readonly frameMs: number;
    readonly vramMb: number;
    readonly drawCalls: number;
    readonly triangles?: number;
    readonly passes?: number;
}
/** 代价表：每种事相对代价（校准单位 = 这台设备上「画一个全屏不透明三角」的时间）。小学先写默认值，初中按设备校准。 */
export interface CostTable {
    /** 每 MB 带宽（上传 / 采样）。 */
    readonly bandwidthPerMb: number;
    /** 一次 GPU → CPU 回读（屏幕一刀允许、但永不强制；VR 永远不回读）。 */
    readonly readback: number;
    /** 断一次 pass（换渲染目标、tile 架构上要 resolve）。 */
    readonly passBreak: number;
    /** 每单位 overdraw（移动端讨厌半透明的根源）。 */
    readonly overdrawPerLayer: number;
}
/** 降档梯子的一级：把哪些 pass 关掉 / 换便宜版，和披露用的一句话。梯子 = 数组，用户可钉某一级（UX，上线后）。 */
export interface DegradeStep {
    readonly id: string;
    readonly disclose: string;
    readonly dropPasses: readonly string[];
}
/** 能力位（后端上报，引擎只读）。 */
export interface BackendCaps {
    readonly webgl2: boolean;
    readonly floatRenderTargets: boolean;
    readonly maxTextureSize: number;
    readonly xr: boolean;
}

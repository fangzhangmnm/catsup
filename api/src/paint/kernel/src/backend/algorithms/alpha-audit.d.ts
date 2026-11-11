/** α ≤ 此值算「全透明」（容合成舍入噪声）。 */
export declare const ALPHA_CLEAR_MAX = 2;
/** α ≥ 此值算「实心」（容 8-bit 合成把 255 磨成 254）。 */
export declare const ALPHA_OPAQUE_MIN = 250;
/** 过渡带半径（4 邻曼哈顿 px）：宽度 ≤ 2R 的软边 / 粗细 ≤ 2R 的软笔触算正常，不进可疑。 */
export declare const SOFT_CORE_RADIUS = 4;
/** 可疑像素绝对下限（约 8×8 一小块；软面**芯**有这么大，实际软斑远大于它）。 */
export declare const MIN_SUSPICIOUS_PX = 64;
/** 可疑像素占墨迹面积下限（大画布按比例抬门槛）。 */
export declare const MIN_SUSPICIOUS_RATIO = 0.0002;
/** 「大面积近乎不透明」门：实心像素至少占墨迹面积这么多，才谈得上误擦/喷出界。 */
export declare const HARD_EDGED_MIN_RATIO = 0.5;
export interface AlphaAudit {
    /** 像素总数 = w*h。 */
    total: number;
    /** α ≤ ALPHA_CLEAR_MAX。 */
    clear: number;
    /** 半透明（clear 与 opaque 之间）。 */
    partial: number;
    /** α ≥ ALPHA_OPAQUE_MIN。 */
    opaque: number;
    /** 墨迹面积 = partial + opaque（占比的分母：空白区不参与，画得小不该被稀释）。 */
    ink: number;
    /** 可疑软面芯像素数（判据见文件头）。 */
    suspicious: number;
    /** suspicious / ink（ink=0 → 0）。 */
    suspiciousRatio: number;
    /** 是否「大面积近乎不透明」（门 ①）。 */
    hardEdged: boolean;
    /** 是否该提示用户去黑底看一眼。 */
    flagged: boolean;
    /** α 直方图 256 桶（user 原话「alpha 直方图看一下」；判据之外供排错/调阈值）。 */
    histogram: Uint32Array;
}
/**
 * 对导出像素（straight RGBA，非预乘）做 α 审计。只读，不改 data。
 * 已铺底（α 全 255）的导出天然 partial=0 → 早退，调用方不必自己判。
 */
export declare function auditExportAlpha(data: Uint8ClampedArray, w: number, h: number): AlphaAudit;

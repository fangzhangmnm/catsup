export interface SegmentTier {
    readonly id: string;
    readonly name: string;
    /** 整圆段数（弧按扫角比例取）。 */
    readonly segments?: number;
    /** 或者按弦高公差（毫米）算段数——随半径变。 */
    readonly chordMm?: number;
    /** 这一行常见的取值（只显示）。 */
    readonly typical: string;
    /** 适用对象（只显示）。 */
    readonly for: string;
}
export declare const SEGMENT_TIERS: readonly SegmentTier[];
/** 段数上下限：和工具选项表 / 数值小窗一致（tool-config circle 3–96、arc 2–96）。 */
export declare const SEG_MAX = 96;
export declare const segMin: (arc: boolean) => number;
/** 弦高（拱高）：半径 r、一段对的圆心角 θ → r · (1 − cos(θ / 2))。 */
export declare function chordHeight(r: number, segAngle: number): number;
/** 整圆至少多少段，弦高才 ≤ δ。 */
export declare function circleSegmentsFor(r: number, delta: number): number;
/** 这一档在半径 r、扫角 sweep（整圆 = 2π）下要的段数（还没夹上下限）。 */
export declare function tierSegments(t: SegmentTier, r: number, sweep?: number): number;
export declare const clampSegments: (n: number, arc: boolean) => number;
/** 这个段数对得上哪一档（夹过上下限后相等）；对不上 = null。 */
export declare function tierOf(n: number, r: number, sweep: number, arc: boolean): SegmentTier | null;
/** 公差按毫米 / 微米写（加工和打印的行话单位）。 */
export declare function fmtTolerance(m: number): string;
/**
 * 马后炮的说明行：「弦高 0.43 mm（半径 5 cm）· 次世代：游戏里的近景道具…（常见 24–48）」。
 * 按公差的档被上限夹住了 → 如实说「要 N 段（上限 96）」。fmtR = 宿主的长度格式（跟显示单位走）。
 */
export declare function segmentNote(r: number, sweep: number, n: number, arc: boolean, fmtR: (m: number) => string): string;

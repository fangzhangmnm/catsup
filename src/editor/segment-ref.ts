// segment-ref.ts —— 圆 / 弧段数的公差与参考档（纪元账本 DT95，user 2026-10-26「马后炮选择段数的时候给一下公差和试用对象参考。
// 加上次世代和lowpoly的推荐值。就像尺寸参考一样。你自己写一个小的仓鼠数据文件，几行就行了。数据驱动」）。
// 档位全在 segment-tiers.json（数据），这里只有几何（弦高 ↔ 段数）和说明行的拼法。created 2026-10-26 by Claude Opus 5.5
import DATA from "./segment-tiers.json" with { type: "json" };

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
export const SEGMENT_TIERS: readonly SegmentTier[] = (DATA as { tiers: SegmentTier[] }).tiers;

/** 段数上下限：和工具选项表 / 数值小窗一致（tool-config circle 3–96、arc 2–96）。 */
export const SEG_MAX = 96;
export const segMin = (arc: boolean): number => (arc ? 2 : 3);
const FULL = 2 * Math.PI;

/** 弦高（拱高）：半径 r、一段对的圆心角 θ → r · (1 − cos(θ / 2))。 */
export function chordHeight(r: number, segAngle: number): number { return r * (1 - Math.cos(segAngle / 2)); }
/** 整圆至少多少段，弦高才 ≤ δ。 */
export function circleSegmentsFor(r: number, delta: number): number {
  if (!(r > 0) || !(delta > 0)) return SEG_MAX;
  if (delta >= r) return 3;
  return Math.ceil(Math.PI / Math.acos(1 - delta / r));
}
/** 这一档在半径 r、扫角 sweep（整圆 = 2π）下要的段数（还没夹上下限）。 */
export function tierSegments(t: SegmentTier, r: number, sweep = FULL): number {
  const full = t.segments ?? circleSegmentsFor(r, (t.chordMm ?? 0.01) / 1000);
  const s = Math.abs(sweep);
  return s >= FULL - 1e-9 ? full : Math.max(1, Math.round((full * s) / FULL));
}
export const clampSegments = (n: number, arc: boolean): number => Math.max(segMin(arc), Math.min(SEG_MAX, Math.round(n)));
/** 这个段数对得上哪一档（夹过上下限后相等）；对不上 = null。 */
export function tierOf(n: number, r: number, sweep: number, arc: boolean): SegmentTier | null {
  return SEGMENT_TIERS.find((t) => clampSegments(tierSegments(t, r, sweep), arc) === n) ?? null;
}
/** 公差按毫米 / 微米写（加工和打印的行话单位）。 */
export function fmtTolerance(m: number): string {
  if (!(m > 0)) return "0";
  if (m >= 1e-4) { const mm = m * 1000; return `${mm >= 10 ? mm.toFixed(1) : mm.toFixed(2)} mm`; }   // 0.1 mm 以上写毫米，以下写微米
  return m >= 1e-6 ? `${Math.round(m * 1e6)} µm` : "< 1 µm";
}
/**
 * 马后炮的说明行：「弦高 0.43 mm（半径 5 cm）· 次世代：游戏里的近景道具…（常见 24–48）」。
 * 按公差的档被上限夹住了 → 如实说「要 N 段（上限 96）」。fmtR = 宿主的长度格式（跟显示单位走）。
 */
export function segmentNote(r: number, sweep: number, n: number, arc: boolean, fmtR: (m: number) => string): string {
  const s = Math.abs(sweep) || FULL;
  const parts = [`弦高 ${fmtTolerance(chordHeight(r, s / n))}（半径 ${fmtR(r)}）`];
  const t = tierOf(n, r, sweep, arc);
  if (t) {
    const want = tierSegments(t, r, sweep);
    parts.push(`${t.name}：${t.for}（常见 ${t.typical}）` + (want > SEG_MAX ? `；这个半径要 ${want} 段，上限 ${SEG_MAX}` : ""));
  }
  return parts.join(" · ");
}

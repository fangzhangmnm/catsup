// minccino/preset/colors.ts —— 画风的四个颜色（墨 / 纸 / 强调 / 警示）和从它们推出来的标记色。created 2026-10-30 by Claude Opus 5.5
// ai-docs/20261029-edge-display-scenarios.md §3 提案（「每个画风只声明四个颜色，其余全由它们推出来」），user 10-30「8你是说UI吗？可以」。
// 以前散在三处（全局色板 / 预设的 marks / 画风翻译表），每个画风手填五个标记色；现在画风只写这四个，规则一处：
//   · 选中的边 / 点 = 强调；选中的面 = 强调往白里提 55%（色相、饱和度不变，HSL）；悬停 = 提 70%；
//   · 刮擦将删、检查 = 警示（两样不会同时出现：橡皮刮的时候不在修复面板里检查）；
//   · 背景 = 纸（有环境图的画风背景是那片天，纸只给字的底板 / 界面日夜两档用）。
// 视图 ☰「选中色」（MarkAccent）= 换掉强调（撞色的警示一起换）；画风标了 ownMarks 的（1-bit / Tron）不换。
export interface StyleColors {
  /** 墨：线稿线、结构线、描边、字、顶点小点（sRGB）。 */
  readonly ink: number;
  /** 纸：背景、字的底板；深浅决定界面用日间还是夜间那套（sRGB）。 */
  readonly paper: number;
  /** 强调：选中（sRGB）。 */
  readonly accent: number;
  /** 警示：刮擦将删、检查（sRGB）。 */
  readonly warn: number;
}

/** 有标记色的材质槽（面的淡出、边的淡出 / 隐线不在这：它们跟底色走）。 */
export type MarkColorSlot = "faceSelected" | "faceHover" | "edgeSelected" | "edgeHot" | "edgeWarn";

/** 选中的面 / 悬停往白里提多少（HSL 亮度，0 = 强调本身、1 = 白）。 */
export const MARK_LIFT = 0.55, FAINT_LIFT = 0.7;   // 反推老的手调值：蓝 #b6cff0 ≈ 0.70、红 #f8cbbf ≈ 0.71

const toHsl = (hex: number): [number, number, number] => {
  const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  if (d < 1e-9) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = mx === r ? ((g - b) / d + 6) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
};
const fromHsl = (h: number, s: number, l: number): number => {
  const c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const q = (v: number): number => Math.max(0, Math.min(255, Math.round((v + m) * 255)));
  return (q(r) << 16) | (q(g) << 8) | q(b);
};
/** 往白里提 k（色相、饱和度不变）：手调过的老标记色（线稿蓝 #8fb4e8、红 #f3a698、1-bit 灰 #8a8a8a）都差不多是这么来的。 */
export function lift(hex: number, k: number): number { const [h, s, l] = toHsl(hex); return fromHsl(h, s, l + (1 - l) * k); }

/** 四个颜色 → 五个标记色。check = 检查单独换色时用（视图「选中色」撞色那份），缺 = 警示。 */
export function markColors(c: StyleColors, check?: number): Readonly<Record<MarkColorSlot, number>> {
  return { faceSelected: lift(c.accent, MARK_LIFT), faceHover: lift(c.accent, FAINT_LIFT), edgeSelected: c.accent, edgeHot: c.warn, edgeWarn: check ?? c.warn };
}
/** 纸是深色的吗（相对亮度 < 0.35）：界面用夜间那套（面板底、图标、字一起换）。 */
export function isDarkPaper(paper: number): boolean {
  const ch = (v: number): number => { const x = v / 255; return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * ch((paper >> 16) & 255) + 0.7152 * ch((paper >> 8) & 255) + 0.0722 * ch(paper & 255) < 0.35;
}

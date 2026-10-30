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
export declare const MARK_LIFT = 0.55, FAINT_LIFT = 0.7;
/** 往白里提 k（色相、饱和度不变）：手调过的老标记色（线稿蓝 #8fb4e8、红 #f3a698、1-bit 灰 #8a8a8a）都差不多是这么来的。 */
export declare function lift(hex: number, k: number): number;
/** 四个颜色 → 五个标记色。check = 检查单独换色时用（视图「选中色」撞色那份），缺 = 警示。 */
export declare function markColors(c: StyleColors, check?: number): Readonly<Record<MarkColorSlot, number>>;
/** 纸是深色的吗（相对亮度 < 0.35）：界面用夜间那套（面板底、图标、字一起换）。 */
export declare function isDarkPaper(paper: number): boolean;

/** 第一层在屏上间距 ≥ minPx 的（worldPerPx = 这一处一像素多少米）；都太密 = 最粗那层。 */
export declare function ladderLevelAt(ladder: readonly number[], worldPerPx: number, minPx: number): number;
/** 从第一层 ≥ minPx 的起，往上 count 层（不够就重复最粗那层，凑满 count 个，给着色器的固定长数组）。 */
export declare function ladderWindow(ladder: readonly number[], worldPerPx: number, minPx: number, count: number): number[];

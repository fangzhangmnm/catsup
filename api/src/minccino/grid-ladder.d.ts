/** 地面网格最细画到哪层：视线目标处屏上间距 ≥ 这么多 CSS 像素的那层起（64：平常视角最细 = 1 m；32 时基线里拉近的场景多出 20 cm 那层、Tron 远处走样，2026-10-30 实测）。
 *  渲染挑网格层和编辑器挑 Z 轴刻度都用它 → 刻度永远不比画出来的最细那层网格密（user 10-30「Z轴的interval好像还是没和grid对齐」：以前刻度按原点处 ≥ 10 像素挑，比网格细好几档）。 */
export declare const GRID_FINEST_PX = 64;
/** 第一层在屏上间距 ≥ minPx 的（worldPerPx = 这一处一像素多少米）；都太密 = 最粗那层。 */
export declare function ladderLevelAt(ladder: readonly number[], worldPerPx: number, minPx: number): number;
/** 从第一层 ≥ minPx 的起，往上 count 层（不够就重复最粗那层，凑满 count 个，给着色器的固定长数组）。 */
export declare function ladderWindow(ladder: readonly number[], worldPerPx: number, minPx: number, count: number): number[];

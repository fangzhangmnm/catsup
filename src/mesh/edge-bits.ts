// mesh/edge-bits.ts —— 网格体边上的位（标记）：只有常量，不 import 任何东西（mesh-kernel 转出；合并点的规则表 merge-points.ts 按名字列它们，不能 import 内核 = 循环）。
// created 2026-11-13 by Claude Opus 5.5（从 mesh-kernel.ts 原样搬来；属性地基轮第三步搬上属性表之后这些位换成列）
export const F_SOFT = 1, F_SMOOTH = 2, F_SEAM = 4, F_HIDDEN = 8, F_WIRE = 16;   // F_WIRE = 裸线（不属于任何面也合法）
/** 手标硬边（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM131）：压过网格体的「默认平滑」，这条边永远是棱（画线、明暗断开）。和 F_SOFT / F_SMOOTH 互斥（标的时候清掉另两位）。 */
export const F_SHARP = 32;

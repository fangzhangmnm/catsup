export declare const F_SOFT = 1, F_SMOOTH = 2, F_SEAM = 4, F_HIDDEN = 8, F_WIRE = 16;
/** 手标硬边（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM131）：压过网格体的「默认平滑」，这条边永远是棱（画线、明暗断开）。和 F_SOFT / F_SMOOTH 互斥（标的时候清掉另两位）。 */
export declare const F_SHARP = 32;

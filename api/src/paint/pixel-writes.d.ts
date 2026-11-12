export type PixelRule = {
    readonly kind: "asks-lock";
    readonly how: string;
} | {
    readonly kind: "via";
    readonly from: string;
} | {
    readonly kind: "load";
    readonly why: string;
} | {
    readonly kind: "no-pixels";
    readonly why: string;
};
/** 类 → 公开方法（含 constructor 和 getter）→ 表态。键 = 守卫扫源码时用的名字。 */
export declare const PIXEL_WRITES: Readonly<Record<"PaintBoard" | "PaintBoards" | "SpacePaintStroke" | "PaintWorkbench", Readonly<Record<string, PixelRule>>>>;
/** 每个类住在哪个文件（守卫用）。 */
export declare const PIXEL_WRITE_FILES: Readonly<Record<keyof typeof PIXEL_WRITES, string>>;

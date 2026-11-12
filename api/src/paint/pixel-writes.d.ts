/** 画板睡着时这个口怎么办（见头注释）。 */
export interface AsleepRule {
    readonly asleep: "gpu" | "memory" | "via";
    readonly how: string;
}
export type PixelRule = ({
    readonly kind: "asks-lock";
    readonly how: string;
} & {
    readonly sleep: AsleepRule;
}) | ({
    readonly kind: "via";
    readonly from: string;
} & {
    readonly sleep: AsleepRule;
}) | ({
    readonly kind: "load";
    readonly why: string;
} & {
    readonly sleep: AsleepRule;
}) | {
    readonly kind: "no-pixels";
    readonly why: string;
};
/** 类 → 公开方法（含 constructor 和 getter）→ 表态。键 = 守卫扫源码时用的名字。 */
export declare const PIXEL_WRITES: Readonly<Record<"PaintBoard" | "PaintBoards" | "SpacePaintStroke" | "PaintWorkbench", Readonly<Record<string, PixelRule>>>>;
/** 每个类住在哪个文件（守卫用）。 */
export declare const PIXEL_WRITE_FILES: Readonly<Record<keyof typeof PIXEL_WRITES, string>>;

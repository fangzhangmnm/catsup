export type Rgb = readonly [number, number, number];
export interface PaintColor {
    get(): Rgb;
    /** 选了这个颜色（色块 / 代码 / 吸管都走这里）。 */
    set(c: Rgb): void;
    subscribe(fn: () => void): () => void;
}
/** 新文件 / 文件里没记的时候的颜色。 */
export declare const PAINT_COLOR_DEFAULT: Rgb;
/** 「#rrggbb」（# 可省、大小写都行）→ sRGB 0..1；别的写法 = null。 */
export declare function parseHexColor(s: string): Rgb | null;
export declare function hexOf(c: Rgb): string;
export declare function createPaintColor(): PaintColor;
/**
 * 选颜色的面板（第一版：家族色表的色块 + 一个填颜色代码的框）。root = 面板的根（index.html #paintColorSheet），grid / hex / ok / close 是里面的几个元素。
 * 返回 open / close / isOpen；开着的时候是输入闸名册里的一张面（main.ts 登记）。以后换色轮只改这个函数。
 */
export declare function mountPaintColorSheet(el: {
    root: HTMLElement;
    grid: HTMLElement;
    hex: HTMLInputElement;
    ok: HTMLElement;
    close: HTMLElement;
    note: HTMLElement;
}, color: PaintColor): {
    open(): void;
    close(): void;
    isOpen(): boolean;
};

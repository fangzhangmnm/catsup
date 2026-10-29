/** 样式名：加一种样式 = 在 LABEL_STYLES 加一行（以后「牌子」= 猫娘举的那种）。 */
export type LabelStyleId = "scale";
/** 挂在点的哪一侧（屏幕上）：below = 字在点的下面，依此类推；center = 字的中心压在点上。 */
export type LabelAnchor = "below" | "above" | "left" | "right" | "center";
export interface LabelStyle {
    fontPx: number;
    weight: number;
    color: string;
    /** 底色（null = 透明）；「背景颜色的小字」= 底色同画布背景，盖住后面的网格线。 */
    bg: string | null;
    padX: number;
    padY: number;
    radius: number;
}
/** 样式表（CSS px）。颜色写死成和 styles.css 的 token 一样的值（render 层读不到 CSS 变量；改主题时两边一起改）。 */
export declare const LABEL_STYLES: Readonly<Record<LabelStyleId, LabelStyle>>;
/** 光栅好的字：canvas（像素 = CSS px × dpr）+ CSS px 尺寸。 */
export interface LabelBitmap {
    canvas: HTMLCanvasElement;
    w: number;
    h: number;
    key: string;
}
/** 光栅化（按 文字 + 样式 + dpr 缓存，最多留 64 张、先进先出）。测量用同一块 canvas 的 measureText。 */
export declare function rasterizeLabel(text: string, style: LabelStyleId, dpr: number): LabelBitmap;
/** 字块在面片坐标里的锚点（three Sprite.center：0..1，(0.5, 1) = 点在字块上沿正中 → 字挂在点下面）。gap 换算成字块高 / 宽的比例。 */
export declare function anchorCenter(anchor: LabelAnchor, w: number, h: number, gapPx: number): [number, number];

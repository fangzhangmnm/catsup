// minccino/backend/label-raster.ts —— 文字 → 位图（canvas 2D，只用于显示；深模块原在 editor/world-labels.ts，2026-10-25 Claude Opus 5.5；
// Tron 第一刀步 6b 搬进引擎后端：排版样式表 + 光栅化 + 锚点换算；「哪段字挂哪」（WorldLabel）和单位换算仍归编辑器。created 2026-10-29 by Claude Fable 5.1
// 住 backend/ 而不是 overlay/：碰 DOM（canvas）——守卫 ③「backend 外零 DOM」。

/** 样式名：加一种样式 = 在 LABEL_STYLES 加一行（以后「牌子」= 猫娘举的那种）。 */
export type LabelStyleId = "scale";
/** 挂在点的哪一侧（屏幕上）：below = 字在点的下面，依此类推；center = 字的中心压在点上。 */
export type LabelAnchor = "below" | "above" | "left" | "right" | "center";

export interface LabelStyle {
  fontPx: number; weight: number; color: string;
  /** 底色（null = 透明）；「背景颜色的小字」= 底色同画布背景，盖住后面的网格线。 */
  bg: string | null;
  padX: number; padY: number; radius: number;
}
/** 样式表（CSS px）。颜色写死成和 styles.css 的 token 一样的值（render 层读不到 CSS 变量；改主题时两边一起改）。 */
export const LABEL_STYLES: Readonly<Record<LabelStyleId, LabelStyle>> = {
  scale: { fontPx: 11, weight: 500, color: "#7a776f", bg: "#f2f0ea", padX: 3, padY: 1, radius: 3 },   // bg = --bg
};

/** 光栅好的字：canvas（像素 = CSS px × dpr）+ CSS px 尺寸。 */
export interface LabelBitmap { canvas: HTMLCanvasElement; w: number; h: number; key: string }

const cache = new Map<string, LabelBitmap>();
const CACHE_MAX = 64;
/** 光栅化（按 文字 + 样式 + dpr 缓存，最多留 64 张、先进先出）。测量用同一块 canvas 的 measureText。 */
export function rasterizeLabel(text: string, style: LabelStyleId, dpr: number): LabelBitmap {
  const key = `${style}|${dpr}|${text}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const s = LABEL_STYLES[style];
  const font = `${s.weight} ${s.fontPx}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`;
  const canvas = document.createElement("canvas");
  const g = canvas.getContext("2d")!;
  g.font = font;
  const tw = Math.ceil(g.measureText(text).width);
  const w = tw + s.padX * 2, h = Math.ceil(s.fontPx * 1.25) + s.padY * 2;
  canvas.width = Math.max(1, Math.round(w * dpr)); canvas.height = Math.max(1, Math.round(h * dpr));
  g.scale(dpr, dpr);
  if (s.bg) {
    g.fillStyle = s.bg;
    g.beginPath(); g.roundRect(0, 0, w, h, s.radius); g.fill();
  }
  g.font = font; g.fillStyle = s.color; g.textBaseline = "middle"; g.textAlign = "left";
  g.fillText(text, s.padX, h / 2 + 0.5);
  const bm = { canvas, w, h, key };
  cache.set(key, bm);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value!);
  return bm;
}

/** 字块在面片坐标里的锚点（three Sprite.center：0..1，(0.5, 1) = 点在字块上沿正中 → 字挂在点下面）。gap 换算成字块高 / 宽的比例。 */
export function anchorCenter(anchor: LabelAnchor, w: number, h: number, gapPx: number): [number, number] {
  switch (anchor) {
    case "below": return [0.5, 1 + gapPx / h];
    case "above": return [0.5, -gapPx / h];
    case "left": return [1 + gapPx / w, 0.5];
    case "right": return [-gapPx / w, 0.5];
    default: return [0.5, 0.5];
  }
}

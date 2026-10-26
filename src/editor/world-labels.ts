// world-labels.ts —— 世界里的文字（标签深模块）：挂在 3D 某一点上、固定屏幕大小的一小块字。created 2026-10-25 by Claude Opus 5.5
// user 2026-10-25「文字可以好好设计一个深模块，不要ad hoc，以后猫娘举牌子也会用到的」。第一个用户 = X 轴 +1 个单位处的「1 m」（user 同日「能不能在x轴+1的地方背景颜色的小字写上1m或者别的单位定义」）。
//
// 窄接口：调用方只说「哪段字、挂在哪、用哪种样式、在点的哪一侧」——WorldLabel；字体 / 颜色 / 底 / 边距这些排版全在样式表 LABEL_STYLES 里，
// 光栅化（canvas 2D → 位图，只用于显示）和缓存也在这里。这个文件不碰 three（three 只在 render3.ts，build.sh 有 lint）；
// render3 只拿位图贴成固定屏幕大小的面片，按 id 增删改，字和样式没变就不重画。
import type { Pt3 } from "../kernel/kernel.ts";

/** 样式名：加一种样式 = 在 LABEL_STYLES 加一行（以后「牌子」= 猫娘举的那种）。 */
export type LabelStyleId = "scale";
/** 挂在点的哪一侧（屏幕上）：below = 字在点的下面，依此类推；center = 字的中心压在点上。 */
export type LabelAnchor = "below" | "above" | "left" | "right" | "center";
export interface WorldLabel {
  /** 稳定身份（同一个 id = 同一块字，挪位置不重画）。 */
  id: string;
  text: string;
  /** 世界坐标。 */
  at: Pt3;
  style: LabelStyleId;
  anchor?: LabelAnchor;
  /** 和点之间留几 CSS px（默认 3）。 */
  gapPx?: number;
  /** 被模型挡住时藏起来（默认 true）；false = 永远在最上面。 */
  occlude?: boolean;
}

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

/** 单位刻度（X 轴 +1 个单位处的字 + Z 轴刻度的间距）：公制念「1 m」，英制念「1 ft」。 */
export function unitMark(unit: string): { unitM: number; label: string } {
  return unit === "ft" || unit === "in" ? { unitM: 0.3048, label: "1 ft" } : { unitM: 1, label: "1 m" };
}
/**
 * 一格有多大的字（DT16，user 10-25「1m的标记没有跟着格子的大小更新」）：X 轴上那个小标记放在一格处、写一格的长度。
 * 米制按大小挑 m / cm / mm；英制整英尺写「n ft」、不到一英尺写英寸、其余写英尺英寸（格子按米设、单位却是英尺时照实写，比如 1 m = 3' 3.38"）。
 */
export function gridStepLabel(stepM: number, unit: string): string {
  const trim = (v: number): string => String(Number(v.toFixed(3)));
  if (unit === "ft" || unit === "in") {
    const inch = stepM / 0.0254, ft = Math.round(inch / 12);
    if (ft >= 1 && Math.abs(inch - ft * 12) < 1e-6) return `${ft} ft`;
    if (inch < 12) return `${trim(inch)} in`;
    const f = Math.floor(inch / 12 + 1e-9), rest = inch - f * 12;
    return `${f}' ${Number(rest.toFixed(2))}"`;
  }
  return stepM >= 1 ? `${trim(stepM)} m` : stepM >= 0.01 ? `${trim(stepM * 100)} cm` : `${trim(stepM * 1000)} mm`;
}

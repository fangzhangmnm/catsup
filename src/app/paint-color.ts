// paint-color.ts —— 画画的「现在的颜色」：选颜色只有这一个入口（贴图主线 1-7；统筹 11-11：「选颜色的地方只有一个入口，以后换成色轮只改这一处」）。created 2026-11-11 by Claude Opus 5.5
// 三种选法都走 PaintColor.set：色块（三维现成的家族色表 PALETTE_ZH）、填颜色代码（#rrggbb，填错了说一句、不改当前颜色）、吸管（画画控制器取到的颜色）。
// 正式的取色面板（色轮）= 画画仓那一套抽进共享库之后（家族周账 F-253）换掉 mountPaintColorSheet 这一处；颜色本身（sRGB 0..1）和 set 的口不变。
// 颜色跟文件走（desk 1.5 paint.color；user 11-11「笔的设置记在哪 学weebpaint」）：这里只在内存里记着现在的颜色，宿主（main.ts）载入时套上、改了写回桌面态；设备上不记。
import { PALETTE_ZH } from "./palette.ts";

export type Rgb = readonly [number, number, number];
export interface PaintColor {
  get(): Rgb;
  /** 选了这个颜色（色块 / 代码 / 吸管都走这里）。 */
  set(c: Rgb): void;
  subscribe(fn: () => void): () => void;
}
/** 新文件 / 文件里没记的时候的颜色。 */
export const PAINT_COLOR_DEFAULT: Rgb = [0.1, 0.1, 0.1];
const DEFAULT = PAINT_COLOR_DEFAULT;
const clamp01 = (v: number): number => Math.min(1, Math.max(0, v));

/** 「#rrggbb」（# 可省、大小写都行）→ sRGB 0..1；别的写法 = null。 */
export function parseHexColor(s: string): Rgb | null {
  const m = /^\s*#?([0-9a-fA-F]{6})\s*$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}
export function hexOf(c: Rgb): string { return "#" + c.map((v) => Math.round(clamp01(v) * 255).toString(16).padStart(2, "0")).join(""); }

export function createPaintColor(): PaintColor {
  let cur: Rgb = DEFAULT;
  const subs = new Set<() => void>();
  return {
    get: () => cur,
    set: (c) => { cur = [clamp01(c[0]), clamp01(c[1]), clamp01(c[2])]; for (const f of [...subs]) f(); },
    subscribe: (fn) => { subs.add(fn); return () => { subs.delete(fn); }; },
  };
}

/**
 * 选颜色的面板（第一版：家族色表的色块 + 一个填颜色代码的框）。root = 面板的根（index.html #paintColorSheet），grid / hex / ok / close 是里面的几个元素。
 * 返回 open / close / isOpen；开着的时候是输入闸名册里的一张面（main.ts 登记）。以后换色轮只改这个函数。
 */
export function mountPaintColorSheet(el: { root: HTMLElement; grid: HTMLElement; hex: HTMLInputElement; ok: HTMLElement; close: HTMLElement; note: HTMLElement }, color: PaintColor): { open(): void; close(): void; isOpen(): boolean } {
  const render = (): void => {
    el.grid.replaceChildren();
    const now = hexOf(color.get());
    for (const c of PALETTE_ZH) {
      const b = document.createElement("button");
      b.type = "button"; b.className = "swatch" + (c.hex.toLowerCase() === now ? " active" : ""); b.title = `${c.name} ${c.hex}`; b.style.background = c.hex;
      const t = document.createElement("span"); t.className = "swatch-label"; t.textContent = c.name; b.appendChild(t);
      b.addEventListener("click", () => { const rgb = parseHexColor(c.hex); if (rgb) color.set(rgb); close(); });
      el.grid.appendChild(b);
    }
    el.hex.value = now; el.note.textContent = "";
  };
  const applyHex = (): void => {
    const rgb = parseHexColor(el.hex.value);
    if (!rgb) { el.note.textContent = `「${el.hex.value.trim()}」不是颜色代码：要写成 #rrggbb（比如 #e8b4a0），现在的颜色没变`; return; }
    color.set(rgb); close();
  };
  const close = (): void => { el.root.hidden = true; };
  el.ok.addEventListener("click", applyHex);
  el.hex.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); applyHex(); } });
  el.close.addEventListener("click", close);
  el.root.addEventListener("pointerdown", (e) => { if (e.target === el.root) close(); });   // 点面板外面 = 关
  return { open: () => { render(); el.root.hidden = false; }, close, isOpen: () => !el.root.hidden };
}

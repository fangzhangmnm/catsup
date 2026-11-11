// paint-sliders.ts —— 画画的大小 / 浓度：左栏 dial 的两根竖滑条（贴图主线 1-7；WeebPaint 左栏 笔粗 · 不透明度 同款）。created 2026-11-11 by Claude Opus 5.5
// 只在画画工作台、手上拿着笔或橡皮时露；值住 tool-config（笔 / 橡皮各一套，记在设备上）。大小 = 屏幕像素、对数刻度、整数档位（和软选择半径那张表同一个意思）；浓度 = 5%–100%。
import type { Editor } from "../editor/editor.ts";
import type { LeftDial } from "./left-dial.ts";

const MIN = 1, MAX = 400;
const BANDS: readonly [number, number][] = [[10, 1], [20, 1], [50, 2], [100, 5], [200, 10], [Infinity, 20]];
const stepAt = (v: number): number => BANDS.find(([top]) => v < top)![1];
const nice = (v: number): number => { const r = Math.min(MAX, Math.max(MIN, v)), s = stepAt(r); return Math.min(MAX, Math.max(MIN, Math.round(r / s) * s)); };
const sizePos = (r: number): number => Math.log(r / MIN) / Math.log(MAX / MIN);
const sizeFrom = (p: number): number => nice(MIN * (MAX / MIN) ** p);
const sizeStep = (r: number, dir: 1 | -1): number => { let n = nice(r * (dir > 0 ? 1.15 : 1 / 1.15)); if (n === nice(r)) n = nice(r + dir * stepAt(r)); return n; };
const opaNice = (v: number): number => Math.min(1, Math.max(0.05, Math.round(v * 20) / 20));

export function mountPaintSliders(dial: LeftDial, editor: Editor): { render(): void } {
  const pen = (): "paintPen" | "paintEraser" | null => (editor.modeId === "paint" && (editor.tool === "paintPen" || editor.tool === "paintEraser") ? editor.tool : null);
  const name = (): string => (pen() === "paintEraser" ? "橡皮" : "笔");
  dial.addSlider({
    id: "paintSize", icon: "brush-width", visible: () => pen() !== null,
    title: () => `${name()}的大小 ${pen() ? editor.config.get(pen()!, "size") : ""} 像素（屏幕上看到多大就多大）`,
    ariaLabel: "画笔大小",
    value: () => (pen() ? editor.config.get(pen()!, "size") : 12),
    toPos: sizePos, fromPos: sizeFrom, step: sizeStep,
    readout: (v) => `${name()} ${v} 像素`,
    onInput: (v) => { const t = pen(); if (t) editor.config.set(t, "size", v); },
  });
  dial.addSlider({
    id: "paintOpacity", icon: "opacity", visible: () => pen() !== null,
    title: () => `${name()}的浓度 ${pen() ? Math.round(editor.config.get(pen()!, "opacity") * 100) : ""}%`,
    ariaLabel: "画笔浓度",
    value: () => (pen() ? editor.config.get(pen()!, "opacity") : 1),
    toPos: (v) => (v - 0.05) / 0.95, fromPos: (p) => opaNice(0.05 + 0.95 * p), step: (v, dir) => opaNice(v + dir * 0.05),
    readout: (v) => `浓度 ${Math.round(v * 100)}%`,
    onInput: (v) => { const t = pen(); if (t) editor.config.set(t, "opacity", v); },
  });
  editor.config.subscribe(() => dial.render());
  return { render: () => dial.render() };
}

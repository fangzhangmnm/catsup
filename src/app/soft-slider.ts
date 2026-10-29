// soft-slider.ts —— 软选择的半径：左边一根竖滑条（WeebPaint 左栏笔刷粗细那根的同款）+ 画布上的半径圈。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「为什么不先做软选择，然后weebpaint的slider放哪里」；纪元账本 FM20「软编辑要不要全局共享？甚至可以学weebpaint，做成一个笔刷大小的slider!」。
// 放哪：左柱（工具）右边、竖着居中，只在「开着软选择 + 拿着会用它的工具」时露（不吃视口：不用的时候不在）。值 = 屏幕像素（手上看到多大就多大），对数刻度（小半径好调）。
// 拖滑条时画布上出半径圈：手势中圈在轴心（工具画）；没手势时圈在选区中心（这里画），松手收。
// 2026-10-29（Opus）：换成自己画的竖滑条（ui/vslider.ts）+ WeebPaint 左栏那张毛玻璃卡片 + 档位表 + 读数气泡（user 10-28 夜「不要使用内置的，学一下weebpaint那个」）。
import type { Editor } from "../editor/editor.ts";
import type { LeftDial } from "./left-dial.ts";

// 档位（WeebPaint 笔粗那张表的同款：小的时候一档 1 像素、大了一档跨得多——user 拖到的数都是整数，不出 137 这种）：
// 10..20 步 1 · 20..50 步 2 · 50..100 步 5 · 100..200 步 10 · 200..500 步 20 · 500..800 步 50
const MIN = 10, MAX = 800;
const BANDS: readonly [number, number][] = [[20, 1], [50, 2], [100, 5], [200, 10], [500, 20], [Infinity, 50]];
const stepAt = (v: number): number => BANDS.find(([top]) => v < top)![1];
/** 拉到最近的档位上（滑条 / [ ] 键 / 打数共用）。 */
export const niceRadius = (v: number): number => { const r = Math.min(MAX, Math.max(MIN, v)), s = stepAt(r); return Math.min(MAX, Math.max(MIN, Math.round(r / s) * s)); };
const toPos = (r: number): number => Math.log(r / MIN) / Math.log(MAX / MIN);   // 对数：小半径好调（user 10-28 夜「是和weebpaint一样的logslider吗」）
const fromPos = (p: number): number => niceRadius(MIN * (MAX / MIN) ** p);
/** [ ] 键 / ↑ ↓：下一档 / 上一档（按档位走，不是乘 1.2——跳的数也是整数）。 */
export const stepRadius = (r: number, dir: 1 | -1): number => { const k = dir > 0 ? 1.15 : 1 / 1.15; let n = niceRadius(r * k); if (n === niceRadius(r)) n = niceRadius(r + dir * stepAt(r)); return n; };

export interface SoftSlider { render(): void; ring(c: { x: number; y: number; r: number } | null): void; flash(): void }

/** 软选择半径 = 左栏 dial 的第一格（left-dial.ts；以后的不透明度 / 取样钮排在它下面）+ 画布上的半径圈。 */
export function mountSoftSlider(dial: LeftDial, stage: HTMLElement, canvas: HTMLElement, editor: Editor, deps: { visible(): boolean; selectionScreenCenter(): { x: number; y: number } | null }): SoftSlider {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.classList.add("soft-ring"); svg.id = "softRing"; svg.setAttribute("aria-hidden", "true");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); svg.appendChild(circle); (svg as unknown as { hidden: boolean }).hidden = true;
  stage.appendChild(svg);
  const ring = (c: { x: number; y: number; r: number } | null): void => {
    (svg as unknown as { hidden: boolean }).hidden = !c;
    if (!c) return;
    const b = canvas.getBoundingClientRect();   // 坐标 = 画布本地 CSS px（同套索）
    Object.assign(svg.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    circle.setAttribute("cx", String(c.x)); circle.setAttribute("cy", String(c.y)); circle.setAttribute("r", String(c.r));
  };
  const showIdleRing = (): void => { if (editor.isGestureActive()) return; const c = deps.selectionScreenCenter(); ring(c ? { ...c, r: editor.config.get("soft", "radius") } : null); };
  let ringTimer = 0;
  const slider = dial.addSlider({
    id: "softRadius", icon: "brush-width", visible: deps.visible,
    title: () => `软选择半径 ${editor.config.get("soft", "radius")} 像素（[ ] 键也能调；O = 开 / 关）`,
    ariaLabel: "软选择半径",
    value: () => editor.config.get("soft", "radius"),
    toPos, fromPos,
    readout: (v) => `半径 ${v} 像素`,
    step: stepRadius,
    // 拖的时候圈实时跟着变（user 10-28 夜「滑条拉的时候范围应该实时变」）；松手收圈（手势中的圈归工具画，这里不收）
    onInput: (v) => { editor.config.set("soft", "radius", v); showIdleRing(); editor.refreshGesture(); },
    onStart: () => showIdleRing(),
    onEnd: () => { if (!editor.isGestureActive()) ring(null); },
  });
  canvas.addEventListener("pointerdown", () => { if (!editor.isGestureActive() && !slider.dragging()) ring(null); });   // 兜底：画布上一按，没在操作就收圈
  const render = (): void => { dial.render(); if (!deps.visible() && !editor.isGestureActive()) ring(null); };
  editor.config.subscribe(() => render());   // 工具条开关软选择 / 打数改半径：卡片马上跟（不等整页刷新）
  /** [ ] 键调完：读数气泡 + 画布上的圈都闪一下（WeebPaint 键盘调粗也闪 popup）。 */
  const flash = (): void => { if (!deps.visible()) return; dial.flash("softRadius"); showIdleRing(); clearTimeout(ringTimer); ringTimer = window.setTimeout(() => { if (!editor.isGestureActive() && !slider.dragging()) ring(null); }, 1500); };
  return { render, ring, flash };
}

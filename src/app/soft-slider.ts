// soft-slider.ts —— 软选择的半径：左边一根竖滑条（WeebPaint 左栏笔刷粗细那根的同款）+ 画布上的半径圈。created 2026-10-28 by Claude Opus 5.5
// user 10-28 夜「为什么不先做软选择，然后weebpaint的slider放哪里」；纪元账本 FM20「软编辑要不要全局共享？甚至可以学weebpaint，做成一个笔刷大小的slider!」。
// 放哪：左柱（工具）右边、竖着居中，只在「开着软选择 + 拿着会用它的工具」时露（不吃视口：不用的时候不在）。值 = 屏幕像素（手上看到多大就多大），对数刻度（小半径好调）。
// 拖滑条时画布上出半径圈：手势中圈在轴心（工具画）；没手势时圈在选区中心（这里画），松手收。
import type { Editor } from "../editor/editor.ts";

const MIN = 10, MAX = 800, STEPS = 1000;
const toPos = (r: number): number => Math.round((Math.log(r / MIN) / Math.log(MAX / MIN)) * STEPS);
const toR = (pos: number): number => Math.round(MIN * (MAX / MIN) ** (pos / STEPS));

export interface SoftSlider { render(): void; ring(c: { x: number; y: number; r: number } | null): void }

export function mountSoftSlider(stage: HTMLElement, canvas: HTMLElement, editor: Editor, deps: { visible(): boolean; selectionScreenCenter(): { x: number; y: number } | null }): SoftSlider {
  const box = document.createElement("div"); box.className = "soft-slider"; box.hidden = true;
  const input = document.createElement("input"); input.type = "range"; input.min = "0"; input.max = String(STEPS); input.className = "soft-slider-range"; input.setAttribute("aria-label", "软选择半径");
  const label = document.createElement("span"); label.className = "soft-slider-label";
  box.append(input, label);
  stage.appendChild(box);
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.classList.add("soft-ring"); svg.id = "softRing"; svg.setAttribute("aria-hidden", "true");
  const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle"); svg.appendChild(circle); (svg as unknown as { hidden: boolean }).hidden = true;
  stage.appendChild(svg);
  let dragging = false;
  const ring = (c: { x: number; y: number; r: number } | null): void => {
    (svg as unknown as { hidden: boolean }).hidden = !c;
    if (!c) return;
    const b = canvas.getBoundingClientRect();   // 坐标 = 画布本地 CSS px（同套索）
    Object.assign(svg.style, { left: `${b.left}px`, top: `${b.top}px`, width: `${b.width}px`, height: `${b.height}px` });
    circle.setAttribute("cx", String(c.x)); circle.setAttribute("cy", String(c.y)); circle.setAttribute("r", String(c.r));
  };
  const showIdleRing = (): void => { if (editor.isGestureActive()) return; const c = deps.selectionScreenCenter(); ring(c ? { ...c, r: editor.config.get("soft", "radius") } : null); };
  input.addEventListener("input", () => { editor.config.set("soft", "radius", toR(Number(input.value))); label.textContent = `${editor.config.get("soft", "radius")}`; if (dragging) showIdleRing(); editor.refreshGesture(); });
  input.addEventListener("pointerdown", () => { dragging = true; showIdleRing(); });
  const end = (): void => { if (!dragging) return; dragging = false; if (!editor.isGestureActive()) ring(null); };
  window.addEventListener("pointerup", end); window.addEventListener("pointercancel", end);
  const render = (): void => {
    const v = deps.visible();
    box.hidden = !v;
    if (!v) return;
    const r = editor.config.get("soft", "radius");
    if (document.activeElement !== input) input.value = String(toPos(r));
    label.textContent = `${r}`;
    box.title = `软选择半径 ${r} 像素（[ ] 键也能调；O = 开 / 关）`;
  };
  return { render, ring };
}

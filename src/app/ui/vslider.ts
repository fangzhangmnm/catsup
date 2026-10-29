// vslider.ts —— 自己画的竖滑条（不用浏览器自带的 range；user 10-28 夜「软选择要不还是放那里，不要使用内置的，学一下weebpaint那个」）。created 2026-10-29 by Claude Opus 5.5
// 为什么自己画：自带的竖 range 在 iPad 上把指针抓走、松手那一下到不了外面（软选择半径圈收不掉那次），各浏览器长得也不一样。
// 这里：整根是一个按钮区，按下就 setPointerCapture（之后的移动 / 松手一定回到这里）、按哪跳哪、拖着走；键盘 ↑ ↓ / PageUp PageDown / Home End。
// 值和位置的换算交给调用方（对数 / 分段都行）：toPos(值) → 0..1（下 → 上），fromPos(0..1) → 值。旁边一个读数气泡（WeebPaint 左栏拖粗细时冒出来的那个）：拖着时露、松手 1.5 s 后收。
export interface VSliderOpts {
  readonly ariaLabel: string;
  value(): number;
  toPos(v: number): number;
  fromPos(p: number): number;
  onInput(v: number): void;
  /** 读数气泡里的字。 */
  readout(v: number): string;
  /** 键盘一下走一档（dir = +1 / −1）。 */
  step(v: number, dir: 1 | -1): number;
  onStart?(): void;
  onEnd?(): void;
}
export interface VSlider { readonly el: HTMLElement; render(): void; dragging(): boolean; flash(): void }

export function mountVSlider(parent: HTMLElement, o: VSliderOpts): VSlider {
  const el = document.createElement("div"); el.className = "vslider"; el.tabIndex = 0;
  el.setAttribute("role", "slider"); el.setAttribute("aria-orientation", "vertical"); el.setAttribute("aria-label", o.ariaLabel);
  el.innerHTML = '<div class="vslider-track"><div class="vslider-fill"></div></div><div class="vslider-thumb"></div><div class="vslider-bubble" hidden></div>';
  parent.appendChild(el);
  const fill = el.querySelector(".vslider-fill") as HTMLElement, thumb = el.querySelector(".vslider-thumb") as HTMLElement, bubble = el.querySelector(".vslider-bubble") as HTMLElement;
  let drag: number | null = null, hideAt = 0;
  const posOfY = (clientY: number): number => { const r = el.getBoundingClientRect(), pad = thumb.offsetHeight / 2 || 9; return Math.min(1, Math.max(0, 1 - (clientY - r.top - pad) / Math.max(1, r.height - 2 * pad))); };
  const showBubble = (on: boolean): void => { bubble.hidden = !on; };
  const render = (): void => {
    const v = o.value(), p = Math.min(1, Math.max(0, o.toPos(v)));
    el.style.setProperty("--p", String(p));
    el.setAttribute("aria-valuenow", String(v)); el.setAttribute("aria-valuetext", o.readout(v));
    bubble.textContent = o.readout(v);
    if (drag === null && performance.now() > hideAt) showBubble(false);
    void fill; void thumb;
  };
  const set = (v: number): void => { o.onInput(v); render(); };
  el.addEventListener("pointerdown", (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    drag = e.pointerId; try { el.setPointerCapture(e.pointerId); } catch { /* 指针已经没了 / 合成事件：照常拖，松手靠下面 window 那层 */ } el.focus({ preventScroll: true });
    o.onStart?.(); showBubble(true); set(o.fromPos(posOfY(e.clientY)));
  });
  el.addEventListener("pointermove", (e) => { if (drag !== e.pointerId) return; set(o.fromPos(posOfY(e.clientY))); });
  const end = (e: PointerEvent): void => { if (drag !== e.pointerId) return; drag = null; hideAt = performance.now() + 1500; setTimeout(render, 1550); o.onEnd?.(); };
  for (const t of ["pointerup", "pointercancel", "lostpointercapture"] as const) el.addEventListener(t, end);
  for (const t of ["pointerup", "pointercancel"] as const) window.addEventListener(t, end);   // 第二层：捕获没抓住（老浏览器 / 指针被系统抢走）时松手也收（end 只认按下的那根指针）
  el.addEventListener("keydown", (e) => {
    const dir = e.key === "ArrowUp" || e.key === "PageUp" ? 1 : e.key === "ArrowDown" || e.key === "PageDown" ? -1 : 0;
    if (dir) { e.preventDefault(); e.stopPropagation(); let v = o.value(); for (let i = 0; i < (e.key.startsWith("Page") ? 5 : 1); i++) v = o.step(v, dir as 1 | -1); set(v); flash(); return; }
    if (e.key === "Home" || e.key === "End") { e.preventDefault(); e.stopPropagation(); set(o.fromPos(e.key === "End" ? 1 : 0)); flash(); }
  });
  const flash = (): void => { render(); showBubble(true); hideAt = performance.now() + 1500; setTimeout(render, 1550); };
  render();
  return { el, render, dragging: () => drag !== null, flash };
}

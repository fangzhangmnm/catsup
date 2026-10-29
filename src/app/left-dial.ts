// left-dial.ts —— 左栏 dial：左柱右边一张毛玻璃卡片，里面一格一格往下排（WeebPaint 左栏同款：笔粗滑条 · 取样钮 · 不透明度滑条）。created 2026-10-29 by Claude Opus 5.5
// user 10-28 夜「软选择要不还是放那里，不要使用内置的，学一下weebpaint那个」→ 10-29「因为我们以后要全量接weebpaint，所以这个条子以后也能支持opacity和color」「反正就是和weebpaint一样」。
// 一格 = 一根自己画的竖滑条（ui/vslider.ts）+ 下面一个图标（数字在拖动时冒出的读数气泡里，WeebPaint 同款）；以后的取样钮 = addButton。
// 卡片露不露 = 任何一格露（每格自己说 visible）；全不露 = 整张卡片不在（不吃视口）。第一格 = 软选择半径（soft-slider.ts）。
import { mountVSlider, type VSlider, type VSliderOpts } from "./ui/vslider.ts";
import { iconHtml } from "./ui/icon.ts";

export interface DialSliderSpec extends VSliderOpts {
  readonly id: string;
  /** 下面那个图标（WeebPaint：笔粗 = brush-width、不透明度 = opacity）。 */
  readonly icon: string;
  title(): string;
  visible(): boolean;
}
export interface LeftDial { addSlider(spec: DialSliderSpec): VSlider; render(): void; flash(id: string): void }

export function mountLeftDial(stage: HTMLElement): LeftDial {
  const card = document.createElement("div"); card.className = "left-dial"; card.hidden = true;
  stage.appendChild(card);
  const slots: { spec: DialSliderSpec; wrap: HTMLElement; slider: VSlider }[] = [];
  const render = (): void => {
    let any = false;
    for (const s of slots) {
      const v = s.spec.visible();
      s.wrap.hidden = !v; any ||= v;
      if (v) { s.slider.render(); s.wrap.title = s.spec.title(); }
    }
    card.hidden = !any;
  };
  return {
    addSlider(spec) {
      const wrap = document.createElement("div"); wrap.className = "left-dial-slot"; wrap.dataset.dial = spec.id;
      card.appendChild(wrap);
      const slider = mountVSlider(wrap, spec);
      const lab = document.createElement("span"); lab.className = "left-dial-label"; lab.setAttribute("aria-hidden", "true"); lab.innerHTML = iconHtml(spec.icon, { size: 14 });
      wrap.appendChild(lab);
      slots.push({ spec, wrap, slider });
      return slider;
    },
    render,
    flash(id) { const s = slots.find((x) => x.spec.id === id); if (s && !s.wrap.hidden) s.slider.flash(); },
  };
}

// work-bar.ts —— 要等的大活的细进度条：窗口顶边一条 3 px 的线（MoonSinger src/ui/render-progress.ts 同款，账本 UX7；user 10-28「以及要等的进度条参考一下moonsinger，那个非常节省空间，就占了几个像素」）。
// 不许谎报：CatsUp 的大活（修复擦线 / 转换 / 细分）不知道百分比，所以只有一段来回流动的条纹 = 「在干活」，不假装进度。
// 条纹走 transform 动画：大活是同步跑的、主线程卡住，transform 动画在合成器上照样动（background-position 动画会停）。created 2026-10-28 by Claude Opus 5.5
export interface WorkBar {
  /** 露出来（label = 读屏 / 悬停字）；返回的 Promise 在条真的画上屏以后才 resolve（两帧），调用方等它再开跑。 */
  show(label: string): Promise<void>;
  hide(): void;
}
export function mountWorkBar(parent: HTMLElement = document.body): WorkBar {
  const el = document.createElement("div");
  el.className = "work-bar"; el.hidden = true; el.setAttribute("role", "progressbar"); el.setAttribute("aria-busy", "true");
  const run = document.createElement("div"); run.className = "wb-run"; el.appendChild(run);
  parent.appendChild(el);
  return {
    show(label) {
      el.title = label; el.setAttribute("aria-label", label); el.hidden = false;
      return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    },
    hide() { el.hidden = true; },
  };
}

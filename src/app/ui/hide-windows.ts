// ui/hide-windows.ts —— 一键藏起所有窗（Procreate 四指轻点全屏的 CatsUp 版）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「以后可以加一个「一键藏起所有窗」，像 Procreate 四指轻点全屏。 现在就可以做」（窗口讨论：先只有浮窗，窗多了会挤）。
// 藏 = 页面根上加一个标记、样式把浮窗 / 指令板 / 参考窗一起藏掉；窗口自己的开关状态一点不动，再来一次原样回来（不用记谁开着）。
// 工具栏 / 左柱照旧在（Photoshop Tab 那种「藏面板留工具」，照样能画）。
// 藏着时点开窗的钮（标 data-opens-window）：第一下只把窗叫回来——不然会点了没反应、或者把藏着的那扇关掉。
// 本来就没有开着的窗 = 不进藏的状态（不然下一次开窗看不见），只说一句。
const CLASS = "windows-hidden";
const OPEN_WINDOWS = ".float-win:not([hidden]), .board, wp-reference-window[open]";

export interface HideWindows {
  /** 藏 / 叫回；返回给提示行的一句话。 */
  toggle(): string;
  isHidden(): boolean;
}
export function createHideWindows(onChange?: (hidden: boolean) => void): HideWindows {
  const root = document.documentElement;
  const isHidden = (): boolean => root.classList.contains(CLASS);
  const set = (on: boolean): void => { root.classList.toggle(CLASS, on); onChange?.(on); };
  document.addEventListener("click", (ev) => {
    if (!isHidden() || !(ev.target as Element | null)?.closest?.("[data-opens-window]")) return;
    ev.preventDefault(); ev.stopPropagation(); set(false);
  }, true);
  return {
    isHidden,
    toggle() {
      if (isHidden()) { set(false); return "窗口都回来了"; }
      const n = document.querySelectorAll(OPEN_WINDOWS).length;
      if (!n) return "现在没有开着的窗";
      set(true);
      return `藏起了 ${n} 扇窗（再四指轻点 / 按 \\ / 点任一开窗的钮 = 回来）`;
    },
  };
}

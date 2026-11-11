// ui/float-host.ts —— 三维给界面零件库浮窗的布局知识，只此一处（施工单十七 / 家族周账 F-253；2026-11-11 by Claude Opus 5.5）。
// 浮窗的一生（z 序 / 钳制 / 拖 / 改大小 / 壳零件）住 @internal/workbench-elements 0.2.0 的 float-window（以前是这里的 floating-window.ts + panel-gizmo.ts，2026-10-30 从画画仓搬来的拷贝）。
// 三维和画画仓的差别只剩这一条：顶地板量的是左上那排 HUD（.hud-topleft）的下缘；显隐用 hidden 属性（库的缺省）。
// 三维里要浮窗的模块都从这里拿 registerFloatingWindow：拿到它的时候这份配置已经生效了（不靠 main.ts 记得先调）。
import { configureFloatingWindows } from "@internal/workbench-elements";
export { registerFloatingWindow, type FloatingWindowHandle, type PanelPos } from "@internal/workbench-elements";

function hudBottom(): number | null {
  const el = typeof document !== "undefined" ? document.querySelector<HTMLElement>(".hud-topleft") : null;
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return r.height > 0 ? r.bottom : null;
}
configureFloatingWindows({ hudBottom });

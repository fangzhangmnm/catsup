// selection-actions.ts —— 选区动作的深模块（#19，2026-10-21，Claude Fable 5.1）：**一张表、多个渲染器**。
// user 2026-10-21：「鼠标还是菜单，能两种路由吗。然后做好深模块，以后vr可以有自己的交互实现」。
// 表 = HudModel.edits()（撤销 / 重做之外的那些：删除 / 建组 / 建组件 / 炸开 / 进入 / 退出 / 软化 / 硬化 / 选择连通体），
// 不适用的项已带 hidden。渲染器：右键菜单（context-menu.ts openContextMenuAt）、上下文条（context-bar.ts，A25 起与工具选项同一条）、VR 手腕面板（wrist-panel.ts 直接吃 hud.edits）。
// 路由：按最近一次输入的指针类型——鼠标有右键，不浮条；笔 / 手指 = 浮条（长按也能出菜单）。以后 VR = 第三种路由，自己的渲染器。
import type { HudItem, HudModel } from "./ui/hud-model.ts";

const SKIP = new Set(["undo", "redo"]);
/** 当前可做的选区动作（表的唯一出口）。 */
export function selectionActions(hud: HudModel): HudItem[] { return hud.edits().filter((it) => !SKIP.has(it.id) && !it.hidden); }

export type SelectionRoute = "menu" | "bar";
/** 鼠标 → 菜单（右键就在手边）；笔 / 手指 → 浮条（零长按可发现）。 */
export function selectionRoute(lastPointerType: string): SelectionRoute { return lastPointerType === "mouse" ? "menu" : "bar"; }

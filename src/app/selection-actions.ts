// selection-actions.ts —— 菜单显示什么的深模块（#19，2026-10-21，Claude Fable 5.1；2026-10-28 按层分，UX 心智模型 §2.2）：**一张表、一个问法、多个渲染器**。
// user 2026-10-21「鼠标还是菜单，能两种路由吗。然后做好深模块，以后vr可以有自己的交互实现」；2026-10-28「object级别的上下文菜单但你在选择东西编辑的时候能不能不要污染…空的时候右键都不要object了」
// 「孩子的：选中孩子，右键…物体选项只是其中一项」「先做空白就剩下新建，回上一层」「菜单显示什么，能不能做成一个深模块窄接口？」。
// 表 = HudModel.edits()，每项标了层（HudItem.layer）；注册表的动作按放置表的面分（contextBar = 几何层、objectWindow = 物体窗口）。
// 问法：menuItems(hud, 点在哪)——空处 = 新建 / 回上一层；几何 = 几何层动词（选中了组：组的那几项也在，组不是物体）；子组件 = objectMenuItems（对它的动词 + 「物体设置…」）。
// 渲染器：右键菜单（context-menu.ts）、上下文条 / 浮条（context-bar.ts，barItems）、VR 手腕面板（wrist-panel.ts 直接吃 hud.edits）。
// 路由：按最近一次输入的指针类型——鼠标有右键，不浮条；笔 / 手指 = 浮条（长按也能出菜单）。以后 VR = 第三种路由，自己的渲染器。
import type { Editor } from "../editor/editor.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";

export type MenuPlace = "empty" | "selection";
/** 显示什么（表的唯一出口）。groups = 选区里有组（组的进入 / 炸开 / 锁 / 藏照旧在几何层菜单里）。 */
export function menuItems(hud: HudModel, place: MenuPlace, opts: { groups?: boolean } = {}): HudItem[] {
  return hud.edits().filter((it) => !it.hidden && (place === "empty" ? it.layer === "empty" : it.layer === "geometry" || (!!opts.groups && it.layer === "child")));
}
/** 子组件的物体菜单：对这几个物体的动词 + 「物体设置…」（开物体窗口、当前 = 它们）。 */
export function objectMenuItems(hud: HudModel): HudItem[] {
  const verbs = hud.edits().filter((it) => !it.hidden && (it.layer === "child" || it.id === "delete" || it.id === "cut" || it.id === "copy" || it.id === "component"));   // 删 / 剪 / 拷 / 建组件（装进新组件；user 10-30「选择多个组件（没有几何）的时候应该也可以打包成一个新组件」）：对物件也成立
  return [...verbs, { id: "objectWindow", label: "物件设置…", icon: "settings" }];
}
/** 浮条（笔 / 手指）：和右键同一套读法——选中的只有组件 = 物体菜单；否则几何层（含组的那几项）。 */
export function barItems(editor: Editor, hud: HudModel): HudItem[] {
  const mk = editor.selectionMakeup();
  return mk.instances > 0 && !mk.geometry && mk.groups === 0 ? objectMenuItems(hud) : menuItems(hud, "selection", { groups: mk.groups > 0 });
}

export type SelectionRoute = "menu" | "bar";
/** 鼠标 → 菜单（右键就在手边）；笔 / 手指 → 浮条（零长按可发现）。 */
export function selectionRoute(lastPointerType: string): SelectionRoute { return lastPointerType === "mouse" ? "menu" : "bar"; }

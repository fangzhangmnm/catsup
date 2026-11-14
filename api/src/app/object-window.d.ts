import type { Editor, MenuTarget } from "../editor/editor.ts";
import type { HudModel } from "./ui/hud-model.ts";
import { type PopupMenuItem } from "./ui/popup-menu.ts";
import { type Machine } from "./machine-window.ts";
import type { MenuSpec } from "./ui/menu-window.ts";
export type ObjectTarget = Exclude<MenuTarget, "selection">;
/** 窗口要的（main.ts 给）：after = 改完刷 UI（syncUi）；openMachine = 开那台机器的板（修复页的「修复面板…」）。 */
export interface ObjectWindowDeps {
    after(): void;
    openMachine(m: Machine): void;
}
/** 物件窗口的菜单（弹出版和浮窗版共用一份）：页签（这一层 = 属性 + 露着的机器）+ 内容 + 点了做什么。 */
export declare function objectWindowMenu(editor: Editor, hud: HudModel, target: ObjectTarget, deps: ObjectWindowDeps): MenuSpec<string>;
/** 物件窗口 = 弹出菜单（这一层 = 左上物件钮 / 空白处「物件设置…」，再点一下钮收起；选中的子组件 = 物体菜单 / 浮条的「物体设置…」）。2026-10-30 起这一层也不再是常驻浮窗。 */
export declare function openObjectWindow(editor: Editor, hud: HudModel, target: ObjectTarget, anchor: HTMLElement, deps: ObjectWindowDeps, align?: "start" | "end"): void;
/** 物体页 + 种类那一页显示什么（纯函数：探针 / 测试也能问）。 */
export declare function objectWindowItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[];
/** 「材质和贴图」页（第一版只看）：种类报的材质 / 画 / 贴图坐标几行 + 放置表 objectMaterials 面上的出口（把画拿掉）。纯函数。 */
export declare function objectMaterialItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[];
/**
 * 「图元」页（user 11-13 夜定的叫法，原叫「元素」；属性地基轮 3½ 第一版：只看；删、改名、加一列在第二版）：几何个数一行 + 每一列一行（名字、类型、个数、大小），按挂在哪分组。
 * 网格体的行带小灰字原名（名字就是键）；硬表面的行不带（那套还没搬上属性表）、层是稀疏存的（「有 N 条 / 张」、大小「—」）。纯函数：探针 / 测试也能问。
 */
export declare function objectElementItems(editor: Editor, target: ObjectTarget): PopupMenuItem<string>[];

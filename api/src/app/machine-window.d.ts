import type { Editor } from "../editor/editor.ts";
import type { Surface } from "../editor/commands/action.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import type { PopupMenuItem } from "./ui/popup-menu.ts";
import { type BoardPosStore } from "./ui/command-board.ts";
export interface Machine {
    /** 放置表里的面：这台机器的指令都放在这个词名下。 */
    readonly id: Surface;
    /** 钮的字 / 面板第一行。 */
    readonly label: string;
    readonly icon: string;
    /** 这台机器现在露不露（缺 = 一直露）。按身体种类 / 车间判。 */
    readonly when?: (editor: Editor) => boolean;
    /** 面板顶上、放置表之外的行（修复机器的「修复面板…」= 几步一起跑的复合入口，不是一条指令）。 */
    readonly head?: (editor: Editor, hud: HudModel) => HudItem[];
    /** 一条都没有时面板说什么。 */
    readonly none: (editor: Editor) => string;
}
/** 机器表：一行一台。 */
export declare const MACHINES: readonly Machine[];
/** 板要的东西（main.ts 给）：位置记在这台设备；参数区（右下角那一块，vcb.ts）在板开着、正在用这台机器的马前炮时住进板里；手机竖屏抽屉和物品栏抢同一个位置。 */
export interface MachineBoardDeps {
    store: BoardPosStore;
    params: {
        setHome(el: HTMLElement | null, accepts?: () => boolean): void;
    };
    /** 抽屉模式（手机竖屏）开了：物品栏收起。 */
    /** 手机竖屏：板摆成底部抽屉时（以前要收起物品栏抽屉；物品栏 2026-10-30 sunset 后没人用，留口给以后的底部抽屉）。 */
    onDrawer?(): void;
    /** 做完刷 UI（main.ts syncUi）。 */
    after(): void;
}
/** 板上的数（几处可修）跟着模型变：syncUi 调。 */
export declare function refreshMachineBoard(): void;
/**
 * 开一台机器的指令板（钮上开 = 再点一下关；UX 心智模型 §8 补 4：大机器 = 子工作流，板上每颗钮只路由到注册表的指令）。
 * 板 = 浮板（ui/command-board.ts：一次一块、能拖、长按标题归位、手机竖屏 = 底部抽屉）；内容 = 放置表这一面上的指令（带数量，点 = 跑，板不关）
 * + 正在用的那条的参数（马前炮：右下角那一块参数区住进板里，同一套控件；应用完的马后炮回右下角）。
 * 修复这台：开板 = 直接进修复面板（勾哪几步 + 检查 + 应用）——它就是修复的子工作流；关板 = 没应用的修复面板一起收。
 */
export declare function openMachineWindow(editor: Editor, hud: HudModel, m: Machine, anchor: HTMLElement, deps: MachineBoardDeps): void;
/** 面板里显示什么（纯函数：探针 / 测试也能问）：第一行 = 机器名 + 这一层是谁；然后 head 行 + 放置表这个面上现在能做的（带数量；同名子菜单折成一行）。 */
export declare function machineItems(editor: Editor, hud: HudModel, m: Machine): PopupMenuItem<string>[];

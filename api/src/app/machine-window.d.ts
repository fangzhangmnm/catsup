import type { Editor } from "../editor/editor.ts";
import type { Surface } from "../editor/commands/action.ts";
import type { HudItem, HudModel } from "./ui/hud-model.ts";
import { type PopupMenuItem } from "./ui/popup-menu.ts";
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
/** 开一台机器的面板（钮上开 = 再点一下关）；after = 做完刷 UI（main.ts syncUi）。 */
export declare function openMachineWindow(editor: Editor, hud: HudModel, m: Machine, anchor: HTMLElement, after: () => void, align?: "start" | "end"): void;
/** 面板里显示什么（纯函数：探针 / 测试也能问）：第一行 = 机器名 + 这一层是谁；然后 head 行 + 放置表这个面上现在能做的（带数量；同名子菜单折成一行）。 */
export declare function machineItems(editor: Editor, hud: HudModel, m: Machine): PopupMenuItem<string>[];

import type { Command, CommandId, UnitKind } from "./command.ts";
import type { ModeId } from "../mode.ts";
export type ActionId = string;
export interface Action {
    readonly id: ActionId;
    /** 菜单上的字（n = 会碰几处；放置面决定 0 时露不露）。 */
    label(n: number): string;
    readonly icon?: string;
    /** 路由表：每种单位喂哪条指令（守卫：指向的指令吃的正是这种单位）。 */
    readonly commands: Readonly<Partial<Record<UnitKind, CommandId>>>;
}
/** 放置面（开放集：新的 UI 面 = 加一个词 + 一个渲染器）。contextBar = 选区浮条 / 右键菜单共用的那张动作表；repairPanel = 修复面板那条复合动作的步骤表；search / api = 搜索框 / 脚本接口（渲染器还没有，登记了先）。 */
export type Surface = "contextBar" | "repairPanel" | "hamburger" | "contextMenu" | "radial" | "viewMenu" | "toolStrip" | "wristPanel" | "search" | "api";
export interface Placement {
    readonly action: ActionId;
    readonly where: Surface;
    /** 同一个面里的先后（小的在前）。 */
    readonly order: number;
    /** 只在这些工作台露（缺 = 所有）。 */
    readonly modes?: readonly ModeId[];
    /** 这个入口钉的作用域（缺 = auto：有选区用选区、没选用当前在编辑的整个物体）。 */
    readonly scope?: "auto" | "context";
    /** 右键菜单里收进哪个子菜单（2026-10-28：子菜单的名字；同名的几条并成一行「名字 ›」；item = 子菜单里显示的字，缺 = 动作自己的 label）。浮条照旧平铺。 */
    readonly submenu?: {
        readonly label: string;
        readonly item?: string;
    };
}
/**
 * 一个可扔的模块 = 一个文件夹 = 三个数组；扔一个模块 = 删文件夹 + 清单（index.ts）一行。
 * 模块按功能分（修复 / 转换 / 挪），里面的指令各归自己的族（族 = id 前缀 = 单位种类）：挪这个模块装着 brep.move / mesh.move / object.move 三条。
 */
export interface Family {
    readonly name: string;
    readonly commands: readonly Command[];
    readonly actions: readonly Action[];
    readonly placements: readonly Placement[];
}

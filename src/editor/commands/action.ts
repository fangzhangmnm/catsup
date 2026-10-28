// commands/action.ts —— 动作 = UX 动词 + 放置表 = 动作放在哪。created 2026-10-27 by Claude Fable 5.1
// 动作看选区、看上下文、看点了几下，决定调哪几条指令（command.ts）。user 的 UX 怎么变（右键菜单 / Pinterest 式长按环形菜单 / VR 手腕面板 / 搜索框 / 脚本接口）改的都是这两张表，指令不动。
// 路由（2026-10-27 夜接缝）：一个动作 = 「每种单位喂哪条指令」一张小表——挪 = { brep: brep.move, mesh: mesh.move, object: object.move }；最笨的动作只有一种。
// 作用域解开后每一块带着自己的种类，表里没有那种的 = 这个动作不管它，跳过并在提示里说出来（不静默；注册表提案 §7.4）。
// 更聪明的路由（猫娘一下梳毛两下摸头三下投喂、按点了几下换指令）到时候在这里长成函数，表仍是默认。
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

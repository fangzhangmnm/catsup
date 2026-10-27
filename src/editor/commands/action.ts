// commands/action.ts —— 动作 = UX 动词 + 放置表 = 动作放在哪。created 2026-10-27 by Claude Fable 5.1
// 动作看选区、看上下文、看点了几下，决定调哪几条指令（command.ts）。user 的 UX 怎么变（右键菜单 / Pinterest 式长按环形菜单 / VR 手腕面板 / 搜索框 / 脚本接口）改的都是这两张表，指令不动。
// 今天只有最笨的动作：一条指令一个同 id 的动作，作用域解出来的每个单位都喂它。路由型动作（混选一拖 = 物体 + SU 点 + 网格点三条指令；猫娘一下梳毛两下摸头三下投喂）等 mesh M2 / 物体族来了在这里长。
import type { Command, CommandId } from "./command.ts";
import type { ModeId } from "../mode.ts";

export type ActionId = string;

export interface Action {
  readonly id: ActionId;
  /** 菜单上的字（n = 会碰几处；放置面决定 0 时露不露）。 */
  label(n: number): string;
  readonly icon?: string;
  /** 最笨的路由：每个单位都喂这一条指令。 */
  readonly command: CommandId;
}

/** 放置面（开放集：新的 UI 面 = 加一个词 + 一个渲染器）。contextBar = 选区浮条 / 右键菜单共用的那张动作表；repairPanel = 修复面板那条复合动作的步骤表。 */
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

/** 一族 = 一个文件夹 = 三个数组；扔一族 = 删文件夹 + 清单（index.ts）一行。 */
export interface Family {
  readonly name: string;
  readonly commands: readonly Command[];
  readonly actions: readonly Action[];
  readonly placements: readonly Placement[];
}

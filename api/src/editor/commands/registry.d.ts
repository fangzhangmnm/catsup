import type { Command, UnitKind } from "./command.ts";
import type { Action, Placement, Surface } from "./action.ts";
import type { ModeId } from "../mode.ts";
export declare function commandById(id: string): Command | null;
export declare function actionById(id: string): Action | null;
/** 动作路由表里的 (单位种类, 指令) 对——按表里的顺序。 */
export declare function routesOf(a: Action): {
    kind: UnitKind;
    command: Command;
}[];
/** 某个放置面上的动作（按 order；按工作台筛）。O(表长)，几十到一百行。 */
export declare function placementsAt(where: Surface, mode?: ModeId): Placement[];
export declare function allCommands(): readonly Command[];
export declare function allActions(): readonly Action[];
/** 守卫（测试调）：id 不重复、族名合法、每个动作的路由表指向存在的指令且那条指令吃的正是那种单位、每条放置指向存在的动作。返回问题清单（空 = 好）。 */
export declare function checkRegistry(): string[];

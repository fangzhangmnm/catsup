import type { Command, ObjectUnit } from "../commands/command.ts";
import type { Family } from "../commands/action.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
export declare const toMesh: Command<ObjectUnit>;
export declare const toBrep: Command<ObjectUnit>;
/** 转成空物体（第 1 版第五节第 4 条）：只在自己没有几何时可用（挂着子物体不算有几何）；有几何 = 明说转不成，不悄悄丢。丢的是挂在原来那个种类上的设置（登记表 castsTo）。 */
export declare const toEmpty: Command<ObjectUnit>;
/** 重置坐标架（统筹 11-13 夜审查 a 第 2 条）：另摆的画图坐标架删掉 = 回到这个物体自己的原点。三个种类都有（坐标架住在定义的头上）；摆坐标架的工具进不进自由建模 / 摆放第 3 版再定。 */
export declare const resetFrame: Command<ObjectUnit>;
/** 每种身体由哪个动作转过去（物体窗口「切换种类 ›」照这张表列；加一个种类 = 这里一行，少一种编译不过）。 */
export declare const CAST_ACTIONS: Readonly<Record<BodyKind, string>>;
export declare const objects: Family;

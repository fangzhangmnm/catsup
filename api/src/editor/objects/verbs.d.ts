import type { Command, ObjectUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
export declare const explode: Command<ObjectUnit>;
export declare const mergeInto: Command<ObjectUnit>;
export declare const makeUnique: Command<ObjectUnit>;
export declare const lock: Command<ObjectUnit>;
export declare const unlock: Command<ObjectUnit>;
export declare const hide: Command<ObjectUnit>;
export declare const applyScale: Command<ObjectUnit>;
/** 放上素材架（身份地基 ID-3，计划书 §15.1-D）：架上的是组件定义，不是这一份。没起名的不收——菜单那一下由动作层先问名字（app/shelf-actions.ts；user 10-30「进架必须命名」），这里只管机械判断。锁着的也能上架（素材架不碰几何）。 */
export declare const shelve: Command<ObjectUnit>;
export declare const unshelve: Command<ObjectUnit>;
export declare const verbCommands: readonly Command[];
export declare const verbActions: readonly Action[];
/** 子物件的右键 / 浮条菜单（objectMenu）。编辑动词在验证工作台退订（那里只看、走、量）；锁 / 藏哪都有。 */
export declare const verbPlacements: readonly Placement[];
export declare const verbs: Family;

import type { Command, ObjectUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
export declare const explode: Command<ObjectUnit>;
export declare const mergeInto: Command<ObjectUnit>;
export declare const makeUnique: Command<ObjectUnit>;
export declare const lock: Command<ObjectUnit>;
export declare const unlock: Command<ObjectUnit>;
export declare const hide: Command<ObjectUnit>;
export declare const applyScale: Command<ObjectUnit>;
export declare const verbCommands: readonly Command[];
export declare const verbActions: readonly Action[];
/** 子物件的右键 / 浮条菜单（objectMenu）。编辑动词在验证工作台退订（那里只看、走、量）；锁 / 藏哪都有。 */
export declare const verbPlacements: readonly Placement[];
export declare const verbs: Family;

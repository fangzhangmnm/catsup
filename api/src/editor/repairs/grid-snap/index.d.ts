import type { Command } from "../../commands/command.ts";
/** 拉正的默认门槛：和轴差这么多度以内的边算「歪了一点」（AI 定的默认，user 没拍；马后炮可改）。量纲：度。 */
export declare const STRAIGHTEN_DEG = 1;
export declare const straighten: Command;
export declare const snap: Command;

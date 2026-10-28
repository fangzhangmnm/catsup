// commands/index.ts —— 注册表清单：一族一行。扔一族 = 删它的文件夹 + 这里一行，tsc 照过（老复现包里它的插件指令会报「没装」）。created 2026-10-27 by Claude Fable 5.1
import type { Family } from "./action.ts";
import { repairs } from "../repairs/index.ts";
import { objects } from "../objects/index.ts";
import { move } from "../move/index.ts";

export const FAMILIES: readonly Family[] = [repairs, objects, move];

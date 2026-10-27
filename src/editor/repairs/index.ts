// repairs/index.ts —— 修复指令的清单（user 10-26「做成可以扔的模块化的，最好是各种命令都这样」）。created 2026-10-26 by Claude Opus 5.5
// 顺序 = 修复面板里跑的顺序：先拉正 / 吸格点（挪点会冒出新的断口、新的微折），再清理碎渣（擦线 / 并短边会冒出新的断口），再焊断口、拍平、软边变硬、补洞（拍平之后环更可能在一个平面上）；恢复层级最后（它把几何搬进新组，
// 前面几步按池跑，先搬了它们就看不到）。扔掉一个 = 删它的文件 + 这里一行（它的插件指令随文件一起消失，老复现包里的会报「没装」）。
import type { RepairModule } from "./repair.ts";
import { snap, straighten } from "./grid-snap/index.ts";
import { weld } from "./weld.ts";
import { planar } from "./planar/index.ts";
import { harden } from "./harden.ts";
import { hierarchy } from "./hierarchy/index.ts";
import { fillHoles } from "./fill-holes/index.ts";
import { cleanup } from "./cleanup/index.ts";

export const REPAIRS: readonly RepairModule[] = [straighten, snap, cleanup, weld, planar, harden, fillHoles, hierarchy];

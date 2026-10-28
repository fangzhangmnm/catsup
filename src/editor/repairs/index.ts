// repairs/index.ts —— 修复一族的清单：指令 + 动作 + 放置 + 修复面板的步骤表（user 10-26「做成可以扔的模块化的，最好是各种命令都这样」）。created 2026-10-26 by Claude Opus 5.5
// 2026-10-27 Claude Fable 5.1 改成注册表的第一族（commands/）：模块只剩指令（brep 族 = 吃一个 SU 池）；菜单上的字 / 图标归动作，面板上的勾与标签归步骤表。行为零变化。
// 步骤表顺序 = 修复面板里跑的顺序：先拉正 / 吸格点（挪点会冒出新的断口、新的微折），再清理碎渣（擦线 / 并短边会冒出新的断口），再焊断口、拍平、软边变硬、补洞（拍平之后环更可能在一个平面上）；恢复层级最后（它把几何搬进新组，
// 前面几步按池跑，先搬了它们就看不到）。扔掉一个 = 删它的文件 + 这里几行（它的插件指令随文件一起消失，老复现包里的会报「没装」）。
import type { Command, CommandEnv, CommandId } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { fmtLen } from "../units.ts";
import { snap, straighten, STRAIGHTEN_DEG } from "./grid-snap/index.ts";
import { weld } from "./weld.ts";
import { planar } from "./planar/index.ts";
import { harden } from "./harden.ts";
import { hierarchy } from "./hierarchy/index.ts";
import { fillHoles } from "./fill-holes/index.ts";
import { cleanup } from "./cleanup/index.ts";
import { resegment } from "./resegment/index.ts";

const commands: readonly Command[] = [straighten, snap, cleanup, weld, planar, harden, fillHoles, resegment, hierarchy];

/** 修复面板 = 一条复合动作的参数窗：勾几步、按这个顺序跑完 = 一步撤销。on = 默认勾不勾（AI 定的默认：只动小毛病的勾；吸格点 / 清理 / 补洞 / 改段数 / 恢复层级不勾——会挪点、会擦线、改结构、段数是你挑的）。 */
export const REPAIR_STEPS: readonly { readonly command: CommandId; readonly on: boolean; label(env: CommandEnv): string }[] = [
  { command: "brep.straighten", on: true, label: () => `拉正（和轴差 ${STRAIGHTEN_DEG}° 以内的边）` },
  { command: "brep.snap", on: false, label: (env) => `吸到格点（${fmtLen(env.gridFineStep())} 的格子）` },
  { command: "brep.cleanup", on: false, label: () => "清理碎渣（悬空的线 / 很短的边 / 同一平面切碎的面）" },
  { command: "brep.weld", on: true, label: () => "焊接断口" },
  { command: "brep.planar", on: true, label: (env) => `拍平（弯折 < ${env.sharpDeg()}° 的边，整片差不多平才拍）` },
  { command: "brep.harden", on: true, label: () => "折得很厉害的软边变硬" },
  { command: "brep.fillHoles", on: false, label: () => "补洞（没封口的平面开口补上面）" },
  { command: "brep.resegment", on: false, label: () => "改段数（回转体：圆柱、轮子、炮管…）" },
  { command: "brep.hierarchy", on: false, label: () => "恢复层级（连在一起的块各成一组，形状一样的合成组件）" },
];

/** 最笨的动作：一条指令一个同 id 的动作（路由表只有 brep 一行）。字和图标是 UX，住这里不住指令里。 */
const actions: readonly Action[] = [
  { id: "brep.straighten", commands: { brep: "brep.straighten" }, icon: "axes", label: (n) => `拉正…（${n} 个点）` },
  { id: "brep.snap", commands: { brep: "brep.snap" }, icon: "snap-grid", label: (n) => `吸到格点…（${n} 个点）` },
  { id: "brep.cleanup", commands: { brep: "brep.cleanup" }, icon: "eraser", label: (n) => `清理碎渣…（${n} 处）` },
  { id: "brep.weld", commands: { brep: "brep.weld" }, icon: "arc", label: (n) => `焊接断口（${n}）` },
  { id: "brep.planar", commands: { brep: "brep.planar" }, icon: "sharpen", label: (n) => `拍平（${n} 组）` },
  { id: "brep.harden", commands: { brep: "brep.harden" }, icon: "sharpen", label: (n) => `折得很厉害的软边变硬（${n}）` },
  { id: "brep.fillHoles", commands: { brep: "brep.fillHoles" }, icon: "fill-hole", label: (n) => `补洞…（${n} 个）` },
  { id: "brep.resegment", commands: { brep: "brep.resegment" }, icon: "circle", label: (n) => `改段数…（${n} 个回转体）` },
  { id: "brep.hierarchy", commands: { brep: "brep.hierarchy" }, icon: "collection", label: (n) => `恢复层级…（${n} 块）` },
];

/** 选区浮条 / 右键菜单上的修复入口（按现在的范围数出来 > 0 的才露；顺序 = 这里的 order）。 */
const placements: readonly Placement[] = actions.map((a, i) => ({ action: a.id, where: "contextBar" as const, order: 100 + i * 10 }));

export const repairs: Family = { name: "repairs", commands, actions, placements };

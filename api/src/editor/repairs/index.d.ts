import type { CommandEnv, CommandId } from "../commands/command.ts";
import type { Family } from "../commands/action.ts";
/** 修复面板 = 一条复合动作的参数窗：勾几步、按这个顺序跑完 = 一步撤销。on = 默认勾不勾（AI 定的默认：只动小毛病的勾；吸格点 / 清理 / 补洞 / 改段数 / 恢复层级不勾——会挪点、会擦线、改结构、段数是你挑的）。 */
export declare const REPAIR_STEPS: readonly {
    readonly command: CommandId;
    readonly on: boolean;
    label(env: CommandEnv): string;
}[];
export declare const repairs: Family;

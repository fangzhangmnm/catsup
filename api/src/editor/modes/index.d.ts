import type { Mode, ModeId } from "../mode.ts";
import type { Tool } from "../tool-ids.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
/** 每个编辑器一份（工具模块有手势状态，不共用）。 */
export declare function workbenches(): readonly Mode[];
/** 哪个工作台有这把工具、又管得了这种身体（kind = null：不看身体；among = 只在这几个里找；按工作台表的先后）。编辑器的 setTool 拒收时说在哪、明着跨工作台的调用方找去处都问它（统筹 11-11）。 */
export declare function workbenchOf(list: readonly Mode[], t: Tool, kind: BodyKind | null, among?: readonly ModeId[]): Mode | undefined;
/** 锁上时去哪拿哪把（照工作台自己的声明 whenLocked；统筹 11-11，v0.19.48）：mode = null 留在这个工作台；不然 = 明着换到那个工作台再拿。
 *  missing = 写了「去别处拿」却找不到管这种身体、又有这把工具的工作台（守卫 test/workbench-tools.test.ts 按身体种类钉着走不到；真遇到了 holdChanged 记一条错，不悄悄过去）。 */
export declare function lockedHold(list: readonly Mode[], mode: Mode, kind: BodyKind): {
    readonly mode: ModeId | null;
    readonly tool: Tool;
    readonly missing: boolean;
};

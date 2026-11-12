// modes/index.ts —— 全部工作台（编辑器建模式表只从这里拿；加一个工作台 = 这里一行 + 自己的模块）。created 2026-11-11 by Claude Opus 5.5（贴图主线 1-7：画画工作台进来时从 editor.ts 挪出来，行数棘轮）
import type { Mode, ModeId } from "../mode.ts";
import type { Tool } from "../tool-ids.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
import { GeometryMode } from "./geometry.ts";
import { SurfaceMode } from "./surface.ts";
import { FreeformMode } from "./freeform.ts";
import { VerifyMode } from "./verify.ts";
import { PaintMode } from "./paint.ts";

/** 每个编辑器一份（工具模块有手势状态，不共用）。 */
export function workbenches(): readonly Mode[] { return [new GeometryMode(), new SurfaceMode(), new FreeformMode(), new VerifyMode(), new PaintMode()]; }
/** 哪个工作台有这把工具、又管得了这种身体（kind = null：不看身体；among = 只在这几个里找；按工作台表的先后）。编辑器的 setTool 拒收时说在哪、明着跨工作台的调用方找去处都问它（统筹 11-11）。 */
export function workbenchOf(list: readonly Mode[], t: Tool, kind: BodyKind | null, among?: readonly ModeId[]): Mode | undefined {
  return list.find((m) => (!among || among.includes(m.id)) && m.tools.includes(t) && (kind === null || (m.kinds as readonly BodyKind[]).includes(kind)));
}
/** 锁上时去哪拿哪把（照工作台自己的声明 whenLocked；统筹 11-11，v0.19.48）：mode = null 留在这个工作台；不然 = 明着换到那个工作台再拿。
 *  missing = 写了「去别处拿」却找不到管这种身体、又有这把工具的工作台（守卫 test/workbench-tools.test.ts 按身体种类钉着走不到；真遇到了 holdChanged 记一条错，不悄悄过去）。 */
export function lockedHold(list: readonly Mode[], mode: Mode, kind: BodyKind): { readonly mode: ModeId | null; readonly tool: Tool; readonly missing: boolean } {
  const w = mode.whenLocked;
  if ("tool" in w) return { mode: null, tool: w.tool, missing: false };
  const to = workbenchOf(list, w.elsewhere, kind)?.id ?? null;
  return { mode: to, tool: w.elsewhere, missing: to === null };
}


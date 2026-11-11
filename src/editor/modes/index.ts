// modes/index.ts —— 全部工作台（编辑器建模式表只从这里拿；加一个工作台 = 这里一行 + 自己的模块）。created 2026-11-11 by Claude Opus 5.5（贴图主线 1-7：画画工作台进来时从 editor.ts 挪出来，行数棘轮）
import type { Mode } from "../mode.ts";
import { GeometryMode } from "./geometry.ts";
import { SurfaceMode } from "./surface.ts";
import { FreeformMode } from "./freeform.ts";
import { VerifyMode } from "./verify.ts";
import { PaintMode } from "./paint.ts";

/** 每个编辑器一份（工具模块有手势状态，不共用）。 */
export function workbenches(): readonly Mode[] { return [new GeometryMode(), new SurfaceMode(), new FreeformMode(), new VerifyMode(), new PaintMode()]; }

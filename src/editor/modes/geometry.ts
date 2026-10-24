// modes/geometry.ts —— 几何模式（SketchUp 血统：画 / 推拉 / 移动 / 旋转 / 缩放 / 偏移 / 跟随 / 橡皮 / 尺规）。0.13 刀 ①：先只是把 handlers 表从 Editor 搬过来，
// 工具集 = 全部（油漆桶留到刀 ③ 搬进表面模式）；刀 ② 把 Editor 内建的九个工具逐个搬成模块加进 handlers。行为零变更。
// created 2026-10-24 by Claude Fable 5.1
import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import { TOOLS, type Tool } from "../tool-ids.ts";
import { OffsetTool } from "../tools/offset.ts";
import { ArcTool } from "../tools/arc.ts";
import { TapeTool } from "../tools/tape.ts";
import { AxesTool } from "../tools/axes.ts";
import { ProtractorTool } from "../tools/protractor.ts";
import { FollowMeTool } from "../tools/followme.ts";
import { EraseTool } from "../tools/erase.ts";

export class GeometryMode implements Mode {
  readonly id = "geometry" as const;
  readonly label = "几何";
  readonly kinds = ["brep"] as const;
  readonly tools: readonly Tool[] = TOOLS;
  readonly defaultTool: Tool = "line";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    offset: new OffsetTool(), followme: new FollowMeTool(), arc: new ArcTool(), tape: new TapeTool(), axes: new AxesTool(), protractor: new ProtractorTool(),
    erase: new EraseTool(),
  };
}

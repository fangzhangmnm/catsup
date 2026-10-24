// modes/geometry.ts —— 几何模式（SketchUp 血统：画 / 推拉 / 移动 / 旋转 / 缩放 / 偏移 / 跟随 / 橡皮 / 尺规）。0.13 刀 ①：先只是把 handlers 表从 Editor 搬过来，
// 工具集 = 全部减油漆桶（表面模式的）；九个内建工具刀 ② 已全部成模块。
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
import { WeldEraseTool } from "../tools/weld-erase.ts";
import { SoftEraseTool } from "../tools/soft-erase.ts";
import { SelectTool } from "../tools/select.ts";
import { ScaleTool } from "../tools/scale.ts";
import { RotateTool } from "../tools/rotate.ts";
import { PushPullTool } from "../tools/pushpull.ts";
import { MoveTool } from "../tools/move.ts";
import { LineTool, RectTool, CircleTool } from "../tools/draw.ts";
import { EraseFaceTool } from "../tools/erase-face.ts";

export class GeometryMode implements Mode {
  readonly id = "geometry" as const;
  readonly label = "几何";
  readonly kinds = ["brep"] as const;
  readonly tools: readonly Tool[] = TOOLS.filter((t) => t !== "paint");   // 油漆桶归表面模式（刀 ③）
  readonly defaultTool: Tool = "line";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    offset: new OffsetTool(), followme: new FollowMeTool(), arc: new ArcTool(), tape: new TapeTool(), axes: new AxesTool(), protractor: new ProtractorTool(),
    erase: new EraseTool(), weldErase: new WeldEraseTool(), softErase: new SoftEraseTool(), select: new SelectTool(), scale: new ScaleTool(), rotate: new RotateTool(), pp: new PushPullTool(), move: new MoveTool(),
    line: new LineTool(), rect: new RectTool(), circle: new CircleTool(), eraseFace: new EraseFaceTool(),
  };
}

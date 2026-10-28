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
import { CompassTool } from "../tools/compass.ts";
import { FollowMeTool } from "../tools/followme.ts";
import { EraseTool } from "../tools/erase.ts";
import { WeldEraseTool } from "../tools/weld-erase.ts";
import { SoftEraseTool } from "../tools/soft-erase.ts";
import { SelectTool } from "../tools/select.ts";
import { TransformTool } from "../tools/transform.ts";
import { ScaleTool } from "../tools/scale.ts";
import { RotateTool } from "../tools/rotate.ts";
import { PushPullTool } from "../tools/pushpull.ts";
import { MoveTool } from "../tools/move.ts";
import { LineTool, RectTool, CenterRectTool, CircleTool } from "../tools/draw.ts";
import { EraseFaceTool } from "../tools/erase-face.ts";
import { RRectTool } from "../tools/rrect.ts";

export class GeometryMode implements Mode {
  readonly id = "geometry" as const;
  readonly label = "硬表面建模";   // 2026-10-26 user「我的思路很简单，一个硬表面建模一个有机体建模啊，虽然就是工具栏和一些手势规则不一样」（原「几何」）。统称「工作台」（user 同日「模式名方案 同意」）：硬表面建模 / 自由建模 / 表面 / 绘制 / 检查，后几个做出来再加
  readonly kinds = ["brep"] as const;
  readonly tools: readonly Tool[] = TOOLS.filter((t) => t !== "paint" && t !== "knife" && t !== "shrink" && t !== "walk" && t !== "create");   // 切割 / 沿法线是自由建模的（硬表面没有它们的手势模块；按 K 不该切到一把没反应的工具）   // 油漆桶归表面模式（刀 ③）
  readonly defaultTool: Tool = "select";   // 硬表面默认 = 鼠标（选择）工具（user 10-27「硬建模默认也是鼠标工具」；以前是画线）
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    offset: new OffsetTool(), followme: new FollowMeTool(), arc: new ArcTool(), tape: new TapeTool(), axes: new AxesTool(), protractor: new ProtractorTool(), compass: new CompassTool(),
    erase: new EraseTool(), weldErase: new WeldEraseTool(), softErase: new SoftEraseTool(), select: new SelectTool(), scale: new ScaleTool(), transform: new TransformTool(), rotate: new RotateTool(), pp: new PushPullTool(), move: new MoveTool(),
    line: new LineTool(), rect: new RectTool(), crect: new CenterRectTool(), rrect: new RRectTool(), circle: new CircleTool(), eraseFace: new EraseFaceTool(),
  };
}

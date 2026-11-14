// modes/object.ts —— 「摆放」工作台：管空物体（只装子物体、没有几何）。created 2026-11-13 by Claude Opus 5.5（第 1 版第四、五节）。
// 第五节第 3 条：空物体能挂子物体、没有几何；工作台只有选、变换（主工具）、移动 / 旋转 / 缩放，新建子物体走右键 / 物体窗口 / 层级窗口（是动词不是工具）；
//   要几何的工具不在这里（画线、推拉、刀……没有东西可下手）。
// 工具先用硬表面那一族（对齐式）：它们挪的是选中的子物体（transformInstance），这一层没有点可挪（编辑器给空物体一份空内核）。
//   第五节第 8 条的两族（对齐式 / 自由式，空物体默认自由式）做到那一条时再在这里换默认、加小三角。
// 名字「摆放」= 纪元账本 10-28 夜 user 拍的 entity = 物件、「摆放」工作台（把摆物件这件事单独成一个工作台）。
import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
import { SelectTool } from "../tools/select.ts";
import { TransformTool } from "../tools/transform.ts";
import { MoveTool } from "../tools/move.ts";
import { RotateTool } from "../tools/rotate.ts";
import { ScaleTool } from "../tools/scale.ts";

export class ObjectMode implements Mode {
  readonly id = "object" as const;
  readonly label = "摆放";
  readonly kinds = ["empty"] as const;
  readonly tools: readonly Tool[] = ["select", "transform", "move", "rotate", "scale"];
  readonly defaultTool: Tool = "transform";   // 第五节第 3 条：变换 = 主工具
  readonly whenLocked: Mode["whenLocked"] = { tool: "select" };   // 锁上时拿它（只读）
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    select: new SelectTool(), transform: new TransformTool(), move: new MoveTool(), rotate: new RotateTool(), scale: new ScaleTool(),
  };
}

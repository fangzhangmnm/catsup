// modes/freeform.ts —— 自由建模工作台（Blender 式；管网格体）。2026-10-27 接缝（Claude Fable 5.1）：壳 + 选择工具。
// user 2026-10-26「我的思路很简单，一个硬表面建模一个有机体建模啊，虽然就是工具栏和一些手势规则不一样」；内核路线 = 另做网格内核 + 按类型分工作台（ai-docs/20261027-kernel-route-bmesh-recommendation.md）。
// 这里只定边界：工作台 id、管哪种身体、第一个工具（选择 = 直接操作型，点 / 框选走 WorldView 的拾取，对 mesh 视图同样成立）。
// 刀 / 拉 / 环切 / 溶解 / 合并 / 填 / 挤出……= M4（Opus）：每个工具一个模块进 handlers，动词写成 mesh.* 指令（src/mesh/ops/ 已有算子），菜单项 / 快捷键写成动作 + 放置。
import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
import { SelectTool } from "../tools/select.ts";

export class FreeformMode implements Mode {
  readonly id = "freeform" as const;
  readonly label = "自由建模";
  readonly kinds = ["mesh"] as const;
  readonly tools: readonly Tool[] = ["select"];
  readonly defaultTool: Tool = "select";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = { select: new SelectTool() };
}

// modes/freeform.ts —— 自由建模工作台（Blender 式；管网格体）。2026-10-27 接缝（Claude Fable 5.1）：壳 + 选择工具。
// user 2026-10-26「我的思路很简单，一个硬表面建模一个有机体建模啊，虽然就是工具栏和一些手势规则不一样」；内核路线 = 另做网格内核 + 按类型分工作台（ai-docs/20261027-kernel-route-bmesh-recommendation.md）。
// 这里只定边界：工作台 id、管哪种身体、第一个工具（选择 = 直接操作型，点 / 框选走 WorldView 的拾取，对 mesh 视图同样成立）。
// 2026-10-27 Opus 5.5：挪 / 转 / 缩（tools/mesh-transform.ts；不推断、锁轴复用方向键、Shift 一档）；挤出（tools/mesh-pull.ts；面沿法向、边 / 点默认垂直，总是长新几何）；刀 + 环切（tools/mesh-knife.ts；拓扑吸附、同一条边点两下 = 环切）。
// 刀 / 拉 / 环切 / 溶解 / 合并 / 填 / 挤出……= M4（Opus）：每个工具一个模块进 handlers，动词写成 mesh.* 指令（src/mesh/ops/ 已有算子），菜单项 / 快捷键写成动作 + 放置。
import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
import { SelectTool } from "../tools/select.ts";
import { MeshTransformTool } from "../tools/mesh-transform.ts";
import { MeshPullTool } from "../tools/mesh-pull.ts";
import { MeshKnifeTool } from "../tools/mesh-knife.ts";
import { MeshEraseTool } from "../tools/mesh-erase.ts";
import { MeshInsetTool } from "../tools/mesh-inset.ts";

export class FreeformMode implements Mode {
  readonly id = "freeform" as const;
  readonly label = "自由建模";
  readonly kinds = ["mesh"] as const;
  readonly tools: readonly Tool[] = ["select", "pp", "move", "rotate", "scale", "knife", "erase", "offset"];   // user 10-27「选 拉 挪 转 缩 刀 删 插 八个常用的」（删 / 插做出来再加）   // 和硬表面同 id 同快捷键（user「不要一个工具在不同模式下面语义和用法差太多」）；差在不推断
  readonly defaultTool: Tool = "select";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = { select: new SelectTool(), move: new MeshTransformTool("move"), rotate: new MeshTransformTool("rotate"), scale: new MeshTransformTool("scale"), pp: new MeshPullTool(), knife: new MeshKnifeTool(), erase: new MeshEraseTool(), offset: new MeshInsetTool() };
}

// modes/surface.ts —— 表面模式（刀 ③；user 2026-10-24「油漆桶算作第二个编辑模式……包括油漆桶，碰撞元数据，各种贴图assignment，但是不是bodypaint」
// 名字「表面」user 同日拍板「如果这样就表面」）。工具 = 选择（面集）+ 表面指派工具（现在只有油漆桶；碰撞 / 贴图投影以后各一个 SurfaceAssignTool）。
// created 2026-10-24 by Claude Fable 5.1
import type { Mode } from "../mode.ts";
import type { ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
import { SelectTool } from "../tools/select.ts";
import { SurfaceAssignTool } from "../surface-assign.ts";

export class SurfaceMode implements Mode {
  readonly id = "surface" as const;
  readonly label = "表面";
  readonly kinds = ["brep"] as const;
  readonly tools: readonly Tool[] = ["select", "paint"];
  readonly defaultTool: Tool = "paint";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    select: new SelectTool(),
    paint: new SurfaceAssignTool({
      tool: "paint",
      verb: "涂",
      apply: (ctx, faces) => ctx.paintFaces(faces),
      sample: (ctx, face) => ctx.pickMaterialOf(face),
      describe: (ctx, face) => ctx.scene().materialOfSlot(ctx.scene().defOfContext(ctx.context()), ctx.kernel().faceMaterialOf(face))?.name ?? "默认灰",
    }),
  };
}

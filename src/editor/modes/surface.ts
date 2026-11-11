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
  readonly kinds = ["brep", "mesh"] as const;   // W-12（2026-11-11 Claude Opus 5.5）：网格体的面也在这里涂（走 meshPaintFaces；一张面只有一侧）
  readonly tools: readonly Tool[] = ["select", "paint"];
  readonly defaultTool: Tool = "paint";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    select: new SelectTool(),
    paint: new SurfaceAssignTool({
      tool: "paint",
      verb: "涂",
      apply: (ctx, faces, sides) => ctx.paintFaces(faces, sides),   // DT8：涂点到的那一侧
      sample: (ctx, face, side) => ctx.pickMaterialOf(face, side),
      describe: (ctx, face, side) => ctx.scene().materialOfSlot(ctx.scene().defOfContext(ctx.context()), ctx.selection().kind === "mesh" ? ctx.mesh().faceMat[face] : ctx.kernel().faceMaterialOf(face, side))?.name ?? (ctx.selection().kind === "mesh" ? "默认" : "默认正面"),
    }),
  };
}

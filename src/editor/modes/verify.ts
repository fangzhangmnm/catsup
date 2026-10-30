// modes/verify.ts —— 「验证」工作台（2026-10-28 Claude Opus 5.5；纪元账本 FM169）。
// user 10-28「要不加一个验证tab把步行相机作为第一个工具？」「12同意」「视图也能进」「tab的话还是验证啦。比如你在验证里面摆关卡。tab的时候还是继续摆」：
//   左柱第一格 = 步行（选它 = 进放置：点一下落人 → FPS；app 层 locomotion 接手，工具本身不碰几何）；
//   接着 = 选择 / 移动 / 旋转（摆关卡：挪物体）+ 尺规（卷尺 / 量角器 / 圆规 / 坐标架；user 10-28「以及尺规还是要的」）；
//   以后丢猫娘 / 道具、扔手雷这些验证纪元的动作都住这里。
//   步行里 Tab 原地编辑 = 留在验证、用这里的工具接着摆。视图菜单「步行相机」照样能进。
// 管硬表面体那一层（关卡 = 根 / 组里摆物体）；进网格体就是去改那个物体 = 自由建模（工作台跟着物体，不变量 I5）。
import type { FaceEvent, Kernel } from "../../kernel/kernel.ts";
import type { Mode } from "../mode.ts";
import type { ToolCtx, ToolHandler } from "../tool-handler.ts";
import type { Tool } from "../tool-ids.ts";
import type { ToolPointer } from "../editor.ts";
import { SelectTool } from "../tools/select.ts";
import { MoveTool } from "../tools/move.ts";
import { RotateTool } from "../tools/rotate.ts";
import { TransformTool } from "../tools/transform.ts";
import { TapeTool } from "../tools/tape.ts";
import { ProtractorTool } from "../tools/protractor.ts";
import { CompassTool } from "../tools/compass.ts";
import { AxesTool } from "../tools/axes.ts";

/** 步行：放人的指针走输入层（user 10-30「步行为什么没有做触控笔的悬浮，而是笔碰到屏幕就跳了。如果input层窄接口的话应该自动翻译好了hover和click啊」「1做」）：
 *  悬停 / 按下 / 拖 = 虚影跟着、松手 = 落人，笔 / 鼠标 / 手指画的设备都一样；见过笔的设备上手指轻点 = 落人（fingerTap）。人怎么放、走路归宿主（ctx.placeBody → app 层 locomotion），编辑器不认识这个人、工具不碰几何。 */
class WalkTool implements ToolHandler {
  readonly tool = "walk" as const;
  readonly grammar = "direct" as const;
  private pressed = false;
  active(): boolean { return this.pressed; }
  cancel(): void { this.pressed = false; }
  hover(ctx: ToolCtx, s: { x: number; y: number }): void { ctx.placeBody("hover", s.x, s.y); }
  down(ctx: ToolCtx, ev: ToolPointer): void { this.pressed = true; ctx.placeBody("press", ev.x, ev.y); }
  track(ctx: ToolCtx, s: { x: number; y: number }): void { if (this.pressed) ctx.placeBody("drag", s.x, s.y); }
  up(ctx: ToolCtx, ev: ToolPointer): void { if (!this.pressed) return; this.pressed = false; ctx.placeBody("drop", ev.x, ev.y); }
  fingerTap(ctx: ToolCtx, x: number, y: number): boolean { ctx.placeBody("drop", x, y); return true; }
  live(_ctx: ToolCtx, _run: (fn: (c: Kernel) => FaceEvent[]) => void): string { return ""; }
  sample(): Record<string, number> { return {}; }
}

export class VerifyMode implements Mode {
  readonly id = "verify" as const;
  readonly label = "验证";
  readonly kinds = ["brep"] as const;
  readonly tools: readonly Tool[] = ["walk", "select", "transform", "move", "rotate", "tape", "protractor", "compass", "axes"];   // 变换 = 常驻、和移动 / 旋转一家（user 10-30）
  readonly defaultTool: Tool = "select";
  readonly handlers: Partial<Record<Tool, ToolHandler>> = {
    walk: new WalkTool(), select: new SelectTool(), transform: new TransformTool(), move: new MoveTool(), rotate: new RotateTool(),
    tape: new TapeTool(), protractor: new ProtractorTool(), compass: new CompassTool(), axes: new AxesTool(),
  };
}

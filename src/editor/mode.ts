// mode.ts —— 编辑模式的接缝（0.13 编辑模式纪元 刀 ①；提案 = ai-docs/20261024-editor-state-and-modes.md §2 / §6）。
// 一个模式 = 一套工具（左柱按它排，别的模式的工具不存在）+ 这些工具的手势模块 + 进出钩子 + 自己的叠加层。
// 两层（user 2026-10-24「不同的物体也会有不同的可用编辑模式，然后有一个统一的物体管理模式」）：
//   物体模式（object，kind 无关：选物体 / 摆放 / 打组 / 锁定）+ 编辑模式按 kind（brep → geometry / surface；card → 以后）。
// 模式只认 EditorCore（tool-handler.ts），不碰 Editor 的私有字段；模式之间不互相 import。
// created 2026-10-24 by Claude Fable 5.1
import type { BodyKind } from "../scene/body-kind.ts";
import type { Tool } from "./tool-ids.ts";
import type { EditorCore, ToolHandler } from "./tool-handler.ts";
import type { ViewState } from "./render3.ts";

export type ModeId = "object" | "geometry" | "surface";

export interface Mode {
  readonly id: ModeId;
  /** 左上下拉框里显示的名字。 */
  readonly label: string;
  /** 这个模式管哪些 kind 的物体（物体模式 = 全部）。 */
  readonly kinds: readonly BodyKind[];
  /** 这个模式有哪些工具（别的模式的工具在这里不存在）。 */
  readonly tools: readonly Tool[];
  readonly defaultTool: Tool;
  /** 工具 → 手势模块（没有模块的工具暂由 Editor 内建 switch 处理——刀 ② 逐个搬进来）。 */
  readonly handlers: Partial<Record<Tool, ToolHandler>>;
  /** 切进来 / 切出去（清模式专属状态；选区能保留就保留）。 */
  enter?(core: EditorCore): void;
  leave?(core: EditorCore): void;
  /**
   * 工作流亚种（DT87，2026-10-26 Claude Opus 5.5；user「是否折还是破就是看是哪个版本的工具。如果复用代码也得看是哪个工作流的亚种。护栏做好」）：
   * 同一套橡皮 / 自动折面代码按它分叉。eraseNonCoplanar：擦掉两张不共面的膜之间的边 = burst（SketchUp：两张面破掉）/ fold（Blender：变折线，两块算一个面）；
   * autofold：挪点把面拉不平时自动折出的折缝 = hard（硬线）/ fold（折线）。缺 = burst / hard（现有三个工作台都是）；自由建模工作台（以后）用 fold。
   */
  readonly workflow?: { readonly eraseNonCoplanar?: "burst" | "fold"; readonly autofold?: "hard" | "fold" };
  /** 模式自己的叠加层（表面模式：贴图投影预览；物体模式：锁定框…）；底座每帧并进 ViewState。 */
  viewExtras?(): Partial<ViewState>;
}

// edit-marks.ts —— 编辑用的点和淡线（顶点小圆点、自由建模的平滑淡线）：只画能改的那一层（档 = scene/world-view.ts relationOf，怎么办 = reach-table.ts）。
// 2026-11-13 Claude Opus 5.5 从 editor.ts 搬出（层级显示施工单；editor.ts 体重棘轮）：编辑器只告诉这里「在哪个工作台、是不是在编辑、画风自己带不带线」。
import type { EdgeId, Pt3 } from "../kernel/kernel.ts";
import type { WorldView } from "../scene/world-view.ts";
import { REACH } from "./reach-table.ts";

export interface MarkEnv {
  /** 工作台 id（自由建模 = freeform、硬表面 = geometry）。 */
  readonly workbench: string;
  /** 在编辑（没在镜像会话的预演里、没上演示锁）：演示锁 = 不编辑 = 不画结构线（场景表 6）。 */
  readonly editing: boolean;
  /** 缓存键 = 合成视图的身份（几何 / 预演一变它就是新的）。 */
  readonly key: string;
}

/** 能改的那一层（表的 editDots 行是 edit 的那一档 = self）。 */
const editableSlot = (view: WorldView) => view.slots.find((s) => REACH.editDots[s.rel] === "edit");

/** 自由建模：能改的那一层的平滑边（世界坐标；棱照常画，平滑边淡淡地画出来、也点得中——纪元账本 FM138）。 */
export function softEdgesOf(view: WorldView, g: (id: number) => number, env: MarkEnv): { key: string; segs: { id: EdgeId; a: Pt3; b: Pt3 }[] } | null {
  if (env.workbench !== "freeform" || !env.editing) return null;
  const slot = editableSlot(view);
  if (!slot) return null;
  const segs: { id: EdgeId; a: Pt3; b: Pt3 }[] = [];
  for (const e of slot.kernel.edges()) {
    const ge = g(e.id);
    if (!view.isSoft(ge) || !view.graph.hasEdge(ge)) continue;
    const E = view.graph.edge(ge); segs.push({ id: ge, a: view.graph.pt(E.a), b: view.graph.pt(E.b) });
  }
  return segs.length ? { key: env.key, segs } : null;
}

/** 顶点小圆点 = 表的 editDots 行：正在编辑的这一层（self 那一档：根上 = 根自己的几何，进了组 = 那个组的池）任何画风都画，硬表面和自由建模同一条（user 11-13：「默认物体有线，在编辑的物体有额外的点」
 *  「root也有root的geometry的，我说的没在编辑就是所有不在当前你的层级的物体」）。上了修改锁 / 在预演里 = 不在编辑 = 不画。别的工作台不画（工作台自己报「改不改几何」= 第 1 版第五节第 1 条一起收）。 */
export function vertDotsOf(view: WorldView, g: (id: number) => number, env: MarkEnv): { key: string; pts: Pt3[] } | null {
  if (!env.editing || !(env.workbench === "freeform" || env.workbench === "geometry")) return null;
  const slot = editableSlot(view);
  if (!slot) return null;
  const pts: Pt3[] = [];
  for (const v of slot.kernel.vertices()) { const gv = g(v.id); if (view.graph.hasVertex(gv)) pts.push(view.graph.pt(gv)); }
  return { key: env.key, pts };
}

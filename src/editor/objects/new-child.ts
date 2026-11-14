// new-child.ts —— 新建子物体：落点和朝向（第 1 版第五节第 5 条；created 2026-11-13 by Claude Opus 5.5）。
// 在你所在的这一层新铸一个空的子物体（种类当场选：硬表面体 / 网格体 / 空物体），建完直接进去（user 11-13「可以」）。
// 放在哪（施工单的默认）：右键那一下点在点 / 边 / 面上 = 那一点；别处进来（物体窗口、层级窗口、点在空白处）= 这一层的原点；朝向 = 这一层的轴
//   （上下文坐标架 = 画面上那三根色轴：根 = 绘图轴，组 = 组的坐标架，组件里 = 它另摆的画图坐标架、没摆 = 组件原点）。
// 只算一条指令（op addChild）；两个 GUID 在这里铸、写进指令（之后进去、撤销重做、重放都按它认）。进去那一下归编辑器（editor.newChild）。
import type { Pt3 } from "../../kernel/geom.ts";
import type { EditContext, PoolRef, Scene } from "../../scene/scene.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
import type { Op } from "../ops.ts";
import { applyPt, frameToXform, invert } from "../../scene/xform.ts";
import { mintGuid } from "../../format/guid.ts";

/** 菜单里列的顺序（硬表面在前 = 开机的默认种类；空物体最后）。加一种身体 = 这里一个（守卫：和 BODY_KINDS 一样多，test/new-child.test.ts）。 */
export const NEW_CHILD_KINDS: readonly BodyKind[] = ["brep", "mesh", "empty"];

/** 新建子物体的那条指令。anchorWorld = 右键打到的那一点（世界坐标；null = 这一层的原点）。 */
export function newChildOp(s: Scene, ctx: EditContext, at: PoolRef, anchorWorld: Pt3 | null, kind: BodyKind, name: string): Extract<Op, { op: "addChild" }> {
  const F = s.localFrameOfContext(ctx), origin = anchorWorld ? applyPt(invert(s.xformOfContext(ctx)), anchorWorld) : F.origin;
  return { op: "addChild", at, kind, name, xform: frameToXform({ ...F, origin }), def: mintGuid(), inst: mintGuid() };
}

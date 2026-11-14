import type { Pt3 } from "../../kernel/geom.ts";
import type { EditContext, PoolRef, Scene } from "../../scene/scene.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
import type { Op } from "../ops.ts";
/** 菜单里列的顺序（硬表面在前 = 开机的默认种类；空物体最后）。加一种身体 = 这里一个（守卫：和 BODY_KINDS 一样多，test/new-child.test.ts）。 */
export declare const NEW_CHILD_KINDS: readonly BodyKind[];
/** 新建子物体的那条指令。anchorWorld = 右键打到的那一点（世界坐标；null = 这一层的原点）。 */
export declare function newChildOp(s: Scene, ctx: EditContext, at: PoolRef, anchorWorld: Pt3 | null, kind: BodyKind, name: string): Extract<Op, {
    op: "addChild";
}>;

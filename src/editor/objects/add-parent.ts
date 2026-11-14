// add-parent.ts —— 创建父物体（Unity 的 Create Empty Parent；第 1 版第五节第 7 条；created 2026-11-13 by Claude Opus 5.5）。
// 新建一个空物体，当前这个物体整个放到它下面，位置不动（物体种类施工稿第二节第 5 条；和切换种类是两个按钮，空物体也能用）。
// 两个入口：选中的那一个子物体（物体窗口 / 物体菜单那一份）；你所在的这一层（物体窗口「这一层」那一份，人留在它里面）。
// 最外层（根）= 给根包一层：要先把根的特殊收到读写的门口（定稿第 2 条，那两处 diff 过统筹），这里先如实说做不了。
// 只算一条指令（op addParent）；两个 GUID 在这里铸、写进指令。新父亲摆在哪 = 孩子的原点、孩子的轴（去掉缩放，缩放留在孩子身上），在兄弟里顶替孩子原来那一格。
import type { EditContext, InstId, Scene } from "../../scene/scene.ts";
import type { Op } from "../ops.ts";
import { mintGuid } from "../../format/guid.ts";

export type AddParentPlan = { readonly op: Extract<Op, { op: "addParent" }> } | { readonly why: string };
/** picks = 选中的子物体（这一层的直接孩子）；null = 你所在的这一层自己。 */
export function planAddParent(s: Scene, ctx: EditContext, picks: readonly InstId[] | null, name: string): AddParentPlan {
  if (picks === null) {
    if (!ctx.chain.length) return { why: "最外层还不能创建父物体（给根包一层还没做）" };
    const up: EditContext = { chain: ctx.chain.slice(0, -1), group: null }, def = s.defOfContext(up), id = ctx.chain[ctx.chain.length - 1], inst = s.def(def).instances.get(id);
    if (!inst) return { why: "这一层的那一份不在了" };
    if (inst.locked) return { why: "这一层锁着：解锁后再创建父物体" };
    return { op: { op: "addParent", at: { def, group: inst.parent }, instance: id, name, def: mintGuid(), inst: mintGuid() } };
  }
  if (picks.length !== 1) return { why: picks.length ? "一次给一个物体创建父物体（几个装进一个 = 建组件）" : "先选中一个子物体" };
  const def = s.defOfContext(ctx), inst = s.def(def).instances.get(picks[0]);
  if (!inst || inst.parent !== ctx.group) return { why: "选中的那一份不在这一层（选区过期了）" };
  if (inst.locked) return { why: "锁着：解锁后再创建父物体" };
  return { op: { op: "addParent", at: { def, group: ctx.group }, instance: inst.id, name, def: mintGuid(), inst: mintGuid() } };
}

// add-parent.ts —— 创建父物体（Unity 的 Create Empty Parent；第 1 版第五节第 7 条；created 2026-11-13 by Claude Opus 5.5）。
// 新建一个空物体，当前这个物体整个放到它下面，位置不动（物体种类施工稿第二节第 5 条；和切换种类是两个按钮，空物体也能用）。
// 两个入口：选中的那一个子物体（物体窗口 / 物体菜单那一份）；你所在的这一层（物体窗口「这一层」那一份，人留在它里面）。
// 最外层（根）自己 = 给根包一层（定稿第 3 条：新根 = 新的空物体，旧根整个成为它下面原位的一份，GUID / 名字都不变；新根的坐标架 = 旧根那一份）。
// 只算一条指令（op addParent）；两个 GUID 在这里铸、写进指令。新父亲摆在哪 = 孩子的原点、孩子的轴（去掉缩放，缩放留在孩子身上），在兄弟里顶替孩子原来那一格。
import type { EditContext, InstId, Scene } from "../../scene/scene.ts";
import type { Op } from "../ops.ts";
import { mintGuid } from "../../format/guid.ts";

/** after = 提交之后人该在哪、选中什么、提示行怎么说（编辑器照着做；找新铸的那一份按 GUID）。 */
export type AddParentPlan = { readonly op: Extract<Op, { op: "addParent" | "wrapRoot" }>; after(s: Scene, ctx: EditContext): { readonly ctx?: EditContext; readonly select?: InstId; readonly say: string } | null } | { readonly why: string };
/** picks = 选中的子物体（这一层的直接孩子）；null = 你所在的这一层自己。 */
export function planAddParent(s: Scene, ctx: EditContext, picks: readonly InstId[] | null, name: string): AddParentPlan {
  if (picks === null) {
    if (!ctx.chain.length) {   // 给根包一层：人留在原来那一层里（上下文链前面多一节）
      const op = { op: "wrapRoot" as const, name, def: mintGuid(), inst: mintGuid() };
      return { op, after: (s2, c) => { const i = [...s2.def(s2.root).instances.values()].find((x) => x.guid === op.inst); return i ? { ctx: { chain: [i.id, ...c.chain], group: c.group }, say: `给最外层包了一层：新的最外层「${name}」是空物体，原来的最外层整个在它下面、位置不动（撤销一步 = 没包；最外层的物体窗口里「去掉这一层」= 反过来）` } : null; } };
    }
    const up: EditContext = { chain: ctx.chain.slice(0, -1), group: null }, def = s.defOfContext(up), id = ctx.chain[ctx.chain.length - 1], inst = s.def(def).instances.get(id);
    if (!inst) return { why: "这一层的那一份不在了" };
    if (inst.locked) return { why: "这一层锁着：解锁后再创建父物体" };
    const op = { op: "addParent" as const, at: { def, group: inst.parent }, instance: id, name, def: mintGuid(), inst: mintGuid() };
    return { op, after: (s2, c) => { const par = [...s2.def(def).instances.values()].find((x) => x.guid === op.inst), kid = par && [...s2.def(par.def).instances.values()][0]; return par && kid ? { ctx: { chain: [...c.chain.slice(0, -1), par.id, kid.id], group: null }, say: said(name, s2.def(kid.def).name) } : null; } };
  }
  if (picks.length !== 1) return { why: picks.length ? "一次给一个物体创建父物体（几个装进一个 = 建组件）" : "先选中一个子物体" };
  const def = s.defOfContext(ctx), inst = s.def(def).instances.get(picks[0]);
  if (!inst || inst.parent !== ctx.group) return { why: "选中的那一份不在这一层（选区过期了）" };
  if (inst.locked) return { why: "锁着：解锁后再创建父物体" };
  const op = { op: "addParent" as const, at: { def, group: ctx.group }, instance: inst.id, name, def: mintGuid(), inst: mintGuid() }, kidName = s.def(inst.def).name;
  return { op, after: (s2) => { const par = [...s2.def(def).instances.values()].find((x) => x.guid === op.inst); return par ? { select: par.id, say: said(name, kidName) } : null; } };
}
const said = (name: string, kid: string): string => `创建了父物体「${name}」（空物体）：「${kid}」整个在它下面，位置不动（撤销一步 = 没建）`;

// mesh-edits/index.ts —— 网格体的菜单动词（mesh.* 族；浮条 / 右键入口，自由建模工作台）。created 2026-10-27 by Claude Opus 5.5
// 工具手势（挤出 / 挪 / 刀……）直接提交 op；这里是不用手势、选了就能点的那一类。第一条 = 环切（刀在一条边上点两下的菜单版，FM10「也加一个模式按钮，免得我不习惯」）。
// 做完的选区走 PlanOut.select（规划时在副本上跑一遍拿新 id；op 确定性 = 提交后同一批）。
import type { Command, MeshUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { loopCut as loopCutOp } from "../../mesh/ops/index.ts";

export const loopCut: Command<MeshUnit> = {
  id: "mesh.loopCut", unit: "mesh", title: "环切",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    if (!u.sel || u.sel.edges.size !== 1 || u.sel.faces.size) return { ops: [], count: 0 };
    const e = [...u.sel.edges][0], m = env.scene.mesh(u.def).kernel;
    if (!m.hasE(e)) return { ops: [], count: 0 };
    const r = loopCutOp(m.clone(), e, 0.5);
    if (!r.edges.length) return { ops: [], count: 0, notes: ["这条边两侧不是四边形，切不出一圈"] };
    return { ops: [{ op: "meshLoopCut", def: u.def, edge: e, t: 0.5 }], count: r.edges.length, select: { edges: r.edges } };
  },
  done: (n) => `环切：切了一圈 ${n} 条边（在选区里，接着可以挪 / 缩）`,
  none: "环切：选一条四边形带上的边（只选一条）",
};

const commands: readonly Command[] = [loopCut as Command];
/** 图标 = stopgap（剪刀；图标库 TODO 已登记 loop-cut）。 */
const actions: readonly Action[] = [{ id: "mesh.loopCut", icon: "cut", label: (n) => `环切（${n} 条边）`, commands: { mesh: "mesh.loopCut" } }];
const placements: readonly Placement[] = [{ action: "mesh.loopCut", where: "contextBar", order: 20, modes: ["freeform"] }];

export const meshEdits: Family = { name: "meshEdits", commands, actions, placements };

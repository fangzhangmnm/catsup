// mesh-edits/index.ts —— 网格体的菜单动词（mesh.* 族；浮条 / 右键入口，自由建模工作台）。created 2026-10-27 by Claude Opus 5.5
// 工具手势（挤出 / 挪 / 刀……）直接提交 op；这里是不用手势、选了就能点的那一类。第一条 = 环切（刀在一条边上点两下的菜单版，FM10「也加一个模式按钮，免得我不习惯」）。
// 做完的选区走 PlanOut.select（规划时在副本上跑一遍拿新 id；op 确定性 = 提交后同一批）。
import type { Command, MeshUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { loopCut as loopCutOp, knife as knifeOp } from "../../mesh/ops/index.ts";
import type { MeshKernel } from "../../mesh/mesh-kernel.ts";

/** 两个点共有的面（最小 id；没有 = null）。 */
function commonFaceOf(m: MeshKernel, a: number, b: number): number | null {
  const fa = new Set<number>(); for (const e of m.vEdges(a)) for (const f of m.eFaces(e)) fa.add(f);
  let best: number | null = null; for (const e of m.vEdges(b)) for (const f of m.eFaces(e)) if (fa.has(f) && (best === null || f < best)) best = f;
  return best;
}

/** 连线（Blender J = Connect Vertex Path 的两点版；user 10-27「blender里面选择两个点之后ctrl j 是连线对吧」——是 J，Ctrl+J 是合并物体）：同一张面上的两个点之间切一刀。 */
export const connect: Command<MeshUnit> = {
  id: "mesh.connect", unit: "mesh", title: "连线",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    if (!u.sel || u.sel.verts.size !== 2 || u.sel.edges.size || u.sel.faces.size) return { ops: [], count: 0 };
    const [a, b] = [...u.sel.verts].sort((x, y) => x - y), m = env.scene.mesh(u.def).kernel;
    if (!m.hasV(a) || !m.hasV(b)) return { ops: [], count: 0 };
    if (m.edgeOf(a, b) >= 0) return { ops: [], count: 0, notes: ["这两个点之间已经有边了"] };
    const f = commonFaceOf(m, a, b);
    if (f === null) return { ops: [], count: 0, notes: ["这两个点不在同一张面上"] };
    const probe = m.clone(); knifeOp(probe, f, [{ v: a }, { v: b }]);
    return { ops: [{ op: "meshKnife", def: u.def, face: f, path: [{ v: a }, { v: b }] }], count: 1, select: { edges: [probe.edgeOf(a, b)] } };
  },
  done: () => "连线：两个点之间切了一刀（新边在选区里）",
  none: "连线：选同一张面上的两个点（J）",
};

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
  done: (n) => `环切：切了一圈 ${n} 条边（在选区里，接着可以移动 / 缩放）`,
  none: "环切：选一条四边形带上的边（只选一条）",
};

const commands: readonly Command[] = [loopCut as Command, connect as Command];
/** 图标 = stopgap（剪刀；图标库 TODO 已登记 loop-cut）。 */
const actions: readonly Action[] = [
  { id: "mesh.loopCut", icon: "cut", label: (n) => `环切（${n} 条边）`, commands: { mesh: "mesh.loopCut" } },
  { id: "mesh.connect", icon: "line", label: () => "连线（J）", commands: { mesh: "mesh.connect" } },
];
const placements: readonly Placement[] = [{ action: "mesh.loopCut", where: "contextBar", order: 20, modes: ["freeform"] }, { action: "mesh.connect", where: "contextBar", order: 21, modes: ["freeform"] }];

export const meshEdits: Family = { name: "meshEdits", commands, actions, placements };

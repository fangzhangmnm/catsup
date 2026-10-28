// move/index.ts —— 「挪」模块：第一个路由型动作（注册表提案 §7.2 的送命题落地）。created 2026-10-27 by Claude Fable 5.1
// 三条带类型的指令，一个动作：挪物体改变换矩阵（object.move）、挪 SU 点写坐标再过结算机（brep.move）、挪网格点往位置数组里写（mesh.move）。
// 参数 = 位移 (dx, dy, dz)，量纲米，坐标系 = 当前上下文（定义坐标：根池、组池、实例的摆放全在同一个定义坐标里）。混选 = 一步里三条调用（Editor.runAction 合成一步）。
// 工具层（挪动工具 / 变换手柄 / 方向键 / nudge 笔刷）以后都路由到这三条；今天只有数值入口（api / search 面）。
import type { Command, CommandEnv, MeshUnit, ObjectUnit, PoolUnit } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import type { ParamField } from "../param-panel.ts";
import type { Pt3 } from "../../kernel/geom.ts";
import { translation } from "../../scene/xform.ts";
import { moveTargetsSelection } from "../tools.ts";

const fields = (): ParamField[] => [
  { key: "dx", def: { kind: "number", label: "沿 X", min: -1e6, max: 1e6, step: 0.01, unit: "m" } },
  { key: "dy", def: { kind: "number", label: "沿 Y", min: -1e6, max: 1e6, step: 0.01, unit: "m" } },
  { key: "dz", def: { kind: "number", label: "沿 Z", min: -1e6, max: 1e6, step: 0.01, unit: "m" } },
];
const deltaOf = (v: Readonly<Record<string, unknown>>): Pt3 => ({ x: Number(v.dx) || 0, y: Number(v.dy) || 0, z: Number(v.dz) || 0 });
const isZero = (d: Pt3): boolean => d.x === 0 && d.y === 0 && d.z === 0;
const shift = (p: Pt3, d: Pt3): Pt3 => ({ x: p.x + d.x, y: p.y + d.y, z: p.z + d.z });

/** 挪 SU 点：选区解成点集（边的两端、膜的环、单点），每点 from → from + d，按坐标寻址（结算机会再合并 / 折面）。 */
export const brepMove: Command<PoolUnit> = {
  id: "brep.move", unit: "brep", title: "挪点",
  defaults: () => ({ dx: 0, dy: 0, dz: 0 }),
  params: fields,
  plan(env: CommandEnv, u, v) {
    const d = deltaOf(v), k = env.scene.kernelOf(u.at);
    const ids = u.sel ? moveTargetsSelection(k, u.sel) : k.vertices().map((x) => x.id);
    if (!ids.length || isZero(d)) return { ops: [], count: 0 };
    return { ops: [{ op: "move", at: u.at, moves: ids.map((id) => { const p = k.graph.pt(id); return { from: p, to: shift(p, d) }; }) }], count: ids.length };
  },
  done: (n) => `挪了 ${n} 个点`,
  none: "没有能挪的点：先选中点 / 边 / 面，再给位移",
  tally: true,
};

/** 挪网格点：选区解成点集（边的两端、面的环、单点），写位置数组；id 按数组制度稳定、克隆保号，直接按 id 寻址。 */
export const meshMove: Command<MeshUnit> = {
  id: "mesh.move", unit: "mesh", title: "挪网格点",
  defaults: () => ({ dx: 0, dy: 0, dz: 0 }),
  params: fields,
  plan(env: CommandEnv, u, v) {
    const d = deltaOf(v), m = env.scene.mesh(u.def).kernel;
    const ids = new Set<number>();
    if (u.sel) {
      for (const e of u.sel.edges) if (m.hasE(e)) { ids.add(m.edgeA[e]); ids.add(m.edgeB[e]); }
      for (const f of u.sel.faces) if (m.hasF(f)) for (const x of m.faceVerts(f)) ids.add(x);
      for (const x of u.sel.verts) if (m.hasV(x)) ids.add(x);
    } else for (const x of m.verts()) ids.add(x);
    if (!ids.size || isZero(d)) return { ops: [], count: 0 };
    return { ops: [{ op: "meshMove", def: u.def, moves: [...ids].map((x) => ({ v: x, to: shift(m.pt(x), d) })) }], count: ids.size };
  },
  done: (n) => `挪了 ${n} 个网格点`,
  none: "没有能挪的网格点：先选中点 / 边 / 面，再给位移",
};

/** 挪物体：这一份实例的变换矩阵左乘平移（它所在那个定义的坐标里）。 */
export const objectMove: Command<ObjectUnit> = {
  id: "object.move", unit: "object", title: "挪物体",
  defaults: () => ({ dx: 0, dy: 0, dz: 0 }),
  params: fields,
  plan(_env, u, v) {
    const d = deltaOf(v);
    if (isZero(d)) return { ops: [], count: 0 };
    return { ops: [{ op: "transformInstance", def: u.at.def, instance: u.instance, xform: translation(d) }], count: 1 };
  },
  done: (n) => `挪了 ${n} 个物体`,
  none: "没有能挪的物体：先选中组件 / 组，再给位移",
};

const commands: readonly Command[] = [brepMove, meshMove, objectMove];
/** 一个动作、三条指令：按手里的东西路由（混选 = 一步里三条调用）。 */
const actions: readonly Action[] = [{ id: "move", icon: "move", label: (n) => `挪（${n}）`, commands: { brep: "brep.move", mesh: "mesh.move", object: "object.move" } }];
/** 今天只登记在脚本 / 搜索面（渲染器还没有）：浮条上挪动走工具，不走菜单。 */
const placements: readonly Placement[] = [{ action: "move", where: "api", order: 10 }, { action: "move", where: "search", order: 10 }];

export const move: Family = { name: "move", commands, actions, placements };

// objects/index.ts —— 转换模块（object.* 两条）：吃摆着的一份实例、改的是它的定义（perDefinition：同一定义几份只喂一次），不吃几何。第一批 = 两条显式转换（user 10-24「每个物体有一个kind，可以换，换了要explicit cast op用户点确认」；
// 10-27「explicit转换的话元数据也许也不要带，我们要诚实披露，不要藏东西」）：转成网格体 / 转回硬表面体，各自把丢掉什么写进提示。created 2026-10-27 by Claude Fable 5.1
import type { Command, CommandEnv, ObjectUnit, Params } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { canCast } from "../../scene/kinds.ts";

/** 三角形 → 膜那条管线的速度（三角 / 秒；2026-10-27 node 实测：1 万个不平四边形 = 2 万三角 → 2 万张膜 2.2 s ≈ 9000 三角 / 秒，含共面合并；只是量级，浏览器同量级）。量纲：个 / 秒。 */
const TRIS_PER_SECOND = 9000;

const disclose = (u: ObjectUnit, loses: readonly string[]): string[] => [u.copies > 1 ? `「${u.name}」的 ${u.copies} 份实例一起变` : "", `丢掉：${loses.join("、")}`].filter(Boolean);

export const toMesh: Command<ObjectUnit> = {
  id: "object.toMesh", unit: "object", perDefinition: true, title: "转成网格体",
  defaults: () => ({}),
  params: () => [],
  plan(_env, u) {
    const c = canCast(u.body, "mesh");
    if (!c.ok) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」${c.why}`] };
    return { ops: [{ op: "castDefinition", def: u.def, to: "mesh" }], count: 1, notes: disclose(u, c.loses) };
  },
  done: (n) => `转成网格体：${n} 个组件（双击进去就是自由建模工作台）`,
  none: "没有能转的：先选中一个硬表面体组件",
};

export const toBrep: Command<ObjectUnit> = {
  id: "object.toBrep", unit: "object", perDefinition: true, title: "转回硬表面体",
  defaults: (env) => ({ softDeg: env.sharpDeg() }),
  params: () => [{ key: "softDeg", def: { kind: "number", label: "弯折不到这个角度的边算软边", min: 0, max: 90, step: 1, unit: "°" } }],
  plan(_env, u, v) {
    const c = canCast(u.body, "brep");
    if (!c.ok) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」${c.why}`] };
    return { ops: [{ op: "castDefinition", def: u.def, to: "brep", softDeg: Number(v.softDeg) }], count: 1, notes: disclose(u, c.loses) };
  },
  done: (n) => `转回硬表面体：${n} 个组件`,
  none: "没有能转的：先选中一个网格体组件",
  estimate(env: CommandEnv, units: readonly ObjectUnit[], _v: Params) {
    let tris = 0;
    for (const u of units) if (u.body === "mesh") tris += env.scene.mesh(u.def).kernel.triangles().faceOfTri.length;
    return tris ? { seconds: tris / TRIS_PER_SECOND, what: `三角形 → 膜：${tris} 个三角形` } : null;
  },
};

const commands: readonly Command[] = [toMesh, toBrep];
/** 图标：两个都是 stopgap（图标库还没有「转成网格体 / 转回硬表面体」，已登记 SVG Icons TODO）。 */
const actions: readonly Action[] = [
  { id: "object.toMesh", commands: { object: "object.toMesh" }, icon: "collection", label: (n) => `转成网格体（${n}）` },
  { id: "object.toBrep", commands: { object: "object.toBrep" }, icon: "wrench", label: (n) => `转回硬表面体（${n}）` },
];
const placements: readonly Placement[] = [{ action: "object.toMesh", where: "contextBar", order: 60 }, { action: "object.toBrep", where: "contextBar", order: 61 }];

export const objects: Family = { name: "object", commands, actions, placements };

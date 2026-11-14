// objects/index.ts —— 转换模块（object.* 两条）：吃摆着的一份实例、改的是它的定义（perDefinition：同一定义几份只喂一次），不吃几何。第一批 = 两条显式转换（user 10-24「每个物体有一个kind，可以换，换了要explicit cast op用户点确认」；
// 10-27「explicit转换的话元数据也许也不要带，我们要诚实披露，不要藏东西」）：转成网格体 / 转回硬表面体，各自把丢掉什么写进提示。created 2026-10-27 by Claude Fable 5.1
import type { Command, CommandEnv, ObjectUnit, Params } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { brepSideCounts, canCast, meshToBrepCheck } from "../../scene/kinds.ts";
import type { BodyKind } from "../../scene/body-kind.ts";
import { bodyEmpty } from "../ops.ts";

/** 三角形 → 膜那条管线的速度（三角 / 秒；2026-10-27 node 实测：1 万个不平四边形 = 2 万三角 → 2 万张膜 2.2 s ≈ 9000 三角 / 秒，含共面合并；只是量级，浏览器同量级）。量纲：个 / 秒。 */
const TRIS_PER_SECOND = 9000;

const disclose = (u: ObjectUnit, loses: readonly string[]): string[] => [u.instance === null ? `转的是你所在的这一层「${u.name}」` : "", u.copies > 1 ? `「${u.name}」的 ${u.copies} 份实例一起变` : "", `丢掉：${loses.join("、")}`].filter(Boolean);

export const toMesh: Command<ObjectUnit> = {
  id: "object.toMesh", unit: "object", perDefinition: true, takesContext: true, title: "转成网格体",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    const c = canCast(u.body, "mesh");
    if (!c.ok) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」${c.why}`] };
    // 转换不问，只报（计划书 §9.2½ ②）：两侧都出 = 两张叠着的面（共用点，环切 / 平滑跨不过去，要合并用修复工具）；两侧都是默认背面 = 这张面没了
    const sc = u.body === "brep" ? brepSideCounts(env.scene.brep(u.def)) : { both: 0, differ: 0, neither: 0 };   // 空物体：没有面
    const sides = [...(sc.both ? [`「${u.name}」${sc.both} 张面两侧都出，转过去是叠着的两张（其中 ${sc.differ} 张两侧材质不同）；想只留一侧，先把另一侧涂成默认背面`] : []), ...(sc.neither ? [`「${u.name}」${sc.neither} 张面两侧都是默认背面，转过去就没了`] : [])];
    return { ops: [{ op: "castDefinition", def: u.def, to: "mesh" }], count: 1, notes: [...disclose(u, c.loses), ...sides] };
  },
  done: (n) => `转成网格体：${n} 个（组件双击进去就是自由建模工作台）`,
  none: "没有能转的：选中一个硬表面体组件；什么都不选 = 转你所在的这一层",
};

export const toBrep: Command<ObjectUnit> = {
  id: "object.toBrep", unit: "object", perDefinition: true, takesContext: true, title: "转回硬表面体",
  defaults: (env) => ({ softDeg: env.sharpDeg() }),
  params: () => [{ key: "softDeg", def: { kind: "number", label: "弯折不到这个角度的边算软边", min: 0, max: 90, step: 1, unit: "°" } }],
  plan(_env, u, v) {
    const c = canCast(u.body, "brep");
    if (!c.ok) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」${c.why}`] };
    return { ops: [{ op: "castDefinition", def: u.def, to: "brep", softDeg: Number(v.softDeg) }], count: 1, notes: disclose(u, c.loses) };
  },
  done: (n) => `转回硬表面体：${n} 个`,
  none: "没有能转的：选中一个网格体组件；什么都不选 = 转你所在的这一层",
  estimate(env: CommandEnv, units: readonly ObjectUnit[], _v: Params) {
    let tris = 0;
    for (const u of units) if (u.body === "mesh") tris += env.scene.mesh(u.def).kernel.triangles().faceOfTri.length;
    return tris ? { seconds: tris / TRIS_PER_SECOND, what: `三角形 → 膜：${tris} 个三角形` } : null;
  },
  /** 藏着的东西带不过去的那两种（统筹 11-13 b：转之前明着说、让人选转不转，不许悄悄少）；数和真转是同一份算法（scene/kinds.ts meshToBrepCheck）。没有藏着的东西 = 不问。 */
  ask(env: CommandEnv, units: readonly ObjectUnit[], v: Params) {
    const lines: string[] = [];
    for (const u of units) {
      if (u.body !== "mesh") continue;
      const c = meshToBrepCheck(env.scene.mesh(u.def), Number(v.softDeg));
      if (c.mixedHidden) lines.push(`「${u.name}」有 ${c.mixedHidden} 张藏着的面和背靠背（或叠着）的露着的面合在一起：硬表面里它们合成一张膜，只能整张藏或整张露，转过去这 ${c.mixedHidden} 张会露出来`);
      if (c.lostHiddenEdges) lines.push(`「${u.name}」有 ${c.lostHiddenEdges} 条藏着的边转过去对不上（两头的点并掉了），这几条的「藏」会没了`);
    }
    if (!lines.length) return null;
    const est = toBrep.estimate?.(env, units, v), wait = est && est.seconds >= 5 ? `（${est.what}，估计 ${Math.round(est.seconds)} 秒，期间界面会卡住）` : "";
    return { title: "转回硬表面体：有藏着的东西带不过去", message: `${lines.join("；")}。要转吗？${wait}`, okLabel: "照样转", params: {} };
  },
};

/** 转成空物体（第 1 版第五节第 4 条）：只在自己没有几何时可用（挂着子物体不算有几何）；有几何 = 明说转不成，不悄悄丢。丢的是挂在原来那个种类上的设置（登记表 castsTo）。 */
export const toEmpty: Command<ObjectUnit> = {
  id: "object.toEmpty", unit: "object", perDefinition: true, takesContext: true, title: "转成空物体",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    const c = canCast(u.body, "empty");
    if (!c.ok) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」${c.why}`] };
    if (!bodyEmpty(env.scene.def(u.def).body)) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」还有几何，转不成空物体（空物体只装子物体）`] };
    return { ops: [{ op: "castDefinition", def: u.def, to: "empty" }], count: 1, notes: disclose(u, c.loses) };
  },
  done: (n) => `转成空物体：${n} 个（进去是摆放工作台：只摆子物体）`,
  none: "没有能转的：只有自己没有几何的物体能转成空物体",
};
/** 每种身体由哪个动作转过去（物体窗口「切换种类 ›」照这张表列；加一个种类 = 这里一行，少一种编译不过）。 */
export const CAST_ACTIONS: Readonly<Record<BodyKind, string>> = { brep: "object.toBrep", mesh: "object.toMesh", empty: "object.toEmpty" };

import { verbActions, verbCommands, verbPlacements } from "./verbs.ts";
const commands: readonly Command[] = [toMesh, toBrep, toEmpty, ...verbCommands];
/** 图标：两个都是 stopgap（图标库还没有「转成网格体 / 转回硬表面体」，已登记 SVG Icons TODO）。 */
const actions: readonly Action[] = [
  { id: "object.toMesh", commands: { object: "object.toMesh" }, icon: "collection", label: (n) => `转成网格体（${n}）` },
  { id: "object.toBrep", commands: { object: "object.toBrep" }, icon: "wrench", label: (n) => `转回硬表面体（${n}）` },
  { id: "object.toEmpty", commands: { object: "object.toEmpty" }, icon: "object", label: (n) => `转成空物体（${n}）` },
];
const placements: readonly Placement[] = [{ action: "object.toMesh", where: "objectWindow", order: 10 }, { action: "object.toBrep", where: "objectWindow", order: 11 }, { action: "object.toEmpty", where: "objectWindow", order: 12 }, ...verbPlacements];   // 物体窗口（2026-10-28：物体级不混进选区的右键，UX 心智模型 §2.2）

export const objects: Family = { name: "object", commands, actions: [...actions, ...verbActions], placements };

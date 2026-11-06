// repairs/merge-reversed —— 合并重合反向面（网格体的第一条修复；规划在 plan.ts）：执行全走现成的 meshDelete，一步撤销。created 2026-11-06 by Claude Opus 5.5
// 材质纪元之前没有双面字段：合完这张面只有一面看得见，字上要写明（计划书 §2.9，user 11-04）。材质纪元加了 doubleSided 之后这里再补「+ 双面材质」。
import type { Command, MeshUnit } from "../../commands/command.ts";
import { planMergeReversed } from "./plan.ts";

/** 整个网格体（修复这台机器只对「你所在的这一层」说话，没有选区这回事）。用户点了才跑；导入、导出、转换都不走这里。 */
export const mergeReversed: Command<MeshUnit> = {
  id: "mesh.mergeReversed", unit: "mesh",
  title: "合并重合反向面",
  defaults: () => ({}),
  params: () => [],
  plan(env, u) {
    const b = env.scene.mesh(u.def), p = planMergeReversed(b.kernel, (slot) => b.materialSlots[slot] ?? -1);
    const notes: string[] = [];
    if (p.sheets) notes.push(`${p.sheets} 块开口的片朝向是照第一张定的，反了用翻转法线`);
    if (p.skipped) notes.push(`${p.skipped} 处没并（两张材质不同，或者叠了不止两层）`);
    return { ops: p.remove.length ? [{ op: "meshDelete", def: u.def, faces: p.remove }] : [], count: p.pairs, ...(notes.length ? { notes } : {}) };
  },
  done: (n) => `合并了 ${n} 对重合反向的面：每对只留一张，另一面现在是看穿的（双面材质要等材质纪元）`,
  none: "没有能合并的重合反向面",
};

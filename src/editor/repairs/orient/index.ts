// repairs/orient —— 翻面 / 统一朝向 / 自动朝外（单面 / 双面第四版，计划书 §9.3-4）：规划在 plan.ts；执行全走核心指令（flipFaceSides + paintFaces 默认背面），一步撤销。created 2026-11-04 by Claude Opus 5.5
import { faceKey, type Op } from "../../ops.ts";
import type { Command, PoolUnit } from "../../commands/command.ts";
import type { PoolRef, Scene } from "../../../scene/scene.ts";
import { BUILTIN_BACK_SLOT } from "../../../scene/builtin-materials.ts";
import { type OrientPlan, planOutward, planUnify } from "./plan.ts";

const backOf = (s: Scene, at: PoolRef): number => s.brep(at.def).materialSlots.indexOf(BUILTIN_BACK_SLOT);
function opsOf(s: Scene, at: PoolRef, p: OrientPlan): Op[] {
  const k = s.kernelOf(at), ops: Op[] = [];
  if (p.flip.length) ops.push({ op: "flipFaceSides", at, faces: p.flip.map((f) => faceKey(k, f)) });
  if (p.back.length) ops.push({ op: "paintFaces", at, faces: p.back.map((b) => faceKey(k, b.face)), material: BUILTIN_BACK_SLOT, sides: p.back.map((b) => b.side) });
  return ops;
}

/** 翻面：选中的面两侧的值互换（几何不动）。 */
export const flipSides: Command<PoolUnit> = {
  id: "brep.flipSides", unit: "brep",
  title: "翻面",
  defaults: () => ({}),
  params: () => [],
  plan(ctx, { at, sel }) {
    const k = ctx.scene.kernelOf(at), faces = sel ? [...sel.faces].filter((f) => k.face(f)) : [];
    return faces.length ? { ops: [{ op: "flipFaceSides", at, faces: faces.map((f) => faceKey(k, f)) }], count: faces.length } : { ops: [], count: 0 };
  },
  done: (n) => `翻了 ${n} 张面（两侧互换）`,
  none: "先选中要翻的面",
};

/** 统一朝向：以选中的面为准，沿连着的面灌。 */
export const orientUnify: Command<PoolUnit> = {
  id: "brep.orientUnify", unit: "brep",
  title: "统一朝向",
  defaults: () => ({}),
  params: () => [],
  plan(ctx, { at, sel }) {
    const k = ctx.scene.kernelOf(at), seeds = sel ? [...sel.faces].filter((f) => k.face(f)) : [];
    if (!seeds.length) return { ops: [], count: 0 };
    const p = planUnify(k, backOf(ctx.scene, at), seeds);
    if (p.noSeed) return { ops: [], count: 0, notes: ["选中的面两侧都不是默认背面，分不出哪侧是正面：先把背面那侧涂成默认背面，或者用「自动朝外」"] };
    return { ops: opsOf(ctx.scene, at, p), count: p.flip.length + p.back.length, skipped: p.stuck };
  },
  done: (n) => `统一朝向：改了 ${n} 张面`,
  none: "先选中一张朝向对的面；连着的面已经和它一致就没事做",
  skippedText: (n) => `${n} 张面没动（那一侧涂了材质，或者绕回来两侧都碰到）`,
};

/** 自动朝外：猜外侧（带符号体积 + 够不够鼓）。 */
export const orientOutward: Command<PoolUnit> = {
  id: "brep.orientOutward", unit: "brep",
  title: "自动朝外",
  defaults: () => ({ curvature: 3 }),
  params: () => [{ key: "curvature", def: { kind: "number", label: "至少多鼓才算壳（封闭 = 4）", min: 0, max: 4, step: 0.1, unit: "π" } }],
  quickCount: (env, { at, sel }) => (sel ? sel.faces.size : env.scene.kernelOf(at).faces().length),
  plan(ctx, { at, sel }, v) {
    const k = ctx.scene.kernelOf(at), p = planOutward(k, backOf(ctx.scene, at), sel && sel.faces.size ? sel.faces : null, { minCurvature: (Number(v.curvature ?? 3)) * Math.PI });
    return { ops: opsOf(ctx.scene, at, p), count: p.flip.length + p.back.length, skipped: p.stuck, ...(p.sheets ? { notes: [`${p.sheets} 块不够鼓，当片（两面都出），没动`] } : {}) };
  },
  done: (n) => `自动朝外：改了 ${n} 张面`,
  none: "没有要改的：要么已经朝外，要么不够鼓（片不猜）",
  skippedText: (n) => `${n} 张面没动（涂了材质的那侧不覆盖；壳里的隔墙不猜）`,
};

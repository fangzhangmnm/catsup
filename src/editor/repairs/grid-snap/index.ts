// repairs/grid-snap —— 「拉正」（DT101）和「吸到格点」（T8 / DT4）合租：同一份规划（plan.ts planGridSnap）、同一条插件指令 "gridSnap"，两个入口，
// 各自能顺便做另一件（user 10-26「拉正 好想要，比snap更好……这个可以和snap合租。就是可以拉正不snap之类的？」）。
// 2026-10-26 Claude Opus 5.5 从 editor.ts / ops.ts 搬成模块；老指令名 snapToGrid 由 ops.ts 认成 "gridSnap" 重放。
import type { FaceEvent, FaceId, Kernel, Pt3 } from "../../../kernel/kernel.ts";
import type { Xform } from "../../../scene/xform.ts";
import { fmtLen } from "../../units.ts";
import { moveTargetsSelection } from "../../tools.ts";
import { PlanarBurst, OpTargetError, poolOf, registerOpPlugin, resolveVertex } from "../../ops.ts";
import type { CommandEnv, Command, PoolUnit, Params } from "../../commands/command.ts";
import { type SnapCurves, planGridSnap, triangulationDiagonals } from "./plan.ts";

interface GridSnapArgs { verts: Pt3[]; step: number; lattice: number[]; curves: SnapCurves; crease: "soft" | "hard"; straighten?: number; grid?: boolean }

registerOpPlugin("gridSnap", {
  apply(s, at, a0) {
    const a = a0 as unknown as GridSnapArgs, { kernel } = poolOf(s, at);
    if (!(a.step > 0) || a.lattice.length !== 12) throw new OpTargetError(`gridSnap step=${a.step}`);
    const scope = a.verts.length ? a.verts.map((p) => resolveVertex(kernel, p)) : null;
    const plan = planGridSnap(kernel, scope, a.lattice as unknown as Xform, { step: a.step, curves: a.curves, ...(a.straighten !== undefined ? { straighten: a.straighten } : {}), ...(a.grid === false ? { grid: false } : {}) });
    if (!plan.moves.length) return { scene: s, events: [] };
    const crease = a.crease === "soft" ? ["soft", "smooth"] : [];
    const opts = crease.length ? { creaseLayers: crease } : undefined;
    // 两批：整条平移的曲线先挪（这批里没有合并 → 圆 / 弧照样带圆心半径），其余的点后挪（合并只发生在这批）
    const batches = [plan.moves.filter((m) => plan.rigid.has(m.id)), plan.moves.filter((m) => !plan.rigid.has(m.id))].filter((b) => b.length);
    const run = (k: Kernel): FaceEvent[] => { const evs: FaceEvent[] = []; for (const b of batches) evs.push(...k.moveVertices(b.filter((m) => k.graph.hasVertex(m.id)), opts)); return evs; };
    // 先在拷贝上试：哪些面会破（autofold 折不平 → BURST）
    const burst = run(kernel.clone()).filter((e) => e.type === "BURST").map((e) => (e as { face: FaceId }).face);
    const events: FaceEvent[] = [];
    if (burst.length) {
      // 退路（账本 DT4「不破」）：这几张面先在原平面里三角化（三角永远是平的），对角线和折缝同样的层；点的 id 不变（对角线只连现有的点）
      const diag = triangulationDiagonals(kernel, [...new Set(burst)].sort((x, y) => x - y));
      if (diag.length) events.push(...kernel.addEdges(diag, crease.length ? { layers: crease } : undefined));
    }
    events.push(...run(kernel));
    if (events.some((e) => e.type === "BURST")) throw new PlanarBurst(`${a.grid === false ? "拉正" : "吸到格点"}会让面破掉——三角化也救不回的情况，已整步撤回（请导出复现包）`);
    return { scene: s, events };
  },
  describe: (a0) => { const a = a0 as unknown as GridSnapArgs; return `verts=${a.verts.length || "all"}${a.grid === false ? " nogrid" : ` step=${a.step}`}${a.straighten !== undefined ? ` straighten=${a.straighten}°` : ""} ${a.curves} ${a.crease}`; },
});

/** 拉正的默认门槛：和轴差这么多度以内的边算「歪了一点」（AI 定的默认，user 没拍；马后炮可改）。量纲：度。 */
export const STRAIGHTEN_DEG = 1;

/** 两个入口共用的规划：grid / straighten 由入口和「顺便」开关定。 */
function planBoth(ctx: CommandEnv, { at, sel, xf }: PoolUnit, v: Params, entry: "snap" | "straighten") {
  const k = ctx.scene.kernelOf(at);
  const vids = sel ? moveTargetsSelection(k, sel) : null;
  if (sel && !vids!.length) return { ops: [], count: 0 };
  const step = Number(v.step) > 0 ? Number(v.step) : ctx.gridFineStep();
  const lattice = ctx.snapLattice(at, xf, v.frame === "world" ? "world" : "own");
  const curves = (v.curves === "points" ? "points" : "rigid") as SnapCurves;
  const grid = entry === "snap" || v.grid === true, deg = Number(v.deg) > 0 ? Number(v.deg) : STRAIGHTEN_DEG;
  const straighten = entry === "straighten" || v.straighten === true ? deg : undefined;
  const plan = planGridSnap(k, vids, lattice, { step, curves, ...(straighten !== undefined ? { straighten } : {}), grid });
  if (!plan.moves.length) return { ops: [], count: 0, skipped: plan.skipped };
  const args: GridSnapArgs = { verts: vids ? vids.map((x) => k.graph.pt(x)) : [], step, lattice: [...lattice], curves, crease: v.crease === "hard" ? "hard" : "soft", ...(straighten !== undefined ? { straighten } : {}), ...(grid ? {} : { grid: false }) };
  return { ops: [{ op: "plugin" as const, name: "gridSnap", at, args: args as unknown as Record<string, unknown> }], count: plan.moves.length, extra: plan.curves, skipped: plan.skipped };
}
const frameField = (hint: string) => ({ key: "frame", def: { kind: "enum" as const, label: "按", values: [{ id: "own", label: "物体自己的坐标架", hint }, { id: "world", label: "世界的轴 / 格点", hint: "在根上看到的那张格子" }] } });
const creaseField = (hint: string) => ({ key: "crease", def: { kind: "enum" as const, label: "折缝", values: [{ id: "soft", label: "软边", hint }, { id: "hard", label: "硬边" }] } });
const curvesSkipped = (n: number): string => `${n} 个点在只选了一部分的圆 / 弧上，没动`;

export const straighten: Command = {
  id: "brep.straighten",
  title: "拉正",
  defaults: () => ({ deg: STRAIGHTEN_DEG, frame: "own", crease: "soft", grid: false, step: "grid", curves: "rigid" }),
  params: (ctx) => [
    { key: "deg", def: { kind: "number", label: "和轴差", min: 0.1, max: 10, step: 0.1, unit: "°" } },
    frameField("组件转过也照它自己的轴拉正"),
    { key: "grid", def: { kind: "bool", label: `顺便吸到格点（${fmtLen(ctx.gridFineStep())} 的格子）` } },
    creaseField("拉正后不平的面折开处不画线、明暗连续"),
  ],
  plan: (ctx, pool, v) => planBoth(ctx, pool, v, "straighten"),
  done: (n, e) => `拉正了 ${n} 个点${e ? `（${e} 条圆 / 弧整条平移）` : ""}`,
  none: "没有歪一点点的边（和轴差得多的不算歪，不碰）",
  skippedText: curvesSkipped,
  tally: true,
};

export const snap: Command = {
  id: "brep.snap",
  title: "吸到格点",
  defaults: () => ({ step: "grid", frame: "own", crease: "soft", curves: "rigid", straighten: false }),
  params: (ctx) => [
    { key: "step", def: { kind: "enum", label: "格子", values: ctx.snapStepChoices() } },
    frameField("组件转过、缩放过也照它自己的轴吸（同一组件的别的份不会离格）"),
    creaseField("吸歪的面折开处不画线、明暗连续"),
    { key: "curves", def: { kind: "enum", label: "圆 / 弧", values: [{ id: "rigid", label: "整条平移", hint: "圆心吸上格点，保持是圆" }, { id: "points", label: "逐点吸", hint: "每个点各自吸（小圆会吸歪）" }] } },
    { key: "straighten", def: { kind: "bool", label: `顺便拉正（和轴差 ${STRAIGHTEN_DEG}° 以内的边）` } },
  ],
  plan: (ctx, pool, v) => planBoth(ctx, pool, v, "snap"),
  done: (n, e) => `吸了 ${n} 个点到格点${e ? `（${e} 条圆 / 弧整条平移，保持是圆）` : ""}`,
  none: "都已经在格点上了",
  skippedText: curvesSkipped,
  tally: true,
};

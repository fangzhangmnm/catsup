// repairs/planar —— 修复「拍平」（纪元排期 T9 / 账本 DT7 + DT104）：规划在 plan.ts，这里 = 模块（参数 / 文案 / 菜单）+ 插件指令 "planar" 的执行。
// 2026-10-26 Claude Opus 5.5 从 editor.ts / ops.ts 搬成模块（user「做成可以扔的模块化的」）；老指令名 makePlanar 由 ops.ts 认成 "planar" 重放。
import type { EdgeId, FaceEvent } from "../../../kernel/kernel.ts";
import { PlanarBurst, faceKey, poolOf, registerOpPlugin, resolveEdge, resolveFace, type FaceKey } from "../../ops.ts";
import type { Command } from "../../commands/command.ts";
import { PLANAR_DEFAULTS, type PlanarTarget, planPlanar } from "./plan.ts";

interface PlanarArgs { faces: FaceKey[]; deg: number; target: PlanarTarget; eraseInner: boolean }

registerOpPlugin("planar", {
  apply(s, at, a0) {
    const a = a0 as unknown as PlanarArgs, { kernel } = poolOf(s, at);
    const scope = a.faces.length ? a.faces.map((f) => resolveFace(kernel, f)) : null;
    const plan = planPlanar(kernel, scope, { deg: a.deg, target: a.target, eraseInner: a.eraseInner });
    const events: FaceEvent[] = [];
    if (plan.moves.length) events.push(...kernel.moveVertices(plan.moves));
    if (plan.erase.length) {
      const ids: EdgeId[] = [];
      for (const e of plan.erase) { try { ids.push(resolveEdge(kernel, [e.a, e.b])); } catch { /* 挪点时已经被结算并掉了 */ } }
      if (ids.length) events.push(...kernel.eraseEdges([...new Set(ids)]));
    }
    if (events.some((e) => e.type === "BURST")) throw new PlanarBurst("拍平会让面破掉——算法没想到的情况，已整步撤回（请导出复现包）");
    return { scene: s, events };
  },
  describe: (a0) => { const a = a0 as unknown as PlanarArgs; return `faces=${a.faces.length || "all"} deg=${a.deg} ${a.target}${a.eraseInner ? " +erase" : ""}`; },
});

export const planar: Command = {
  id: "brep.planar",
  title: "拍平",
  defaults: (ctx) => ({ deg: ctx.sharpDeg(), target: PLANAR_DEFAULTS.target, eraseInner: PLANAR_DEFAULTS.eraseInner }),
  params: () => [
    { key: "deg", def: { kind: "number", label: "弯折小于", min: 0.5, max: 45, step: 0.5, unit: "°" } },
    { key: "target", def: { kind: "enum", label: "拍到", values: [{ id: "mode", label: "众数平面", hint: "组里已经落在同一平面上的点最多的那张" }, { id: "median", label: "中位数", hint: "每个点到平面距离的中位数" }, { id: "mean", label: "平均数", hint: "最小二乘" }] } },
    { key: "eraseInner", def: { kind: "bool", label: "擦内线" } },
  ],
  plan(ctx, { at, sel }, v) {
    const k = ctx.scene.kernelOf(at);
    const faces = sel ? [...sel.faces].filter((f) => k.face(f)) : null;
    if (sel && !faces!.length) return { ops: [], count: 0 };
    const o = { deg: Number(v.deg) || PLANAR_DEFAULTS.deg, target: String(v.target ?? PLANAR_DEFAULTS.target) as PlanarTarget, eraseInner: v.eraseInner === undefined ? PLANAR_DEFAULTS.eraseInner : !!v.eraseInner };
    const plan = planPlanar(k, faces, o);
    if (!plan.groups.length) return { ops: [], count: 0, skipped: plan.curved };
    const args: PlanarArgs = { faces: faces ? faces.map((f) => faceKey(k, f)) : [], deg: o.deg, target: o.target, eraseInner: o.eraseInner };
    return { ops: [{ op: "plugin", name: "planar", at, args: args as unknown as Record<string, unknown> }], count: plan.groups.length, extra: o.eraseInner ? plan.erase.length : 0, skipped: plan.curved, erases: o.eraseInner ? plan.erase.length : 0 };
  },
  done: (n, e) => `拍平了 ${n} 组${e ? `，擦掉 ${e} 条内线` : ""}`,
  none: "没有要拍平的面（被弯折小于阈值的边分开、整片差不多平的面）",
  skippedText: (n, v) => `${n} 片是曲面（整片弯得超过 ${Number(v.deg) || PLANAR_DEFAULTS.deg}°，比如圆柱侧面），没拍`,
};

// objects/verbs.ts —— 物件层动词（一份实现，按单位种类路由，每个工作台自动都有、只能退订）。created 2026-10-28 by Claude Fable 5.1
// 设计稿 ai-docs/20261028-object-layer-and-clipboard-design.md §4.1 / §5（user 10-28 夜「不同物体类型的层级统一……让这个是对所有object都成立的」）。
// 以前这几条手写在 main.ts 的 HUD 表 + Editor 方法里、按**容器**的身体种类守门（炸开网格体 bug 的根，周账 F-126）；现在吃 ObjectUnit（摆着的一份），和容器是什么无关。
// 跨种类（炸开 / 合并）= ask：「转成 X 再炸 / 不做」，点了才带 cast（不静默转）。合并的目标 = env.pointedInstance()（右键点的那个 / 光标压着的那个）。
import type { Command, CommandEnv, ObjectUnit, Params } from "../commands/command.ts";
import type { Action, Family, Placement } from "../commands/action.ts";
import { bodyEmpty } from "../ops.ts";
import { invert } from "../../scene/xform.ts";

const kindName = (k: string): string => (k === "mesh" ? "网格体" : "硬表面体");
/** 这一份炸进 / 并进 hostDef 那一层要不要转种类。 */
const needsCast = (env: CommandEnv, u: ObjectUnit, hostDef: number): boolean => env.scene.kindOf(hostDef) !== u.body && !bodyEmpty(env.scene.def(u.def).body);
const askCast = (verb: string, what: string) => (env: CommandEnv, units: readonly ObjectUnit[], v: Params, hostDefOf: (u: ObjectUnit) => number | null) => {
  if (v.cast) return null;
  const need = units.filter((u) => { const h = hostDefOf(u); return h !== null && needsCast(env, u, h); });
  if (!need.length) return null;
  const h = hostDefOf(need[0])!, to = kindName(env.scene.kindOf(h));
  return { title: `${verb}：要转种类`, message: `${need.length} 个物件是另一种身体的几何，${what}要先转成${to}（和物件设置里的转换一样，会丢它那一种才有的东西）。转过去再${verb}吗？`, okLabel: `转成${to}再${verb}`, params: { cast: true } };
};

export const explode: Command<ObjectUnit> = {
  id: "object.explode", unit: "object", title: "炸开",
  defaults: () => ({ cast: false }), params: () => [],
  plan(env, u, v) {
    if (u.instance === null) return { ops: [], count: 0 };
    if (needsCast(env, u, u.at.def) && !v.cast) return { ops: [], count: 1, notes: [`「${u.name}」要先转成${kindName(env.scene.kindOf(u.at.def))}才能炸`] };
    return { ops: [{ op: "explode", at: u.at, instance: u.instance, ...(v.cast ? { cast: true } : {}) }], count: 1, notes: u.copies > 1 ? [`「${u.name}」别的 ${u.copies - 1} 份还在`] : [] };
  },
  ask: (env, units, v) => askCast("炸", "炸进这一层")(env, units, v, (u) => u.at.def),
  done: (n) => `炸开了 ${n} 个物件`, none: "炸开：先选中组 / 组件",
};
export const mergeInto: Command<ObjectUnit> = {
  id: "object.mergeInto", unit: "object", title: "合并",
  defaults: () => ({ cast: false }), params: () => [],
  plan(env, u, v) {
    const t = env.pointedInstance();
    if (t === null || u.instance === null || u.instance === t) return { ops: [], count: 0 };
    const T = env.scene.def(u.at.def).instances.get(t);
    if (!T) return { ops: [], count: 0 };
    if (env.scene.references(u.def, T.def)) return { ops: [], count: 0, skipped: 1, notes: [`「${u.name}」不能并进「${T.name ?? env.scene.def(T.def).name}」——它本身就是它（或含着它）`] };
    if (needsCast(env, u, T.def) && !v.cast) return { ops: [], count: 1, notes: [`「${u.name}」要先转成${kindName(env.scene.kindOf(T.def))}才能并进去`] };
    const copies = env.scene.instanceCount(T.def);
    return { ops: [{ op: "mergeObject", at: u.at, target: t, source: u.instance, ...(v.cast ? { cast: true } : {}) }], count: 1, selectObjects: [t], notes: [...(copies > 1 ? [`「${T.name ?? env.scene.def(T.def).name}」摆了 ${copies} 份，每份都变`] : []), ...(env.scene.kindOf(T.def) === "brep" ? ["贴着的面会粘住"] : [])] };
  },
  ask: (env, units, v) => askCast("并", "并进它")(env, units, v, (u) => { const t = env.pointedInstance(); const T = t === null ? undefined : env.scene.def(u.at.def).instances.get(t); return T && u.instance !== t ? T.def : null; }),
  done: (n) => `合并了 ${n} 个物件进你点的那个`, none: "合并：选两个以上的物件，右键点在要保留的那个上（或鼠标压着它按 Ctrl+J）",
};
export const makeUnique: Command<ObjectUnit> = {
  id: "object.makeUnique", unit: "object", title: "做成唯一", keepSelection: true,
  defaults: () => ({}), params: () => [],
  plan(_env, u) { return u.instance === null || u.copies < 2 ? { ops: [], count: 0 } : { ops: [{ op: "makeUnique", def: u.at.def, instance: u.instance }], count: 1 }; },
  done: (n) => `做成唯一了 ${n} 个物件：改它不再影响别的份`, none: "做成唯一：选中的物件本来就只摆了一份",
};
export const lock: Command<ObjectUnit> = {
  id: "object.lock", unit: "object", title: "锁定", keepSelection: true,
  defaults: () => ({}), params: () => [],
  plan(env, u) { const i = u.instance === null ? undefined : env.scene.def(u.at.def).instances.get(u.instance); return !i || i.locked ? { ops: [], count: 0 } : { ops: [{ op: "setLocked", at: u.at, instance: u.instance!, on: true }], count: 1 }; },
  done: (n) => `已锁定 ${n} 个：不能改、不能移、不能进入；仍可当推断参考`, none: "锁定：先选中组件（组不是物件，不能锁；要当参考就先建组件）",
};
export const unlock: Command<ObjectUnit> = {
  id: "object.unlock", unit: "object", title: "解锁", keepSelection: true, takesLocked: true,
  defaults: () => ({}), params: () => [],
  plan(env, u) { const i = u.instance === null ? undefined : env.scene.def(u.at.def).instances.get(u.instance); return !i || !i.locked ? { ops: [], count: 0 } : { ops: [{ op: "setLocked", at: u.at, instance: u.instance!, on: false }], count: 1 }; },
  done: (n) => `已解锁 ${n} 个`, none: "解锁：选中的物件没锁着",
};
export const hide: Command<ObjectUnit> = {
  id: "object.hide", unit: "object", title: "隐藏",
  defaults: () => ({}), params: () => [],
  plan(env, u) { const i = u.instance === null ? undefined : env.scene.def(u.at.def).instances.get(u.instance); return !i || i.hidden ? { ops: [], count: 0 } : { ops: [{ op: "setHidden", at: u.at, instance: u.instance!, on: true }], count: 1 }; },
  done: (n) => `藏起了 ${n} 个物件（Alt+H 全部显示）`, none: "隐藏：先选中物件",
};
export const applyScale: Command<ObjectUnit> = {
  id: "object.applyScale", unit: "object", title: "应用缩放", keepSelection: true,
  defaults: () => ({}), params: () => [],
  plan(_env, u) { const X = u.xf, scaled = u.instance !== null && [0, 1, 2].some((j) => Math.abs(Math.hypot(X[j], X[4 + j], X[8 + j]) - 1) > 1e-9); return scaled ? { ops: [{ op: "applyScale", def: u.at.def, instance: u.instance! }], count: 1 } : { ops: [], count: 0 }; },
  done: (n) => `已把缩放烘进 ${n} 个组件的几何（同一组件的别的份看起来没变）`, none: "应用缩放：选中的组件没有被缩放过",
};
void invert;

export const verbCommands: readonly Command[] = [explode, mergeInto, makeUnique, lock, unlock, hide, applyScale];
export const verbActions: readonly Action[] = [
  { id: "explode", commands: { object: "object.explode" }, icon: "explode-folder", label: () => "炸开" },
  { id: "mergeInto", commands: { object: "object.mergeInto" }, icon: "collection", label: (n) => `把其余 ${n} 个合并进这个` },
  { id: "makeUnique", commands: { object: "object.makeUnique" }, icon: "copy", label: () => "做成唯一" },
  { id: "lock", commands: { object: "object.lock" }, icon: "lock", label: () => "锁定" },
  { id: "unlock", commands: { object: "object.unlock" }, icon: "unlock", label: () => "解锁" },
  { id: "hide", commands: { object: "object.hide" }, icon: "visibility-hide", label: () => "隐藏" },
  { id: "applyScale", commands: { object: "object.applyScale" }, icon: "scale-uniform", label: () => "应用缩放" },
];
/** 子物件的右键 / 浮条菜单（objectMenu）。编辑动词在验证工作台退订（那里只看、走、量）；锁 / 藏哪都有。 */
export const verbPlacements: readonly Placement[] = [
  { action: "explode", where: "objectMenu", order: 10, except: ["verify"] },
  { action: "mergeInto", where: "objectMenu", order: 11, except: ["verify"] },
  { action: "makeUnique", where: "objectMenu", order: 12, except: ["verify"] },
  { action: "lock", where: "objectMenu", order: 20 },
  { action: "unlock", where: "objectMenu", order: 21 },
  { action: "hide", where: "objectMenu", order: 22 },
  { action: "applyScale", where: "objectMenu", order: 30, except: ["verify"] },
];
export const verbs: Family = { name: "object", commands: verbCommands, actions: verbActions, placements: verbPlacements };

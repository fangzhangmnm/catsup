// 物件层动词 = 注册表物件族一份实现（editor/objects/verbs.ts；设计稿 ai-docs/20261028-object-layer-and-clipboard-design.md §5；周账 F-126 的那一刀）。created 2026-10-28 by Claude Fable 5.1
// 守卫：① 七条动词都在物件族、都放在 objectMenu 面上、只准退订（except）不准白名单（modes）② main.ts 不再手写这几条（HUD 表里没有它们的 id）
// ③ 跨种类炸开 / 合并：不带 cast 规划不出 op 但 ask 会问、带 cast 出 op；同种直接出 op ④ 合并的目标 = env.pointedInstance()，源 = 目标时没事做、造环时跳过并说清
// ⑤ 解锁吃锁着的（takesLocked）、锁定只吃没锁的；做成唯一只对摆了多份的。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { commandById, placementsAt, allActions, checkRegistry } from "../src/editor/commands/registry.ts";
import type { CommandEnv, ObjectUnit, Command } from "../src/editor/commands/command.ts";
import { IDENTITY, type Xform } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const src = (p: string): string => fs.readFileSync(url.fileURLToPath(new URL(p, import.meta.url)), "utf8");

const VERBS = ["object.explode", "object.mergeInto", "object.makeUnique", "object.lock", "object.unlock", "object.hide", "object.applyScale"] as const;
const env = (s: Scene, pointed: number | null = null): CommandEnv => ({ scene: s, gridFineStep: () => 0.1, snapStepChoices: () => [], snapLattice: () => IDENTITY as Xform, sharpDeg: () => 20, pointedInstance: () => pointed, circleSegments: () => 16 });
/** 最外层 hostKind；里面两个盒子组件（A / B，各自定义），compKind 给 A。 */
function setup(hostKind: "brep" | "mesh", compKind: "brep" | "mesh"): { s: Scene; A: number; B: number } {
  const s = new Scene(sceneBox());
  const root = { def: s.root, group: null }, k = s.brep(s.root).kernel;
  applyOp(s, { op: "makeComponent", at: root, faces: k.faces().map((f) => k.faceRings3(f.id)!.outer), edges: [], name: "A" });
  const A = [...s.def(s.root).instances.values()][0];
  const Bdef = s.mintDef("B", s.def(A.def).body.kind === "brep" ? s.brep(A.def).kernel.clone() : k.clone());
  const B = s.mintInstance(s.root, null, Bdef.id, [1, 0, 0, 5, 0, 1, 0, 0, 0, 0, 1, 0]);
  if (compKind === "mesh") applyOp(s, { op: "castDefinition", def: A.def, to: "mesh" });
  if (hostKind === "mesh") applyOp(s, { op: "castDefinition", def: s.root, to: "mesh" });
  return { s, A: A.id, B: B.id };
}
const unit = (s: Scene, id: number): ObjectUnit => { const i = s.def(s.root).instances.get(id)!, d = s.def(i.def); return { kind: "object", at: { def: s.root, group: null }, instance: id, def: d.id, name: d.name, body: d.body.kind, copies: s.instanceCount(d.id), xf: i.xform }; };
const cmd = (id: string): Command<ObjectUnit> => commandById(id) as Command<ObjectUnit>;

describe("物件层动词 = 注册表物件族（一份实现、每个工作台自动都有、只能退订）", () => {
  it("七条都在物件族、都放在 objectMenu、没有 modes 白名单；注册表自洽", () => {
    eq(checkRegistry().join("\n"), "");
    for (const id of VERBS) assert(cmd(id)?.unit === "object", `${id} 不在物件族`);
    const acts = allActions().filter((a) => a.commands.object && VERBS.includes(a.commands.object as never));
    eq(acts.length, VERBS.length, "动作数");
    for (const a of acts) { const ps = placementsAt("objectMenu").filter((p) => p.action === a.id); assert(ps.length === 1, `${a.id} 不在 objectMenu 上`); assert(!ps[0].modes, `${a.id} 用了 modes 白名单`); }
    assert(placementsAt("objectMenu", "verify").every((p) => !["explode", "mergeInto", "makeUnique", "applyScale"].includes(p.action)), "验证工作台该退订编辑动词");
    assert(placementsAt("objectMenu", "verify").some((p) => p.action === "lock"), "锁 / 藏哪都有");
  });
  it("main.ts 不再手写这几条（HUD 表里没有 explode / lock / unlock / applyScale / mergeInto / makeUnique 的行；物件的藏走注册表）", () => {
    const main = src("../src/app/main.ts");
    for (const id of ["explode", "lock", "unlock", "applyScale", "mergeInto", "makeUnique", "hide"]) assert(!new RegExp(`\\{ id: "${id}", layer:`).test(main), `main.ts 还手写着 ${id}`);
    assert(/commandMenu\("objectMenu"\)/.test(main), "main.ts 没把 objectMenu 面画出来");
  });
  it("炸开：同种直接出 op；跨种类不带 cast = 没 op 但 ask 要问、带 cast = 出 op；空壳（没自己几何）不用问", () => {
    const same = setup("brep", "brep"), u0 = unit(same.s, same.A);
    eq(cmd("object.explode").plan(env(same.s), u0, { cast: false }).ops.length, 1);
    const x = setup("brep", "mesh"), u = unit(x.s, x.A);
    eq(cmd("object.explode").plan(env(x.s), u, { cast: false }).ops.length, 0);
    const q = cmd("object.explode").ask!(env(x.s), [u], { cast: false });
    assert(!!q && /转成硬表面体再炸/.test(q.okLabel) && q.params.cast === true, `该问：${JSON.stringify(q)}`);
    const r = cmd("object.explode").plan(env(x.s), u, { cast: true });
    eq(r.ops.length, 1); assert((r.ops[0] as { cast?: boolean }).cast === true);
    applyOp(x.s, r.ops[0]); eq(x.s.def(x.s.root).instances.size, 1);
    eq(cmd("object.explode").ask!(env(same.s), [u0], { cast: false }), null, "同种不问");
  });
  it("合并：目标 = pointedInstance；源 = 目标没事做；mergeObject op 把 A 并进 B、B 留下、做完选中 B；跨种类 ask；造环跳过说清", () => {
    const { s, A, B } = setup("brep", "brep");
    const c = cmd("object.mergeInto");
    eq(c.plan(env(s, B), unit(s, B), { cast: false }).count, 0, "目标自己没事做");
    const r = c.plan(env(s, B), unit(s, A), { cast: false });
    eq(r.ops.length, 1); eq(r.selectObjects?.join(), String(B));
    const fB = s.brep(s.def(s.root).instances.get(B)!.def).kernel.faces().length;
    applyOp(s, r.ops[0]);
    eq(s.def(s.root).instances.size, 1); assert(s.def(s.root).instances.has(B), "B 该留下");
    assert(s.brep(s.def(s.root).instances.get(B)!.def).kernel.faces().length > fB, "B 该多了面");
    eq(c.plan(env(s, null), unit(s, B), { cast: false }).count, 0, "没有目标 = 没事做");
    const x = setup("brep", "mesh");
    const q = c.ask!(env(x.s, x.B), [unit(x.s, x.A)], { cast: false });
    assert(!!q && /转成硬表面体再并/.test(q.okLabel), "跨种类该问");
    // 造环：把 A 的定义再摆进 B 里，然后想把 B 并进 A
    const y = setup("brep", "brep"), Adef = y.s.def(y.s.root).instances.get(y.A)!.def, Bdef = y.s.def(y.s.root).instances.get(y.B)!.def;
    y.s.mintInstance(Bdef, null, Adef, IDENTITY);
    const rr = c.plan(env(y.s, y.A), unit(y.s, y.B), { cast: false });
    eq(rr.ops.length, 0); assert((rr.notes ?? []).some((n) => /含着它/.test(n)), "该说清造环");
  });
  it("锁 / 解锁 / 做成唯一 / 应用缩放：按状态数、不按容器种类", () => {
    const { s, A } = setup("mesh", "mesh");   // 最外层是网格体也行（以前手写的那版在网格体里不露）
    const u = unit(s, A);
    eq(cmd("object.lock").plan(env(s), u, {}).ops.length, 1); eq(cmd("object.unlock").plan(env(s), u, {}).ops.length, 0);
    applyOp(s, { op: "setLocked", at: { def: s.root, group: null }, instance: A, on: true });
    assert(cmd("object.unlock").takesLocked === true, "解锁要能吃锁着的");
    eq(cmd("object.unlock").plan(env(s), unit(s, A), {}).ops.length, 1); eq(cmd("object.lock").plan(env(s), unit(s, A), {}).ops.length, 0);
    eq(cmd("object.hide").plan(env(s), unit(s, A), {}).ops.length, 1);
    eq(cmd("object.makeUnique").plan(env(s), unit(s, A), {}).ops.length, 0, "只摆了一份 = 没事做");
    s.mintInstance(s.root, null, s.def(s.root).instances.get(A)!.def, IDENTITY);
    eq(cmd("object.makeUnique").plan(env(s), unit(s, A), {}).ops.length, 1);
    eq(cmd("object.applyScale").plan(env(s), unit(s, A), {}).ops.length, 0, "没缩放过 = 没事做");
    applyOp(s, { op: "transformInstance", def: s.root, instance: A, xform: [2, 0, 0, 0, 0, 2, 0, 0, 0, 0, 2, 0] });
    eq(cmd("object.applyScale").plan(env(s), unit(s, A), {}).ops.length, 1);
  });
});

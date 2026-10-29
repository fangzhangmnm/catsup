// 注册表两道接缝（2026-10-27 夜，Claude Fable 5.1；注册表提案 §7.8）：
// ① 三种单位齐了（brep 池 / 网格体 / 摆着的一份实例）、动作 = 按单位种类的路由表、第一个路由型动作「挪」= brep.move / mesh.move / object.move 三条带类型的指令；
// ② meshMove op + 撤销的 mesh 记录（整表互换、自反、对象身份不变）；object 族 perDefinition 去重；守卫抓错路由。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { checkRegistry, actionById, routesOf, commandById, placementsAt } from "../src/editor/commands/registry.ts";
import type { CommandEnv, MeshUnit, ObjectUnit, PoolUnit } from "../src/editor/commands/command.ts";
import { brepMove, meshMove, objectMove } from "../src/editor/move/index.ts";
import { emptySelection, guidesOf } from "../src/editor/tools.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY, applyPt } from "../src/scene/xform.ts";
import { KINDS } from "../src/scene/kinds.ts";

const env = (s: Scene): CommandEnv => ({ scene: s, gridFineStep: () => 0.1, snapStepChoices: () => [], snapLattice: () => IDENTITY, sharpDeg: () => 20, pointedInstance: () => null, circleSegments: () => 24 });
/** 根池一个盒子 + 一个组件「盒」两份实例，其中组件已转成网格体。 */
function scene(): { s: Scene; def: number; insts: number[] } {
  const s = new Scene(sceneBox()), d = s.mintDef("盒", sceneBox());
  const a = s.mintInstance(s.root, null, d.id, IDENTITY), b = s.mintInstance(s.root, null, d.id, [1, 0, 0, 3, 0, 1, 0, 0, 0, 0, 1, 0]);
  const s2 = applyOp(s, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
  return { s: s2, def: d.id, insts: [a.id, b.id] };
}

describe("注册表接缝：三种单位 + 路由型动作「挪」", () => {
  it("守卫自洽；挪 = 一个动作三条指令，每条吃的正是路由表那种单位；今天只登记在 api / search 面", () => {
    eq(checkRegistry().join("\n"), "");
    const a = actionById("move")!;
    eq(routesOf(a).map((r) => `${r.kind}:${r.command.id}:${r.command.unit}`).join(" "), "brep:brep.move:brep mesh:mesh.move:mesh object:object.move:object");
    assert(placementsAt("api").some((p) => p.action === "move") && !placementsAt("contextBar").some((p) => p.action === "move"));
    assert(commandById("object.toMesh")!.perDefinition === true && !commandById("object.move")!.perDefinition, "转换按定义去重、挪按这一份");
  });
  it("brep.move：选区（一张膜 + 一个点）解成点集，op 按坐标寻址 from → from + d；零位移 = 没事做", () => {
    const s = new Scene(sceneBox()), k = s.kernelOf({ def: s.root, group: null });
    const sel = emptySelection("brep"); assert(sel.kind === "brep");
    const f = k.faces()[0], v = k.vertices().find((x) => !k.face(f.id)!.outer.vids.includes(x.id))!;
    sel.faces.add(f.id); sel.verts.add(v.id);
    const u: PoolUnit = { kind: "brep", at: { def: s.root, group: null }, sel, xf: IDENTITY };
    eq(brepMove.plan(env(s), u, { dx: 0, dy: 0, dz: 0 }).count, 0);
    const r = brepMove.plan(env(s), u, { dx: 0, dy: 0, dz: 0.5 });
    eq(r.count, 5); eq(r.ops.length, 1); eq(r.ops[0].op, "move");
    const op = r.ops[0] as { op: "move"; moves: { from: { z: number }; to: { z: number } }[] };
    assert(op.moves.every((m) => Math.abs(m.to.z - m.from.z - 0.5) < 1e-12));
    const moved = new Set([...k.face(f.id)!.outer.vids, v.id]), want = k.vertices().map((x) => +(x.z + (moved.has(x.id) ? 0.5 : 0)).toFixed(6)).sort().join(",");
    const after = applyOp(s.clone(), r.ops[0]).scene.kernelOf({ def: s.root, group: null });
    eq(after.vertices().map((x) => +x.z.toFixed(6)).sort().join(","), want, "那张膜的环 + 那个点各升 0.5；其余不动");
    assert(after.faces().length >= 6, "过了结算机：拉歪的侧面自动折出折缝（K3），膜数只多不少");
  });
  it("mesh.move：按 id 寻址写位置数组；meshMove op 只认网格体定义（SU 体 = 目标缺席）", () => {
    const { s, def } = scene(), m = s.mesh(def).kernel;
    const sel = emptySelection("mesh"); assert(sel.kind === "mesh"); sel.faces.add(m.faces()[0]);
    const u: MeshUnit = { kind: "mesh", def, sel, xf: IDENTITY };
    const r = meshMove.plan(env(s), u, { dx: 1, dy: 0, dz: 0 });
    eq(r.count, 4); eq(r.ops[0].op, "meshMove");
    const before = m.faceVerts(m.faces()[0]).map((v) => m.pt(v).x);
    const s2 = applyOp(s, r.ops[0]).scene, m2 = s2.mesh(def).kernel;
    eq(m2.faceVerts(m2.faces()[0]).map((v) => m2.pt(v).x).join(","), before.map((x) => x + 1).join(","));
    let threw = "";
    try { applyOp(s, { op: "meshMove", def: s.root, moves: [] }); } catch (e) { threw = (e as Error).name; }
    eq(threw, "OpTargetError");
    eq(guidesOf(sel).size, 0, "mesh 选区没有参考几何");
  });
  it("object.move：这一份实例的矩阵左乘平移；两份同定义各挪各的（不去重）", () => {
    const { s, def, insts } = scene();
    const u = (i: number): ObjectUnit => ({ kind: "object", at: { def: s.root, group: null }, instance: i, def, name: "盒", body: "mesh", copies: 2, xf: s.instance(s.root, i).xform });
    const r = objectMove.plan(env(s), u(insts[1]), { dx: 0, dy: 2, dz: 0 });
    eq(r.ops[0].op, "transformInstance");
    const s2 = applyOp(s, r.ops[0]).scene;
    eq(JSON.stringify(applyPt(s2.instance(s2.root, insts[1]).xform, { x: 0, y: 0, z: 0 })), JSON.stringify({ x: 3, y: 2, z: 0 }));
    eq(JSON.stringify(applyPt(s2.instance(s2.root, insts[0]).xform, { x: 0, y: 0, z: 0 })), JSON.stringify({ x: 0, y: 0, z: 0 }), "另一份没动");
  });
  it("撤销的 mesh 记录：提交 = 影子换真身（对象身份不变）；撤 / 重做 = 整表互换、逐字回去；骨架记录接回内核", () => {
    const { s, def } = scene(), h = new History(s), truth = s.mesh(def).kernel, v0 = truth.verts()[0], p0 = truth.pt(v0);
    const canon = (k: typeof truth): string => JSON.stringify({ v: k.verts().map((v) => [v, k.pt(v)]), f: k.faces().map((f) => k.faceVerts(f)), rev: k.rev });
    const c0 = canon(truth);
    const r = h.commit(s, { op: "meshMove", def, moves: [{ v: v0, to: { x: p0.x + 1, y: p0.y, z: p0.z } }] });
    assert(r.scene.mesh(def).kernel === truth, "真身对象不变");
    const c1 = canon(truth); assert(c1 !== c0); eq(truth.pt(v0).x, p0.x + 1);
    const u = h.undo()!; eq(canon(u.scene.mesh(def).kernel), c0); assert(u.scene.mesh(def).kernel === truth, "撤回来还是同一个对象");
    const d = h.redo(u.scene)!; eq(canon(d.scene.mesh(def).kernel), c1);
    assert(h.usageBytes() > 0 && h.usageBytes() < 20_000, `记录字节 ${h.usageBytes()}：一个盒子的网格表`);
    eq(h.replay().mesh(def).kernel.pt(v0).x, p0.x + 1, "指令流全量重放 = 同一结果");
  });
  it("种类登记：网格体登记了自由建模工作台；SU 体没有", () => {
    eq(KINDS.mesh.modes.join(","), "freeform"); eq(KINDS.brep.modes.includes("freeform" as never), false);
  });
});

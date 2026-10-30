// 资源清点（0.18 I10 第一版；src/scene/resources.ts + ops.ts purgeDefs）。created 2026-10-30 by Claude Opus 5.5
// user 10-30「我们没有一个中心化的按引用计数的东西吗？学blender」「反正就是要么被引用要么被素材库引用。和blender的逻辑一样」「无人使用的材质会悄悄残留」。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp, OpTargetError } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { census, liveDefs, orphanDefs } from "../src/scene/resources.ts";
import { sceneBox } from "./format-scenes.ts";

/** 根里摆着组件「桌」；孤儿「旧椅」（一份都没摆）；孤儿「箱」里摆着「锁」（锁只在箱里用）。「桌」的顶面涂红；「箱」的面涂蓝。 */
function world(): { s: Scene; desk: number; chair: number; box: number; lock: number; red: number; blue: number } {
  const s = new Scene(sceneBox(1, 1)), root = { def: s.root, group: null }, k = s.brep(s.root).kernel;
  applyOp(s, { op: "makeComponent", at: root, faces: k.faces().map((f) => k.faceRings3(f.id)!.outer), edges: [], name: "桌" });
  const desk = [...s.def(s.root).instances.values()][0].def;
  const chair = s.mintDef("旧椅", sceneBox(1, 1)).id, box = s.mintDef("箱", sceneBox(2, 1)).id, lock = s.mintDef("锁", sceneBox(1, 1)).id;
  s.mintInstance(box, null, lock, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
  applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] }); applyOp(s, { op: "addMaterial", name: "蓝", color: [0, 0, 1] });
  const dk = s.brep(desk).kernel, top = dk.faces().find((f) => dk.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - 1) < 1e-9))!;
  applyOp(s, { op: "paintFaces", at: { def: desk, group: null }, faces: [dk.faceRings3(top.id)!.outer], material: 0 });
  const bk = s.brep(box).kernel;
  applyOp(s, { op: "paintFaces", at: { def: box, group: null }, faces: bk.faces().map((f) => bk.faceRings3(f.id)!.outer), material: 1 });
  return { s, desk, chair, box, lock, red: 0, blue: 1 };
}

describe("资源清点（I10）：活着 = 从模型根够得着", () => {
  it("孤儿链：没摆的是孤儿；孤儿里摆着的也是孤儿；谁摆着谁列得出来", () => {
    const w = world(), c = census(w.s), by = (id: number) => c.defs.find((d) => d.def === id)!;
    assert(by(w.desk).live && !by(w.chair).live && !by(w.box).live && !by(w.lock).live, JSON.stringify(c.defs.map((d) => [d.name, d.live])));
    eq(by(w.desk).users.length, 1); eq(by(w.desk).placed, 1); eq(by(w.lock).placed, 0, "只摆在孤儿箱里 = 模型里 0 份"); eq(by(w.lock).users[0].in, w.box, "锁被箱摆着（箱是孤儿 → 锁也是）");
    eq(orphanDefs(c).sort().join(","), [w.chair, w.box, w.lock].sort().join(","));
    assert(!c.defs.some((d) => d.def === w.s.root), "模型根不列");
  });
  it("材质只数活着的组件里的面：红 = 桌顶一面两侧；蓝只涂在孤儿箱上 = 0", () => {
    const w = world(), c = census(w.s);
    eq(c.materials[w.red].faces, 2, "一面两侧各算一次（paintFaces 不给 sides = 两侧都涂）");
    eq(c.materials[w.blue].faces, 0, "孤儿用着不算");
  });
  it("清理没人用的组件：只删孤儿；单子里混了活的 = 整条拒绝、一个不删；撤销一步回来", () => {
    const w = world(), n0 = w.s.defs.size;
    let err: unknown = null;
    try { applyOp(w.s.clone(), { op: "purgeDefs", defs: [w.chair, w.desk] }); } catch (e) { err = e; }
    assert(err instanceof OpTargetError, `混了活的该拒绝：${String(err)}`);
    const h = new History(w.s.clone());
    let s = h.commit(w.s.clone(), { op: "purgeDefs", defs: orphanDefs(census(w.s)) }).scene;
    eq(s.defs.size, n0 - 3); assert(s.defs.has(w.desk) && liveDefs(s).has(w.desk), "桌还在");
    s = h.undo()!.scene;
    eq(s.defs.size, n0, "撤销 = 三个孤儿都回来");
  });
});

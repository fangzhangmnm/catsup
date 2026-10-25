// 锁定（A27，SU Lock；user 2026-10-24 立面图思考题「用brep画立面图，然后锁住，推到旁边做拉几何的对齐参考，你要能接住，而不是把立面图搞坏」）。
// 对象层属性：setLocked op（可撤销）、祖先 group 锁 → 子池锁、实例锁、文件往返只在 true 时写、clone 保留。推断照吃 = WorldView 不看锁（这里验证槽数不变）。
// created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp, faceKey } from "../src/editor/ops.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { decodeGlb } from "../src/format/glb.ts";
import { sceneBox } from "./format-scenes.ts";
import { translation } from "../src/scene/xform.ts";

const rootAt = (s: Scene) => ({ def: s.root, group: null });
const topFace = (k: Kernel, z: number): number => k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => Math.abs(p.z - z) < 1e-9))!.id;

describe("lock: 对象层锁定", () => {
  it("0.14：组不是物体、不能锁（setLocked 带 group 被拒、poolLocked 对组永远 false）；实例锁 pickLocked；clone 保留；锁住的照样进推断世界", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = s.brep(s.root).kernel;
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const outer = [...s.brep(s.root).groups.values()][0];
    const inner = s.mintGroup(s.root, outer.id, new Kernel(), outer.axes);
    assert(!s.poolLocked({ def: s.root, group: outer.id }) && !s.poolLocked({ def: s.root, group: inner.id }), "组没有锁");
    let threw = false; try { applyOp(s, { op: "setLocked", at: rootAt(s), group: outer.id, on: true }); } catch { threw = true; } assert(threw, "组锁被拒（user 10-24「组永远不进hierarchy」）");
    assert(!s.poolLocked({ def: s.root, group: outer.id }), "拒了就没锁");
    // 实例
    const def = s.mintDef("part", sceneBox(1, 1));
    const inst = s.mintInstance(s.root, null, def.id, translation({ x: 5, y: 0, z: 0 }));
    assert(!s.pickLocked(s.root, { kind: "instance", instance: inst.id }));
    s = applyOp(s, { op: "setLocked", at: rootAt(s), instance: inst.id, on: true }).scene;
    assert(s.pickLocked(s.root, { kind: "instance", instance: inst.id }), "实例锁了");
    const c = s.clone();
    assert(c.pickLocked(c.root, { kind: "instance", instance: inst.id }), "clone 保留锁");
    const view = new WorldView(s, ROOT_CONTEXT);
    eq(view.slots.length, 4, "锁住的照样进推断世界（根 + 外组 + 子组 + 实例）");
    threw = false; try { applyOp(s, { op: "setLocked", at: rootAt(s), instance: 999, on: true }); } catch { threw = true; } assert(threw, "不存在的目标抛");
  });
  it("文件往返：locked 只在 true 时写；读回实例的锁在；组永远不写 locked", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = s.brep(s.root).kernel;
    s = applyOp(s, { op: "makeGroup", at: rootAt(s), faces: [faceKey(k, topFace(k, 1.5))], edges: [] }).scene;
    const def = s.mintDef("part", sceneBox(1, 1));
    const inst = s.mintInstance(s.root, null, def.id, translation({ x: 5, y: 0, z: 0 }));
    const plain = decodeGlb(writeCatsup(documentFromScene(s, "t"))) as { json: { extensions: { CATSUP_definitions: { list: { groups: Record<string, unknown>[]; instances: Record<string, unknown>[] }[] } } } };
    assert(plain.json.extensions.CATSUP_definitions.list.every((d) => d.groups.every((x) => !("locked" in x)) && d.instances.every((x) => !("locked" in x))), "没锁不写键");
    s = applyOp(s, { op: "setLocked", at: rootAt(s), instance: inst.id, on: true }).scene;
    const s2 = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(s, "t"))));
    assert(s2.pickLocked(s2.root, { kind: "instance", instance: inst.id }), "实例锁往返");
  });
});

// DT14 移动复制的预演：原件不动、副本槽只渲染不吸附（user 2026-10-25「move 复制的时候没有预览」「会不会自己卡住自己」）。
// created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView, slotKey } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });

describe("DT14 复制预演：副本槽", () => {
  it("命中的池多一个副本槽：在手里待遇（不进推断世界）、key 不撞、变换叠上去；原槽照常", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "盒" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    const plain = new WorldView(s, ROOT_CONTEXT);
    const view = new WorldView(s, ROOT_CONTEXT, null, undefined, { copies: [{ match: (pool) => pool.def === defId, xform: translation(P(5, 0, 0)) }] });
    const ghosts = view.slots.filter((sl) => sl.ghost);
    eq(ghosts.length, 1, "一个副本槽");
    eq(view.slots.length, plain.slots.length + 1);
    const g = ghosts[0], orig = view.slots.find((sl) => !sl.ghost && sl.pool.def === defId)!;
    assert(g.overridden && !g.active, "在手里待遇");
    eq(view.faces().length, plain.faces().length, "副本不进推断世界（世界面数不变）");
    assert(slotKey(g) !== slotKey(orig), "渲染 key 不撞");
    eq(g.xform[3] - orig.xform[3], 5, "副本 = 原件再平移 5");
    assert(!orig.overridden, "原件照常（可吸、可遮）");
  });
});

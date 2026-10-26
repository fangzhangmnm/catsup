// 只看这个（DT44，user 2026-10-25「然后左上角的hierarchy tree可以切换只看该组件」）：进了组 / 组件时，外面的槽整个不进合成视图（不画、不吸、点不中）。
// created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView, insideContext } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation } from "../src/scene/xform.ts";
import { sceneBox } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const rect = (x0: number): [Pt3, Pt3][] => [[P(x0, 0), P(x0 + 1, 0)], [P(x0 + 1, 0), P(x0 + 1, 1)], [P(x0 + 1, 1), P(x0, 1)], [P(x0, 1), P(x0, 0)]];

/** 根：组件「盒」两份（I1 在原处、I2 挪 5）+ 一个组 G（里面又放了一份盒 I3）。 */
function setup() {
  let s = new Scene(sceneBox(1, 1));
  const R = { def: s.root, group: null };
  const k = s.kernelOf(R);
  s = applyOp(s, { op: "makeComponent", at: R, faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "盒" }).scene;
  const D = [...s.defs.keys()].find((id) => id !== s.root)!;
  s = applyOp(s, { op: "placeInstance", at: R, definition: D, xform: translation(P(5, 0, 0)) }).scene;
  s = applyOp(s, { op: "addEdges", at: R, segs: rect(10) }).scene;
  const k2 = s.kernelOf(R);
  s = applyOp(s, { op: "makeGroup", at: R, faces: k2.faces().map((f) => faceKey(k2, f.id)), edges: k2.edges().map((e) => edgeKey(k2, e.id)) }).scene;
  const G = [...s.brep(s.root).groups.keys()][0];
  s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: G }, definition: D, xform: translation(P(10, 0, 2)) }).scene;
  const [I1, I2, I3] = [...s.def(s.root).instances.values()].map((i) => i.id);
  return { s, D, G, I1, I2, I3 };
}
const names = (v: WorldView): string => v.slots.map((sl) => `${sl.chain.join("/") || "-"}:${sl.pool.group ?? "r"}`).sort().join(" ");

describe("DT44 只看这个", () => {
  it("在组件里：只剩这一份的池；另一份、根、组都不进来（不吸、不画）", () => {
    const { s, I1 } = setup();
    const ctx = { chain: [I1], group: null };
    const all = new WorldView(s, ctx), iso = new WorldView(s, ctx, null, undefined, { isolate: true });
    assert(all.slots.length > iso.slots.length, "外面的少了");
    eq(names(iso), `${I1}:r`);
    eq(iso.activeSlot().chain.join("/"), String(I1), "活动池还在");
    assert(iso.faces().length < all.faces().length, "推断世界跟着少");
  });
  it("在组里：组本身 + 放在组里的实例；组外的两份盒和根不进来", () => {
    const { s, G, I3 } = setup();
    const ctx = { chain: [], group: G };
    eq(names(new WorldView(s, ctx, null, undefined, { isolate: true })), `-:${G} ${I3}:r`);
    assert(insideContext(s, ctx, { def: s.root, group: G }, []), "组自己");
    assert(!insideContext(s, ctx, { def: s.root, group: null }, []), "根不算");
  });
  it("根上：开了也全都在（没有外面）", () => {
    const { s } = setup();
    eq(names(new WorldView(s, ROOT_CONTEXT, null, undefined, { isolate: true })), names(new WorldView(s, ROOT_CONTEXT)));
  });
});

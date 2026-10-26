// DT14 移动复制的预演：原件不动、副本槽只渲染不吸附（user 2026-10-25「move 复制的时候没有预览」「会不会自己卡住自己」）。
// created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene, ROOT_CONTEXT } from "../src/scene/scene.ts";
import { WorldView, slotKey } from "../src/scene/world-view.ts";
import { applyOp, faceKey, edgeKey } from "../src/editor/ops.ts";
import { translation, WORLD_FRAME, rotationAbout, compose } from "../src/scene/xform.ts";
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

describe("DT13 编辑组件时其他实例实时跟：孪生槽", () => {
  it("在第一份里编辑（有预演内核）：第二份也用预演内核画、在手里（不进推断世界）；没手势时一切照旧", () => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "盒" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: defId, xform: translation(P(5, 0, 0)) }).scene;
    const [i1, i2] = [...s.def(s.root).instances.values()].map((i) => i.id);
    const ctx = { chain: [i1], group: null };
    const live = s.kernelOf({ def: defId, group: null }).clone();
    const still = new WorldView(s, ctx);
    const twin0 = still.slots.find((sl) => sl.chain.length === 1 && sl.chain[0] === i2)!;
    assert(!twin0.overridden && twin0.kernel !== live, "没手势：第二份照旧");
    const view = new WorldView(s, ctx, live);
    const act = view.activeSlot(), twin = view.slots.find((sl) => sl.chain.length === 1 && sl.chain[0] === i2)!;
    assert(act.kernel === live, "当前那份用预演内核");
    assert(twin.kernel === live, "第二份也用预演内核画");
    assert(twin.overridden && !twin.active, "第二份在手里（不吸、不遮）");
    eq([...view.slotFaces(twin.index)].length, 0, "第二份不进推断世界");
  });
});

describe("组件换轴：几何反向挪、每份实例补变换（user 2026-10-25「需要每个instance都移动」）", () => {
  const worldVerts = (s: Scene): string[] => new WorldView(s, ROOT_CONTEXT).vertices().map((v) => `${v.x.toFixed(6)},${v.y.toFixed(6)},${v.z.toFixed(6)}`).sort();
  const setup = (): { s: Scene; defId: number } => {
    let s = new Scene(sceneBox(2, 1.5));
    const k = s.kernelOf({ def: s.root, group: null });
    s = applyOp(s, { op: "makeComponent", at: { def: s.root, group: null }, faces: k.faces().map((f) => faceKey(k, f.id)), edges: k.edges().map((e) => edgeKey(k, e.id)), name: "盒" }).scene;
    const defId = [...s.defs.keys()].find((id) => id !== s.root)!;
    s = applyOp(s, { op: "placeInstance", at: { def: s.root, group: null }, definition: defId, xform: compose(translation(P(5, 0, 0)), rotationAbout(P(0, 0, 0), P(0, 0, 1), Math.PI / 2)) }).scene;
    return { s, defId };
  };
  it("只换原点：世界里一点不动；定义里的几何平移了 −原点；两份实例的原点都落到新位置", () => {
    const { s: s0, defId } = setup();
    const before = worldVerts(s0);
    const s = applyOp(s0, { op: "setAxes", at: { def: defId, group: null }, frame: { ...WORLD_FRAME, origin: P(1, 1, 0) } }).scene;
    eq(JSON.stringify(worldVerts(s)), JSON.stringify(before), "世界几何不变");
    const k = s.kernelOf({ def: defId, group: null });
    assert(k.vertices().some((v) => Math.abs(v.x + 1) < 1e-9 && Math.abs(v.y + 1) < 1e-9), "定义里有 (−1,−1,·) 的角 = 原角 (0,0) 平移 −(1,1)");
    const [a, b] = [...s.def(s.root).instances.values()];
    eq(+a.xform[3].toFixed(6), 1, "第一份原点 x = 1"); eq(+a.xform[7].toFixed(6), 1);
    eq(+b.xform[3].toFixed(6), 4, "第二份（转了 90°）原点 = (5,0)+R(1,1) = (4,1)"); eq(+b.xform[7].toFixed(6), 1);
  });
  it("换朝向（转 30°）：世界里仍一点不动", () => {
    const { s: s0, defId } = setup();
    const before = worldVerts(s0);
    const c = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6);
    const s = applyOp(s0, { op: "setAxes", at: { def: defId, group: null }, frame: { origin: P(0.5, 0, 0), x: P(c, sn, 0), y: P(-sn, c, 0), z: P(0, 0, 1) } }).scene;
    const after = worldVerts(s);
    eq(after.length, before.length);
    const d = after.map((q, i) => { const [x1, y1, z1] = q.split(",").map(Number), [x0, y0, z0] = before[i].split(",").map(Number); return Math.hypot(x1 - x0, y1 - y0, z1 - z0); });
    assert(Math.max(...d) < 5e-6, `世界几何不变（≤ 5 µm）：最大偏差 ${Math.max(...d)}`);
  });
});


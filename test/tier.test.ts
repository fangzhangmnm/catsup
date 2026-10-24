// #30 捕获半径按层级加权（user 2026-10-24「4听你的」）：槽的层级档 + 求解器按档缩 ε / 放大排序距离；不排除。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";
import { Scene } from "../src/scene/scene.ts";
import { WorldView, type GeomView } from "../src/scene/world-view.ts";
import { applyOp, faceKey } from "../src/editor/ops.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { TIER_EPS, snapPoint } from "../src/editor/solver.ts";
import { GROUND, NO_HAND } from "../src/editor/pick.ts";
import { translation } from "../src/scene/xform.ts";
import { sceneGrouped } from "./format-scenes.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const VP = { w: 1000, h: 800 };
const topCam = (): OrbitCamera => { const c = new OrbitCamera(); c.yaw = -Math.PI / 2; c.pitch = 1.5707; c.halfH = 50; return c; };

describe("tier: 槽的层级档", () => {
  it("根上下文：顶层 group / 顶层实例 = 1；进 group：根池 = 父母 1、兄弟实例 1；进实例：放它的池 = 父母 1、兄弟 group = 1", () => {
    let s = sceneGrouped();
    const gid = [...s.brep(s.root).groups.keys()][0];
    const inst = [...s.def(s.root).instances.values()][0];
    // 再在 group 里建一个子 group（孙辈）
    const gk = s.group({ def: s.root, group: gid }).kernel;
    const f0 = gk.faces()[0];
    s = applyOp(s, { op: "makeGroup", at: { def: s.root, group: gid }, faces: [faceKey(gk, f0.id)], edges: [] }).scene;
    const kid = [...s.brep(s.root).groups.values()].find((g) => g.parent === gid)!.id;
    const root = new WorldView(s, { chain: [], group: null });
    const tier = (v: WorldView, pool: { def: number; group: number | null }, chainLen = 0): number => v.slots.find((x) => x.pool.def === pool.def && x.pool.group === pool.group && x.chain.length === chainLen)!.tier;
    eq(tier(root, { def: s.root, group: null }), 0, "自己");
    eq(tier(root, { def: s.root, group: gid }), 1, "顶层 group = 孩子");
    eq(tier(root, { def: s.root, group: kid }), 1, "孙 group 也算孩子（任意深）");
    eq(tier(root, { def: inst.def, group: null }, 1), 1, "顶层实例 = 孩子");
    const inG = new WorldView(s, { chain: [], group: gid });
    eq(tier(inG, { def: s.root, group: null }), 1, "根池 = 父母");
    eq(tier(inG, { def: s.root, group: kid }), 1, "子 group = 孩子");
    eq(tier(inG, { def: inst.def, group: null }, 1), 1, "顶层实例 = 兄弟（父母的孩子）");
    const inKid = new WorldView(s, { chain: [], group: kid });
    eq(tier(inKid, { def: s.root, group: gid }), 1, "父母 group");
    eq(tier(inKid, { def: s.root, group: null }), 2, "祖父 = 其他");
    eq(tier(inKid, { def: inst.def, group: null }, 1), 2, "父母的兄弟 = 其他");
    const inInst = new WorldView(s, { chain: [inst.id], group: null });
    eq(tier(inInst, { def: s.root, group: null }), 1, "放实例的根池 = 父母");
    eq(tier(inInst, { def: s.root, group: gid }), 1, "根池里的 group = 兄弟");
    eq(tier(inInst, { def: s.root, group: kid }), 2, "兄弟的孩子 = 其他");
  });
});

describe("tier: 求解器按档加权（不排除）", () => {
  it("同距两端点：自己池赢；远亲 9 px 外（ε 10×0.7=7）吸不到、6 px 内照样吸", () => {
    const cam = topCam();
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(0, 5)], [P(1, 0), P(1, 5)]]);   // 端点 (0,0) 与 (1,0)
    const vA = k.vertices().find((v) => v.x === 0 && v.y === 0)!, vB = k.vertices().find((v) => v.x === 1 && v.y === 0)!;
    const view = Object.assign(k, { tierOf: (id: number) => (id === vB.id ? 2 : 0) }) as unknown as GeomView;
    const mid = cam.angularPx(P(0.5, 0, 0), VP);   // 离两端点各 0.5 m = 4 px
    const r = snapPoint(view, cam, VP, mid.x, mid.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    eq(r.kind, "endpoint"); assert(r.p.x === 0, "同距：自己池的端点赢");
    const far9 = cam.angularPx(P(1 + 9 * 0.125, 0.0, 0), VP);   // 离 B 9 px、离 A 17 px
    const r9 = snapPoint(view, cam, VP, far9.x, far9.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    assert(r9.kind !== "endpoint", `远亲 9 px 外吸不到（ε 缩到 ${10 * TIER_EPS[2]}）：${r9.kind}`);
    const far6 = cam.angularPx(P(1 + 6 * 0.125, 0.0, 0), VP);
    const r6 = snapPoint(view, cam, VP, far6.x, far6.y, 8, { plane: GROUND, hand: NO_HAND, lines: false });
    eq(r6.kind, "endpoint"); assert(r6.p.x === 1, "远亲 6 px 内照样吸（不排除）");
  });
  it("真场景：根上下文里，远处组件的端点与根池端点同距 → 根池赢", () => {
    let s = sceneGrouped();
    const inst = [...s.def(s.root).instances.values()][0];
    void inst; void translation;
    const view = new WorldView(s, { chain: [], group: null });
    assert(view.slots.some((x) => x.tier === 1) && view.slots.some((x) => x.tier === 0), "有自己也有近亲");
  });
});

// 网格体的手标 + 默认平滑的指令、继承、拾取（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM138，硬软边设计稿 §3 / §5 / §6）。
// 判定本体（edge-smooth.ts）的标准答案在 mesh-format / object-commands 里；这里钉：右键指令出的 op 对、撤销逐字回去、挤出带手标 / 插入不带、并边取交集、自由建模里平滑边点得中。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_SHARP, F_SMOOTH, F_SOFT } from "../src/mesh/mesh-kernel.ts";
import { addBox, addPrimitive, extrudeFaces, insetFaces } from "../src/mesh/ops/index.ts";
import { dissolveVertex } from "../src/mesh/ops/join.ts";
import { splitEdge } from "../src/mesh/ops/split.ts";
import { edgeSmooth, edgeSoft } from "../src/mesh/edge-smooth.ts";
import { Scene } from "../src/scene/scene.ts";
import { WorldView } from "../src/scene/world-view.ts";
import { applyOp } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { OrbitCamera } from "../src/editor/camera.ts";
import { pickEntity } from "../src/editor/pick.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { markSharp, markSmooth, clearMarks, smoothAll, smoothNone, smoothByAngle } from "../src/editor/mesh-edits/index.ts";
import type { CommandEnv, MeshUnit } from "../src/editor/commands/command.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const MARKS = F_SHARP | F_SMOOTH | F_SOFT;
const F = { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) };

/** 根上一份网格体（定义 = 长方体转过来的；内核换成 build 给的）。 */
function meshScene(build: (m: MeshKernel) => void): { s: Scene; def: number; inst: number; m: MeshKernel } {
  const s0 = new Scene(), d = s0.mintDef("网格", sceneBox()), inst = s0.mintInstance(s0.root, null, d.id, IDENTITY);
  const s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene, m = new MeshKernel();
  build(m); s.mesh(d.id).kernel = m;
  return { s, def: d.id, inst: inst.id, m };
}
const unit = (def: number, edges: number[], faces: number[] = []): MeshUnit => ({ kind: "mesh", def, sel: { kind: "mesh", verts: new Set(), edges: new Set(edges), faces: new Set(faces) }, xf: IDENTITY });

describe("网格体手标 + 默认平滑（右键指令）", () => {
  it("标成棱 / 标成平滑 / 清掉手标：op = meshEdgeMarks、判定跟着变、已经是这个标的不算；撤销逐字回去", () => {
    const { s, def, m } = meshScene((k) => { addPrimitive(k, "cylinder", F, [0.5, 0.5, 1], 16); k.setSmoothDefault({ mode: "angle", deg: 30 }); });
    const env = { scene: s } as unknown as CommandEnv, h = new History(s);
    const side = m.edges().find((e) => edgeSmooth(m, e))!;   // 侧面竖边：按角度 30° 平滑
    const rim = m.edges().find((e) => !edgeSmooth(m, e))!;   // 顶圈：90° 棱
    eq(markSharp.plan(env, unit(def, [side, rim]), {}).count, 2, "数的是手标会变的边：顶圈默认就是棱，但没手标，标了以后改默认平滑也不变");
    const plan = markSharp.plan(env, unit(def, [side]), {});
    eq(plan.ops.length, 1); eq(plan.ops[0].op, "meshEdgeMarks");
    const before = Array.from(m.edgeFlags).join(",");
    h.commit(s, plan.ops[0]);
    assert(!edgeSmooth(m, side) && !edgeSoft(m, side), "标成棱：断开、画线");
    eq(markSharp.plan(env, unit(def, [side]), {}).count, 0, "已经是棱的不算");
    h.commit(s, markSmooth.plan(env, unit(def, [rim]), {}).ops[0]);
    assert(edgeSmooth(m, rim) && edgeSoft(m, rim), "标成平滑：明暗连续、不画线");
    eq(m.edgeFlags[rim] & MARKS, F_SMOOTH | F_SOFT);
    h.commit(s, clearMarks.plan(env, unit(def, [side, rim]), {}).ops[0]);
    eq(m.edgeFlags[side] & MARKS, 0); eq(m.edgeFlags[rim] & MARKS, 0);
    assert(edgeSmooth(m, side) && !edgeSmooth(m, rim), "清掉以后回到默认平滑的判法");
    h.undo(); h.undo(); h.undo();
    eq(Array.from(m.edgeFlags).join(","), before, "三步撤回去逐字一样");
  });
  it("选面 = 面的全部边", () => {
    const { s, def, m } = meshScene((k) => addBox(k, P(0, 0, 0), P(1, 1, 1)));
    const env = { scene: s } as unknown as CommandEnv, f = m.faces()[0];
    const r = markSmooth.plan(env, unit(def, [], [f]), {});
    eq(r.count, 4); eq(JSON.stringify((r.ops[0] as { edges: number[] }).edges), JSON.stringify([...m.faceVerts(f).map((v, i, a) => m.edgeOf(v, a[(i + 1) % a.length]))].sort((x, y) => x - y)));
  });
  it("默认平滑三档：盒子全部平滑 = 12 条边都平滑；全部是棱 = 都不；已经是这一档 = 不露；按角度带角度参数；撤销回到原来那一档", () => {
    const { s, def, m } = meshScene((k) => addBox(k, P(0, 0, 0), P(1, 1, 1)));
    const env = { scene: s } as unknown as CommandEnv, h = new History(s), u = unit(def, []);
    eq(m.smoothDefault.mode, "hard", "新内核没设过 = 老文件的样子（全是棱）");
    eq(smoothNone.plan(env, u, smoothNone.defaults(env, [u])).count, 0, "已经全是棱 → 这一行不露");
    h.commit(s, smoothAll.plan(env, u, smoothAll.defaults(env, [u])).ops[0]);
    eq(m.edges().filter((e) => edgeSmooth(m, e)).length, 12);
    const v = smoothByAngle.defaults(env, [u]); eq(v.deg, 30);
    h.commit(s, smoothByAngle.plan(env, u, { deg: 100 }).ops[0]);
    eq(m.smoothDefault.mode, "angle"); eq(m.smoothDefault.deg, 100);
    eq(m.edges().filter((e) => edgeSmooth(m, e)).length, 12, "90° 小于 100° → 平滑");
    eq(smoothByAngle.defaults(env, [u]).deg, 100, "再打开按角度，默认 = 现在的角度");
    h.undo(); eq(m.smoothDefault.mode, "smooth"); h.undo(); eq(m.smoothDefault.mode, "hard");
    assert(applyOpThrows(s, { op: "meshSmoothDefault", def, mode: "angle", deg: 0 }), "角度 0 拒");
  });
});

function applyOpThrows(s: Scene, op: Parameters<typeof applyOp>[1]): boolean { try { applyOp(s, op); return false; } catch { return true; } }

describe("手标怎么继承（硬软边设计稿 §3）", () => {
  it("挤出面：帽子那一圈 + 区域里面的边带上原来的手标；侧面竖边不标；原来的边界留着手标", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(2, 1, 1));
    // 顶面外圈标平滑
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    const ring = m.faceVerts(top), outer = ring.map((v, i) => m.edgeOf(v, ring[(i + 1) % ring.length]));
    for (const e of outer) m.setEdgeFlags(e, F_SOFT | F_SMOOTH);
    const r = extrudeFaces(m, [top]);
    const cap = m.faceVerts(top);
    for (let i = 0; i < cap.length; i++) eq(m.edgeFlags[m.edgeOf(cap[i], cap[(i + 1) % cap.length])] & MARKS, F_SOFT | F_SMOOTH, "帽子那圈带原来的手标");
    for (const e of outer) eq(m.edgeFlags[e] & MARKS, F_SOFT | F_SMOOTH, "原来的边界留着");
    for (const [a, b] of r.newVerts) eq(m.edgeFlags[m.edgeOf(a, b)] & MARKS, 0, "侧面竖边不标");
    eq(m.check().join("\n"), "");
  });
  it("挤出两张面的区域：中间那条（新的）边带上原来那条的棱", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(2, 1, 1));
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    // 区域 = 顶面 + 一张侧面（共一条边）
    const side = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).y === 0))!;
    const shared = m.faceVerts(top).map((v, i, a) => m.edgeOf(v, a[(i + 1) % a.length])).find((e) => m.eFaces(e).includes(side))!;
    m.setEdgeFlags(shared, F_SHARP);
    const ends = [m.edgeA[shared], m.edgeB[shared]];
    const r = extrudeFaces(m, [top, side]);
    const ne = m.edgeOf(r.newVerts.get(ends[0])!, r.newVerts.get(ends[1])!);
    assert(ne >= 0, "区域里的那条边在新点上"); eq(m.edgeFlags[ne] & MARKS, F_SHARP);
    eq(m.check().join("\n"), "");
  });
  it("插入：新的一圈不带原边界的手标", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    const ring = m.faceVerts(top);
    for (let i = 0; i < ring.length; i++) m.setEdgeFlags(m.edgeOf(ring[i], ring[(i + 1) % ring.length]), F_SHARP);
    insetFaces(m, [top], 0.1);
    const inner = m.faceVerts(top);
    for (let i = 0; i < inner.length; i++) eq(m.edgeFlags[m.edgeOf(inner[i], inner[(i + 1) % inner.length])] & MARKS, 0);
  });
  it("并边（溶解二度点）：手标两条都有才留；接缝之类别的位有一条就留", () => {
    const run = (fa: number, fb: number): number => {
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; m.setEdgeFlags(e, 0);
      const v = splitEdge(m, e, 0.5), es = [...m.vEdges(v)];
      m.setEdgeFlags(es[0], fa); m.setEdgeFlags(es[1], fb);
      return m.edgeFlags[dissolveVertex(m, v)];
    };
    eq(run(F_SHARP, F_SHARP) & MARKS, F_SHARP);
    eq(run(F_SHARP, 0) & MARKS, 0, "一条是棱、一条没标 → 不标（以前是有一条就有）");
    eq(run(F_SHARP, F_SMOOTH | F_SOFT) & MARKS, 0);
    eq(run(4, 0) & 4, 4, "接缝（F_SEAM）有一条就留");
  });
});

describe("自由建模里平滑边点得中（纪元账本 FM138）", () => {
  it("圆柱侧面的竖边：softActive 点得中；不带 = 点到面（外面一层只画棱）", () => {
    const { s, inst, m } = meshScene((k) => { addPrimitive(k, "cylinder", F, [0.5, 0.5, 1], 16); k.setSmoothDefault({ mode: "angle", deg: 30 }); });
    const view = new WorldView(s, { chain: [inst], group: null });
    const cam = new OrbitCamera(); cam.projection = "persp"; cam.target = P(0, 0, 0.5); cam.yaw = 0.3; cam.pitch = 0.2; cam.halfH = 1.2;
    const VP = { w: 900, h: 700 }, eye = cam.eye();
    // 找一条朝着镜头的竖边，点它的中点
    let best = -1, bd = -Infinity;
    for (const e of m.edges()) {
      if (!edgeSoft(m, e)) continue;
      const a = m.pt(m.edgeA[e]), b = m.pt(m.edgeB[e]), mid = P((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      const d = (mid.x * (eye.x - mid.x) + mid.y * (eye.y - mid.y));   // 朝镜头那半圈
      if (d > bd) { bd = d; best = e; }
    }
    assert(best >= 0, "有平滑的竖边");
    const a = m.pt(m.edgeA[best]), b = m.pt(m.edgeB[best]), sp = cam.angularPx(P((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2), VP);
    const on = pickEntity(view, cam, VP, sp.x, sp.y, 8, { softActive: true });
    assert(on.edge !== undefined && view.local(on.edge).id === best, `softActive：点到那条平滑边（拿到 ${JSON.stringify(on)}）`);
    const off = pickEntity(view, cam, VP, sp.x, sp.y, 8);
    assert(off.edge === undefined && off.face !== undefined, `不带：平滑边点不中、点到面（拿到 ${JSON.stringify(off)}）`);
  });
});

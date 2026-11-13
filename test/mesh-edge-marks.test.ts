// 网格体的手标 + 默认平滑的指令、继承、拾取（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM138，硬软边设计稿 §3 / §5 / §6）。
// 判定本体（edge-smooth.ts）的标准答案在 mesh-format / object-commands 里；这里钉：右键指令出的 op 对、撤销逐字回去、挤出带手标 / 插入不带、并边取交集、自由建模里平滑边点得中。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { F_SHARP, F_SMOOTH, F_SOFT, F_SEAM } from "../src/mesh/edge-bits.ts";
import { UV_SEAM, packEdgeByte, setEdgeMark, unpackEdgeByte } from "../src/mesh/reserved-columns.ts";
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
import { markSharp, markSmooth, clearMarks, markSeam, clearSeam, autoSeamsCmd, smoothAll, smoothNone, smoothByAngle } from "../src/editor/mesh-edits/index.ts";
import { kernelFromMeshDoc, meshDocFromKernel } from "../src/mesh/mesh-doc.ts";
import { buildEdgeRec } from "../src/editor/pool-mesh.ts";
import { meshViewOf } from "../src/mesh/mesh-view.ts";
import { CONTOUR_ONLY } from "../src/editor/profile-edges.ts";
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
    const before = m.edges().map((e) => `${e}:${packEdgeByte(m, e)}`).join(",");
    h.commit(s, plan.ops[0]);
    assert(!edgeSmooth(m, side) && !edgeSoft(m, side), "标成棱：断开、画线");
    eq(markSharp.plan(env, unit(def, [side]), {}).count, 0, "已经是棱的不算");
    h.commit(s, markSmooth.plan(env, unit(def, [rim]), {}).ops[0]);
    assert(edgeSmooth(m, rim) && edgeSoft(m, rim), "标成平滑：明暗连续、不画线");
    eq(packEdgeByte(m, rim) & MARKS, F_SMOOTH | F_SOFT);
    h.commit(s, clearMarks.plan(env, unit(def, [side, rim]), {}).ops[0]);
    eq(packEdgeByte(m, side) & MARKS, 0); eq(packEdgeByte(m, rim) & MARKS, 0);
    assert(edgeSmooth(m, side) && !edgeSmooth(m, rim), "清掉以后回到默认平滑的判法");
    h.undo(); h.undo(); h.undo();
    eq(m.edges().map((e) => `${e}:${packEdgeByte(m, e)}`).join(","), before, "三步撤回去逐字一样");
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
    for (const e of outer) unpackEdgeByte(m, e, F_SOFT | F_SMOOTH);
    const r = extrudeFaces(m, [top]);
    const cap = m.faceVerts(top);
    for (let i = 0; i < cap.length; i++) eq(packEdgeByte(m, m.edgeOf(cap[i], cap[(i + 1) % cap.length])) & MARKS, F_SOFT | F_SMOOTH, "帽子那圈带原来的手标");
    for (const e of outer) eq(packEdgeByte(m, e) & MARKS, F_SOFT | F_SMOOTH, "原来的边界留着");
    for (const [a, b] of r.newVerts) eq(packEdgeByte(m, m.edgeOf(a, b)) & MARKS, 0, "侧面竖边不标");
    eq(m.check().join("\n"), "");
  });
  it("挤出两张面的区域：中间那条（新的）边带上原来那条的棱", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(2, 1, 1));
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    // 区域 = 顶面 + 一张侧面（共一条边）
    const side = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).y === 0))!;
    const shared = m.faceVerts(top).map((v, i, a) => m.edgeOf(v, a[(i + 1) % a.length])).find((e) => m.eFaces(e).includes(side))!;
    unpackEdgeByte(m, shared, F_SHARP);
    const ends = [m.edgeA[shared], m.edgeB[shared]];
    const r = extrudeFaces(m, [top, side]);
    const ne = m.edgeOf(r.newVerts.get(ends[0])!, r.newVerts.get(ends[1])!);
    assert(ne >= 0, "区域里的那条边在新点上"); eq(packEdgeByte(m, ne) & MARKS, F_SHARP);
    eq(m.check().join("\n"), "");
  });
  it("插入：新的一圈不带原边界的手标", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    const ring = m.faceVerts(top);
    for (let i = 0; i < ring.length; i++) unpackEdgeByte(m, m.edgeOf(ring[i], ring[(i + 1) % ring.length]), F_SHARP);
    insetFaces(m, [top], 0.1);
    const inner = m.faceVerts(top);
    for (let i = 0; i < inner.length; i++) eq(packEdgeByte(m, m.edgeOf(inner[i], inner[(i + 1) % inner.length])) & MARKS, 0);
  });
  it("并边（溶解二度点）：手标两条都有才留；接缝之类别的位有一条就留", () => {
    const run = (fa: number, fb: number): number => {
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; unpackEdgeByte(m, e, 0);
      const v = splitEdge(m, e, 0.5), es = [...m.vEdges(v)];
      unpackEdgeByte(m, es[0], fa); unpackEdgeByte(m, es[1], fb);
      return packEdgeByte(m, dissolveVertex(m, v));
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

describe("接缝（施工单二十二 A / B，2026-11-12 Opus）", () => {
  it("标成接缝 / 清掉接缝：op = meshEdgeMarks、只动接缝那一位（手标留着）；已经是的不算；撤销逐字回去", () => {
    const { s, def, m } = meshScene((k) => addBox(k, P(0, 0, 0), P(1, 1, 1)));
    const env = { scene: s } as unknown as CommandEnv, h = new History(s), [e0, e1] = m.edges();
    unpackEdgeByte(m, e0, F_SHARP);
    const before = m.edges().map((e) => `${e}:${packEdgeByte(m, e)}`).join(",");
    const plan = markSeam.plan(env, unit(def, [e0, e1]), {});
    eq(plan.count, 2); eq(plan.ops[0].op, "meshEdgeMarks");
    h.commit(s, plan.ops[0]);
    eq(packEdgeByte(m, e0), F_SHARP | F_SEAM, "棱留着、加上接缝"); eq(packEdgeByte(m, e1), F_SEAM);
    eq(markSeam.plan(env, unit(def, [e0, e1]), {}).count, 0, "已经是接缝的不算");
    h.commit(s, clearMarks.plan(env, unit(def, [e0, e1]), {}).ops[0]);
    eq(packEdgeByte(m, e0), F_SEAM, "清掉手标不碰接缝"); eq(packEdgeByte(m, e1), F_SEAM);
    eq(clearSeam.plan(env, unit(def, [e0]), {}).count, 1);
    h.commit(s, clearSeam.plan(env, unit(def, [e0]), {}).ops[0]);
    eq(packEdgeByte(m, e0), 0); eq(packEdgeByte(m, e1), F_SEAM);
    eq(clearSeam.plan(env, unit(def, [e0]), {}).count, 0, "没有接缝的不算");
    h.undo(); h.undo(); h.undo();
    eq(m.edges().map((e) => `${e}:${packEdgeByte(m, e)}`).join(","), before, "三步撤回去逐字一样");
  });
  it("选一片面 = 标它的外沿（片里面的边不标）；选边 + 选面 = 两样合起来", () => {
    const { s, def, m } = meshScene((k) => addBox(k, P(0, 0, 0), P(1, 1, 1)));
    const env = { scene: s } as unknown as CommandEnv;
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!, side = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).y === 0))!;
    const inner = m.faceVerts(top).map((v, i, a) => m.edgeOf(v, a[(i + 1) % a.length])).find((e) => m.eFaces(e).includes(side))!;
    const r = markSeam.plan(env, unit(def, [], [top, side]), {});
    eq(r.count, 6, "两张面合起来的外沿 = 4 + 4 − 2");
    assert(!(r.ops[0] as { edges: number[] }).edges.includes(inner), "两张面中间那条不标");
    const lone = m.edges().find((e) => !m.eFaces(e).includes(top) && !m.eFaces(e).includes(side))!;
    eq(markSeam.plan(env, unit(def, [lone], [top]), {}).count, 5, "一张面的 4 条 + 单独选的 1 条");
  });
  it("自动标接缝（指令）：没选区 = 整个网格体；op = meshEdgeMarks seam、只列新补的；做完选中补的那几条；提示带理由和片数；一步撤销；选了面 = 只管那几张", () => {
    const { s, def, m } = meshScene((k) => addBox(k, P(0, 0, 0), P(1, 1, 1)));
    const env = { scene: s } as unknown as CommandEnv, h = new History(s);
    setEdgeMark(m, m.edges()[0], UV_SEAM, true);
    const before = m.edges().map((e) => `${e}:${packEdgeByte(m, e)}`).join(",");
    const plan = autoSeamsCmd.plan(env, { kind: "mesh", def, sel: null, xf: IDENTITY }, autoSeamsCmd.defaults(env));
    eq(plan.count, 11, "12 条棱减去已经标的那条"); eq(plan.ops[0].op, "meshEdgeMarks"); eq((plan.ops[0] as { mark: string }).mark, "seam");
    eq(JSON.stringify(plan.select?.edges), JSON.stringify((plan.ops[0] as { edges: number[] }).edges), "做完选中补的那几条");
    assert(/折痕 11/.test(plan.notes?.[0] ?? "") && /6 片/.test(plan.notes?.[0] ?? ""), plan.notes?.[0] ?? "");
    h.commit(s, plan.ops[0]);
    eq(m.edges().filter((e) => packEdgeByte(m, e) & F_SEAM).length, 12);
    eq(autoSeamsCmd.plan(env, { kind: "mesh", def, sel: null, xf: IDENTITY }, { deg: 60 }).count, 0, "再做一次：不用补");
    h.undo(); eq(m.edges().map((e) => `${e}:${packEdgeByte(m, e)}`).join(","), before, "一步撤回去");
    const top = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === 1))!;
    eq(autoSeamsCmd.plan(env, unit(def, [], [top]), { deg: 60 }).count, 0, "只选顶面：本来就是一张盘");
  });
  it("接缝存进文件、读回来还在（文件里 edgeFlags 那个字节本来就有这一位，格式不变；3c 起内存里是 uv_seam 一列）", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const [e0, e1] = m.edges(); unpackEdgeByte(m, e0, F_SEAM); unpackEdgeByte(m, e1, F_SEAM | F_SHARP);
    const m2 = kernelFromMeshDoc(meshDocFromKernel(m));
    const seamPairs = (k: MeshKernel): string => k.edges().filter((e) => packEdgeByte(k, e) & F_SEAM).map((e) => `${Math.min(k.edgeA[e], k.edgeB[e])}-${Math.max(k.edgeA[e], k.edgeB[e])}:${packEdgeByte(k, e)}`).sort().join(",");
    eq(seamPairs(m2), seamPairs(m)); eq(seamPairs(m2).split(",").length, 2);
  });
  it("显示：画接缝时接缝一律进线批、不只在外轮廓时画（软边上的接缝也画）、带 seam；不画接缝时照旧；藏起来的接缝不画", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const [e0, e1] = m.edges(); unpackEdgeByte(m, e0, F_SEAM | F_SOFT | F_SMOOTH); unpackEdgeByte(m, e1, F_SEAM | 8);   // 8 = F_HIDDEN
    const v = meshViewOf(m);
    const on = buildEdgeRec(v, e0, true)!, off = buildEdgeRec(v, e0, false)!;
    eq(on.seam, true); eq(on.flag, 2, "画接缝：软的接缝也一直画（旗 = 两张面，不加 CONTOUR_ONLY）");
    eq(off.seam, false); eq(off.flag, 2 + CONTOUR_ONLY, "不画接缝：软边照旧只在外轮廓时画");
    eq(buildEdgeRec(v, e1, true), null, "藏起来的接缝不画");
  });
});

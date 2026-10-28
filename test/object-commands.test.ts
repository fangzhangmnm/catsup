// 物体族（object.*）：转成网格体 / 转回 SU 体 + 导入直接成网格体（2026-10-27 Claude Fable 5.1；user「导入直接成 mesh」「explicit转换……诚实披露」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Scene } from "../src/scene/scene.ts";
import { applyOp } from "../src/editor/ops.ts";
import { meshToBrep } from "../src/scene/kinds.ts";
import { commandById, placementsAt, checkRegistry } from "../src/editor/commands/registry.ts";
import type { CommandEnv, ObjectUnit } from "../src/editor/commands/command.ts";
import { toMesh, toBrep } from "../src/editor/objects/index.ts";
import { castImport, buildImport, type ImportedScene } from "../src/scene/import-build.ts";
import type { ImportScene } from "../src/format/gltf-import.ts";
import { MeshKernel, F_SOFT, F_SMOOTH } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { edgeSmooth, edgeSoft } from "../src/mesh/edge-smooth.ts";
import { sceneBox } from "./format-scenes.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const env = (s: Scene): CommandEnv => ({ scene: s, gridFineStep: () => 0.1, snapStepChoices: () => [], snapLattice: () => IDENTITY, sharpDeg: () => 20, circleSegments: () => 24 });
const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
/** 单位盒的三角汤（外法向、一致绕向）。 */
const boxSoup = (): { positions: Pt3[]; tris: number[] } => {
  const positions = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(0, 0, 1), P(1, 0, 1), P(1, 1, 1), P(0, 1, 1)];
  const quads = [[0, 3, 2, 1], [4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]];
  return { positions, tris: quads.flatMap(([a, b, c, d]) => [a, b, c, a, c, d]) };
};

describe("物体族：转成网格体 / 转回 SU 体", () => {
  it("注册表里有物体族两条指令、物体窗口两条放置（2026-10-28 物体级搬进物体窗口，不进几何层的右键 / 浮条）；族名 = 单位种类；自洽", () => {
    eq(checkRegistry().join("\n"), "");
    assert(commandById("object.toMesh")?.unit === "object" && commandById("object.toBrep")?.unit === "object");
    assert(placementsAt("objectWindow").some((p) => p.action === "object.toMesh") && placementsAt("objectWindow").some((p) => p.action === "object.toBrep"));
    assert(!placementsAt("contextBar").some((p) => p.action === "object.toMesh" || p.action === "object.toBrep"));
    assert(commandById("brep.weld")?.unit === "brep");
  });
  it("toMesh：规划出 castDefinition；披露丢什么、几份实例一起变；已是网格体 → 跳过说清", () => {
    const s = new Scene(sceneBox()), d = s.mintDef("盒", sceneBox());
    s.mintInstance(s.root, null, d.id, IDENTITY); s.mintInstance(s.root, null, d.id, IDENTITY);
    const u: ObjectUnit = { kind: "object", at: { def: s.root, group: null }, instance: [...s.def(s.root).instances.keys()][0], def: d.id, name: "盒", body: "brep", copies: 2, xf: IDENTITY };
    const r = toMesh.plan(env(s), u, {});
    eq(r.count, 1); eq(r.ops[0].op, "castDefinition");
    assert(r.notes!.some((n) => /2 份实例/.test(n)) && r.notes!.some((n) => /丢掉/.test(n)), `披露：${r.notes!.join(" / ")}`);
    const s2 = applyOp(s, r.ops[0]).scene;
    eq(s2.kindOf(d.id), "mesh");
    const r2 = toMesh.plan(env(s2), { ...u, body: "mesh" }, {});
    eq(r2.count, 0); eq(r2.skipped, 1); assert(/已经是/.test(r2.notes![0]));
  });
  it("toBrep：盒子转网格再转回 = 6 张膜 12 条边；估时按三角数；不平的面折成平面块加软边；隐藏的面不带过去", () => {
    const s = new Scene(sceneBox()), d = s.mintDef("盒", sceneBox());
    s.mintInstance(s.root, null, d.id, IDENTITY);
    let s2 = applyOp(s, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
    const u: ObjectUnit = { kind: "object", at: { def: s.root, group: null }, instance: 0, def: d.id, name: "盒", body: "mesh", copies: 1, xf: IDENTITY };
    const est = toBrep.estimate!(env(s2), [u], { softDeg: 20 });
    assert(est && est.seconds > 0 && /12 个三角形/.test(est.what), `估时：${JSON.stringify(est)}`);
    const r = toBrep.plan(env(s2), u, { softDeg: 20 });
    eq(r.count, 1); eq((r.ops[0] as { softDeg?: number }).softDeg, 20);
    s2 = applyOp(s2, r.ops[0]).scene;
    eq(s2.kindOf(d.id), "brep");
    const k = s2.brep(d.id).kernel;
    eq(k.faces().length, 6); eq(k.edges().length, 12); eq(k.soft.size, 0, "共面的对角线并掉了，不留软边");
    const m = new MeshKernel(), { verts, faces } = addBox(m, P(0, 0, 0), P(1, 1, 1));
    m.setPos(verts[0], P(-0.3, -0.3, 0.25));   // 一个角抬起来：三张面不平了
    m.setFaceFlags(faces[1], 1, true);         // 隐藏一张
    const b = meshToBrep({ kind: "mesh", kernel: m, materialSlots: [] }, 20);
    assert(b.kernel.faces().length > 5 && b.kernel.soft.size > 0, `不平的面折成平面块：${b.kernel.faces().length} 张、软边 ${b.kernel.soft.size}`);
    const t0 = performance.now();
    const big = new MeshKernel(), N = 100, ids: number[][] = [];
    for (let i = 0; i <= N; i++) { ids.push([]); for (let j = 0; j <= N; j++) ids[i].push(big.addVertex(P(i, j, Math.sin(i * 0.3) * Math.cos(j * 0.3)))); }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) big.addFace([ids[i][j], ids[i + 1][j], ids[i + 1][j + 1], ids[i][j + 1]]);
    const t1 = performance.now();
    const bb = meshToBrep({ kind: "mesh", kernel: big, materialSlots: [] }, 20);
    const ms = performance.now() - t1;
    console.log(`    [量级] meshToBrep：${N * N} 个不平四边形（${2 * N * N} 三角）→ ${bb.kernel.faces().length} 张膜，${Math.round(ms)} ms（建网格 ${Math.round(t1 - t0)} ms）`);
    assert(bb.kernel.faces().length >= N * N, "每个不平四边形至少折成两块");
  });
  it("导入直接成网格体（user 10-27）：castImport 出网格载荷、buildImport 建网格定义、对角线按角度软 + 平滑；老复现包里带膜的照装", () => {
    const soup = boxSoup();
    const data: ImportScene = { name: "f", nodes: [{ name: "cube", xform: IDENTITY, mesh: 0, children: [] }], meshes: [{ name: "cube", positions: soup.positions, tris: soup.tris }], roots: [0], losses: [] };
    const { scene: imp, report } = castImport(data, 20);
    assert(imp.meshes[0].mesh && !imp.meshes[0].brep, "载荷是网格");
    eq(report.triangles, 12); eq(report.softened, 6, "六条对角线按默认平滑（按角度）平滑"); eq(report.degenerate, 0);
    const s = new Scene(sceneBox());
    const rep = buildImport(s, { def: s.root, group: null }, imp, IDENTITY);
    eq(rep.definitions, 1); eq(rep.instances, 1);
    const d = [...s.defs.values()].find((x) => x.body.kind === "mesh")!;
    const m = s.mesh(d.id).kernel;
    eq(m.faceCount(), 12); eq(m.smoothDefault.mode, "angle"); eq(m.edges().filter((e) => edgeSmooth(m, e) && edgeSoft(m, e)).length, 6, "对角线平滑且不画线（默认平滑判，不再烘标记）");
    const old: ImportedScene = { name: "f", nodes: data.nodes, roots: [0], meshes: [{ name: "cube", brep: sceneBox().toBrep() }] };
    const s3 = new Scene(sceneBox());
    buildImport(s3, { def: s3.root, group: null }, old, IDENTITY);
    assert([...s3.defs.values()].some((x) => x.id !== s3.root && x.body.kind === "brep"), "老复现包（带膜）照装成 brep");
  });
  it("默认平滑「按角度」（2026-10-28 代替烘标记的 smoothByAngle，同一条 |cos| 规则）：盒子没有平滑边；三角化盒子 6 条对角线；反向绕的相邻面也认", () => {
    const nSmooth = (k: MeshKernel): number => k.edges().filter((e) => edgeSmooth(k, e)).length;
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1)); m.setSmoothDefault({ mode: "angle", deg: 20 });
    eq(nSmooth(m), 0);
    const soup = boxSoup(), t = new MeshKernel(), vs = soup.positions.map((p) => t.addVertex(p));
    for (let i = 0; i < soup.tris.length; i += 3) t.addFace([vs[soup.tris[i]], vs[soup.tris[i + 1]], vs[soup.tris[i + 2]]]);
    t.setSmoothDefault({ mode: "angle", deg: 20 });
    eq(nSmooth(t), 6);
    const w = new MeshKernel(), a = w.addVertex(P(0, 0, 0)), b = w.addVertex(P(1, 0, 0)), c = w.addVertex(P(1, 1, 0)), d = w.addVertex(P(0, 1, 0));
    w.addFace([a, b, c]); w.addFace([a, d, c]);   // 第二张反向绕（法向朝 −z）：共面仍平滑
    w.setSmoothDefault({ mode: "angle", deg: 20 });
    eq(nSmooth(w), 1);
  });
});

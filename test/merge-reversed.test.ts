// 修复「合并重合反向面」（repairs/merge-reversed/plan.ts）。created 2026-11-06 by Claude Opus 5.5
// 钉的是 user 要的结果：合完环切切得动、平滑跨得过去、封闭的朝外；转换永远不合（user 11-04「修复可以合并，导入导出的时候机械透明」）；材质不同的不并，报数。
import { givenFaceValues, setFaceHidden } from "../src/mesh/reserved-columns.ts";
import { describe, it, eq, assert } from "./runner.mjs";
import { FRESH } from "../src/mesh/columns.ts";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { deleteFaces, loopCut, recalcNormals } from "../src/mesh/ops/index.ts";
import { meshViewOf } from "../src/mesh/mesh-view.ts";
import { fanNormal } from "../src/scene/fan-normal.ts";
import { brepToMesh } from "../src/scene/kinds.ts";
import { emptyGuides } from "../src/scene/guides.ts";
import { planMergeReversed } from "../src/editor/repairs/merge-reversed/plan.ts";
import { actionById, placementsAt } from "../src/editor/commands/registry.ts";
import { MIRROR_TOPO_ACTIONS } from "../src/mesh/mirror-ops.ts";
import { kernelFromMeshDoc, meshDocFromKernel } from "../src/mesh/mesh-doc.ts";
import { SCENES } from "./format-scenes.ts";
import type { Kernel } from "../src/kernel/kernel.ts";

const same = (s: number): number => s;
const meshOf = (kernel: Kernel): MeshKernel => brepToMesh({ kind: "brep", kernel, groups: new Map(), nextGroup: 1, materialSlots: [], guides: emptyGuides() }).kernel;
/** 两块四边形连成的带子（共 6 个点），layers = 2 时每块都有反向的另一张。 */
function strip(layers: 1 | 2, slotB = -1): MeshKernel {
  const k = new MeshKernel();
  for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) k.addVertex({ x, y, z: 0 });
  k.addFace([0, 1, 4, 3], FRESH); k.addFace([1, 2, 5, 4], FRESH);
  if (layers === 2) { k.addFace([3, 4, 1, 0], { kind: "fresh", face: givenFaceValues(k, { material: slotB }) }); k.addFace([4, 5, 2, 1], { kind: "fresh", face: givenFaceValues(k, { material: slotB }) }); }
  return k;
}
const signedVolume = (k: MeshKernel): number => {
  let v = 0;
  for (const f of k.faces()) { const p = k.facePts(f); for (let i = 1; i + 1 < p.length; i++) { const a = p[0], b = p[i], c = p[i + 1]; v += a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x); } }
  return v / 6;
};
const apply = (k: MeshKernel, remove: readonly number[]): void => deleteFaces(k, remove);

describe("修复：合并重合反向面", () => {
  it("两面都出的方块转过来 = 6 对；转换本身不合（机械透明）；合完 = 6 张、每条边两张面、朝外", () => {
    const k = meshOf(SCENES.box());
    eq(k.faces().length, 12, "转换不合并");
    assert(k.edges().every((e) => k.eFaces(e).length === 4), "合之前中间每条边挂 4 张面");
    const rev = k.rev, p = planMergeReversed(k, same);
    eq(k.rev, rev, "规划不改内核");
    eq(p.pairs, 6); eq(p.remove.length, 6); eq(p.skipped, 0); eq(p.shells, 1); eq(p.sheets, 0);
    apply(k, p.remove);
    eq(k.faces().length, 6);
    assert(k.edges().every((e) => k.eFaces(e).length === 2), "合完每条边两张面");
    assert(signedVolume(k) > 0, `封闭的块朝外，体积 ${signedVolume(k)}`);
    eq(recalcNormals(k.clone()).flipped, 0, "朝向已经一致、已经朝外");
    eq(planMergeReversed(k, same).pairs, 0, "再跑一次没事做");
  });

  it("存盘往返：合完的网格体写成文件形状再读回来，还是 6 张面、每条边两张、还是朝外", () => {
    const k = meshOf(SCENES.box());
    apply(k, planMergeReversed(k, same).remove);
    const back = kernelFromMeshDoc(meshDocFromKernel(k), "test");
    eq(back.faces().length, 6);
    assert(back.edges().every((e) => back.eFaces(e).length === 2), "每条边两张面");
    assert(signedVolume(back) > 0, "朝外");
    eq(planMergeReversed(back, same).pairs, 0, "读回来没有新的对");
  });

  it("环切：两层切不动，合完切得动（同单层）", () => {
    const k = strip(2), e = (m: MeshKernel): number => m.edgeOf(1, 4);   // 中缝：叠着的时候挂 4 张面（最外边只挂 2 张，本来就切得动）
    eq(loopCut(k.clone(), e(k), 0.5).edges.length, 0, "两层切不动");
    const p = planMergeReversed(k, same);
    eq(p.pairs, 2); eq(p.shells, 0); eq(p.sheets, 1, "开口的片，报数");
    apply(k, p.remove);
    eq(loopCut(k.clone(), e(k), 0.5).edges.length, loopCut(strip(1), e(strip(1)), 0.5).edges.length, "和单层切得一样");
    eq(loopCut(k.clone(), e(k), 0.5).edges.length, 2);
  });

  it("平滑：叠着的时候跨不过去，合完跨得过去（圆柱侧面的角点法向不再等于面法向）", () => {
    const k = meshOf(SCENES.cylinder());
    const sideFace = (m: MeshKernel): number => m.faces().find((f) => m.faceVerts(f).length === 4)!;
    const bends = (m: MeshKernel): boolean => { const f = sideFace(m), n = m.faceNormal(f), a = fanNormal(meshViewOf(m), f, 0); return Math.abs(a.x * n.x + a.y * n.y + a.z * n.z) < 0.99999; };
    assert(!bends(k), "叠着：法向停在自己这张面上");
    const p = planMergeReversed(k, same);
    assert(p.pairs > 0, "有成对的面");
    apply(k, p.remove);
    assert(bends(k), "合完：跨过软边，角点法向是扇内平均");
    assert(signedVolume(k) > 0, "封闭的圆柱朝外");
  });

  it("开口的片：留先写的那张（机械），方向不猜", () => {
    const k = strip(2), p = planMergeReversed(k, same);
    eq(p.remove.join(","), "2,3", "删后写的两张");
  });

  it("连着单层的面：跟单层的方向，先写的那张反了也不留", () => {
    const k = new MeshKernel();
    for (const [x, y] of [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]]) k.addVertex({ x, y, z: 0 });
    k.addFace([0, 3, 4, 1], FRESH);       // 先写的：朝 −z
    k.addFace([1, 2, 5, 4], FRESH);       // 单层：朝 +z（用户的朝向）
    k.addFace([4, 3, 0, 1], FRESH);       // 后写的：朝 +z
    const p = planMergeReversed(k, same);
    eq(p.pairs, 1); eq(p.sheets, 0, "跟了单层的不算猜"); eq(p.remove.join(","), "0", "留朝 +z 的那张");
    apply(k, p.remove);
    assert(k.faces().every((f) => k.faceNormal(f).z > 0), "一致朝 +z");
    eq(k.eFaces(k.edgeOf(1, 4)).length, 2, "中缝恰两张面");
  });

  it("材质不同的不并，报数；按材质比、不按槽号比", () => {
    const k = strip(2, 7), p = planMergeReversed(k, same);
    eq(p.pairs, 0); eq(p.skipped, 2); eq(p.remove.length, 0);
    const q = planMergeReversed(k, (s) => (s === 7 ? -1 : s));   // 槽 7 指的就是默认：材质一样
    eq(q.pairs, 2); eq(q.skipped, 0);
  });

  it("一张隐藏一张没隐藏的不并；叠了三层的不碰；同向的重复面不碰", () => {
    const hidden = strip(2); setFaceHidden(hidden, 2, true);
    eq(planMergeReversed(hidden, same).pairs, 1); eq(planMergeReversed(hidden, same).skipped, 1);
    const three = new MeshKernel();
    for (const [x, y] of [[0, 0], [1, 0], [1, 1]]) three.addVertex({ x, y, z: 0 });
    three.addFace([0, 1, 2], FRESH); three.addFace([2, 1, 0], FRESH); three.addFace([0, 1, 2], FRESH);
    eq(planMergeReversed(three, same).pairs, 0); eq(planMergeReversed(three, same).skipped, 1);
    const dup = new MeshKernel();
    for (const [x, y] of [[0, 0], [1, 0], [1, 1]]) dup.addVertex({ x, y, z: 0 });
    dup.addFace([0, 1, 2], FRESH); dup.addFace([1, 2, 0], FRESH);
    eq(planMergeReversed(dup, same).pairs, 0); eq(planMergeReversed(dup, same).skipped, 0);
  });

  it("没有这种面 = 没事做；单层的方块一个字节不碰", () => {
    const k = strip(1), p = planMergeReversed(k, same);
    eq(p.pairs + p.skipped + p.remove.length, 0);
  });

  it("接线：只住修复窗（不进右键菜单 / 不进默认路径）；镜像编辑开着要先问", () => {
    assert(actionById("mesh.mergeReversed"), "动作在注册表里");
    assert(placementsAt("repairWindow", "freeform").some((p) => p.action === "mesh.mergeReversed"), "修复窗里有");
    assert(!placementsAt("contextBar", "freeform").some((p) => p.action === "mesh.mergeReversed"), "右键里没有");
    assert(MIRROR_TOPO_ACTIONS.has("mesh.mergeReversed"), "改拓扑");
    assert(/只留一面/.test(actionById("mesh.mergeReversed")!.label(3)), "字上写明会丢一面（计划书 §2.9）");
  });
});

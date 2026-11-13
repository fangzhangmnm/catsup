// 共面软边自动并掉：转回硬表面时特意留下的软边，到了硬表面里挪一下旁边的点会不会被并掉（统筹 11-13）。created 2026-11-13 by Claude Opus 5.5
// 场景都一样：网格体两张共面相邻的四边形（共用一条边）→ 转回硬表面 → 在同一平面里挪那条共用边上的一个点 → 看两张膜还是不是两张、标记归了谁。
//   a. 一张藏一张露；b. 材质不同、都露着；c. 同材质、中间那条边藏着。
import { describe, it, eq } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { HIDE_EDGE, givenFaceValues, setEdgeMark } from "../src/mesh/reserved-columns.ts";
import { meshToBrep } from "../src/scene/kinds.ts";
import type { Kernel } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z = 0) => ({ x, y, z });
function twoQuads(o: { hideB?: boolean; matA?: number; matB?: number; hideMid?: boolean }): Kernel {
  const m = new MeshKernel(), v = [P(0, 0), P(1, 0), P(1, 1), P(0, 1), P(2, 0), P(2, 1)].map((p) => m.addVertex(p));
  m.addFace([v[0], v[1], v[2], v[3]], { kind: "fresh", face: givenFaceValues(m, { material: o.matA ?? -1 }) });
  m.addFace([v[1], v[4], v[5], v[2]], { kind: "fresh", face: givenFaceValues(m, { material: o.matB ?? -1, hidden: o.hideB }) });
  if (o.hideMid) setEdgeMark(m, m.edgeOf(v[1], v[2]), HIDE_EDGE, true);
  return meshToBrep({ kind: "mesh", kernel: m, materialSlots: [0, 1], uvSetSlots: [] }, 20).kernel;
}
const state = (k: Kernel) => {
  const fs = k.faces();
  const mid = k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) > 0.5; }); // 竖着的那条共用边（x 不变的边里 x 在 1 附近的）
  return {
    faces: fs.length,
    hidden: fs.filter((f) => k.isFaceHidden(f.id)).length,
    mats: fs.map((f) => k.faceMaterialOf(f.id, 0) ?? -1).sort().join(","),
    hiddenEdges: k.edges().filter((e) => k.isEdgeHidden(e.id)).length,
    midSoft: !!mid && k.isSoft(mid.id),
  };
};
/** 在同一平面里挪共用边下面那个点（x = 1, y = 0 → x = 1.1）。 */
const nudge = (k: Kernel): void => { const v = k.vertices().find((q) => Math.abs(q.x - 1) < 1e-9 && Math.abs(q.y) < 1e-9 && Math.abs(q.z) < 1e-9)!; k.moveVertices([{ id: v.id, to: P(1.1, 0) }]); };

describe("共面软边自动并掉：转回硬表面留下的软边，挪一下旁边的点之后", () => {
  it("a. 一张藏一张露：还是两张，藏着的那张还藏着", () => {
    const k = twoQuads({ hideB: true }), before = state(k); nudge(k); const after = state(k);
    eq(JSON.stringify({ faces: after.faces, hidden: after.hidden }), JSON.stringify({ faces: 2, hidden: 1 }), `转完 ${JSON.stringify(before)} → 挪完 ${JSON.stringify(after)}`);
  });
  it("b. 材质不同、都露着：还是两张，各是各的材质", () => {
    const k = twoQuads({ matA: 0, matB: 1 }), before = state(k); nudge(k); const after = state(k);
    eq(JSON.stringify({ faces: after.faces, mats: after.mats }), JSON.stringify({ faces: 2, mats: "0,1" }), `转完 ${JSON.stringify(before)} → 挪完 ${JSON.stringify(after)}`);
  });
  it("c. 同材质、中间那条边藏着：还是两张，那条边还藏着", () => {
    const k = twoQuads({ hideMid: true }), before = state(k); nudge(k); const after = state(k);
    eq(JSON.stringify({ faces: after.faces, hiddenEdges: after.hiddenEdges }), JSON.stringify({ faces: 2, hiddenEdges: 1 }), `转完 ${JSON.stringify(before)} → 挪完 ${JSON.stringify(after)}`);
  });
});

// mesh/select-loop.ts：Alt 点边 = 环 / 洞（2026-10-28 Claude Opus 5.5；user「alt 点边可以选择洞还是环，然后有镜像的时候环的算法要小心一点」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, loopCut } from "../src/mesh/ops/index.ts";
import { symmetrize } from "../src/mesh/mirror.ts";
import { edgeLoop } from "../src/mesh/select-loop.ts";

/** x0..x1 × 0..3 的平面四边形网格（每格 1 m），返回网格 + 点号表 id[i][j]（i 沿 x、j 沿 y）。 */
function grid(x0: number, x1: number): { m: MeshKernel; id: number[][] } {
  const m = new MeshKernel(), id: number[][] = [];
  for (let i = 0; i <= x1 - x0; i++) { id.push([]); for (let j = 0; j <= 3; j++) id[i].push(m.addVertex({ x: x0 + i, y: j, z: 0 })); }
  for (let i = 0; i < x1 - x0; i++) for (let j = 0; j < 3; j++) m.addFace([id[i][j], id[i + 1][j], id[i + 1][j + 1], id[i][j + 1]]);
  return { m, id };
}
const MIR = { mirror: { axis: 0 as const, tol: 0.001 } };

describe("select-loop：环 / 洞", () => {
  it("网格中间一条横边 = 一整行（走到边界的三度点停，不闭合）；边界边 = 整圈洞（闭合）", () => {
    const { m, id } = grid(0, 3);
    const r = edgeLoop(m, m.edgeOf(id[1][1], id[2][1]));
    eq(r.kind, "loop"); eq(r.edges.length, 3); eq(r.closed, false);
    const h = edgeLoop(m, m.edgeOf(id[0][0], id[1][0]));
    eq(h.kind, "hole"); eq(h.edges.length, 12); eq(h.closed, true);
  });
  it("盒子环切一圈之后，点那一圈上的边 = 闭合的 4 条（四度点一路走）；立方体的角是三度点 = 只有自己", () => {
    const m = new MeshKernel(); addBox(m, { x: 0, y: 0, z: 0 }, { x: 1, y: 1, z: 1 });
    eq(edgeLoop(m, m.edges()[0]).edges.length, 1);
    const vert = m.edges().find((e) => Math.abs(m.pt(m.edgeA[e]).z - m.pt(m.edgeB[e]).z) > 0.5)!;
    const cut = loopCut(m, vert);
    const ring = m.edges().find((e) => Math.abs(m.pt(m.edgeA[e]).z - 0.5) < 1e-9 && Math.abs(m.pt(m.edgeB[e]).z - 0.5) < 1e-9)!;
    const r = edgeLoop(m, ring);
    assert(cut && r.closed && r.edges.length === 4, JSON.stringify(r));
  });
  it("镜像：强行对称的中缝点是共用的 → 环走过中缝接着走（一行 6 条，不在中缝断）", () => {
    const { m, id } = grid(0, 3);
    symmetrize(m, 0, 1);
    const r = edgeLoop(m, m.edgeOf(id[1][1], id[2][1]));
    eq(r.edges.length, 6, "−3..3 一整行"); eq(r.closed, false);
    for (const e of r.edges) assert(Math.abs(m.pt(m.edgeA[e]).y - 1) < 1e-9 && Math.abs(m.pt(m.edgeB[e]).y - 1) < 1e-9, "都在 y = 1 那一行");
  });
  it("镜像开着：落在镜像面上的边界不是洞——点中缝边界 = 只选中线；点别处的边界 = 走到中缝停；不开镜像 = 整圈", () => {
    const { m, id } = grid(0, 3);   // x = 0 那条边界 = 中缝（另一半没建）
    const seam = edgeLoop(m, m.edgeOf(id[0][0], id[0][1]), MIR);
    eq(seam.edges.length, 3, "中线 3 条"); eq(seam.closed, false);
    const far = edgeLoop(m, m.edgeOf(id[3][0], id[3][1]), MIR);
    eq(far.edges.length, 9, "除了中缝那 3 条的边界"); eq(far.closed, false);
    eq(edgeLoop(m, m.edgeOf(id[3][0], id[3][1])).edges.length, 12, "不开镜像 = 整圈洞");
  });
});

// 非流形 / 重复面的两道护栏（created 2026-10-29 by Claude Opus 5.5；user 10-29 日志「loopCut: edge 18 has 4 faces」：合并 3 个点 + 强行对称之后，选东西时右键菜单数「环切」抛成脚本错误）。
// ① 环切从一条被 ≥ 3 张面共用的边 / 裸线起手 = 交回空结果（「切不出一圈」），不抛 ② 并点后变成一模一样的两张面（点集相同）= 留一张；原来就有的重复不碰
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { loopCut, mergeVerts } from "../src/mesh/ops/index.ts";

const P = (x: number, y: number, z = 0) => ({ x, y, z });
const maxFacesOnEdge = (k: MeshKernel): number => Math.max(0, ...k.edges().map((e) => k.eFaces(e).length));

describe("非流形 / 重复面护栏", () => {
  it("环切从被 3 张面共用的边起手 = 空结果，不抛；从裸线起手也是", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0)), b = k.addVertex(P(1, 0));
    for (let i = 0; i < 3; i++) { const t = (2 * Math.PI * i) / 3, c = k.addVertex(P(1, Math.cos(t), Math.sin(t))), d = k.addVertex(P(0, Math.cos(t), Math.sin(t))); k.addFace([a, b, c, d]); }   // 一条边三片鳍
    const e = k.edgeOf(a, b);
    eq(k.eFaces(e).length, 3);
    let r: ReturnType<typeof loopCut> | null = null, err: unknown = null;
    try { r = loopCut(k, e); } catch (x) { err = x; }
    assert(err === null, `抛了：${String(err)}`); eq(r!.edges.length, 0);
    const w = new MeshKernel(), u = w.addVertex(P(0, 0)), v = w.addVertex(P(1, 0)), we = w.ensureEdge(u, v);
    eq(loopCut(w, we).edges.length, 0);
  });
  it("并点把两张四边形并成同一个点集（一张枕头）= 只留一张；每条边最多 2 张面；自检干净", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0)), b = k.addVertex(P(1, 0)), c = k.addVertex(P(1, 1)), d = k.addVertex(P(0, 1)), e = k.addVertex(P(1.01, 0, 0.5));
    k.addFace([a, b, c, d]); k.addFace([a, d, c, e]);   // 第二张差一个点（e 挨着 b）
    eq(k.faceCount(), 2);
    mergeVerts(k, [b, e], "first");
    eq(k.faceCount(), 1, "并完该剩一张");
    assert(maxFacesOnEdge(k) <= 1, `还有边被 ${maxFacesOnEdge(k)} 张面共用`);
    eq(k.check().join(";"), "");
  });
  it("原来就有的重复面（和这次并点无关）不碰", () => {
    const k = new MeshKernel(), a = k.addVertex(P(0, 0)), b = k.addVertex(P(1, 0)), c = k.addVertex(P(1, 1)), d = k.addVertex(P(0, 1));
    k.addFace([a, b, c, d]); k.addFace([a, d, c, b]);   // 背靠背两张（用户自己的）
    const x = k.addVertex(P(5, 0)), y = k.addVertex(P(6, 0)), z = k.addVertex(P(6, 1)), w = k.addVertex(P(5, 1)), q = k.addVertex(P(5.5, 1.2));
    k.addFace([x, y, z, w]); k.addFace([w, z, q]);
    mergeVerts(k, [z, q], "center");   // 离得远的另一块并点
    eq(k.faceCount(), 3, "背靠背那两张该还在（另一块的三角塌了）");
  });
});

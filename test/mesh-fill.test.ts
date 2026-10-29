// 复制 / 补洞 / 桥接（mesh/ops/duplicate.ts；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「12做」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, duplicateGeometry, fillOrBridge } from "../src/mesh/ops/index.ts";
import { recalcNormals } from "../src/mesh/ops/orient.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
const faceAtZ = (k: MeshKernel, z: number) => k.faces().find((f) => k.faceVerts(f).every((v) => Math.abs(k.pt(v).z - z) < 1e-9))!;
const openEdges = (k: MeshKernel) => k.edges().filter((e) => k.eFaces(e).length === 1);

describe("复制 / 补洞 / 桥接（duplicate.ts）", () => {
  it("复制顶面：多一张面四个点、叠在原处，原件不动", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const top = faceAtZ(k, 1), f0 = k.faceCount(), v0 = k.vertexCount();
    const r = duplicateGeometry(k, { faces: [top] });
    eq(k.faceCount(), f0 + 1); eq(k.vertexCount(), v0 + 4); eq(r.faces.length, 1);
    assert(k.faceVerts(r.faces[0]).every((v) => Math.abs(k.pt(v).z - 1) < 1e-12) && k.hasF(top));
  });
  it("补洞：去掉顶面的盒子选那一圈开口边 → 补回一张面，封闭、朝向一致（重算法向一张都不用翻）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.removeFace(faceAtZ(k, 1));
    const r = fillOrBridge(k, { edges: openEdges(k) });
    assert(typeof r !== "string" && r.kind === "fill" && r.faces.length === 1, String(r));
    eq(openEdges(k).length, 0); eq(recalcNormals(k.clone()).flipped, 0); eq(k.check().join(";"), "");
  });
  it("桥接：两截开口的管子（下面那截开顶、上面那截开底）→ 中间连四张四边形，整个变成封闭的盒子、朝向一致", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); addBox(k, P(0.1, 0.05, 2), P(1.1, 1.05, 3));
    k.removeFace(faceAtZ(k, 1)); k.removeFace(faceAtZ(k, 2));
    const r = fillOrBridge(k, { edges: openEdges(k) });
    assert(typeof r !== "string" && r.kind === "bridge" && r.faces.length === 4, String(r));
    eq(openEdges(k).length, 0); eq(recalcNormals(k.clone()).flipped, 0); eq(k.check().join(";"), "");
  });
  it("不合格的说人话：边没连成圈 / 两圈点数不一样", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.removeFace(faceAtZ(k, 1));
    const two = openEdges(k).slice(0, 2);
    assert(typeof fillOrBridge(k, { edges: two }) === "string");
  });
});

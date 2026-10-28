// 网格体镜像（mesh/mirror.ts；2026-10-28 Claude Opus 5.5；纪元账本 FM23 / FM39 / FM134 / FM136）。
// 标准答案：中缝切开的盒子 = 每个点都找得到对面；挪一个点对面跟着镜、中缝上的点钉回镜像面；强行对称以后两边严格镜像、封闭、朝向一致；对称对齐只动选中的。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, loopCut } from "../src/mesh/ops/index.ts";
import { bisectPlane, mirrorPairs, mirrorMoves, sideOfChange, straddlingFaces, symmetrize, snapToSymmetry } from "../src/mesh/mirror.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
/** 以 x = 0 为中缝的盒子（-1..1 × 0..1 × 0..1），中缝上切一圈：两半各 5 张面。 */
function halvedBox(): MeshKernel {
  const m = new MeshKernel(); addBox(m, P(-1, 0, 0), P(1, 1, 1));
  const e = m.edges().find((x) => Math.abs(m.pt(m.edgeA[x]).x - m.pt(m.edgeB[x]).x) > 1)!;
  loopCut(m, e, 0.5);
  return m;
}
function closedConsistent(m: MeshKernel): number {
  let bad = 0;
  for (const e of m.edges()) { const fs = [...m.eFaces(e)]; if (fs.length !== 2) { bad++; continue; } const a = m.edgeA[e], b = m.edgeB[e]; const d = (f: number): number => { const r = m.faceVerts(f), i = r.indexOf(a); return r[(i + 1) % r.length] === b ? 1 : -1; }; if (d(fs[0]) === d(fs[1])) bad++; }
  return bad;
}
const symmetric = (m: MeshKernel): boolean => { const p = mirrorPairs(m, 0); return m.verts().every((v) => (p.get(v) ?? -1) >= 0); };

describe("镜像（mesh/mirror.ts）", () => {
  it("配对：中缝切开的盒子 12 个点全找得到对面；中缝上的 4 个点 = 自己", () => {
    const m = halvedBox(), p = mirrorPairs(m, 0);
    eq(m.vertexCount(), 12); eq([...p.values()].filter((w) => w < 0).length, 0);
    eq(m.verts().filter((v) => p.get(v) === v).length, 4);
  });
  it("镜像编辑：挪 +x 一个角，对面那个角镜过去；挪中缝上的点 = 钉回 x = 0；动得多的一边说了算", () => {
    const m = halvedBox(), v = m.verts().find((x) => { const q = m.pt(x); return q.x === 1 && q.y === 1 && q.z === 1; })!;
    const r = mirrorMoves(m, [{ v, to: P(1.2, 1.1, 1.3) }], 0);
    eq(r.mirrored, 1); eq(r.moves.length, 2);
    const w = r.moves.find((x) => x.v !== v)!; eq(JSON.stringify(w.to), JSON.stringify(P(-1.2, 1.1, 1.3)));
    const c = m.verts().find((x) => m.pt(x).x === 0)!, rc = mirrorMoves(m, [{ v: c, to: P(0.3, 0.2, 0.1) }], 0);
    eq(rc.pinned, 1); eq(rc.moves[0].to.x, 0);
    const u = m.verts().find((x) => { const q = m.pt(x); return q.x === -1 && q.y === 1 && q.z === 1; })!;
    const rb = mirrorMoves(m, [{ v, to: P(1.5, 1, 1) }, { v: u, to: P(-1.1, 1, 1) }], 0);
    eq(JSON.stringify(rb.moves.find((x) => x.v === u)!.to), JSON.stringify(P(-1.5, 1, 1)), "+x 挪了 0.5、-x 只挪 0.1：+x 说了算");
  });
  it("强行对称：+x 边拉歪 / 加了一张面以后对称化 → 两边严格镜像、封闭、朝向一致、check 干净", () => {
    const m = halvedBox();
    const v = m.verts().find((x) => { const q = m.pt(x); return q.x === 1 && q.y === 1 && q.z === 1; })!;
    m.setPos(v, P(1.3, 1.2, 1.4));
    eq(straddlingFaces(m, 0), 0);
    const r = symmetrize(m, 0, 1);
    assert(symmetric(m), "两边严格镜像"); eq(m.faceCount(), 10); eq(r.added, 5); eq(closedConsistent(m), 0); eq(m.check().join("\n"), "");
    const w = m.verts().find((x) => { const q = m.pt(x); return Math.abs(q.x + 1.3) < 1e-12; })!;
    eq(JSON.stringify(m.pt(w)), JSON.stringify(P(-1.3, 1.2, 1.4)));
  });
  it("强行对称会自己沿镜像面切开（user 10-28「镜像你忘了做切割」）：没切过的盒子拉歪一个角 → 切开 4 条边、两边严格镜像、封闭、朝向一致", () => {
    const m = new MeshKernel(); addBox(m, P(-1, 0, 0), P(1, 1, 1));
    eq(straddlingFaces(m, 0), 4);
    const v = m.verts().find((x) => { const q = m.pt(x); return q.x === 1 && q.y === 1 && q.z === 1; })!;
    m.setPos(v, P(1.4, 1.2, 1.3));
    const r = symmetrize(m, 0, 1);
    eq(r.cutEdges, 4); eq(straddlingFaces(m, 0), 0);
    assert(symmetric(m), "两边严格镜像"); eq(m.faceCount(), 10); eq(closedConsistent(m), 0); eq(m.check().join("\n"), "");
    eq(m.verts().filter((x) => m.pt(x).x === 0).length, 4, "中缝上 4 个点，钉在镜像面上");
  });
  it("凹的面也劈得开（user 10-28「凹为什么劈不开，努力一下？」）：开口朝 +x 的「匚」= 镜像面穿过四次 → 劈成三块（背一块、上下两条臂各一块）；对称以后 4 块", () => {
    const m = new MeshKernel();
    const ring = [P(-2, 0, 0), P(2, 0, 0), P(2, 0, 1), P(-1, 0, 1), P(-1, 0, 2), P(2, 0, 2), P(2, 0, 3), P(-2, 0, 3)].map((q) => m.addVertex(q));
    m.addFace(ring);
    const r = bisectPlane(m, 0);
    eq(r.cutEdges, 4); eq(r.splitFaces, 1); eq(r.left, 0); eq(m.faceCount(), 3); eq(straddlingFaces(m, 0), 0); eq(m.check().join("\n"), "");
    const s2 = symmetrize(m, 0, 1);
    eq(m.faceCount(), 4); eq(s2.removedFaces, 1); assert(symmetric(m), "两边严格镜像"); eq(m.check().join("\n"), "");
  });
  it("沿镜像面切开（bisectPlane）单独用：只切跨过的、已经在中缝上的边不动", () => {
    const m = new MeshKernel(); addBox(m, P(-1, 0, 0), P(1, 1, 1));
    const r = bisectPlane(m, 0);
    eq(r.cutEdges, 4); eq(r.splitFaces, 4); eq(r.left, 0); eq(m.faceCount(), 10); eq(closedConsistent(m), 0);
    eq(bisectPlane(m, 0).cutEdges, 0, "再切一次什么都不动");
  });
  it("这一步动了哪边：挪 -x 的点 = -1；新长出来在 +x = +1；没动 = 0", () => {
    const a = halvedBox(), b = a.clone();
    const v = b.verts().find((x) => b.pt(x).x === -1)!; b.setPos(v, P(-1.4, 0, 0));
    eq(sideOfChange(a, b, 0), -1); eq(sideOfChange(a, a.clone(), 0), 0);
    const c = a.clone(); c.addVertex(P(2, 0, 0)); eq(sideOfChange(a, c, 0), 1);
  });
  it("对称对齐：只动选中的；默认以选区重心那边为准；对面找不到的数出来", () => {
    const m = halvedBox();
    const v = m.verts().find((x) => { const q = m.pt(x); return q.x === -1 && q.y === 1 && q.z === 1; })!;
    m.setPos(v, P(-1.004, 1.003, 1));   // 歪 5 mm
    const w = m.verts().find((x) => { const q = m.pt(x); return q.x === 1 && q.y === 1 && q.z === 1; })!;
    const r = snapToSymmetry(m, [v, w], 0, 0.01);   // 重心在 -x（-1.004 + 1 < 0）→ 以 -x 为准
    eq(r.pairs, 1); eq(JSON.stringify(m.pt(w)), JSON.stringify(P(1.004, 1.003, 1)));
    const r2 = snapToSymmetry(m, [v, w], 0, 0.01, "flip");
    eq(r2.pairs, 1); eq(JSON.stringify(m.pt(v)), JSON.stringify(P(-1.004, 1.003, 1)), "已经对齐了，另一边为准也不变");
    const lone = new MeshKernel(); addBox(lone, P(0.5, 0, 0), P(1, 1, 1));
    eq(snapToSymmetry(lone, lone.verts(), 0, 0.01).unpaired, 8);
  });
});

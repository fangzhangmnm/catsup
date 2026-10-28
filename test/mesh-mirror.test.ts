// 网格体镜像（mesh/mirror.ts；2026-10-28 Claude Opus 5.5；纪元账本 FM23 / FM39 / FM134 / FM136）。
// 标准答案：中缝切开的盒子 = 每个点都找得到对面；挪一个点对面跟着镜、中缝上的点钉回镜像面；强行对称以后两边严格镜像、封闭、朝向一致；对称对齐只动选中的。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox, loopCut, mergeVerts } from "../src/mesh/ops/index.ts";
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
  // ---- 挪点的纪律（2026-10-28 晚 Claude Fable 5.1；设计稿 20261028-mirror-redo-design.md §1；账本 UX31）----
  const corner = (m: MeshKernel, x: number, y: number, z: number): number => m.verts().find((v) => { const q = m.pt(v); return q.x === x && q.y === y && q.z === z; })!;
  it("R1 钉：两种模式都一样——中缝上的点往外拖只在面内滑（x 永远 0），不并不裂（user「中间的点往外拖不应该变成两个点，而是被吸附在中线上」）", () => {
    const m = halvedBox(), c = corner(m, 0, 1, 1);
    for (const mode of ["edit", "force"] as const) {
      const r = mirrorMoves(m, [{ v: c, to: P(0.4, 1.2, 1.1) }], 0, mode);
      eq(r.pinned, 1); eq(r.merges.length, 0); eq(r.moves.length, 1); eq(JSON.stringify(r.moves[0].to), JSON.stringify(P(0, 1.2, 1.1)));
    }
  });
  it("R3 不穿 + R2 并：+x 的角拖过镜像面 → 停在中缝、和对面的角并成一个（两种模式）→ 11 个点、自检干净、仍对称、角塌成中缝上的一道折（折边 4 张面）；强行对称再对称化也不多不少", () => {
    for (const mode of ["edit", "force"] as const) {
      const m = halvedBox(), v = corner(m, 1, 1, 1), w = corner(m, -1, 1, 1);
      const r = mirrorMoves(m, [{ v, to: P(-0.5, 0.5, 0.5) }], 0, mode);
      eq(r.clamped, 1); eq(r.merges.length, 1); eq(r.merges[0].keep, v); eq(JSON.stringify(r.merges[0].drop), JSON.stringify([w])); eq(r.merges[0].at.x, 0);
      assert(!r.moves.some((x) => x.v === w), "被并走的孪生点不再单独挪");
      for (const mv of r.moves) m.setPos(mv.v, mv.to);
      mergeVerts(m, [r.merges[0].keep, ...r.merges[0].drop], r.merges[0].at);
      const creases = (): number => m.edges().filter((e) => m.eFaces(e).length === 4).length;
      eq(m.vertexCount(), 11); eq(m.check().length, 0); assert(symmetric(m), mode); eq(m.faceCount(), 10); eq(creases(), 1, "并进中缝的点到它中缝邻居的那条边 = 两半共用的折边（4 张面；这个角只有一个中缝邻居）");
      assert(m.edges().every((e) => m.eFaces(e).length === 2 || m.eFaces(e).length === 4));
      if (mode === "force") { const s = symmetrize(m, 0, 1); eq(s.cutEdges, 0); eq(m.vertexCount(), 11); eq(m.faceCount(), 10); assert(symmetric(m)); eq(creases(), 1); }
    }
  });
  it("R2 落在中缝点上：拖到一个已有中缝点的位置 → 孪生点和那个中缝点一起并进来（不留重合点），退化的面自动清掉（10 个点、自检干净、封闭朝向一致）", () => {
    const m = halvedBox(), v = corner(m, 1, 1, 1), w = corner(m, -1, 1, 1), s0 = corner(m, 0, 1, 1);
    const r = mirrorMoves(m, [{ v, to: P(-0.3, 1, 1) }], 0, "edit");
    eq(r.merges.length, 1); eq(JSON.stringify([...r.merges[0].drop].sort((a, b) => a - b)), JSON.stringify([w, s0].sort((a, b) => a - b)));
    for (const mv of r.moves) m.setPos(mv.v, mv.to);
    mergeVerts(m, [r.merges[0].keep, ...r.merges[0].drop], r.merges[0].at);
    eq(m.vertexCount(), 10); eq(m.check().length, 0); assert(symmetric(m)); eq(closedConsistent(m), 0);
  });
  it("动了哪边：+x 的点夹到中缝上，算 +x 动了（不然对称化会把这一边删了）", () => {
    const m = halvedBox(), a = m.clone(); m.setPos(corner(m, 1, 1, 1), P(0, 1, 1));
    eq(sideOfChange(a, m, 0), 1);
  });
  it("R4 清夹层：闭合盒子贴着镜像面的那张面，对称以后夹在两半中间 → 删掉（10 张面、封闭朝向一致）；孤零零躺在镜像面上的一张平面 → 留着", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const r = symmetrize(m, 0, 1);
    eq(r.walls, 1); eq(m.faceCount(), 10); eq(closedConsistent(m), 0); assert(symmetric(m));
    const p = new MeshKernel(), a = p.addVertex(P(0, 0, 0)), b = p.addVertex(P(0, 1, 0)), c = p.addVertex(P(0, 1, 1)), d = p.addVertex(P(0, 0, 1)); p.addFace([a, b, c, d]);
    const r2 = symmetrize(p, 0, 1); eq(r2.walls, 0); eq(p.faceCount(), 1);
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

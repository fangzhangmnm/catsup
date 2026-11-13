// 环切能滑、能切几圈（W-8，2026-11-10 Claude Opus 5.5）：位置沿整圈量在同一侧；N 圈均分；t = 0.5 时和以前一样。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { loopCut, loopCuts } from "../src/mesh/ops/index.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

/** 一圈竖着的四边形带（围着 z 轴的方管，n 格），竖边的编号故意一半朝上一半朝下（顶点编号交错），环切会横着切过所有竖边。 */
function tube(n = 6): { k: MeshKernel; start: number } {
  const k = new MeshKernel(), lo: number[] = [], hi: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n, p = (z: number): Pt3 => ({ x: Math.cos(a), y: Math.sin(a), z });
    if (i % 2) { hi.push(k.addVertex(p(1))); lo.push(k.addVertex(p(0))); } else { lo.push(k.addVertex(p(0))); hi.push(k.addVertex(p(1))); }
  }
  for (let i = 0; i < n; i++) { const j = (i + 1) % n; k.addFace([lo[i], lo[j], hi[j], hi[i]], FRESH); }
  return { k, start: k.edgeOf(lo[0], hi[0]) };
}
const zs = (k: MeshKernel, vs: readonly number[]): number[] => [...new Set(vs.map((v) => Math.round(k.pt(v).z * 1e9) / 1e9))].sort((a, b) => a - b);

describe("环切：位置沿整圈同一侧（W-8）", () => {
  it("t = 0.3：整圈的新点都在同一个高度（以前每条边各从自己编号小的那一端量，竖边朝向不一致时切成锯齿）", () => {
    const { k, start } = tube(), z0 = k.pt(k.edgeA[start]).z, r = loopCut(k, start, 0.3);
    eq(r.edges.length, 6); assert(r.closed, "闭合");
    eq(zs(k, r.newVerts).join(), String(Math.abs(z0 - 0.3)), "同一个高度");
    eq(k.check().length, 0);
  });
  it("t = 0.5：和以前一样在正中间", () => {
    const { k, start } = tube(), r = loopCut(k, start, 0.5);
    eq(zs(k, r.newVerts).join(), "0.5");
  });
  it("3 圈：均分在 1/4、1/2、3/4，三圈各 6 条边；网格体规矩照旧", () => {
    const { k, start } = tube(), r = loopCuts(k, start, 3, 0.9);
    eq(r.edges.length, 18); eq(zs(k, r.newVerts).join(), "0.25,0.5,0.75");
    eq(k.faceCount(), 24); eq(k.check().length, 0);
  });
  it("1 圈 = loopCut 原样；起手那条边切不出 = 空结果", () => {
    const a = tube(), b = tube();
    loopCuts(a.k, a.start, 1, 0.3); loopCut(b.k, b.start, 0.3);
    eq(JSON.stringify(a.k.toSnapshot()), JSON.stringify(b.k.toSnapshot()));
    const k = new MeshKernel(), v = [0, 1, 2].map((i) => k.addVertex({ x: i, y: i * i, z: 0 })); k.addFace(v, FRESH);
    eq(loopCuts(k, k.edges()[0], 3).edges.length, 0);
  });
});

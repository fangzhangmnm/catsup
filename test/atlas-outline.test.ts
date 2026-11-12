// 画布小窗的数据（施工单十六第二节）：片里的边细、片的外沿粗、第几片、盖住 / 共用多少格、一点落在哪几张面里。created 2026-11-11 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string };
import { atlasOutline, type AtlasMesh } from "../src/paint/atlas-outline.ts";

/** 假网格体：面 = 点编号的环 + 角上的坐标（格）。 */
function fake(faces: Record<number, { v: number[]; uv: number[] }>): AtlasMesh {
  return { faceVerts: (f) => faces[f].v, cornerValues: (f) => (faces[f] ? Float32Array.from(faces[f].uv) : null) };
}
const segs = (a: Float32Array): number => a.length / 4;

describe("画布小窗的数据（atlas-outline）", () => {
  it("两张面共一条边、坐标也连着 = 一片：中间那条边细、外面六条粗；盖住的格数 = 两张面的面积", () => {
    // 0-1-2-3 和 1-4-5-2，画布上 [0,4]×[0,4] 和 [4,8]×[0,4]
    const m = fake({ 0: { v: [0, 1, 2, 3], uv: [0, 0, 4, 0, 4, 4, 0, 4] }, 1: { v: [1, 4, 5, 2], uv: [4, 0, 8, 0, 8, 4, 4, 4] } });
    const o = atlasOutline(m, "uv", [0, 1], 16, 16);
    eq(o.patches, 1); eq(segs(o.thin), 1, "中间那条边"); eq(segs(o.thick), 6, "外沿");
    eq(o.covered, 32); eq(o.shared, 0);
    eq(o.facesAt(2, 2).join(","), "0"); eq(o.facesAt(6, 1).join(","), "1"); eq(o.facesAt(12, 12).join(","), "");
  });
  it("共一条边但画布上分开放（缝）= 两片：那条边两边各一条粗线；片的编号按画布上从上到下、从左到右", () => {
    const m = fake({ 0: { v: [0, 1, 2, 3], uv: [0, 8, 4, 8, 4, 12, 0, 12] }, 1: { v: [1, 4, 5, 2], uv: [8, 0, 12, 0, 12, 4, 8, 4] } });
    const o = atlasOutline(m, "uv", [0, 1], 16, 16);
    eq(o.patches, 2); eq(segs(o.thin), 0); eq(segs(o.thick), 8);
    eq(o.patchOf.get(1), 1, "上面那片是第 1 片"); eq(o.patchOf.get(0), 2);
  });
  it("镜像两半叠着放（两张面同一块坐标）= 盖住只算一次、共用算上；叠着的边只画一次；一点落在两张面里", () => {
    const m = fake({ 0: { v: [0, 1, 2], uv: [0, 0, 4, 0, 0, 4] }, 1: { v: [3, 4, 5], uv: [0, 0, 4, 0, 0, 4] } });
    const o = atlasOutline(m, "uv", [0, 1], 8, 8);
    eq(o.covered, o.shared, "每个盖住的格子都是两张面"); assert(o.covered > 0, "有盖住的");
    eq(segs(o.thick), 3, "三条边各画一次"); eq(o.facesAt(1, 1).join(","), "0,1");
  });
  it("接缝（施工单二十二 B）：给了 seamAt、是接缝的边不进细 / 粗，进 seam（片里的、外沿的都算）；不给 = 没有 seam", () => {
    const m = fake({ 0: { v: [0, 1, 2, 3], uv: [0, 0, 4, 0, 4, 4, 0, 4] }, 1: { v: [1, 4, 5, 2], uv: [4, 0, 8, 0, 8, 4, 4, 4] } });
    const seam = (a: number, b: number): boolean => (a === 1 && b === 2) || (a === 2 && b === 1) || (a === 0 && b === 1) || (a === 1 && b === 0);
    const o = atlasOutline(m, "uv", [0, 1], 16, 16, seam);
    eq(segs(o.seam), 2, "片里那条 + 外沿一条"); eq(segs(o.thin), 0); eq(segs(o.thick), 5); eq(o.patches, 1, "标了接缝还没重新展开 = 片还是连着的");
    eq(segs(atlasOutline(m, "uv", [0, 1], 16, 16).seam), 0);
  });
  it("没有坐标的面不算；不在这张 atlas 上的面不传进来就不算", () => {
    const m = fake({ 0: { v: [0, 1, 2, 3], uv: [0, 0, 4, 0, 4, 4, 0, 4] } });
    const o = atlasOutline(m, "uv", [0, 7], 8, 8);
    eq(o.faces.join(","), "0"); eq(o.patches, 1);
  });
  it("两半之间的缝：「看」那一半（ui/image-view.ts）不 import 三维的东西（场景 / 编辑器 / 画画 / 渲染 / 内核），以后原样搬进共享面板库", () => {
    const src = readFileSync("src/app/ui/image-view.ts", "utf8"), imports = [...src.matchAll(/^import[^;]*from\s+"([^"]+)"/gm)].map((m) => m[1]);
    eq(imports.filter((p) => /scene|editor|paint|minccino|kernel|mesh|format/.test(p)).join(","), "", "image-view.ts 只认识图和线");
  });
});

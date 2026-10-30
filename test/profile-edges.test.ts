// SU 轮廓线判定（家族周账 F-87：user 10-25 截图「圆柱正面那圈边线一段粗一段细」）。profile-edges.ts 是 render3 着色器的 TS 镜像。created 2026-10-26 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { Kernel, type Pt3 } from "../src/kernel/kernel.ts";
import { CONTOUR_ONLY, inwardAcrossEdge, isSilhouette, lineKind } from "../src/editor/profile-edges.ts";
import { buildEdgeRec } from "../src/editor/pool-mesh.ts";

const sub = (a: Pt3, b: Pt3): Pt3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
function decide(k: Kernel, eye: Pt3, pick: (a: Pt3, b: Pt3) => boolean): { at: Pt3; sil: boolean }[] {
  const out: { at: Pt3; sil: boolean }[] = [];
  for (const e of k.edges()) {
    if (e.faceLinks.length !== 2) continue;
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    if (!pick(a, b)) continue;
    const [fA, fB] = e.faceLinks;
    out.push({ at: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, z: (a.z + b.z) / 2 }, sil: isSilhouette(inwardAcrossEdge(k, fA, e.id, a, b), inwardAcrossEdge(k, fB, e.id, a, b), a, b, sub(a, eye)) });
  }
  return out;
}

describe("SU 轮廓线判定（F-87）", () => {
  it("圆柱从斜上方正面看：顶圈朝镜头那半圈全是内边（细）、背面那半圈全是剪影（粗）——不再一段粗一段细", () => {
    const N = 24, pts = Array.from({ length: N }, (_, i) => ({ x: Math.cos((i / N) * 2 * Math.PI + 0.13), y: Math.sin((i / N) * 2 * Math.PI + 0.13), z: 0 }));
    const k = new Kernel(); k.addEdges(pts.map((p, i) => [p, pts[(i + 1) % N]] as const), { curve: true }); k.pushPull(k.faces()[0].id, 1);
    const eye = { x: 0, y: -6, z: 4 };   // 正前方偏上
    const rim = decide(k, eye, (a, b) => Math.abs(a.z - 1) < 1e-9 && Math.abs(b.z - 1) < 1e-9);
    eq(rim.length, N);
    for (const r of rim) {
      const ang = (Math.atan2(r.at.y, r.at.x) * 180) / Math.PI;
      if (ang < -20 && ang > -160) assert(!r.sil, `前半圈 ${ang.toFixed(0)}° 应是内边`);
      if (ang > 20 && ang < 160) assert(r.sil, `背面 ${ang.toFixed(0)}° 应是剪影`);
    }
  });
  it("立方体斜着看：轮廓那六条是剪影，朝镜头那个角上的三条是内边", () => {
    const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs: [Pt3, Pt3][] = [];
    for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([{ x: a[0], y: a[1], z: 0 }, { x: b[0], y: b[1], z: 0 }], [{ x: a[0], y: a[1], z: 1 }, { x: b[0], y: b[1], z: 1 }], [{ x: a[0], y: a[1], z: 0 }, { x: a[0], y: a[1], z: 1 }]); }
    const k = new Kernel(); k.addEdges(segs);
    const eye = { x: 5, y: -4, z: 6 };   // 看得见 x=1、y=0、z=1 三张面，(1,0,1) 那个角朝镜头
    const all = decide(k, eye, () => true);
    eq(all.length, 12);
    const corner = all.filter((r) => [r.at.x === 1 || r.at.x === 0.5, r.at.y === 0 || r.at.y === 0.5, r.at.z === 1 || r.at.z === 0.5].every(Boolean) && (r.at.x === 1 ? 1 : 0) + (r.at.y === 0 ? 1 : 0) + (r.at.z === 1 ? 1 : 0) === 2);
    eq(corner.length, 3, "角上三条");
    for (const r of corner) assert(!r.sil, `角上的边 ${JSON.stringify(r.at)} 是内边`);
    eq(all.filter((r) => r.sil).length, 6, "轮廓六条");
  });
  it("软边 / 折线 = 只在转成外轮廓时画（I12，user 10-30「软边没有变成外轮廓」→ 拍「沿软边画折线、不画交线」）：着色器判法的 CPU 镜像", () => {
    eq(lineKind(2, true), "profile"); eq(lineKind(2, false), "inner"); eq(lineKind(1, false), "profile"); eq(lineKind(0, false), "profile"); eq(lineKind(3, false), "profile");
    eq(lineKind(2 + CONTOUR_ONLY, true), "profile", "软边转成外轮廓 = 画（加粗）");
    eq(lineKind(2 + CONTOUR_ONLY, false), "hidden", "软边在面中间 = 不画");
    eq(lineKind(1 + CONTOUR_ONLY, true), "hidden", "只挨一张面的软边不画（软边要夹在两张面之间才谈得上转折）");
    eq(lineKind(-1, true), "hidden", "-1 = 由标记那份画");
  });
  it("收集边：粗线那条路软边进线批、旗带 CONTOUR_ONLY；细线那条路照旧不进；藏起来的边两条路都不进", () => {
    const k = new Kernel();
    const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
    k.addEdges([[P(0, 0, 0), P(1, 0, 0)], [P(1, 0, 0), P(1, 1, 0)], [P(1, 1, 0), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)], [P(0, 0, 0), P(1, 1, 0)]]);
    const diag = k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return Math.abs(a.x - a.y) < 1e-9 && Math.abs(b.x - b.y) < 1e-9; })!;
    k.setEdgeLayer("soft", [diag.id], true);
    eq(buildEdgeRec(k, diag.id), null, "细线：软边不进");
    eq(buildEdgeRec(k, diag.id, true)?.flag, 2 + CONTOUR_ONLY, "粗线：软边进、旗 = 两张面 + CONTOUR_ONLY");
    const side = k.edges().find((e) => e.id !== diag.id)!;
    eq(buildEdgeRec(k, side.id, true)?.flag, 1, "普通边界边旗不变");
    k.setEdgeLayer("hidden", [side.id], true);
    assert(k.isEdgeHidden(side.id), "藏上了"); eq(buildEdgeRec(k, side.id, true), null, "藏起来的边粗线也不进");
  });
});

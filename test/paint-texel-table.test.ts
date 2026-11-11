// 格子归属表、取样点、一格在面上的位置（贴图主线 1-3a 第三节，施工单 ai-docs/20261110-paint-workorders-7.md + Fable 11-10 深夜裁定 B）的性质。created 2026-11-10 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { addBox, extrudeFaces } from "../src/mesh/ops/index.ts";
import { symmetrize } from "../src/mesh/mirror.ts";
import { layoutFaces } from "../src/paint/layout.ts";
import { buildTexelTable, cellPosition, distToPoly, inPoly, nearestOnPoly, paintFaces, positionAt, positionOnFace, samplePoint, sampleOffset, SAMPLE_Q, MAX_GAP, formulaOf, type PaintFace, type TexelTable } from "../src/paint/texel-table.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const UV = "uv";
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
const dist3 = (a: Pt3, b: Pt3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
/** 一个网格体：盒子 + 挤出过的五边形柱 + 几张三角形 + 一张扭过的四边形；铺好、写进 uv 那一列。 */
function painted(seed: number, density = 40): { k: MeshKernel; t: TexelTable; twisted: number } {
  const k = new MeshKernel(), r = rng(seed);
  addBox(k, P(0, 0, 0), P(0.6 + 0.4 * r(), 0.5, 0.8));
  const pent = k.addFace([0, 1, 2, 3, 4].map((i) => k.addVertex(P(3 + 0.5 * Math.cos((2 * Math.PI * i) / 5), 0.5 * Math.sin((2 * Math.PI * i) / 5), 0))), -1, FRESH);
  extrudeFaces(k, [pent]);
  for (const v of k.faceVerts(pent)) { const p = k.pt(v); k.setPos(v, { ...p, z: p.z + 0.7 }); }
  for (let i = 0; i < 3; i++) k.addFace([P(6 + i, 0, 0), P(6.4 + i, 0.1 * r(), 0.3), P(6.1 + i, 0.6, 0.1)].map((p) => k.addVertex(p)), -1, FRESH);
  const twisted = k.addFace([P(10, 0, 0), P(11, 0, 0.2), P(11, 0.8, 0), P(10, 0.8, 0.25)].map((p) => k.addVertex(p)), -1, FRESH);
  k.addColumn({ guid: UV, arity: 2 });
  const lay = layoutFaces(k, k.faces(), { density });
  if (!lay.ok) throw new Error(lay.reason);
  for (const [f, v] of lay.values) k.setFaceValues(f, UV, [...v]);
  return { k, t: buildTexelTable(lay.width, lay.height, paintFaces(k, UV), 4), twisted };
}
/** 空间点 → 在空间三角形 (A, B, C) 里的重心坐标（投到三角形平面上解）。 */
function bary3(p: Pt3, A: Pt3, B: Pt3, C: Pt3): [number, number, number] {
  const v0 = { x: B.x - A.x, y: B.y - A.y, z: B.z - A.z }, v1 = { x: C.x - A.x, y: C.y - A.y, z: C.z - A.z }, v2 = { x: p.x - A.x, y: p.y - A.y, z: p.z - A.z };
  const d = (a: Pt3, b: Pt3): number => a.x * b.x + a.y * b.y + a.z * b.z;
  const d00 = d(v0, v0), d01 = d(v0, v1), d11 = d(v1, v1), d20 = d(v2, v0), d21 = d(v2, v1), den = d00 * d11 - d01 * d01;
  const v = (d11 * d20 - d01 * d21) / den, w = (d00 * d21 - d01 * d20) / den;
  return [1 - v - w, v, w];
}

describe("格子归属表、取样点、一格在面上的位置（1-3a 第三节，裁定 B）", () => {
  it("① 中心严格在某块画布多边形里面的格子，归属就是它；第一段的铺法没有重叠；块边上（间隔一半以内）的格子也有人要", () => {
    for (const seed of [1, 2, 3]) {
      const { t } = painted(seed);
      eq(t.overlapCells, 0, "没有重叠");
      let inside = 0, border = 0;
      for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
        const c = t.owner[y * t.width + x], ds = t.polys.map((r) => distToPoly(r, x + 0.5, y + 0.5)), dmin = Math.min(...ds);
        if (dmin > t.gap / 2) { eq(c, -1, `格 (${x}, ${y}) 太远应该没人要`); continue; }
        eq(c, ds.indexOf(dmin), `格 (${x}, ${y}) 归最近的（一样近归编号小的）`);
        if (dmin === 0) inside++; else border++;
      }
      assert(inside > 1000 && border > 100, `里面 ${inside} 格、块边上 ${border} 格`);
    }
  });
  it("② 取样点：中心在多边形里 = 中心；在外面 = 多边形上离中心最近的那一点、量化到 1/1024 格（1-4c：中心 + 整数 / 1024，每个轴离最近点不超过半份）", () => {
    const { t } = painted(4), half = 0.5 / SAMPLE_Q;
    let n = 0;
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
      const s = samplePoint(t, x, y);
      if (!s) continue;
      const r = t.polys[t.owner[y * t.width + x]], cx = x + 0.5, cy = y + 0.5, o = sampleOffset(t, x, y)!;
      eq(`${s}`, `${cx + o[0] / SAMPLE_Q},${cy + o[1] / SAMPLE_Q}`, "取样点 = 中心 + 整数份");
      assert(Number.isInteger(o[0]) && Number.isInteger(o[1]), "偏移是整数份");
      if (inPoly(r, cx, cy)) { eq(`${o}`, "0,0"); continue; }
      const q = nearestOnPoly(r, cx, cy);
      assert(Math.abs(s[0] - q[0]) <= half && Math.abs(s[1] - q[1]) <= half, `格 (${x}, ${y})：离最近点 (${s[0] - q[0]}, ${s[1] - q[1]})，每个轴只许半份`);
      assert(Math.abs(Math.hypot(s[0] - cx, s[1] - cy) - distToPoly(r, cx, cy)) <= Math.SQRT2 * half + 1e-12, "最近（差不超过量化挪开的那一点）"); n++;
    }
    assert(n > 100, `块边上的格子 ${n}`);
  });
  it("② 间隔超过 MAX_GAP（取样点偏移放不进 16 位）= 建表就抛，不静默算错", () => {
    const { t } = painted(4);
    const faces = [...t.faces.values()].map((f) => ({ face: f.face, ring: t.polys[f.poly], tris: f.tris }));
    buildTexelTable(t.width, t.height, faces, MAX_GAP);
    let threw = "";
    try { buildTexelTable(t.width, t.height, faces, MAX_GAP + 1); } catch (e) { threw = String(e); }
    assert(/gap 64 out of range/.test(threw), `gap ${MAX_GAP + 1} 要抛：${threw}`);
  });
  it("③ 往返：一格在它那张面上的位置，用算它的那个三角形三个角重心插值反算贴图坐标 = 取样点（≤ 千分之一格）", () => {
    const { t } = painted(5);
    let n = 0, worst = 0;
    for (let y = 0; y < t.height; y += 2) for (let x = 0; x < t.width; x += 2) {
      const s = samplePoint(t, x, y);
      if (!s) continue;
      for (const f of t.polyFaces[t.owner[y * t.width + x]]) {
        const hit = positionOnFace(t, f, s[0], s[1])!, tr = t.faces.get(f)!.tris.find((q) => q.tri === hit.tri)!, [a, b, c] = bary3(hit.pos, tr.pos[0], tr.pos[1], tr.pos[2]);
        worst = Math.max(worst, Math.abs(a * tr.uv[0] + b * tr.uv[2] + c * tr.uv[4] - s[0]), Math.abs(a * tr.uv[1] + b * tr.uv[3] + c * tr.uv[5] - s[1])); n++;
      }
    }
    assert(n > 500 && worst <= 1e-3, `查了 ${n} 格，最大差 ${worst}`);
  });
  it("③ 取样点压在两个三角形的公共边 / 公共点上：两个三角形的公式算出来一样（扭过的四边形也一样）", () => {
    const { t, twisted } = painted(6), r = rng(6);
    let n = 0;
    for (const fp of t.faces.values()) {
      const tris = fp.tris;
      for (let i = 0; i < tris.length; i++) for (let j = i + 1; j < tris.length; j++) {
        const A = tris[i].uv, B = tris[j].uv, shared: [number, number][] = [];
        for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (A[2 * a] === B[2 * b] && A[2 * a + 1] === B[2 * b + 1]) shared.push([A[2 * a], A[2 * a + 1]]);
        if (shared.length < 1) continue;
        const pts = shared.length === 2 ? Array.from({ length: 5 }, () => { const s = r(); return [shared[0][0] + s * (shared[1][0] - shared[0][0]), shared[0][1] + s * (shared[1][1] - shared[0][1])] as const; }) : [shared[0] as readonly [number, number]];
        for (const [x, y] of pts) { const d = dist3(positionAt(tris[i].formula, x, y), positionAt(tris[j].formula, x, y)); assert(d < 1e-7, `面 ${fp.face} 三角形 ${i}/${j}：差 ${d} 米`); n++; }
      }
    }
    assert(n > 20, `查了 ${n} 个点`); assert(t.faces.has(twisted), "扭过的四边形在里面");
  });
  it("③ 取样点在多边形的边上时，结果和怎么切无关：扭过的四边形换另一条对角线，块边上那些格子的位置只差量化挪开的那一点（1-4c）", () => {
    const { k, t, twisted } = painted(7), fp = t.faces.get(twisted)!, vs = k.faceVerts(twisted), uv = k.cornerValues(twisted, UV)!;
    const tri = (a: number, b: number, c: number, i: number): PaintFace["tris"][number] => ({ face: twisted, tri: i, uv: [uv[2 * a], uv[2 * a + 1], uv[2 * b], uv[2 * b + 1], uv[2 * c], uv[2 * c + 1]], pos: [k.pt(vs[a]), k.pt(vs[b]), k.pt(vs[c])] });
    const usesDiag02 = k.faceTriangles(twisted).some((tr) => tr.includes(0) && tr.includes(2));   // 现在切的是 0–2 那条对角线吗（按顶点下标认，角的起点转了也认得出）
    const other = usesDiag02 ? [tri(0, 1, 3, 0), tri(1, 2, 3, 1)] : [tri(0, 1, 2, 0), tri(0, 2, 3, 1)];
    const alt = buildTexelTable(t.width, t.height, [{ face: twisted, ring: Float64Array.from(uv), tris: other }], t.gap);
    // 1-4c：取样点量化过，离边上的那一点最多 δ = √2 / 2048 格；在边上两种切法逐位相同，挪开 δ 之后两边各自的公式（外推也算）最多各偏 |J|·2δ → 只许 4δ·max|J|
    const J = (q: { formula: { du: Pt3; dv: Pt3 } }): number => Math.hypot(q.formula.du.x, q.formula.du.y, q.formula.du.z, q.formula.dv.x, q.formula.dv.y, q.formula.dv.z);
    const maxJ = Math.max(...fp.tris.map(J), ...alt.faces.get(twisted)!.tris.map(J)), tol = 4 * (Math.SQRT2 * 0.5 / SAMPLE_Q) * maxJ + 1e-12;
    let n = 0, diffInside = 0;
    for (let y = 0; y < t.height; y++) for (let x = 0; x < t.width; x++) {
      if (t.owner[y * t.width + x] !== fp.poly) continue;
      const s = samplePoint(t, x, y)!, a = positionOnFace(t, twisted, s[0], s[1])!.pos, b = positionOnFace(alt, twisted, s[0], s[1])!.pos;
      if (!inPoly(t.polys[fp.poly], x + 0.5, y + 0.5) || distToPoly(t.polys[fp.poly], x + 0.5, y + 0.5) > 0) { assert(dist3(a, b) <= tol, `块边上的格 (${x}, ${y}) 两种切法差 ${dist3(a, b)}（只许 ${tol}）`); n++; }
      else if (dist3(a, b) > 1e-7) diffInside++;
    }
    assert(n > 20, `块边上查了 ${n} 格`); assert(diffInside > 0, "里面的格子两种切法确实不同（扭过的面）");
  });
  it("④ 镜像的两半指着同一块画布多边形；平的面上两半算出来的位置互为镜像", () => {
    const k = new MeshKernel(); addBox(k, P(0.3, 0, 0), P(1, 0.4, 0.7)); k.addColumn({ guid: UV, arity: 2 });
    const lay = layoutFaces(k, k.faces(), { density: 40 }); if (!lay.ok) throw new Error(lay.reason);
    for (const [f, v] of lay.values) k.setFaceValues(f, UV, [...v]);
    symmetrize(k, 0, 1);
    const t = buildTexelTable(lay.width, lay.height, paintFaces(k, UV), 4);
    eq(t.polyFaces.map((fs) => fs.length).join(), "2,2,2,2,2,2", "每块画布多边形正好两张面（这一半 + 镜过去的）");
    let n = 0;
    for (let y = 0; y < t.height; y += 3) for (let x = 0; x < t.width; x += 3) {
      const o = t.owner[y * t.width + x];
      if (o < 0) continue;
      const [fa, fb] = t.polyFaces[o], a = cellPosition(t, fa, x, y)!, b = cellPosition(t, fb, x, y)!;
      assert(Math.abs(a.x + b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9 && Math.abs(a.z - b.z) < 1e-9, `格 (${x}, ${y})：不是关于 x = 0 的镜像`); n++;
    }
    assert(n > 100, `查了 ${n} 格`);
  });
  it("④ 只挪点、不改贴图坐标：归属表和取样点逐位不变，只有位置变；对角线换了也一样", () => {
    const { k, t } = painted(8);
    const before = k.faces().map((f) => JSON.stringify(k.faceTriangles(f)));
    for (const v of k.verts()) { const p = k.pt(v); k.setPos(v, { x: p.x * 1.3 + 0.1, y: p.y, z: p.z + 0.2 * p.x }); }
    assert(k.faces().some((f, i) => JSON.stringify(k.faceTriangles(f)) !== before[i]), "有面换了对角线");
    const t2 = buildTexelTable(t.width, t.height, paintFaces(k, UV), 4);
    eq(t2.owner.every((o, i) => o === t.owner[i]), true, "归属表逐位不变");
    let same = true, moved = false;
    for (let y = 0; y < t.height; y += 3) for (let x = 0; x < t.width; x += 3) {
      const a = samplePoint(t, x, y), b = samplePoint(t2, x, y);
      if (`${a}` !== `${b}`) same = false;
      const o = t.owner[y * t.width + x];
      if (o >= 0 && dist3(cellPosition(t, t.polyFaces[o][0], x, y)!, cellPosition(t2, t.polyFaces[o][0], x, y)!) > 1e-6) moved = true;
    }
    assert(same, "取样点逐位不变"); assert(moved, "位置变了");
  });
  it("「部分重叠」按多边形报：两张面在画布上部分叠在一起 → 报出格数，每格仍只有一个归属", () => {
    const tri = (face: number, ring: number[]): PaintFace => ({ face, ring: Float64Array.from(ring), tris: [{ face, tri: 0, uv: [ring[0], ring[1], ring[2], ring[3], ring[4], ring[5]], pos: [P(0, 0, 0), P(1, 0, 0), P(0, 1, 0)] }] });
    const t = buildTexelTable(64, 64, [tri(0, [4, 4, 40, 4, 4, 40]), tri(1, [10, 10, 50, 10, 10, 50])], 4);   // 重叠区域 x ≥ 10、y ≥ 10、x + y ≤ 44：约 288 格
    assert(t.overlapCells > 200 && t.overlapCells < 320, `重叠 ${t.overlapCells} 格`);
    eq(t.owner[15 * 64 + 15], 0, "两块都盖住的格子归编号小的");
    eq(t.owner[45 * 64 + 12], 1, "只有第二块盖住的归它");
    eq(formulaOf([0, 0, 1, 0, 0, 1], [P(0, 0, 0), P(2, 0, 0), P(0, 3, 0)]).du.x, 2, "公式");
  });
});

// 落点（贴图主线 1-3a 第四节，施工单 ai-docs/20261110-paint-workorders-7.md + Fable 11-10 深夜裁定 B）的性质。created 2026-11-10 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, FF_HIDDEN } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { addBox, extrudeFaces } from "../src/mesh/ops/index.ts";
import { layoutFaces } from "../src/paint/layout.ts";
import { buildTexelTable, cellPosition, inPoly, nearestOnPoly, paintFaces, positionAt, type TexelTable } from "../src/paint/texel-table.ts";
import { buildTriGrid, pickSurface } from "../src/paint/surface-pick.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const UV = "uv";
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
/** 几块分开的凸东西（盒子、五边形柱、三角形、扭过的四边形），铺好、写进 uv。 */
function painted(seed: number): { k: MeshKernel; t: TexelTable } {
  const k = new MeshKernel(), r = rng(seed);
  addBox(k, P(0, 0, 0), P(0.6 + 0.4 * r(), 0.5, 0.8));
  const pent = k.addFace([0, 1, 2, 3, 4].map((i) => k.addVertex(P(3 + 0.5 * Math.cos((2 * Math.PI * i) / 5), 0.5 * Math.sin((2 * Math.PI * i) / 5), 0))), -1, FRESH);
  extrudeFaces(k, [pent]);
  for (const v of k.faceVerts(pent)) { const p = k.pt(v); k.setPos(v, { ...p, z: p.z + 0.7 }); }
  for (let i = 0; i < 3; i++) k.addFace([P(6 + i, 0, 0), P(6.4 + i, 0.1 * r(), 0.3), P(6.1 + i, 0.6, 0.1)].map((p) => k.addVertex(p)), -1, FRESH);
  k.addFace([P(10, 0, 0), P(11, 0, 0.2), P(11, 0.8, 0), P(10, 0.8, 0.25)].map((p) => k.addVertex(p)), -1, FRESH);
  k.addColumn({ guid: UV, arity: 2, kind: "uv" });
  const lay = layoutFaces(k, k.faces(), { density: 40 });
  if (!lay.ok) throw new Error(lay.reason);
  for (const [f, v] of lay.values) k.setFaceValues(f, UV, [...v]);
  return { k, t: buildTexelTable(lay.width, lay.height, paintFaces(k, UV), 4) };
}
const shoot = (k: MeshKernel, at: Pt3, f: number): { o: Pt3; d: Pt3 } => { const n = k.faceNormal(f); return { o: { x: at.x + 0.05 * n.x, y: at.y + 0.05 * n.y, z: at.z + 0.05 * n.z }, d: { x: -n.x, y: -n.y, z: -n.z } }; };

describe("落点（1-3a 第四节）", () => {
  it("随便取一格（中心在多边形里、离边至少四分之一格），用它在那张面上的位置从外面沿法向打回去：返回的就是这一格、这张面", () => {
    const { k, t } = painted(1), g = buildTriGrid(k), r = rng(1);
    let n = 0;
    while (n < 300) {
      const x = Math.floor(r() * t.width), y = Math.floor(r() * t.height), o = t.owner[y * t.width + x];
      if (o < 0) continue;
      const poly = t.polys[o], cx = x + 0.5, cy = y + 0.5;
      if (!inPoly(poly, cx, cy)) continue;
      const q = nearestOnPoly(poly, cx, cy); if (Math.hypot(q[0] - cx, q[1] - cy) < 0.25) continue;
      const f = t.polyFaces[o][0], at = cellPosition(t, f, x, y)!, { o: org, d } = shoot(k, at, f), hit = pickSurface(k, g, UV, org, d);
      assert(hit !== null && hit.inPaint, `格 (${x}, ${y}) 没打中`);
      if (hit && hit.inPaint) { eq(hit.face, f, `格 (${x}, ${y}) 打中的面`); eq(`${hit.cell}`, `${x},${y}`, `格 (${x}, ${y})`); }
      n++;
    }
  });
  it("打在两个三角形的公共边附近：返回的格子 = 贴图坐标往下取整（和显示时最近邻取样会取到的那一格相同），哪个三角形都一样", () => {
    const { k, t } = painted(2), g = buildTriGrid(k), r = rng(2);
    let n = 0;
    for (const fp of t.faces.values()) {
      if (fp.tris.length !== 2) continue;
      const [A, B] = fp.tris, shared: [number, number][] = [];
      for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (A.uv[2 * a] === B.uv[2 * b] && A.uv[2 * a + 1] === B.uv[2 * b + 1]) shared.push([A.uv[2 * a], A.uv[2 * a + 1]]);
      if (shared.length !== 2) continue;
      for (let q = 0; q < 10; q++) {
        const s = 0.1 + 0.8 * r(), u = shared[0][0] + s * (shared[1][0] - shared[0][0]), v = shared[0][1] + s * (shared[1][1] - shared[0][1]);
        if (Math.abs(u - Math.round(u)) < 0.05 || Math.abs(v - Math.round(v)) < 0.05) continue;   // 离格子线太近：取整对浮点太敏感，换一点
        const at = positionAt(A.formula, u, v), { o, d } = shoot(k, at, fp.face), hit = pickSurface(k, g, UV, o, d);
        assert(hit !== null && hit.inPaint, "打中"); if (!hit || !hit.inPaint) continue;
        eq(hit.face, fp.face); eq(`${hit.cell}`, `${Math.floor(u)},${Math.floor(v)}`, `面 ${fp.face} 对角线上 (${u}, ${v})`);
        assert(Math.abs(hit.uv[0] - u) < 1e-6 && Math.abs(hit.uv[1] - v) < 1e-6, "贴图坐标对得上"); n++;
      }
    }
    assert(n > 20, `查了 ${n} 个点`);
  });
  it("藏起来的面打不中（打穿过去打到后面那张）；打中的面不在这张画上 = 照实返回「打中了，但不在这张画上」；打空 = null", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.addColumn({ guid: UV, arity: 2, kind: "uv" });
    const lay = layoutFaces(k, k.faces(), { density: 20 }); if (!lay.ok) throw new Error(lay.reason);
    for (const [f, v] of lay.values) k.setFaceValues(f, UV, [...v]);
    const top = k.faces().find((f) => k.facePts(f).every((p) => p.z === 1))!, bottom = k.faces().find((f) => k.facePts(f).every((p) => p.z === 0))!;
    const down = { o: P(0.3, 0.6, 2), d: P(0, 0, -1) };
    eq(pickSurface(k, buildTriGrid(k), UV, down.o, down.d)?.face, top, "先打到顶面");
    k.faceFlags[top] |= FF_HIDDEN;
    eq(pickSurface(k, buildTriGrid(k), UV, down.o, down.d)?.face, bottom, "顶面藏起来：打穿到底面");
    const extra = k.addFace([P(5, 0, 0), P(6, 0, 0), P(6, 1, 0), P(5, 1, 0)].map((p) => k.addVertex(p)), -1, FRESH);
    const h = pickSurface(k, buildTriGrid(k), UV, P(5.5, 0.5, 1), P(0, 0, -1));
    assert(h !== null && h.face === extra && h.inPaint === false, "不在这张画上：照实说");
    eq(pickSurface(k, buildTriGrid(k), UV, P(20, 20, 20), P(1, 0, 0)), null, "打空");
  });
});

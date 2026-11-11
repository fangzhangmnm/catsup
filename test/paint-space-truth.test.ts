// 空间里的笔：标准答案（贴图主线 1-4a 第四节 + 第六节测试 9 的格子那一半、测试 11 铺法换掉结果不变）。created 2026-11-11 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/corner-columns.ts";
import { buildTargetGeo, type TargetGeo } from "../src/paint/space-target.ts";
import { tipReach } from "../src/paint/tip-reach.ts";
import { strokeTruth, tipCellsInPoly } from "../src/paint/tip-truth.ts";
import { SpaceStroke } from "../src/paint/space-stroke.ts";
import { positionOnFace, samplePoint } from "../src/paint/texel-table.ts";
import { stampFalloff } from "../src/paint/kernel/src/backend/soft-shaders.ts";
import { P, RAW, brush, gridMesh, laidOut, pinhole, rng, targetOf } from "./paint-space-fixtures.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

describe("标准答案（1-4a 测试 9：镜像的两半每一格只算一次、取最近的）", () => {
  it("两半贴图坐标一样、笔尖压在中缝上：每一格 = 两半各自算的里面浓的那个（距离取近的）", () => {
    const m = new MeshKernel(), v = [P(-1, 0, 0), P(0, 0, 0), P(0, 1, 0), P(-1, 1, 0), P(1, 0, 0), P(1, 1, 0)].map((p) => m.addVertex(p));
    const L = m.addFace([v[0], v[1], v[2], v[3]], -1, FRESH), R = m.addFace([v[4], v[5], v[2], v[1]], -1, FRESH), uv = laidOut(m, "uv", [L], { density: 60 });
    { const lv = m.cornerValues(L, "uv")!, at = (i: number) => [lv[2 * i], lv[2 * i + 1]]; m.setFaceValues(R, "uv", [...at(0), ...at(3), ...at(2), ...at(1)]); }
    const g = buildTargetGeo(targetOf(m, uv)), tip = { x: 0.1, y: 0.5, z: 0, r: 0.4, alpha: 0.8 };
    const trisOf = (f: number) => Array.from({ length: g.grid.face.length }, (_, t) => t).filter((t) => g.grid.face[t] === f);
    const both = tipCellsInPoly(g, 0, [...trisOf(L), ...trisOf(R)], tip, 0.5), onlyL = tipCellsInPoly(g, 0, trisOf(L), tip, 0.5), onlyR = tipCellsInPoly(g, 0, trisOf(R), tip, 0.5);
    let n = 0;
    for (const c of new Set([...onlyL.keys(), ...onlyR.keys()])) { n++; eq(both.get(c), Math.max(onlyL.get(c) ?? 0, onlyR.get(c) ?? 0), `格子 ${c}`); }
    assert(n > 50 && both.size === n, `吃到的格子一格一次（${n}）`);
  });
});

describe("标准答案（1-4a 测试 11：铺法换掉，结果不变）", () => {
  /** 第二份铺法：1-3a 那一份的每一块各自拉伸、歪斜、缩放（密度差到十倍），再一行一行摆开（块之间留 6 格）。 */
  function warped(m: MeshKernel, from: string, to: string, seed: number): { guid: string; width: number; height: number; pxPerM: number } {
    const r = rng(seed), W = 1600, gap = 6, blocks: { f: number; v: number[] }[] = [];
    for (const f of m.faces()) {
      const v = Array.from(m.cornerValues(f, from)!), n = v.length / 2;
      let cx = 0, cy = 0; for (let i = 0; i < n; i++) { cx += v[2 * i] / n; cy += v[2 * i + 1] / n; }
      const sx = 0.32 * Math.pow(10, r()), sy = sx * (0.6 + r() * 0.8), k = (r() - 0.5) * 0.8;   // 0.32 … 3.2 倍：密度差到十倍
      const w: number[] = []; for (let i = 0; i < n; i++) { const x = v[2 * i] - cx, y = v[2 * i + 1] - cy; w.push(sx * x + k * sx * y, sy * y); }
      blocks.push({ f, v: w });
    }
    m.addColumn({ guid: to, arity: 2 });
    let x = gap, y = gap, rowH = 0;
    for (const b of blocks) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < b.v.length; i += 2) { x0 = Math.min(x0, b.v[i]); x1 = Math.max(x1, b.v[i]); y0 = Math.min(y0, b.v[i + 1]); y1 = Math.max(y1, b.v[i + 1]); }
      if (x + (x1 - x0) + gap > W) { x = gap; y += rowH + gap; rowH = 0; }
      m.setFaceValues(b.f, to, b.v.map((c, i) => (i % 2 === 0 ? c - x0 + x : c - y0 + y)));
      x += x1 - x0 + gap; rowH = Math.max(rowH, y1 - y0);
    }
    return { guid: to, width: W, height: Math.ceil(y + rowH + gap), pxPerM: 0 };
  }
  /** 一份铺法上画同一笔、算标准答案。 */
  function paint(m: MeshKernel, uv: { guid: string; width: number; height: number }, hardness: number) {
    const cam = pinhole(P(0.2, -2.2, 3.2), P(0, 0, 0), 45), s = new SpaceStroke([targetOf(m, { ...uv, pxPerM: 60 }, { pxPerM: 60 })], cam, brush({ size: 40 }), { smooth: RAW });
    const a = cam.project(P(-0.7, 0, 0)), b = cam.project(P(0.7, 0.05, 0));
    s.down(a.x, a.y, 0.8, 0); for (let i = 1; i <= 20; i++) s.move(a.x + ((b.x - a.x) * i) / 20, a.y + ((b.y - a.y) * i) / 20, 0.8, i * 16);
    s.up();
    const tips = s.tips(), truth = strokeTruth(s.geos, tips.map((t) => ({ tip: { x: t.x, y: t.y, z: t.z, r: t.size / 2, alpha: t.alpha }, reach: t.reach })), hardness, "max");
    return { g: s.geos[0], tips, cells: truth.get(0) ?? new Map<number, number>() };
  }
  /** 定义本身：世界里一点，按这一笔的全部笔尖取最大（不经过格子）。 */
  const direct = (tips: readonly { x: number; y: number; z: number; size: number; alpha: number }[], p: Pt3, hardness: number): number => {
    let v = 0;
    for (const t of tips) { const r = t.size / 2, d = Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z); if (d < r) v = Math.max(v, stampFalloff(d, r, Math.max(0, Math.min(0.999, hardness)) * r) * t.alpha); }
    return v;
  };
  /** 表面上一点（第 f 张面第 k 个三角形、重心 w）→ 世界位置 + 它在这份铺法上落在哪一格、那一格的取样点在这张面上的位置、这一格在世界里多大（|du| + |dv|）。 */
  const at = (g: TargetGeo, f: number, k: number, w: readonly [number, number, number]) => {
    const tr = g.table.faces.get(f)!.tris[k], pos = { x: 0, y: 0, z: 0 };
    let u = 0, vv = 0;
    for (let i = 0; i < 3; i++) { pos.x += w[i] * tr.pos[i].x; pos.y += w[i] * tr.pos[i].y; pos.z += w[i] * tr.pos[i].z; u += w[i] * tr.uv[2 * i]; vv += w[i] * tr.uv[2 * i + 1]; }
    const cx = Math.floor(u), cy = Math.floor(vv), s = samplePoint(g.table, cx, cy)!, cellPos = positionOnFace(g.table, f, s[0], s[1])!.pos;
    const fo = tr.formula, cellLen = Math.hypot(fo.du.x, fo.du.y, fo.du.z) + Math.hypot(fo.dv.x, fo.dv.y, fo.dv.z);
    return { pos, cell: cy * g.table.width + cx, cellPos, cellLen, owner: g.table.owner[cy * g.table.width + cx] === g.table.faces.get(f)!.poly };
  };
  const mesh = () => gridMesh(6, 2, (x, y) => 0.2 * Math.sin(1.7 * x) * Math.cos(1.3 * y));

  it("随机的表面点：每份铺法上那一点所在格的值 = 直接拿那一格的位置按定义算（差 ≤ 1e-4）；两份铺法差不过「点到各自格子位置的距离 × 曲线最陡的斜率」", () => {
    const m = mesh(), uv1 = laidOut(m, "uv1", m.faces(), { density: 60 }), uv2 = warped(m, "uv1", "uv2", 3), hardness = 0.4;
    const A = paint(m, uv1, hardness), B = paint(m, uv2, hardness), r = rng(9);
    eq(A.tips.length, B.tips.length, "两份铺法上的笔尖一样");
    const rad = A.tips[0].size / 2, slope = 1.5 / (rad - hardness * rad);   // smoothstep 最陡 1.5 / 过渡带宽（浓度 ≤ 1）
    let checked = 0, inked = 0;
    for (let n = 0; n < 2000; n++) {
      const f = m.faces()[Math.floor(r() * m.faces().length)], k = r() < 0.5 ? 0 : 1, a = r(), b = r() * (1 - a), w: [number, number, number] = [1 - a - b, a, b];
      const p1 = at(A.g, f, k, w), p2 = at(B.g, f, k, w);
      if (!p1.owner || !p2.owner) continue;   // 落在块边上归了别块的格子（不会：块之间留了间隔）
      const v1 = A.cells.get(p1.cell) ?? 0, v2 = B.cells.get(p2.cell) ?? 0;
      assert(Math.abs(v1 - direct(A.tips, p1.cellPos, hardness)) <= 1e-4, `铺法一：格子值 = 定义（${v1}）`);
      assert(Math.abs(v2 - direct(B.tips, p2.cellPos, hardness)) <= 1e-4, `铺法二：格子值 = 定义（${v2}）`);
      const d1 = Math.hypot(p1.pos.x - p1.cellPos.x, p1.pos.y - p1.cellPos.y, p1.pos.z - p1.cellPos.z), d2 = Math.hypot(p2.pos.x - p2.cellPos.x, p2.pos.y - p2.cellPos.y, p2.pos.z - p2.cellPos.z);
      assert(Math.abs(v1 - v2) <= slope * (d1 + d2) + 2e-4, `两份铺法差 ${Math.abs(v1 - v2)}，上界 ${slope * (d1 + d2)}`);
      checked++; if (v1 > 0 || v2 > 0) inked++;
    }
    assert(checked > 1800 && inked > 120, `查了 ${checked} 个点，其中 ${inked} 个有墨`);
  });
  it("硬度是一的笔：线在模型上的宽度，两份铺法只差各自的一格", () => {
    const m = mesh(), uv1 = laidOut(m, "uv1", m.faces(), { density: 60 }), uv2 = warped(m, "uv1", "uv2", 5);
    const A = paint(m, uv1, 1), B = paint(m, uv2, 1);
    for (const x0 of [-0.3, 0.1, 0.4]) {
      const width = (S: typeof A) => { let n = 0, len = 0; const N = 600, y0 = -0.5, y1 = 0.5;
        for (let i = 0; i < N; i++) { const y = y0 + ((i + 0.5) * (y1 - y0)) / N, z = 0.2 * Math.sin(1.7 * x0) * Math.cos(1.3 * y);
          // 找这一点在哪张面、哪个三角形（网格是高度场：按 x、y 找）
          for (const [f, fp] of S.g.table.faces) for (const [k, tr] of fp.tris.entries()) {
            const [a, b, c] = tr.pos, d = (b.y - c.y) * (a.x - c.x) + (c.x - b.x) * (a.y - c.y), l1 = ((b.y - c.y) * (x0 - c.x) + (c.x - b.x) * (y - c.y)) / d, l2 = ((c.y - a.y) * (x0 - c.x) + (a.x - c.x) * (y - c.y)) / d, l3 = 1 - l1 - l2;
            if (l1 < -1e-12 || l2 < -1e-12 || l3 < -1e-12) continue;
            const p = at(S.g, f, k, [l1, l2, l3]); void z;
            if ((S.cells.get(p.cell) ?? 0) > 0.5) n++;
            len = Math.max(len, p.cellLen);
            break;
          } }
        return { w: (n * (y1 - y0)) / N, cell: len };
      };
      const a = width(A), b = width(B);
      assert(a.w > 0 && b.w > 0, "有线");
      assert(Math.abs(a.w - b.w) <= a.cell + b.cell + 1e-9, `x = ${x0}：宽度 ${a.w.toFixed(4)} vs ${b.w.toFixed(4)}，只许差 ${(a.cell + b.cell).toFixed(4)}`);
    }
  });
});

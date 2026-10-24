// EGC 期 1（ai-docs/20261024-exact-geometry-design.md）：精确谓词（过滤器 vs 纯 BigInt 一致）、线段关系分类、像素判定；snap rounding 的 PSLG / Hausdorff / 分离性 / 确定性不变量。
// created 2026-10-24 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { PRED_STATS, cellOf, intersectParam, intersectionCell, onSegment2d, orient2d, orient3d, segSeg2d } from "../src/kernel/exact/predicates.ts";
import { cellRep, pslgProblems, segPassesCell, snapRound, type ISeg } from "../src/kernel/exact/snap-round.ts";
import type { IPt2, IPt3 } from "../src/kernel/exact/lattice.ts";

const rng = (seed: number) => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; }; };
const bigOrient2d = (a: IPt2, b: IPt2, c: IPt2): number => { const v = (BigInt(a.x) - BigInt(c.x)) * (BigInt(b.y) - BigInt(c.y)) - (BigInt(a.y) - BigInt(c.y)) * (BigInt(b.x) - BigInt(c.x)); return v > 0n ? 1 : v < 0n ? -1 : 0; };
const bigOrient3d = (a: IPt3, b: IPt3, c: IPt3, d: IPt3): number => {
  const A = [BigInt(a.x - d.x), BigInt(a.y - d.y), BigInt(a.z - d.z)], B = [BigInt(b.x - d.x), BigInt(b.y - d.y), BigInt(b.z - d.z)], C = [BigInt(c.x - d.x), BigInt(c.y - d.y), BigInt(c.z - d.z)];
  const v = A[2] * (B[0] * C[1] - C[0] * B[1]) + B[2] * (C[0] * A[1] - A[0] * C[1]) + C[2] * (A[0] * B[1] - B[0] * A[1]);
  return v > 0n ? 1 : v < 0n ? -1 : 0;
};

describe("exact: 谓词", () => {
  it("orient2d：随机大坐标（±2^31）与近共线扰动，与纯 BigInt 逐一一致；过滤器命中率有记录", () => {
    const r = rng(7); PRED_STATS.reset();
    let n = 0;
    for (let i = 0; i < 20000; i++) {
      const big = i % 2 === 0;
      const R = big ? 2 ** 31 - 1 : 1000;
      const a = { x: Math.floor((r() * 2 - 1) * R), y: Math.floor((r() * 2 - 1) * R) };
      const b = { x: Math.floor((r() * 2 - 1) * R), y: Math.floor((r() * 2 - 1) * R) };
      // c：一半随机、一半取 a→b 上的近似点再抖 ±1（逼近共线，专打过滤器）
      let c: IPt2;
      if (i % 4 < 2) c = { x: Math.floor((r() * 2 - 1) * R), y: Math.floor((r() * 2 - 1) * R) };
      else { const t = r(); c = { x: Math.round(a.x + (b.x - a.x) * t) + Math.floor(r() * 3) - 1, y: Math.round(a.y + (b.y - a.y) * t) + Math.floor(r() * 3) - 1 }; }
      eq(orient2d(a, b, c), bigOrient2d(a, b, c), `orient2d ${JSON.stringify([a, b, c])}`); n++;
    }
    assert(PRED_STATS.slow > 0 && PRED_STATS.fast > PRED_STATS.slow, `过滤器统计 fast=${PRED_STATS.fast} slow=${PRED_STATS.slow}`);
    eq(orient2d({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 0 }), 0);
    eq(orient2d({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 1 }), 1);
    eq(orient2d({ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: -1 }), -1);
  });
  it("orient3d：随机 + 近共面扰动，与纯 BigInt 一致", () => {
    const r = rng(11);
    for (let i = 0; i < 6000; i++) {
      const R = i % 2 === 0 ? 2 ** 30 : 500;
      const P = (): IPt3 => ({ x: Math.floor((r() * 2 - 1) * R), y: Math.floor((r() * 2 - 1) * R), z: Math.floor((r() * 2 - 1) * R) });
      const a = P(), b = P(), c = P();
      let d: IPt3;
      if (i % 4 < 2) d = P();
      else { const s = r(), t = r(); d = { x: Math.round(a.x + (b.x - a.x) * s + (c.x - a.x) * t) + Math.floor(r() * 3) - 1, y: Math.round(a.y + (b.y - a.y) * s + (c.y - a.y) * t) + Math.floor(r() * 3) - 1, z: Math.round(a.z + (b.z - a.z) * s + (c.z - a.z) * t) + Math.floor(r() * 3) - 1 }; }
      eq(orient3d(a, b, c, d), bigOrient3d(a, b, c, d), `orient3d ${JSON.stringify([a, b, c, d])}`);
    }
  });
  it("segSeg2d 四分类 + 交点像素 + 像素穿过判定", () => {
    const S = (x1: number, y1: number, x2: number, y2: number): [IPt2, IPt2] => [{ x: x1, y: y1 }, { x: x2, y: y2 }];
    eq(segSeg2d(...S(0, 0, 10, 10), ...S(0, 10, 10, 0)), "proper");
    eq(segSeg2d(...S(0, 0, 10, 0), ...S(5, 0, 5, 7)), "touch");      // T 触
    eq(segSeg2d(...S(0, 0, 10, 0), ...S(10, 0, 20, 5)), "touch");    // 端点重合
    eq(segSeg2d(...S(0, 0, 10, 0), ...S(5, 0, 20, 0)), "overlap");   // 共线重叠
    eq(segSeg2d(...S(0, 0, 10, 0), ...S(10, 0, 20, 0)), "touch");    // 共线只共端点
    eq(segSeg2d(...S(0, 0, 10, 0), ...S(11, 0, 20, 0)), "none");
    eq(segSeg2d(...S(0, 0, 10, 0), ...S(0, 1, 10, 1)), "none");
    const t = intersectParam(...S(0, 0, 10, 10), ...S(0, 10, 10, 0))!;
    eq(Number(t.num) / Number(t.den), 0.5);
    eq(JSON.stringify(intersectionCell(...S(0, 0, 10, 10), t, 4)), JSON.stringify({ x: 1, y: 1 }));   // (5,5) 在像素 [4,8)
    eq(JSON.stringify(cellOf({ x: -1, y: 7 }, 4)), JSON.stringify({ x: -1, y: 1 }));
    assert(onSegment2d({ x: 5, y: 5 }, { x: 0, y: 0 }, { x: 10, y: 10 }) && !onSegment2d({ x: 11, y: 11 }, { x: 0, y: 0 }, { x: 10, y: 10 }));
    // 穿过像素：斜线穿内部 = 过；只碰一个角 = 不算；端点在里面 = 过；沿边 = 过
    assert(segPassesCell({ x: 0, y: 0 }, { x: 20, y: 20 }, { x: 1, y: 1 }, 4), "穿内部");
    assert(!segPassesCell({ x: 0, y: 8 }, { x: 8, y: 0 }, { x: 1, y: 1 }, 4), "只碰 (4,4) 角不算");   // 过 (4,4) 的反对角线碰像素 [4,8)² 的角
    assert(segPassesCell({ x: 5, y: 5 }, { x: 40, y: 40 }, { x: 1, y: 1 }, 4), "端点在里面");
    assert(segPassesCell({ x: 0, y: 4 }, { x: 40, y: 4 }, { x: 1, y: 1 }, 4), "沿像素边");
    assert(!segPassesCell({ x: 0, y: 0 }, { x: 3, y: 3 }, { x: 1, y: 1 }, 4), "没够到");
  });
});

describe("exact: snap rounding", () => {
  const P = 4;
  const dist = (p: IPt2, a: IPt2, b: IPt2): number => { const dx = b.x - a.x, dy = b.y - a.y, L2 = dx * dx + dy * dy; if (!L2) return Math.hypot(p.x - a.x, p.y - a.y); let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t); };
  it("X 形两段：交点像素成为公共顶点，4 条边，PSLG 成立", () => {
    const r = snapRound([{ a: { x: 0, y: 0 }, b: { x: 101, y: 103 } }, { a: { x: 0, y: 100 }, b: { x: 99, y: 2 } }], P);
    eq(r.edges.length, 4); eq(r.vertices.length, 5);
    eq(pslgProblems(r).length, 0);
    eq(r.chains[0].length, 3); eq(r.chains[1].length, 3);
    eq(r.chains[0][1], r.chains[1][1], "公共中点");
  });
  it("随机 150 段（含共线 / 短段 / 近平行）：PSLG 零问题、每条折线离原段 ≤ P·√2、端点落在自己的像素、确定性", () => {
    for (let seed = 1; seed <= 12; seed++) {
      const r = rng(seed * 7919);
      const segs: ISeg[] = [];
      for (let i = 0; i < 150; i++) {
        const R = 4000;
        const a = { x: Math.floor(r() * R), y: Math.floor(r() * R) };
        const kind = r();
        let b: IPt2;
        if (kind < 0.15) b = { x: a.x + Math.floor(r() * 9) - 4, y: a.y + Math.floor(r() * 9) - 4 };          // 短段 / 退化
        else if (kind < 0.3) b = { x: a.x + Math.floor(r() * 600) + 1, y: a.y + Math.floor(r() * 3) - 1 };   // 近水平
        else if (kind < 0.4) b = { x: a.x, y: a.y + Math.floor(r() * 600) + 1 };                              // 竖直
        else b = { x: Math.floor(r() * R), y: Math.floor(r() * R) };
        segs.push({ a, b });
      }
      segs.push({ a: segs[0].a, b: segs[0].b });   // 重复段
      segs.push({ a: segs[1].b, b: segs[1].a });   // 反向重复
      const out = snapRound(segs, P);
      const probs = pslgProblems(out);
      assert(!probs.length, `seed ${seed}: ${probs.slice(0, 4).join("; ")}（共 ${probs.length}）`);
      assert(out.rounds <= 8, `seed ${seed}: ${out.rounds} 轮`);
      segs.forEach((s, i) => {
        const ch = out.chains[i];
        for (const vi of ch) { const d = dist(out.vertices[vi], s.a, s.b); assert(d <= P * Math.SQRT2 + 1e-9, `seed ${seed} seg ${i}: 折线顶点离原段 ${d.toFixed(2)} > P√2`); }
        const ca = cellRep(cellOf(s.a, P), P), cb = cellRep(cellOf(s.b, P), P);
        const v0 = out.vertices[ch[0]], v1 = out.vertices[ch[ch.length - 1]];
        assert(v0.x === ca.x && v0.y === ca.y && v1.x === cb.x && v1.y === cb.y, `seed ${seed} seg ${i}: 端点没落在自己的像素代表点`);
      });
      const again = snapRound(segs, P);
      eq(JSON.stringify(again.vertices), JSON.stringify(out.vertices), "确定性");
    }
  });
  it("级联：一轮产生的新顶点骑到别的边上 → 迭代后分离性成立（顶点不骑边）", () => {
    // 两条近平行的长段 + 一条斜线穿过：斜线的交点像素把第一条段拉弯，弯点可能落进第二条段的像素 → 第二轮
    const segs: ISeg[] = [{ a: { x: 0, y: 0 }, b: { x: 1000, y: 3 } }, { a: { x: 0, y: 5 }, b: { x: 1000, y: 8 } }, { a: { x: 500, y: -50 }, b: { x: 503, y: 60 } }, { a: { x: 10, y: 1 }, b: { x: 990, y: 7 } }];
    const out = snapRound(segs, P);
    eq(pslgProblems(out).length, 0, pslgProblems(out).join("; "));
  });
});

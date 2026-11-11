// 一笔的手感不管几维（贴图主线 0-6；施工单 CatsUp ai-docs/20261110-paint-workorders-5.md 第二节第 3–7 条）。created 2026-11-10 by Claude Opus 5.5
// A 三维的间距（假落点：屏幕上的点落到球面上）  B 单位（世界、笔的大小、unit 一起放大十倍）  C 断开  D 定型  E 停顿
// 内核自己的测试：只 import 内核和测试工具，不读仓里的文件（守卫在 stroke-core-guard.test.mjs）。
import { describe, it, eq, assert } from "./runner.mjs";
import { StrokeCore } from "../src/backend/stroke-core.ts";
import { resolveBrush } from "../src/common/resolved-brush.ts";

const base = { color: "#000000", hardness: 0.8, spacing: 0.2, flow: 1, opacity: 1, sizeCoeff: 0, flowCoeff: 0, opaCoeff: 0, pressureGamma: 1, pressureLPF: 0, taperIn: 0, taperOut: 0, streamline: 0, stabilization: 0 };
const B = (o) => ({ ...resolveBrush({ size: 10 }), ...base, ...o });   // resolveBrush 有自己的入参形状：在它给的默认值上直接覆盖字段
const SMOOTH = { tau: 30, deadzone: 1 };

/** 假落点：屏幕上的点 (x, y) → 半径 R 的球面上（经纬度 = x / 100、y / 100），每段落密成 sub 小段；scale = 整个世界放大几倍；
 *  breakAt = 中心线上从这个点起落到球面上的另一处（经度再加 0.5 = 跳过去，像从胳膊跳到了身子），它和前一个点之间断开。 */
function spherePlacer({ R = 2, sub = 16, unit = 0.001, scale = 1, breakAt = -1 } = {}) {
  let jumpFrom = Infinity;
  const on = (x, y, i) => { const th = x / 100 + (i >= jumpFrom ? 0.5 : 0), ph = y / 100; return [scale * R * Math.cos(ph) * Math.cos(th), scale * R * Math.cos(ph) * Math.sin(th), scale * R * Math.sin(ph)]; };
  return {
    dim: 3, unit: unit * scale,
    place(cx, cy, cp, count, frozenCount) {
      const P = [], Pp = [], brk = [];
      jumpFrom = breakAt;
      for (let i = 0; i < count; i++) {
        if (i === 0) { P.push(on(cx[0], cy[0], 0)); Pp.push(cp[0]); brk.push(false); continue; }
        if (i === breakAt) { P.push(on(cx[i], cy[i], i)); Pp.push(cp[i]); brk.push(true); continue; }   // 跳过去：只放一个点，和前一个点之间断开
        for (let k = 1; k <= sub; k++) { const t = k / sub; P.push(on(cx[i - 1] + (cx[i] - cx[i - 1]) * t, cy[i - 1] + (cy[i] - cy[i - 1]) * t, i)); Pp.push(cp[i - 1] + (cp[i] - cp[i - 1]) * t); brk.push(false); }
      }
      return { dim: 3, count: P.length, coord: (i, k) => P[i][k], pressure: (i) => Pp[i], breakBefore: (i) => brk[i], frozenCount: frozenCount <= 0 ? 0 : Math.min(P.length, (frozenCount - 1) * sub + 1 - (breakAt >= 1 && breakAt < frozenCount ? sub - 1 : 0)) };
    },
  };
}
/** 一笔：起点 + 点列 [x, y, 压感, 时间]；每喂一个点收集一次（frames），最后抬笔再收集（final）。 */
function draw(brush, pts, placer, opts = {}) {
  const core = new StrokeCore(brush, pts[0][0], pts[0][1], pts[0][2], opts.smooth ?? SMOOTH, pts[0][3], placer);
  const frames = [];
  for (const [x, y, p, t] of pts.slice(1)) { core.extend(x, y, p, t); if (opts.frames) frames.push(core.collect()); }
  core.finish();
  return { core, frames, final: core.collect() };
}
const line = (n, x0 = 10, y0 = 20, dx = 3, dy = 1.5, p = 0.8) => Array.from({ length: n }, (_, i) => [x0 + i * dx, y0 + i * dy, p, i * 16]);
const tip = (T, i) => Array.from(T.data.subarray(i * (T.dim + 3), (i + 1) * (T.dim + 3)));
const dist = (a, b, dim) => Math.hypot(...Array.from({ length: dim }, (_, k) => a[k] - b[k]));

describe("一笔的手感不管几维（0-6）", () => {
  it("A 三维的间距：笔尖落在球面上，相邻两颗在空间里的直线距离 = 那一步的间距（差不超过弦和弧的差）；走了多远一步步加", () => {
    const step = 0.05 * 0.2;   // 大小 0.05 米、间距 0.2、不随压感 → 每步 0.01 米
    const { core, final: T } = draw(B({ size: 0.05 }), line(40), spherePlacer());
    const path = core.path(); let Lmax = 0;
    for (let i = 1; i < path.count; i++) Lmax = Math.max(Lmax, Math.hypot(...[0, 1, 2].map((k) => path.coord(i, k) - path.coord(i - 1, k))));
    assert(T.dim === 3 && T.count > 100, `笔尖 ${T.count} 颗`);
    let worst = 0;
    for (let i = 1; i < T.count; i++) {
      const a = tip(T, i - 1), b = tip(T, i);
      eq(Math.abs(b[5] - a[5] - step) < 1e-12, true, "走了多远一步步加");
      worst = Math.max(worst, Math.abs(dist(a, b, 3) - step));
    }
    // 弦和弧的差：路在每个折点转 ≈ 小段长 / R 弧度，一步跨几个折点，直线距离比沿路短约 步长 × 转角² / 8 × 折点数——界取 步长 × (最长小段 / R)²
    const bound = step * (Lmax / 2) ** 2;
    assert(worst <= bound, `最大差 ${worst} > 界 ${bound}`);
  });

  it("B 单位：世界、笔的大小、unit 一起放大十倍 → 位置和大小正好十倍，颗数、浓度不变（含最小间距 / 最小笔尖这两个带单位的数）", () => {
    for (const size of [0.05, 0.0003]) {   // 0.0003 米 < 半个像素（0.5 × unit = 0.0005）：最小笔尖、最小间距那两条在起作用
      const a = draw(B({ size, sizeCoeff: 0.6, taperIn: 1, taperOut: 1 }), line(30), spherePlacer()).final;
      const b = draw(B({ size: size * 10, sizeCoeff: 0.6, taperIn: 1, taperOut: 1 }), line(30), spherePlacer({ scale: 10 })).final;
      eq(b.count, a.count, `大小 ${size}：颗数不变`);
      for (let i = 0; i < a.count; i++) {
        const x = tip(a, i), y = tip(b, i);
        for (const k of [0, 1, 2, 3, 5]) assert(Math.abs(y[k] - 10 * x[k]) <= 1e-9 * Math.abs(10 * x[k]) + 1e-15, `大小 ${size} 第 ${i} 颗第 ${k} 个数：${y[k]} vs 10 × ${x[k]}`);
        assert(Math.abs(y[4] - x[4]) < 1e-12, "浓度不变");
      }
    }
  });

  it("C 断开：断点两头之间没有笔尖；走了多远不含那一段；断点前最后一颗到断点 + 断点后到第一颗 = 一步", () => {
    const step = 0.01, placer = spherePlacer({ sub: 4, breakAt: 20 }), pts = line(40, 10, 20, 3, 1.5);
    const { core, final: T } = draw(B({ size: 0.05 }), pts, placer);
    const path = core.path(), bi = Array.from({ length: path.count }, (_, i) => i).find((i) => path.breakBefore(i));
    assert(bi !== undefined, "路上有一处断开");
    const A = [0, 1, 2].map((k) => path.coord(bi - 1, k)), Bp = [0, 1, 2].map((k) => path.coord(bi, k)), gap = dist(A, Bp, 3);
    assert(gap > step * 3, `断开的那一段够长（${gap}）`);
    // 沿路的长度（不含断开那段）
    const arc = []; let s = 0; arc.push(0);
    for (let i = 1; i < path.count; i++) { if (!path.breakBefore(i)) s += dist([0, 1, 2].map((k) => path.coord(i - 1, k)), [0, 1, 2].map((k) => path.coord(i, k)), 3); arc.push(s); }
    const arcAtBreak = arc[bi - 1];
    let before = -1, after = -1;
    for (let i = 0; i < T.count; i++) { const sd = tip(T, i)[5]; if (sd <= arcAtBreak + 1e-12) before = i; else if (after < 0) after = i; }
    assert(before >= 0 && after > before, "断点两边都有笔尖");
    const tb = tip(T, before), ta = tip(T, after);
    // 断点两头之间（那条直线上）没有笔尖：每颗笔尖都不在 A–B 之间的直线段上
    for (let i = 0; i < T.count; i++) { const q = tip(T, i), d1 = dist(A, q, 3), d2 = dist(q, Bp, 3); assert(!(d1 > 1e-9 && d2 > 1e-9 && Math.abs(d1 + d2 - gap) < 1e-9), `第 ${i} 颗落在断开那一段上`); }
    eq(Math.abs(ta[5] - tb[5] - step) < 1e-12, true, "走了多远不含断开那段：前后两颗只差一步");
    const toBreak = arcAtBreak - tb[5], fromBreak = ta[5] - arcAtBreak;
    assert(Math.abs(toBreak + fromBreak - step) < 1e-9, `${toBreak} + ${fromBreak} ≠ 一步`);
  });

  it("D 定型：边画边收集，前 frozenCount 颗和下一次收集的前这么多颗逐位相同、frozenCount 只增不减、抬笔后也逐位相同（带收笔渐细和不带的、二维和三维各一遍）", () => {
    for (const taperOut of [0, 1.5]) for (const placer of [null, spherePlacer()]) {
      const pts = Array.from({ length: 60 }, (_, i) => [20 + i * 4 + 3 * Math.sin(i / 3), 30 + i * 2, 0.4 + 0.4 * Math.abs(Math.sin(i / 5)), i * 16]);
      const brush = B({ size: placer ? 0.05 : 20, sizeCoeff: 0.7, taperIn: 0.8, taperOut });
      const { frames, final } = draw(brush, pts, placer, { frames: true, smooth: { tau: 60, deadzone: 1 } });
      const W = final.dim + 3;
      let prev = 0;
      for (let f = 0; f < frames.length; f++) {
        const F = frames[f], next = f + 1 < frames.length ? frames[f + 1] : final;
        assert(F.frozenCount >= prev, "只增不减"); prev = F.frozenCount;
        assert(next.count >= F.frozenCount, "后面的收集至少有这么多颗");
        for (let j = 0; j < F.frozenCount * W; j++) if (!Object.is(F.data[j], next.data[j])) throw new Error(`收笔渐细 ${taperOut}、${placer ? "三维" : "二维"}：第 ${f} 帧定型的第 ${Math.floor(j / W)} 颗到下一次变了`);
        for (let j = 0; j < F.frozenCount * W; j++) if (!Object.is(F.data[j], final.data[j])) throw new Error(`收笔渐细 ${taperOut}、${placer ? "三维" : "二维"}：第 ${f} 帧定型的第 ${Math.floor(j / W)} 颗抬笔后变了`);
      }
      assert(prev > 10, `收笔渐细 ${taperOut}、${placer ? "三维" : "二维"}：真的定型了（${prev} 颗）`);
    }
  });

  it("E 停顿：落笔后原地停一会儿再走，三维的假落点下前面那段笔尖的大小和「不停直接走」逐颗一样", () => {
    const brush = () => B({ size: 0.05, sizeCoeff: 1, pressureLPF: 50, taperIn: 0.5, pressureGamma: 1.2, spacing: 0.06 });
    const run = (dwellN) => {
      const pts = [[100, 100, 0.3, 0]]; let t = 0;
      for (let i = 0; i < dwellN; i++) { t += 16; pts.push([100 + (i % 2 ? 0.05 : -0.05), 100, 1.0, t]); }
      for (let i = 1; i <= 40; i++) { t += 16; pts.push([100 + i * 4, 100, 0.3, t]); }
      const T = draw(brush(), pts, spherePlacer(), { smooth: { tau: 50, deadzone: 1.6 } }).final, out = [];
      for (let i = 0; i < T.count; i++) { const q = tip(T, i); if (q[5] <= 0.04) out.push(q[3]); }   // 起步后前 4 厘米
      return out;
    };
    const a = run(30), b = run(0);
    assert(a.length > 10, `查了 ${a.length} 颗`);
    eq(a.join(), b.join(), "停顿 30 个样本 == 不停");
  });
});

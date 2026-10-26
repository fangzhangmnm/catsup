// 圆 / 弧段数的公差与参考档（纪元账本 DT95）：弦高 ↔ 段数的几何、数据文件的形状、档位换算、说明行；参数小窗的说明行现算。created 2026-10-26 by Claude Opus 5.5
import { describe, it, assert, eq } from "./runner.mjs";
import { SEGMENT_TIERS, SEG_MAX, chordHeight, circleSegmentsFor, clampSegments, fmtTolerance, segmentNote, tierOf, tierSegments } from "../src/editor/segment-ref.ts";
import { afterthought } from "../src/editor/param-panel.ts";

describe("段数参考（DT95）", () => {
  it("弦高 = r(1 − cos(θ/2))；按公差反推的段数刚好够", () => {
    assert(Math.abs(chordHeight(1, Math.PI) - 1) < 1e-12, "两段的半圆弦高 = 半径");
    eq(circleSegmentsFor(0.01, 1e-5), 71, "半径 10 mm、弦高 10 µm（账本 DT91 算过 ≈ 70 段）");
    for (const [r, d] of [[0.01, 1e-5], [0.05, 1e-5], [1, 1e-3], [0.2, 5e-4]] as const) {
      const n = circleSegmentsFor(r, d);
      assert(chordHeight(r, (2 * Math.PI) / n) <= d + 1e-15, `r=${r} δ=${d}：${n} 段的弦高要 ≤ δ`);
      assert(chordHeight(r, (2 * Math.PI) / (n - 1)) > d, `r=${r} δ=${d}：少一段就超`);
    }
  });
  it("数据文件：每档 id 唯一、给段数或公差之一、有适用对象和常见取值；lowpoly / 次世代都在", () => {
    const ids = SEGMENT_TIERS.map((t) => t.id);
    eq(new Set(ids).size, ids.length, "id 唯一");
    for (const t of SEGMENT_TIERS) {
      assert((t.segments === undefined) !== (t.chordMm === undefined), `${t.id}：段数和公差只给一个`);
      assert(!!t.name && !!t.for && !!t.typical, `${t.id}：名字 / 适用对象 / 常见取值要有`);
    }
    assert(ids.includes("lowpoly") && ids.includes("nextgen"), "user 点名的两档");
  });
  it("档位换算：整圆按表、弧按扫角比例、夹上下限；段数反查档位", () => {
    const lp = SEGMENT_TIERS.find((t) => t.id === "lowpoly")!, su = SEGMENT_TIERS.find((t) => t.id === "sketchup")!;
    eq(tierSegments(lp, 1), lp.segments!, "整圆 = 表里的数");
    eq(tierSegments(lp, 1, Math.PI / 2), Math.round(lp.segments! / 4), "四分之一弧 = 四分之一");
    eq(tierOf(su.segments!, 0.5, 2 * Math.PI, false)?.id, "sketchup", "24 段对上 SketchUp 默认");
    eq(tierOf(17, 0.5, 2 * Math.PI, false), null, "对不上 = 自定");
    eq(clampSegments(2, false), 3, "圆至少 3 段"); eq(clampSegments(2, true), 2, "弧可以 2 段"); eq(clampSegments(500, false), SEG_MAX, "上限");
  });
  it("说明行：弦高 + 半径 + 对上的档；按公差的档超上限如实说", () => {
    const n = segmentNote(0.05, 2 * Math.PI, 24, false, (m) => `${m * 100} cm`);
    assert(/^弦高 0\.43 mm（半径 5 cm）/.test(n), `说明行开头：${n}`);
    assert(n.includes("SketchUp 默认"), `对上的档：${n}`);
    const pr = SEGMENT_TIERS.find((t) => t.id === "print")!;
    const want = tierSegments(pr, 0.5);
    assert(want > SEG_MAX, "半径 0.5 m、弦高 10 µm 一定超上限");
    const big = segmentNote(0.5, 2 * Math.PI, SEG_MAX, false, (m) => `${m} m`);
    assert(big.includes(`要 ${want} 段`) && big.includes(`上限 ${SEG_MAX}`), `超上限要说：${big}`);
    eq(fmtTolerance(0.00043), "0.43 mm"); eq(fmtTolerance(2.7e-5), "27 µm"); eq(fmtTolerance(0.0123), "12.3 mm");
  });
  it("参数小窗：马后炮会话的说明行按当前值现算", () => {
    let ops = 1;
    const s = afterthought({ title: "圆", fields: [{ key: "n", def: { kind: "number", label: "段数", min: 3, max: 96, step: 1 } }], values: { n: 24 }, nOps: 1, opCount: () => ops, undoN: () => { ops -= 1; }, redo: () => { ops += 1; }, note: (v) => `段数 ${v.n}` });
    eq(s.note, "段数 24");
    s.set("n", 8);
    eq(s.note, "段数 8", "改了值说明行跟着变");
  });
});

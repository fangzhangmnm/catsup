import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";

const P = (x: number, y: number): Pt => ({ x, y });
const rect = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt][] => [
  [P(x0, y0), P(x1, y0)],
  [P(x1, y0), P(x1, y1)],
  [P(x1, y1), P(x0, y1)],
  [P(x0, y1), P(x0, y0)],
];

describe("face-lifecycle: 构造", () => {
  it("矩形 = addEdges(4 段) → BIRTH 恰一面（验收①：无任何 new Face 入口）", () => {
    const k = new Kernel();
    const ev = k.addEdges(rect(0, 0, 10, 10));
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "BIRTH", "BIRTH");
    eq(k.faces().length, 1, "一面");
  });

  it("对角线划过已填面 → 急切 DIVIDE 成两面，无确认步（验收②）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    const ev = k.addEdges([[P(0, 0), P(10, 10)]]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "DIVIDE", "DIVIDE");
    eq(k.faces().length, 2, "两面都有膜");
  });

  it("在已填面内画闭环 → DIVIDE 成环带+内方（都有膜）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 12, 12));
    const ev = k.addEdges(rect(4, 4, 8, 8));
    eq(ev[0].type, "DIVIDE", "DIVIDE");
    eq(k.faces().length, 2, "环带 + 内方");
    const holed = k.faces().find((f) => f.holes.length === 1);
    assert(!!holed, "有带洞面");
  });

  it("闭环无面可表示：eraseFaces 后边仍在、面为零", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    const ev = k.eraseFaces(k.faces().map((f) => f.id));
    eq(ev[0].type, "FACE_ERASED", "FACE_ERASED");
    eq(k.faces().length, 0, "无面");
    eq(k.edges().length, 4, "边还在");
  });

  it("retrace 空闭环的一条边 → BIRTH（drill L346：天天用的手势）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    k.eraseFaces(k.faces().map((f) => f.id));
    const ev = k.addEdges([[P(0, 0), P(10, 0)]]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "BIRTH", "复生");
    eq(k.faces().length, 1, "一面");
  });

  it("T 触碰空闭环 → 不生膜（切割子边不是手势边）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    k.eraseFaces(k.faces().map((f) => f.id));
    const ev = k.addEdges([[P(15, 5), P(10, 5)]]);
    eq(ev.length, 0, "无事件");
    eq(k.faces().length, 0, "仍无面");
  });

  it("空闭环内画小方 → 只有小方生膜（外圈环带不生）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 12, 12));
    k.eraseFaces(k.faces().map((f) => f.id));
    const ev = k.addEdges(rect(4, 4, 8, 8));
    eq(ev.length, 1, "一个 BIRTH");
    eq(ev[0].type, "BIRTH", "BIRTH");
    eq(k.faces().length, 1, "只有小方");
    assert(k.faces()[0].holes.length === 0, "生的是小方不是环带");
  });

  it("一笔画日字 → 两格都生膜", () => {
    const k = new Kernel();
    const ev = k.addEdges([...rect(0, 0, 10, 10), [P(0, 5), P(10, 5)]]);
    eq(ev.filter((e) => e.type === "BIRTH").length, 2, "两个 BIRTH");
    eq(k.faces().length, 2, "两格");
  });
});

describe("face-lifecycle: erase 裁决器", () => {
  it("MERGE：日字两格都填，擦共享边 → 并成一面", () => {
    const k = new Kernel();
    k.addEdges([...rect(0, 0, 10, 10), [P(0, 5), P(10, 5)]]);
    const shared = k.edges().find((e) => e.faceLinks.length === 2)!;
    const ev = k.eraseEdges([shared.id]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "MERGE", "MERGE");
    eq(k.faces().length, 1, "一面");
  });

  it("BURST：日字一填一空，擦共享边 → 填面破裂消失", () => {
    const k = new Kernel();
    k.addEdges([...rect(0, 0, 10, 10), [P(0, 5), P(10, 5)]]);
    const lower = k.faces().find((f) => k.hitTest(P(5, 2.5), 0.1).face === f.id)!;
    void lower;
    // 删掉上格的膜
    const upper = k.hitTest(P(5, 7.5), 0.1).face!;
    k.eraseFaces([upper]);
    const shared = k.edges().find((e) => e.faceLinks.length === 1 && k.graph.pt(e.a).y === 5 && k.graph.pt(e.b).y === 5)!;
    const ev = k.eraseEdges([shared.id]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "BURST", "BURST（外环对 void）");
    eq(k.faces().length, 0, "全空——erase 永不凭空造面");
  });

  it("ABSORB：环带擦洞边 → 吞洞长满", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 12, 12));
    k.addEdges(rect(4, 4, 8, 8)); // DIVIDE → 环带+内方
    const inner = k.hitTest(P(6, 6), 0.1).face!;
    k.eraseFaces([inner]); // 洞空着
    const holeEdge = k.edges().find((e) => e.faceLinks.length === 1 && k.graph.pt(e.a).x >= 4 && k.graph.pt(e.a).x <= 8 && k.graph.pt(e.a).y >= 4 && k.graph.pt(e.a).y <= 8)!;
    const ev = k.eraseEdges([holeEdge.id]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "ABSORB", "ABSORB");
    eq(k.faces().length, 1, "一面");
    eq(k.faces()[0].holes.length, 0, "洞没了");
    assert(Math.abs(area(k) - 144) < 1e-6, "长满整方");
  });

  it("wire 边擦除 → 只删边无事件", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(10, 0)]]);
    const ev = k.eraseEdges([k.edges()[0].id]);
    eq(ev.length, 0, "无事件");
    eq(k.edges().length, 0, "边没了");
  });

  it("批量擦（共享边+外边）→ 并组被 burst 污染，整组死", () => {
    const k = new Kernel();
    k.addEdges([...rect(0, 0, 10, 10), [P(0, 5), P(10, 5)]]);
    const shared = k.edges().find((e) => e.faceLinks.length === 2)!;
    const outerTop = k.edges().find((e) => k.graph.pt(e.a).y === 10 && k.graph.pt(e.b).y === 10)!;
    const ev = k.eraseEdges([shared.id, outerTop.id]);
    eq(k.faces().length, 0, "全灭（与任一串行顺序一致）");
    eq(ev.filter((e) => e.type === "MERGE").length, 0, "没有假 MERGE");
  });

  it("批量擦两条共享边 → 三格链式并一", () => {
    const k = new Kernel();
    k.addEdges([...rect(0, 0, 9, 30), [P(0, 10), P(9, 10)], [P(0, 20), P(9, 20)]]);
    eq(k.faces().length, 3, "三格");
    const shareds = k.edges().filter((e) => e.faceLinks.length === 2);
    eq(shareds.length, 2, "两条共享边");
    const ev = k.eraseEdges(shareds.map((e) => e.id));
    eq(ev.length, 1, "一个 MERGE");
    eq(ev[0].type, "MERGE", "MERGE");
    eq(k.faces().length, 1, "并成一面");
  });
});

function area(k: Kernel): number {
  let s = 0;
  for (const f of k.faces()) {
    s += ringArea(f.outer.pts);
    for (const h of f.holes) s += ringArea(h.pts); // 洞是 CW，负贡献
  }
  return s;
}
function ringArea(pts: { x: number; y: number }[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[(i + 1) % pts.length];
    s += p.x * q.y - q.x * p.y;
  }
  return s / 2;
}

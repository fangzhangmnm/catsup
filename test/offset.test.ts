// offset 几何（0.8，2026-10-21）：矩形内缩 / 外扩、凹多边形退化边合并、过度内缩退化成空、进像表结算机 = 分割面。
import { describe, it, eq, assert } from "./runner.mjs";
import { offsetRing } from "../src/editor/offset.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";

const P = (x: number, y: number): Pt => ({ x, y });
const near = (a: Pt, b: Pt): boolean => Math.abs(a.x - b.x) < 1e-9 && Math.abs(a.y - b.y) < 1e-9;
const hasPt = (ring: Pt[], p: Pt): boolean => ring.some((q) => near(q, p));

describe("offset: 外环偏移", () => {
  it("矩形内缩 1 → 小矩形；外扩 1 → 大矩形；顺时针输入也行", () => {
    const r = [P(0, 0), P(10, 0), P(10, 6), P(0, 6)];
    const inset = offsetRing(r, -1);
    eq(inset.length, 4);
    for (const p of [P(1, 1), P(9, 1), P(9, 5), P(1, 5)]) assert(hasPt(inset, p), `内缩含 ${p.x},${p.y}`);
    const out = offsetRing(r, 1);
    for (const p of [P(-1, -1), P(11, -1), P(11, 7), P(-1, 7)]) assert(hasPt(out, p), `外扩含 ${p.x},${p.y}`);
    const cw = offsetRing([...r].reverse(), -1);
    for (const p of [P(1, 1), P(9, 5)]) assert(hasPt(cw, p), "顺时针输入同样内缩");
  });
  it("凹多边形（L 形）内缩：短臂被吃掉 → 退化边合并，环仍简单；过度内缩 → 空", () => {
    // L 形：10×10 去掉右上 6×6 → 臂宽 4
    const L = [P(0, 0), P(10, 0), P(10, 4), P(4, 4), P(4, 10), P(0, 10)];
    const a = offsetRing(L, -1);
    eq(a.length, 6, "内缩 1：仍六边");
    assert(hasPt(a, P(1, 1)) && hasPt(a, P(9, 1)) && hasPt(a, P(9, 3)) && hasPt(a, P(3, 3)) && hasPt(a, P(3, 9)) && hasPt(a, P(1, 9)), "六个新角");
    eq(offsetRing(L, -2.5).length, 0, "内缩 2.5：臂宽 4 两侧各吃 2.5 → 全没了（距边界 ≥ 2.5 的点不存在）");
    // 切角方：短边（√8 ≈ 2.83）内缩 3 → 被吃掉 → 退化边合并成四边形
    const C = [P(0, 0), P(10, 0), P(10, 8), P(8, 10), P(0, 10)];
    eq(offsetRing(C, -1).length, 5, "内缩 1：还是五边");
    eq(offsetRing(C, -3).length, 5, "内缩 3：切角边缩到 0.34 还在（2·d·tan22.5° = 2.49 < 2.83）");
    const c4 = offsetRing(C, -4);
    eq(c4.length, 4, `内缩 4：切角边被吃掉（缩 3.31 > 2.83）→ 四边（实得 ${c4.length}）`);
    assert(hasPt(c4, P(4, 4)) && hasPt(c4, P(6, 4)) && hasPt(c4, P(6, 6)) && hasPt(c4, P(4, 6)), "四角 = 4..6 方");
  });
  it("进像表结算机：面内画偏移环 = 分割成环带 + 内岛（SU offset 的结果）", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(10, 0)], [P(10, 0), P(10, 6)], [P(10, 6), P(0, 6)], [P(0, 6), P(0, 0)]]);
    const ring = offsetRing([P(0, 0), P(10, 0), P(10, 6), P(0, 6)], -1);
    k.addEdges(ring.map((p, i) => [p, ring[(i + 1) % ring.length]] as [Pt, Pt]));
    eq(k.faces().length, 2, "环带 + 内岛");
    assert(k.faces().some((f) => f.holes.length === 1), "有带洞的环带");
  });
});

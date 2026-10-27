// 软边两侧变 180° 自动并掉（纪元账本 FM80，2026-10-27 Claude Fable 5.1；user「自动折硬边的话软边180自愈是不是还是可以加？关键还是看不见的180度软边的谜语人问题」）。
// 规则住在 Kernel.moveVertices 末尾：本次碰到的软边、恰两张不同的膜、同一平面 → MERGE。不碰到的不动（老 180° 软边归修复「清理碎渣」）；硬边永不自愈（user「硬边不会自动自愈」）。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { selfCheck } from "../src/kernel/self-check.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const square = (x: number, y: number, s = 1): [Pt3, Pt3][] => [[P(x, y), P(x + s, y)], [P(x + s, y), P(x + s, y + s)], [P(x + s, y + s), P(x, y + s)], [P(x, y + s), P(x, y)]];
const edgeAt = (k: Kernel, a: Pt3, b: Pt3) => k.edges().find((e) => { const p = k.graph.pt(e.a), q = k.graph.pt(e.b); const s = (u: Pt3, v: Pt3) => Math.hypot(u.x - v.x, u.y - v.y, u.z - v.z) < 1e-9; return (s(p, a) && s(q, b)) || (s(p, b) && s(q, a)); })!;
const vertAt = (k: Kernel, p: Pt3) => k.vertices().find((v) => Math.hypot(v.x - p.x, v.y - p.y, v.z - p.z) < 1e-9)!;

/** 2×1 的面被中线切成两格；中线软化。 */
function split(): Kernel {
  const k = new Kernel();
  k.addEdges(square(0, 0, 2));
  k.addEdges([[P(1, 0), P(1, 2)]]);
  eq(k.faces().length, 2, "两格");
  k.setEdgeLayer("soft", [edgeAt(k, P(1, 0), P(1, 2)).id], true);
  return k;
}

describe("软边两侧变 180° 自动并掉（FM80）", () => {
  it("碰到软边的挪点（挪它的端点、仍共面）→ 两格并成一张；事件 MERGE；自检干净", () => {
    const k = split();
    const ev = k.moveVertices([{ id: vertAt(k, P(1, 0)).id, to: P(1.2, 0, 0) }]);
    eq(k.faces().length, 1, "并成一张");
    assert(ev.some((e) => e.type === "MERGE"), `事件 ${ev.map((e) => e.type).join(",")}`);
    eq(selfCheck(k).length, 0, "自检干净");
  });
  it("没碰到的 180° 软边不动（挪别的角）", () => {
    const k = split();
    k.moveVertices([{ id: vertAt(k, P(0, 0)).id, to: P(-0.2, 0, 0) }]);
    eq(k.faces().length, 2, "软边没被碰到，照旧两格");
  });
  it("先抬起中线一端（两侧不共面 → 不并），再放回去（共面 → 并）", () => {
    const k = split();
    const v = vertAt(k, P(1, 2)).id;
    k.moveVertices([{ id: v, to: P(1, 2, 0.5) }]);
    assert(k.faces().length >= 2, "抬起来：至少还是两张（可能再折）");
    const lifted = k.faces().length;
    k.moveVertices([{ id: v, to: P(1, 2, 0) }]);
    // 抬起时自动折出的缝是硬边（FM79：硬边不自愈），放平后留着；软的中线两侧又共面 → 并掉。断言：面少了、且没有一条「两侧同平面」的软边剩下
    assert(k.faces().length < lifted, `放平了：${lifted} → ${k.faces().length}`);
    const flatSoft = k.edges().filter((e) => k.isSoft(e.id) && e.faceLinks.length === 2 && e.faceLinks[0] !== e.faceLinks[1] && k.face(e.faceLinks[0])?.planeId === k.face(e.faceLinks[1])?.planeId);
    eq(flatSoft.length, 0, "没有 180° 的软边剩下");
    eq(selfCheck(k).length, 0, "自检干净");
  });
  it("硬边不自愈：同样的挪点，中线没软化 → 还是两格", () => {
    const k = new Kernel();
    k.addEdges(square(0, 0, 2)); k.addEdges([[P(1, 0), P(1, 2)]]);
    k.moveVertices([{ id: vertAt(k, P(1, 0)).id, to: P(1.2, 0, 0) }]);
    eq(k.faces().length, 2, "硬边留着");
  });
  it("局部 = 全局：同样的操作在两台机上事件 + 快照逐字相同", () => {
    const snap = split().toBrep();
    const a = Kernel.fromBrep(snap), b = Kernel.fromBrep(snap, { settleMode: "global" });
    const ea = JSON.stringify(a.moveVertices([{ id: vertAt(a, P(1, 0)).id, to: P(1.2, 0, 0) }]));
    const eb = JSON.stringify(b.moveVertices([{ id: vertAt(b, P(1, 0)).id, to: P(1.2, 0, 0) }]));
    eq(ea, eb, "事件");
    eq(JSON.stringify(a.toBrep()), JSON.stringify(b.toBrep()), "快照");
  });
});

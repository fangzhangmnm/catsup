// golden corpus —— 不动产。膜生命周期事件表（drill L411-419）「你的实验来源」列逐行场景化 + 暗礁①。
// 这些行为是人类在真 SketchUp 上实机做实验、证伪了两版 AI 假说之后逼出来的，当公理用。
// 暗礁①的期望值是**推导值**（中环擦=ABSORB 重嵌套、内环擦=BURST），待用户真机 SU 裁决；
// 若证伪，只改 face-lifecycle.ts 规则 + 本文件对应断言。

import { describe, it, eq, assert, todo } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";

const P = (x: number, y: number): Pt => ({ x, y });
const rect = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt][] => [
  [P(x0, y0), P(x1, y0)],
  [P(x1, y0), P(x1, y1)],
  [P(x1, y1), P(x0, y1)],
  [P(x0, y1), P(x0, y0)],
];
/** 造「日字」并按 y 中线定位两格。 */
function ri(k: Kernel) {
  k.addEdges([...rect(0, 0, 10, 10), [P(0, 5), P(10, 5)]]);
  return { lower: k.hitTest(P(5, 2.5), 0.1).face!, upper: k.hitTest(P(5, 7.5), 0.1).face! };
}

describe("golden: 膜事件表逐行", () => {
  it("描一笔出面 / retrace 出膜（BIRTH：诞生靠手势）", () => {
    const k = new Kernel();
    eq(k.addEdges(rect(0, 0, 10, 10))[0].type, "BIRTH", "描完最后一笔出面");
    k.eraseFaces(k.faces().map((f) => f.id));
    eq(k.addEdges([[P(0, 0), P(10, 0)]])[0].type, "BIRTH", "retrace 出膜");
  });

  it("日字两填擦中边 → MERGE（两三角→四边形同理）", () => {
    const k = new Kernel();
    ri(k);
    const mid = k.edges().find((e) => e.faceLinks.length === 2)!;
    eq(k.eraseEdges([mid.id])[0].type, "MERGE", "两膜并一");
    eq(k.faces().length, 1, "一面");
    // 两三角 → 四边形
    const k2 = new Kernel();
    k2.addEdges([...rect(0, 0, 10, 10), [P(0, 0), P(10, 10)]]);
    eq(k2.faces().length, 2, "对角线分两三角");
    const diag = k2.edges().find((e) => e.faceLinks.length === 2)!;
    eq(k2.eraseEdges([diag.id])[0].type, "MERGE", "并回四边形");
  });

  it("annulus 擦洞边 → ABSORB（愈合而不是丢面！drill L345）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 12, 12));
    k.addEdges(rect(4, 4, 8, 8));
    k.eraseFaces([k.hitTest(P(6, 6), 0.1).face!]);
    const holeEdge = k.faces()[0].holes[0].edges[0].edge;
    eq(k.eraseEdges([holeEdge])[0].type, "ABSORB", "吞洞");
    eq(k.faces()[0].holes.length, 0, "膜长大填平");
  });

  it("日字一填一空擦中边 → BURST（邻接 void 擦边界=破防）", () => {
    const k = new Kernel();
    const { upper } = ri(k);
    k.eraseFaces([upper]);
    const mid = k.edges().find((e) => e.faceLinks.length === 1 && Math.abs(k.graph.pt(e.a).y - 5) < 1e-9 && Math.abs(k.graph.pt(e.b).y - 5) < 1e-9)!;
    eq(k.eraseEdges([mid.id])[0].type, "BURST", "破膜");
    eq(k.faces().length, 0, "erase 永不凭空造面");
  });

  it("回字外填内空擦内边 → ABSORB；内填外空擦内边 → BURST（drill L352）", () => {
    // 外填内空：环带 + 空洞
    const a = new Kernel();
    a.addEdges(rect(0, 0, 12, 12));
    a.addEdges(rect(4, 4, 8, 8));
    a.eraseFaces([a.hitTest(P(6, 6), 0.1).face!]);
    eq(a.eraseEdges([a.faces()[0].holes[0].edges[0].edge])[0].type, "ABSORB", "被包裹 void 擦边界=整理");
    // 内填外空：内方有膜、环带空
    const b = new Kernel();
    b.addEdges(rect(0, 0, 12, 12));
    b.addEdges(rect(4, 4, 8, 8));
    b.eraseFaces([b.faces().find((f) => f.holes.length === 1)!.id]);
    const innerFace = b.faces()[0];
    eq(b.eraseEdges([innerFace.outer.edges[0].edge])[0].type, "BURST", "邻接 void 擦边界=破防");
    eq(b.faces().length, 0, "内方破裂");
  });

  it("move 闭合开折线 → 不出面；之后描一笔 → 出面（drill L344：move 绝对守恒）", () => {
    const k = new Kernel();
    k.addEdges([
      [P(0, 0), P(10, 0)],
      [P(10, 0), P(10, 10)],
      [P(10, 10), P(0, 10)],
      [P(0, 10), P(0, 2)],
    ]);
    eq(k.faces().length, 0, "开折线无面");
    const tail = k.vertices().find((v) => Math.abs(v.x - 0) < 1e-9 && Math.abs(v.y - 2) < 1e-9)!;
    const ev = k.moveVertices([{ id: tail.id, to: P(0, 0) }]);
    eq(ev.filter((e) => e.type === "BIRTH").length, 0, "move 不诞生");
    eq(k.faces().length, 0, "闭上了也没面");
    eq(k.edges().length, 4, "闭合方环四条边");
    eq(k.addEdges([[P(0, 0), P(10, 0)]])[0].type, "BIRTH", "描一笔就出");
  });

  it("STRETCH：move 保平面只拉伸，膜守恒、id 不变", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    const fid = k.faces()[0].id;
    const corner = k.vertices().find((v) => v.x === 0 && v.y === 0)!;
    const ev = k.moveVertices([{ id: corner.id, to: P(-5, -5) }]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "STRETCH", "STRETCH");
    eq(k.faces()[0].id, fid, "id 稳定");
    eq(k.faces().length, 1, "膜守恒");
  });

  it("dividing：画线横穿填面 → 两面都保膜（急切，无确认步）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    const ev = k.addEdges([[P(0, 5), P(10, 5)]]);
    eq(ev[0].type, "DIVIDE", "急切分割");
    eq(k.faces().length, 2, "双方都有膜");
  });

  it("eraseFace 后 retrace 复生（BURST 态 ≡ eraseFace 态）", () => {
    const k = new Kernel();
    const { upper, lower } = ri(k);
    void lower;
    k.eraseFaces([upper]);
    // retrace 上格任一边 → 上格复生
    const ev = k.addEdges([[P(0, 10), P(10, 10)]]);
    eq(ev[0].type, "BIRTH", "复生");
    eq(k.faces().length, 2, "两格都有");
  });
});

describe("golden: 暗礁①（三层回字 填-空-填）——期望值为推导值，待真机 SU 裁决", () => {
  /** 三层：外方20 / 中方4-16 / 内方8-12；中环带删膜 → 填-空-填 */
  function threeLayer() {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 20, 20));
    k.addEdges(rect(4, 4, 16, 16));
    k.addEdges(rect(8, 8, 12, 12));
    const midAnnulus = k.faces().find((f) => f.holes.length === 1 && k.hitTest(P(6, 10), 0.1).face === f.id)!;
    k.eraseFaces([midAnnulus.id]);
    eq(k.faces().length, 2, "外环带 + 内方");
    return k;
  }

  it("擦中环（外环带的洞边）→ ABSORB，外膜长满但内方岛保持", () => {
    const k = threeLayer();
    const outerAnnulus = k.faces().find((f) => k.hitTest(P(2, 10), 0.1).face === f.id)!;
    const ev = k.eraseEdges([outerAnnulus.holes[0].edges[0].edge]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "ABSORB", "整理不打架");
    eq(k.faces().length, 2, "外膜 + 内方岛都在");
    const big = k.faces().find((f) => f.holes.length === 1)!;
    assert(!!big, "外膜长满后以内方为洞（重嵌套）");
    assert(k.hitTest(P(6, 10), 0.1).face === big.id, "原中环带区域被吞进外膜");
  });

  it("擦内环（内方的外环边）→ BURST 内方，外环带不受牵连", () => {
    const k = threeLayer();
    const innerFace = k.faces().find((f) => k.hitTest(P(10, 10), 0.1).face === f.id)!;
    const ev = k.eraseEdges([innerFace.outer.edges[0].edge]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "BURST", "邻接空环带=void，破防");
    eq(k.faces().length, 1, "只剩外环带");
    eq(k.faces()[0].holes.length, 1, "外环带的洞（中环）原样");
  });
});

describe("golden: 后续里程碑占位", () => {
  todo("DEDUP-MERGE：sticky 撞合去重成双面单膜（stuck cube；3D，M4）");
  todo("AUTOFOLD-SPLIT：move 破坏平面性自动折面（3D，M4）");
  todo("move 拖边横穿他面 → 急切 dividing（M2 Move 完整版）");
  todo("push/pull 非流形撞合的膜归属：BURST+BIRTH vs DEDUP-MERGE（暗礁②，M4）");
  todo("coplanarity 容差旋钮（头号 UX 旋钮；M3 升维）");
});

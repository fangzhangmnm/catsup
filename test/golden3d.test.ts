// M3 升维 golden：多平面 coplanarity 分组 + radial erase 裁决 + τ 旋钮。
// SU 行为依据：立方体擦棱 → 两邻面都消失（不同平面共享边 ≠ MERGE）；
// 同平面共享边才 MERGE；drill L298「边到面的链接是 radial cycle」。

import { describe, it, eq, assert, todo } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { PtIn } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z = 0): PtIn => ({ x, y, z });
function loop(k: Kernel, pts: PtIn[]): ReturnType<Kernel["addEdges"]> {
  const segs: [PtIn, PtIn][] = [];
  for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  return k.addEdges(segs);
}

describe("golden3d: 多平面", () => {
  it("地面方 + 竖墙（共享边）→ 各自 BIRTH，共享边 faceLinks=2（radial）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);                    // 地面 z=0
    const ev = loop(k, [P(0, 0), P(10, 0), P(10, 0, 8), P(0, 0, 8)]);     // 竖墙 y=0
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "BIRTH", "墙面诞生");
    eq(k.faces().length, 2, "两面");
    const shared = k.edges().find((e) => e.faceLinks.length === 2)!;
    assert(!!shared, "共享边挂两面");
    const [f1, f2] = shared.faceLinks.map((id) => k.face(id)!);
    assert(f1.planeId !== f2.planeId, "两面在不同平面（radial 而非同平面并列）");
  });

  it("擦不同平面的共享边 → 两面都 BURST（不是 MERGE——立方体擦棱行为）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    loop(k, [P(0, 0), P(10, 0), P(10, 0, 8), P(0, 0, 8)]);
    const shared = k.edges().find((e) => e.faceLinks.length === 2)!;
    const ev = k.eraseEdges([shared.id]);
    eq(ev.filter((e) => e.type === "BURST").length, 2, "双双破膜");
    eq(ev.filter((e) => e.type === "MERGE").length, 0, "绝不跨平面 MERGE");
    eq(k.faces().length, 0, "全空");
  });

  it("同平面（竖墙）两格共享边 → 擦共边 MERGE（同平面才并）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 0, 8), P(0, 0, 8)]);   // 竖墙
    k.addEdges([[P(5, 0), P(5, 0, 8)]]);                      // 中缝 → DIVIDE
    eq(k.faces().length, 2, "两格");
    const mid = k.edges().find((e) => e.faceLinks.length === 2)!;
    const ev = k.eraseEdges([mid.id]);
    eq(ev.length, 1, "一个事件");
    eq(ev[0].type, "MERGE", "同平面并膜");
    eq(k.faces().length, 1, "一面");
  });

  it("底+四墙手绘 → 第四面墙封口时顶面自动涌现（闭合空环即生膜）；12 棱各挂 2 面；擦一棱 → 恰 2 面 BURST", () => {
    const k = new Kernel();
    const S = 10, H = 10;
    loop(k, [P(0, 0), P(S, 0), P(S, S), P(0, S)]);                         // 底
    loop(k, [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)]);                   // 前
    loop(k, [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)]);                   // 右
    loop(k, [P(S, S), P(0, S), P(0, S, H), P(S, S, H)]);                   // 后
    const evLast = loop(k, [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]);    // 左（封口）
    eq(evLast.filter((e) => e.type === "BIRTH").length, 2, "第四面墙 + 顶面同批诞生（墙顶边闭合了顶环）");
    eq(k.faces().length, 6, "六面（顶面涌现，没人显式画它）");
    eq(k.edges().length, 12, "十二棱");
    assert(k.edges().every((e) => e.faceLinks.length === 2), "每棱 radial 挂两面");
    // 纯 retrace 顶边 → 已有面，无事件（幂等）
    const evTop = loop(k, [P(0, 0, H), P(S, 0, H), P(S, S, H), P(0, S, H)]);
    eq(evTop.length, 0, "重描已填环无事件");
    const ev = k.eraseEdges([k.edges()[0].id]);
    eq(ev.filter((e) => e.type === "BURST").length, 2, "擦棱 → 两邻面消失");
    eq(k.faces().length, 4, "剩四面");
  });

  it("竖直平面上的回字（环带带洞）照常工作——2D 管线经基投影复用", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(12, 0), P(12, 0, 12), P(0, 0, 12)]);
    loop(k, [P(4, 0, 4), P(8, 0, 4), P(8, 0, 8), P(4, 0, 8)]);   // 墙内画小方 → DIVIDE
    eq(k.faces().length, 2, "环带+内方");
    const holed = k.faces().find((f) => f.holes.length === 1);
    assert(!!holed, "竖直平面也有带洞面");
  });
});

describe("golden3d: coplanarity 容差旋钮 τ", () => {
  it("τ=0.5：z=0 与 z=0.3 的两个不重叠方归入同一平面身份", () => {
    const k = new Kernel({ coplanarTol: 0.5 });
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    loop(k, [P(20, 0, 0.3), P(30, 0, 0.3), P(30, 10, 0.3), P(20, 10, 0.3)]);
    eq(k.faces().length, 2, "两面都生");
    const [a, b] = k.faces();
    eq(a.planeId, b.planeId, "同一平面身份（容差合并）");
  });

  it("τ=1e-3（默认）：z 差 0.3 → 不同平面身份", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    loop(k, [P(20, 0, 0.3), P(30, 0, 0.3), P(30, 10, 0.3), P(20, 10, 0.3)]);
    eq(k.faces().length, 2, "两面都生");
    const [a, b] = k.faces();
    assert(a.planeId !== b.planeId, "平面身份分开");
  });
});

describe("golden3d: 占位", () => {
  todo("把顶点拖出面平面 → AUTOFOLD-SPLIT 折面守恒（M4；当前面会静默消失）");
  todo("倾斜平面（非轴对齐）上的完整事件表回归");
});

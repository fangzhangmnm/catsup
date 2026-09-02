// push/pull golden —— 灵魂手势与协议骑乘（spec = roadmap §三 / kernel.pushPull 注释）。
// created by Claude Fable 5, 2026-09-01
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { PtIn } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z = 0): PtIn => ({ x, y, z });
function loop(k: Kernel, pts: PtIn[]): ReturnType<Kernel["addEdges"]> {
  const segs: [PtIn, PtIn][] = [];
  for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  return k.addEdges(segs);
}
const edgeSet = (k: Kernel): string => k.edges().map((e) => {
  const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
  const s1 = `${a.x},${a.y},${a.z}`, s2 = `${b.x},${b.y},${b.z}`;
  return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
}).sort().join(" ");

describe("push/pull: 灵魂手势", () => {
  it("矩形 + pp = 三手势立方体，与手绘六面逐字等价", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    const ev = k.pushPull(k.faces()[0].id, 8);
    eq(k.faces().length, 6, "六面");
    eq(k.edges().length, 12, "十二棱");
    assert(k.edges().every((e) => e.faceLinks.length === 2), "每棱 radial 挂两面");
    eq(ev.filter((e) => e.type === "BIRTH").length, 5, "四壁+底面诞生（顶面=被拉的原膜跟随）");
    // 手绘对照组（golden3d 同款五 loop 造盒）
    const h = new Kernel();
    const S = 10, H = 8;
    loop(h, [P(0, 0), P(S, 0), P(S, S), P(0, S)]);
    loop(h, [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)]);
    loop(h, [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)]);
    loop(h, [P(S, S), P(0, S), P(0, S, H), P(S, S, H)]);
    loop(h, [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]);
    eq(edgeSet(k), edgeSet(h), "几何逐边等价于手绘");
    eq(h.faces().length, 6, "对照组六面");
  });

  it("盒面再拉 = 纯 sticky 伸缩（无新面无补壁）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    k.pushPull(k.faces()[0].id, 8);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 8))!;
    k.pushPull(top.id, 5);
    eq(k.faces().length, 6, "仍六面");
    eq(k.edges().length, 12, "仍十二棱");
    assert(k.faces().some((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 13)), "顶面到 z=13");
  });

  it("负向 push = 盒变矮（墙 sticky 收缩）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    k.pushPull(k.faces()[0].id, 8);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 8))!;
    k.pushPull(top.id, -3);
    eq(k.faces().length, 6, "六面");
    assert(k.faces().some((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 5)), "顶面回落 z=5");
  });

  it("推到与底重合 = v1 普通 sticky（dedup 1+1=1 闭盒→平板；挖洞特例待真机裁决）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    k.pushPull(k.faces()[0].id, 8);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 8))!;
    k.pushPull(top.id, -8);
    assert(k.faces().length >= 1, "不炸即可（终态语义待挖洞 grill 定）");
    assert(k.edges().every((e) => {
      const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
      return a.z === 0 && b.z === 0;
    }), "全部几何压回地面");
  });
});

describe("push/pull: 带洞面（generic 路径）", () => {
  it("回字环带面 pp → 方管（外壁+内壁+底环带，膜守恒无遗漏）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(20, 0), P(20, 20), P(0, 20)]);
    loop(k, [P(6, 6), P(14, 6), P(14, 14), P(6, 14)]);   // 内方 → DIVIDE 环带+岛
    const ring = k.faces().find((f) => f.holes.length === 1)!;
    const island = k.faces().find((f) => f.holes.length === 0)!;
    k.eraseFaces([island.id]);                            // 只留环带膜
    k.pushPull(ring.id, 5);
    // 期望：顶环带(跟随) + 底环带(补) + 外壁×4 + 内壁×4 = 10 膜；棱 = 顶8+底8+竖8 = 24
    eq(k.faces().length, 10, "方管十膜");
    eq(k.edges().length, 24, "二十四棱");
    assert(k.edges().every((e) => e.faceLinks.length === 2), "每棱 radial 挂两面（流形管）");
  });
});

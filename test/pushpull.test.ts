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

  it("E5 推平到底 = XOR 成对湮灭 → 空环（user 拍板；铅笔描一笔肥皂膜复活）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    k.pushPull(k.faces()[0].id, 8);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 8))!;
    const ev = k.pushPull(top.id, -8);
    eq(k.faces().length, 0, "顶⊕底成对湮灭，无膜");
    eq(k.edges().length, 4, "只剩地面空环");
    assert(ev.some((e) => e.type === "BURST"), "湮灭有 BURST 曝光");
    // 描一笔复活（user：不疼）
    const rv = k.addEdges([[P(0, 0), P(10, 0)]]);
    eq(rv[0].type, "BIRTH", "retrace 复活");
    eq(k.faces().length, 1, "膜回来了");
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


describe("push/pull: 子面（detach）与 parity 设面（XOR 拍板 2026-09-02）", () => {
  function boxWithInner(): { k: Kernel; inner: import("../src/kernel/kernel.ts").FaceId } {
    const k = new Kernel();
    loop(k, [P(0, 0), P(20, 0), P(20, 20), P(0, 20)]);
    k.pushPull(k.faces()[0].id, 8);
    k.addEdges([
      [P(6, 6, 8), P(14, 6, 8)], [P(14, 6, 8), P(14, 14, 8)],
      [P(14, 14, 8), P(6, 14, 8)], [P(6, 14, 8), P(6, 6, 8)],
    ]);
    const inner = k.hitTest(P(10, 10, 8), 0.1).face!;
    return { k, inner };
  }

  it("E3 推半程 = 井（井口敞开、井壁井底、环带留守）", () => {
    const { k, inner } = boxWithInner();
    k.pushPull(inner, -3);
    eq(k.faces().length, 11, "环带顶+4外壁+满底+4井壁+井底");
    assert(k.hitTest(P(10, 10, 8), 0.1).face === undefined, "井口敞开（原膜蒸发）");
    assert(k.hitTest(P(10, 10, 5), 0.1).face !== undefined, "井底有膜");
    assert(k.hitTest(P(10, 10, 0), 0.1).face !== undefined, "大底完好");
    assert(k.hitTest(P(2, 2, 8), 0.1).face !== undefined, "顶环带留守");
  });

  it("E1 推到底 = 甜甜圈（着陆环切开大底、内片 parity 翻灭、洞穿）", () => {
    const { k, inner } = boxWithInner();
    const ev = k.pushPull(inner, -8);
    eq(k.faces().length, 10, "顶环带+底环带+4外壁+4井壁，洞穿");
    assert(k.hitTest(P(10, 10, 8), 0.1).face === undefined, "顶开洞");
    assert(k.hitTest(P(10, 10, 0), 0.1).face === undefined, "底开洞（XOR 湮灭）");
    assert(k.hitTest(P(2, 2, 0), 0.1).face !== undefined, "底环带留守");
    assert(k.hitTest(P(6, 10, 4), 0.1).face !== undefined, "井壁成型");
    assert(k.edges().every((e) => e.faceLinks.length === 2), "全流形（甜甜圈）");
    assert(ev.some((e) => e.type === "BURST"), "洞穿有 BURST 曝光");
  });
});

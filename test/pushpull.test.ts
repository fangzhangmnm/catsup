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

  it("E5 推平到底 = 彻底消失（边随葬推论；F1 实测 SU 同款湮灭 2026-09-02）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    k.pushPull(k.faces()[0].id, 8);
    const top = k.faces().find((f) => k.faceRings3(f.id)!.outer.every((p) => p.z === 8))!;
    const ev = k.pushPull(top.id, -8);
    eq(k.faces().length, 0, "顶⊕底成对湮灭");
    eq(k.edges().length, 0, "湮灭膜的环边无人引用 → 随葬（压到零体积=无）");
    eq(k.vertices().length, 0, "顶点随边 GC");
    assert(ev.some((e) => e.type === "BURST"), "湮灭有 BURST 曝光");
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

describe("push/pull: E8 角块（混合 detach——墙 L 缺口，2026-09-02 实机证实）", () => {
  function cornerScene(): { k: Kernel; blk: import("../src/kernel/kernel.ts").FaceId } {
    const k = new Kernel();
    loop(k, [P(0, 0), P(20, 0), P(20, 20), P(0, 20)]);
    k.pushPull(k.faces()[0].id, 8);
    // 角块：两边贴 rim（x=20 与 y=0），两边在顶面内部
    loop(k, [P(12, 0, 8), P(20, 0, 8), P(20, 6, 8), P(12, 6, 8)]);
    return { k, blk: k.hitTest(P(16, 3, 8), 0.1).face! };
  }

  it("半推：井口敞开、地板落中、两面墙出 L 缺口（扫带 parity 翻灭）", () => {
    const { k, blk } = cornerScene();
    k.pushPull(blk, -3);
    eq(k.faces().length, 9, "L环带+2完墙+2缺口墙+底+地板+2井壁");
    assert(k.hitTest(P(16, 3, 8), 0.1).face === undefined, "井口敞开");
    assert(k.hitTest(P(16, 3, 5), 0.1).face !== undefined, "地板@z=5");
    assert(k.hitTest(P(16, 0, 6.5), 0.1).face === undefined, "墙 y=0 扫带空（L 缺口）");
    assert(k.hitTest(P(5, 0, 4), 0.1).face !== undefined, "墙 y=0 余部完好");
    // 裸线清理（2026-09-02「L 的线没删掉」修）：扫带顶边两侧膜全灭 → 边随膜走
    assert(!k.edges().some((e) => {
      const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
      return a.z === 8 && b.z === 8 && a.y === 0 && b.y === 0 && a.x >= 12 && b.x >= 12;
    }), "扫带顶边(12..20,0,8)已清（L 环带自己的 rim 段不在此列）");
    assert(k.hitTest(P(20, 3, 6.5), 0.1).face === undefined, "墙 x=20 扫带空");
    assert(k.hitTest(P(5, 10, 8), 0.1).face !== undefined, "顶 L 环带完好");
  });

  it("推到底：底角打穿（贴边着陆同样 XOR——有意不跟 SU 的留膜 if）", () => {
    const { k, blk } = cornerScene();
    k.pushPull(blk, -8);
    eq(k.faces().length, 8, "直通 L 槽");
    assert(k.hitTest(P(16, 3, 0), 0.1).face === undefined, "底角被打穿");
    assert(k.hitTest(P(5, 10, 0), 0.1).face !== undefined, "底余部完好");
    assert(k.hitTest(P(12, 3, 4), 0.1).face !== undefined, "井壁成型");
  });
});

describe("push/pull v3: 垂直判据（user 2026-09-02 拍板——move 仅当不改邻膜斜度）", () => {
  it("台阶：拉半顶 → 墙一体伸缩成 L 单面、零缝边（v2 分歧①修复）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(20, 0), P(20, 20), P(0, 20)]);
    k.pushPull(k.faces()[0].id, 8);
    k.addEdges([[P(0, 10, 8), P(20, 10, 8)]]);
    const half = k.hitTest(P(10, 15, 8), 0.1).face!;
    k.pushPull(half, 6);
    eq(k.faces().length, 8, "下半顶+凸台顶+竖脸+4外墙+底");
    const seam = k.edges().filter((e) => {
      const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
      return a.z === 8 && b.z === 8 && a.y >= 10 && b.y >= 10 && !(a.y === 10 && b.y === 10);
    });
    eq(seam.length, 0, "凸台外缘零缝边（墙一体伸缩）");
    assert(k.hitTest(P(10, 20, 4), 0.1).face !== undefined && k.hitTest(P(10, 20, 11), 0.1).face !== undefined, "y=20 墙上下连续");
    const wallY20 = k.hitTest(P(10, 20, 4), 0.1).face;
    eq(k.hitTest(P(10, 20, 11), 0.1).face, wallY20, "上下是同一张墙膜");
    assert(k.edges().every((e) => e.faceLinks.length > 0), "无裸边");
    // 拍平回去（用户病例后半）：干净还原
    const top2 = k.hitTest(P(10, 15, 14), 0.1).face!;
    k.pushPull(top2, -6);
    eq(k.faces().length, 7, "盒+分半顶");
    eq(k.edges().length, 15, "12 棱+中线+顶点切分=15，零残留");
    assert(!k.edges().some((e) => k.graph.pt(e.a).z > 8 || k.graph.pt(e.b).z > 8), "z>8 无残留");
  });

  it("棱台：拉斜面围成的顶 → 全 COPY（斜度不变），长方块不拉斜（SU 图19/20）", () => {
    const k = new Kernel();
    // 棱台：底 20²、顶 12²（斜壁），手绘五环
    loop(k, [P(0, 0), P(20, 0), P(20, 20), P(0, 20)]);
    loop(k, [P(0, 0), P(20, 0), P(16, 4, 6), P(4, 4, 6)]);
    loop(k, [P(20, 0), P(20, 20), P(16, 16, 6), P(16, 4, 6)]);
    loop(k, [P(20, 20), P(0, 20), P(4, 16, 6), P(16, 16, 6)]);
    loop(k, [P(0, 20), P(0, 0), P(4, 4, 6), P(4, 16, 6)]);
    eq(k.faces().length, 6, "棱台六面（顶自动涌现）");
    const top = k.hitTest(P(10, 10, 6), 0.1).face!;
    k.pushPull(top, 5);
    // 斜面斜度必须不变（COPY 判据本体）
    for (const f of k.faces()) {
      const n = k.planeOf(f.id)!.plane.n;
      const isSlant = Math.abs(n.z) > 1e-6 && Math.abs(Math.abs(n.z) - 1) > 1e-6;
      if (isSlant) {
        const r = k.faceRings3(f.id)!;
        assert(r.outer.every((p) => p.z <= 6 + 1e-6), `斜面未被拉动/拉斜（面#${f.id}）`);
      }
    }
    assert(k.hitTest(P(10, 10, 11), 0.1).face !== undefined, "方块顶@11");
    assert(k.hitTest(P(4, 10, 8.5), 0.1).face !== undefined, "方块直立侧壁");
    assert(k.hitTest(P(10, 10, 6), 0.1).face === undefined, "口开（无内部地板）");
    assert(k.edges().every((e) => e.faceLinks.length > 0), "无裸边");
  });
});

describe("push/pull: F7 棱台甜甜圈（SU 实测回填）", () => {
  it("F7 棱台推到底 = 甜甜圈领圈（SU 实测同款 2026-09-02：顶底不同大→着陆打穿）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(20, 0), P(20, 20), P(0, 20)]);
    loop(k, [P(0, 0), P(20, 0), P(16, 4, 6), P(4, 4, 6)]);
    loop(k, [P(20, 0), P(20, 20), P(16, 16, 6), P(16, 4, 6)]);
    loop(k, [P(20, 20), P(0, 20), P(4, 16, 6), P(16, 16, 6)]);
    loop(k, [P(0, 20), P(0, 0), P(4, 4, 6), P(4, 16, 6)]);
    const top = k.hitTest(P(10, 10, 6), 0.1).face!;
    k.pushPull(top, -6);
    eq(k.faces().length, 9, "底环带+4斜面+4井壁");
    assert(k.hitTest(P(10, 10, 0), 0.1).face === undefined, "底中心洞穿");
    assert(k.hitTest(P(2, 10, 0), 0.1).face !== undefined, "底环带在");
    assert(k.hitTest(P(4, 10, 3), 0.1).face !== undefined, "井壁在");
    assert(k.hitTest(P(10, 10, 6), 0.1).face === undefined, "顶口开");
    assert(k.edges().every((e) => e.faceLinks.length > 0), "零裸边");
  });
});

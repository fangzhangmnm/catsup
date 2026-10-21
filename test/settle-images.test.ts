// 像表结算机 golden（2026-10-21，Claude Fable 5.1）——09-23 算法 QA 的两案 + 结算机的几条规则各钉一条。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { PtIn } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z = 0): PtIn => ({ x, y, z });
function loop(k: Kernel, pts: PtIn[]): ReturnType<Kernel["addEdges"]> {
  const segs: [PtIn, PtIn][] = [];
  for (let i = 0; i < pts.length; i++) segs.push([pts[i], pts[(i + 1) % pts.length]]);
  return k.addEdges(segs);
}
const cube = (s = 10): Kernel => { const k = new Kernel(); loop(k, [P(0, 0), P(s, 0), P(s, s), P(0, s)]); k.pushPull(k.faces()[0].id, s); return k; };
const faceAt = (k: Kernel, p: PtIn): number | undefined => k.hitTest(p, 1e-3).face;
const invariants = (k: Kernel): void => {
  for (const f of k.faces()) for (const ring of [f.outer, ...f.holes]) for (const d of ring.edges) {
    assert(k.graph.hasEdge(d.edge), `面 ${f.id} 环边 ${d.edge} 不存在`);
    assert(k.graph.edge(d.edge).faceLinks.includes(f.id), `面 ${f.id} 环边 ${d.edge} faceLinks 不含它`);
  }
  for (const v of k.graph.vertices()) assert(v.edges.size > 0, `孤立顶点 ${v.id}`);
};

describe("像表结算机: 09-23 算法 QA 两案", () => {
  it("bug 1：立方体 +X 面横切两半、上半推到对面 → 上半与对面上半成对湮灭，剩下半盒（6 面 12 棱零残留）", () => {
    const k = cube();
    k.addEdges([[P(10, 0, 5), P(10, 10, 5)]]);
    const upper = faceAt(k, P(10, 5, 7.5))!;
    assert(upper !== undefined, "上半面存在");
    k.pushPull(upper, -10);
    invariants(k);
    eq(k.faces().length, 6, "下半盒六面");
    eq(k.edges().length, 12, "十二棱");
    assert(faceAt(k, P(0, 5, 7.5)) === undefined, "对面上半消失（成对湮灭）");
    assert(faceAt(k, P(0, 5, 2.5)) !== undefined, "对面下半仍在");
    assert(faceAt(k, P(5, 5, 5)) !== undefined, "新顶面在 z=5");
    assert(!k.vertices().some((v) => v.z > 5), "z>5 零残留");
  });

  it("bevel：顶面切角三角推到底 = 五棱柱（7 面）、零残边；预演在精确 h 同样干净", () => {
    const mk = (): [Kernel, number] => {
      const k = cube();
      k.addEdges([[P(6, 10, 10), P(10, 6, 10)]]);
      const tri = faceAt(k, P(9, 9, 10))!;
      assert(tri !== undefined, "切角三角存在");
      return [k, tri];
    };
    const [k, tri] = mk();
    k.pushPull(tri, -10);
    invariants(k);
    eq(k.faces().length, 7, "五棱柱：顶五边 + 底五边 + 5 侧面");
    eq(k.edges().length, 15, "五棱柱 15 棱");
    assert(faceAt(k, P(8, 8, 5)) !== undefined, "斜切面在");
    assert(faceAt(k, P(9.5, 9.5, 0)) === undefined, "底面角被切掉");
    const [kp, trip] = mk();
    kp.pushPull(trip, -10, { settleLanding: false });
    invariants(kp);
    assert(faceAt(kp, P(8, 8, 5)) !== undefined, "预演：斜切面在");
    assert(!kp.edges().some((e) => { const a = kp.graph.pt(e.a), b = kp.graph.pt(e.b); return Math.abs(a.z - b.z) > 1e-9 && Math.abs(a.z - b.z) < 1e-3; }), "预演：无 µm 级碎边");
  });
});

describe("像表结算机: 规则", () => {
  it("盒顶拉高：旧顶棱随葬、旧角点溶解（墙是四边形不是六边形）", () => {
    const k = cube();
    const top = faceAt(k, P(5, 5, 10))!;
    k.pushPull(top, 5);
    invariants(k);
    eq(k.faces().length, 6, "六面");
    eq(k.vertices().length, 8, "八顶点（旧角点溶解）");
    for (const f of k.faces()) eq(f.outer.edges.length, 4, "每面四边");
  });

  it("用户自己的分割点不溶解（不对称律）：两笔共线画线留两条边，之后推拉也不并", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);
    k.addEdges([[P(5, 10), P(5, 12)]]);   // T 触碰：顶边被切成两段
    const before = k.edges().length;
    k.eraseEdges([k.edges().find((e) => { const a = k.graph.pt(e.a), b = k.graph.pt(e.b); return a.y === 12 || b.y === 12; })!.id]);
    eq(k.edges().length, before - 1, "擦掉 T 触臂后切分点仍在（二度共线）");
    const f = k.faces()[0].id;
    k.pushPull(f, 3);
    invariants(k);
    assert(k.vertices().some((v) => v.x === 5 && v.y === 10 && v.z === 0), "推拉后用户的分割点仍在底环");
  });

  it("只共享一个顶点的邻膜不被拽（旧 v3.1 守卫案 by construction）", () => {
    const k = new Kernel();
    loop(k, [P(0, 0), P(10, 0), P(10, 10), P(0, 10)]);                 // 地板
    loop(k, [P(10, 10, 0), P(20, 10, 0), P(20, 10, 8), P(10, 10, 8)]); // 墙：只在 (10,10,0) 碰地板一角
    const wall = faceAt(k, P(15, 10, 4))!;
    k.pushPull(wall, 3);
    invariants(k);
    const floor = faceAt(k, P(5, 5, 0))!;
    assert(floor !== undefined, "地板在");
    eq(k.face(floor)!.outer.edges.length, 4, "地板仍四边");
    assert(k.vertices().some((v) => v.x === 10 && v.y === 10 && v.z === 0), "地板角点不动");
  });

  it("推穿后再拉回：往返无残留", () => {
    const k = cube();
    k.addEdges([[P(3, 3, 10), P(7, 3, 10)], [P(7, 3, 10), P(7, 7, 10)], [P(7, 7, 10), P(3, 7, 10)], [P(3, 7, 10), P(3, 3, 10)]]);
    const inner = faceAt(k, P(5, 5, 10))!;
    k.pushPull(inner, -10);
    invariants(k);
    assert(faceAt(k, P(5, 5, 0)) === undefined, "底面打穿");
    eq(k.faces().length, 10, "环带顶 + 底环带 + 4 外墙 + 4 内壁（管子）");
  });
});

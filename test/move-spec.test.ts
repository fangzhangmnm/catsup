// move spec golden 靶（spec = ai-docs/20260901-move-spec.md §5；user 2026-09-01 拍板）。
// created by Claude Fable 5, 2026-09-01
// 靶 1/2 = 旧版验尸重现①②（20260901-move-postmortem.md）——旧内核在这两个输入上产出
// 幽灵切点+V形折线+静默吞move；新协议下它们必须是无聊的正确答案。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt } from "../src/kernel/kernel.ts";
import { emptySelection, moveTargetsSelection, translateMoves } from "../src/playground/tools.ts";
import { pointOnSegment3, samePt3, segIntersections3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number): Pt => ({ x, y });
const rect = (x0: number, y0: number, x1: number, y1: number): [Pt, Pt][] => [
  [P(x0, y0), P(x1, y0)], [P(x1, y0), P(x1, y1)], [P(x1, y1), P(x0, y1)], [P(x0, y1), P(x0, y0)],
];
const edgeSet = (k: Kernel): string[] =>
  k.edges().map((e) => {
    const a = k.graph.pt(e.a), b = k.graph.pt(e.b);
    const s1 = `${a.x},${a.y}`, s2 = `${b.x},${b.y}`;
    return s1 < s2 ? `${s1}|${s2}` : `${s2}|${s1}`;
  }).sort();
const moveBy = (k: Kernel, vids: number[], dx: number, dy: number) =>
  k.moveVertices(translateMoves(k, vids, { x: dx, y: dy }));

describe("move-spec: sticky geometry 协议", () => {
  it("靶1 验尸重现①：整移边跨静态边 → 直达终位、零幽灵切点、零吞move", () => {
    const k = new Kernel();
    k.addEdges([[P(5, 5), P(5, 15)]]);
    k.addEdges([[P(0, 0), P(10, 0)]]);
    const vids = k.vertices().filter((v) => v.y === 0).map((v) => v.id);
    const ev = moveBy(k, vids, 0, 20);
    eq(k.edges().length, 2, "两条边，无碎裂");
    eq(edgeSet(k).join(" "), "0,20|10,20 5,15|5,5", "M 直达 y=20 一整条；S 原样");
    eq(ev.length, 0, "裸边移动无膜事件");
  });

  it("靶2 验尸重现②：边移进膜内 → 膜边界原样、膜活、悬边落内", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 20, 20));
    const fid = k.faces()[0].id;
    k.addEdges([[P(30, 5), P(30, 15)]]);
    const vids = k.vertices().filter((v) => v.x === 30).map((v) => v.id);
    moveBy(k, vids, -25, 0);
    eq(k.faces().length, 1, "膜活");
    eq(k.faces()[0].id, fid, "id 稳定");
    eq(k.edges().length, 5, "4 边界 + 1 悬边，无幽灵切点");
    assert(edgeSet(k).includes("5,15|5,5"), "悬边完整落在 (5,5)-(5,15)");
  });

  it("靶3 蝴蝶结：单顶点拖穿 → 自切两瓣、两瓣全填（1+1=1 不看方向）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    const fid = k.faces()[0].id;
    const d = k.vertices().find((v) => v.x === 0 && v.y === 10)!;
    const ev = k.moveVertices([{ id: d.id, to: P(20, 10) }]);
    eq(k.faces().length, 2, "两瓣都有膜");
    const div = ev.find((e) => e.type === "DIVIDE");
    assert(div !== undefined && div.type === "DIVIDE" && div.from === fid && div.into.length === 2, "DIVIDE 一分为二带血缘");
    assert(k.hitTest(P(5, 2), 0.1).face !== undefined, "左瓣填");
    assert(k.hitTest(P(11, 9), 0.1).face !== undefined, "右瓣填（反向瓣不抵消）");
  });

  it("靶4 压扁：膜移成零面积 → 无膜 + BURST 曝光（不静默）", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    const fid = k.faces()[0].id;
    const right = k.vertices().filter((v) => v.x === 10);
    const ev = k.moveVertices(right.map((v) => ({ id: v.id, to: P(0, v.y) })));
    eq(k.faces().length, 0, "无膜");
    assert(ev.some((e) => e.type === "BURST" && e.face === fid), "BURST 曝光");
    eq(k.edges().length, 1, "几何坍缩成单边（sticky 有损去重）");
  });

  it("靶5 重叠 dedup：填膜压填膜 → A/O/B 三膜全填、与静态叠画逐胞腔等价", () => {
    const k = new Kernel();
    k.addEdges(rect(0, 0, 10, 10));
    k.addEdges(rect(20, 0, 30, 10));
    const sq2 = k.vertices().filter((v) => v.x >= 20).map((v) => v.id);
    const ev = moveBy(k, sq2, -15, 0);
    eq(k.faces().length, 3, "A/O/B 三膜");
    for (const [x, label] of [[2.5, "A"], [7.5, "O"], [12.5, "B"]] as [number, string][]) {
      assert(k.hitTest(P(x, 5), 0.1).face !== undefined, `${label} 填`);
    }
    eq(ev.filter((e) => e.type === "DIVIDE").length, 2, "双方各 DIVIDE");
    eq(ev.filter((e) => e.type === "MERGE").length, 1, "重叠区 MERGE（膜没有出身）");
    // 等价性：静态先后画两个矩形到同一终态
    const k2 = new Kernel();
    k2.addEdges(rect(0, 0, 10, 10));
    k2.addEdges(rect(5, 0, 15, 10));
    eq(k2.faces().length, 3, "静态叠画同为三膜");
    eq(edgeSet(k).join(" "), edgeSet(k2).join(" "), "终态几何逐边等价");
  });

  it("靶6 守恒律：move 闭合开折线 → 不出膜（无手势身份）", () => {
    const k = new Kernel();
    k.addEdges([[P(0, 0), P(10, 0)], [P(10, 0), P(10, 10)], [P(10, 10), P(0, 10)]]);
    const end = k.vertices().find((v) => v.x === 0 && v.y === 10)!;
    k.moveVertices([{ id: end.id, to: P(0, 0) }]);
    eq(k.faces().length, 0, "闭环无膜（诞生只靠手势）");
    eq(k.edges().length, 3, "三边闭合三角环");
  });

  it("靶7 多选混移：线+面混选一批刚移 → 全员平移、id 稳定、单 STRETCH", () => {
    const k = new Kernel();
    k.addEdges([...rect(0, 0, 10, 10), [P(0, 5), P(10, 5)]]); // 日字：两膜
    k.addEdges([[P(20, 0), P(20, 10)]]);                       // 孤立 wire
    const fids = k.faces().map((f) => f.id).sort();
    const sel = emptySelection();
    for (const f of k.faces()) sel.faces.add(f.id);
    const wire = k.edges().find((e) => k.graph.pt(e.a).x === 20 && k.graph.pt(e.b).x === 20)!;
    sel.edges.add(wire.id);
    const ev = moveBy(k, moveTargetsSelection(k, sel), 100, 0);
    eq(ev.length, 1, "单事件");
    eq(ev[0].type, "STRETCH", "STRETCH");
    eq(k.faces().map((f) => f.id).sort().join(","), fids.join(","), "膜 id 全稳定");
    assert(k.hitTest(P(105, 2.5), 0.1).face !== undefined, "下格到位");
    assert(k.hitTest(P(105, 7.5), 0.1).face !== undefined, "上格到位");
    assert(edgeSet(k).includes("120,0|120,10"), "wire 同批到位");
  });

  it("靶8 fuzz：随机扰动 → planarize 不变量全绿（对抗契约）", () => {
    let seed = 42;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    const checkInvariants = (k: Kernel, tag: string): void => {
      const es = k.edges();
      for (let i = 0; i < es.length; i++) {
        const a1 = k.graph.pt(es[i].a), a2 = k.graph.pt(es[i].b);
        for (let j = i + 1; j < es.length; j++) {
          if (es[i].a === es[j].a || es[i].a === es[j].b || es[i].b === es[j].a || es[i].b === es[j].b) continue;
          const b1 = k.graph.pt(es[j].a), b2 = k.graph.pt(es[j].b);
          const interior = segIntersections3(a1, a2, b1, b2).some((p) =>
            !samePt3(p, a1) && !samePt3(p, a2) && !samePt3(p, b1) && !samePt3(p, b2));
          assert(!interior, `${tag}: 边${es[i].id}×${es[j].id} 内部交叉`);
        }
      }
      for (const v of k.vertices()) {
        const p = { x: v.x, y: v.y, z: v.z };
        for (const e of es) {
          if (e.a === v.id || e.b === v.id) continue;
          assert(!pointOnSegment3(p, k.graph.pt(e.a), k.graph.pt(e.b)), `${tag}: 顶点${v.id} 骑边${e.id}`);
        }
      }
      const keys = edgeSet(k);
      eq(new Set(keys).size, keys.length, `${tag}: 无重复边`);
      for (const f of k.faces()) {
        for (const ring of [f.outer, ...f.holes]) {
          for (const d of ring.edges) assert(k.graph.hasEdge(d.edge), `${tag}: 膜环引用完整`);
        }
      }
    };
    // 20 次独立攻击：每次从干净 田字 出发（复利式叠加会在 1e-6 量化格上组合爆炸——那是
    // fuzz 设计的病不是内核的病：F=E-V+1 全填恰是覆盖语义的正确答案）
    for (let round = 0; round < 20; round++) {
      const k = new Kernel();
      k.addEdges([...rect(0, 0, 40, 40), [P(20, 0), P(20, 40)], [P(0, 20), P(40, 20)]]);
      const picked = k.vertices().filter(() => rnd() < 0.5);
      if (!picked.length) continue;
      const dx = Math.round(rnd() * 30 - 15), dy = Math.round(rnd() * 30 - 15);
      k.moveVertices(picked.map((v) => ({ id: v.id, to: P(v.x + dx, v.y + dy) })));
      checkInvariants(k, `独立round${round}`);
    }
    // 3 轮小规模复利（跨轮状态兼容性）
    const k = new Kernel();
    k.addEdges(rect(0, 0, 20, 20));
    for (let round = 0; round < 3; round++) {
      const picked = k.vertices().filter(() => rnd() < 0.5);
      if (!picked.length) continue;
      const dx = Math.round(rnd() * 10 - 5), dy = Math.round(rnd() * 10 - 5);
      k.moveVertices(picked.map((v) => ({ id: v.id, to: P(v.x + dx, v.y + dy) })));
      checkInvariants(k, `复利round${round}`);
    }
  });
});

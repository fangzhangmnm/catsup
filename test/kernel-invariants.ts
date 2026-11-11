// test/kernel-invariants.ts —— B-rep 内核的拓扑不变量检查（测试公共工具，不是测试文件）。从 kernel-fuzz.test.ts 挪出来（2026-11-10 Claude Opus 5.5，测试分档：
// 测试文件之间互相 import 会让并行运行器把被 import 的那份的测试多登记、多跑一遍；守卫 test/test-tiers-guard.test.ts）。原作 2026-09-07 Claude Fable 5.1。
import { assert } from "./runner.mjs";
import type { Kernel } from "../src/kernel/kernel.ts";

export function checkInvariants(k: Kernel, ctx: string, allowDup = false): void {
  const vids = new Set(k.graph.vertices().map((v) => v.id));
  const seen = new Set<string>();
  const fids = new Set(k.faces().map((f) => f.id));
  for (const e of k.edges()) {
    assert(vids.has(e.a) && vids.has(e.b), `${ctx}: edge ${e.id} 端点不存在`);
    const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
    assert(!seen.has(key), `${ctx}: 重复边 ${key}`);
    seen.add(key);
    for (const f of e.faceLinks) assert(fids.has(f), `${ctx}: edge ${e.id} faceLinks 指向不存在的面 ${f}`);
  }
  for (const v of k.graph.vertices()) assert(v.edges.size > 0, `${ctx}: 孤立顶点 ${v.id}`);
  // 曲线（0.10）：链连通有序、每边至多一条、闭合首尾相接、边都存在
  const cp = k.curveProblems();
  assert(!cp.length, `${ctx}: 曲线不自洽——${cp.join("; ")}`);
  // 层不漏（2026-10-26 Claude Opus 5.5：emit 改成按删除记录增量清层，这条守它 = 全量 prune 的结果）
  for (const n of k.edgeLayers.names()) for (const id of k.edgeLayers.layer(n)) assert(k.graph.hasEdge(id), `${ctx}: 边层 ${n} 留着已删的边 ${id}`);
  for (const n of k.faceLayers.names()) for (const id of k.faceLayers.layer(n).keys()) assert(fids.has(id), `${ctx}: 面层 ${n} 留着已删的面 ${id}`);
  // 无重复面：同一组环边（外环+洞）只准有一张面记录（2026-09-07 fuzz 抓到 54/90 同环 → 擦边裁决漏掉第三张）
  if (allowDup) return;
  const ringKeys = new Map<string, number>();
  for (const f of k.faces()) {
    const face = k.face(f.id)!;
    const key = [face.outer, ...face.holes].map((r) => [...r.edges.map((d) => d.edge)].sort((a, b) => a - b).join(",")).join("|");
    const prev = ringKeys.get(key);
    assert(prev === undefined, `${ctx}: 重复面 ${prev} / ${f.id}（同一组环边）`);
    ringKeys.set(key, f.id);
  }
  for (const f of k.faces()) {
    const face = k.face(f.id)!;
    for (const ring of [face.outer, ...face.holes]) for (const d of ring.edges) {
      assert(k.graph.hasEdge(d.edge), `${ctx}: 面 ${f.id} 环边 ${d.edge} 不存在`);
      assert(k.graph.edge(d.edge).faceLinks.includes(f.id), `${ctx}: 面 ${f.id} 环边 ${d.edge} 的 faceLinks 不含它`);
    }
    // 环连通（2026-10-21 新增）：每条有向边的终点 = 下一条的起点——findRegions 曾把 τ 带内投影相交的开环当面
    for (const ring of [face.outer, ...face.holes]) {
      const n = ring.edges.length;
      for (let i = 0; i < n; i++) {
        const d1 = ring.edges[i], d2 = ring.edges[(i + 1) % n];
        const e1 = k.graph.edge(d1.edge), e2 = k.graph.edge(d2.edge);
        assert((d1.forward ? e1.b : e1.a) === (d2.forward ? e2.a : e2.b), `${ctx}: 面 ${f.id} 环在第 ${i} 条边后不连通`);
      }
    }
  }
}

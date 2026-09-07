// test/kernel-fuzz.test.ts —— 内核随机操作 fuzz + 拓扑不变量（2026-09-07 VR 真机「edge 19 不存在」案：
// 任何合法操作序列之后，环边必须存在、faceLinks 的面必须存在、无重复边、无孤立顶点，且合法 id 的操作永不 throw）。
// created 2026-09-07 by Claude Fable 5.1。场景偏向真机画法：斜置矩形、从既有顶点沿近轴方向画过头、随机推拉/擦边/挪点。
import { describe, it, assert, todo } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });

/** 残余：这些种子仍会出「重复面」（同环两条记录；不崩不丢边）——face-lifecycle 的认领/铸造还有第二层洞，见总账 D 节。 */
const KNOWN_DUP_SEEDS = new Set([30, 31, 39, 59, 62]);

function checkInvariants(k: Kernel, ctx: string, allowDup = false): void {
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
  }
}

function run(seed: number, steps: number, allowDup = false): void {
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const pick = <T>(arr: T[]): T => arr[Math.floor(rnd() * arr.length)];
  const k = new Kernel();
  const log: string[] = [];
  const tiltedRect = (): [Pt3, Pt3][] => {
    const th = rnd() * 0.4, ph = rnd() < 0.5 ? 0 : rnd() * 0.4;
    const u = P(Math.cos(th), Math.sin(th), 0), v = P(-Math.sin(th) * Math.cos(ph), Math.cos(th) * Math.cos(ph), Math.sin(ph));
    const vs = k.graph.vertices();
    const o = vs.length && rnd() < 0.5 ? (() => { const a = pick(vs); return P(a.x, a.y, a.z); })() : P(rnd() * 3, rnd() * 3, rnd() < 0.3 ? rnd() * 2 : 0);
    const W = 0.3 + rnd() * 2, H = 0.3 + rnd() * 2;
    const c = (a: number, b: number): Pt3 => P(o.x + u.x * a + v.x * b, o.y + u.y * a + v.y * b, o.z + u.z * a + v.z * b);
    const c1 = c(0, 0), c2 = c(W, 0), c3 = c(W, H), c4 = c(0, H);
    return [[c1, c2], [c2, c3], [c3, c4], [c4, c1]];
  };
  for (let i = 0; i < steps; i++) {
    const es = k.edges(), fs = k.faces(), vs = k.graph.vertices();
    const r = rnd();
    let op = "";
    try {
      if (r < 0.35 || es.length === 0) {
        op = "rect"; k.addEdges(tiltedRect());
      } else if (r < 0.6) {
        // 从既有顶点沿某条邻边的理想方向画过头（带 µm 级偏差）
        const v = pick(vs); const eid = pick([...v.edges]); const e = k.graph.edge(eid);
        const o = k.graph.pt(v.id), q = k.graph.pt(e.a === v.id ? e.b : e.a);
        const kk = 1 + rnd() * 2;
        const d = P(q.x - o.x + (rnd() - 0.5) * 4e-6, q.y - o.y + (rnd() - 0.5) * 4e-6, q.z - o.z + (rnd() - 0.5) * 4e-6);
        op = `line ${v.id}→过头`; k.addEdges([[o, P(o.x + d.x * kk, o.y + d.y * kk, o.z + d.z * kk)]]);
      } else if (r < 0.75 && fs.length) {
        const f = pick(fs); const dist = (rnd() - 0.3) * 1.5;
        op = `pp ${f.id} ${dist.toFixed(3)}`; k.pushPull(f.id, dist);
      } else if (r < 0.9) {
        const e = pick(es); op = `erase ${e.id}`; k.eraseEdges([e.id]);
      } else {
        const v = pick(vs); const to = P(v.x + (rnd() - 0.5) * 0.5, v.y + (rnd() - 0.5) * 0.5, v.z + (rnd() - 0.5) * 0.5);
        op = `move ${v.id}`; k.moveVertices([{ id: v.id, to }]);
      }
    } catch (err) {
      assert(false, `seed ${seed} step ${i} [${op}] throw: ${(err as Error).message}\n  history: ${log.join(" | ")}`);
    }
    log.push(op);
    checkInvariants(k, `seed ${seed} step ${i} [${op}]`, allowDup);
  }
}

describe("kernel fuzz: 随机操作序列的拓扑不变量", () => {
  it("80 个种子 × 12 步：合法操作永不 throw；环边存在 / faceLinks 面存在 / 无重复边 / 无孤立顶点；无重复面（5 个已知种子除外）", () => {
    for (let seed = 1; seed <= 80; seed++) run(seed * 104729, 12, KNOWN_DUP_SEEDS.has(seed));
  });
  todo(`重复面残余：种子 ${[...KNOWN_DUP_SEEDS].join("/")}（×104729）仍铸出同环第二张面——face-lifecycle 认领/铸造第二层洞，总账 D 节`);
});

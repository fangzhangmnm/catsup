// 拖动预演「拷一次 + 每帧退回」（Fable 账单 O1，2026-10-27 Claude Fable 5.1；设计稿 ai-docs/20261027-preview-rollback-design.md §5 的网）：
// 影子副本每帧先倒回拷贝时的样子再跑动词，倒回后必须和「每帧新拷一份」逐字相同——顶点 / 边 / 膜的记录、星的顺序、膜的 id 顺序、层、曲线、平面数、事件日志长度、计数器。
// 动词随机：挪点 / 推拉 / 画线 / 擦边 / 软化；5 种子 × 24 帧；真身（base）全程不许动。
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const q = (x: number): number => Math.round(x * 1000) / 1000;

/** 真身：两个盒子 + 地上一个带内线的矩形（有 soft 边、有曲线、有多张膜）。 */
function scene(): Kernel {
  const k = new Kernel();
  const box = (x0: number, y0: number, z0: number, s: number): void => {
    const c = [P(x0, y0, z0), P(x0 + s, y0, z0), P(x0 + s, y0 + s, z0), P(x0, y0 + s, z0), P(x0, y0, z0 + s), P(x0 + s, y0, z0 + s), P(x0 + s, y0 + s, z0 + s), P(x0, y0 + s, z0 + s)];
    const E = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
    k.addEdges(E.map(([a, b]) => [c[a], c[b]] as const));
  };
  box(0, 0, 0, 1); box(3, 0, 0, 1.5);
  k.addEdges([[P(-2, -2, 0), P(-2, 2, 0)], [P(-2, 2, 0), P(6, 2, 0)], [P(6, 2, 0), P(6, -2, 0)], [P(6, -2, 0), P(-2, -2, 0)]]);   // 地面大矩形（把盒子底面包进去）
  k.addEdges([[P(-1, -1, 0), P(-1, 1, 0)]], { layers: ["soft"] });
  k.addEdges([[P(4, -1, 0), P(5, -1, 0)], [P(5, -1, 0), P(5, 1, 0)]], { curve: true });
  return k;
}

const canon = (k: Kernel): string => JSON.stringify({
  brep: k.toBrep(),
  faces: k.faces().map((f) => [f.id, f.planeId, f.outer.vids, f.holes.map((h) => h.vids)]),
  verts: k.vertices().map((v) => [v.id, v.x, v.y, v.z, [...v.edges]]),
  edges: k.edges().map((e) => [e.id, e.a, e.b, [...e.faceLinks]]),
  layers: k.edgeLayers.names().sort().map((n) => [n, [...k.edgeLayers.layer(n)]]),
  curves: k.curves().map((c) => [c.id, c.kind, c.closed, c.edges, c.params ?? null]),
  events: k.log().length,
  next: [k.graph.nextVertexId, k.graph.nextEdgeId],
});

type Verb = (k: Kernel) => void;
function randomVerb(r: () => number, sample: Kernel): { name: string; verb: Verb } {
  const vs = sample.vertices(), es = sample.edges(), fs = sample.faces();
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(r() * arr.length)];
  const x = r();
  if (x < 0.3 && vs.length) { const v = pick(vs), d = P(q((r() - 0.5) * 0.6), q((r() - 0.5) * 0.6), q((r() - 0.5) * 0.6)); return { name: `move v${v.id}`, verb: (k) => { if (k.graph.hasVertex(v.id)) k.moveVertices([{ id: v.id, to: P(q(v.x + d.x), q(v.y + d.y), q(v.z + d.z)) }]); } }; }
  if (x < 0.55 && fs.length) { const f = pick(fs), dist = q((r() - 0.5) * 0.8) || 0.2; return { name: `pp f${f.id} ${dist}`, verb: (k) => { if (k.face(f.id)) k.pushPull(f.id, dist); } }; }
  if (x < 0.75 && vs.length > 1) { const a = pick(vs), b = pick(vs); return { name: `line v${a.id}-v${b.id}`, verb: (k) => { if (a.id !== b.id) k.addEdges([[P(a.x, a.y, a.z), P(b.x, b.y, b.z)]]); } }; }
  if (x < 0.9 && es.length) { const e = pick(es); return { name: `erase e${e.id}`, verb: (k) => { if (k.graph.hasEdge(e.id)) k.eraseEdges([e.id]); } }; }
  const e = pick(es); return { name: `soften e${e.id}`, verb: (k) => { if (k.graph.hasEdge(e.id)) k.setEdgeLayer("soft", [e.id], true); } };
}

describe("拖动预演：拷一次 + 每帧退回（O1）", () => {
  it("5 种子 × 24 帧：影子倒回后 = 真身的新拷贝（逐字）；动词在倒回的影子上跑 = 在新拷贝上跑（逐字）；真身全程不动", () => {
    for (let seed = 1; seed <= 5; seed++) {
      const r = rng(seed * 7919), base = scene(), baseCanon = canon(base.clone()), baseSelf = canon(base);   // 副本不拷事件日志：倒回后对照的是「新拷一份」
      const shadow = base.clone(), mark = shadow.rewindMark();
      let rewound = 0;
      for (let frame = 0; frame < 24; frame++) {
        const { name, verb } = randomVerb(r, base);
        const fresh = base.clone();
        try { verb(fresh); } catch { /* 被拒的动词：两边都该拒 */ }
        try { verb(shadow); } catch { /* 同上 */ }
        eq(canon(shadow), canon(fresh), `seed ${seed} frame ${frame} ${name}：倒回后的影子跑动词 ≠ 新拷贝跑动词`);
        const res = shadow.rewindTo(base, mark);
        assert(res !== null, "日志没丢段");
        rewound += res!.verts + res!.edges + res!.faces;
        eq(canon(shadow), baseCanon, `seed ${seed} frame ${frame} ${name}：倒回后 ≠ 真身`);
        eq(canon(base), baseSelf, "真身不许动");
        assert(shadow.rev > base.rev, "倒回后 rev 是新值（缓存键不回绕）");
      }
      assert(rewound > 0, "倒回真的碰了东西");
    }
  });
  it("日志丢了那段（mark 早于日志记得的）→ 返回 null，调用方重新拷", () => {
    const base = scene(), shadow = base.clone();
    shadow.pushPull(shadow.faces()[0].id, 0.2);
    eq(shadow.rewindTo(base, { seq: -1, events: 0 }), null);
  });
  it("连续两帧不同动词、中间不倒回也行（倒回一次回到起点）；倒回后 rev 单调", () => {
    const base = scene(), shadow = base.clone(), mark = shadow.rewindMark(), c0 = canon(base.clone());
    const f = shadow.faces()[0].id;
    shadow.pushPull(f, 0.5); const v = shadow.vertices()[0]; shadow.moveVertices([{ id: v.id, to: P(v.x + 0.1, v.y, v.z) }]);
    const r1 = shadow.rev; assert(shadow.rewindTo(base, mark)); const r2 = shadow.rev;
    eq(canon(shadow), c0); assert(r2 > r1);
    shadow.pushPull(f, -0.3); assert(shadow.rewindTo(base, mark)); eq(canon(shadow), c0); assert(shadow.rev > r2);
  });
});

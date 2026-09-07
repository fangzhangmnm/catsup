// test/subdivide-nearmiss.test.ts —— sticky 插入的容差对齐 golden（2026-09-07 VR 真机「边 4-3 已存在」案）。
// created 2026-09-07 by Claude Fable 5.1
// 病灶：斜置矩形角点量化后边不精确沿轴；从顶点 4 沿理想方向画过头，新段在「离顶点 3 0.5Q~0.87Q」的带里擦过而不切；
// 后续任何切点落进顶点 3 的格 → splitEdge 撞既有边 4-3 → throw。修法见 subdivide.ts INSERT_TOL 注释。
import { describe, it, assert, eq } from "./runner.mjs";
import { PlanarGraph } from "../src/kernel/topology.ts";
import { insertSegment } from "../src/kernel/subdivide.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });

/** 斜置矩形 + 沿 4→3 理想方向画过头 + 再两笔穿过顶点 3 附近（fuzz 同款场景）。 */
function scenario(seed: number): { g: PlanarGraph; ok: boolean; msg: string } {
  let s = seed; const rnd = (): number => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  const g = new PlanarGraph();
  const th = rnd() * 0.3, ph = rnd() * 0.3;
  const u = P(Math.cos(th), Math.sin(th), 0), v = P(-Math.sin(th) * Math.cos(ph), Math.cos(th) * Math.cos(ph), Math.sin(ph));
  const o = P(rnd() * 3, rnd() * 3, rnd() * 3);
  const W = 0.5 + rnd() * 2, H = 0.5 + rnd() * 2;
  const c = (a: number, b: number): Pt3 => P(o.x + u.x * a + v.x * b, o.y + u.y * a + v.y * b, o.z + u.z * a + v.z * b);
  const c1 = c(0, 0), c2 = c(W, 0), c3 = c(W, H), c4 = c(0, H);
  insertSegment(g, c1, c2); insertSegment(g, c2, c3); insertSegment(g, c3, c4); insertSegment(g, c4, c1);
  const v4 = g.pt(4), v3 = g.pt(3), v2 = g.pt(2);
  const dir = P(v3.x - v4.x + (rnd() - 0.5) * 4e-6, v3.y - v4.y + (rnd() - 0.5) * 4e-6, v3.z - v4.z + (rnd() - 0.5) * 4e-6);
  const k = 1 + rnd() * 2;
  try {
    insertSegment(g, v4, P(v4.x + dir.x * k, v4.y + dir.y * k, v4.z + dir.z * k));
    const dz = P(rnd() - 0.5, rnd() - 0.5, rnd() + 0.2);
    insertSegment(g, v3, P(v3.x + dz.x, v3.y + dz.y, v3.z + dz.z));
    insertSegment(g, P(v3.x + (v3.x - v2.x) * 0.3, v3.y + (v3.y - v2.y) * 0.3, v3.z + (v3.z - v2.z) * 0.3), v2);
    return { g, ok: true, msg: "" };
  } catch (e) { return { g, ok: false, msg: (e as Error).message }; }
}

describe("subdivide: 近擦顶点的容差对齐（VR 真机「边 4-3 已存在」案）", () => {
  it("修前必中的种子（fuzz it=29/31/45 同源）不再 throw，且顶点 3 被切进新段（4-3 retrace）", () => {
    for (const seed of [12345]) {
      const r = scenario(seed);
      assert(r.ok, r.msg);
    }
    // 直接构造：从顶点 4 沿 4→3 方向、带 0.4Q 的对角偏差画过头 → 顶点 3 必须在段上
    const g = new PlanarGraph();
    insertSegment(g, P(0, 0, 0), P(1, 0, 0)); insertSegment(g, P(1, 0, 0), P(1, 1, 0)); insertSegment(g, P(1, 1, 0), P(0, 1, 0)); insertSegment(g, P(0, 1, 0), P(0, 0, 0));
    const r = insertSegment(g, P(0, 1, 0), P(3, 1 + 1.2e-6, 1.2e-6));
    eq(r.retraced.length, 1, "4→3 段是 retrace");
    assert(g.edgeBetween(4, 3) !== undefined && g.vertex(3).edges.size === 3, "顶点 3 被切进新段（3 条边）");
  });
  it("200 个种子的 fuzz：斜置矩形 + 近轴画过头 + 两笔穿顶点，零 throw，图始终无重复边", () => {
    for (let seed = 1; seed <= 200; seed++) {
      const r = scenario(seed * 7919);
      assert(r.ok, `seed ${seed}: ${r.msg}`);
      const seen = new Set<string>();
      for (const e of r.g.edges()) {
        const key = e.a < e.b ? `${e.a}-${e.b}` : `${e.b}-${e.a}`;
        assert(!seen.has(key), `seed ${seed}: 重复边 ${key}`);
        seen.add(key);
      }
    }
  });
});

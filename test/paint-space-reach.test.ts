// 空间里的笔：每颗笔尖碰到哪些三角形（贴图主线 1-4a 第三节 + 第六节测试 7–10、12 的连通那一半）。created 2026-11-11 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { buildTargetGeo, type TargetGeo } from "../src/paint/space-target.ts";
import { sphereTriDist, tipReach, type Reach } from "../src/paint/tip-reach.ts";
import { P, gridMesh, laidOut, rng, targetOf } from "./paint-space-kit.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { placeOn, uvAtOf, uvOf, slotsOf } from "./uv-kit.ts";

/** 离 p 最近的三角形（格子里的编号）。 */
const triAt = (g: TargetGeo, p: Pt3): number => { let b = -1, bd = Infinity; for (let t = 0; t < g.grid.face.length; t++) { const d = sphereTriDist(p.x, p.y, p.z, g.wpos, 9 * t); if (d < bd) { bd = d; b = t; } } return b; };
const facesIn = (g: TargetGeo, r: Reach): number[] => [...new Set([...(r.get(0)?.values() ?? [])].flat().map((t) => g.grid.face[t]))].sort((a, b) => a - b);

describe("笔尖碰到哪些三角形（1-4a 测试 7：连着的才吃）", () => {
  it("两张离得很近但不相连的面：笔画在一张上、球够得着另一张——另一张不在名单里；用一条边连起来——在名单里", () => {
    const build = (bridge: boolean) => {
      const m = new MeshKernel();
      const a = m.addFace([P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => m.addVertex(p)), -1, FRESH);
      const top = [P(0, 0, 0.05), P(1, 0, 0.05), P(1, 1, 0.05), P(0, 1, 0.05)].map((p) => m.addVertex(p)), b = m.addFace([top[3], top[2], top[1], top[0]], -1, FRESH);
      if (bridge) { const ring = m.faceVerts(a), v10 = ring[1], v11 = ring[2]; m.addFace([v10, top[1], top[2], v11], -1, FRESH); }
      const g = buildTargetGeo(targetOf(m, laidOut(m)));
      return { g, a, b };
    };
    const tip = { x: 0.95, y: 0.5, z: 0, r: 0.1 };
    { const { g, a, b } = build(false), r = tipReach([g], tip, [{ ti: 0, tri: triAt(g, P(0.95, 0.5, 0)) }]), fs = facesIn(g, r);
      assert(fs.includes(a) && !fs.includes(b), `不相连：只有落点那张（${fs}）`); }
    { const { g, a, b } = build(true), r = tipReach([g], tip, [{ ti: 0, tri: triAt(g, P(0.95, 0.5, 0)) }]), fs = facesIn(g, r);
      assert(fs.includes(a) && fs.includes(b), `连起来：两张都在（${fs}）`); }
  });
});

describe("笔尖碰到哪些三角形（1-4a 测试 8：和笨办法一样）", () => {
  it("随机的网格体、随机的笔尖：找出来的名单 = 所有和球相交（带余量）的三角形里和起点连着的那一片", () => {
    const r = rng(77);
    for (let trial = 0; trial < 6; trial++) {
      const m = gridMesh(10, 2, (x, y) => 0.3 * Math.sin(2 * x + trial) * Math.cos(1.5 * y)), drop = new Set(m.faces().filter(() => r() < 0.1));
      for (const f of drop) m.setFaceFlags(f, 1, true);   // 挖几个洞（藏起来的面不在格子里）
      const g = buildTargetGeo(targetOf(m, laidOut(m, "uv", m.faces().filter((f) => !drop.has(f)))));
      for (let k = 0; k < 25; k++) {
        const t0 = Math.floor(r() * g.grid.face.length), w = [r(), r(), r()], s = w[0] + w[1] + w[2], o = 9 * t0;
        const c = { x: (w[0] * g.wpos[o] + w[1] * g.wpos[o + 3] + w[2] * g.wpos[o + 6]) / s, y: (w[0] * g.wpos[o + 1] + w[1] * g.wpos[o + 4] + w[2] * g.wpos[o + 7]) / s, z: (w[0] * g.wpos[o + 2] + w[1] * g.wpos[o + 5] + w[2] * g.wpos[o + 8]) / s + (r() - 0.5) * 0.05 };
        const tip = { ...c, r: 0.05 + r() * 0.4 }, got = tipReach([g], tip, [{ ti: 0, tri: t0 }]);
        // 笨办法：先把所有相交的三角形挑出来，再从起点在它们里面找连着的
        const margin = g.table.gap / 2 + 1, hit = new Set<number>();
        for (let t = 0; t < g.grid.face.length; t++) if (sphereTriDist(tip.x, tip.y, tip.z, g.wpos, 9 * t) <= tip.r + margin * g.texelLen[t]) hit.add(t);
        const seeds = hit.has(t0) ? [t0] : Array.from(g.adj.subarray(g.adjStart[t0], g.adjStart[t0 + 1])).filter((u) => hit.has(u));
        const comp = new Set<number>(seeds), q = [...seeds];
        while (q.length) { const t = q.pop()!; for (let i = g.adjStart[t]; i < g.adjStart[t + 1]; i++) { const u = g.adj[i]; if (hit.has(u) && !comp.has(u)) { comp.add(u); q.push(u); } } }
        const want = [...comp].sort((a, b) => a - b).join(), have = [...(got.get(0)?.values() ?? [])].flat().sort((a, b) => a - b).join();
        eq(have, want, `第 ${trial} 个网格体第 ${k} 颗笔尖`);
      }
    }
  });
});

describe("笔尖碰到哪些三角形（1-4a 测试 9 + 10：镜像和复制挂在同一块下面；拐角）", () => {
  it("两半贴图坐标一样（镜像 / 复制）：笔尖压在中缝上，两半的三角形挂在同一块画布多边形下面", () => {
    const m = new MeshKernel(), v = [P(-1, 0, 0), P(0, 0, 0), P(0, 1, 0), P(-1, 1, 0), P(1, 0, 0), P(1, 1, 0)].map((p) => m.addVertex(p));   // 中缝上两个点两半共用
    const L = m.addFace([v[0], v[1], v[2], v[3]], -1, FRESH), R = m.addFace([v[4], v[5], v[2], v[1]], -1, FRESH);
    const uv = laidOut(m, "uv", [L]);
    { const lv = uvAtOf(m, L, "uv")!, at = (i: number) => [lv[2 * i], lv[2 * i + 1]]; placeOn(m, R, "uv", [...at(0), ...at(3), ...at(2), ...at(1)]); }   // 镜过去的面 = 照抄（对应表倒过来：R 的环 4·5·2·1 ↔ L 的 0·3·2·1）
    const g = buildTargetGeo(targetOf(m, uv));
    eq(g.table.polys.length, 1, "两半并成一块");
    const r = tipReach([g], { x: 0, y: 0.5, z: 0, r: 0.3 }, [{ ti: 0, tri: triAt(g, P(-0.01, 0.5, 0)) }]), polys = r.get(0)!;
    eq(polys.size, 1, "一块"); eq(facesIn(g, r).join(), [L, R].sort((a, b) => a - b).join(), "两半的三角形都挂在下面");
  });
  it("方盒子的棱上：拐角设 45°——侧面不吃；不限——侧面吃", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const g = buildTargetGeo(targetOf(m, laidOut(m))), top = triAt(g, P(0.5, 0.97, 1)), tip = { x: 0.5, y: 0.97, z: 1, r: 0.1 };
    const side = m.faces().find((f) => m.faceVerts(f).every((v) => Math.abs(m.pt(v).y - 1) < 1e-9))!;
    assert(facesIn(g, tipReach([g], tip, [{ ti: 0, tri: top }])).includes(side), "不限：侧面吃");
    assert(!facesIn(g, tipReach([g], tip, [{ ti: 0, tri: top }], { maxAngleDeg: 45 })).includes(side), "45°：侧面不吃");
  });
});

describe("笔尖碰到哪些三角形（1-4a 测试 12：藏起来的面不过、不走画的面过但不吃）", () => {
  const chain = () => {
    const m = new MeshKernel(), v = [P(0, 0, 0), P(0.1, 0, 0), P(0.2, 0, 0), P(0.3, 0, 0), P(0, 1, 0), P(0.1, 1, 0), P(0.2, 1, 0), P(0.3, 1, 0)].map((p) => m.addVertex(p));
    const A = m.addFace([v[0], v[1], v[5], v[4]], -1, FRESH), mid = m.addFace([v[1], v[2], v[6], v[5]], -1, FRESH), B = m.addFace([v[2], v[3], v[7], v[6]], -1, FRESH);
    return { m, A, mid, B };
  };
  const tip = { x: 0.05, y: 0.5, z: 0, r: 0.3 };
  it("中间那张藏起来：不从它过（B 不在名单里），它自己也不在", () => {
    const { m, A, mid, B } = chain(); m.setFaceFlags(mid, 1, true);
    const g = buildTargetGeo(targetOf(m, laidOut(m, "uv", [A, B]))), fs = facesIn(g, tipReach([g], tip, [{ ti: 0, tri: triAt(g, P(0.05, 0.5, 0)) }]));
    assert(fs.includes(A) && !fs.includes(B) && !fs.includes(mid), `只有 A（${fs}）`);
  });
  it("中间那张不走这张画：从它过（B 在名单里），但它自己不吃", () => {
    const { m, A, mid, B } = chain();
    const g = buildTargetGeo(targetOf(m, laidOut(m), { walks: (f) => f !== mid })), fs = facesIn(g, tipReach([g], tip, [{ ti: 0, tri: triAt(g, P(0.05, 0.5, 0)) }]));
    assert(fs.includes(A) && fs.includes(B) && !fs.includes(mid), `A、B，没有中间那张（${fs}）`);
  });
});

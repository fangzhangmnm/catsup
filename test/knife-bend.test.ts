// 刀在面中间拐弯（笔的设计稿第八节；内核 splitFaceAlong + 切之前验一道 knifeCheck）。created 2026-11-13 by Claude Opus 5.5
// 第六条验收里内核那几条：方块正面拐两下；五种该拦的（自交、出面、回到起点那条边 = 能切、同一条边没拐点、面里的点离面太远）；不平的四边形；随机凸面 / 凹面 2000 次对拍。
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { addBox, addPolygon, knife, knifeCheck, KnifeRefused, splitFaceAlong, type KnifeStop } from "../src/mesh/ops/index.ts";
import { polygonArea3, type Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const front = (k: MeshKernel): number => k.faces().find((f) => k.facePts(f).every((p) => p.y === 0))!;
const edgeAt = (k: MeshKernel, f: number, a: Pt3, b: Pt3): number => k.fEdges(f).find((e) => { const p = k.pt(k.edgeA[e]), q = k.pt(k.edgeB[e]); const same = (u: Pt3, v: Pt3): boolean => u.x === v.x && u.y === v.y && u.z === v.z; return (same(p, a) && same(q, b)) || (same(p, b) && same(q, a)); })!;
/** 内核的样子（点、面环、边）：拦下来之后逐位比。 */
const snap = (k: MeshKernel): string => JSON.stringify({ v: k.verts().map((v) => [v, k.pt(v)]), f: k.faces().map((f) => [f, k.faceVerts(f)]), e: k.edges().map((e) => [e, k.edgeA[e], k.edgeB[e]]) });
const newell = (ps: readonly Pt3[]): Pt3 => { let x = 0, y = 0, z = 0; for (let i = 0; i < ps.length; i++) { const a = ps[i], b = ps[(i + 1) % ps.length]; x += (a.y - b.y) * (a.z + b.z); y += (a.z - b.z) * (a.x + b.x); z += (a.x - b.x) * (a.y + b.y); } return { x, y, z }; };
/** 这张面切出来的三角形，每一个都和 n 同向（三角化朝向对）。 */
const trisAlong = (k: MeshKernel, f: number, n: Pt3): boolean => { const ps = k.facePts(f); return k.faceTriangles(f).every(([a, b, c]) => { const t = newell([ps[a], ps[b], ps[c]]); return t.x * n.x + t.y * n.y + t.z * n.z > 0; }); };
const refused = (k: MeshKernel, f: number, path: KnifeStop[]): string => { const before = snap(k); try { knife(k, f, path); } catch (e) { assert(e instanceof KnifeRefused, String(e)); eq(snap(k), before, "拦下来真身一个数不变"); return (e as Error).message; } throw new Error("没拦"); };

describe("沿折线劈面：方块正面拐两下", () => {
  it("从左边进、面里拐两下、从下边出 = 两张面，自检干净，点 / 边 / 面数对得上", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const f = front(k), s0 = { f: k.faceCount(), v: k.vertexCount(), e: k.edgeCount() };
    const left = edgeAt(k, f, P(0, 0, 0), P(0, 0, 1)), bottom = edgeAt(k, f, P(0, 0, 0), P(1, 0, 0));
    const path: KnifeStop[] = [{ e: left, t: 0.5 }, { p: P(0.4, 0, 0.6) }, { p: P(0.6, 0, 0.3) }, { e: bottom, t: 0.7 }];
    eq(knifeCheck(k, f, path), null);
    const vs = knife(k, f, path);
    eq(vs.length, 4, "刀口上的点：进、两个拐点、出");
    eq(k.check().join(";"), "");
    eq(JSON.stringify({ f: k.faceCount() - s0.f, v: k.vertexCount() - s0.v, e: k.edgeCount() - s0.e }), JSON.stringify({ f: 1, v: 4, e: 5 }), "两个劈边 + 两个拐点；新边 = 劈出来的 2 + 刀线 3");
  });
  it("没有面里的点 = 以前的劈面（splitFaceAlong 零个点）；相邻两点又没拐点 = 抛", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const f = front(k), r = k.faceVerts(f), g = splitFaceAlong(k, f, r[0], r[2]);
    eq(k.faceVerts(g.face).length, 3); eq(g.verts.length, 0); eq(k.check().join(";"), "");
    let threw = false; try { splitFaceAlong(k, f, r[0], k.faceVerts(f)[1]); } catch { threw = true; }
    assert(threw, "相邻、没有拐点 = 抛");
  });
});

describe("切之前验一道：该拦的拦，拦下来真身不动", () => {
  const box = (): { k: MeshKernel; f: number; left: number; bottom: number; right: number } => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); const f = front(k); return { k, f, left: edgeAt(k, f, P(0, 0, 0), P(0, 0, 1)), bottom: edgeAt(k, f, P(0, 0, 0), P(1, 0, 0)), right: edgeAt(k, f, P(1, 0, 0), P(1, 0, 1)) }; };
  it("刀线自己交叉 = 拦", () => {
    const { k, f, left, right } = box();
    eq(refused(k, f, [{ e: left, t: 0.5 }, { p: P(0.7, 0, 0.8) }, { p: P(0.7, 0, 0.2) }, { p: P(0.3, 0, 0.8) }, { p: P(0.3, 0, 0.2) }, { e: right, t: 0.5 }]), "刀线自己交叉了");
  });
  it("刀线走出这张面 = 拦（面里的点在面的平面上、但在边外）", () => {
    const { k, f, left, right } = box();
    eq(refused(k, f, [{ e: left, t: 0.5 }, { p: P(0.5, 0, 1.3) }, { e: right, t: 0.5 }]), "刀线出了这张面");
  });
  it("回到起点那条边（切出一小块）= 能切", () => {
    const { k, f, left } = box();
    const s0 = k.faceCount(), vs = knife(k, f, [{ e: left, t: 0.3 }, { p: P(0.2, 0, 0.4) }, { e: left, t: 0.6 }]);
    eq(vs.length, 3); eq(k.faceCount() - s0, 1); eq(k.check().join(";"), "");
  });
  it("两头在同一条边上、没有拐点 = 切不出东西（不劈边、不切）", () => {
    const { k, f, left } = box();
    eq(knifeCheck(k, f, [{ e: left, t: 0.3 }, { e: left, t: 0.6 }]), "这两个点之间已经有边了，切不出东西");
  });
  it("面里的点离面太远 = 拦", () => {
    const { k, f, left, bottom } = box();
    assert(refused(k, f, [{ e: left, t: 0.5 }, { p: P(0.4, 0.01, 0.4) }, { e: bottom, t: 0.5 }]).startsWith("面里的点离这张面太远"));
  });
  it("从面中间起刀 / 没切到边 / 回到同一个点 / 中间又碰边 = 拦", () => {
    const { k, f, left, bottom, right } = box();
    eq(refused(k, f, [{ p: P(0.4, 0, 0.4) }, { e: bottom, t: 0.5 }]), "从面中间起刀还没做：第一个点要在点或边上");
    eq(refused(k, f, [{ e: left, t: 0.5 }, { p: P(0.4, 0, 0.4) }]), "刀线还没切到边上：最后一个点要在这张面的点或边上");
    eq(refused(k, f, [{ e: left, t: 0.5 }, { p: P(0.4, 0, 0.4) }, { e: left, t: 0.5 }]), "刀线回到了同一个点（在面里切一个圈还没做）");
    eq(refused(k, f, [{ e: left, t: 0.5 }, { p: P(0.4, 0, 0.4) }, { e: bottom, t: 0.5 }, { p: P(0.7, 0, 0.4) }, { e: right, t: 0.5 }]), "一刀只能在一张面里拐弯：中间不能再碰到边");
  });
});

describe("不平的四边形上拐弯切", () => {
  const quad = (): { k: MeshKernel; f: number; e01: number; e23: number } => {
    const k = new MeshKernel(), v = [P(0, 0, 0), P(1, 0, 0.15), P(1, 1, 0), P(0, 1, 0.15)].map((p) => k.addVertex(p)), f = k.addFace(v, FRESH);
    return { k, f, e01: k.edgeOf(v[0], v[1]), e23: k.edgeOf(v[2], v[3]) };
  };
  /** 面里的点：落在原面的三角形上（和工具一样，从三角形上取）。 */
  const onTri = (k: MeshKernel, f: number, u: number, w: number): Pt3 => { const ps = k.facePts(f), [a, b, c] = k.faceTriangles(f)[0], A = ps[a], B = ps[b], C = ps[c]; return P(A.x + (B.x - A.x) * u + (C.x - A.x) * w, A.y + (B.y - A.y) * u + (C.y - A.y) * w, A.z + (B.z - A.z) * u + (C.z - A.z) * w); };
  it("切得出的：两张面三角化朝向都对", () => {
    const { k, f, e01, e23 } = quad(), n0 = newell(k.facePts(f)), p = onTri(k, f, 0.3, 0.3);
    eq(knifeCheck(k, f, [{ e: e01, t: 0.5 }, { p }, { e: e23, t: 0.5 }]), null);
    const s = new Set(k.faces()); knife(k, f, [{ e: e01, t: 0.5 }, { p }, { e: e23, t: 0.5 }]);
    const g = k.faces().find((x) => !s.has(x))!;
    assert(trisAlong(k, f, n0) && trisAlong(k, g, n0), "两张面的三角形都和原面同向");
    eq(k.check().join(";"), "");
  });
  it("切不出的（拐点在面外、绕向翻了）被拦下", () => {
    const { k, f, e01, e23 } = quad();
    assert(refused(k, f, [{ e: e01, t: 0.5 }, { p: P(1.6, 0.5, 0.075) }, { e: e23, t: 0.5 }]).length > 0);
  });
});

describe("随机对拍：凸面 / 凹面上随机折线 2000 次", () => {
  /** 确定的随机数（mulberry32）。 */
  const rng = (seed: number): (() => number) => () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  it("过了验的：自检干净、两张面面积相加 = 原面、三角形都和原面同向；没过的：抛 KnifeRefused、真身一个数不变；凸面上直的一刀从不被拦", () => {
    const r = rng(20261113);
    let passed = 0, refusedN = 0, convexStraight = 0;
    for (let it = 0; it < 2000; it++) {
      const n = 4 + Math.floor(r() * 5), convex = r() < 0.5, ps: Pt3[] = [];
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + (r() - 0.5) * (Math.PI / n) * 0.8, rad = convex ? 1 : 0.4 + r() * 0.8; ps.push(P(rad * Math.cos(a), rad * Math.sin(a), 0)); }
      const k = new MeshKernel(); addPolygon(k, ps);
      const f = k.faces()[0], ring = k.faceVerts(f), es = k.fEdges(f), area0 = polygonArea3(k.facePts(f)), n0 = newell(k.facePts(f));
      const stop = (): KnifeStop => (r() < 0.3 ? { v: ring[Math.floor(r() * ring.length)] } : { e: es[Math.floor(r() * es.length)], t: 0.05 + r() * 0.9 });
      const inner: KnifeStop[] = []; const m = Math.floor(r() * 4);
      for (let j = 0; j < m; j++) inner.push({ p: P((r() - 0.5) * 2.2, (r() - 0.5) * 2.2, 0) });
      const path: KnifeStop[] = [stop(), ...inner, stop()];
      const why = knifeCheck(k, f, path), before = snap(k);
      if (why === null) {
        const s = new Set(k.faces()), fc = k.faceCount(); knife(k, f, path);
        eq(k.check().join(";"), "", `第 ${it} 次自检`);
        if (k.faceCount() === fc + 1) {
          const g = k.faces().find((x) => !s.has(x))!, a = polygonArea3(k.facePts(f)) + polygonArea3(k.facePts(g));
          assert(Math.abs(a - area0) <= 1e-9 * Math.max(1, area0), `第 ${it} 次面积 ${a} ≠ ${area0}`);
          assert(trisAlong(k, f, n0) && trisAlong(k, g, n0), `第 ${it} 次三角形朝向`);
          passed++;
        }
      } else {
        let threw: unknown = null; try { knife(k, f, path); } catch (e) { threw = e; }
        if (why.startsWith("这两个点之间已经有边了") && !inner.length) continue;   // 切不出东西：和以前一样什么都不切（不是拦）
        assert(threw instanceof KnifeRefused, `第 ${it} 次该抛 KnifeRefused：${why}`);
        eq(snap(k), before, `第 ${it} 次拦下来真身不变`);
        refusedN++;
        if (convex && !inner.length && !why.startsWith("刀线回到了同一个点")) { convexStraight++; assert(false, `第 ${it} 次凸面上直的一刀被拦了：${why}`); }   // 两头同一个点 = 本来就切不出东西，不算拦错
      }
    }
    assert(passed > 300 && refusedN > 300, `两边都要有足够多（过 ${passed}、拦 ${refusedN}）`);
    eq(convexStraight, 0);
  });
});

// 自动折面 rev2（家族周账 F-105 / Fable 账单 K3；user 10-27「拖乱一个八边形，整张面会消失」「L形的面，我拖L的一个头，然后破面的时候乱掉了」）。
// 性质 = 证明留档 ai-docs/proofs/20261027-autofold-triangulation.md 的命题：① 不出多边形 ② 片的投影互不重叠且并集 = 原多边形（含洞）
// ③ 每片在 tol 内共面 ④ 确定性 ⑤ 凸环上折缝最少（09-01 规则）⑥ 内核层：这些形状挪点不再 BURST。created 2026-10-27 by Claude Fable 5.1
import { describe, it, assert, eq } from "./runner.mjs";
import { foldDecompose } from "../src/kernel/autofold.ts";
import { Kernel } from "../src/kernel/kernel.ts";
import { type Pt3, COPLANAR_TOL_DEFAULT, distToPlane, planeBasis, planeOfRing, pointInRing, projectToPlane, signedArea } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const TOL = COPLANAR_TOL_DEFAULT;
const lift = (ring: Pt3[], which: (p: Pt3) => boolean, dz: number): Pt3[] => ring.map((p) => (which(p) ? { ...p, z: p.z + dz } : p));

/** 投影到外环的最佳拟合平面，检查：片共面、投影不出多边形、面积守恒（= 片互不重叠 ∧ 并集 = 原多边形）。 */
function checkDecomposition(outer: Pt3[], holes: Pt3[][], r: { pieces: Pt3[][]; creases: [Pt3, Pt3][] }): void {
  const plane = planeOfRing(outer)!, B = planeBasis(plane);
  const pr = (ring: readonly Pt3[]) => ring.map((p) => projectToPlane(p, B));
  const O = pr(outer), H = holes.map(pr);
  const area = Math.abs(signedArea(O)) - H.reduce((s, h) => s + Math.abs(signedArea(h)), 0);
  let sum = 0;
  for (const pc of r.pieces) {
    assert(pc.length >= 3, "片至少三点");
    const pl = planeOfRing(pc)!;
    for (const p of pc) assert(distToPlane(p, pl) <= TOL, `片不共面：${distToPlane(p, pl)}`);
    const q = pr(pc);
    sum += Math.abs(signedArea(q));
    // 片的每条边的中点都在多边形内（含边界）、不在任何洞内
    for (let i = 0; i < q.length; i++) {
      const a = q[i], b = q[(i + 1) % q.length], m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const onBoundary = onRing(m, O) || H.some((h) => onRing(m, h));
      if (onBoundary) continue;
      assert(pointInRing(m, O), `片的边跑到多边形外面：(${m.x},${m.y})`);
      for (const h of H) assert(!pointInRing(m, h), `片的边跑进洞里：(${m.x},${m.y})`);
    }
  }
  assert(Math.abs(sum - area) <= 1e-9 * area + 1e-12, `面积不守恒：片之和 ${sum} vs 多边形 ${area}（重叠或漏）`);
}
function onRing(p: { x: number; y: number }, ring: { x: number; y: number }[]): boolean {
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i], b = ring[(i + 1) % ring.length];
    const cross = (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
    if (Math.abs(cross) > 1e-9) continue;
    if (p.x < Math.min(a.x, b.x) - 1e-9 || p.x > Math.max(a.x, b.x) + 1e-9 || p.y < Math.min(a.y, b.y) - 1e-9 || p.y > Math.max(a.y, b.y) + 1e-9) continue;
    return true;
  }
  return false;
}

const L = [P(0, 0), P(2, 0), P(2, 1), P(1, 1), P(1, 2), P(0, 2)];
const SQ = [P(0, 0), P(3, 0), P(3, 3), P(0, 3)], HOLE = [P(1, 1), P(2, 1), P(2, 2), P(1, 2)];
const ngon = (n: number, dz: (i: number) => number): Pt3[] => Array.from({ length: n }, (_, i) => P(Math.cos(2 * Math.PI * i / n), Math.sin(2 * Math.PI * i / n), dz(i)));

describe("自动折面 rev2：分解的性质", () => {
  it("L 形拖右头（以前：两片三角盖进缺口）", () => {
    const ring = lift(L, (p) => p.x === 2, 0.5);
    const r = foldDecompose(ring, [], TOL)!;
    assert(r, "分得开");
    checkDecomposition(ring, [], r);
  });
  it("L 形拖凹角（以前：平五边形盖住缺口 + 叠一块三角）", () => {
    const ring = lift(L, (p) => p.x === 1 && p.y === 1, 0.5);
    const r = foldDecompose(ring, [], TOL)!;
    assert(r, "分得开");
    checkDecomposition(ring, [], r);
  });
  it("带方洞的方块拖外角 / 外边（以前：null → 整张破掉）", () => {
    for (const which of [(p: Pt3) => p.x === 3 && p.y === 3, (p: Pt3) => p.x === 3]) {
      const ring = lift(SQ, which, 0.5);
      const r = foldDecompose(ring, [HOLE], TOL)!;
      assert(r, "带洞也分得开");
      checkDecomposition(ring, [HOLE], r);
    }
  });
  it("八边形顶点交替 ±0.2 / 拧一下（以前：k ≥ 4 结点多边形非平面 → null）", () => {
    for (const n of [6, 8, 12]) for (const dz of [(i: number) => (i % 2 ? 0.2 : -0.2), (i: number) => 0.3 * Math.sin(2 * Math.PI * i / n) + 0.17 * Math.cos(4 * Math.PI * i / n + 0.5)]) {
      const ring = ngon(n, dz);
      const r = foldDecompose(ring, [], TOL)!;
      assert(r, `n=${n} 分得开`);
      checkDecomposition(ring, [], r);
    }
  });
  it("凸环上折缝最少（09-01 规则）：十边形对折一条缝；拉单顶角一条缝", () => {
    const half = ngon(10, (i) => (i < 5 ? 0 : 0.4 * Math.sin(2 * Math.PI * i / 10)));   // 后半圈抬成另一平面：两段共面 → 一条缝
    // 后半圈的点并不全共面（正弦不是线性）——改成真正的对折：按 y 坐标线性抬
    const fold = ngon(10, (i) => Math.max(0, Math.sin(2 * Math.PI * i / 10)) * 0.5);
    for (const ring of [half, fold]) { const r = foldDecompose(ring, [], TOL)!; assert(r); checkDecomposition(ring, [], r); }
    const r2 = foldDecompose(fold, [], TOL)!;
    eq(r2.creases.length, 1, "对折 = 一条缝");
    const one = ngon(8, (i) => (i === 0 ? 0.3 : 0));
    const r3 = foldDecompose(one, [], TOL)!;
    eq(r3.creases.length, 1, "拉单顶角 = 一条缝");
    eq(r3.pieces.length, 2, "两片");
  });
  it("确定性：同一环两次分解逐点相同；环起点换一个，几何集合相同", () => {
    const ring = lift(L, (p) => p.x === 2, 0.5);
    const a = foldDecompose(ring, [], TOL)!, b = foldDecompose(ring, [], TOL)!;
    eq(JSON.stringify(a), JSON.stringify(b), "两次一样");
    const rot = [...ring.slice(2), ...ring.slice(0, 2)];
    const c = foldDecompose(rot, [], TOL)!;
    const sig = (r: { pieces: Pt3[][] }) => r.pieces.map((pc) => [...pc].map((p) => `${p.x},${p.y},${p.z}`).sort().join("|")).sort().join("\n");
    eq(sig(c), sig(a), "起点换了，片的集合不变");
  });
  it("真拧成麻花（投影不简单）→ null（诚实退路），不抛", () => {
    const bow = [P(0, 0), P(2, 2, 0.3), P(2, 0), P(0, 2, 0.3)];   // 蝴蝶结：四个投影都自交
    eq(foldDecompose(bow, [], TOL), null);
  });
});

describe("自动折面 rev2：内核层不再破面", () => {
  const build = (ring: Pt3[], hole?: Pt3[]): Kernel => {
    const k = new Kernel();
    k.addEdges(ring.map((p, i) => [p, ring[(i + 1) % ring.length]] as const));
    if (hole) k.addEdges(hole.map((p, i) => [p, hole[(i + 1) % hole.length]] as const));
    return k;
  };
  const vid = (k: Kernel, p: Pt3): number => { for (const e of k.edges()) for (const v of [e.a, e.b]) { const q = k.graph.pt(v); if (Math.abs(q.x - p.x) < 1e-9 && Math.abs(q.y - p.y) < 1e-9 && Math.abs(q.z - p.z) < 1e-9) return v; } throw new Error("no vertex"); };
  const cases: { name: string; ring: Pt3[]; hole?: Pt3[]; lift: Pt3[]; faces0: number }[] = [
    { name: "L 拖右头", ring: L, lift: [P(2, 0), P(2, 1)], faces0: 1 },
    { name: "L 拖凹角", ring: L, lift: [P(1, 1)], faces0: 1 },
    { name: "带洞方块拖外角", ring: SQ, hole: HOLE, lift: [P(3, 3)], faces0: 2 },
    { name: "带洞方块拖外边", ring: SQ, hole: HOLE, lift: [P(3, 0), P(3, 3)], faces0: 2 },
    { name: "八边形交替", ring: ngon(8, () => 0), lift: ngon(8, () => 0).filter((_, i) => i % 2 === 0), faces0: 1 },
  ];
  for (const c of cases) it(`${c.name}：挪点后零 BURST、膜守恒（面积投影守恒）`, () => {
    const k = build(c.ring, c.hole);
    eq(k.faces().length, c.faces0, "起手面数");
    type Rings = { outer: Pt3[]; holes: Pt3[][] };
    const top = (r: Rings): number => Math.abs(signedArea(r.outer.map((p) => ({ x: p.x, y: p.y })))) - r.holes.reduce((s, h) => s + Math.abs(signedArea(h.map((p) => ({ x: p.x, y: p.y })))), 0);
    const rings = (id: number): Rings => (k as unknown as { faceRings3(id: number): Rings }).faceRings3(id);
    const before = k.faces().reduce((s, f) => s + top(rings(f.id)), 0);
    const ev = k.moveVertices(c.lift.map((p) => ({ id: vid(k, p), to: { ...p, z: p.z + 0.5 } })));
    eq(ev.filter((e) => e.type === "BURST").length, 0, "零 BURST");
    const after = k.faces().reduce((s, f) => s + top(rings(f.id)), 0);
    assert(Math.abs(after - before) <= 1e-9 * before + 1e-12, `俯视投影面积守恒：前 ${before} 后 ${after}`);
    for (const f of k.faces()) { const r = rings(f.id).outer; const pl = planeOfRing(r)!; for (const p of r) assert(distToPlane(p, pl) <= TOL, "每张面共面"); }
  });
});

// 网格体上的列 + 面的来历（施工单 ai-docs/20261110-paint-workorders-3.md 第四节 + 施工记录里 Fable 的三条裁定）。created 2026-11-10 by Claude Opus 5.5
// 2026-11-13 施工单十八第 1½ 刀：照属性规程（ai-docs/20261112-attribute-protocol.md 第七½节 E）改成通用的列——这里的列名都是测试自己起的，不是任何保留字。
// A 切不动画（随机：劈边 / 劈面 / 刀 / 环切 / 内缩；细分另比取样处）· B 照抄 · C 新面填缺省值 · D 并面（三种取法）· 离散的列 · 跟旁边 · 声明 · 标记跟着来历传 ·
// F 撤销 · 并点取谁 · 整张面搬到别的内核 · 守卫（凭空来的白名单、取值只有一份）。
// 测试 E（现有逐算子检查带两列再跑）在 test/mesh-kernel.test.ts 末尾。
import { describe, it, eq, assert } from "./runner.mjs";
const { readdirSync, readFileSync, statSync } = (await import("node:fs" as string)) as { readdirSync(p: string): string[]; readFileSync(p: string, enc: string): string; statSync(p: string): { isDirectory(): boolean } };
const join = (...p: string[]): string => p.join("/");
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH, type ColumnDef } from "../src/mesh/columns.ts";
import { addBox, bevelEdges, catmullClark, duplicateGeometry, extrudeEdges, extrudeFaces, flipFaces, insetFaces, joinFaces, knife, loopCut, mergeVerts, splitEdge, splitFace } from "../src/mesh/ops/index.ts";
import { symmetrize } from "../src/mesh/mirror.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const UV = "uv";
/** 测试用的两列：角上两个连续的小数（并成取最前的）+ 面上一个整数（并成不一致就回缺省值 −1）。 */
const UVD: ColumnDef = { id: UV, on: "corner", type: { floats: 2 }, continuous: true, fill: 0, merge: "first", kind: "test" };
const CODE = "code";
const CODED: ColumnDef = { id: CODE, on: "face", type: "int", continuous: false, fill: -1, merge: "defaultIfMixed", kind: "test" };
/** 这张面在 UV 上是不是还是缺省值（新长的、取不到的）。 */
const isFill = (k: MeshKernel, f: number): boolean => [...k.cornerValues(f, UV)!].every((x) => x === 0);
const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
/** 确定性的伪随机。 */
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };
type Lin = (p: Pt3) => [number, number];
/** 面所在的平面（盒子的六个面：坐标轴 + 0 或 1）。劈面可能劈出三点共线、躺在棱上的零面积面，它同时在两个平面上 → 两个都是候选。 */
const planesOf = (k: MeshKernel, f: number): string[] => { const ps = k.facePts(f), o: string[] = []; for (const a of ["x", "y", "z"] as const) for (const c of [0, 1]) if (ps.every((p) => Math.abs(p[a] - c) < 1e-9)) o.push(`${a}${c}`); return o; };
const planeOf = (k: MeshKernel, f: number): string | null => planesOf(k, f)[0] ?? null;
/** 盒子 + 一列：每张面一个自己的一次函数（随机系数），角上的值 = 函数在角的位置上的值。 */
function paintedBox(seed: number): { k: MeshKernel; fn: Map<string, Lin> } {
  const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); k.addColumn(UVD); k.addColumn(CODED);
  const r = rng(seed), fn = new Map<string, Lin>();
  for (const f of k.faces()) {
    const c = Array.from({ length: 8 }, () => r() * 4 - 2), lin: Lin = (p) => [c[0] * p.x + c[1] * p.y + c[2] * p.z + c[3], c[4] * p.x + c[5] * p.y + c[6] * p.z + c[7]];
    fn.set(planeOf(k, f)!, lin);
    k.setCornerValues(f, UV, k.facePts(f).flatMap(lin)); k.setFaceValue(f, CODE, 0);
  }
  return { k, fn };
}
/** 每张面每个角的值 = 它所在原面的函数在角的位置上的值（差 ≤ 万分之一）；返回最大的差。躺在棱上的面取两个候选里差小的那个。 */
function worstError(k: MeshKernel, fn: Map<string, Lin>): number {
  let worst = 0;
  for (const f of k.faces()) {
    const v = k.cornerValues(f, UV), cands = planesOf(k, f);
    if (!v || !cands.length) return Infinity;
    let best = Infinity;
    for (const key of cands) { const lin = fn.get(key)!; let e = 0; k.facePts(f).forEach((p, i) => { const [u, w] = lin(p); e = Math.max(e, Math.abs(v[2 * i] - u), Math.abs(v[2 * i + 1] - w)); }); best = Math.min(best, e); }
    worst = Math.max(worst, best);
  }
  return worst;
}
const clean = (k: MeshKernel, where: string): void => { const bad = k.check(); eq(bad.length, 0, `${where}：${bad.slice(0, 3).join("；")}`); };
const bits = (x: number): string => { const b = new Float32Array([x]); return String(new Uint32Array(b.buffer)[0]); };

describe("角上的列：A 切不动画", () => {
  it("随机一串只切不长的操作（劈边 / 劈面 / 刀 / 环切 / 内缩；6 个种子 × 25 步）：每张面每个角的值 = 原面的一次函数在这个角的位置上的值", () => {
    const total = [0, 0, 0, 0, 0]; let totalSkipped = 0;
    for (let seed = 1; seed <= 6; seed++) {
      let { k } = paintedBox(seed); const { fn } = paintedBox(seed), r = rng(seed * 97);
      const pick = <T>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)];
      const done = [0, 0, 0, 0, 0]; let skipped = 0;
      for (let step = 0; step < 25; step++) {
        const c = k.clone(), op = Math.floor(r() * 5);
        try {
          if (op === 0) splitEdge(c, pick(c.edges()), 0.2 + 0.6 * r());
          else if (op === 1) { const f = pick(c.faces().filter((x) => c.faceLen[x] >= 4)), ring = c.faceVerts(f), i = Math.floor(r() * ring.length); splitFace(c, f, ring[i], ring[(i + 2) % ring.length]); }
          else if (op === 2) { const f = pick(c.faces()), es = c.fEdges(f); if (es.length < 4) continue; const i = Math.floor(r() * es.length); knife(c, f, [{ e: es[i], t: 0.3 + 0.4 * r() }, { e: es[(i + 2) % es.length], t: 0.3 + 0.4 * r() }]); }
          else if (op === 3) loopCut(c, pick(c.edges()), 0.3 + 0.4 * r());
          else insetFaces(c, [pick(c.faces())], 0.03);
        } catch { continue; }   // 这一步在这个形状上做不了（环切碰到三角形等）：丢掉副本
        const bad = c.check();
        if (bad.length) { eq(bad.filter((b) => /column/.test(b)).join("；"), "", `种子 ${seed} 第 ${step} 步：坏了角上的列的规矩`); skipped++; continue; }   // 别的毛病是算子在这个形状上本来就做不好：丢掉副本
        k = c; done[op]++;
      }
      clean(k, `种子 ${seed}`);
      const err = worstError(k, fn);
      assert(err <= 1e-4, `种子 ${seed}：最大差 ${err}（面数 ${k.faceCount()}）`);
      assert(k.faceCount() > 6, `种子 ${seed}：真的切过了`);
      total.forEach((_, i) => { total[i] += done[i]; }); totalSkipped += skipped;
    }
    assert(total.every((n) => n >= 3), `五种操作每种都真做过几次：${total.join(" / ")}（丢掉 ${totalSkipped} 步）`);
    console.log(`      （随机链：劈边 / 劈面 / 刀 / 环切 / 内缩 做成 ${total.join(" / ")} 步，丢掉 ${totalSkipped} 步）`);
  });
  it("细分（Fable 裁定 ①）：每个四边形 [原角, 边点, 面点, 边点] 的值 = 原面函数在取样处（原角 / 原边中点 / 原面角平均）的值；原角那一项逐位相同", () => {
    const { k, fn } = paintedBox(7);
    const orig = new Map(k.faces().map((f) => [f, { lin: fn.get(planeOf(k, f)!)!, pts: k.facePts(f), vals: k.cornerValues(f, UV)! }] as const));
    catmullClark(k); clean(k, "细分");
    let matched = 0;
    for (const q of k.faces()) {
      const v = k.cornerValues(q, UV)!;
      assert(!!v, "四边形都有值");
      for (const { lin, pts, vals } of orig.values()) {
        const n = pts.length, i = [...Array(n).keys()].find((j) => bits(vals[2 * j]) === bits(v[0]) && bits(vals[2 * j + 1]) === bits(v[1]));
        if (i === undefined) continue;
        const mid = (a: number, b: number): Pt3 => P((pts[a].x + pts[b].x) / 2, (pts[a].y + pts[b].y) / 2, (pts[a].z + pts[b].z) / 2);
        const cen = P(pts.reduce((s, p) => s + p.x, 0) / n, pts.reduce((s, p) => s + p.y, 0) / n, pts.reduce((s, p) => s + p.z, 0) / n);
        const want = [lin(pts[i]), lin(mid(i, (i + 1) % n)), lin(cen), lin(mid((i - 1 + n) % n, i))];
        if (want.every(([u, w], c) => Math.abs(v[2 * c] - u) <= 1e-4 && Math.abs(v[2 * c + 1] - w) <= 1e-4)) { matched++; break; }
      }
    }
    eq(matched, 24, "24 个四边形都对上了原面的取样处");
  });
  it("连细分两次不漂：原来每个角上的值逐位还在", () => {
    const { k } = paintedBox(8), want = new Set<string>();
    for (const f of k.faces()) { const v = k.cornerValues(f, UV)!; for (let i = 0; i < v.length; i += 2) want.add(`${bits(v[i])},${bits(v[i + 1])}`); }
    catmullClark(k); catmullClark(k); clean(k, "细分两次");
    const have = new Set<string>();
    for (const f of k.faces()) { const v = k.cornerValues(f, UV)!; for (let i = 0; i < v.length; i += 2) have.add(`${bits(v[i])},${bits(v[i + 1])}`); }
    for (const w of want) assert(have.has(w), `原角的值 ${w} 不见了`);
  });
});

describe("角上的列：B 照抄 / C 新面填缺省值", () => {
  it("复制：新面角上的值 = 原面对应的角", () => {
    const { k } = paintedBox(11), f = k.faces()[2], before = k.cornerValues(f, UV)!;
    const d = duplicateGeometry(k, { verts: [], edges: [], faces: [f] });
    eq([...k.cornerValues(d.faces[0], UV)!].map(bits).join(), [...before].map(bits).join()); clean(k, "复制");
  });
  it("翻面：对应表倒过来", () => {
    const { k } = paintedBox(12), f = k.faces()[0], before = k.cornerValues(f, UV)!, n = before.length / 2;
    flipFaces(k, [f]);
    const after = k.cornerValues(f, UV)!;
    for (let i = 0; i < n; i++) eq(`${bits(after[2 * i])},${bits(after[2 * i + 1])}`, `${bits(before[2 * (n - 1 - i)])},${bits(before[2 * (n - 1 - i) + 1])}`);
  });
  it("挤出：搬走的原面角上的值不变；侧面每个角都是缺省值、面上的整数也是缺省值（C）；挤出边长出来的墙也一样", () => {
    const { k } = paintedBox(13), f = k.faces()[1], before = k.cornerValues(f, UV)!;
    const r = extrudeFaces(k, [f]);
    eq([...k.cornerValues(f, UV)!].map(bits).join(), [...before].map(bits).join(), "顶面照抄");
    eq(k.faceValue(f, CODE), 0, "顶面的整数照抄");
    for (const s of r.sides) { assert(isFill(k, s), "侧面填缺省值"); eq(k.faceValue(s, CODE), -1, "侧面的整数 = 缺省值"); }
    const w = extrudeEdges(k, [k.edges()[0]]);
    for (const s of w.sides) { assert(isFill(k, s), "墙填缺省值"); eq(k.faceValue(s, CODE), -1); }
    eq(k.takeReport().odd.size, 0, "新长的不算对不上");
    clean(k, "挤出");
  });
  it("倒角（C）：倒角带每个角都是缺省值；缩小的原面照「一块」仍等于原函数", () => {
    const { k, fn } = paintedBox(14), e = k.edges()[0];
    const r = bevelEdges(k, [e], 0.1, 2);
    assert(r.faces.length > 0, "真倒了");
    for (const s of r.faces) { assert(isFill(k, s), "倒角带 / 补片填缺省值"); eq(k.faceValue(s, CODE), -1); }
    clean(k, "倒角");
    let err = 0;
    for (const f of k.faces()) { if (r.faces.includes(f)) continue; const key = planeOf(k, f), v = k.cornerValues(f, UV)!; if (!key) continue; k.facePts(f).forEach((p, i) => { const [u, w] = fn.get(key)!(p); err = Math.max(err, Math.abs(v[2 * i] - u), Math.abs(v[2 * i + 1] - w)); }); }
    assert(err <= 1e-4, `缩小的原面最大差 ${err}`);
  });
  it("强行对称：镜过去的面照抄（同一个位置镜过去的角 = 同样的值）", () => {
    const k = new MeshKernel(); addBox(k, P(-1, 0, 0), P(1, 1, 1)); k.addColumn(UVD);
    for (const f of k.faces()) k.setCornerValues(f, UV, k.facePts(f).flatMap((p) => [p.y + 3 * p.z, 2 * p.x * p.x + p.z]));
    symmetrize(k, 0, 1); clean(k, "强行对称");
    const key = (p: Pt3): string => `${p.x.toFixed(6)},${p.y.toFixed(6)},${p.z.toFixed(6)}`;
    const source = new Map<string, string>();   // 「这一边」的面：角的位置 → 值（同一个位置可能在几张面上，值都记）
    for (const f of k.faces()) if (k.facePts(f).every((p) => p.x >= -1e-9)) { const v = k.cornerValues(f, UV)!; k.facePts(f).forEach((p, i) => source.set(`${f}|${key(p)}`, `${bits(v[2 * i])},${bits(v[2 * i + 1])}`)); }
    let checked = 0;
    for (const f of k.faces()) {
      if (!k.facePts(f).some((p) => p.x < -1e-9)) continue;
      const v = k.cornerValues(f, UV)!, mirrored = k.facePts(f).map((p) => key(P(-p.x, p.y, p.z)));
      const src = k.faces().find((g) => g !== f && mirrored.every((m) => source.has(`${g}|${m}`)));
      assert(src !== undefined, `镜过去的面 ${f} 找不到源面`);
      k.facePts(f).forEach((_, i) => { eq(`${bits(v[2 * i])},${bits(v[2 * i + 1])}`, source.get(`${src}|${mirrored[i]}`)); checked++; });
    }
    assert(checked > 0, "真的有镜过去的面");
  });
});

describe("列：D 并面（三种取法）", () => {
  /** 两张四边形共用一条边（1-4）；A 的角上 = f(p)、面上 = ca；B 的角上 = g(p)（null = 不写，留缺省值）、面上 = cb。merge = 这两列并成时的取法。 */
  function twoQuads(f: (p: Pt3) => number[], g: ((p: Pt3) => number[]) | null, ca = 0, cb = 0, merge: ColumnDef["merge"] | null = null): { k: MeshKernel; e: number } {
    const k = new MeshKernel(); k.addColumn(merge ? { ...UVD, merge } : UVD); k.addColumn(merge ? { ...CODED, merge } : CODED);
    const v = [P(0, 0, 0), P(1, 0, 0), P(2, 0, 0), P(0, 1, 0), P(1, 1, 0), P(2, 1, 0)].map((p) => k.addVertex(p));
    const a = k.addFace([v[0], v[1], v[4], v[3]], -1, FRESH), b = k.addFace([v[1], v[2], v[5], v[4]], -1, FRESH);
    k.setCornerValues(a, UV, k.facePts(a).flatMap(f)); k.setFaceValue(a, CODE, ca);
    if (g) k.setCornerValues(b, UV, k.facePts(b).flatMap(g));
    k.setFaceValue(b, CODE, cb);
    k.takeReport();
    return { k, e: k.edgeOf(v[1], v[4]) };
  }
  it("公共点上值一样、面上的整数一样 → 值都在，不报告", () => {
    const lin = (p: Pt3): number[] => [p.x, p.y * 2];
    const { k, e } = twoQuads(lin, lin), f = joinFaces(k, e);
    const v = k.cornerValues(f, UV)!; k.facePts(f).forEach((p, i) => { eq(v[2 * i], p.x); eq(v[2 * i + 1], p.y * 2); });
    eq(k.faceValue(f, CODE), 0); eq(k.takeReport().odd.size, 0); clean(k, "并面");
  });
  it("面上的整数一样、公共点上的角值不一样 → 角上照「取最前的」、报告 mixed；面上的整数不动（要不要改归用它的那一层）", () => {
    const { k, e } = twoQuads((p) => [p.x, p.y], (p) => [p.x + 0.5, p.y]), f = joinFaces(k, e);
    const r = k.takeReport().odd.get(f);
    eq(r?.corner.get(UV), "mixed"); eq(r?.face.size, 0); eq(k.faceValue(f, CODE), 0);
    const v = k.cornerValues(f, UV)!; k.facePts(f).forEach((p, i) => { if (p.x <= 1) eq(v[2 * i], p.x, "公共点和 A 那边取 A 的值"); });
    eq(k.takeReport().odd.size, 0, "拿走即清空"); clean(k, "并面（角值对不上）");
  });
  it("面上的整数不一样（defaultIfMixed）→ 引擎自己回缺省值 −1，报告带各来源的值", () => {
    const lin = (p: Pt3): number[] => [p.x, p.y];
    const { k, e } = twoQuads(lin, lin, 0, 3), f = joinFaces(k, e);
    eq(k.faceValue(f, CODE), -1);
    eq(JSON.stringify(k.takeReport().odd.get(f)?.face.get(CODE)), "[0,3]"); clean(k, "并面（整数对不上）");
  });
  it("三种取法：first = 最前的来源；firstNonDefault = 第一个不是缺省值的；defaultIfMixed = 不一致回缺省值（角上的列逐点同样三种）", () => {
    const lin = (p: Pt3): number[] => [p.x, p.y], other = (p: Pt3): number[] => [p.x + 7, p.y];
    const pick = (merge: ColumnDef["merge"], ca: number, cb: number, g: ((p: Pt3) => number[]) | null): { code: number; corner: number[]; odd: string } => {
      const { k, e } = twoQuads(lin, g, ca, cb, merge), f = joinFaces(k, e), v = k.cornerValues(f, UV)!;
      const p1 = k.facePts(f).findIndex((p) => p.x === 1 && p.y === 0);   // 公共点 (1, 0)
      const o = k.takeReport().odd.get(f);
      return { code: k.faceValue(f, CODE)!, corner: [v[2 * p1], v[2 * p1 + 1]], odd: o ? `${o.face.has(CODE) ? "face" : ""}${o.corner.get(UV) ?? ""}` : "" };
    };
    eq(JSON.stringify(pick("first", -1, 4, other)), JSON.stringify({ code: -1, corner: [1, 0], odd: "facemixed" }));
    eq(JSON.stringify(pick("firstNonDefault", -1, 4, other)), JSON.stringify({ code: 4, corner: [1, 0], odd: "facemixed" }));
    eq(JSON.stringify(pick("defaultIfMixed", -1, 4, other)), JSON.stringify({ code: -1, corner: [0, 0], odd: "facemixed" }));
    // 角上 firstNonDefault：A 在公共点上恰好是缺省值 (0, 0) 时取 B 的
    const zeroAt1 = (p: Pt3): number[] => (p.x === 1 && p.y === 0 ? [0, 0] : [p.x, p.y]);
    const { k, e } = twoQuads(zeroAt1, other, 0, 0, "firstNonDefault"), f = joinFaces(k, e), v = k.cornerValues(f, UV)!, p1 = k.facePts(f).findIndex((p) => p.x === 1 && p.y === 0);
    eq(`${v[2 * p1]},${v[2 * p1 + 1]}`, "8,0", "A 是缺省值 → 取 B");
  });
  it("一张来源上没有某个点（点只在另一张上）不算对不上；哪张来源都没有的点 = 取不到（missing），填缺省值", () => {
    const lin = (p: Pt3): number[] => [p.x, p.y];
    const { k, e } = twoQuads(lin, lin), f = joinFaces(k, e);
    eq(k.takeReport().odd.size, 0, "各点都在某张来源上");
    const sh = k.shapeOf(f), x = k.addVertex(P(1, 2, 0)), ring = [...k.faceVerts(f)];
    ring.splice(ring.length - 1, 0, x);
    k.setFaceRing(f, ring, { kind: "joined", of: [sh] });
    eq(k.takeReport().odd.get(f)?.corner.get(UV), "missing");
    const v = k.cornerValues(f, UV)!, i = k.faceVerts(f).indexOf(x); eq(`${v[2 * i]},${v[2 * i + 1]}`, "0,0");
  });
});

describe("列：离散的列、跟旁边、声明", () => {
  it("离散的角上的列：「之间」取权重最大的那个旧角（逐位照抄、不混）；连续的照常插值", () => {
    const D: ColumnDef = { id: "d", on: "corner", type: { floats: 1 }, continuous: false, fill: 0, merge: "first" };
    const k = new MeshKernel(); k.addColumn(D); k.addColumn(UVD);
    const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => k.addVertex(p)), f = k.addFace(v, -1, FRESH);
    k.setCornerValues(f, "d", [10, 20, 30, 40]); k.setCornerValues(f, UV, k.facePts(f).flatMap((p) => [p.x, p.y]));
    const m = k.addVertex(P(0.25, 0, 0)), sh = k.shapeOf(f);
    k.setFaceRing(f, [v[0], m, v[1], v[2], v[3]], { kind: "piece", of: sh });
    const d = k.cornerValues(f, "d")!, u = k.cornerValues(f, UV)!;
    eq(d[1], 10, "离点 0 近 → 点 0 的值"); eq(u[2], 0.25, "连续的照插值");
    clean(k, "离散");
  });
  it("跟旁边：面上的列声明了 followNeighbor，新长的面带 neighbor 就照抄它；不带 = 缺省值；neighbor 不是活面 = 抛", () => {
    const N: ColumnDef = { id: "n", on: "face", type: "int", continuous: false, fill: -1, followNeighbor: true, merge: "first" };
    const k = new MeshKernel(); k.addColumn(N); k.addColumn(CODED);
    const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(2, 0, 0), P(2, 1, 0)].map((p) => k.addVertex(p));
    const a = k.addFace([v[0], v[1], v[2], v[3]], -1, FRESH); k.setFaceValue(a, "n", 5); k.setFaceValue(a, CODE, 2);
    const b = k.addFace([v[1], v[4], v[5], v[2]], -1, { kind: "grown", neighbor: a });
    eq(k.faceValue(b, "n"), 5, "跟旁边的列照抄"); eq(k.faceValue(b, CODE), -1, "没声明跟旁边的列 = 缺省值");
    deleteFacesOne(k, b);
    const c = k.addFace([v[1], v[4], v[5], v[2]], -1, { kind: "grown" }); eq(k.faceValue(c, "n"), -1, "不带 neighbor = 缺省值");
    let threw = false; try { k.addFace([v[4], v[5], k.addVertex(P(3, 0, 0))], -1, { kind: "grown", neighbor: 999 }); } catch (e) { threw = /not a live face/.test(String(e)); }
    assert(threw, "neighbor 不是活面要抛");
  });
  it("声明：这一刀做不了的组合抛「还没做」；同一个 id 声明一样 = 不动，不一样 = 抛", () => {
    const k = new MeshKernel();
    const bad: [ColumnDef, RegExp][] = [
      [{ id: "a", on: "vertex", type: "int", continuous: false, fill: 0, merge: "first" }, /not implemented/],
      [{ id: "a", on: "edge", type: { floats: 1 }, continuous: true, fill: 0, merge: "first" }, /not implemented/],   // 3a：边上的整数 / 布尔做了，小数还没
      [{ id: "a", on: "edge", type: "bool", continuous: false, fill: 0, followNeighbor: true, merge: "first" }, /not implemented/],
      [{ id: "a", on: "corner", type: "bool", continuous: false, fill: 0, merge: "first" }, /not implemented/],
      [{ id: "a", on: "edge", type: "bool", continuous: false, fill: 2, merge: "first" }, /0 or 1/],
      [{ id: "a", on: "face", type: "bool", continuous: true, fill: 0, merge: "first" }, /discrete/],
      [{ id: "a", on: "faceEdge", type: "int", continuous: false, fill: 0, merge: "first" }, /not implemented/],
      [{ id: "a", on: "corner", type: "int", continuous: false, fill: 0, merge: "first" }, /not implemented/],
      [{ id: "a", on: "face", type: { floats: 1 }, continuous: true, fill: 0, merge: "first" }, /not implemented/],
      [{ id: "a", on: "corner", type: { floats: 1 }, continuous: true, fill: 0, followNeighbor: true, merge: "first" }, /not implemented/],
      [{ id: "a", on: "corner", type: { floats: 1 }, continuous: false, fill: 0, quantum: 4, merge: "first" }, /only for continuous/],
      [{ id: "a", on: "face", type: "int", continuous: true, fill: 0, merge: "first" }, /discrete/],
      [{ id: "a", on: "face", type: "int", continuous: false, fill: 0.5, merge: "first" }, /integer/],
      [{ id: "a", on: "corner", type: { floats: 0 }, continuous: true, fill: 0, merge: "first" }, /positive integer/],
    ];
    for (const [d, re] of bad) { let msg = ""; try { k.addColumn(d); } catch (e) { msg = String(e); } assert(re.test(msg), `${JSON.stringify(d)} → ${msg || "没抛"}`); }
    k.addColumn(UVD); k.addColumn({ ...UVD }); eq(k.columnDefs().length, 1, "一样的声明不动");
    let threw = false; try { k.addColumn({ ...UVD, merge: "defaultIfMixed" }); } catch (e) { threw = /different declaration/.test(String(e)); }
    assert(threw, "同一个 id 不一样的声明要抛");
  });
  it("「对不上」的标记跟着来历传：并成对不上的面在同一步里又被切开，两块都带着标记", () => {
    const k = new MeshKernel(); k.addColumn(UVD); k.addColumn(CODED);
    const v = [P(0, 0, 0), P(1, 0, 0), P(2, 0, 0), P(0, 1, 0), P(1, 1, 0), P(2, 1, 0)].map((p) => k.addVertex(p));
    const a = k.addFace([v[0], v[1], v[4], v[3]], -1, FRESH), b = k.addFace([v[1], v[2], v[5], v[4]], -1, FRESH);
    k.setCornerValues(a, UV, k.facePts(a).flatMap((p) => [p.x, p.y])); k.setCornerValues(b, UV, k.facePts(b).flatMap((p) => [p.x + 1, p.y]));
    k.setFaceValue(a, CODE, 0); k.setFaceValue(b, CODE, 0); k.takeReport();
    const f = joinFaces(k, k.edgeOf(v[1], v[4])), ring = k.faceVerts(f);
    const g = splitFace(k, f, ring[0], ring[2]);
    const odd = k.takeReport().odd;
    assert(odd.get(f)?.corner.get(UV) === "mixed" && odd.get(g)?.corner.get(UV) === "mixed", `两块都带着：${[...odd.keys()].join(",")}`);
  });
});

/** 删一张面（测试用：splice 出去之后它的位置可以再建）。 */
function deleteFacesOne(k: MeshKernel, f: number): void { k.removeFace(f); }

describe("角上的列：F 撤销 / 确定性 · 并点取谁 · 搬到别的内核", () => {
  it("clone 之后做操作再 swapWith 换回来：列和原来一样；同一个操作在两份副本上做，角上的值逐位相同", () => {
    const { k } = paintedBox(21), snap0 = JSON.stringify(k.toSnapshot());
    const shadow = k.clone(), a = k.clone(), b = k.clone();
    const op = (m: MeshKernel): void => { loopCut(m, m.edges()[3], 0.4); insetFaces(m, [m.faces()[0]], 0.05); catmullClark(m); };
    op(k); k.swapWith(shadow);
    eq(JSON.stringify(k.toSnapshot()), snap0, "换回来一个字不差（含列）");
    op(a); op(b);
    eq(JSON.stringify(a.toSnapshot()), JSON.stringify(b.toSnapshot()), "两份副本逐位相同");
  });
  it("并点「并到第一个」（Fable 裁定 ③）：含幸存者的面上，并完那个角的值 = 幸存者原来那个角的值", () => {
    const { k } = paintedBox(22), e = k.edges()[0], a = k.edgeA[e], b = k.edgeB[e];
    const want = new Map<number, string>();
    for (const f of k.faces()) { const r = k.faceVerts(f), i = r.indexOf(a); if (i >= 0) { const v = k.cornerValues(f, UV)!; want.set(f, `${bits(v[2 * i])},${bits(v[2 * i + 1])}`); } }
    const s = mergeVerts(k, [a, b], "first"); clean(k, "并点");
    eq(s, a);
    let n = 0;
    for (const [f, w] of want) { if (!k.hasF(f)) continue; const r = k.faceVerts(f), i = r.indexOf(a), v = k.cornerValues(f, UV)!; eq(`${bits(v[2 * i])},${bits(v[2 * i + 1])}`, w, `面 ${f}`); n++; }
    assert(n > 0, "有含幸存者的面留下来");
  });
  it("整张面搬到另一个内核：列按 id 补上（原有的面填缺省值），面上和角上的数跟着搬", () => {
    const { k } = paintedBox(23), t = new MeshKernel(); t.addColumn({ id: "other", on: "corner", type: { floats: 1 }, continuous: true, fill: 0, merge: "first" });
    addBox(t, P(5, 5, 5), P(6, 6, 6));
    const f = k.faces()[3], map = new Map<number, number>(), nv = (v: number): number => { let x = map.get(v); if (x === undefined) { x = t.addVertex(k.pt(v)); map.set(v, x); } return x; };
    t.ensureColumns(k.columnDefs());
    const nf = t.addFace(k.faceVerts(f).map(nv), k.faceMat[f], { kind: "fresh", ...k.columnsOf(f) });
    eq([...t.cornerValues(nf, UV)!].map(bits).join(), [...k.cornerValues(f, UV)!].map(bits).join()); eq(t.faceValue(nf, CODE), 0);
    for (const g of t.faces()) if (g !== nf) { assert(isFill(t, g), "原有的面在补上的列上填缺省值"); eq(t.faceValue(g, CODE), -1); }
    clean(t, "搬过去");
  });
});

describe("角上的列：守卫", () => {
  const walk = (d: string, out: string[] = []): string[] => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (p !== join("src", "paint", "kernel")) walk(p, out); } else if (/\.ts$/.test(n)) out.push(p); } return out; };
  const files = walk("src");
  /** 「凭空来的」只许出现在这些文件（施工单第二节表最后一行 + 整张面原样搬的两处 + 剪贴板的两处 + 定义它的那一个）。只许变短。 */
  const FRESH_OK = ["src/mesh/columns.ts", "src/mesh/mesh-kernel.ts", "src/mesh/ops/build.ts", "src/mesh/ops/duplicate.ts", "src/mesh/ops/primitives.ts", "src/mesh/tri-soup.ts", "src/mesh/mesh-doc.ts", "src/scene/kinds.ts", "src/editor/ops.ts", "src/editor/transfer.ts"];
  it(`「凭空来的」只在白名单里（${FRESH_OK.length} 个文件，只许变短）`, () => {
    assert(FRESH_OK.length <= 10, "白名单只许变短");
    const hits = files.filter((f) => !FRESH_OK.includes(f) && readFileSync(f, "utf8").split("\n").some((l) => !/^\s*import /.test(l) && (/kind:\s*"fresh"/.test(l) || /\bFRESH\b/.test(l))));
    eq(hits.join(" | "), "", "白名单之外用了凭空来的");
  });
  it("src/mesh/ 里给角上的数取值只有 columns.ts 那一段：别处不碰列的数组、不另写取样", () => {
    const hits: string[] = [];
    for (const f of files) {
      if (!f.startsWith(join("src", "mesh")) || f === join("src", "mesh", "columns.ts")) continue;
      for (const line of readFileSync(f, "utf8").split("\n")) if (/\bsampleAt\b|closestOnTriangle|writeCorners\(|barycentric|\.columns\[[^\]]*\]\.data|\bc\.data\[/.test(line) && !(f === join("src", "mesh", "mesh-kernel.ts") && /writeCorners\(|c\.data\[/.test(line))) hits.push(`${f}: ${line.trim().slice(0, 70)}`);
    }
    eq(hits.length, 0, hits.join(" | "));
  });
});

describe("角上的列：规矩按构造成立（Fable 审 1-2 加的两处）", () => {
  /** 一张单独的四边形，一列、角上的值 = (x, y)；再放一个在第一条边中点上的点 m（还没进环）。 */
  function quad(): { k: MeshKernel; f: number; v: number[]; m: number } {
    const k = new MeshKernel(); k.addColumn(UVD);
    const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)].map((p) => k.addVertex(p));
    const f = k.addFace(v, -1, FRESH); k.setCornerValues(f, UV, k.facePts(f).flatMap((p) => [p.x, p.y]));
    return { k, f, v, m: k.addVertex(P(0.5, 0, 0)) };
  }
  it("copy 的对应表里有 −1 / 不在旧环里的角号 → 抛（调用的地方写错了）", () => {
    for (const bad of [-1, 4, 1.5]) {
      const { k, f, v } = quad(), sh = k.shapeOf(f);
      let threw = false;
      try { k.setFaceRing(f, v, { kind: "copy", of: sh, corners: [0, bad, 2, 3] }); } catch (e) { threw = /not a corner of the old ring/.test(String(e)); }
      assert(threw, `角号 ${bad} 应该抛`);
    }
  });
  it("piece 取样时旧面切不出三角形 → 那几个角填缺省值、报告「取不到」（missing）；切得出时照常插值（对照）", () => {
    const a = quad(), sa = a.k.shapeOf(a.f); a.k.takeReport();
    a.k.setFaceRing(a.f, [a.v[0], a.m, a.v[1], a.v[2], a.v[3]], { kind: "piece", of: sa });
    const ok = a.k.cornerValues(a.f, UV)!; eq(ok[2], 0.5); eq(ok[3], 0); eq(a.k.takeReport().odd.size, 0); clean(a.k, "对照");
    const b = quad(), sb = b.k.shapeOf(b.f); sb.tris = []; b.k.takeReport();   // 旧面「切不出三角形」
    b.k.setFaceRing(b.f, [b.v[0], b.m, b.v[1], b.v[2], b.v[3]], { kind: "piece", of: sb });
    const v = b.k.cornerValues(b.f, UV)!; eq(`${v[2]},${v[3]}`, "0,0"); eq(b.k.takeReport().odd.get(b.f)?.corner.get(UV), "missing"); clean(b.k, "切不出三角形");
  });
  it("piece 的取样处表里写的角号不在旧环里 → 抛（调用的地方写错了，不悄悄退回默认规矩）", () => {
    for (const bad of [4, -1, 1.5]) {
      const { k, f, v } = quad(), sh = k.shapeOf(f);
      let threw = false;
      try { k.setFaceRing(f, v, { kind: "piece", of: sh, from: [0, 1, 2, bad] }); } catch (e) { threw = /not a corner of the old ring/.test(String(e)); }
      assert(threw, `角号 ${bad} 应该抛`);
    }
  });
});

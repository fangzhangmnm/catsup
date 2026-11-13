// 合并点这个原子（属性地基轮第二步；规程 ai-docs/20261112-attribute-protocol.md 第七¾节第二稿 + 第 8 条验收）。created 2026-11-13 by Claude Opus 5.5
// 内核 MeshKernel.mergePoints（规划 mesh/merge-points.ts、角上的数 columns.ts mergeCornerValues）+ 两个新口（relinkEdgeEnd / removeFaceReported）+ 收尾说的话（editor/paint-upkeep.ts goneNotes）。
// 列名是测试自己起的（引擎只比数值，不认意思）；最后一条用真的贴图坐标走 scene/uv.ts。
import { faceMaterial, givenFaceValues } from "../src/mesh/reserved-columns.ts";
import { describe, it, eq, assert } from "./runner.mjs";
import { MeshKernel, F_HIDDEN, F_SEAM, F_SHARP, F_SMOOTH, F_SOFT, F_WIRE, type GoneFace } from "../src/mesh/mesh-kernel.ts";
import { FRESH, type ColumnDef } from "../src/mesh/columns.ts";
import { addBox, catmullClark, mergeVerts } from "../src/mesh/ops/index.ts";
import { goneNotes } from "../src/editor/paint-upkeep.ts";
import { UV_SET_COL } from "../src/scene/uv.ts";
import { placeOn, uvAtOf } from "./uv-kit.ts";
import type { Pt3 } from "../src/kernel/geom.ts";

const P = (x: number, y: number, z = 0): Pt3 => ({ x, y, z });
const UV = "uv", CODE = "code";
const UVD: ColumnDef = { id: UV, on: "corner", type: { floats: 2 }, continuous: true, fill: 0, merge: "first", kind: "test" };
const CODED: ColumnDef = { id: CODE, on: "face", type: "int", continuous: false, fill: -1, merge: "defaultIfMixed", kind: "test" };
const clean = (k: MeshKernel, where: string): void => { const bad = k.check(); eq(bad.length, 0, `${where}：${bad.slice(0, 3).join("；")}`); };
const bits = (x: number): string => String(new Uint32Array(new Float32Array([x]).buffer)[0]);
/** 面 f 在点 v 上那个角的值（逐位，字符串）。 */
const at = (k: MeshKernel, f: number, v: number): string => { const i = k.faceVerts(f).indexOf(v), a = k.cornerValues(f, UV)!; return `${bits(a[2 * i])},${bits(a[2 * i + 1])}`; };
const rng = (seed: number): (() => number) => { let s = seed >>> 0 || 1; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; };

/** w × h 的平面网格（点 (i, j) 的编号 = j × (w + 1) + i），每个角的值 = uvOf(面, 点的位置)。 */
function grid(w: number, h: number, uvOf: (faceCenterX: number, p: Pt3) => [number, number]): { k: MeshKernel; v: (i: number, j: number) => number } {
  const k = new MeshKernel(); k.addColumn(UVD); k.addColumn(CODED);
  const v = (i: number, j: number): number => j * (w + 1) + i;
  for (let j = 0; j <= h; j++) for (let i = 0; i <= w; i++) k.addVertex(P(i, j));
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const f = k.addFace([v(i, j), v(i + 1, j), v(i + 1, j + 1), v(i, j + 1)], FRESH);
    k.setCornerValues(f, UV, k.facePts(f).flatMap((p) => uvOf(i + 0.5, p))); k.setFaceValue(f, CODE, 7);
  }
  return { k, v };
}
/** 每条挂两张面的边：两张面在边两头的值要么都一样（同一片）要么至少一头不一样（接缝）。返回 [对得上的边数, 对不上的边数]，另交一个「这条边该不该对得上」的判断。 */
function seams(k: MeshKernel, shouldMatch: (f: number, g: number) => boolean): void {
  for (const e of k.edges()) {
    const fs = [...k.eFaces(e)];
    if (fs.length !== 2) continue;
    const [f, g] = fs, a = k.edgeA[e], b = k.edgeB[e], match = at(k, f, a) === at(k, g, a) && at(k, f, b) === at(k, g, b);
    eq(match, shouldMatch(f, g), `边 ${a}–${b}（面 ${f} / ${g}）${shouldMatch(f, g) ? "原来对得上，合并之后也要对得上" : "原来是接缝，合并之后还是接缝"}`);
  }
}
const cx = (k: MeshKernel, f: number): number => k.facePts(f).reduce((s, p) => s + p.x, 0) / k.faceLen[f];

describe("合并点：一伙角一起走（第 3 条）", () => {
  for (const to of ["center", "first"] as const) it(`一片连着的面上合并相邻两点（到${to === "center" ? "中心" : "第一个点"}）：每条原来对得上的边两边的值还一样；不报告`, () => {
    const { k, v } = grid(3, 2, (_c, p) => [p.x * 0.25, p.y * 0.5]);
    mergeVerts(k, [v(1, 1), v(2, 1)], to); clean(k, "合并");
    seams(k, () => true);
    const r = k.takeReport(); eq(r.odd.size, 0, "没有对不上的列"); eq(r.gone.length, 0, "没有面没了");
    eq(k.faces().length, 6, "两张三角 + 四张四边形，面数不变");
  });
  it("跨着接缝合并（接缝上的一条边塌掉；接缝旁边的一条边塌掉）：接缝两边各是各的值，接缝还在", () => {
    const half = (c: number): number => (c < 2 ? 0 : 10);   // x = 2 那一列是接缝：右半边的值整体挪 10
    for (const pair of [[[2, 0], [2, 1]], [[1, 1], [2, 1]]] as const) {
      const { k, v } = grid(4, 2, (c, p) => [p.x * 0.25 + half(c), p.y * 0.5]);
      const side = new Map(k.faces().map((f) => [f, half(cx(k, f))]));   // 合并之前每张面在哪半边（合并之后面心会挪）
      mergeVerts(k, [v(pair[0][0], pair[0][1]), v(pair[1][0], pair[1][1])], "center"); clean(k, "合并");
      seams(k, (f, g) => side.get(f) === side.get(g));
      eq(k.takeReport().odd.size, 0);
    }
  });
  it("离散的列不并伙：面上的整数原样（四边形塌成三角形，面上的列不变、还是那张面）", () => {
    const { k, v } = grid(1, 1, (_c, p) => [p.x, p.y]);
    const f = k.faces()[0];
    mergeVerts(k, [v(0, 0), v(1, 0)], "center"); clean(k, "合并");
    eq(k.faces().join(), String(f), "还是那张面"); eq(k.faceLen[f], 3, "变成三角形"); eq(k.faceValue(f, CODE), 7, "面上的整数不变");
    eq(k.takeReport().gone.length, 0);
  });
  it("有步长的列：混出来的值取整到步长", () => {
    const k = new MeshKernel(); k.addColumn({ ...UVD, quantum: 4 });
    const ids = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].map((p) => k.addVertex(p));
    const f = k.addFace(ids, FRESH); k.setCornerValues(f, UV, [0, 0, 1, 0, 1, 1, 0, 1]);
    mergeVerts(k, [ids[0], ids[1]], "center");   // 0 和 1 的中点 = 0.5 → 步长 1/4 上正好；再来一次不是格点的
    const k2 = new MeshKernel(); k2.addColumn({ ...UVD, quantum: 4 });
    const ids2 = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].map((p) => k2.addVertex(p));
    const f2 = k2.addFace(ids2, FRESH); k2.setCornerValues(f2, UV, [0, 0, 0.3, 0, 1, 1, 0, 1]);
    mergeVerts(k2, [ids2[0], ids2[1]], "center");
    const u = k.cornerValues(f, UV)![0], u2 = k2.cornerValues(f2, UV)![0];
    eq(u, 0.5); eq(u2, Math.round(0.15 * 4) / 4, "0.15 → 0.25");
  });
});

describe("合并点：环和面（第 4、5 条）", () => {
  const poly = (n: number): { k: MeshKernel; ids: number[]; f: number } => {
    const k = new MeshKernel(); k.addColumn(UVD); k.addColumn(CODED);
    const ids = Array.from({ length: n }, (_, i) => k.addVertex(P(Math.cos((2 * Math.PI * i) / n), Math.sin((2 * Math.PI * i) / n))));
    const f = k.addFace(ids, { kind: "fresh", face: givenFaceValues(k, { material: 3 }) }); k.setCornerValues(f, UV, ids.flatMap((_, i) => [i, 10 * i])); k.setFaceValue(f, CODE, 5);
    return { k, ids, f };
  };
  it("环上同一个点出现两次：剪成两张面（原来的编号给环上靠前那圈），面上的列、材质照抄，角照抄", () => {
    const { k, ids, f } = poly(6);
    mergeVerts(k, [ids[0], ids[3]], "first"); clean(k, "合并");
    const fs = k.faces(); eq(fs.length, 2);
    eq(k.faceVerts(f).join(), [ids[0], ids[1], ids[2]].join(), "原来的编号 = 从原来第一个角起的那圈");
    const g = fs.find((x) => x !== f)!;
    eq(k.faceVerts(g).join(), [ids[0], ids[4], ids[5]].join());
    for (const x of fs) { eq(k.faceValue(x, CODE), 5); eq(faceMaterial(k, x), 3); }
    eq(Array.from(k.cornerValues(g, UV)!).join(), [3, 30, 4, 40, 5, 50].join(), "剪下来那圈的角照抄（被合并掉的点的角 = 它自己原来的值：两伙不相邻，各留各的）");
    eq(k.takeReport().gone.length, 0, "剪圈不报告（没丢东西）");
  });
  it("剪出来只有两个角的那圈（刺）：不成面，那条边留成不挂面的线，刺尖的点不删", () => {
    const { k, ids, f } = poly(5);
    mergeVerts(k, [ids[0], ids[2]], "first"); clean(k, "合并");
    eq(k.faces().join(), String(f)); eq(k.faceVerts(f).join(), [ids[0], ids[3], ids[4]].join());
    const e = k.edgeOf(ids[0], ids[1]);
    assert(e >= 0, "刺那条边还在"); eq(k.eFaces(e).length, 0); eq(k.edgeFlags[e] & F_WIRE, F_WIRE, "打上裸线位");
    assert(k.hasV(ids[1]), "刺尖的点还在");
  });
  it("塌掉的面：删、进报告（原因 collapsed、带没了之前的环和列的值）", () => {
    const { k, ids, f } = poly(3);
    mergeVerts(k, [ids[0], ids[1]], "center"); clean(k, "合并");
    assert(!k.hasF(f));
    const r = k.takeReport(); eq(r.gone.length, 1);
    const g = r.gone[0]; eq(g.why, "collapsed"); eq(g.shape.ring!.join(), ids.join()); eq(g.shape.face!.get(CODE), 5); eq(Array.from(g.shape.corner!.get(UV)!).join(), [0, 0, 1, 10, 2, 20].join());
  });
  it("合并出同一圈点（反向）的两张面：留编号小的，别的删、进报告（overlap，with = 留下的那张）", () => {
    const k = new MeshKernel(); k.addColumn(UVD); const v = [P(0, 0), P(1, 0), P(1, 1), P(0, 1)].map((p) => k.addVertex(p));   // 有列才记没了之前的环（没有列的内核只记材质）
    const a = k.addFace([v[0], v[1], v[2]], FRESH), b = k.addFace([v[0], v[2], v[3]], FRESH);
    mergeVerts(k, [v[1], v[3]], "first"); clean(k, "合并");
    eq(k.faces().join(), String(a));
    const r = k.takeReport(); eq(r.gone.length, 1); eq(r.gone[0].why, "overlap"); eq(r.gone[0].with, a); eq(r.gone[0].shape.ring!.join(), [v[0], v[2], v[1]].join(), "没了之前的样子 = 合并之后、删之前（环已经换成合并后的点，和留下的那张是同一圈）");
    void b;
  });
  it("点集一样、环不一样的两张面：两张都留着（不是重叠）", () => {
    const k = new MeshKernel(); const v = [P(0, 0), P(1, 0), P(1, 1), P(0, 1), P(0.5, 2)].map((p) => k.addVertex(p));
    const a = k.addFace([v[0], v[1], v[2], v[3]], FRESH), b = k.addFace([v[0], v[2], v[1], v[4]], FRESH);
    mergeVerts(k, [v[3], v[4]], "first");
    eq(k.faces().join(), [a, b].join(), "两张都在"); eq(k.takeReport().gone.length, 0);
  });
});

describe("合并点：边（第 2 条）", () => {
  /** 两张三角挂在点 0 上；合并 1 和 3 → 边 0–1 和 0–3 落到同一对点上。 */
  const run = (fa: number, fb: number): { flags: number; keep: number; kept: number } => {
    const k = new MeshKernel(); const v = [P(0, 0), P(1, 0), P(1, 1), P(1, -0.1), P(1, -1)].map((p) => k.addVertex(p));
    k.addFace([v[0], v[1], v[2]], FRESH); k.addFace([v[0], v[4], v[3]], FRESH);
    const e01 = k.edgeOf(v[0], v[1]), e03 = k.edgeOf(v[0], v[3]);
    k.setEdgeFlags(e01, fa); k.setEdgeFlags(e03, fb);
    mergeVerts(k, [v[1], v[3]], "first"); clean(k, "合并");
    const e = k.edgeOf(v[0], v[1]);
    return { flags: k.edgeFlags[e], keep: e, kept: Math.min(e01, e03) };
  };
  it("几条边落到同一对点：留编号最小的那条；棱 / 平滑 / 不画线 / 隐藏都有才留，接缝有一个就留（隐藏：看得见的赢）", () => {
    const r = run(F_SHARP | F_SEAM, F_SHARP); eq(r.keep, r.kept, "留编号最小的"); eq(r.flags, F_SHARP | F_SEAM);
    eq(run(F_SHARP, 0).flags, 0, "棱：一条有一条没有 = 没有");
    eq(run(F_SOFT | F_SMOOTH, F_SOFT | F_SMOOTH).flags, F_SOFT | F_SMOOTH);
    eq(run(F_HIDDEN, 0).flags, 0, "隐藏：一条藏一条看得见 = 看得见");
    eq(run(F_HIDDEN, F_HIDDEN).flags, F_HIDDEN);
    eq(run(0, F_SEAM).flags, F_SEAM, "接缝：有一个就留");
  });
  it("只换了一头的边还是那条边：编号、标记都不变", () => {
    const { k, v } = grid(2, 1, (_c, p) => [p.x, p.y]);
    const e = k.edgeOf(v(2, 0), v(2, 1)); k.setEdgeFlags(e, F_SEAM | F_SHARP);
    mergeVerts(k, [v(1, 0), v(2, 0)], "first"); clean(k, "合并");
    eq(k.edgeOf(v(1, 0), v(2, 1)), e, "编号不变"); eq(k.edgeFlags[e], F_SEAM | F_SHARP, "标记不变");
  });
});

describe("合并点：和组的先后无关、跑两遍一样（第 1 条、第 8 条）", () => {
  it("随机：细分过的方块上一次合并几组（到第一个 / 等权 / 不等权）；组的先后打乱逐位相同，跑两遍逐位相同，自检干净", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const r = rng(seed), base = new MeshKernel(); addBox(base, P(0, 0, 0), P(1, 1, 1)); base.addColumn(UVD); base.addColumn(CODED);
      for (const f of base.faces()) { base.setCornerValues(f, UV, base.facePts(f).flatMap((p) => [p.x + p.z * r(), p.y - p.z])); base.setFaceValue(f, CODE, Math.floor(r() * 3)); }
      catmullClark(base);
      const vs = base.verts(), used = new Set<number>(), groups: { verts: number[]; to: "first" | { weights: number[] } }[] = [];
      for (let g = 0; g < 1 + Math.floor(r() * 4); g++) {
        const n = 2 + Math.floor(r() * 2), verts: number[] = [];
        if (r() < 0.6) { const e = base.edges()[Math.floor(r() * base.edges().length)]; for (const x of [base.edgeA[e], base.edgeB[e]]) if (!used.has(x)) verts.push(x); }
        while (verts.length < n) { const x = vs[Math.floor(r() * vs.length)]; if (!used.has(x) && !verts.includes(x)) verts.push(x); }
        verts.forEach((x) => used.add(x));
        const kind = r(); groups.push({ verts, to: kind < 0.4 ? "first" : { weights: verts.map(() => (kind < 0.7 ? 1 : 0.25 + r())) } });
      }
      const go = (gs: typeof groups): string => { const k = base.clone(); k.mergePoints(gs); clean(k, `种子 ${seed}`); const rep = k.takeReport(); return JSON.stringify(k.toSnapshot()) + JSON.stringify(rep.gone.map((g) => [g.why, g.with, g.shape.ring])); };
      const a = go(groups), b = go([...groups].reverse()), c = go(groups);
      eq(b, a, `种子 ${seed}：组的先后打乱`); eq(c, a, `种子 ${seed}：跑两遍`);
    }
  });
  it("同一个点出现在两组里 = 调用的地方写错了，抛；权重不对也抛", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const [a, b, c] = k.verts();
    let threw = ""; try { k.mergePoints([{ verts: [a, b], to: "first" }, { verts: [b, c], to: "first" }]); } catch (e) { threw = String(e); }
    assert(/two groups/.test(threw), threw);
    threw = ""; try { k.mergePoints([{ verts: [a, b], to: { weights: [0, 0] } }]); } catch (e) { threw = String(e); }
    assert(/sum to 0/.test(threw), threw);
    clean(k, "抛了之后什么都没动");
  });
});

describe("内核的两个新口", () => {
  it("relinkEdgeEnd：不挂面的边换一头 = 还是那条边（编号、标记、邻接）；挂着面 / 换完撞上已有的边 / 不是它的头 / 换成自环 = 抛", () => {
    const k = new MeshKernel(); const v = [P(0, 0), P(1, 0), P(2, 0), P(3, 0)].map((p) => k.addVertex(p));
    const e = k.ensureEdge(v[0], v[1]); k.setEdgeFlags(e, F_WIRE | F_SEAM);
    k.relinkEdgeEnd(e, v[1], v[2]);
    eq(k.edgeOf(v[0], v[2]), e); eq(k.edgeOf(v[0], v[1]), -1); eq(k.edgeFlags[e], F_WIRE | F_SEAM);
    assert(![...k.vEdges(v[1])].includes(e), "老的那头不再挂着它"); clean(k, "换头");
    const other = k.ensureEdge(v[2], v[3]); k.setEdgeFlags(other, F_WIRE);
    const throws = (f: () => void, re: RegExp): void => { let m = ""; try { f(); } catch (x) { m = String(x); } assert(re.test(m), m || "没抛"); };
    throws(() => k.relinkEdgeEnd(e, v[0], v[3]), /already an edge/);
    throws(() => k.relinkEdgeEnd(e, v[3], v[1]), /not an end/);
    throws(() => k.relinkEdgeEnd(e, v[0], v[2]), /loop edge/);
    const box = new MeshKernel(); addBox(box, P(0, 0, 0), P(1, 1, 1));
    const be = box.edges()[0], spare = box.addVertex(P(5, 5, 5));
    throws(() => box.relinkEdgeEnd(be, box.edgeA[be], spare), /still belongs to a face/);
  });
  it("removeFaceReported：删面、进报告（原因、和哪张、没了之前的样子）；takeReport 拿走就清空", () => {
    const { k } = grid(2, 1, (_c, p) => [p.x, p.y]);
    const [f, g] = k.faces(), ring = k.faceVerts(f).join();
    k.removeFaceReported(f, "seam-wall", g);
    assert(!k.hasF(f));
    const r = k.takeReport(); eq(r.gone.length, 1); eq(r.gone[0].why, "seam-wall"); eq(r.gone[0].with, g); eq(r.gone[0].shape.ring!.join(), ring); eq(r.gone[0].shape.face!.get(CODE), 7);
    eq(k.takeReport().gone.length, 0, "拿过就清空");
  });
  it("报告跟着 swapWith 换、不跟着 clone 走（影子内核上跑的指令，换回来时报告跟着来）", () => {
    const { k } = grid(2, 1, (_c, p) => [p.x, p.y]);
    const shadow = k.clone(); shadow.removeFaceReported(shadow.faces()[0], "collapsed");
    eq(k.clone().takeReport().gone.length, 0, "拷贝不带");
    k.swapWith(shadow); eq(k.takeReport().gone.length, 1, "换过来就带着");
  });
});

describe("收尾说的话（editor/paint-upkeep.ts goneNotes）", () => {
  const g = (why: GoneFace["why"], painted: boolean): GoneFace => ({ why, shape: { ring: [0, 1, 2], pts: null, corner: null, face: new Map([[UV_SET_COL.id, painted ? 0 : -1]]) } });
  it("每种原因一句；有画的数出来，没有就不带括号；按第一次出现的先后", () => {
    eq(goneNotes([]).join("；"), "");
    eq(goneNotes([g("collapsed", true), g("collapsed", false), g("overlap", false)]).join("；"), "合并之后有 2 张面塌掉了、被去掉（其中 1 张上有画）；有 1 张面和别的面完全重叠、被去掉");
    eq(goneNotes([g("seam-wall", true)]).join(), "强行对称去掉了 1 张躺在镜像面上的夹层面（其中 1 张上有画）");
  });
});

describe("对贴图坐标的结果（真的贴图坐标列，scene/uv.ts）", () => {
  it("画过的面上合并两个点：画跟着拉过去，旁边不裂出新的缝；本来是接缝的地方还是接缝", () => {
    const { k, v } = grid(4, 2, () => [0, 0]);
    const G = "set-a", half = (c: number): number => (c < 2 ? 0 : 64);
    const side = new Map<number, number>();
    for (const f of k.faces()) { const c = cx(k, f); side.set(f, half(c)); placeOn(k, f, G, k.facePts(f).flatMap((p) => [p.x * 16 + half(c), p.y * 16])); }
    mergeVerts(k, [v(1, 1), v(2, 1)], "center"); clean(k, "合并");
    for (const e of k.edges()) {
      const fs = [...k.eFaces(e)]; if (fs.length !== 2) continue;
      const [f, gg] = fs, uvAtV = (x: number, p: number): string => { const i = k.faceVerts(x).indexOf(p), a = uvAtOf(k, x, G)!; return `${a[2 * i]},${a[2 * i + 1]}`; };
      const match = [k.edgeA[e], k.edgeB[e]].every((p) => uvAtV(f, p) === uvAtV(gg, p));
      eq(match, side.get(f) === side.get(gg), `边 ${k.edgeA[e]}–${k.edgeB[e]}`);
    }
    eq(k.takeReport().odd.size, 0, "没有对不上的");
  });
});

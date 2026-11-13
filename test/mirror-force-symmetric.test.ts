// 强行对称的定理（计划书 `ai-docs/20261109-audit-fixes-plan.md` §3；created 2026-11-09 by Claude Opus 5.5）。
// 第 0 层（v0.18.41）钉「绝不删空」；第 4 / 5 层（v0.18.45）钉 isSymmetric 的真值表、对称化带裸线 / 孤点 / 隐藏、随机步每步对称。原来写的是：强行对称自己绝不把模型删空（「看不出动的是哪边、默认 + 那半」碰上「+ 那半是空的」= 11-09 真 app 里 6 张面 → 0）。
// 对称检查是独立写的（不调 isSymmetric：它本身就是要审的对象）：纯按位置比点 / 面 / 边（不认编号），照定理的条文。后面几层的断言接着往这个文件里加。
import { faceHidden, faceMaterial, setFaceHidden } from "../src/mesh/reserved-columns.ts";
import { describe, it, eq, assert } from "./runner.mjs";
import { FRESH } from "../src/mesh/columns.ts";
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { F_HIDDEN, F_SOFT } from "../src/mesh/mesh-kernel.ts";
import { addBox, deleteFaces, extrudeAndOffset, flipFaces, insetFaces, loopCut, moveVerts, setEdgeFlags, setFaceMaterial } from "../src/mesh/ops/index.ts";
import { type MirrorAxis, forceSide, isSymmetric, pickSide, symmetrize } from "../src/mesh/mirror.ts";
import type { Pt3 } from "../src/kernel/kernel.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const TOL = 1e-9;
const coord = (p: Pt3, a: MirrorAxis): number => (a === 0 ? p.x : a === 1 ? p.y : p.z);
const reflect = (p: Pt3, a: MirrorAxis): Pt3 => (a === 0 ? P(-p.x, p.y, p.z) : a === 1 ? P(p.x, -p.y, p.z) : P(p.x, p.y, -p.z));
const key = (p: Pt3): string => [p.x, p.y, p.z].map((c) => Math.round(c / TOL)).join(",");

/**
 * 独立的对称检查（定理条文，计划书 §3）：返回对不上的地方（空 = 对称）。
 * 点：每个位置上有几个点，镜像位置上就有几个。面：躺在镜像面上的面 = 它自己；别的面的镜像（点序倒过来）是一张面、材质槽相同。边：镜像是一条边、标记相同（「隐藏」不算：那是看法）。
 * **纯按位置比，不认点的编号**（2026-11-10 Claude Fable 5.2 改）：原来是「位置 → 一个点」再按编号比环，两个点叠在同一个位置时会认错人、报假的不对称
 * （随机步真跑出来过：挤出的新边正好穿过中缝上一个已有的点，沿镜像面切开时在那个位置又多一个点）。按位置比也更独立：不和 isSymmetric 共用「点怎么配对」这一步。
 */
function asymmetries(m: MeshKernel, a: MirrorAxis): string[] {
  const out: string[] = [], here = (v: number): string => key(m.pt(v)), there = (v: number): string => key(reflect(m.pt(v), a));
  const bump = (c: Map<string, number>, k: string): void => { c.set(k, (c.get(k) ?? 0) + 1); };
  const points = new Map<string, number>();
  for (const v of m.verts()) bump(points, here(v));
  for (const v of m.verts()) if ((points.get(there(v)) ?? 0) !== points.get(here(v))) out.push(`点 ${v} 对面的点数对不上`);
  if (out.length) return out;
  /** 一圈位置转到字典序最小的那个起点（同一个环不管从哪个点起写，结果一样）。 */
  const ring = (ks: readonly string[]): string => { let best: string | null = null; for (let i = 0; i < ks.length; i++) { const t = [...ks.slice(i), ...ks.slice(0, i)].join("|"); if (best === null || t < best) best = t; } return best ?? ""; };
  const faceKey = (f: number, mirrored: boolean): string => { const r = m.faceVerts(f); return `${ring(mirrored ? r.map(there).reverse() : r.map(here))}#${faceMaterial(m, f)}`; };
  const faces = new Map<string, number>();
  for (const f of m.faces()) bump(faces, faceKey(f, false));
  for (const f of m.faces()) {
    if (m.faceVerts(f).every((v) => Math.abs(coord(m.pt(v), a)) <= TOL)) continue;   // 躺在镜像面上 = 对应它自己
    if ((faces.get(faceKey(f, true)) ?? 0) !== faces.get(faceKey(f, false))) out.push(`面 ${f} 的镜像不在（或材质槽不同）`);
  }
  const edgeKey = (e: number, mirrored: boolean): string => `${[m.edgeA[e], m.edgeB[e]].map(mirrored ? there : here).sort().join("|")}#${m.edgeFlags[e] & ~F_HIDDEN}`;
  const edges = new Map<string, number>();
  for (const e of m.edges()) bump(edges, edgeKey(e, false));
  for (const e of m.edges()) if ((edges.get(edgeKey(e, true)) ?? 0) !== edges.get(edgeKey(e, false))) out.push(`边 ${e} 的镜像不在（或标记不同）`);
  return out;
}
const box = (x0: number, x1: number): MeshKernel => { const m = new MeshKernel(); addBox(m, P(x0, 0, 0), P(x1, 1, 1)); return m; };
/** 整张在 side 那半（不碰镜像面、不跨）的面有几张。 */
const wholly = (m: MeshKernel, a: MirrorAxis, side: -1 | 1): number => m.faces().filter((f) => m.faceVerts(f).every((v) => coord(m.pt(v), a) * side > TOL)).length;

describe("强行对称第 0 层：空的那半不当准（mesh/mirror.ts pickSide）", () => {
  it("11-09 那一案：模型整个在 −X 那半，想要 +X → 换成 −X；对称化之后 12 张面、对称（以前 6 → 0）", () => {
    const m = box(-3, -1);
    eq(pickSide(m, 0, 1), -1); eq(pickSide(m, 0, -1), -1);
    symmetrize(m, 0, pickSide(m, 0, 1)!);
    eq(m.faceCount(), 12); eq(asymmetries(m, 0).join("；"), "");
  });
  it("整个在 +X 那半，想要 −X → 换成 +X", () => {
    const m = box(1, 3);
    eq(pickSide(m, 0, -1), 1);
    symmetrize(m, 0, pickSide(m, 0, -1)!);
    eq(m.faceCount(), 12); eq(asymmetries(m, 0).join("；"), "");
  });
  it("「设置原点到选择中心」那一案：模型在 −X、有一张面贴着镜像面 → 换成 −X；对称化后 10 张面（贴着的那张变夹层被清掉）、对称", () => {
    const m = box(-2, 0);
    eq(pickSide(m, 0, 1), -1);
    symmetrize(m, 0, -1);
    eq(m.faceCount(), 10); eq(asymmetries(m, 0).join("；"), "");
  });
  it("跨过镜像面的盒子两半都有东西：想要哪半就是哪半（不换）", () => {
    const m = box(-1, 2);
    eq(pickSide(m, 0, 1), 1); eq(pickSide(m, 0, -1), -1);
  });
  it("两半什么都没有 = null（这一步不对称化）：空模型；只有一张躺在镜像面上的面。只有一条在 −X 的裸线 = 按 −X（v0.18.45 起对称化也镜裸线；v0.18.41 那版这里是 null）", () => {
    eq(pickSide(new MeshKernel(), 0, 1), null);
    const flat = new MeshKernel(), q = [P(0, 0, 0), P(0, 1, 0), P(0, 1, 1), P(0, 0, 1)].map((p) => flat.addVertex(p));
    flat.addFace(q, FRESH); eq(pickSide(flat, 0, 1), null); eq(pickSide(flat, 0, -1), null);
    const wire = new MeshKernel(); wire.ensureEdge(wire.addVertex(P(-2, 0, 0)), wire.addVertex(P(-1, 0, 0)));
    eq(pickSide(wire, 0, 1), -1);
    symmetrize(wire, 0, -1); eq(asymmetries(wire, 0).join("；"), ""); eq(wire.edges().length, 2, "镜过去一条");
  });
  it("三根轴都一样：盒子整个在 −Y / −Z 那半 → 换过去、对称化后面数翻倍", () => {
    for (const a of [1, 2] as const) {
      const m = new MeshKernel(); addBox(m, a === 1 ? P(0, -3, 0) : P(0, 0, -3), a === 1 ? P(1, -1, 1) : P(1, 1, -1));
      eq(pickSide(m, a, 1), -1);
      symmetrize(m, a, -1);
      eq(m.faceCount(), 12); eq(asymmetries(m, a).join("；"), "");
    }
  });
  it("随机：盒子随便摆（可能偏在一边、贴着、跨过镜像面），随便想要哪半 → 只要有面不躺在镜像面上，pickSide 不是 null，对称化后那半原来整张在它那边的面一张不少、面数不为 0、结果对称", () => {
    let seed = 20261109;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    for (let i = 0; i < 80; i++) {
      const a = (i % 3) as MirrorAxis, lo = Math.round((rnd() * 6 - 3) * 4) / 4, hi = lo + 0.25 + Math.round(rnd() * 12) / 4, want: -1 | 1 = rnd() < 0.5 ? -1 : 1;
      const m = new MeshKernel(), mn = [0, 0, 0], mx = [1, 1, 1]; mn[a] = lo; mx[a] = hi;
      addBox(m, P(mn[0], mn[1], mn[2]), P(mx[0], mx[1], mx[2]));
      const side = pickSide(m, a, want);
      assert(side !== null, `#${i}：盒子 [${lo}, ${hi}] 有面，pickSide 不该是 null`);
      const keep = wholly(m, a, side!);
      symmetrize(m, a, side!);
      assert(m.faceCount() > 0, `#${i}：[${lo}, ${hi}] 想要 ${want} → ${side}，对称化删光了`);
      assert(wholly(m, a, side!) >= keep, `#${i}：[${lo}, ${hi}] 按 ${side} 对称化后那半少了面`);
      eq(asymmetries(m, a).join("；"), "", `#${i}：[${lo}, ${hi}] 按 ${side} 对称化后不对称`);
    }
  });
});

/** 以 x = 0 为中缝、中缝上切过一圈的盒子（-1..1 × 0..1 × 0..1）：两半各 5 张面。 */
function halved(): MeshKernel {
  const m = box(-1, 1), e = m.edges().find((x) => Math.abs(m.pt(m.edgeA[x]).x - m.pt(m.edgeB[x]).x) > 1)!;
  loopCut(m, e, 0.5);
  return m;
}
const leftFace = (m: MeshKernel): number => m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).x <= 1e-9) && m.faceVerts(f).some((v) => m.pt(v).x < -1e-9) && m.faceVerts(f).some((v) => Math.abs(m.pt(v).x) < 1e-9))!;
const leftEdge = (m: MeshKernel): number => m.edges().find((e) => m.pt(m.edgeA[e]).x < -0.5 && m.pt(m.edgeB[e]).x < -0.5)!;

describe("强行对称第 4 层：isSymmetric 照定理说真话（mesh/mirror.ts）", () => {
  const cases: [string, () => MeshKernel, boolean][] = [
    ["中缝切开的盒子", halved, true],
    ["没切开的对称盒子（跨过镜像面的面镜过去是它自己）", () => box(-1, 1), true],
    ["多一张整张躺在镜像面上的面（对应它自己）", () => { const m = halved(), q = [P(0, 2, 2), P(0, 3, 2), P(0, 3, 3), P(0, 2, 3)].map((p) => m.addVertex(p)); m.addFace(q, FRESH); return m; }, true],
    ["一边藏了一张面（隐藏是看法，不算）", () => { const m = halved(); setFaceHidden(m, leftFace(m), true); return m; }, true],
    ["挖掉左边一张面（11-09 审查：左 4 右 5）", () => { const m = halved(); deleteFaces(m, [leftFace(m)], true); return m; }, false],
    ["翻了左边一张面", () => { const m = halved(); flipFaces(m, [leftFace(m)]); return m; }, false],
    ["左边一张面换了材质槽", () => { const m = halved(); setFaceMaterial(m, [leftFace(m)], 2); return m; }, false],
    ["左边一条边打了标记（11-09 审查：左 1 右 0）", () => { const m = halved(); setEdgeFlags(m, [leftEdge(m)], F_SOFT, true); return m; }, false],
    ["只有左边有一条裸线", () => { const m = halved(); m.ensureEdge(m.addVertex(P(-3, 0, 0)), m.addVertex(P(-2, 0, 0))); return m; }, false],
    ["只有左边有一个孤点", () => { const m = halved(); m.addVertex(P(-2, 2, 2)); return m; }, false],
  ];
  for (const [name, mk, want] of cases) it(`${name} → ${want ? "对称" : "不对称"}；和独立检查一致`, () => {
    const m = mk();
    eq(isSymmetric(m, 0), want);
    eq(asymmetries(m, 0).length === 0, want, `独立检查：${asymmetries(m, 0).join("；")}`);
  });
});

describe("强行对称第 5 层：对称化带上裸线 / 孤点 / 隐藏；选边先看动了哪边（mesh/mirror.ts）", () => {
  it("+X 那边有一条裸线、一个孤点、一张藏着的面 → 按 +X 对称化：对面都有了（藏的那张也藏着）、isSymmetric 为真（以前每一步都会把另一半整个重建）", () => {
    const m = halved();
    m.ensureEdge(m.addVertex(P(2, 0, 0)), m.addVertex(P(3, 0, 0))); m.addVertex(P(2, 2, 2));
    const rf = m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).x >= -1e-9) && m.faceVerts(f).some((v) => m.pt(v).x > 0.5))!;
    setFaceHidden(m, rf, true);
    const r = symmetrize(m, 0, 1);
    eq(r.wires, 1); eq(r.points, 1);
    eq(asymmetries(m, 0).join("；"), ""); assert(isSymmetric(m, 0), "对称化之后 isSymmetric 必须为真（不然每一步都重建）");
    eq(m.faces().filter((f) => faceHidden(m, f)).length, 2, "藏着的那张，镜过去也藏着");
  });
  it("一条跨过镜像面的裸线：先在镜像面上切开，留下的那半镜过去", () => {
    const m = halved(); m.ensureEdge(m.addVertex(P(-0.5, 3, 0)), m.addVertex(P(1.5, 3, 0)));
    symmetrize(m, 0, 1);
    eq(asymmetries(m, 0).join("；"), ""); assert(m.verts().some((v) => Math.abs(m.pt(v).x + 1.5) < 1e-9 && Math.abs(m.pt(v).y - 3) < 1e-9), "−1.5 那头是镜过去的");
  });
  it("面优先于线：想要的那半只有一条线、另一半是整个模型 → 换到有面的那半（不把面全删了）", () => {
    const m = box(1, 3); m.ensureEdge(m.addVertex(P(-3, 0, 0)), m.addVertex(P(-2, 0, 0)));
    eq(pickSide(m, 0, -1), 1);
    const w = new MeshKernel(); w.ensureEdge(w.addVertex(P(-3, 0, 0)), w.addVertex(P(-2, 0, 0)));
    eq(pickSide(w, 0, 1), -1, "两半都没有面：有线的那半");
  });
  it("forceSide：挪的点在哪边 → 那边；只翻面（没挪没长）→ 按指令点名的面在哪边；什么都看不出来 → 上一次的边、guessed", () => {
    const m = halved(), before = m.clone(), v = m.verts().find((x) => m.pt(x).x < -0.5)!;
    moveVerts(m, [{ v, to: { ...m.pt(v), z: m.pt(v).z + 0.3 } }]);
    eq(forceSide(before, m, 0, { verts: [], edges: [], faces: [] }, 1).want, -1);
    const m2 = halved(), b2 = m2.clone(), lf = leftFace(m2); flipFaces(m2, [lf]);
    const fs = forceSide(b2, m2, 0, { verts: [], edges: [], faces: [lf] }, 1);
    eq(fs.want, -1); eq(fs.guessed, false);
    const g = forceSide(b2, m2, 0, { verts: [], edges: [], faces: [] }, -1);
    eq(g.want, -1); eq(g.guessed, true);
  });
  it("把 + 那半的一张面朝镜像面挤出、穿过去（推拉一条指令就能做到）→ 以点名的 + 那半为准：挤出的那段在中缝切开、和对面焊成一座桥（一个连通块）；挪点照旧先按挪的距离", () => {
    // 2026-11-10 Claude Fable 5.2 审 v0.18.45：那一版先看「新长的点落在哪边」= 以 − 为准，挤出的那段和盒子脱开、盒子上那张面被镜回来（三块）。
    // 计划书原文「点名的排第一」对挤出是对的，对挪点不对（软选择跨中缝会带偏坐标和）→ 顺序 = 挪了的旧点（按距离）→ 点名的 → 新长的 / 删掉的 → 上一次的边。
    const two = (): MeshKernel => { const m = new MeshKernel(); addBox(m, P(0.2, 0, 0), P(1, 1, 1)); addBox(m, P(-1, 0, 0), P(-0.2, 1, 1)); return m; };
    const blocks = (m: MeshKernel): number => {
      const par = new Map<number, number>(m.verts().map((v) => [v, v])), find = (a: number): number => { while (par.get(a) !== a) a = par.get(a)!; return a; };
      for (const e of m.edges()) par.set(find(m.edgeA[e]), find(m.edgeB[e]));
      return new Set(m.verts().map(find)).size;
    };
    const before = two(), m = before.clone(), f = m.faces().find((x) => m.faceVerts(x).every((v) => Math.abs(m.pt(v).x - 0.2) < 1e-9))!;
    eq(asymmetries(before, 0).join("；"), ""); eq(blocks(before), 2);
    extrudeAndOffset(m, { faces: [f] }, P(-0.5, 0, 0));   // 新点落在 x = −0.3：过了镜像面
    const fs = forceSide(before, m, 0, { verts: [], edges: [], faces: [f] }, undefined);
    eq(fs.want, 1, "点名的面在 + 那半"); eq(fs.side, 1); eq(fs.guessed, false);
    symmetrize(m, 0, fs.side!);
    eq(asymmetries(m, 0).join("；"), ""); eq(blocks(m), 1, "两个盒子被挤出的那段连成一块");
    eq(m.edges().filter((e) => m.eFaces(e).length === 1).length, 0, "没有破口");
    // 挪点：软选择跨中缝——左边三个点各挪一点点、右边一个点挪很多 → 按挪的距离 = 右边（点名的坐标和偏左，不能让它排第一）
    const h = halved(), hb = h.clone(), L = h.verts().filter((v) => h.pt(v).x < -0.5).slice(0, 3), R = h.verts().find((v) => h.pt(v).x > 0.5)!;
    moveVerts(h, [...L.map((v) => ({ v, to: { ...h.pt(v), z: h.pt(v).z + 0.01 } })), { v: R, to: { ...h.pt(R), z: h.pt(R).z + 0.5 } }]);
    eq(forceSide(hb, h, 0, { verts: [...L, R], edges: [], faces: [] }, undefined).want, 1);
  });
  it("随机：强行对称开着，从中缝切开的盒子起随机做 60 步（挪点 / 挤出 / 内插 / 删面 / 翻面 / 换材质 / 打标记 / 加裸线 / 加孤点）；每步之后独立检查说对称、面数不掉到一半以下", () => {
    let seed = 1;
    const rnd = (): number => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
    let concave = 0;
    for (let s0 = 1; s0 <= 8; s0++) {
      seed = s0 * 7919;
      let m = halved(), last: -1 | 1 | undefined;
      for (let k = 0; k < 60; k++) {
        const before = m.clone(), fs = m.faces(), es = m.edges(), vs = m.verts(), r = rnd();
        const pickF = (): number => fs[Math.floor(rnd() * fs.length)], named = { verts: [] as number[], edges: [] as number[], faces: [] as number[] };
        if (r < 0.2 && vs.length) { const v = vs[Math.floor(rnd() * vs.length)], p = m.pt(v); moveVerts(m, [{ v, to: { x: p.x + (rnd() - 0.5) * 0.6, y: p.y + (rnd() - 0.5) * 0.6, z: p.z + (rnd() - 0.5) * 0.6 } }]); named.verts.push(v); }
        else if (r < 0.32 && fs.length && m.faceCount() < 300) { const f = pickF(); extrudeAndOffset(m, { faces: [f] }, { x: (rnd() - 0.5) * 0.4, y: 0, z: 0.3 }); named.faces.push(f); }
        else if (r < 0.42 && fs.length && m.faceCount() < 300) { const f = pickF(); insetFaces(m, [f], 0.05); named.faces.push(f); }
        else if (r < 0.52 && fs.length > 4) { const f = pickF(); deleteFaces(m, [f], true); named.faces.push(f); }
        else if (r < 0.62 && fs.length) { const f = pickF(); flipFaces(m, [f]); named.faces.push(f); }
        else if (r < 0.7 && fs.length) { const f = pickF(); setFaceMaterial(m, [f], 1 + Math.floor(rnd() * 3)); named.faces.push(f); }
        else if (r < 0.8 && es.length) { const e = es[Math.floor(rnd() * es.length)]; setEdgeFlags(m, [e], F_SOFT, rnd() < 0.7); named.edges.push(e); }
        else if (r < 0.9) { const a = P((rnd() - 0.5) * 6, 2 + rnd(), rnd()), b = P(a.x + 0.5, a.y, a.z); m.ensureEdge(m.addVertex(a), m.addVertex(b)); }
        else m.addVertex(P((rnd() - 0.5) * 6, 3 + rnd(), rnd()));
        if (!isSymmetric(m, 0)) {
          const f = forceSide(before, m, 0, named, last);
          if (f.side) {
            const trial = m.clone();
            try { symmetrize(trial, 0, f.side); m = trial; last = f.side; } catch { m = before; concave++; }   // 劈不开的凹面 = 这一步不对称化（编辑器里说出来、这里退回去）
          }
        }
        const bad = asymmetries(m, 0);
        assert(bad.length === 0, `种子 ${s0} 第 ${k} 步之后不对称：${bad.slice(0, 3).join("；")}`);
        assert(isSymmetric(m, 0), `种子 ${s0} 第 ${k} 步：独立检查说对称，isSymmetric 却说不对称（会每步重建）`);
        assert(m.faceCount() * 2 >= before.faceCount() - 2, `种子 ${s0} 第 ${k} 步：面数 ${before.faceCount()} → ${m.faceCount()}，掉到一半以下`);
      }
    }
    assert(concave < 60, `劈不开的步数太多（${concave}）：随机步没在测东西`);
  });
});

describe("强行对称第 7 条：开关镜像进撤销（op setMeshMirror，骨架级；2026-11-09）", () => {
  it("提交「开强行对称」+ 对称化（同一步）→ 撤销：设置和模型一起回去；重做：一起回来；场景拷贝之间不共享这张表", async () => {
    const { Scene } = await import("../src/scene/scene.ts"), { History } = await import("../src/editor/history.ts"), { applyOp } = await import("../src/editor/ops.ts");
    const { sceneBox } = await import("./format-scenes.ts"), { IDENTITY } = await import("../src/scene/xform.ts");
    const s0 = new Scene(sceneBox()), d = s0.mintDef("盒", sceneBox());
    s0.mintInstance(s0.root, null, d.id, IDENTITY);
    let s = applyOp(s0, { op: "castDefinition", def: d.id, to: "mesh" }).scene;
    const h = new History(s), f0 = s.mesh(d.id).kernel.faceCount();
    s = h.commit(s, { op: "setMeshMirror", def: d.id, mirror: { mode: "force", axis: 0 } }).scene;
    s = h.commit(s, { op: "meshSymmetrize", def: d.id, axis: 0, side: 1 }, true).scene;
    eq(s.meshMirrors.get(d.id)?.mode, "force");
    const u = h.undo()!; s = u.scene;
    eq(s.meshMirrors.has(d.id), false, "撤销一下：强行对称关回去了（以前不进撤销：模型回来了、强行对称还开着）");
    eq(s.mesh(d.id).kernel.faceCount(), f0, "模型也回来了");
    s = h.redo(s)!.scene;
    eq(s.meshMirrors.get(d.id)?.mode, "force", "重做：设置回来");
    const c = s.cloneSkeleton(); c.meshMirrors.delete(d.id);
    eq(s.meshMirrors.get(d.id)?.mode, "force", "骨架拷贝改它的表，原件不受影响");
    let threw = ""; try { applyOp(s, { op: "setMeshMirror", def: s.root, mirror: { mode: "edit", axis: 0 } }); } catch (e) { threw = (e as Error).name; }
    eq(threw, "OpTargetError", "只对网格体");
  });
});

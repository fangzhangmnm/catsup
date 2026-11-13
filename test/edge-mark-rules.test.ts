// 边上的标记跟着拓扑操作怎么走（施工单二十二 A，统筹 11-12）：一处常量 + 两张表 + 每个拓扑操作一行，守卫逼着填。created 2026-11-12 by Claude Opus 5.5
// 钉：① 内核里每一位边标记在 JOIN、MOVE 两张表里都有一格（新加一位不填 = 红）；② src/mesh/ops/ 每个文件在 OPS 表里有一行、表里没有多出来的行；
//    ③ 拓扑操作不自己列位（不许直接写 F_SOFT / F_SMOOTH / F_SHARP / F_SEAM / F_HIDDEN；结构位 F_WIRE 例外）；
//    ④ 接缝真的跟着走：挤出的帽、劈边、细分、环切的两半带；并边有一条就留（隐藏并边两条都有才留）；倒角时挨着的边换成新边带上；手标两条都有才留照旧。
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync, readdirSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; readdirSync(p: string): string[] };
import * as MK from "../src/mesh/mesh-kernel.ts";
import { MeshKernel, F_SEAM, F_SHARP, F_SOFT, F_SMOOTH, F_HIDDEN } from "../src/mesh/mesh-kernel.ts";
import { JOIN, MOVE, OPS, joinFlags, MOVING_MARKS, HAND_MARKS } from "../src/mesh/edge-mark-rules.ts";
import { EDGE_FLAG_RULES, mergeEdgeFlags } from "../src/mesh/merge-points.ts";
import { addBox } from "../src/mesh/ops/index.ts";
import { extrudeFaces } from "../src/mesh/ops/extrude.ts";
import { splitEdge } from "../src/mesh/ops/split.ts";
import { dissolveVertex } from "../src/mesh/ops/join.ts";
import { subdivide } from "../src/mesh/ops/subdivide.ts";
import { loopCut } from "../src/mesh/ops/loopcut.ts";
import { bevelEdges } from "../src/mesh/ops/bevel.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
/** 内核里的每一位边标记（F_ 开头、一个位；FF_ 是面上的，不算）。 */
const edgeBits = (): [string, number][] => Object.entries(MK).filter(([k, v]) => /^F_[A-Z]+$/.test(k) && typeof v === "number" && v > 0 && (v & (v - 1)) === 0) as [string, number][];
/** 去掉注释（行注释 + 块注释）：注释里提到位名不算列位。 */
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const ringEdges = (m: MeshKernel, f: number): number[] => { const r = m.faceVerts(f); return r.map((v, i) => m.edgeOf(v, r[(i + 1) % r.length])); };
const topOf = (m: MeshKernel, z = 1): number => m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === z))!;

describe("边标记跟着走的规矩（edge-mark-rules.ts）", () => {
  it("内核里每一位边标记在 JOIN、MOVE 两张表里都有一格；表里没有内核不认识的位", () => {
    const bits = edgeBits();
    assert(bits.length >= 6, `找到的位：${bits.map(([k]) => k).join(",")}`);
    for (const [name, b] of bits) { assert(JOIN[b] !== undefined, `${name} 不在 JOIN 表里：新加一位 = 填它并边时怎么合`); assert(MOVE[b] !== undefined, `${name} 不在 MOVE 表里：新加一位 = 填它搬家时带不带`); }
    const known = new Set(bits.map(([, b]) => b));
    for (const b of [...Object.keys(JOIN), ...Object.keys(MOVE)].map(Number)) assert(known.has(b), `表里有一位 ${b} 内核里没有`);
    eq(MOVING_MARKS & F_SEAM, F_SEAM, "接缝是一起搬家的那组"); eq(MOVING_MARKS & HAND_MARKS, HAND_MARKS);
  });
  it("src/mesh/ops/ 每个文件在 OPS 表里有一行；表里没有多出来的行", () => {
    const files = readdirSync("src/mesh/ops").filter((f) => f.endsWith(".ts")).sort();
    eq(files.filter((f) => !OPS[f]).join(","), "", "新加的拓扑操作要在 OPS 表里写一行：它对边标记怎么走");
    eq(Object.keys(OPS).filter((f) => !files.includes(f)).join(","), "", "OPS 表里的文件没了");
  });
  it("拓扑操作不自己列位：src/mesh/ops/ 的代码里不直接写 F_SOFT / F_SMOOTH / F_SHARP / F_SEAM / F_HIDDEN（只引用 edge-mark-rules 的名字；F_WIRE 是结构位，可以）", () => {
    const bad: string[] = [];
    for (const f of readdirSync("src/mesh/ops").filter((x) => x.endsWith(".ts"))) {
      const src = code(readFileSync(`src/mesh/ops/${f}`, "utf8"));
      for (const n of ["F_SOFT", "F_SMOOTH", "F_SHARP", "F_SEAM", "F_HIDDEN"]) if (new RegExp(`\\b${n}\\b`).test(src)) bad.push(`${f}:${n}`);
    }
    eq(bad.join(","), "");
  });
  it("并边：手标和隐藏两条都有才留；接缝有一条就留（joinFlags 和表一致）", () => {
    eq(joinFlags(F_SHARP, F_SHARP), F_SHARP); eq(joinFlags(F_SHARP, 0), 0); eq(joinFlags(F_SOFT | F_SMOOTH, F_SOFT), F_SOFT);
    eq(joinFlags(F_SEAM, 0), F_SEAM); eq(joinFlags(F_SEAM | F_SHARP, F_SHARP), F_SEAM | F_SHARP);
    eq(joinFlags(0, F_HIDDEN), 0, "隐藏：一条藏一条看得见 = 看得见的赢（统筹 11-13；以前是有一条就留）"); eq(joinFlags(F_HIDDEN, F_HIDDEN), F_HIDDEN);
    const run = (fa: number, fb: number): number => {
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; m.setEdgeFlags(e, 0);
      const v = splitEdge(m, e, 0.5), es = [...m.vEdges(v)];
      m.setEdgeFlags(es[0], fa); m.setEdgeFlags(es[1], fb);
      return m.edgeFlags[dissolveVertex(m, v)];
    };
    eq(run(F_SEAM, 0) & F_SEAM, F_SEAM, "溶解二度点：接缝有一条就留（断一截那一片就切不开）");
    eq(run(F_SHARP, 0) & F_SHARP, 0, "手标照旧两条都有才留");
    eq(run(F_HIDDEN, 0) & F_HIDDEN, 0, "溶解二度点：一段藏一段看得见 = 并出来看得见");
    eq(run(F_HIDDEN, F_HIDDEN) & F_HIDDEN, F_HIDDEN, "两段都藏 = 还藏着");
  });
  it("合并点那张表（merge-points.ts EDGE_FLAG_RULES：标记 → 规则名）和 JOIN 表一致：both ↔ defaultIfMixed、either / 结构位 ↔ firstNonDefault；内核的每一位都有一格", () => {
    const want = { both: "defaultIfMixed", either: "firstNonDefault", structural: "firstNonDefault" } as const;
    for (const [b, kind] of Object.entries(JOIN)) eq(EDGE_FLAG_RULES[Number(b)], want[kind], `位 ${b}：JOIN 是 ${kind}`);
    eq(Object.keys(EDGE_FLAG_RULES).sort().join(), Object.keys(JOIN).sort().join(), "两张表的位一样");
    const code = readFileSync("src/mesh/merge-points.ts", "utf8").split("export const mergeEdgeFlags")[1].split("\n};")[0];
    assert(!/F_[A-Z]+/.test(code), "合并的代码只按规则名办，不认识哪一位");
    eq(mergeEdgeFlags([F_HIDDEN, 0]), 0); eq(mergeEdgeFlags([F_HIDDEN, F_HIDDEN | F_SEAM]), F_HIDDEN | F_SEAM); eq(mergeEdgeFlags([F_SEAM, 0, 0]), F_SEAM);
  });
  it("接缝跟着走：挤出的帽带、劈边两半带、细分两半带、环切被切的两半带、倒角时挨着的边换成新边带上", () => {
    { // 挤出：顶面外圈标接缝 → 帽那圈带、原来的边界留着
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const top = topOf(m), outer = ringEdges(m, top);
      for (const e of outer) m.setEdgeFlags(e, F_SEAM);
      extrudeFaces(m, [top]);
      for (const e of ringEdges(m, top)) eq(m.edgeFlags[e] & F_SEAM, F_SEAM, "帽那圈带接缝");
      for (const e of outer) eq(m.edgeFlags[e] & F_SEAM, F_SEAM, "原来的边界留着");
      eq(m.check().join("\n"), "");
    }
    { // 劈边
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; m.setEdgeFlags(e, F_SEAM);
      const v = splitEdge(m, e, 0.3);
      eq([...m.vEdges(v)].map((x) => m.edgeFlags[x] & F_SEAM).join(","), `${F_SEAM},${F_SEAM}`);
    }
    { // 细分：标了接缝的边劈成的两半都带（两半共一个点 = 边点）；别的边没有
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      m.setEdgeFlags(m.edges()[0], F_SEAM);
      subdivide(m, 1);
      const seams = m.edges().filter((x) => m.edgeFlags[x] & F_SEAM);
      eq(seams.length, 2, "一条劈成两半");
      const ends = seams.flatMap((s) => [m.edgeA[s], m.edgeB[s]]);
      eq(new Set(ends).size, 3, "两半接在一起（共一个边点）");
    }
    { // 环切：被切的那几条边劈成两半，标了接缝的那条两半都带
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; m.setEdgeFlags(e, F_SEAM);
      loopCut(m, e, 0.5);
      eq(m.edges().filter((x) => m.edgeFlags[x] & F_SEAM).length, 2);
      eq(m.check().join("\n"), "");
    }
    { // 倒角：被倒的边本身变成倒角带（它的标记不往带上搬 = 现状，手标的棱一样；Blender 默认也不搬）；挨着它、没被倒的边换成新边时带上原来的标记（接缝也带）
      for (const segs of [1, 3]) {
        const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
        const e = m.edges()[0], a = m.edgeA[e], nb = m.vEdges(a).filter((x) => x !== e);
        for (const x of nb) m.setEdgeFlags(x, F_SEAM | F_SHARP);
        const far = new Set(nb.map((x) => (m.edgeA[x] === a ? m.edgeB[x] : m.edgeA[x])));
        bevelEdges(m, [e], 0.1, segs);
        const seams = m.edges().filter((x) => m.edgeFlags[x] & F_SEAM);
        eq(seams.length, 2, `挨着的两条换成新边以后还是接缝（${segs} 段）`);
        for (const s of seams) { eq(m.edgeFlags[s] & (F_SEAM | F_SHARP), F_SEAM | F_SHARP, "棱和接缝一起走"); assert(far.has(m.edgeA[s]) || far.has(m.edgeB[s]), "是挨着的那两条"); }
        eq(m.check().join("\n"), "");
      }
    }
  });
});

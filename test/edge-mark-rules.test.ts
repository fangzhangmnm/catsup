// 边上的标记跟着拓扑操作怎么走（施工单二十二 A 起头，统筹 11-12；属性地基轮 3c 改成按来历走）。created 2026-11-12 by Claude Opus 5.5 · edited 2026-11-13 by Claude Opus 5.5（3c）
// 钉：① src/mesh/ops/ 每个文件在 OPS 表里有一行、表里没有多出来的行；
//    ② 拓扑操作不自己列位、不碰文件那个字节（标记是列，来历在建边时申报；按位手抄 = 红）；
//    ③ 边上的五个保留名每一列自己声明怎么并（棱 / 平滑 / 不画线 / 隐藏 = 都有才留，接缝 = 有一条就留），没有别的表；
//    ④ 跟着走的行为：挤出的帽、劈边、细分、环切的两半带全部列；并边按每列的 merge；倒角时挨着的边换成新边带上；
//       3c 统筹批的改动：挤出的帽带隐藏、复制（Shift+D）带标记、溶解进一条已经在的边 = 并进它（它原来的标记不被盖掉）。
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync, readdirSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string; readdirSync(p: string): string[] };
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { OPS } from "../src/mesh/edge-mark-rules.ts";
import { HIDE_EDGE, RESERVED_EDGE, SHARP_EDGE, SMOOTH, SOFT, UV_SEAM, edgeMark, setEdgeMark } from "../src/mesh/reserved-columns.ts";
import type { ColumnDef } from "../src/mesh/columns.ts";
import { addBox, duplicateGeometry } from "../src/mesh/ops/index.ts";
import { extrudeFaces } from "../src/mesh/ops/extrude.ts";
import { declareRingEdges, fromShapes, pairKey } from "../src/mesh/ops/ring-edges.ts";
import { splitEdge } from "../src/mesh/ops/split.ts";
import { dissolveVertex } from "../src/mesh/ops/join.ts";
import { subdivide } from "../src/mesh/ops/subdivide.ts";
import { loopCut } from "../src/mesh/ops/loopcut.ts";
import { bevelEdges } from "../src/mesh/ops/bevel.ts";

const P = (x: number, y: number, z: number) => ({ x, y, z });
/** 去掉注释（行注释 + 块注释）：注释里提到位名不算列位。 */
const code = (src: string): string => src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");
const ringEdges = (m: MeshKernel, f: number): number[] => { const r = m.faceVerts(f); return r.map((v, i) => m.edgeOf(v, r[(i + 1) % r.length])); };
const topOf = (m: MeshKernel, z = 1): number => m.faces().find((f) => m.faceVerts(f).every((v) => m.pt(v).z === z))!;
const marks = (m: MeshKernel, e: number): string => RESERVED_EDGE.filter((d) => edgeMark(m, e, d)).map((d) => d.id).join("+");
const mark = (m: MeshKernel, e: number, ...ds: ColumnDef[]): void => { for (const d of ds) setEdgeMark(m, e, d, true); };

describe("边标记跟着走的规矩（edge-mark-rules.ts + reserved-columns.ts）", () => {
  it("src/mesh/ops/ 每个文件在 OPS 表里有一行；表里没有多出来的行", () => {
    const files = readdirSync("src/mesh/ops").filter((f) => f.endsWith(".ts")).sort();
    eq(files.filter((f) => !OPS[f]).join(","), "", "新加的拓扑操作要在 OPS 表里写一行：它给新边申报哪种来历");
    eq(Object.keys(OPS).filter((f) => !files.includes(f)).join(","), "", "OPS 表里的文件没了");
  });
  it("src/mesh/ops/ 每个导出的函数不是在 OPS 那一行的 ops 里（改元素的，探针列测试照它跑）就是在 helpers 里（纯算、查询）；表里没有文件里没有的函数（3d）", () => {
    const missing: string[] = [], stray: string[] = [];
    for (const f of readdirSync("src/mesh/ops").filter((x) => x.endsWith(".ts"))) {
      const row = OPS[f]; if (!row) continue;
      const exported = [...code(readFileSync(`src/mesh/ops/${f}`, "utf8")).matchAll(/^export function (\w+)/gm)].map((m) => m[1]);
      const listed = [...Object.keys(row.ops), ...(row.helpers ?? [])];
      for (const fn of exported) if (!listed.includes(fn)) missing.push(`${f}:${fn}`);
      for (const fn of listed) if (!exported.includes(fn)) stray.push(`${f}:${fn}`);
    }
    eq(missing.join(", "), "", "新导出一个函数 = 在表里说它造什么（ops）或者它不造东西（helpers）");
    eq(stray.join(", "), "", "表里的函数文件里没有了");
  });
  it("三条老数组退役了：内核上没有 faceMat / faceFlags / edgeFlags；带下标读这三个名字只在文件门口（src/format/、mesh/mesh-doc.ts：那是文件载荷 MeshDoc 的字段）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    for (const n of ["faceMat", "faceFlags", "edgeFlags", "setEdgeFlags", "setFaceFlags", "setFaceMat"]) assert(!(n in k), `内核上还有 ${n}`);
    const hits: string[] = [];
    const walk = (dir: string): void => { for (const x of readdirSync(dir)) { const p = `${dir}/${x}`; if (!x.includes(".")) { try { walk(p); } catch { /* 不是文件夹 */ } continue; } if (!x.endsWith(".ts")) continue;
      if (p.startsWith("src/format/") || p === "src/mesh/mesh-doc.ts" || p.startsWith("src/paint/kernel/")) continue;
      code(readFileSync(p, "utf8")).split("\n").forEach((l, i) => { if (/\.(faceMat|faceFlags|edgeFlags)\[/.test(l)) hits.push(`${p}:${i + 1}`); }); } };
    walk("src");
    eq(hits.join(", "), "", "读面的材质 / 隐藏、边的标记走 reserved-columns.ts 的小函数");
  });
  it("拓扑操作不按位手抄标记：src/mesh/ops/ 的代码里不出现边上的标记位、也不碰文件那个字节（packEdgeByte / unpackEdgeByte 只在门口）", () => {
    const bad: string[] = [];
    for (const f of readdirSync("src/mesh/ops").filter((x) => x.endsWith(".ts"))) {
      const src = code(readFileSync(`src/mesh/ops/${f}`, "utf8"));
      for (const n of ["F_SOFT", "F_SMOOTH", "F_SHARP", "F_SEAM", "F_HIDDEN", "F_WIRE", "edgeFlags", "setEdgeFlags", "packEdgeByte", "unpackEdgeByte", "edge-bits"]) if (new RegExp(`\\b${n}\\b`).test(src)) bad.push(`${f}:${n}`);
    }
    eq(bad.join(","), "");
  });
  it("五个保留名各自声明怎么并：棱 / 平滑 / 不画线 / 隐藏 = 都有才留（defaultIfMixed），接缝 = 有一条就留（firstNonDefault）；都挂在边上、布尔、缺省 0", () => {
    eq(RESERVED_EDGE.map((d) => `${d.id}:${d.merge}`).join(","), "sharp_edge:defaultIfMixed,smooth:defaultIfMixed,soft:defaultIfMixed,uv_seam:firstNonDefault,hide_edge:defaultIfMixed");
    for (const d of RESERVED_EDGE) { eq(d.on, "edge"); eq(d.type, "bool"); eq(d.fill, 0); eq(d.continuous, false); }
  });
  it("溶解二度点：每列按自己的 merge 并（接缝有一条就留；棱、隐藏两条都有才留）", () => {
    const run = (a: ColumnDef[], b: ColumnDef[]): string => {
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const v = splitEdge(m, m.edges()[0], 0.5), es = [...m.vEdges(v)];
      mark(m, es[0], ...a); mark(m, es[1], ...b);
      return marks(m, dissolveVertex(m, v));
    };
    eq(run([UV_SEAM], []), "uv_seam", "接缝：断一截那一片就切不开");
    eq(run([SHARP_EDGE], []), "", "棱：两条都有才留");
    eq(run([SHARP_EDGE, UV_SEAM], [SHARP_EDGE]), "sharp_edge+uv_seam");
    eq(run([HIDE_EDGE], []), "", "隐藏：一段藏一段看得见 = 并出来看得见（统筹 11-13）");
    eq(run([HIDE_EDGE], [HIDE_EDGE]), "hide_edge");
  });
  it("溶解进一条已经在的边 = 并进它、它排最前（3c：以前是拿被溶的两条的标记把它原来的盖掉，它的接缝会丢）", () => {
    const m = new MeshKernel(); const [a, v, b, c, d] = [P(0, 0, 0), P(1, -0.5, 0), P(2, 0, 0), P(1, -2, 0), P(1, 1, 0)].map((p) => m.addVertex(p));
    m.addFace([a, c, b, v], FRESH); m.addFace([a, b, d], FRESH);   // a–b 已经是三角形的边；v 只连 a、b 两条
    const ab = m.edgeOf(a, b); mark(m, ab, UV_SEAM, SHARP_EDGE); mark(m, m.edgeOf(a, v), SHARP_EDGE); mark(m, m.edgeOf(v, b), SHARP_EDGE);
    const ne = dissolveVertex(m, v); eq(m.check().join("\n"), "");
    eq(ne, ab, "还是那条边"); eq(marks(m, ab), "sharp_edge+uv_seam", "它原来的接缝还在；棱三条都有 = 留");
  });
  it("接缝跟着走：挤出的帽带、劈边两半带、细分两半带、环切被切的两半带、倒角时挨着的边换成新边带上", () => {
    { // 挤出：顶面外圈标接缝 → 帽那圈带、原来的边界留着
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const top = topOf(m), outer = ringEdges(m, top);
      for (const e of outer) mark(m, e, UV_SEAM);
      extrudeFaces(m, [top]);
      for (const e of ringEdges(m, top)) assert(edgeMark(m, e, UV_SEAM), "帽那圈带接缝");
      for (const e of outer) assert(edgeMark(m, e, UV_SEAM), "原来的边界留着");
      eq(m.check().join("\n"), "");
    }
    { // 劈边
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; mark(m, e, UV_SEAM);
      const v = splitEdge(m, e, 0.3);
      eq([...m.vEdges(v)].map((x) => marks(m, x)).join(","), "uv_seam,uv_seam");
    }
    { // 细分：标了接缝的边劈成的两半都带（两半共一个点 = 边点）；别的边没有
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      mark(m, m.edges()[0], UV_SEAM);
      subdivide(m, 1);
      const seams = m.edges().filter((x) => edgeMark(m, x, UV_SEAM));
      eq(seams.length, 2, "一条劈成两半");
      eq(new Set(seams.flatMap((s) => [m.edgeA[s], m.edgeB[s]])).size, 3, "两半接在一起（共一个边点）");
    }
    { // 环切：被切的那几条边劈成两半，标了接缝的那条两半都带
      const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
      const e = m.edges()[0]; mark(m, e, UV_SEAM);
      loopCut(m, e, 0.5);
      eq(m.edges().filter((x) => edgeMark(m, x, UV_SEAM)).length, 2);
      eq(m.check().join("\n"), "");
    }
    { // 倒角：被倒的边本身变成倒角带（它的标记不往带上搬；Blender 默认也不搬）；挨着它、没被倒的边换成新边时带上原来的标记（接缝也带）
      for (const segs of [1, 3]) {
        const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
        const e = m.edges()[0], a = m.edgeA[e], nb = m.vEdges(a).filter((x) => x !== e);
        for (const x of nb) mark(m, x, UV_SEAM, SHARP_EDGE);
        const far = new Set(nb.map((x) => (m.edgeA[x] === a ? m.edgeB[x] : m.edgeA[x])));
        bevelEdges(m, [e], 0.1, segs);
        const seams = m.edges().filter((x) => edgeMark(m, x, UV_SEAM));
        eq(seams.length, 2, `挨着的两条换成新边以后还是接缝（${segs} 段）`);
        for (const s of seams) { eq(marks(m, s), "sharp_edge+uv_seam", "棱和接缝一起走"); assert(far.has(m.edgeA[s]) || far.has(m.edgeB[s]), "是挨着的那两条"); }
        eq(m.check().join("\n"), "");
      }
    }
  });
  it("3c 批过的两处：挤出的帽带隐藏（以前帽不带、倒角带）；复制（Shift+D）出来的边带标记（以前一律不带）", () => {
    const m = new MeshKernel(); addBox(m, P(0, 0, 0), P(1, 1, 1));
    const top = topOf(m), outer = ringEdges(m, top);
    mark(m, outer[0], HIDE_EDGE, SOFT, SMOOTH);
    extrudeFaces(m, [top]);
    const cap = ringEdges(m, top);
    eq(cap.filter((e) => edgeMark(m, e, HIDE_EDGE)).length, 1, "帽上对应的那条带隐藏");
    eq(cap.map((e) => marks(m, e)).filter(Boolean).join(","), "smooth+soft+hide_edge");
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const t = topOf(k), r = ringEdges(k, t); mark(k, r[0], UV_SEAM); mark(k, r[1], SHARP_EDGE);
    const d = duplicateGeometry(k, { faces: [t] }); eq(k.check().join("\n"), "");
    const copied = ringEdges(k, d.faces[0]).map((e) => marks(k, e)).filter(Boolean).sort();
    eq(copied.join(","), "sharp_edge,uv_seam", "复制出来的那张面的边带着接缝和棱");
  });
  it("复制选中的边（不带面）：复制出来的是裸线、带着原来的标记、自检干净（3c 以前留下不挂面又不是线的边）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const [e0, e1] = k.edges(); mark(k, e0, UV_SEAM, SHARP_EDGE);
    const d = duplicateGeometry(k, { edges: [e0, e1] }); eq(k.check().join("\n"), "");
    eq(d.edges.length, 2); for (const x of d.edges) { eq(k.eFaces(x).length, 0); assert(k.isWire(x), "是裸线"); }
    eq(marks(k, d.edges[0]), "sharp_edge+uv_seam");
  });
  it("按环造边碰到已经在的边、又申报了来历：值对得上 = 跳过（两张面共用一条新边）；对不上 = 抛，说清哪一对点、哪一列（3d，统筹 11-13）", () => {
    const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1));
    const src = k.edges()[0]; mark(k, src, UV_SEAM);
    const shape = k.edgeShape(src), [a, b, c] = [P(3, 0, 0), P(4, 0, 0), P(4, 1, 0)].map((p) => k.addVertex(p));
    const table = new Map([[pairKey(a, b), shape]]);
    declareRingEdges(k, [a, b, c], fromShapes(table, "copy"));   // 第一次：照抄造出来，带接缝
    assert(edgeMark(k, k.edgeOf(a, b), UV_SEAM));
    declareRingEdges(k, [b, a, c], fromShapes(table, "copy"));   // 第二张面共用这条：值一样 = 跳过
    const d = k.addVertex(P(5, 0, 0)), e = k.addVertex(P(5, 1, 0)); k.addFace([b, d, e], FRESH);   // 加面顺手造的空边 b–d（新长）
    let msg = ""; try { declareRingEdges(k, [b, d, e], fromShapes(new Map([[pairKey(b, d), shape]]), "copy")); } catch (x) { msg = String(x); }
    assert(new RegExp(`edge ${b}-${d} already exists with uv_seam = 0, but the declared origin \\(copy\\) gives 1`).test(msg), msg || "没抛");
  });
});

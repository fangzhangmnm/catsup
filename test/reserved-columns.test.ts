// 带保留名的列：面上的隐藏（hide_poly）+ 材质槽号（material_index）搬上属性表（属性地基轮第三步 3b；规程第九½节）。created 2026-11-13 by Claude Opus 5.5
// ① 守卫：核心不认这两个名字；② 有才有；③ 跟着来历走（切开 / 细分 / 内插 / 复制 / 镜像 = 照抄，并面看得见的赢、材质留第一张的，挤出 / 倒角的新面跟旁边的材质、不跟隐藏）；
// ④ 文件门口形状不变；面 / 边那两个字节里不认识的位 = 照开、不读、打开时说一句、保存时不写（3c，统筹 11-13）。
import { describe, it, eq, assert } from "./runner.mjs";
const { readFileSync } = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string };
import { MeshKernel } from "../src/mesh/mesh-kernel.ts";
import { FRESH } from "../src/mesh/columns.ts";
import { HIDE_POLY, MATERIAL_INDEX, faceHidden, faceMaterial, hiddenColumn, materialColumn, setFaceHidden, setFaceMaterial } from "../src/mesh/reserved-columns.ts";
import { addBox, bevelEdges, catmullClark, duplicateGeometry, extrudeEdges, extrudeFaces, insetFaces, joinFaces, knife, loopCut, splitFace } from "../src/mesh/ops/index.ts";
import { symmetrize } from "../src/mesh/mirror.ts";
import { FILE_FACE_HIDDEN, kernelFromMeshDoc, meshDocFromKernel } from "../src/mesh/mesh-doc.ts";
import type { Pt3 } from "../src/kernel/geom.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { formatNotesSay, lossySay } from "../src/app/format-notes.ts";
import { sceneMeshed } from "./format-scenes.ts";

const P = (x: number, y: number, z: number): Pt3 => ({ x, y, z });
const clean = (k: MeshKernel, where: string): void => { const bad = k.check(); eq(bad.length, 0, `${where}：${bad.slice(0, 3).join("；")}`); };
const box = (): MeshKernel => { const k = new MeshKernel(); addBox(k, P(0, 0, 0), P(1, 1, 1)); return k; };
const top = (k: MeshKernel): number => k.faces().find((f) => k.facePts(f).every((p) => p.z === 1))!;

describe("保留名：守卫、有才有", () => {
  it("核心（内核、列、合并点、边上的位）不 import 保留名那一层、不写这两个名字", () => {
    for (const f of ["src/mesh/mesh-kernel.ts", "src/mesh/columns.ts", "src/mesh/merge-points.ts", "src/mesh/edge-bits.ts"]) {
      const src = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'`])\/\/.*$/gm, "$1");   // 只看代码（注释里提到名字不算）
      assert(!/reserved-columns/.test(src), `${f} import 了保留名那一层`);
      assert(!/material_index|hide_poly|\bfaceMat\b|\bfaceFlags\b/.test(src), `${f} 里有保留名或老数组`);
    }
  });
  it("有才有：新的网格体没有这两列；写缺省值不建列；第一次写非缺省值才建；读没有的列 = 缺省值", () => {
    const k = box(), f = k.faces()[0];
    assert(!k.hasColumn(HIDE_POLY.id) && !k.hasColumn(MATERIAL_INDEX.id));
    setFaceHidden(k, f, false); setFaceMaterial(k, f, -1);
    assert(!k.hasColumn(HIDE_POLY.id) && !k.hasColumn(MATERIAL_INDEX.id), "写缺省值不建列");
    eq(faceHidden(k, f), false); eq(faceMaterial(k, f), -1); eq(hiddenColumn(k), null); eq(materialColumn(k), null);
    setFaceHidden(k, f, true); setFaceMaterial(k, f, 2);
    assert(faceHidden(k, f)); eq(faceMaterial(k, f), 2);
    eq(k.faces().filter((g) => faceHidden(k, g)).length, 1, "别的面还是缺省值"); eq(k.faces().filter((g) => faceMaterial(k, g) === -1).length, 5);
    clean(k, "写值");
  });
});

describe("保留名跟着来历走", () => {
  /** 盒子：顶面藏着、材质 3；别的面材质 1。 */
  const marked = (): MeshKernel => { const k = box(); for (const f of k.faces()) setFaceMaterial(k, f, 1); setFaceHidden(k, top(k), true); setFaceMaterial(k, top(k), 3); return k; };
  it("藏着的面切开：两半都藏着、材质照抄（以前新的一半露出来）——劈面 / 刀 / 环切 / 细分 / 内插", () => {
    const cases: [string, (k: MeshKernel, t: number) => void][] = [
      ["劈面", (k, t) => { const r = k.faceVerts(t); splitFace(k, t, r[0], r[2]); }],
      ["刀", (k, t) => { const r = k.faceVerts(t); knife(k, t, [{ v: r[0] }, { v: r[2] }]); }],
      ["环切", (k, t) => { const e = k.fEdges(t)[0]; loopCut(k, e, 0.5); }],
      ["内插", (k, t) => { insetFaces(k, [t], 0.1); }],
    ];
    for (const [name, op] of cases) {
      const k = marked(), t = top(k), before = k.faces().length;
      op(k, t); clean(k, name);
      const onTop = k.faces().filter((f) => k.facePts(f).every((p) => Math.abs(p.z - 1) < 1e-9));
      assert(onTop.length >= 2 && k.faces().length > before, `${name}：顶面被切开了`);
      for (const f of onTop) { assert(faceHidden(k, f), `${name}：顶上的面 ${f} 藏着`); eq(faceMaterial(k, f), 3, `${name}：材质照抄`); }
    }
  });
  it("细分：藏着的那张面细分成的 4 张都藏着、材质照抄（细分会挪点，按藏着的面数）", () => {
    const k = marked(); catmullClark(k); clean(k, "细分");
    const hid = k.faces().filter((f) => faceHidden(k, f));
    eq(hid.length, 4); for (const f of hid) eq(faceMaterial(k, f), 3);
    eq(k.faces().filter((f) => faceMaterial(k, f) === 1).length, 20, "别的 5 张面细分成 20 张、材质 1");
  });
  it("复制（Shift+D）、镜像：新面带着隐藏和材质", () => {
    const k = marked(), t = top(k), d = duplicateGeometry(k, { faces: [t] });
    eq(d.faces.length, 1); assert(faceHidden(k, d.faces[0])); eq(faceMaterial(k, d.faces[0]), 3); clean(k, "复制");
    const m = new MeshKernel(); addBox(m, P(-1, 0, 0), P(1, 1, 1));
    const plus = m.faces().find((f) => m.facePts(f).every((p) => p.x === 1))!; setFaceHidden(m, plus, true); setFaceMaterial(m, plus, 4);
    symmetrize(m, 0, 1); clean(m, "镜像");
    const minus = m.faces().find((f) => m.facePts(f).every((p) => p.x === -1))!;
    assert(faceHidden(m, minus), "镜过去的那张也藏着"); eq(faceMaterial(m, minus), 4);
  });
  it("两张面并成一张：一藏一不藏 = 看得见（以前留第一张的）；都藏 = 藏；材质留第一张的", () => {
    for (const [ha, hb, want] of [[true, false, false], [false, true, false], [true, true, true]] as const) {
      const k = new MeshKernel(); const v = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0), P(2, 0, 0), P(2, 1, 0)].map((p) => k.addVertex(p));
      const a = k.addFace([v[0], v[1], v[2], v[3]], FRESH), b = k.addFace([v[1], v[4], v[5], v[2]], FRESH);
      setFaceHidden(k, a, ha); setFaceHidden(k, b, hb); setFaceMaterial(k, a, 5); setFaceMaterial(k, b, 6);
      const keep = joinFaces(k, k.edgeOf(v[1], v[2])); clean(k, "并面");
      eq(faceHidden(k, keep), want, `${ha} + ${hb}`); eq(faceMaterial(k, keep), keep === a ? 5 : 6, "材质 = 留下的那张（排最前）的");
    }
  });
  it("挤出面：侧面材质跟被挤的那张面、不跟隐藏；带内缩的侧面是原面的一块（隐藏、材质都照抄）；挤出边：墙跟那条边唯一挨着的面", () => {
    const k = marked(), t = top(k), { sides } = extrudeFaces(k, [t]); clean(k, "挤出");
    for (const f of sides) { eq(faceMaterial(k, f), 3, "侧面材质跟被挤的面"); eq(faceHidden(k, f), false, "侧面不跟隐藏（新长的）"); }
    const k2 = marked(), t2 = top(k2), inset = new Map(k2.faceVerts(t2).map((v) => [v, { ...k2.pt(v), x: k2.pt(v).x * 0.8 + 0.1, y: k2.pt(v).y * 0.8 + 0.1 }]));
    const r2 = extrudeFaces(k2, [t2], true, inset); clean(k2, "内缩挤出");
    for (const f of r2.sides) { eq(faceMaterial(k2, f), 3); assert(faceHidden(k2, f), "带内缩的侧面 = 原面的一块：藏着"); }
    const k3 = new MeshKernel(); const w = [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0)].map((p) => k3.addVertex(p)); const f3 = k3.addFace(w, FRESH); setFaceMaterial(k3, f3, 7);
    const r3 = extrudeEdges(k3, [k3.edgeOf(w[0], w[1])]); clean(k3, "挤出边");
    eq(faceMaterial(k3, r3.sides[0]), 7);
  });
  it("倒角：倒角带跟原来挨着的面的材质", () => {
    const k = marked(), e = k.fEdges(top(k))[0], r = bevelEdges(k, [e], 0.1, 2); clean(k, "倒角");
    const fresh = r.faces ?? [];
    assert(fresh.length > 0, "倒角长出了面");
    for (const f of fresh) assert([1, 3].includes(faceMaterial(k, f)), `倒角带的材质 ${faceMaterial(k, f)} 跟挨着的面`);
  });
});

describe("文件门口：形状不变", () => {
  it("隐藏、材质存进面的那个字节、那个整数，读回来一样；没有非缺省值 = 读回来也没有这两列", () => {
    const k = box(); setFaceHidden(k, k.faces()[2], true); setFaceMaterial(k, k.faces()[4], 2);
    const d = meshDocFromKernel(k);
    eq(Array.from(d.faceFlags).join(), [0, 0, FILE_FACE_HIDDEN, 0, 0, 0].join()); eq(Array.from(d.faceMat).join(), "-1,-1,-1,-1,2,-1");
    eq(d.columns, undefined, "这两列不当通用的列写");
    const back = kernelFromMeshDoc(d);
    eq(back.faces().map((f) => (faceHidden(back, f) ? 1 : 0)).join(), "0,0,1,0,0,0"); eq(back.faces().map((f) => faceMaterial(back, f)).join(), "-1,-1,-1,-1,2,-1");
    const plain = kernelFromMeshDoc(meshDocFromKernel(box()));
    assert(!plain.hasColumn(HIDE_POLY.id) && !plain.hasColumn(MATERIAL_INDEX.id), "全是缺省值 = 不建列");
  });
  it("面 / 边那两个字节里有不认识的位 = 照开（不拒开）：不读、打开时说一句带个数、保存时不写；真坏了（环越界）照旧抛", () => {
    const md = documentFromScene(sceneMeshed(), "t").definitions.find((d) => d.mesh)!.mesh!;
    // 不认识的位只会从文件的字节里来（内存里没有地方放它们）：写好的文件里直接改那两个字节
    const g = decodeGlb(writeCatsup(documentFromScene(sceneMeshed(), "t"))) as unknown as { json: { bufferViews: { byteOffset?: number }[]; extensions: { CATSUP_definitions: { list: { kind?: string; mesh?: Record<string, { bufferView: number }> }[] } } }; bin: Uint8Array };
    const item = g.json.extensions.CATSUP_definitions.list.find((d) => d.kind === "mesh")!.mesh!, at = (k: string, i: number): number => (g.json.bufferViews[item[k].bufferView].byteOffset ?? 0) + i;
    g.bin[at("faceFlags", 1)] |= 2; g.bin[at("faceFlags", 3)] |= 128;   // 两张面带着更新版的位（第 1 张本来就藏着：藏着那一位照读）
    g.bin[at("edgeFlags", 0)] |= 64;                                    // 一条边带着更新版的位（它本来是软 + 平滑：那两位照读）
    const back = readCatsup(encodeGlb(g.json as never, g.bin));
    eq(JSON.stringify(back.readNotes?.unknownMarks), JSON.stringify({ faces: 2, edges: 1 }), "记一笔：几张面、几条边");
    const said = formatNotesSay(back.readNotes!).join("\n");
    assert(/2 张面、1 条边带着这一版不认识的标记/.test(said) && /保存之后不再保留/.test(said), said);
    eq(lossySay(back.readNotes).length, 1, "算会丢的：第一次存盘之前要人点头");
    const s = sceneFromDocument(back), def = [...s.defs.values()].find((d) => d.body.kind === "mesh")!, k = (def.body as { kernel: MeshKernel }).kernel;
    eq(k.faces().filter((f) => faceHidden(k, f)).length, 1, "认识的那一位（藏着）照读");
    const again = documentFromScene(s, "t").definitions.find((d) => d.mesh)!.mesh!;
    eq(Array.from(again.faceFlags).filter((b) => b & ~FILE_FACE_HIDDEN).length, 0, "存回去：面上没有不认识的位");
    eq(Array.from(again.edgeFlags).filter((b) => b & ~63).length, 0, "存回去：边上没有不认识的位");
    eq(Array.from(again.edgeFlags).join(), Array.from(md.edgeFlags).map((b) => b & 63).join(), "认识的位原样");
    const d0 = meshDocFromKernel(box()), bad = Int32Array.from(d0.loopVert); bad[0] = 99;
    let msg = ""; try { kernelFromMeshDoc({ ...d0, loopVert: bad }); } catch (e) { msg = String(e); }
    assert(/references vertex 99/.test(msg), msg || "环越界没抛");
  });
});

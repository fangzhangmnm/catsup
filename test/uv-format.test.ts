// 贴图坐标进文件（贴图主线 1-2½；契约 ai-docs/20261110-painting-data-contract.md 第五、六节 + 统筹 11-11 定的规矩）。created 2026-11-11 by Claude Opus 5.5
// ① 往返：带贴图坐标的网格体盖 CATSUP_mesh 2.0、角上的数逐字回来（场景指纹含内核的列）、再存逐字节不变；不带的照旧 1.2。
// ② 拍子：带贴图坐标的网格体盖的拍子比本版新（3.x）= 拒开（版本的事）；2.x 里比本版新的 minor = 能开、提示一次。
// ③ 贴图坐标是模型的附属数据：坏了模型照开，坏的部分按「没有」处理、记进 readNotes、打开之后说出来（再存盘会去掉坏的部分）；读进来自检全过。每一种一个现造的坏文件。
// ④ 画这一层的收口：别的定义借用单品的画 → 那一格当没有材质；layout 指不到 → 孤儿；走画的面没有位置 → 记一笔。
// ⑤ 比内容（粘贴对账）跟着面转：同一个模型、面的先后和环的起点换了，判一样；角上的数改一个，判不一样。
import { describe, it, eq, assert } from "./runner.mjs";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { FormatTooNewError, type FormatReadNotes } from "../src/format/migrate/index.ts";
import { canonDefinition } from "../src/format/entry-canon.ts";
import { meshBodyIssues } from "../src/scene/paint.ts";
import { formatNotesSay } from "../src/app/format-notes.ts";
import type { Scene } from "../src/scene/scene.ts";
import type { CatsupDocument, MeshDoc } from "../src/format/document.ts";
import { sceneUvPainted, sceneUvTwoSets, sceneMeshed, sceneFingerprint } from "./format-scenes.ts";

type AnyJson = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
type Glb = { json: AnyJson; bin: Uint8Array };
const glbOf = (s: Scene): Glb => decodeGlb(writeCatsup(documentFromScene(s, "t"))) as unknown as Glb;
const meshItems = (g: Glb): AnyJson[] => g.json.extensions.CATSUP_definitions.list.filter((d: AnyJson) => d.kind === "mesh");
const meshItem = (g: Glb): AnyJson => meshItems(g)[0].mesh;   // 网格体的载荷（拍子、uvSets 在这里）
const clone = (g: Glb): Glb => ({ json: structuredClone(g.json), bin: g.bin.slice() });
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
/** 改 loopUv 里的数：bufferView → BIN 里那一段（拷一份 BIN 再改）。 */
function patchLoopUv(g: Glb, set: AnyJson, edit: (f: Float32Array) => void): void {
  const v = g.json.bufferViews[set.loopUv.bufferView], bin = g.bin.slice(), f = new Float32Array(v.byteLength / 4);
  const dv = new DataView(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0), v.byteLength);
  for (let i = 0; i < f.length; i++) f[i] = dv.getFloat32(4 * i, true);
  edit(f);
  for (let i = 0; i < f.length; i++) dv.setFloat32(4 * i, f[i], true);
  g.bin = bin;
}
/** 模型本身（去掉贴图坐标）：每个定义的几何、槽表、实例；网格体内核里角上的列不算。 */
function modelOnly(doc: CatsupDocument): string {
  const strip = (m: MeshDoc | undefined): unknown => { if (!m) return null; const { uvSets: _u, ...rest } = m; void _u; return rest; };
  const ta = (_k: string, v: unknown): unknown => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v);
  return JSON.stringify(doc.definitions.map((d) => ({ guid: d.guid, kind: d.kind, mesh: strip(d.mesh), brep: d.brep, groups: d.groups, instances: d.instances })), ta);
}
const issuesOf = (s: Scene): string[] => [...s.defs.values()].flatMap((d) => meshBodyIssues(s, d.id));
/** 读坏文件：打得开；模型和好文件一个字不差；自检全过；返回 notes + 读回来的场景。 */
function readBad(good: Glb, bad: Glb): { notes: FormatReadNotes; s: Scene; doc: CatsupDocument } {
  const doc = readCatsup(encodeGlb(bad.json, bad.bin)), ref = readCatsup(encodeGlb(good.json, good.bin));
  eq(modelOnly(doc), modelOnly(ref), "模型本身一个字不差");
  const s = sceneFromDocument(doc);
  eq(issuesOf(s).join("；"), "", "读进来自检全过");
  assert(doc.readNotes, "有 readNotes");
  return { notes: doc.readNotes!, s, doc };
}
const uvRows = (s: Scene): { name: string; faces: number }[] => [...s.defs.values()].flatMap((d) => (d.body.kind === "mesh" ? [...d.body.uvSets.values()].map((u) => ({ name: u.name, faces: d.body.kind === "mesh" ? d.body.kernel.faces().filter((f) => (d.body as { kernel: { cornerValues(f: number, g: string): unknown } }).kernel.cornerValues(f, u.guid)).length : 0 })) : []));

describe("贴图坐标进文件：往返和拍子（1-2½）", () => {
  it("① 带贴图坐标：mesh 项盖 2.0、带 uvSets（guid / 名字 / 宽 / 高 / 密度 / loopUv）；读回来场景指纹相等（含角上的数）、自检过、再存逐字节不变", () => {
    for (const mk of [sceneUvPainted, sceneUvTwoSets]) {
      const s = mk(), bytes = writeCatsup(documentFromScene(s, "t")), g = decodeGlb(bytes) as unknown as Glb, md = meshItem(g);
      eq(md.version, 2); assert(!("minor" in md), "2.0 的 minor 是 0、不写");
      const sets = md.uvSets as AnyJson[];
      eq(sets.length, mk === sceneUvTwoSets ? 2 : 1);
      for (const u of sets) { assert(typeof u.guid === "string" && typeof u.name === "string" && Number.isInteger(u.width) && Number.isInteger(u.height) && u.pxPerM > 0, "一套的几样"); eq(u.loopUv.count, md.loopVert.count, "每个角一对"); }
      const back = sceneFromDocument(readCatsup(bytes));
      eq(sceneFingerprint(back), sceneFingerprint(s), "场景指纹（网格体内核的快照里有角上的列）");
      eq(issuesOf(back).join("；"), "", "自检");
      assert(same(writeCatsup(documentFromScene(back, "t")), bytes), "再存逐字节不变");
    }
  });
  it("① 两套里没有贴图引用的那一套（孤儿）读得进、写得回：面上的数还在", () => {
    const back = sceneFromDocument(readCatsup(writeCatsup(documentFromScene(sceneUvTwoSets(), "t"))));
    eq(JSON.stringify(uvRows(back)), JSON.stringify([{ name: "UV", faces: 3 }, { name: "UV 2", faces: 9 }]));
  });
  it("① 不带贴图坐标的网格体照旧盖 1.2（字节和以前一样：和 2.0 之前的写法同一个拍子、没有 uvSets 键）", () => {
    const md = meshItem(glbOf(sceneMeshed()));
    eq(md.version, 1); eq(md.minor, 2); assert(!("uvSets" in md), "没有 uvSets 键");
  });
  it("② 带贴图坐标的网格体盖 3.x = 拒开（FormatTooNewError，报 CATSUP_mesh）；2.9 = 能开、提示一次", () => {
    const g = glbOf(sceneUvPainted()); meshItem(g).version = 3;
    let threw: unknown = null; try { readCatsup(encodeGlb(g.json, g.bin)); } catch (e) { threw = e; }
    assert(threw instanceof FormatTooNewError && threw.extension === "CATSUP_mesh", `该拒开：${String(threw)}`);
    const g2 = glbOf(sceneUvPainted()); meshItem(g2).minor = 9;
    const doc = readCatsup(encodeGlb(g2.json, g2.bin));
    assert(doc.readNotes?.newerMinor.some((n) => n.ext === "CATSUP_mesh"), "minor 新 → 提示一次");
  });
});

describe("贴图坐标是模型的附属数据：坏了模型照开、坏的部分按没有处理（1-2½，统筹 11-11）", () => {
  const base = glbOf(sceneUvTwoSets()), good = (): Glb => clone(base);   // 好文件只造一次（身份号一样），坏文件从它拷一份再改
  const dropped = (n: FormatReadNotes, why: string): { faces: number; uvSet: { name: string } | null }[] => (n.uvDropped ?? []).filter((x) => x.why === why);
  it("一张面有的角是数、有的角是 NaN → 这张面在这一套上整面没有位置；别的面不受影响", () => {
    const g0 = good(), g = good(), u = meshItem(g).uvSets[0];
    patchLoopUv(g, u, (f) => { const k = f.findIndex((v) => !Number.isNaN(v)); f[k] = NaN; });   // 第一张有位置的面的第一个角
    const { notes, s } = readBad(g0, g);
    eq(JSON.stringify(dropped(notes, "partial-corners").map((x) => [x.uvSet?.name, x.faces])), JSON.stringify([["UV", 1]]));
    eq(JSON.stringify(uvRows(s)), JSON.stringify([{ name: "UV", faces: 2 }, { name: "UV 2", faces: 9 }]));
  });
  it("角上的数是无穷大 / 落在画布外面 → 那张面整面没有位置（不夹回画布里）", () => {
    for (const [why, v] of [["non-finite-corners", Infinity], ["off-canvas-corners", 5000], ["off-canvas-corners", -3]] as const) {
      const g0 = good(), g = good(), u = meshItem(g).uvSets[1];
      patchLoopUv(g, u, (f) => { const k = f.findIndex((x) => !Number.isNaN(x)); f[k] = v; });
      const { notes, s } = readBad(g0, g);
      eq(JSON.stringify(dropped(notes, why).map((x) => [x.uvSet?.name, x.faces])), JSON.stringify([["UV 2", 1]]), `${why} ${v}`);
      eq(JSON.stringify(uvRows(s)), JSON.stringify([{ name: "UV", faces: 3 }, { name: "UV 2", faces: 8 }]));
    }
  });
  it("一套的数不对（宽高不是正整数 / 密度不是正数 / 身份号坏了 / 角上的数找不到 / 个数和模型对不上）→ 这一整套不认", () => {
    const cases: [string, (u: AnyJson, md: AnyJson) => void][] = [
      ["bad-size", (u) => { u.width = 0; }], ["bad-size", (u) => { u.height = 2.5; }], ["bad-density", (u) => { u.pxPerM = -1; }], ["bad-density", (u) => { u.pxPerM = null; }],
      ["bad-guid", (u) => { delete u.guid; }], ["bad-guid", (u) => { u.guid = 42; }], ["no-loopUv", (u) => { delete u.loopUv; }], ["no-loopUv", (u) => { u.loopUv = { bufferView: 9999 }; }],
      ["bad-length", (u, md) => { u.loopUv = { bufferView: md.faceStart.bufferView }; }],
    ];
    for (const [why, edit] of cases) {
      const g0 = good(), g = good(), md = meshItem(g); edit(md.uvSets[1], md);
      const { notes, s } = readBad(g0, g);
      eq(dropped(notes, why).length, 1, why);
      eq(JSON.stringify(uvRows(s)), JSON.stringify([{ name: "UV", faces: 3 }]), `${why}：剩下那一套照常`);
    }
  });
  it("整个 uvSets 不是列表 / 列表里一项不是对象 → 不认（模型照开）", () => {
    const g0 = good(), g = good(); meshItem(g).uvSets = { oops: 1 };
    eq(dropped(readBad(g0, g).notes, "not-a-list").length, 1);
    const g2 = good(); meshItem(g2).uvSets.push(7);
    const r = readBad(g0, g2); eq(dropped(r.notes, "not-an-object").length, 1); eq(uvRows(r.s).length, 2, "另两套照常");
  });
  it("同一个网格体里几套同一个身份号 → 这几套都不认（不挑第一个）；画指着的那一套没了，那张贴图当孤儿留着", () => {
    const g0 = good(), g = good(), md = meshItem(g); md.uvSets[1].guid = md.uvSets[0].guid;
    const { notes, s } = readBad(g0, g);
    eq(dropped(notes, "duplicate-guid").length, 2, "两套都记");
    eq(uvRows(s).length, 0);
    eq(notes.orphanPaintTextures, 1, "画铺的那一套没了 = 孤儿");
  });
  it("不同网格体之间重号不算错", () => {
    const s0 = sceneUvPainted(), d = [...s0.defs.values()].find((x) => x.body.kind === "mesh")!, g = glbOf(s0);   // 加一个一模一样的定义（同一套身份号）
    const list = g.json.extensions.CATSUP_definitions.list as AnyJson[], twin = JSON.parse(JSON.stringify(list.find((x) => x.guid === d.guid)));
    twin.guid = "00000000-0000-4000-8000-0000000000aa"; twin.instances = []; twin.name = "双胞胎"; list.push(twin);
    const doc = readCatsup(encodeGlb(g.json, g.bin));
    assert(!doc.readNotes?.uvDropped, "没有记");
    eq(doc.definitions.filter((x) => x.mesh?.uvSets?.length).length, 2);
  });
  it("打开之后说出来：哪个物件、哪一套、几张面、为什么，并说明再存盘会去掉坏的部分", () => {
    const g0 = good(), g = good(); patchLoopUv(g, meshItem(g).uvSets[0], (f) => { const k = f.findIndex((v) => !Number.isNaN(v)); f[k] = NaN; });
    const lines = formatNotesSay(readBad(g0, g).notes).join("\n");
    assert(/「画盒」/.test(lines) && /「UV」/.test(lines) && /1 张面/.test(lines) && /一半有坐标一半没有/.test(lines) && /再存盘会把这些坏的部分去掉/.test(lines), lines);
  });
  it("再存盘会去掉坏的部分：坏文件读进来再存，再读没有「坏的贴图坐标」那一笔了；那张面本来走画，现在照规矩说「走画的面没有位置」（编辑时收尾会给它补上）", () => {
    const g = good(); patchLoopUv(g, meshItem(g).uvSets[0], (f) => { const k = f.findIndex((v) => !Number.isNaN(v)); f[k] = Infinity; });
    const s = sceneFromDocument(readCatsup(encodeGlb(g.json, g.bin))), again = readCatsup(writeCatsup(documentFromScene(s, "t"))).readNotes;
    assert(!again?.uvDropped, "坏数据那一笔没了");
    eq(JSON.stringify((again?.paintUnplaced ?? []).map((x) => [x.uvSet.name, x.faces])), JSON.stringify([["UV", 1]]), "换成「走画的面没有位置」");
  });
});

describe("画这一层的读入收口（1-2½，契约第五节）", () => {
  it("接了单品的画的材质被别的定义的槽表引用 → 那一格当没有材质、记一笔；模型几何不变", () => {
    const g = glbOf(sceneUvPainted()), list = g.json.extensions.CATSUP_definitions.list as AnyJson[], mesh = list.find((x) => x.kind === "mesh")!;
    const root = list.find((x) => x.guid === g.json.extensions.CATSUP_definitions.root)!;
    root.materialSlots = [...(root.materialSlots ?? []), mesh.materialSlots.find((x: unknown) => typeof x === "string")];   // 根借用了那个画的材质
    const doc = readCatsup(encodeGlb(g.json, g.bin));
    eq(doc.readNotes?.foreignPaintSlots, 1);
    eq(doc.definitions.find((x) => x.guid === root.guid)!.materialSlots.at(-1), null, "那一格当没有材质");
    assert(/别的物件用了只属于某一个物件的画/.test(formatNotesSay(doc.readNotes!).join("\n")), "说出来");
  });
  it("贴图的 layout 指向不存在的那一套 → 这张贴图当孤儿留着（不拒开、行还在）、记一笔", () => {
    const g = glbOf(sceneUvPainted()), md = meshItem(g); md.uvSets[0].guid = "00000000-0000-4000-8000-0000000000bb";
    const doc = readCatsup(encodeGlb(g.json, g.bin));
    eq(doc.readNotes?.orphanPaintTextures, 1);
    eq(doc.textures.filter((t) => t.content.kind === "layered").length, 1, "那一行还在");
  });
  it("走画的面在那一套上没有位置 → 照底色显示、记一笔（哪个定义、哪一套、几张面）；不当坏数据去掉", () => {
    const g = glbOf(sceneUvPainted()); patchLoopUv(g, meshItem(g).uvSets[0], (f) => f.fill(NaN, 0, 16));   // 前两张四边形（每张 4 个角 × 2 个数）整面没有位置
    const doc = readCatsup(encodeGlb(g.json, g.bin));
    eq(JSON.stringify((doc.readNotes?.paintUnplaced ?? []).map((x) => [x.def.name, x.uvSet.name, x.faces])), JSON.stringify([["画盒", "UV", 2]]));
    assert(!doc.readNotes?.uvDropped, "不是坏数据");
    eq(issuesOf(sceneFromDocument(doc)).join("；"), "", "自检");
  });
});

describe("比内容跟着面转（粘贴对账；1-2½）", () => {
  it("面的先后和环的起点换了 → 判一样；改一个角上的数 → 判不一样", () => {
    const doc = documentFromScene(sceneUvTwoSets(), "t"), d = doc.definitions.find((x) => x.kind === "mesh")!, m = d.mesh!;
    const canon = (x: typeof d): string => JSON.stringify(canonDefinition(x, () => undefined), (_k, v) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v));
    // 倒着排面，每张面的环从第二个角起
    const nF = m.faceStart.length, order = [...Array(nF).keys()].reverse(), loop: number[] = [], start: number[] = [], len: number[] = [], uvs = m.uvSets!.map(() => [] as number[]);
    for (const f of order) {
      const s = m.faceStart[f], n = m.faceLen[f]; start.push(loop.length); len.push(n);
      for (let k = 0; k < n; k++) { const c = s + ((k + 1) % n); loop.push(m.loopVert[c]); m.uvSets!.forEach((u, j) => uvs[j].push(u.loopUv[2 * c], u.loopUv[2 * c + 1])); }
    }
    const turned = { ...d, mesh: { ...m, faceStart: Int32Array.from(start), faceLen: Int32Array.from(len), loopVert: Int32Array.from(loop), faceMat: Int32Array.from(order.map((f) => m.faceMat[f])), faceFlags: Uint8Array.from(order.map((f) => m.faceFlags[f])), uvSets: m.uvSets!.map((u, j) => ({ ...u, loopUv: Float32Array.from(uvs[j]) })).reverse() } };
    eq(canon(turned), canon(d), "转过、排过、套的先后换过 = 一样");
    const nudged = { ...d, mesh: { ...m, uvSets: m.uvSets!.map((u, j) => (j === 0 ? { ...u, loopUv: (() => { const a = u.loopUv.slice(); const k = a.findIndex((v) => !Number.isNaN(v)); a[k] += 1; return a; })() } : u)) } };
    assert(canon(nudged) !== canon(d), "改一个角上的数 = 不一样");
  });
});

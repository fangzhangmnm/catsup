// 贴图坐标进文件（贴图主线 1-2½ 起；2026-11-13 施工单十八第 1 刀整份重写：排法表 = 顶层扩展 CATSUP_uvsets 1.0，网格体上是角上的列 = CATSUP_mesh 3.0 columns，
// 画的 layout = { uvSet } = CATSUP_textures 1.3；不做迁移）。created 2026-11-11 / rewritten 2026-11-13 by Claude Opus 5.5
// ① 往返和拍子：三节的形状（统筹要看的第 ① 处）、uv 列存 1/1024 格的整数、不带列照旧 1.2、fit / freed / 不认识的键原样带回、太新拒开。
// ② 附属数据坏了模型照开：坏的部分按「没有」处理、记进 readNotes、打开之后说出来；读进来自检全过。
// ③ 旧存法的画（第五节）：老目录里冻着的带画样本读得开、模型不变、画按底色、说两句（几张旧存法的画按底色；几个物件上的旧位置保存之后不再保留，只有后一句算会丢）、存了再开稳定且只剩前一句、新写的文件里没有老写法。
// ④ 比内容（粘贴对账）跟着面转。
import { describe, it, eq, assert } from "./runner.mjs";
import { writeCatsup, readCatsup, documentFromScene, sceneFromDocument } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { FormatTooNewError, type FormatReadNotes } from "../src/format/migrate/index.ts";
import { canonDefinition } from "../src/format/entry-canon.ts";
import { meshBodyIssues } from "../src/scene/paint.ts";
import { uvSetAutoPlaces, type Scene } from "../src/scene/scene.ts";
import { paintIn, type CatsupDocument, type MeshDoc } from "../src/format/document.ts";
import { formatNotesSay, lossySay } from "../src/app/format-notes.ts";
import { UV_NONE } from "../src/format/mesh-payload.ts";
import { sceneUvPainted, sceneUvTwoSets, sceneMeshed, sceneFingerprint, sceneUvDensityFit } from "./format-scenes.ts";
import { listCorpusDirs, listFixtures, readFixture } from "./fixtures/format/fixtures.mjs";

type AnyJson = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
type Glb = { json: AnyJson; bin: Uint8Array };
const glbOf = (s: Scene): Glb => decodeGlb(writeCatsup(documentFromScene(s, "t"))) as unknown as Glb;
const meshItem = (g: Glb): AnyJson => g.json.extensions.CATSUP_definitions.list.find((d: AnyJson) => d.kind === "mesh").mesh;
const clone = (g: Glb): Glb => ({ json: structuredClone(g.json), bin: g.bin.slice() });
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((x, i) => x === b[i]);
const enc = (g: Glb): Uint8Array => encodeGlb(g.json, g.bin);
/** uv 列的整数：bufferView → BIN 里那一段（拷一份 BIN 再改）。 */
function patchColumn(g: Glb, col: AnyJson, edit: (a: Int32Array) => void): void {
  const v = g.json.bufferViews[col.data.bufferView], bin = g.bin.slice(), dv = new DataView(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0), v.byteLength), a = new Int32Array(v.byteLength / 4);
  for (let i = 0; i < a.length; i++) a[i] = dv.getInt32(4 * i, true);
  edit(a);
  for (let i = 0; i < a.length; i++) dv.setInt32(4 * i, a[i], true);
  g.bin = bin;
}
/** 模型本身（去掉角上的列）：每个定义的几何、槽表、实例。 */
function modelOnly(doc: CatsupDocument): string {
  const strip = (m: MeshDoc | undefined): unknown => { if (!m) return null; const { columns: _c, ...rest } = m; void _c; return rest; };
  const ta = (_k: string, v: unknown): unknown => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v);
  return JSON.stringify(doc.definitions.map((d) => ({ guid: d.guid, kind: d.kind, mesh: strip(d.mesh), brep: d.brep, groups: d.groups, instances: d.instances })), ta);
}
const issuesOf = (s: Scene): string[] => [...s.defs.values()].flatMap((d) => meshBodyIssues(s, d.id));
/** 读坏文件：打得开；模型和好文件一个字不差；自检全过；返回 notes + 读回来的场景。 */
function readBad(good: Glb, bad: Glb): { notes: FormatReadNotes; s: Scene; doc: CatsupDocument } {
  const doc = readCatsup(enc(bad)), ref = readCatsup(enc(good));
  eq(modelOnly(doc), modelOnly(ref), "模型本身一个字不差");
  const s = sceneFromDocument(doc);
  eq(issuesOf(s).join("；"), "", "读进来自检全过");
  assert(doc.readNotes, "有 readNotes");
  return { notes: doc.readNotes!, s, doc };
}
/** 场景里每张面在每条 uv 列上有没有位置：定义名 → 有位置的面数。 */
const placed = (s: Scene): number => { let n = 0; for (const d of s.defs.values()) if (d.body.kind === "mesh") { const k = d.body.kernel; for (const c of k.columnDefs()) if (c.kind === "uv") n += k.faces().filter((f) => k.cornerValues(f, c.guid)).length; } return n; };

describe("贴图坐标进文件：形状、往返和拍子（施工单十八第 1 刀）", () => {
  it("① 带画：网格体盖 3.0、columns（guid / kind uv / arity 2 / 角数）、没有 uvSets 键；顶层 CATSUP_uvsets 一行一套（fit 写明）；贴图表 1.3、layout = { uvSet }；读回来指纹相等、自检过、再存逐字节不变", () => {
    for (const mk of [sceneUvPainted, sceneUvTwoSets]) {
      const s = mk(), bytes = writeCatsup(documentFromScene(s, "t")), g = decodeGlb(bytes) as unknown as Glb, md = meshItem(g);
      eq(md.version, 3); assert(!("minor" in md) && !("uvSets" in md), "3.0、没有以前的 uvSets 键");
      const cols = md.columns as AnyJson[], n = mk === sceneUvTwoSets ? 2 : 1;
      eq(cols.length, n);
      for (const c of cols) { eq(Object.keys(c).sort().join(), "arity,data,guid,kind"); eq(c.kind, "uv"); eq(c.arity, 2); eq(c.data.count, md.loopVert.count, "count = 角数"); }
      const ux = g.json.extensions.CATSUP_uvsets;
      assert(g.json.extensionsUsed.includes("CATSUP_uvsets"), "extensionsUsed 有它");
      eq(ux.version, 1); eq(ux.list.length, n);
      for (const r of ux.list) { eq(Object.keys(r).sort().join(), "fit,guid,height,name,pxPerM,width"); assert(Number.isInteger(r.width) && Number.isInteger(r.height) && r.pxPerM > 0 && r.fit === "size", JSON.stringify(r)); }
      eq(new Set(cols.map((c) => c.guid)).size, n); assert(cols.every((c) => ux.list.some((r: AnyJson) => r.guid === c.guid)), "列的号 = 排法表里的号");
      const tx = g.json.extensions.CATSUP_textures;
      eq(`${tx.version}.${tx.minor}`, "1.3");
      for (const t of tx.list) { eq(Object.keys(t.layout).join(), "uvSet"); assert(ux.list.some((r: AnyJson) => r.guid === t.layout.uvSet), "画挂在表里的那一套上"); }
      const back = sceneFromDocument(readCatsup(bytes));
      eq(sceneFingerprint(back), sceneFingerprint(s), "场景指纹（含角上的数、排法表）");
      eq(issuesOf(back).join("；"), "", "自检过");
      assert(same(writeCatsup(documentFromScene(back, "t")), bytes), "再存逐字节不变");
    }
  });
  it("① uv 列存 1/1024 格的 32 位整数：读回来的值 × 1024 = 文件里的整数；没有值 = 两个 −2147483648", () => {
    const s = sceneUvTwoSets(), g = glbOf(s), md = meshItem(g), col = md.columns[0], v = g.json.bufferViews[col.data.bufferView];
    const dv = new DataView(g.bin.buffer, g.bin.byteOffset + (v.byteOffset ?? 0), v.byteLength), ints = Array.from({ length: v.byteLength / 4 }, (_, i) => dv.getInt32(4 * i, true));
    assert(ints.some((x) => x === UV_NONE) && ints.some((x) => x !== UV_NONE), "两套里各有一部分面：有值、有「没有」");
    const doc = readCatsup(enc(g)), c = doc.definitions.find((d) => d.mesh)!.mesh!.columns!.find((x) => x.guid === col.guid)!;
    ints.forEach((x, i) => { if (x === UV_NONE) assert(Number.isNaN(c.values[i]), `角 ${i} 没有值`); else eq(c.values[i] * 1024, x, `角 ${i}`); });
  });
  it("① 不带列的网格体照旧盖 1.2、没有 columns 键；没有排法 = 不写 CATSUP_uvsets", () => {
    const g = glbOf(sceneMeshed()), md = meshItem(g);
    eq(md.version, 1); eq(md.minor, 2); assert(!("columns" in md) && !("uvSets" in md), "没有列");
    assert(!g.json.extensions.CATSUP_uvsets && !g.json.extensionsUsed.includes("CATSUP_uvsets"), "没有排法表");
  });
  it("① fit：按一格多大开的写 density、按总大小的写 size；不认识的值原样带回、这套排法什么都不自动动", () => {
    const g = glbOf(sceneUvDensityFit());
    eq(g.json.extensions.CATSUP_uvsets.list[0].fit, "density");
    g.json.extensions.CATSUP_uvsets.list[0].fit = "auto";
    const s = sceneFromDocument(readCatsup(enc(g))), row = [...s.uvSets.values()][0];
    eq(row.fit, "auto"); eq(uvSetAutoPlaces(row), false, "不认识的 fit = 不自动给新面找地方");
    eq(meshItem(glbOf(s)).version, 3); eq((decodeGlb(writeCatsup(documentFromScene(s, "t"))) as unknown as Glb).json.extensions.CATSUP_uvsets.list[0].fit, "auto", "原样写回");
  });
  it("① 不认识的键原样带回：排法表头上的、一行里的（连同它指着的字节）、一条列里的", () => {
    const g = glbOf(sceneUvPainted()), extraView = g.json.bufferViews.length;
    g.json.extensions.CATSUP_uvsets.future = { a: 1 };
    g.json.extensions.CATSUP_uvsets.list[0].note = { bytes: { bufferView: 0 } };
    meshItem(g).columns[0].later = [1, 2];
    const opened = readCatsup(enc(g)), out = (decodeGlb(writeCatsup(documentFromScene(sceneFromDocument(opened), "t", opened))) as unknown as Glb).json;   // 表头上的键跟着打开时的那份文档走（会话存盘都带着它）
    eq(JSON.stringify(out.extensions.CATSUP_uvsets.future), JSON.stringify({ a: 1 }), "表头");
    assert(typeof out.extensions.CATSUP_uvsets.list[0].note?.bytes?.bufferView === "number", "行里的键连同字节");
    eq(JSON.stringify(meshItem({ json: out, bin: new Uint8Array() }).columns[0].later), "[1,2]", "列里的键");
    void extraView;
  });
  it("① freed：形状对 = 认、原样写回；形状不对 = 当不认识的键带回，并且这套排法不自动给新面找地方", () => {
    const g = glbOf(sceneUvPainted());
    g.json.extensions.CATSUP_uvsets.list[0].freed = [0, 0, 8, 8, 16, 0, 24, 4];
    const s = sceneFromDocument(readCatsup(enc(g))), row = [...s.uvSets.values()][0];
    eq(JSON.stringify(row.freed), "[0,0,8,8,16,0,24,4]"); eq(uvSetAutoPlaces(row), true);
    eq(JSON.stringify((decodeGlb(writeCatsup(documentFromScene(s, "t"))) as unknown as Glb).json.extensions.CATSUP_uvsets.list[0].freed), "[0,0,8,8,16,0,24,4]");
    const b = glbOf(sceneUvPainted());
    b.json.extensions.CATSUP_uvsets.list[0].freed = [5, 5, 1];
    const sb = sceneFromDocument(readCatsup(enc(b))), rb = [...sb.uvSets.values()][0];
    eq(rb.freed, undefined); eq(uvSetAutoPlaces(rb), false, "形状不对 = 不自动放");
    eq(JSON.stringify((decodeGlb(writeCatsup(documentFromScene(sb, "t"))) as unknown as Glb).json.extensions.CATSUP_uvsets.list[0].freed), "[5,5,1]", "原样带回");
  });
  it("② 太新：网格体 4.0 = 拒开（CATSUP_mesh）；排法表 2.0 = 拒开（不学桌面态的例外）；网格体 3.9 = 能开、提示一次", () => {
    const tryRead = (g: Glb): unknown => { try { readCatsup(enc(g)); return null; } catch (e) { return e; } };
    const a = glbOf(sceneUvPainted()); meshItem(a).version = 4;
    const ea = tryRead(a); assert(ea instanceof FormatTooNewError && ea.extension === "CATSUP_mesh", String(ea));
    const b = glbOf(sceneUvPainted()); b.json.extensions.CATSUP_uvsets.version = 2;
    const eb = tryRead(b); assert(eb instanceof FormatTooNewError && eb.extension === "CATSUP_uvsets", String(eb));
    const c = glbOf(sceneUvPainted()); meshItem(c).minor = 9;
    const doc = readCatsup(enc(c));
    eq(doc.readNotes?.newerMinor.map((n) => n.ext).join(), "CATSUP_mesh");
  });
});

describe("附属数据坏了模型照开：坏的部分按没有处理、记一笔、说出来（施工单十八第 1 刀）", () => {
  const good = (): Glb => glbOf(sceneUvTwoSets());
  it("uv 列上一张面一半有值一半没有 → 这张面整面没有位置；别的面不受影响", () => {
    const g0 = good(), g = clone(g0), col = meshItem(g).columns[0], before = placed(sceneFromDocument(readCatsup(enc(g0))));
    patchColumn(g, col, (a) => { const k = a.findIndex((x) => x !== UV_NONE); a[k] = UV_NONE; a[k + 1] = UV_NONE; });
    const { notes, s } = readBad(g0, g);
    eq(notes.uvDropped?.map((x) => `${x.why}:${x.faces}`).join(), "partial-corners:1"); eq(placed(s), before - 1);
  });
  it("uv 列上一张面的角落在画布外面 → 那张面整面没有位置（不夹回画布里）", () => {
    const g0 = good(), g = clone(g0), col = meshItem(g).columns[0], before = placed(sceneFromDocument(readCatsup(enc(g0))));
    patchColumn(g, col, (a) => { const k = a.findIndex((x) => x !== UV_NONE); a[k] = -1024 * 50; });
    const { notes, s } = readBad(g0, g);
    eq(notes.uvDropped?.map((x) => `${x.why}:${x.faces}`).join(), "off-canvas-corners:1"); eq(placed(s), before - 1);
  });
  it("一条列不对（uv 每角三个数 / 没有种类 / 角上的数个数对不上 / 找不到字节 / 身份号坏）→ 这一列不认", () => {
    const cases: [string, (c: AnyJson) => void][] = [
      ["bad-kind", (c) => { c.arity = 3; }], ["bad-kind", (c) => { delete c.kind; }], ["bad-length", (c) => { c.data.count = 1; c.data.bufferView = 0; }],
      ["no-data", (c) => { delete c.data; }], ["bad-guid", (c) => { c.guid = "x"; }],
    ];
    for (const [why, edit] of cases) {
      const g0 = good(), g = clone(g0); edit(meshItem(g).columns[1]);
      const { notes, s } = readBad(g0, g);
      assert(notes.uvDropped?.some((x) => x.why === why), `${why}：${JSON.stringify(notes.uvDropped)}`);
      eq([...s.defs.values()].flatMap((d) => (d.body.kind === "mesh" ? d.body.kernel.columnDefs() : [])).length, 1, `${why}：剩一列`);
    }
  });
  it("同一个网格体里两列同一个号 → 两列都不认（不挑第一个）；指着它的画当孤儿留着", () => {
    const g0 = good(), g = clone(g0), cols = meshItem(g).columns; cols[1].guid = cols[0].guid;
    const { notes, s } = readBad(g0, g);
    assert(notes.uvDropped?.filter((x) => x.why === "duplicate-guid").length === 2, JSON.stringify(notes.uvDropped));
    eq(placed(s), 0, "两列都没了");
  });
  it("uv 列的号在排法表里没有 → 这一列不认（no-row）；画挂的排法不在表里 → 孤儿", () => {
    const g0 = good(), g = clone(g0), painted = g.json.extensions.CATSUP_textures.list[0].layout.uvSet, list = g.json.extensions.CATSUP_uvsets.list as AnyJson[];
    list.splice(list.findIndex((r) => r.guid === painted), 1);   // 拿掉画挂着的那一套
    const { notes } = readBad(g0, g);
    assert(notes.uvDropped?.some((x) => x.why === "no-row"), JSON.stringify(notes.uvDropped)); eq(notes.orphanPaintTextures, 1);
  });
  it("排法表里坏的行（宽高不对 / 没写 fit / 两行同号）→ 不认、记一笔、说出来（再存盘会去掉）", () => {
    for (const [why, edit] of [["bad-size", (l: AnyJson[]) => { l[0].width = 0; }], ["bad-fit", (l: AnyJson[]) => { delete l[0].fit; }], ["duplicate-guid", (l: AnyJson[]) => { l[1].guid = l[0].guid; }]] as [string, (l: AnyJson[]) => void][]) {
      const g0 = good(), g = clone(g0); edit(g.json.extensions.CATSUP_uvsets.list);
      const { notes } = readBad(g0, g);
      assert(notes.uvSetRowsDropped?.some((x) => x.why === why), `${why}：${JSON.stringify(notes.uvSetRowsDropped)}`);
      assert(formatNotesSay(notes).some((t) => /排法表里有 \d+ 行这一版读不了.*再存盘会去掉这几行/.test(t)), `${why}：说出来`);
    }
  });
  it("打开之后说出来：哪个物件、几张面、为什么，并说明再存盘会去掉坏的部分", () => {
    const g0 = good(), g = clone(g0); patchColumn(g, meshItem(g).columns[0], (a) => { const k = a.findIndex((x) => x !== UV_NONE); a[k] = UV_NONE; a[k + 1] = UV_NONE; });
    const say = formatNotesSay(readCatsup(enc(g)).readNotes!).join("\n");
    assert(/的贴图坐标有坏的地方.*1 张面.*一半有坐标一半没有.*再存盘会把这些坏的部分去掉/.test(say), say);
  });
  it("走画的面在那一套上没有位置 → 照底色显示、记一笔（哪个物件、哪一套、几张面）；不当坏数据", () => {
    const g0 = good(), g = clone(g0); patchColumn(g, meshItem(g).columns[0], (a) => { const k = a.findIndex((x) => x !== UV_NONE), n = 8; for (let i = k; i < k + n; i++) a[i] = UV_NONE; });
    const doc = readCatsup(enc(g));
    assert((doc.readNotes?.paintUnplaced?.[0]?.faces ?? 0) >= 1, JSON.stringify(doc.readNotes));
  });
});

describe("旧存法的画（施工单十八第五节：不做迁移）", () => {
  const OLD = ["uvPainted.glb", "uvTwoSets.glb", "uvDensityFit.glb", "uvPaintedComposite.glb", "uvPaintedTall.glb"];
  const meshAt = 7;   // 签名里 CATSUP_mesh 那一位（migrate/index.ts CATSUP_EXTENSION_ORDER）
  const oldDirs = listCorpusDirs().filter((v: string) => v.split("-")[meshAt]?.startsWith("2.") && OLD.some((f) => listFixtures(v).includes(f)));   // 网格体还是 2.x 写的那几个目录
  it("老目录里冻着的带画样本：打得开、说两句（旧存法的画按底色；物件上的旧位置保存之后不再保留 = 算会丢的）、画按底色（没有 uv 列、贴图行原样带着、不当画）", () => {
    assert(oldDirs.length >= 4, `老目录 ${oldDirs.length} 个`);
    for (const v of oldDirs) for (const f of OLD.filter((x) => listFixtures(v).includes(x))) {
      const doc = readCatsup(readFixture(v, f)), n = doc.readNotes;
      assert((n?.oldPaintFormat ?? 0) >= 1 && (n?.oldUvColumns ?? 0) >= 1, `${v}/${f}：${JSON.stringify(n)}`);
      const say = formatNotesSay(doc.readNotes!).join("\n");
      assert(/这份文件里有 \d+ 张旧存法的画，这一版读不了，按底色显示/.test(say) && /有 \d+ 个物件上记着画在面上的位置（旧存法），这一版读不了；保存之后不再保留/.test(say), `${v}/${f}：${say}`);
      eq(lossySay(doc.readNotes).join("|"), `有 ${n!.oldUvColumns} 个物件上记着画在面上的位置（旧存法），这一版读不了；保存之后不再保留`, "会丢的只有物件上的旧位置（第一次存盘前要点头）");
      const s = sceneFromDocument(doc);
      eq(s.uvSets.size, 0); eq(placed(s), 0, "没有 uv 列");
      assert([...s.textures.values()].some((t) => t.content.kind === "layered") && !s.materials.some((m) => paintIn(s.textures, m)), "贴图行原样带着、不当画");
      eq(issuesOf(s).join("；"), "", "自检过");
    }
  });
  it("存了再开稳定：新写的文件里没有以前的写法（网格体盖 1.2、没有 uvSets 键、没有排法表），再存逐字节不变", () => {
    const v = oldDirs[oldDirs.length - 1], s = sceneFromDocument(readCatsup(readFixture(v, "uvPainted.glb")));
    const bytes = writeCatsup(documentFromScene(s, "t")), g = decodeGlb(bytes) as unknown as Glb, md = meshItem(g);
    eq(`${md.version}.${md.minor}`, "1.2"); assert(!("uvSets" in md) && !("columns" in md) && !g.json.extensions.CATSUP_uvsets, "没有以前的写法");
    const doc2 = readCatsup(bytes);
    eq(doc2.readNotes?.oldUvColumns ?? 0, 0, "再开：网格体上没有老写法了");
    assert((doc2.readNotes?.oldPaintFormat ?? 0) >= 1, "旧存法的画还在（贴图行原样带着），照样说一句");
    eq(lossySay(doc2.readNotes).length, 0, "再存什么都不丢 = 不用再点头");
    assert(same(writeCatsup(documentFromScene(sceneFromDocument(doc2), "t")), bytes), "再存逐字节不变");
  });
});

describe("比内容跟着面转（粘贴对账；1-2½，施工单十八：列）", () => {
  it("面的先后和环的起点换了、列的先后换了 → 判一样；改一个角上的数 → 判不一样", () => {
    const doc = documentFromScene(sceneUvTwoSets(), "t"), d = doc.definitions.find((x) => x.kind === "mesh")!, m = d.mesh!, cols = m.columns!;
    const canon = (x: typeof d): string => JSON.stringify(canonDefinition(x, () => undefined), (_k, v) => (ArrayBuffer.isView(v) ? Array.from(v as unknown as ArrayLike<number>) : v));
    const nF = m.faceStart.length, order = [...Array(nF).keys()].reverse(), loop: number[] = [], start: number[] = [], len: number[] = [], vals = cols.map(() => [] as number[]);
    for (const f of order) {
      const s = m.faceStart[f], n = m.faceLen[f]; start.push(loop.length); len.push(n);
      for (let k = 0; k < n; k++) { const c = s + ((k + 1) % n); loop.push(m.loopVert[c]); cols.forEach((col, j) => vals[j].push(col.values[2 * c], col.values[2 * c + 1])); }
    }
    const turned = { ...d, mesh: { ...m, faceStart: Int32Array.from(start), faceLen: Int32Array.from(len), loopVert: Int32Array.from(loop), faceMat: Int32Array.from(order.map((f) => m.faceMat[f])), faceFlags: Uint8Array.from(order.map((f) => m.faceFlags[f])), columns: cols.map((c, j) => ({ ...c, values: Float32Array.from(vals[j]) })).reverse() } };
    eq(canon(turned), canon(d), "转过、排过、列的先后换过 = 一样");
    const nudged = { ...d, mesh: { ...m, columns: cols.map((c, j) => (j === 0 ? { ...c, values: (() => { const a = c.values.slice(); const k = a.findIndex((x) => !Number.isNaN(x)); a[k] += 1; return a; })() } : c)) } };
    assert(canon(nudged) !== canon(d), "改一个角上的数 = 不一样");
  });
});

// 贴图坐标进文件（贴图主线 1-2½ 起；2026-11-13 施工单十八第 1 刀整份重写：排法表 = 顶层扩展 CATSUP_uvsets 1.0，网格体上是角上的列 = CATSUP_mesh 3.0 columns（uv = 通道：sets 对照表 + faceSet 每面下标 + data 每角坐标；统筹 11-13 改），
// 画的 layout = { uvSet } = CATSUP_textures 1.3；不做迁移）。created 2026-11-11 / rewritten 2026-11-13 by Claude Opus 5.5
// ① 往返和拍子：三节的形状（统筹要看的第 ① 处）、uv 通道存 1/1024 格的整数、不带列照旧 1.2、两个通道 / 空列 / 列的先后、fit / freed / 不认识的键原样带回（uv 通道里的不带）、太新拒开。
// ② 附属数据坏了模型照开：坏的部分按「没有」处理、记进 readNotes、打开之后说出来；读进来自检全过（uv 通道的每一种坏法各一条）。
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
/** 一段 32 位整数（{ bufferView } → BIN 里那一段）读出来。 */
function ints(g: Glb, ref: AnyJson): Int32Array {
  const v = g.json.bufferViews[ref.bufferView], dv = new DataView(g.bin.buffer, g.bin.byteOffset + (v.byteOffset ?? 0), v.byteLength);
  return Int32Array.from({ length: v.byteLength / 4 }, (_, i) => dv.getInt32(4 * i, true));
}
/** 改一段 32 位整数（ref = 通道的 data / faceSet；拷一份 BIN 再改）。 */
function patchInts(g: Glb, ref: AnyJson, edit: (a: Int32Array) => void): void {
  const v = g.json.bufferViews[ref.bufferView], bin = g.bin.slice(), dv = new DataView(bin.buffer, bin.byteOffset + (v.byteOffset ?? 0), v.byteLength), a = new Int32Array(v.byteLength / 4);
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
/** 网格体载荷里第一个 uv 通道、它第一张有位置的面（下标）和那张面的角（data 里从 2 × faceStart 起、2 × faceLen 个整数）。 */
function firstPlaced(g: Glb): { ch: AnyJson; f: number; s: number; e: number } {
  const md = meshItem(g), ch = md.columns.find((c: AnyJson) => c.kind === "uv"), fs = ints(g, ch.faceSet), st = ints(g, md.faceStart), ln = ints(g, md.faceLen), f = fs.findIndex((x) => x !== -1);
  return { ch, f, s: 2 * st[f], e: 2 * (st[f] + ln[f]) };
}
/** 手造一份「一张面同时在两套排法上」的文档：两套排法的场景，第二套没有位置的面也给一块（每角一个小坐标，落在画布里）。 */
function twoChannelDoc(): CatsupDocument {
  const doc = documentFromScene(sceneUvTwoSets(), "t"), m = doc.definitions.find((d) => d.kind === "mesh")!.mesh!, [a, b] = m.columns!;
  for (let f = 0; f < m.faceStart.length; f++) {
    const s0 = 2 * m.faceStart[f], e0 = s0 + 2 * m.faceLen[f];
    if (Number.isNaN(a.values[s0]) || !Number.isNaN(b.values[s0])) continue;   // 只挑在第一套上有、第二套上没有的面
    for (let i = s0; i < e0; i++) b.values[i] = 1 + ((i - s0) % 4) / 4;
  }
  return doc;
}
/** 场景里每张面在每条 uv 列上有没有位置：定义名 → 有位置的面数。 */
const placed = (s: Scene): number => { let n = 0; for (const d of s.defs.values()) if (d.body.kind === "mesh") { const k = d.body.kernel; for (const c of k.columnDefs()) if (c.kind === "uv") n += k.faces().filter((f) => k.cornerValues(f, c.guid)).length; } return n; };

describe("贴图坐标进文件：形状、往返和拍子（施工单十八第 1 刀）", () => {
  it("① 带画：网格体盖 3.0、columns 里一个 uv 通道（kind / arity 2 / sets 字典序 / faceSet 面数 / data 角数）、没有 uvSets 键；顶层 CATSUP_uvsets 一行一套（fit 写明）；贴图表 1.3、layout = { uvSet }；读回来指纹相等、自检过、再存逐字节不变", () => {
    for (const mk of [sceneUvPainted, sceneUvTwoSets]) {
      const s = mk(), bytes = writeCatsup(documentFromScene(s, "t")), g = decodeGlb(bytes) as unknown as Glb, md = meshItem(g);
      eq(md.version, 3); assert(!("minor" in md) && !("uvSets" in md), "3.0、没有以前的 uvSets 键");
      const cols = md.columns as AnyJson[], n = mk === sceneUvTwoSets ? 2 : 1;
      eq(cols.length, 1, "两套排法各管一部分面 = 一张面最多在一套上 = 一个通道");
      const ch = cols[0];
      eq(Object.keys(ch).sort().join(), "arity,data,faceSet,kind,sets"); eq(ch.kind, "uv"); eq(ch.arity, 2);
      eq(ch.faceSet.count, md.faceStart.count, "faceSet.count = 面数"); eq(ch.data.count, md.loopVert.count, "data.count = 角数");
      eq(ch.sets.length, n); eq(JSON.stringify(ch.sets), JSON.stringify([...ch.sets].sort()), "sets 字典序");
      const ux = g.json.extensions.CATSUP_uvsets;
      assert(g.json.extensionsUsed.includes("CATSUP_uvsets"), "extensionsUsed 有它");
      eq(ux.version, 1); eq(ux.list.length, n);
      for (const r of ux.list) { eq(Object.keys(r).sort().join(), "fit,guid,height,name,pxPerM,width"); assert(Number.isInteger(r.width) && Number.isInteger(r.height) && r.pxPerM > 0 && r.fit === "size", JSON.stringify(r)); }
      assert((ch.sets as string[]).every((g) => ux.list.some((r: AnyJson) => r.guid === g)), "sets 里的号 = 排法表里的号");
      const tx = g.json.extensions.CATSUP_textures;
      eq(`${tx.version}.${tx.minor}`, "1.3");
      for (const t of tx.list) { eq(Object.keys(t.layout).join(), "uvSet"); assert(ux.list.some((r: AnyJson) => r.guid === t.layout.uvSet), "画挂在表里的那一套上"); }
      const back = sceneFromDocument(readCatsup(bytes));
      eq(sceneFingerprint(back), sceneFingerprint(s), "场景指纹（含角上的数、排法表）");
      eq(issuesOf(back).join("；"), "", "自检过");
      assert(same(writeCatsup(documentFromScene(back, "t")), bytes), "再存逐字节不变");
    }
  });
  it("① uv 通道存 1/1024 格的 32 位整数：faceSet 指的那一套读回来的值 × 1024 = 文件里的整数；faceSet −1 = 两个 −2147483648、那张面在哪一套上都没有", () => {
    const s = sceneUvTwoSets(), g = glbOf(s), md = meshItem(g), ch = md.columns[0], fs = ints(g, ch.faceSet), data = ints(g, ch.data), st = ints(g, md.faceStart), ln = ints(g, md.faceLen);
    const cols = readCatsup(enc(g)).definitions.find((d) => d.mesh)!.mesh!.columns!;
    let placedN = 0;
    for (let f = 0; f < fs.length; f++) {
      const s0 = 2 * st[f], e0 = 2 * (st[f] + ln[f]);
      if (fs[f] === -1) { for (let i = s0; i < e0; i++) eq(data[i], UV_NONE, `面 ${f} 没有位置：角 ${i}`); for (const c of cols) assert(Number.isNaN(c.values[s0]), `面 ${f} 在 ${c.guid} 上没有`); continue; }
      placedN++;
      const c = cols.find((x) => x.guid === ch.sets[fs[f]])!;
      for (let i = s0; i < e0; i++) eq(c.values[i] * 1024, data[i], `面 ${f} 角 ${i}`);
      for (const o of cols) if (o !== c) assert(Number.isNaN(o.values[s0]), `面 ${f} 不在别的那一套上`);
    }
    assert(placedN > 0 && new Set(Array.from(fs).filter((x) => x >= 0)).size === 2, "两套各有面");
  });
  it("① 一张面同时在两套排法上 = 两个通道（第 k 套按 GUID 字典序进第 k 个通道）；能开、能存、来回逐字节；读回来每列和写之前一样", () => {
    const doc = twoChannelDoc(), bytes = writeCatsup(doc), g = decodeGlb(bytes) as unknown as Glb, md = meshItem(g), chs = (md.columns as AnyJson[]).filter((c) => c.kind === "uv");
    eq(chs.length, 2, "两个通道");
    const fs0 = ints(g, chs[0].faceSet), fs1 = ints(g, chs[1].faceSet);
    for (let f = 0; f < fs1.length; f++) if (fs1[f] !== -1) { assert(fs0[f] !== -1, `面 ${f}：第 1 个通道有它，第 0 个通道也有`); assert(chs[0].sets[fs0[f]] < chs[1].sets[fs1[f]], `面 ${f}：字典序小的那套在第 0 个通道`); }
    const back = readCatsup(bytes), m0 = doc.definitions.find((d) => d.kind === "mesh")!.mesh!, m1 = back.definitions.find((d) => d.kind === "mesh")!.mesh!;
    eq(back.readNotes?.uvDropped, undefined, "没有不认的");
    for (const c of m0.columns!) { const r = m1.columns!.find((x) => x.guid === c.guid)!; eq(Array.from(r.values).map(String).join(), Array.from(c.values).map(String).join(), `列 ${c.guid}`); }
    const s = sceneFromDocument(back);
    eq(issuesOf(s).join("；"), "", "自检过");
    assert(same(writeCatsup(documentFromScene(s, "t")), bytes), "经场景再存逐字节不变");
  });
  it("① 空列（这个网格体在某套排法上、一张面都没有位置）：它的 GUID 进第 0 个通道的 sets；读回来那一列还在（全空）；全都是空列也写第 0 个通道", () => {
    const doc = documentFromScene(sceneUvTwoSets(), "t"), m = doc.definitions.find((d) => d.kind === "mesh")!.mesh!, [a, b] = m.columns!;
    b.values.fill(NaN);
    const bytes = writeCatsup(doc), ch = meshItem(decodeGlb(bytes) as unknown as Glb).columns[0];
    eq(JSON.stringify(ch.sets), JSON.stringify([a.guid, b.guid].sort()), "两套都在 sets 里");
    const s = sceneFromDocument(readCatsup(bytes)), k = [...s.defs.values()].find((d) => d.body.kind === "mesh")!.body;
    assert(k.kind === "mesh" && k.kernel.hasColumn(b.guid) && k.kernel.faces().every((f) => !k.kernel.cornerValues(f, b.guid)), "空列读回来还在、全空");
    assert(same(writeCatsup(documentFromScene(s, "t")), bytes), "经场景再存逐字节不变");
    a.values.fill(NaN);
    const g2 = decodeGlb(writeCatsup(doc)) as unknown as Glb, md2 = meshItem(g2), ch2 = md2.columns[0];
    eq(md2.version, 3); eq(JSON.stringify(ch2.sets), JSON.stringify([a.guid, b.guid].sort())); assert(Array.from(ints(g2, ch2.faceSet)).every((x) => x === -1), "faceSet 全 −1");
  });
  it("① 内存里列的先后不影响写出来的字节", () => {
    const d = twoChannelDoc(), flipped: CatsupDocument = { ...d, definitions: d.definitions.map((x) => (x.kind === "mesh" ? { ...x, mesh: { ...x.mesh!, columns: [...x.mesh!.columns!].reverse() } } : x)) };
    assert(same(writeCatsup(flipped), writeCatsup(d)), "整份逐字节一样");
  });
  it("① 不认识的键原样带回：排法表头上的、一行里的（连同它指着的字节）；uv 通道里的不带回（通道是写的时候现排的，没有地方挂）", () => {
    const g = glbOf(sceneUvPainted()), extraView = g.json.bufferViews.length;
    g.json.extensions.CATSUP_uvsets.future = { a: 1 };
    g.json.extensions.CATSUP_uvsets.list[0].note = { bytes: { bufferView: 0 } };
    meshItem(g).columns[0].later = [1, 2];
    const opened = readCatsup(enc(g)), out = (decodeGlb(writeCatsup(documentFromScene(sceneFromDocument(opened), "t", opened))) as unknown as Glb).json;   // 表头上的键跟着打开时的那份文档走（会话存盘都带着它）
    eq(JSON.stringify(out.extensions.CATSUP_uvsets.future), JSON.stringify({ a: 1 }), "表头");
    assert(typeof out.extensions.CATSUP_uvsets.list[0].note?.bytes?.bufferView === "number", "行里的键连同字节");
    eq(meshItem({ json: out, bin: new Uint8Array() }).columns[0].later, undefined, "uv 通道里的键不带回");
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
  const twoCh = (): Glb => decodeGlb(writeCatsup(twoChannelDoc())) as unknown as Glb;
  const whys = (n: FormatReadNotes): string => (n.uvDropped ?? []).map((x) => `${x.why}:${x.faces}`).join();
  const uvCols = (s: Scene): number => [...s.defs.values()].flatMap((d) => (d.body.kind === "mesh" ? d.body.kernel.columnDefs().filter((c) => c.kind === "uv") : [])).length;
  it("faceSet 说有、角上一半有值一半没有 → 这张面没有位置（face-set-mismatch）；别的面不受影响", () => {
    const g0 = good(), g = clone(g0), p = firstPlaced(g), before = placed(sceneFromDocument(readCatsup(enc(g0))));
    patchInts(g, p.ch.data, (a) => { a[p.s] = UV_NONE; a[p.s + 1] = UV_NONE; });
    const { notes, s } = readBad(g0, g);
    eq(whys(notes), "face-set-mismatch:1"); eq(placed(s), before - 1);
  });
  it("faceSet 说有、角上全是「没有」/ faceSet 是 −1、角上却有数 → 这张面没有位置（face-set-mismatch）", () => {
    const g0 = good(), before = placed(sceneFromDocument(readCatsup(enc(g0))));
    const a = clone(g0), pa = firstPlaced(a);
    patchInts(a, pa.ch.data, (x) => x.fill(UV_NONE, pa.s, pa.e));
    const ra = readBad(g0, a); eq(whys(ra.notes), "face-set-mismatch:1"); eq(placed(ra.s), before - 1);
    const b = clone(g0), pb = firstPlaced(b);
    patchInts(b, pb.ch.faceSet, (x) => { x[pb.f] = -1; });
    const rb = readBad(g0, b); eq(whys(rb.notes), "face-set-mismatch:1"); eq(placed(rb.s), before - 1);
  });
  it("uv 上一张面的角落在画布外面 → 那张面整面没有位置（不夹回画布里）", () => {
    const g0 = good(), g = clone(g0), p = firstPlaced(g), before = placed(sceneFromDocument(readCatsup(enc(g0))));
    patchInts(g, p.ch.data, (a) => { a[p.s] = -1024 * 50; });
    const { notes, s } = readBad(g0, g);
    eq(whys(notes), "off-canvas-corners:1"); eq(placed(s), before - 1);
  });
  it("一张面的下标越界 / sets 里那一项不是身份号 → 这张面没有位置（bad-face-set）；sets 里重复的身份号允许", () => {
    const g0 = good(), before = placed(sceneFromDocument(readCatsup(enc(g0))));
    const a = clone(g0), pa = firstPlaced(a);
    patchInts(a, pa.ch.faceSet, (x) => { x[pa.f] = 7; });
    const ra = readBad(g0, a); eq(whys(ra.notes), "bad-face-set:1"); eq(placed(ra.s), before - 1);
    const b = clone(g0), ch = meshItem(b).columns[0], nOnSet0 = Array.from(ints(b, ch.faceSet)).filter((x) => x === 0).length;
    ch.sets[0] = "x";
    const rb = readBad(g0, b); eq(whys(rb.notes), `bad-face-set:${nOnSet0}`); eq(placed(rb.s), before - nOnSet0); eq(uvCols(rb.s), 1, "那一套没有列了，另一套还在");
    const c = clone(g0), cc = meshItem(c).columns[0];
    cc.sets.push(cc.sets[0]);
    const dc = readCatsup(enc(c)); eq(dc.readNotes?.uvDropped, undefined, "不算坏"); eq(placed(sceneFromDocument(dc)), before, "重复的号 = 指同一列，什么都不少");
  });
  it("一个通道不对（每角三个数 / sets 不是列表 / 找不到 faceSet / 角上的数个数对不上）→ 这个通道不认", () => {
    const cases: [string, (c: AnyJson) => void][] = [
      ["bad-kind", (c) => { c.arity = 3; }], ["bad-sets", (c) => { c.sets = "x"; }], ["no-data", (c) => { delete c.faceSet; }], ["bad-length", (c) => { c.data.bufferView = c.faceSet.bufferView; }],
    ];
    for (const [why, edit] of cases) {
      const g0 = good(), g = clone(g0); edit(meshItem(g).columns[0]);
      const { notes, s } = readBad(g0, g);
      eq(whys(notes), `${why}:0`, why); eq(placed(s), 0, `${why}：这个通道上的面都没有位置`); eq(uvCols(s), 0, `${why}：两套都没有列（只在这个通道里）`);
    }
  });
  it("两个通道里同一张面指同一套 → 后一个不认（same-set-twice）", () => {
    const g0 = twoCh(), g = clone(g0), chs = (meshItem(g).columns as AnyJson[]).filter((c) => c.kind === "uv"), n1 = Array.from(ints(g, chs[1].faceSet)).filter((x) => x !== -1).length;
    chs[1].sets = chs[1].sets.map(() => chs[0].sets[0]);   // 第 1 个通道全指第 0 个通道里的第一套（第 0 个通道里那几张面都在它上面）
    const doc = readCatsup(enc(g)), dropped = (doc.readNotes?.uvDropped ?? []).filter((x) => x.why === "same-set-twice").reduce((k, x) => k + x.faces, 0);
    assert(dropped > 0 && dropped <= n1, `后一个不认的面 ${dropped}（第 1 个通道一共 ${n1} 张）：${JSON.stringify(doc.readNotes?.uvDropped)}`);
    eq(modelOnly(doc), modelOnly(readCatsup(enc(g0))), "模型本身一个字不差");
  });
  it("别的种类的列和某套排法同号 → 这两样都不认（不挑第一个）；指着那套的画当孤儿留着", () => {
    const g0 = good(), g = clone(g0), md = meshItem(g), ch = md.columns[0], g1 = ch.sets[0];
    md.columns.push({ guid: g1, kind: "test", arity: 2, data: { bufferView: ch.data.bufferView, count: ch.data.count } });
    const { notes, s } = readBad(g0, g);
    eq((notes.uvDropped ?? []).filter((x) => x.why === "duplicate-guid").length, 2, JSON.stringify(notes.uvDropped));
    const k = [...s.defs.values()].find((d) => d.body.kind === "mesh")!.body;
    assert(k.kind === "mesh" && !k.kernel.hasColumn(g1), "那一套和那条别的列都没了"); eq(uvCols(s), 1, "另一套还在");
  });
  it("uv 的号在排法表里没有 → 这一列不认（no-row）；画挂的排法不在表里 → 孤儿", () => {
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
  it("打开之后说出来：哪个物件、几张面、为什么，并说明再存盘会去掉坏的部分；整个通道不认的说「有一段」", () => {
    const g0 = good(), g = clone(g0), p = firstPlaced(g); patchInts(g, p.ch.data, (a) => { a[p.s] = UV_NONE; a[p.s + 1] = UV_NONE; });
    const say = formatNotesSay(readCatsup(enc(g)).readNotes!).join("\n");
    assert(/的贴图坐标有坏的地方.*1 张面的「有没有位置」和角上的坐标对不上.*再存盘会把这些坏的部分去掉/.test(say), say);
    const h = clone(g0); meshItem(h).columns[0].sets = "x";
    const say2 = formatNotesSay(readCatsup(enc(h)).readNotes!).join("\n");
    assert(/有一段贴图坐标（对照表的格式不对），这一段不认/.test(say2), say2);
  });
  it("走画的面在那一套上没有位置（faceSet −1、角上全是「没有」）→ 照底色显示、记一笔（哪个物件、哪一套、几张面）；不当坏数据", () => {
    const g0 = good(), g = clone(g0), p = firstPlaced(g);
    patchInts(g, p.ch.faceSet, (a) => { a[p.f] = -1; }); patchInts(g, p.ch.data, (a) => a.fill(UV_NONE, p.s, p.e));
    const doc = readCatsup(enc(g));
    eq(doc.readNotes?.uvDropped, undefined, "不当坏数据");
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

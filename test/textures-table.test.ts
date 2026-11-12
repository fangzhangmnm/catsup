// 贴图成为独立的条目（CATSUP_textures 1.0 / CATSUP_material 1.3；贴图主线 1-0½，施工单 ai-docs/20261110-paint-workorders-2.md 第五节的门）。created 2026-11-10 by Claude Opus 5.5
// 老样本搬进贴图表、写两遍一样、不带贴图的文件不写扩展、导出模型字节不变、两个材质共用一张图、不认识的种类原样带回、sizeM / layout 正好一个、
// 指着不存在的贴图、更新版写的贴图表、清理、跨文件粘贴、第一次涂图的撤销重做；守卫：材质里不许直接装图、删贴图只有一处。
import { describe, it, eq, assert } from "./runner.mjs";
const { readdirSync, readFileSync, statSync, existsSync } = (await import("node:fs" as string)) as { readdirSync(p: string): string[]; readFileSync(p: string): Uint8Array; readFileSync(p: string, enc: string): string; statSync(p: string): { isDirectory(): boolean }; existsSync(p: string): boolean };
const join = (...p: string[]): string => p.join("/");
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup, writeGltfModel, decodeGlb } from "../src/format/index.ts";
import { encodeGlb } from "../src/format/glb.ts";
import { COLOR_VALUE, colorMapIn, compositeFits, newDocument, paintIn, tiledPaintIn, type CatsupDocument, type TextureDoc } from "../src/format/document.ts";
import { mintGuid } from "../src/format/guid.ts";
import { ROOT_CONTEXT, Scene } from "../src/scene/scene.ts";
import { applyOp, OpRejected, faceKey } from "../src/editor/ops.ts";
import { History } from "../src/editor/history.ts";
import { census, unusedTextures } from "../src/scene/resources.ts";
import { extract } from "../src/editor/transfer.ts";
import { pasteConflict } from "../src/editor/paste-plan.ts";
import { localize } from "../src/editor/transfer.ts";
import { IDENTITY } from "../src/scene/xform.ts";
import { listCorpusDirs, fixtureDir } from "./fixtures/format/fixtures.mjs";
import { scenePainted, sceneBox, sceneFingerprint, TINY_PNG } from "./format-scenes.ts";

type AnyJson = Record<string, any>;   // eslint-disable-line @typescript-eslint/no-explicit-any
const jsonOf = (bytes: Uint8Array): AnyJson => (decodeGlb(bytes) as unknown as { json: AnyJson }).json;
/** 改一改 JSON 再封回去（二进制不动）。 */
const patched = (bytes: Uint8Array, f: (j: AnyJson) => void): Uint8Array => { const g = decodeGlb(bytes) as unknown as { json: AnyJson; bin: Uint8Array }; f(g.json); return encodeGlb(g.json, g.bin); };
const sameBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const threw = (fn: () => unknown, re?: RegExp): boolean => { try { fn(); return false; } catch (e) { return !re || re.test(String(e)); } };
const PNG2 = new Uint8Array([137, 80, 78, 71, 9, 9, 9]);
const imageRow = (name: string, bytes: Uint8Array, sizeM: [number, number] = [1, 2]): TextureDoc => ({ guid: mintGuid(), name, value: COLOR_VALUE, content: { kind: "image", mimeType: "image/png", bytes }, sizeM });
const root = (s: Scene) => ({ def: s.root, group: null });
/** 盒子；两个材质共用一张图，各涂一面。 */
function sharedScene(): { s: Scene; tex: TextureDoc } {
  let s = new Scene(sceneBox(1, 1));
  const tex = imageRow("共用", TINY_PNG, [0.5, 0.5]);
  s = applyOp(s, { op: "addTexture", guid: tex.guid, name: tex.name, mimeType: "image/png", bytes: TINY_PNG, sizeM: [0.5, 0.5] }).scene;
  s = applyOp(s, { op: "addMaterial", name: "甲", color: [1, 1, 1], channels: { color: [tex.guid] } }).scene;
  s = applyOp(s, { op: "addMaterial", name: "乙", color: [0.5, 0.5, 0.5], channels: { color: [tex.guid] } }).scene;
  const k = s.brep(s.root).kernel, [f0, f1] = k.faces();
  s = applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, f0.id)], material: 0 }).scene;
  s = applyOp(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, f1.id)], material: 1 }).scene;
  return { s, tex: s.textures.get(tex.guid)! };
}

describe("贴图表：老文件（门 2）", () => {
  it("每个冻结样本目录里的 painted.glb：图搬进贴图表一行、材质的 channels.color 指它、尺寸和字节对、样子不变", () => {
    let n = 0;
    for (const tag of listCorpusDirs()) {
      const f = join(fixtureDir(tag), "painted.glb");
      if (!existsSync(f)) continue;
      const doc = readCatsup(new Uint8Array(readFileSync(f))), mats = doc.materials.filter((m) => m.channels?.color?.length);
      eq(mats.length, 1, `${tag}：带图的材质`); eq(doc.textures.length, 1, `${tag}：贴图表一行`);
      const t = doc.textures[0];
      eq(mats[0].channels!.color[0], t.guid, `${tag}：材质指它`);
      assert(t.content.kind === "image" && sameBytes(t.content.bytes, TINY_PNG), `${tag}：字节`);
      eq(JSON.stringify(t.sizeM), "[0.5,0.5]", `${tag}：尺寸来自材质扩展的 sizeM`); eq(t.name, mats[0].name, `${tag}：名字 = 材质名`);
      eq(sceneFingerprint(sceneFromDocument(doc)), sceneFingerprint(scenePainted()), `${tag}：样子不变`);
      n++;
    }
    assert(n >= 3, `至少三代带贴图的样本（实得 ${n}）`);
  });
  it("老文件没有 sizeM = 一米；两个材质各有各的图 = 两行（不按内容合并）", () => {
    const { s } = sharedScene(), bytes = writeCatsup(documentFromScene(s, "t"));
    const legacy = patched(bytes, (j) => { for (const m of j.materials) { delete m.extensions.CATSUP_material.channels; delete m.extensions.CATSUP_material.sizeM; m.extensions.CATSUP_material.minor = 2; } delete j.extensions.CATSUP_textures; j.extensionsUsed = j.extensionsUsed.filter((x: string) => x !== "CATSUP_textures"); });
    const doc = readCatsup(legacy);
    eq(doc.textures.length, 2, "两个材质各一行"); for (const t of doc.textures) eq(JSON.stringify(t.sizeM), "[1,1]");
    assert(doc.materials[0].channels!.color[0] !== doc.materials[1].channels!.color[0], "身份各是各的");
  });
});

describe("贴图表：写盘（门 3 / 4 / 5）", () => {
  it("写出来、读回去、再写：两次字节相等（带共用的图 / 分层的画 / 不认识的种类 / 行里不认识的键）", () => {
    const { s } = sharedScene();
    s.addTexture({ guid: mintGuid(), name: "分层", value: COLOR_VALUE, content: { kind: "layered", ora: new Uint8Array([80, 75, 3, 4]) }, sizeM: [1, 1] });
    s.addTexture({ guid: mintGuid(), name: "全息", value: { kind: "hologram" }, content: { kind: "other", raw: { json: { kind: "hologram", data: { bufferView: 7 }, note: "x" }, views: new Map([[7, new Uint8Array([1, 2, 3])]]) } }, layout: { definition: mintGuid(), uvSet: 0 }, extra: { json: { future: { bufferView: 3 } }, views: new Map([[3, new Uint8Array([9])]]) } });
    for (const sc of [scenePainted(), s]) {
      const a = writeCatsup(documentFromScene(sc, "t")), b = writeCatsup(readCatsup(a));
      assert(sameBytes(a, b), "两次一样");
    }
  });
  it("不带贴图的文件：没有 CATSUP_textures；材质扩展拍子 1.3、不写 channels / sizeM", () => {
    let s = new Scene(sceneBox());
    s = applyOp(s, { op: "addMaterial", name: "红", color: [1, 0, 0] }).scene;
    const j = jsonOf(writeCatsup(documentFromScene(s, "t")));
    assert(!("CATSUP_textures" in j.extensions) && !j.extensionsUsed.includes("CATSUP_textures"), "不写扩展");
    const me = j.materials[0].extensions.CATSUP_material;
    eq(me.version, 1); eq(me.minor, 3); assert(!("channels" in me) && !("sizeM" in me), JSON.stringify(me));
    assert(!("textures" in j) && !("images" in j), "标准那一半也没有图");
  });
  it("带贴图的文件：一行一条、字节只存一份（表那一行和 images[] 指同一个 bufferView）、材质扩展 sizeM = 回声", () => {
    const j = jsonOf(writeCatsup(documentFromScene(scenePainted(), "t"))), list = j.extensions.CATSUP_textures.list;
    eq(j.extensions.CATSUP_textures.version, 1); assert(j.extensionsUsed.includes("CATSUP_textures"));
    eq(list.length, 1); eq(list[0].content.kind, "image"); eq(JSON.stringify(list[0].value), '{"kind":"color"}');
    const textured = j.materials.find((m: AnyJson) => m.pbrMetallicRoughness.baseColorTexture);
    const img = j.images[j.textures[textured.pbrMetallicRoughness.baseColorTexture.index].source];
    eq(img.bufferView, list[0].content.bytes.bufferView, "同一个 bufferView");
    eq(JSON.stringify(textured.extensions.CATSUP_material.channels), JSON.stringify({ color: [list[0].guid] }));
    eq(JSON.stringify(textured.extensions.CATSUP_material.sizeM), "[0.5,0.5]", "给老读者的回声");
  });
  it("导出模型的字节不变（冻在改之前的样本；只对齐 generator 里的版本号）", () => {
    for (const [name, opts] of [["painted-all", { textures: true, lines: true }], ["painted-notex", { textures: false, lines: true }]] as const) {
      const want = decodeGlb(new Uint8Array(readFileSync(join("test", "fixtures", "export-model", `${name}.glb`)))) as unknown as { json: AnyJson; bin: Uint8Array };
      const got = decodeGlb(writeGltfModel(documentFromScene(scenePainted(), "t"), opts)) as unknown as { json: AnyJson; bin: Uint8Array };
      assert(sameBytes(got.bin, want.bin), `${name}：二进制逐字节一样`);
      got.json.asset.generator = want.json.asset.generator;
      eq(JSON.stringify(got.json), JSON.stringify(want.json), `${name}：JSON 一样`);
    }
  });
});

describe("贴图表：材质扩展里不认识的东西原样带回（Fable 11-10 审 1-0½ 补）", () => {
  it("材质扩展里塞一个不认识的键（还引用一段字节）+ 带图的材质多一个不认识的通道名：读 → 改颜色 → 写 → 读，都还在", () => {
    const base = writeCatsup(documentFromScene(scenePainted(), "t")), j0 = jsonOf(base);
    const row = j0.extensions.CATSUP_textures.list[0], tg = row.guid, bv = row.content.bytes.bufferView;
    const bytes = patched(base, (j) => { for (const m of j.materials) { const e = m.extensions.CATSUP_material; e.future = { knob: 3, blob: { bufferView: bv } }; if (e.channels) e.channels.sheen = [tg]; } });
    const doc = readCatsup(bytes), s = sceneFromDocument(doc);
    for (let i = 0; i < s.materials.length; i++) s.materials[i] = { ...s.materials[i], color: [0.1, 0.2, 0.3] };   // 改颜色（材质不可变：换一个对象）
    const out = writeCatsup(documentFromScene(s, "t", doc)), j = jsonOf(out), back = readCatsup(out);
    const blobOf = (jj: AnyJson, bytesIn: Uint8Array, v: number): Uint8Array => { const g = decodeGlb(bytesIn) as unknown as { bin: Uint8Array }; const b = jj.bufferViews[v]; return g.bin.subarray(b.byteOffset ?? 0, (b.byteOffset ?? 0) + b.byteLength); };
    for (const m of j.materials) {
      const e = m.extensions.CATSUP_material;
      eq(e.future?.knob, 3, "不认识的键还在");
      assert(sameBytes(blobOf(j, out, e.future.blob.bufferView), TINY_PNG), "它引用的字节也跟着（号换了、内容一样）");
    }
    const textured = j.materials.find((m: AnyJson) => m.extensions.CATSUP_material.channels);
    eq(JSON.stringify(textured.extensions.CATSUP_material.channels), JSON.stringify({ color: [tg], sheen: [tg] }), "不认识的通道名还在");
    for (const m of back.materials) { assert(!!m.extra, "再读还在"); eq(m.color.map((c) => c.toFixed(3)).join(), "0.100,0.200,0.300", "颜色确实改了"); }
    eq(JSON.stringify(back.materials.find((m) => m.channels)!.channels), JSON.stringify({ color: [tg], sheen: [tg] }));
  });
});

describe("贴图表：两个材质共用一张图", () => {
  it("存盘重开还是同一张：表里一行、两个材质指同一个 GUID；标准那一半一条 image、两个材质用同一个 texture；导出模型也是一条", () => {
    const { s, tex } = sharedScene(), bytes = writeCatsup(documentFromScene(s, "t")), back = sceneFromDocument(readCatsup(bytes));
    eq(back.textures.size, 1); eq(back.materials.map((m) => m.channels!.color[0]).join(), `${tex.guid},${tex.guid}`);
    eq(back.colorMapOf(back.materials[0]), back.colorMapOf(back.materials[1]), "那个口给同一个对象");
    const j = jsonOf(bytes);
    eq(j.images.length, 1); eq(j.materials[0].pbrMetallicRoughness.baseColorTexture.index, j.materials[1].pbrMetallicRoughness.baseColorTexture.index);
    eq(jsonOf(writeGltfModel(documentFromScene(s, "t"), { textures: true, lines: false })).images.length, 1, "导出模型");
  });
});

describe("贴图表：读的规矩", () => {
  const base = (): Uint8Array => writeCatsup(documentFromScene(scenePainted(), "t"));
  it("不认识的 content.kind：整行和它指着的字节原样带回；readNotes 记一笔", () => {
    const s = scenePainted(), raw = { kind: "hologram", data: { bufferView: 2 } };
    s.addTexture({ guid: mintGuid(), name: "全息", value: { kind: "depth" }, content: { kind: "other", raw: { json: raw, views: new Map([[2, new Uint8Array([4, 5, 6])]]) } }, sizeM: [1, 1], extra: { json: { tag: "x" }, views: new Map() } });
    const doc = readCatsup(writeCatsup(documentFromScene(s, "t"))), t = doc.textures.find((x) => x.name === "全息")!;
    assert(t.content.kind === "other");
    const c = t.content as unknown as { raw: { json: AnyJson; views: Map<number, Uint8Array> } };
    eq(c.raw.json.kind, "hologram"); eq([...c.raw.views.get(c.raw.json.data.bufferView)!].join(), "4,5,6", "字节跟着");
    eq(JSON.stringify(t.value), '{"kind":"depth"}'); eq((t.extra!.json as AnyJson).tag, "x", "行里不认识的键");
    eq(doc.readNotes?.unknownTextureKinds, 1);
  });
  it("sizeM 和 layout 都有 / 都没有：读取失败，说是哪一行", () => {
    assert(threw(() => readCatsup(patched(base(), (j) => { j.extensions.CATSUP_textures.list[0].layout = { definition: "x", uvSet: 0 }; })), /exactly one of sizeM \/ layout/), "都有");
    assert(threw(() => readCatsup(patched(base(), (j) => { delete j.extensions.CATSUP_textures.list[0].sizeM; })), /list\[0\].*exactly one/), "都没有");
    assert(threw(() => readCatsup(patched(base(), (j) => { j.extensions.CATSUP_textures.list[0].sizeM = [0, 1]; })), /sizeM must be two numbers > 0/), "尺寸不合法");
  });
  it("channels 指着表里没有的 GUID：这一槽当空的（按底色画）、readNotes 记一笔；不看标准那一半", () => {
    const doc = readCatsup(patched(base(), (j) => { for (const m of j.materials) if (m.extensions.CATSUP_material.channels) m.extensions.CATSUP_material.channels.color = [mintGuid()]; }));
    eq(doc.readNotes?.danglingTextureRefs, 1);
    const s = sceneFromDocument(doc);
    assert(s.materials.every((m) => !s.colorMapOf(m)), "没有材质有图");
    eq(doc.textures.length, 1, "表里那一行还在（成了孤儿）");
  });
  it("贴图表是更新版写的：不拒开；扩展和材质的 channels 原样带回；先按底色显示；不许加贴图 / 清理", () => {
    const bytes = patched(base(), (j) => { j.extensions.CATSUP_textures.version = 2; j.extensions.CATSUP_textures.future = 1; });
    const doc = readCatsup(bytes);
    eq(doc.readNotes?.texturesTooNew?.major, 2); eq(doc.textures.length, 0);
    const s = sceneFromDocument(doc);
    assert(s.texturesFrozen !== null && s.materials.every((m) => !s.colorMapOf(m)), "冻住、按底色");
    assert(threw(() => applyOp(s, { op: "addTexture", guid: mintGuid(), name: "x", mimeType: "image/png", bytes: PNG2, sizeM: [1, 1] })), "不许加");
    let rejected = false; try { applyOp(s, { op: "purgeTextures", textures: [] }); } catch (e) { rejected = e instanceof OpRejected; } assert(rejected, "不许清理（提示行说原因）");
    const j = jsonOf(writeCatsup(documentFromScene(s, "t", doc))), jIn = jsonOf(bytes);
    eq(JSON.stringify(j.extensions.CATSUP_textures.list.map((r: AnyJson) => r.guid)), JSON.stringify(jIn.extensions.CATSUP_textures.list.map((r: AnyJson) => r.guid)), "表原样带回");
    eq(j.extensions.CATSUP_textures.version, 2); eq(j.extensions.CATSUP_textures.future, 1);
    const ch = (jj: AnyJson): string => JSON.stringify(jj.materials.map((m: AnyJson) => m.extensions.CATSUP_material.channels ?? null));
    eq(ch(j), ch(jIn), "材质的 channels 原样带回");
  });
});

describe("贴图表：清理（家规：清材质不顺手清图）", () => {
  it("清掉材质之后贴图还在、是孤儿；purgeTextures 能清它、不能清被指着的；一步撤销", () => {
    let s = new Scene(sceneBox());
    const a = imageRow("甲", TINY_PNG), b = imageRow("乙", PNG2);
    for (const t of [a, b]) s = applyOp(s, { op: "addTexture", guid: t.guid, name: t.name, mimeType: "image/png", bytes: t.content.kind === "image" ? t.content.bytes : TINY_PNG, sizeM: [1, 2] }).scene;
    s = applyOp(s, { op: "addMaterial", name: "用甲", color: [1, 1, 1], channels: { color: [a.guid] } }).scene;
    s = applyOp(s, { op: "addMaterial", name: "用乙", color: [1, 1, 1], channels: { color: [b.guid] } }).scene;
    s = applyOp(s, { op: "purgeMaterials", materials: [0] }).scene;
    eq(s.textures.size, 2, "图留下");
    const c = census(s);
    eq(JSON.stringify(unusedTextures(c)), JSON.stringify([a.guid]), "甲是孤儿、乙还被指着");
    eq(c.textures.find((t) => t.guid === b.guid)!.materials, 1);
    assert(threw(() => applyOp(s, { op: "purgeTextures", textures: [b.guid] }), /还有人用/), "被指着的不许删");
    const h = new History<null>(s);
    s = h.commit(s, { op: "purgeTextures", textures: [a.guid] }).scene;
    eq([...s.textures.keys()].join(), b.guid);
    s = h.undo()!.scene;
    eq(s.textures.size, 2, "撤销回来");
  });
});

describe("贴图表：跨文件粘贴", () => {
  /** 根里摆一份组件，组件的一张面涂带图的材质。 */
  function source(): { s: Scene; tex: string } {
    const s = new Scene(sceneBox(1, 1)), t = imageRow("砖", TINY_PNG);
    s.addTexture(t);
    const m = s.addMaterial({ name: "砖墙", color: [1, 1, 1], channels: { color: [t.guid] } });
    const d = s.mintDef("墙", sceneBox(1, 1)), k = s.brep(d.id).kernel;
    k.setFaceMaterial([k.faces()[0].id], s.slotFor(d.id, m));
    s.mintInstance(s.root, null, d.id, IDENTITY);
    return { s, tex: t.guid };
  }
  const copyRootInst = (s: Scene) => extract(s, ROOT_CONTEXT, { faces: [], edges: [] }, [{ kind: "instance", instance: [...s.def(s.root).instances.values()][0].id }])!;
  const pasteInto = (t: Scene, p: ReturnType<typeof copyRootInst>): Scene => { const l = localize(p, IDENTITY); return applyOp(t, { op: "paste", at: root(t), instances: l.instances!, materials: l.materials!, ...(l.textures ? { textures: l.textures } : {}), closure: l.closure! }).scene; };
  it("贴图跟着材质走、GUID 不变；再贴一次不多一行", () => {
    const w = source(), p = copyRootInst(w.s);
    eq((p.textures ?? []).map((t) => t.guid).join(), w.tex, "载荷里带着");
    let t = pasteInto(new Scene(sceneBox(2, 2)), p);
    eq([...t.textures.keys()].join(), w.tex, "同一个 GUID");
    const m = t.materials.find((x) => x.name === "砖墙")!;
    assert(sameBytes(t.colorMapOf(m)!.content.bytes, TINY_PNG), "图对");
    t = pasteInto(t, p);
    eq(t.textures.size, 1, "再贴不多");
  });
  it("目标里已经有同一个 GUID、内容不一样：走现有的撞车询问（贴图自己成一行）", () => {
    const w = source(), p = copyRootInst(w.s), t = new Scene(sceneBox(2, 2));
    t.addTexture({ ...w.s.textures.get(w.tex)!, content: { kind: "image", mimeType: "image/png", bytes: PNG2 } });
    const c = pasteConflict(t, p);
    assert(!!c && c.rows.some((r) => r.kind === "texture" && r.name === "砖"), JSON.stringify(c?.rows.map((r) => r.kind)));
  });
});

describe("贴图表：第一次把一张图涂到面上（撤销 / 重做）", () => {
  it("一步撤干净（贴图和材质都没了）；重做回来 GUID 和撤销前一样", () => {
    let s = new Scene(sceneBox());
    const k = s.brep(s.root).kernel, guid = mintGuid(), h = new History<null>(s);
    s = h.commit(s, { op: "addTexture", guid, name: "格子", mimeType: "image/png", bytes: TINY_PNG, sizeM: [0.5, 0.5] }).scene;
    s = h.commit(s, { op: "addMaterial", name: "格子", color: [1, 1, 1], channels: { color: [guid] } }, true).scene;
    s = h.commit(s, { op: "paintFaces", at: root(s), faces: [faceKey(k, k.faces()[0].id)], material: 0 }, true).scene;
    const matGuid = s.materials[0].guid;
    s = h.undo()!.scene;
    eq(s.textures.size, 0); eq(s.materials.length, 0);
    s = h.redo(s)!.scene;
    eq([...s.textures.keys()].join(), guid, "贴图 GUID 一样"); eq(s.materials[0].guid, matGuid, "材质 GUID 一样");
    assert(!!s.colorMapOf(s.materials[0]));
  });
});

describe("贴图表：守卫", () => {
  const walk = (d: string, out: string[] = []): string[] => { for (const n of readdirSync(d)) { const p = join(d, n); if (statSync(p).isDirectory()) { if (p !== join("src", "paint", "kernel")) walk(p, out); } else if (/\.ts$/.test(n)) out.push(p); } return out; };
  const files = walk("src");
  it("材质里不许直接装着图：没有 .texture 读材质、没有 texture: { … } 的旧形状；Material / MaterialDoc 没有 texture 字段", () => {
    const hits: string[] = [];
    for (const f of files) {
      const three = f.startsWith(join("src", "minccino", "providers", "three"));   // three 的渲染目标也叫 .texture，那边只查读材质的写法
      for (const line of readFileSync(f, "utf8").split("\n")) {
        if (/\b(m|mat|material|mF|mB|matRef)\??\.texture\b/.test(line) || /\btexture\??\s*:\s*\{\s*(readonly\s+)?mimeType/.test(line) || (!three && /\.texture\b/.test(line))) hits.push(`${f}: ${line.trim().slice(0, 80)}`);
      }
    }
    eq(hits.length, 0, hits.join(" | "));
    const ifaceHas = (src: string, name: string): boolean => { const i = src.indexOf(`export interface ${name} `); const j = src.indexOf("}", i); return /\btexture\??\s*:/.test(src.slice(i, j)); };
    assert(!ifaceHas(readFileSync(join("src", "scene", "scene.ts"), "utf8"), "Material"), "Material");
    assert(!readFileSync(join("src", "format", "document.ts"), "utf8").includes("ImageAsset"), "ImageAsset 退役");
  });
  it("往贴图表里放行只经 Scene.addTexture（B′：那里拦「sizeM 和 layout 正好一个」）：src 里别处没有 textures.set(", () => {
    const hits: string[] = [];
    for (const f of files) if (f !== join("src", "scene", "scene.ts")) for (const line of readFileSync(f, "utf8").split("\n")) if (/textures\.set\(/.test(line)) hits.push(`${f}: ${line.trim().slice(0, 70)}`);
    eq(hits.length, 0, hits.join(" | "));
    const sceneSrc = readFileSync(join("src", "scene", "scene.ts"), "utf8");
    eq((sceneSrc.match(/textures\.set\(/g) ?? []).length, 1, "scene.ts 里只有 addTexture 那一处");
  });
  it("删贴图只有 purgeTextures 那一行", () => {
    const hits: string[] = [];
    for (const f of files) for (const line of readFileSync(f, "utf8").split("\n")) if (/textures\.(delete|clear)\(/.test(line)) hits.push(`${f}: ${line.trim().slice(0, 70)}`);
    eq(hits.length, 1, hits.join(" | "));
    assert(hits[0].startsWith(join("src", "editor", "ops.ts")) && hits[0].includes("purgeTextures"), hits[0]);
  });
  it("「这个材质用哪张图」只经那个口（colorMapIn / Scene.colorMapOf）：别处不读颜色那一槽", () => {
    const allowed = new Set([join("src", "format", "document.ts"), join("src", "format", "write.ts")]);   // 口本身 / 给老读者的 sizeM 回声
    const hits: string[] = [];
    for (const f of files) if (!allowed.has(f)) for (const line of readFileSync(f, "utf8").split("\n")) if (/channels\??\.(color|\[COLOR_CHANNEL\])\??\[/.test(line) || /channels\??\.\[COLOR_CHANNEL\]\??\[/.test(line)) hits.push(`${f}: ${line.trim().slice(0, 70)}`);
    eq(hits.length, 0, hits.join(" | "));
  });
});

describe("平铺的画（CATSUP_textures 1.2，施工单二十一第 3 刀）", () => {
  it("颜色那一槽的三个问法互斥：原图 + sizeM = colorMapIn；分层 + layout = paintIn；分层 + sizeM（没有 layout）= tiledPaintIn；不认识的种类 = 三个都没有", () => {
    const g = () => mintGuid(), ora = new Uint8Array([80, 75, 3, 4]);
    const rows: [string, TextureDoc][] = [
      ["image", { guid: g(), name: "图", value: COLOR_VALUE, content: { kind: "image", mimeType: "image/png", bytes: TINY_PNG }, sizeM: [1, 1] }],
      ["paint", { guid: g(), name: "画", value: COLOR_VALUE, content: { kind: "layered", ora }, layout: { definition: g(), uvSet: g() } }],
      ["tiled", { guid: g(), name: "瓦", value: COLOR_VALUE, content: { kind: "layered", ora }, sizeM: [0.5, 0.25] }],
      ["tiledNew", { guid: g(), name: "新建还没存", value: COLOR_VALUE, content: { kind: "layered", ora: null }, sizeM: [1, 1] }],
      ["other", { guid: g(), name: "更新版的", value: COLOR_VALUE, content: { kind: "other", raw: { json: { kind: "voxel" }, views: new Map() } }, sizeM: [1, 1] }],
      ["badLayout", { guid: g(), name: "layout 形状不认识", value: COLOR_VALUE, content: { kind: "layered", ora }, layout: 7 }],
    ];
    const table = new Map(rows.map(([, t]) => [t.guid, t]));
    const want: Record<string, string> = { image: "color", paint: "paint", tiled: "tiled", tiledNew: "tiled", other: "", badLayout: "" };
    for (const [name, t] of rows) {
      const m = { channels: { color: [t.guid] } };
      const got = [colorMapIn(table, m) ? "color" : "", paintIn(table, m) ? "paint" : "", tiledPaintIn(table, m) ? "tiled" : ""].filter(Boolean);
      assert(got.length <= 1, `${name}：三个问法里有 ${got.length} 个答是（${got.join("、")}）`);
      eq(got[0] ?? "", want[name], name);
    }
    eq(JSON.stringify(tiledPaintIn(table, { channels: { color: [rows[2][1].guid] } })!.sizeM), "[0.5,0.25]", "带出 sizeM");
    eq(tiledPaintIn(table, {}), null, "没有颜色那一槽");
  });
  it("组合表每一格（数据契约 sizeM 那一条下面的表）：内容 × 键；正好一个键而且认识才有意思，三个问法各答各的；能写的格写回去键原样在；两个都有 / 都没有 = 进场景就抛、写文件也抛（读那一头拒开另有一条）", () => {
    const g = () => mintGuid(), ora = new Uint8Array([80, 75, 3, 4]);
    const contents: Record<string, TextureDoc["content"]> = { image: { kind: "image", mimeType: "image/png", bytes: TINY_PNG }, layered: { kind: "layered", ora }, other: { kind: "other", raw: { json: { kind: "voxel" }, views: new Map() } } };
    const layoutOk = (): unknown => ({ definition: g(), uvSet: g() });
    const keys: Record<string, () => Partial<TextureDoc>> = { sizeM: () => ({ sizeM: [0.5, 0.25] }), layoutOk: () => ({ layout: layoutOk() }), layoutOdd: () => ({ layout: 7 }), both: () => ({ sizeM: [1, 1], layout: layoutOk() }), neither: () => ({}) };
    // 每格的意思：color = 自由的图、paint = 铺在坐标上的画、tiled = 平铺的画、"" = 没有意思（三个都答不是 = 按底色）、fail = 读取失败
    const want: Record<string, Record<string, string>> = {
      image: { sizeM: "color", layoutOk: "", layoutOdd: "", both: "", neither: "" },
      layered: { sizeM: "tiled", layoutOk: "paint", layoutOdd: "", both: "", neither: "" },
      other: { sizeM: "", layoutOk: "", layoutOdd: "", both: "", neither: "" },
    };
    let cells = 0;
    for (const [cName, content] of Object.entries(contents)) for (const [kName, mk] of Object.entries(keys)) {
      const row = { guid: g(), name: `${cName}+${kName}`, value: COLOR_VALUE, content, ...mk() } as TextureDoc;
      const table = new Map([[row.guid, row]]), m = { channels: { color: [row.guid] } };
      const got = [colorMapIn(table, m) ? "color" : "", paintIn(table, m) ? "paint" : "", tiledPaintIn(table, m) ? "tiled" : ""].filter(Boolean);
      assert(got.length <= 1, `${row.name}：三个问法里有 ${got.length} 个答是`);
      eq(got[0] ?? "", want[cName][kName], `${row.name}：三个问法的答案`);
      const sc = new Scene(sceneBox(1, 1));
      if (kName === "both" || kName === "neither") {
        // 坏的两格：第一道 = 场景入口抛、场景里没有它；第二道 = 绕过场景直接塞进文档去写，写文件也抛、说是哪一行
        let e1: unknown = null; try { sc.addTexture(row); } catch (e) { e1 = e; }
        assert(e1 instanceof Error && e1.message.includes(row.guid) && /could not be opened/.test(e1.message), `${row.name}：进场景就抛（${String(e1)}）`);
        eq(sc.textures.has(row.guid), false, `${row.name}：场景里没有它`);
        const doc = documentFromScene(sc, "cell");
        doc.textures.push(row);
        let e2: unknown = null; try { writeCatsup(doc); } catch (e) { e2 = e; }
        assert(e2 instanceof Error && e2.message.includes(row.name) && /could not be opened/.test(e2.message), `${row.name}：写文件也抛、说是哪一行（${String(e2)}）`);
        cells++; continue;
      }
      // 能写的格：写进文件、读回来，两个键原样
      sc.addTexture(row);
      let err: unknown = null, back: TextureDoc | undefined;
      try { back = readCatsup(writeCatsup(documentFromScene(sc, "cell"))).textures.find((t) => t.guid === row.guid); } catch (e) { err = e; }
      assert(!err && back, `${row.name}：读得回来（${String(err)}）`);
      eq(JSON.stringify(back!.sizeM ?? null), JSON.stringify(row.sizeM ?? null), `${row.name}：sizeM 原样`);
      eq(JSON.stringify(back!.layout ?? null), JSON.stringify(row.layout ?? null), `${row.name}：layout 原样`);
      cells++;
    }
    eq(cells, 15, "三种内容 × 五种键 = 15 格都走到");
  });
  it("性质：随机从合法的口造行（导入原图、开始画、平铺的画），中间夹着随机的坏行（两个键都有 / 都没有：必须在入口抛、场景不变）；凡是写得出来的贴图表这一版都读得回、两个键原样（v0.19.60 的读者那一半 = scripts/old-reader-check.mjs 的随机场景）", () => {
    let st = 7;
    const R = (): number => (st = (Math.imul(st, 1664525) + 1013904223) >>> 0) / 4294967296;
    let refused = 0, written = 0;
    for (let i = 0; i < 60; i++) {
      let s = new Scene(sceneBox(1, 1));
      for (let k = 0, n = 1 + Math.floor(R() * 5); k < n; k++) {
        const r = R(), guid = mintGuid();
        if (r < 0.3) s = applyOp(s, { op: "addTexture", guid, name: `图${k}`, mimeType: "image/png", bytes: TINY_PNG, sizeM: [0.1 + R(), 0.1 + R()] }).scene;
        else if (r < 0.6) s.addTexture({ guid, name: `瓦${k}`, value: COLOR_VALUE, content: { kind: "layered", ora: new Uint8Array([80, 75, 3, 4, k]) }, sizeM: [0.1 + R(), 0.1 + R()] });
        else if (r < 0.8) s.addTexture({ guid, name: `画${k}`, value: COLOR_VALUE, content: { kind: "layered", ora: new Uint8Array([80, 75, 3, 4, k]) }, layout: { definition: mintGuid(), uvSet: mintGuid() } });
        else {
          const before = s.textures.size, both = R() < 0.5;
          let threw = false;
          try { s.addTexture({ guid, name: `坏${k}`, value: COLOR_VALUE, content: { kind: R() < 0.5 ? "layered" : "image", ora: new Uint8Array([1]), mimeType: "image/png", bytes: TINY_PNG } as TextureDoc["content"], ...(both ? { sizeM: [1, 1], layout: { definition: mintGuid(), uvSet: mintGuid() } } : {}) }); } catch { threw = true; }
          assert(threw, `第 ${i} 份第 ${k} 行：坏行（${both ? "两个都有" : "两个都没有"}）在入口被拒`);
          eq(s.textures.size, before, "场景不变"); refused++;
        }
      }
      const doc = readCatsup(writeCatsup(documentFromScene(s, `p${i}`)));
      eq(doc.textures.length, s.textures.size, `第 ${i} 份：行数一样`);
      for (const t of doc.textures) { const o = s.textures.get(t.guid)!; eq(JSON.stringify([t.sizeM ?? null, t.layout ?? null]), JSON.stringify([o.sizeM ?? null, o.layout ?? null]), `第 ${i} 份「${t.name}」两个键原样`); }
      written++;
    }
    assert(refused >= 5 && written === 60, `拒了 ${refused} 次、写了 ${written} 份`);
  });
  it("冻的样本 tiledPaint.glb（每个有它的目录）：读出来材质「瓦」是平铺的画、sizeM 对、合成图对得上材质颜色、分层字节在；读 → 写 → 读两次写出的字节一样", () => {
    const dirs = listCorpusDirs().filter((d: string) => existsSync(join(fixtureDir(d), "tiledPaint.glb")));
    assert(dirs.length >= 1, "至少一个目录有这个样本");
    for (const d of dirs) {
      const bytes = readFileSync(join(fixtureDir(d), "tiledPaint.glb"));
      const s = sceneFromDocument(readCatsup(bytes));
      const m = s.materials.find((x) => x.name === "瓦")!;
      const tp = s.tiledPaintOf(m);
      assert(tp !== null, `${d}：材质「瓦」是平铺的画`);
      eq(s.colorMapOf(m), null, `${d}：不是原图`);
      eq(JSON.stringify(tp!.sizeM), "[0.5,0.125]", `${d}：sizeM`);
      assert(tp!.textureDoc.content.kind === "layered" && (tp!.textureDoc.content.ora?.length ?? 0) > 0, `${d}：分层字节在`);
      assert(compositeFits(tp!.textureDoc, m.color), `${d}：合成图对得上材质颜色`);
      const w1 = writeCatsup(documentFromScene(s, "tiledPaint")), w2 = writeCatsup(documentFromScene(sceneFromDocument(readCatsup(w1)), "tiledPaint"));
      eq(w1.length, w2.length, `${d}：两次写出一样长`);
      assert(w1.every((v, i) => v === w2[i]), `${d}：两次写出逐字节一样`);
    }
  });
});

// 没用到也编译：类型守在这里
void (null as unknown as CatsupDocument); void newDocument;

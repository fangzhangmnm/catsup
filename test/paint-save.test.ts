// 画存进文件：钉点和编码（贴图主线 1-8b，施工单 ai-docs/20261111-paint-workorders-13.md「不能破的规矩」）。created 2026-11-11 by Claude Opus 5.5
// PaintSaver（src/paint/save.ts）这一层：真的画板登记处 + 内核软件显卡 + 内核编码 / 解码（zip、DOMParser 用内核的垫片，架子 paint-save-kit.ts）。
// 会话那一层（存盘排队、算不算改过、提示行）在浏览器探针 probe-paint-save 里。
import { describe, it, eq, assert } from "./runner.mjs";
import "./paint-save-kit.ts";
import { decodeOra, decodePng, dataPrint, layeredData } from "./paint-save-kit.ts";
import type { Op } from "../src/editor/ops.ts";
import { PaintSaver, ZipMissingError } from "../src/paint/save.ts";
import { documentFromScene, readCatsup, sceneFromDocument, writeCatsup } from "../src/format/index.ts";
import { compositeFits, type CatsupDocument, type TextureDoc } from "../src/format/document.ts";
import { SCENE_DOCS } from "./format-scenes.ts";
import { rig, rng } from "./paint-undo-kit.ts";

const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
const rowOf = (doc: CatsupDocument, tex: string): TextureDoc => doc.textures.find((t) => t.guid === tex)!;
const oraOf = (t: TextureDoc): Uint8Array => (t.content as { ora: Uint8Array }).ora;
/** 两张画，各灌一份多层的、各画一笔擦一笔。 */
function painted(seed = 3) {
  const r = rig(2), rnd = rng(seed), texs = r.defs.map((d) => r.startPaint(d, 60));
  texs.forEach((t, i) => { const b = r.boards.ensure(r.cur(), t); r.boards.load(t, layeredData(b.width, b.height, seed + i)); });
  for (const t of texs) { r.stroke([t], rnd); r.stroke([t], rnd, true); }
  const saver = new PaintSaver({ boards: r.boards, wroteWith: "catsup test" });
  const save = (mode: "save" | "snapshot" = "save") => saver.freeze(documentFromScene(r.cur(), "t"), r.cur(), mode);
  return { r, rnd, texs, saver, save };
}

describe("画存进文件：来回、钉点（1-8b）", () => {
  it("来回一格不差：几层、透明、半透明、藏着的层、橡皮擦过的洞——存了再解开，每层逐字节相同；合成图在、记号对得上", async () => {
    const { r, texs, save } = painted();
    const before = texs.map((t) => dataPrint(r.boards.get(t)!.wp.exportData()));
    const doc = await save().finish();
    for (const [i, t] of texs.entries()) {
      const row = rowOf(doc, t);
      eq(dataPrint(await decodeOra(oraOf(row))), before[i], `第 ${i + 1} 张逐层逐字节`);
      const place = r.cur().materials.find((m) => m.channels && Object.values(m.channels).some((g) => g.includes(t)))!;
      assert(compositeFits(row, place.color), `第 ${i + 1} 张的合成图记号对得上`);
    }
    r.boards.disposeAll();
  });
  it("没动过再存一遍：文件逐字节相同；读回来（冷的、没有画板）再存：还是逐字节相同", async () => {
    const { r, save } = painted(5);
    const a = writeCatsup(await save().finish()), b = writeCatsup(await save().finish());
    assert(same(a, b), "热的、没动过：同一份字节");
    const s2 = sceneFromDocument(readCatsup(a)), cold = new PaintSaver({ boards: { get: () => undefined }, wroteWith: "catsup test" });
    const c = writeCatsup(await cold.freeze(documentFromScene(s2, "t"), s2, "save").finish());
    assert(same(a, c), "冷的原字节带回");
    r.boards.disposeAll();
  });
  it("钉在同一刻：钉完之后（编码之前）再画一笔、挪一个点，存出去的是钉的那一刻；再存一次才带上", async () => {
    const { r, rnd, texs, save } = painted(7);
    const t = texs[0], b = r.boards.get(t)!;
    const atPin = dataPrint(b.wp.exportData()), shown = b.composeBytes()!, mesh0 = JSON.stringify(documentFromScene(r.cur(), "t").definitions.map((d) => d.mesh ?? null));
    const frozen = save();
    r.stroke([t], rnd);
    const def = r.defs[0], k = r.cur().mesh(def).kernel, v = k.verts()[0], p = k.pt(v);
    r.commit({ op: "meshMove", def, moves: [{ v, to: { x: p.x, y: p.y, z: p.z + 0.2 } }] } as Op);
    const doc = await frozen.finish(), row = rowOf(doc, t);
    eq(dataPrint(await decodeOra(oraOf(row))), atPin, "分层字节 = 钉的那一刻");
    const png = await decodePng(row.composite!.png);
    assert(png.w === b.width && same(new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength), new Uint8Array(shown.buffer, shown.byteOffset, shown.byteLength)), "合成图 = 钉的那一刻显示的那张，逐字节");
    eq(JSON.stringify(doc.definitions.map((d) => d.mesh ?? null)), mesh0, "模型 = 钉的那一刻");
    assert(JSON.stringify(documentFromScene(r.cur(), "t").definitions.map((d) => d.mesh ?? null)) !== mesh0, "挪点真的改了模型（不然上一条白测）");
    const later = rowOf(await save().finish(), t);
    eq(dataPrint(await decodeOra(oraOf(later))), dataPrint(b.wp.exportData()), "再存一次带上新的那一笔");
    assert(dataPrint(b.wp.exportData()) !== atPin, "那一笔真的改了东西");
    r.boards.disposeAll();
  });
  it("编码中途抛：这一轮整个失败、说是哪张画；画板一个字节不动；之后照常能存", async () => {
    const { r, texs, saver, save } = painted(9);
    const prints = texs.map((t) => dataPrint(r.boards.get(t)!.wp.exportData()));
    const ok = saver.encodeOra;
    saver.encodeOra = () => Promise.reject(new Error("注入的毛病"));
    let err = "";
    try { await save().finish(); } catch (e) { err = String(e); }
    assert(/painting "画" .* could not be encoded: 注入的毛病/.test(err), err);
    eq(texs.map((t) => dataPrint(r.boards.get(t)!.wp.exportData())).join("\n"), prints.join("\n"), "画板没动");
    saver.encodeOra = ok;
    const doc = await save().finish();
    eq(dataPrint(await decodeOra(oraOf(rowOf(doc, texs[0])))), prints[0], "之后照常");
    r.boards.disposeAll();
  });
  it("撤销栈存盘前后一样：深度、游标、画的记录不变，撤销照常对", async () => {
    const { r, texs, save } = painted(11);
    const before = [r.h.depth(), r.h.position(), r.paintRecords(texs[0]), r.paintRecords(texs[1])].join(), shot = r.shot();
    await save().finish(); await save().finish();
    eq([r.h.depth(), r.h.position(), r.paintRecords(texs[0]), r.paintRecords(texs[1])].join(), before, "栈没动");
    r.undo(); r.redo();
    eq(r.shot(), shot, "撤一步重做回来逐字节");
    r.boards.disposeAll();
  });
});

describe("统筹审查补的两处（1-8b）", () => {
  it("zip 没加载上：不带画的照常存、字节一样；画全是现成字节（缓存 / 冷的）照常存；有画要编码的才报错、说清原因", async () => {
    const g = globalThis as { zip?: unknown }, zip = g.zip, none = new PaintSaver({ boards: { get: () => undefined }, wroteWith: "catsup test" });
    const plain = Object.entries(SCENE_DOCS).map(([name, mk]) => [name, mk()] as const).filter(([, s]) => !documentFromScene(s, "t").textures.some((t) => t.content.kind === "layered"));   // 同一个场景对象前后各写一次（场景每造一次 GUID 就不一样）
    const want = await Promise.all(plain.map(async ([, s]) => writeCatsup(await none.freeze(documentFromScene(s, "t"), s, "save").finish())));
    const { r, rnd, texs, saver, save } = painted(41);
    const cached = writeCatsup(await save().finish());   // 有 zip：编一次，进缓存
    g.zip = undefined;
    try {
      for (const [i, [name, s]] of plain.entries()) { assert(same(writeCatsup(await none.freeze(documentFromScene(s, "t"), s, "save").finish()), want[i]), `${name}：没有 zip 照常存、字节一样`); }
      assert(same(writeCatsup(await save().finish()), cached), "画全在缓存里：没有 zip 照常存、字节一样");
      const s2 = sceneFromDocument(readCatsup(cached));
      assert(same(writeCatsup(await none.freeze(documentFromScene(s2, "t"), s2, "save").finish()), cached), "冷的（原字节）：没有 zip 照常存");
      r.stroke([texs[0]], rnd);   // 改了一张：这一次要编
      let err: unknown = null; try { await save().finish(); } catch (e) { err = e; }
      assert(err instanceof ZipMissingError && /zip\.js is not loaded/.test((err as Error).message), `要编码的才报错：${String(err)}`);
      void saver;
    } finally { g.zip = zip; }
    r.boards.disposeAll();
  });
  it("一笔画到一半时钉：存出去的合成图逐字节 = 没有这一笔时的合成（只合已落层的）；分层字节也不带它", async () => {
    const { r, texs, save } = painted(43);
    const t = texs[0], b = r.boards.get(t)!;
    const without = b.composeBytes()!, layers = dataPrint(b.wp.exportData());
    const W = b.width, H = b.height, st = b.openStroke(), layerId = b.wp.layerTree!.view().activeId!, px = new Uint8Array(W * H * 4);
    for (let y = 2; y < 40; y++) for (let x = 2; x < 200; x++) { const o = (y * W + x) * 4; px[o] = 250; px[o + 1] = 20; px[o + 2] = 20; px[o + 3] = 255; }
    st.setHostLayers([{ tex: b.wrapLayer({ pixels: px, w: W, h: H, prec: "u8" }), bx: 2, by: 2, bw: 198, bh: 38, layerId, opacity: 1, erase: false, blendMode: "source-over" }]);
    const shown = b.compose()!, shownPx = r.port.readPixels(shown.fbo, 0, 0, W, H);
    assert(!same(new Uint8Array(shownPx.buffer, shownPx.byteOffset, shownPx.byteLength), new Uint8Array(without.buffer, without.byteOffset, without.byteLength)), "显示的那张确实带着这一笔（不然这条白测）");
    const row = rowOf(await save().finish(), t), png = await decodePng(row.composite!.png);
    assert(same(new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.byteLength), new Uint8Array(without.buffer, without.byteOffset, without.byteLength)), "合成图 = 没有这一笔的");
    eq(dataPrint(await decodeOra(oraOf(row))), layers, "分层字节也不带它");
    const again = b.compose()!, againPx = r.port.readPixels(again.fbo, 0, 0, W, H);
    assert(same(new Uint8Array(againPx.buffer, againPx.byteOffset, againPx.byteLength), new Uint8Array(shownPx.buffer, shownPx.byteOffset, shownPx.byteLength)), "存完下一帧显示的照旧带着这一笔");
    st.cancel();
    r.boards.disposeAll();
  });
});

describe("画存进文件：各种画（1-8b）", () => {
  it("不带画的文件：经过存画那一层写出来逐字节一样", async () => {
    const saver = new PaintSaver({ boards: { get: () => undefined }, wroteWith: "catsup test" });
    for (const [name, mk] of Object.entries(SCENE_DOCS)) {
      const s = mk(), doc = documentFromScene(s, "t");
      if (doc.textures.some((t) => t.content.kind === "layered")) continue;
      assert(same(writeCatsup(await saver.freeze(doc, s, "save").finish()), writeCatsup(documentFromScene(s, "t"))), name);
    }
  });
  it("画板比坐标高：多出来的行全空白 = 按坐标的高存（分层和合成图一起裁）；有内容 = 照画板的高", async () => {
    for (const content of [false, true]) {
      const r = rig(1), [t] = r.defs.map((d) => r.startPaint(d, 60)), b = r.boards.ensure(r.cur(), t), uvH = b.height;
      b.follow(b.width, uvH * 2);
      const d = layeredData(b.width, uvH * 2, 13);
      if (content) (d.nodes as unknown as { pixels: { rect: { y: number } } }[])[1].pixels.rect.y = uvH + 10;
      r.boards.load(t, d);
      const row = rowOf(await new PaintSaver({ boards: r.boards, wroteWith: "catsup test" }).freeze(documentFromScene(r.cur(), "t"), r.cur(), "save").finish(), t);
      const want = content ? uvH * 2 : uvH;
      eq((await decodeOra(oraOf(row))).height, want, `${content ? "有内容" : "空白"}：分层的高`);
      eq((await decodePng(row.composite!.png)).h, want, `${content ? "有内容" : "空白"}：合成图的高`);
      r.boards.disposeAll();
    }
  });
  it("新建了还没画过（没有画板、没有字节）：存一份空白的分层（那一套坐标的大小），不存合成图", async () => {
    const r = rig(1), [t] = r.defs.map((d) => r.startPaint(d, 60));
    const row = rowOf(await new PaintSaver({ boards: r.boards, wroteWith: "catsup test" }).freeze(documentFromScene(r.cur(), "t"), r.cur(), "save").finish(), t);
    const d = await decodeOra(oraOf(row)), b = r.boards.ensure(r.cur(), t);
    eq(`${d.width}x${d.height} ${d.nodes.length} 层 ${(d.nodes[0] as { pixels: unknown }).pixels === null ? "空" : "有"}`, `${b.width}x${b.height} 1 层 空`);
    eq(row.composite, undefined, "不存合成图");
    r.boards.disposeAll();
  });
  it("崩溃快照不现编：用缓存里最近一次的；画板比缓存新 = stale", async () => {
    const { r, rnd, texs, saver, save } = painted(17);
    const first = rowOf(await save().finish(), texs[0]);
    let calls = 0; const ok = saver.encodeOra; saver.encodeOra = (d, w) => { calls++; return ok(d, w); };
    const snap1 = save("snapshot");
    eq(snap1.stale, false, "缓存是新的");
    r.stroke([texs[0]], rnd);
    const snap2 = save("snapshot");
    eq(snap2.stale, true, "画了一笔：比缓存新");
    const row = rowOf(await snap2.finish(), texs[0]);
    assert(same(oraOf(row), oraOf(first)), "用的是缓存里那份");
    eq(calls, 0, "没现编");
    await saver.refresh(r.cur());
    eq(save("snapshot").stale, false, "refresh 之后缓存跟上了");
    r.boards.disposeAll();
  });
});

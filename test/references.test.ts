// CATSUP_references 参考窗牌组（契约 §5.8）+ desk 1.1 refPanel：@internal/reference-window 的目录 `.catsup/references/` 原样进 glb；
// 空牌组不写；major 比本版新 → 不拒开、原字节带回；minor 新 → 提示一次；未知键直通；坏条目拒开（不静默丢卡）。
// 最后一条 = 跨库契约：读出来的目录交给库 0.5.0 的 decodeDeck，三张卡原样回来（format 层自己不懂清单）。created 2026-10-25 by Claude Opus 5.5
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup, FORMAT } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { docReferenced } from "./format-scenes.ts";
import { decodeDeck } from "@internal/reference-window/deck";

const fresh = () => newDocument(new Kernel().toBrep(), "t");
const jsonOf = (bytes: Uint8Array): { json: any; bin: Uint8Array } => decodeGlb(bytes) as { json: any; bin: Uint8Array };
const filesOf = (d: { references: { files: { path: string; mimeType: string; bytes: Uint8Array }[] } }): string => JSON.stringify(d.references.files.map((f) => [f.path, f.mimeType, [...f.bytes]]));

describe("CATSUP_references 参考窗牌组", () => {
  it("空牌组：不写扩展、extensionsUsed 不列它；desk 没开过窗 = 没有 refPanel 键", () => {
    const { json } = jsonOf(writeCatsup(fresh()));
    assert(!("CATSUP_references" in json.extensions), "空牌组不写");
    assert(!json.extensionsUsed.includes("CATSUP_references"), "extensionsUsed 不列");
    assert(!("refPanel" in json.extensions.CATSUP_desk), "desk 没有 refPanel");
    const back = readCatsup(writeCatsup(fresh()));
    eq(back.references.files.length, 0); assert(back.desk.refPanel === undefined, "读回没有 refPanel");
  });
  it("目录逐字节往返（顺序 / 路径 / mime / 字节）；extensionsUsed 列它；拍子 = 本版；refPanel 往返", () => {
    const bytes = writeCatsup(docReferenced());
    const { json } = jsonOf(bytes);
    assert(json.extensionsUsed.includes("CATSUP_references"), "extensionsUsed");
    const ext = json.extensions.CATSUP_references;
    eq(ext.version, FORMAT.CATSUP_references.major); eq(ext.minor ?? 0, FORMAT.CATSUP_references.minor);
    eq(ext.files.length, 3); assert(ext.files.every((f: any) => typeof f.bufferView === "number" && !("bytes" in f)), "字节走 bufferView，不进 JSON");
    const back = readCatsup(bytes);
    eq(filesOf(back), filesOf(docReferenced()));
    eq(JSON.stringify(back.desk.refPanel), JSON.stringify({ open: true, left: 400, top: 60, width: 320, height: 240 }));
    eq(json.extensions.CATSUP_desk.minor, FORMAT.CATSUP_desk.minor, "desk 1.1");
    eq(filesOf(readCatsup(writeCatsup(back))), filesOf(docReferenced()), "再写一次还是原样");
    assert(back.readNotes === undefined, "本版写的本版读：没有判决");
  });
  it("major 比本版新：不拒开；references 为空；readNotes.referencesTooNew；重写时原字节（含它引用的 bufferView）原样带回、不让内存里的新卡盖掉", () => {
    const { json, bin } = jsonOf(writeCatsup(docReferenced()));
    json.extensions.CATSUP_references.version = FORMAT.CATSUP_references.major + 1;
    json.extensions.CATSUP_references.hologram = { on: true };
    const future = JSON.parse(JSON.stringify(json.extensions.CATSUP_references));
    const back = readCatsup(encodeGlb(json, bin));
    eq(back.references.files.length, 0, "这边先不显示");
    eq(back.readNotes?.referencesTooNew?.major, FORMAT.CATSUP_references.major + 1);
    eq(back.root.brep.vertices.length, docReferenced().root.brep.vertices.length, "模型照常开");
    back.references = { files: [{ path: ".catsup/references/manifest.json", mimeType: "application/json", bytes: new TextEncoder().encode("{}") }], extra: {} };
    const re = jsonOf(writeCatsup(back));
    const ext = re.json.extensions.CATSUP_references;
    eq(ext.version, future.version); eq(JSON.stringify(ext.hologram), JSON.stringify(future.hologram)); eq(ext.files.length, future.files.length, "原样的那份");
    assert(re.json.extensionsUsed.includes("CATSUP_references"), "带回的也登记 extensionsUsed");
    const bv = re.json.bufferViews[ext.files[1].bufferView];
    eq(JSON.stringify([...re.bin.slice(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)]), JSON.stringify([...docReferenced().references.files[1].bytes]), "被引用的字节跟着带回");
  });
  it("minor 比本版新：照读 + newerMinor；不认识的顶层键直通（含 bufferView 引用的也重映射带回）；已知键永远赢", () => {
    const { json, bin } = jsonOf(writeCatsup(docReferenced()));
    json.extensions.CATSUP_references.minor = FORMAT.CATSUP_references.minor + 1;
    json.extensions.CATSUP_references.cover = { bufferView: json.extensions.CATSUP_references.files[1].bufferView, note: "封面" };
    const back = readCatsup(encodeGlb(json, bin));
    eq(filesOf(back), filesOf(docReferenced()));
    eq(back.readNotes?.newerMinor.map((n) => n.ext).join(), "CATSUP_references");
    const re = jsonOf(writeCatsup(back));
    const ext = re.json.extensions.CATSUP_references;
    eq(ext.minor ?? 0, FORMAT.CATSUP_references.minor, "写入器只写本版拍");
    eq(ext.cover.note, "封面");
    const bv = re.json.bufferViews[ext.cover.bufferView];
    eq(JSON.stringify([...re.bin.slice(bv.byteOffset ?? 0, (bv.byteOffset ?? 0) + bv.byteLength)]), JSON.stringify([...docReferenced().references.files[1].bytes]), "直通键引用的字节也带回");
  });
  it("坏条目（路径重复 / 缺 bufferView）整份拒开，不静默丢卡", () => {
    for (const mutate of [(e: any) => { e.files[1].path = e.files[0].path; }, (e: any) => { delete e.files[2].bufferView; }]) {
      const { json, bin } = jsonOf(writeCatsup(docReferenced()));
      mutate(json.extensions.CATSUP_references);
      let threw = false;
      try { readCatsup(encodeGlb(json, bin)); } catch { threw = true; }
      assert(threw, "该拒开");
    }
  });
  it("坏形状的 refPanel = 没有（落回「没开过窗」），不拒开", () => {
    const { json, bin } = jsonOf(writeCatsup(docReferenced()));
    json.extensions.CATSUP_desk.refPanel = { open: "yes", left: 1, top: 2, width: 3, height: 4 };
    assert(readCatsup(encodeGlb(json, bin)).desk.refPanel === undefined);
  });
  it("跨库契约：读出来的目录交给 @internal/reference-window 的 decodeDeck → 三张卡原样（图 / 文字 / 只放内存的视频空位）、停在第 2 张", async () => {
    const back = readCatsup(writeCatsup(docReferenced()));
    const byPath = new Map(back.references.files.map((f) => [f.path, f]));
    const deck = await decodeDeck({ app: "catsup", knownKinds: ["image", "text", "audio", "video"], getFile: (p) => { const f = byPath.get(p); return f ? new Blob([f.bytes as BlobPart], { type: f.mimeType }) : null; } });
    eq(deck.cards.map((c) => c.kind).join(), "image,text,video");
    eq(deck.index, 1);
    eq(await deck.cards[1].bytes!.text(), "门高 2.1 m");
    eq(deck.cards[0].bytes!.size, docReferenced().references.files[1].bytes.length);
    eq(deck.cards[2].ram?.bytes, 10); assert(!deck.cards[2].bytes, "只放内存的卡没有字节");
    eq(deck.verdict, "same");
  });
});

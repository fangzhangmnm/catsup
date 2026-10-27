// 三级拍子（F-69，家族纪律 ai-docs/20261021-format-version-discipline.md；CatsUp 2026-10-25 补齐）：每个 CATSUP_* 写 version / minor / patch；
// 同 major 下 minor 比本版新 → 能开 + readNotes.newerMinor（宿主提示一次），patch 新 → 静默；major 新 → 拒开（desk 例外，见 desk.test.ts）；
// 直通顺序 = 未知键先铺、已知键永远赢（抓到的老 bug：document.layers 不在已知键表里 → 文件里的旧 layers 盖掉改过的）。created 2026-10-25 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup, documentFromScene, FORMAT, formatTag, compareStamp, readStamp, FormatTooNewError, EXTENSION_VERSIONS } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { SCENE_DOCS } from "./format-scenes.ts";

const jsonOf = (bytes: Uint8Array): { json: any; bin: Uint8Array } => decodeGlb(bytes) as { json: any; bin: Uint8Array };
const stampEq = (obj: any, ext: keyof typeof FORMAT, what: string): void => {
  eq(obj.version, FORMAT[ext].major, `${what} version`); eq(obj.minor ?? 0, FORMAT[ext].minor, `${what} minor`); eq(obj.patch ?? 0, FORMAT[ext].patch, `${what} patch`);   // 为 0 的 minor / patch 不写（缺 = 0）
};

describe("format: 三级拍子", () => {
  it("formatTag = 八个子结构的拍子签名（冻结样本目录名）；EXTENSION_VERSIONS = 各 major", () => {
    eq(formatTag(), ["CATSUP_document", "CATSUP_brep", "CATSUP_definitions", "CATSUP_instance", "CATSUP_material", "CATSUP_desk", "CATSUP_references", "CATSUP_mesh"].map((k) => { const s = FORMAT[k as keyof typeof FORMAT]; return `${s.major}.${s.minor}.${s.patch}`; }).join("-"));
    for (const k of Object.keys(FORMAT) as (keyof typeof FORMAT)[]) eq(EXTENSION_VERSIONS[k], FORMAT[k].major, k);
  });
  it("写出来的每一处扩展都带本版拍子（version 必写，minor / patch 非 0 才写；document / definitions / 每个 brep / 实例节点 / 带贴图的材质 / desk）", () => {
    const { json } = jsonOf(writeCatsup(documentFromScene(SCENE_DOCS.painted(), "painted")));
    stampEq(json.extensions.CATSUP_document, "CATSUP_document", "document");
    stampEq(json.extensions.CATSUP_definitions, "CATSUP_definitions", "definitions");
    stampEq(json.extensions.CATSUP_desk, "CATSUP_desk", "desk");
    for (const d of json.extensions.CATSUP_definitions.list) { stampEq(d.brep, "CATSUP_brep", "brep"); for (const g of d.groups) stampEq(g.brep, "CATSUP_brep", "group brep"); }
    for (const n of json.nodes) stampEq(n.extensions.CATSUP_instance, "CATSUP_instance", "instance");
    const mats = (json.materials ?? []).filter((m: any) => m.extensions?.CATSUP_material);
    assert(mats.length > 0, "painted 场景该有带贴图的材质");
    for (const m of mats) stampEq(m.extensions.CATSUP_material, "CATSUP_material", "material");
  });
  it("compareStamp / readStamp", () => {
    const mine = { major: 3, minor: 1, patch: 0 };
    eq(compareStamp({ major: 3, minor: 1, patch: 0 }, mine), "same");
    eq(compareStamp({ major: 3, minor: 2, patch: 0 }, mine), "newer-minor");
    eq(compareStamp({ major: 3, minor: 1, patch: 4 }, mine), "newer-patch");
    eq(compareStamp({ major: 3, minor: 0, patch: 9 }, mine), "older");
    eq(JSON.stringify(readStamp({})), JSON.stringify({ major: 1, minor: 0, patch: 0 }), "缺 version = 1，缺 minor / patch = 0");
    eq(JSON.stringify(readStamp({ version: 3, minor: "x", patch: -1 })), JSON.stringify({ major: 3, minor: 0, patch: 0 }), "非法当 0");
  });
  it("document minor 比本版新 → 能开 + newerMinor；patch 新 → 只记 newerPatch；major 新 → FormatTooNewError", () => {
    const base = writeCatsup(newDocument(new Kernel().toBrep(), "t"));
    const { json, bin } = jsonOf(base);
    json.extensions.CATSUP_document.minor = FORMAT.CATSUP_document.minor + 1;
    json.extensions.CATSUP_document.settings.futureKnob = 7;
    const d1 = readCatsup(encodeGlb(json, bin));
    eq(d1.readNotes?.newerMinor.map((n) => n.ext).join(), "CATSUP_document");
    eq((d1.settings as any).futureKnob, 7, "多出来的 settings 键照带");
    eq(jsonOf(writeCatsup(d1)).json.extensions.CATSUP_document.minor, FORMAT.CATSUP_document.minor, "写入器只写本版拍");
    json.extensions.CATSUP_document.minor = FORMAT.CATSUP_document.minor;
    json.extensions.CATSUP_document.patch = FORMAT.CATSUP_document.patch + 1;
    const d2 = readCatsup(encodeGlb(json, bin));
    eq(d2.readNotes?.newerMinor.length ?? 0, 0); eq(d2.readNotes?.newerPatch.map((n) => n.ext).join(), "CATSUP_document");
    json.extensions.CATSUP_document.patch = FORMAT.CATSUP_document.patch;
    json.extensions.CATSUP_document.version = FORMAT.CATSUP_document.major + 1;
    let err: unknown; try { readCatsup(encodeGlb(json, bin)); } catch (e) { err = e; }
    assert(err instanceof FormatTooNewError, `document major 新 = 拒开：${String(err)}`);
  });
  it("同一子结构出现多次（每个 definition / group 一个 brep）minor 新 → 只记一笔", () => {
    const { json, bin } = jsonOf(writeCatsup(documentFromScene(SCENE_DOCS.grouped(), "grouped")));
    let n = 0;
    for (const d of json.extensions.CATSUP_definitions.list) { d.brep.minor = FORMAT.CATSUP_brep.minor + 1; n++; for (const g of d.groups) { g.brep.minor = FORMAT.CATSUP_brep.minor + 1; n++; } }
    assert(n >= 2, "场景里至少两份 brep");
    const back = readCatsup(encodeGlb(json, bin));
    eq(back.readNotes?.newerMinor.map((x) => x.ext).join(), "CATSUP_brep");
  });
  it("直通顺序：已知键永远赢——读进来改 layers 再写，文件里是改过的（老写法里 documentExtra 后铺会盖回去）", () => {
    const { json, bin } = jsonOf(writeCatsup(newDocument(new Kernel().toBrep(), "t")));
    json.extensions.CATSUP_document.futureTop = { a: 1 };   // 未知顶层键：直通
    const doc = readCatsup(encodeGlb(json, bin));
    doc.layers = [...doc.layers, { id: 1, name: "墙", visible: false }];
    const re = jsonOf(writeCatsup(doc)).json.extensions.CATSUP_document;
    eq(re.layers.length, 2, "改过的 layers 落盘");
    eq(re.layers[1].name, "墙");
    eq(JSON.stringify(re.futureTop), JSON.stringify({ a: 1 }), "未知键仍带回");
    eq(Object.keys(re)[0], "futureTop", "未知键铺在前");
  });
});

// CATSUP_desk 桌面态（契约 §5.7）：☰ 停在哪页跟文件走（user 2026-10-25「不是应该跟文件吗，看一下weebpaint…」= WeebPaint `.weebpaint/editor-state.json` 的 glb 镜像）；
// 老文件没有它 = 默认；老位置 document.lastView 保留读、停止写（§7.2）；desk 的 major 比本版新 → 不拒开、原字节带回、这边用默认；未知键直通。created 2026-10-25 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup, FORMAT } from "../src/format/index.ts";
import { menuTabsOf } from "../src/format/document.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";

const fresh = () => newDocument(new Kernel().toBrep(), "t");
const jsonOf = (bytes: Uint8Array): { json: any; bin: Uint8Array } => decodeGlb(bytes) as { json: any; bin: Uint8Array };

describe("CATSUP_desk 桌面态", () => {
  it("新文档也写 desk（只有拍子）；extensionsUsed 含 CATSUP_desk；读回 = 默认", () => {
    const { json } = jsonOf(writeCatsup(fresh()));
    assert(json.extensionsUsed.includes("CATSUP_desk"), "extensionsUsed");
    eq(JSON.stringify(json.extensions.CATSUP_desk), JSON.stringify({ version: FORMAT.CATSUP_desk.major, ...(FORMAT.CATSUP_desk.minor ? { minor: FORMAT.CATSUP_desk.minor } : {}), ...(FORMAT.CATSUP_desk.patch ? { patch: FORMAT.CATSUP_desk.patch } : {}) }), "只有拍子；minor / patch 为 0 不写");
    const back = readCatsup(writeCatsup(fresh()));
    eq(JSON.stringify(back.desk), JSON.stringify({ menuTabs: {}, extra: {} }));
    assert(!("lastView" in back.desk), "没有 lastView 就没有键");
    assert(back.readNotes === undefined, "本版写的本版读：没有判决");
  });
  it("menuTabs / lastView 往返；认不出的 tab id 原样带回；settings 里不再有 menuTabs", () => {
    const doc = fresh();
    doc.desk = { menuTabs: { main: "settings", view: "camera", later: "renderer" }, lastView: { eye: [1, 2, 3] }, extra: {} };
    const bytes = writeCatsup(doc);
    const { json } = jsonOf(bytes);
    assert(!("menuTabs" in json.extensions.CATSUP_document.settings), "settings 不带 menuTabs");
    assert(!("lastView" in json.extensions.CATSUP_document), "document 不再写 lastView");
    const back = readCatsup(bytes);
    eq(JSON.stringify(back.desk.menuTabs), JSON.stringify({ main: "settings", view: "camera", later: "renderer" }));
    eq(JSON.stringify(back.desk.lastView), JSON.stringify({ eye: [1, 2, 3] }));
  });
  it("desk 里本版不认识的顶层键直通（读 → 写 → 读还在；已知键永远赢）", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    json.extensions.CATSUP_desk.panelPos = { left: 10, top: 20 };
    json.extensions.CATSUP_desk.menuTabs = { main: "help" };
    const back = readCatsup(encodeGlb(json, bin));
    eq(JSON.stringify(back.desk.extra), JSON.stringify({ panelPos: { left: 10, top: 20 } }));
    back.desk.menuTabs.main = "model";
    const again = jsonOf(writeCatsup(back)).json.extensions.CATSUP_desk;
    eq(JSON.stringify(again.panelPos), JSON.stringify({ left: 10, top: 20 }), "未知键带回");
    eq(again.menuTabs.main, "model", "已知键按内存里的写");
    eq(again.version, FORMAT.CATSUP_desk.major);
  });
  it("老文件：没有 CATSUP_desk → 默认；老位置 document.lastView 读进 desk，重写后只在 desk（保留读、停止写）", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    delete json.extensions.CATSUP_desk;
    json.extensionsUsed = json.extensionsUsed.filter((x: string) => x !== "CATSUP_desk");
    json.extensions.CATSUP_document.lastView = { eye: [9, 9, 9] };
    const back = readCatsup(encodeGlb(json, bin));
    eq(JSON.stringify(back.desk.menuTabs), "{}");
    eq(JSON.stringify(back.desk.lastView), JSON.stringify({ eye: [9, 9, 9] }));
    const re = jsonOf(writeCatsup(back)).json;
    assert(!("lastView" in re.extensions.CATSUP_document), "document 停止写 lastView");
    eq(JSON.stringify(re.extensions.CATSUP_desk.lastView), JSON.stringify({ eye: [9, 9, 9] }));
    assert(!("lastView" in (re.extensions.CATSUP_document.extras ?? {})), "也不进 documentExtra");
  });
  it("desk 的 major 比本版新：不拒开；桌面用默认；readNotes.deskTooNew；重写时原字节原样带回、不塞本版的 desk", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    const future = { version: FORMAT.CATSUP_desk.major + 1, minor: 2, patch: 1, menuTabs: { main: "settings" }, hologram: { on: true } };
    json.extensions.CATSUP_desk = future;
    const back = readCatsup(encodeGlb(json, bin));
    eq(JSON.stringify(back.desk), JSON.stringify({ menuTabs: {}, extra: {} }), "用默认");
    eq(JSON.stringify(back.readNotes?.deskTooNew), JSON.stringify({ major: FORMAT.CATSUP_desk.major + 1, minor: 2, patch: 1 }));
    back.desk.menuTabs.main = "help";   // 这次会话里切了页：不许盖掉更新版的记录
    const re = jsonOf(writeCatsup(back)).json.extensions.CATSUP_desk;
    eq(JSON.stringify(re), JSON.stringify(future), "原字节原样带回");
  });
  it("desk 的 minor 比本版新：能开、照读、记一笔 newer-minor；patch 比本版新：静默", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    json.extensions.CATSUP_desk.minor = FORMAT.CATSUP_desk.minor + 1;
    json.extensions.CATSUP_desk.menuTabs = { view: "grid" };
    const back = readCatsup(encodeGlb(json, bin));
    eq(back.desk.menuTabs.view, "grid");
    eq(back.readNotes?.newerMinor.map((n) => n.ext).join(), "CATSUP_desk");
    json.extensions.CATSUP_desk.minor = FORMAT.CATSUP_desk.minor;
    json.extensions.CATSUP_desk.patch = FORMAT.CATSUP_desk.patch + 1;
    const back2 = readCatsup(encodeGlb(json, bin));
    eq(back2.readNotes?.newerMinor.length ?? 0, 0);
    eq(back2.readNotes?.newerPatch.map((n) => n.ext).join(), "CATSUP_desk");
  });
  it("menuTabsOf：只收字符串值，坏形状 = 空", () => {
    eq(JSON.stringify(menuTabsOf({ main: "settings", view: 3, x: null })), JSON.stringify({ main: "settings" }));
    eq(JSON.stringify(menuTabsOf(["a"])), "{}");
    eq(JSON.stringify(menuTabsOf(undefined)), "{}");
  });
});

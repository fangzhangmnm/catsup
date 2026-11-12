// CATSUP_desk 桌面态（契约 §5.7）：☰ 停在哪页跟文件走（user 2026-10-25「不是应该跟文件吗，看一下weebpaint…」= WeebPaint `.weebpaint/editor-state.json` 的 glb 镜像）；
// 老文件没有它 = 默认；老位置 document.lastView 保留读、停止写（§7.2）；desk 的 major 比本版新 → 不拒开、原字节带回、这边用默认；未知键直通。created 2026-10-25 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup, FORMAT } from "../src/format/index.ts";
import { menuTabsOf, paintDeskOf } from "../src/format/document.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";

const fresh = () => newDocument(new Kernel().toBrep(), "t");
const jsonOf = (bytes: Uint8Array): { json: any; bin: Uint8Array } => decodeGlb(bytes) as { json: any; bin: Uint8Array };
/** 键排好序再变成字（只比内容、不比键的先后）。 */
const canon = (v: unknown): string => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, (x as Record<string, unknown>)[k]])) : x));

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
  it("画画工作台的笔（desk 1.6 paint）：改过才写；按笔记旋钮、每种 tool 记上次那支；往返一模一样；本版没有的笔 / 不认识的键原样带回", () => {
    eq("paint" in jsonOf(writeCatsup(fresh())).json.extensions.CATSUP_desk, false, "没改过 = 不写 paint");
    const doc = fresh();
    doc.desk.paint = { color: "#c03050", brushes: { pen: { size: 18, opacity: 0.75, hardness: 0.6, extra: {} }, eraser: { size: 48, opacity: 1, hardness: 0.9, extra: { future: "x" } }, wash: { size: 4, extra: { flow: 0.3 } } }, active: { brush: "ink", eraser: "eraser", fill: "fill-face" }, extra: { future: [1, 2] } };
    const bytes = writeCatsup(doc), raw = jsonOf(bytes).json.extensions.CATSUP_desk.paint;
    eq(JSON.stringify(raw), JSON.stringify({ future: [1, 2], color: "#c03050", brushes: { pen: { size: 18, opacity: 0.75, hardness: 0.6 }, eraser: { future: "x", size: 48, opacity: 1, hardness: 0.9 }, wash: { flow: 0.3, size: 4 } }, active: { brush: "ink", eraser: "eraser", fill: "fill-face" } }), "写进文件的样子（不写 tools）");
    const back = readCatsup(bytes);
    eq(canon(back.desk.paint), canon(doc.desk.paint), "读回一模一样（本版没有的笔 wash、active 里本版没有的 fill 都在）");
    eq(JSON.stringify(jsonOf(writeCatsup(back)).json.extensions.CATSUP_desk.paint), JSON.stringify(raw), "再写一遍逐字一样");
  });
  it("1.5 的 tools 保留读、停止写：paintPen → 普通笔、paintEraser → 橡皮；不认识的工具名原样带回；写回去不再有认识的工具", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    json.extensions.CATSUP_desk.paint = { color: "#112233", tools: { paintPen: { size: 18, opacity: 0.75, hardness: 0.6 }, paintEraser: { size: 48, opacity: 1, hardness: 0.9, activeBrushId: "b1" }, airbrush: { size: 4, flow: 0.3 } } };
    const back = readCatsup(encodeGlb(json, bin));
    eq(JSON.stringify(back.desk.paint?.brushes.pen), JSON.stringify({ extra: {}, size: 18, opacity: 0.75, hardness: 0.6 }), "paintPen 读成普通笔的旋钮");
    eq(JSON.stringify(back.desk.paint?.brushes.eraser), JSON.stringify({ extra: {}, size: 48, opacity: 1, hardness: 0.9 }).replace('"extra":{}', '"extra":{"activeBrushId":"b1"}'), "paintEraser 读成橡皮的（不认识的键跟着）");
    eq(JSON.stringify(jsonOf(writeCatsup(back)).json.extensions.CATSUP_desk.paint), JSON.stringify({ color: "#112233", brushes: { pen: { size: 18, opacity: 0.75, hardness: 0.6 }, eraser: { activeBrushId: "b1", size: 48, opacity: 1, hardness: 0.9 } }, tools: { airbrush: { size: 4, flow: 0.3 } } }), "写回：认识的工具搬进 brushes，tools 只剩不认识的");
  });
  it("1.5 的 tools 和 1.6 的 brushes 同时在（1.6 存过、又被旧版本存过）：以 tools 为准（只有旧版本会写它 = 它是最近存的）", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    json.extensions.CATSUP_desk.paint = { brushes: { pen: { size: 5 }, ink: { size: 9 } }, tools: { paintPen: { size: 30 } } };
    const back = readCatsup(encodeGlb(json, bin));
    eq(back.desk.paint?.brushes.pen.size, 30, "普通笔 = tools 里那个");
    eq(back.desk.paint?.brushes.ink.size, 9, "别的笔照 brushes");
  });
  it("tools 盖 brushes 里同一支笔时只盖它带着的数：这支笔在 brushes 里不认识的键、tools 没带的数都留着（以后的版本加的旋钮键被 1.5 存过一次不丢）", () => {
    const { json, bin } = jsonOf(writeCatsup(fresh()));
    // 新版本存的：普通笔带一个本版不认识的旋钮键 grain、还有浓度 0.4 → 1.5 打开、只改了大小再存（1.5 会把 brushes 原样带回、tools 里写它知道的三个数里改过的）
    json.extensions.CATSUP_desk.paint = { brushes: { pen: { size: 5, opacity: 0.4, grain: 0.7 } }, tools: { paintPen: { size: 30, legacyOnly: true } } };
    const back = readCatsup(encodeGlb(json, bin));
    const pen = back.desk.paint!.brushes.pen;
    eq(pen.size, 30, "大小 = tools 里那个"); eq(pen.opacity, 0.4, "tools 没带浓度 = 留 brushes 的");
    eq(JSON.stringify(jsonOf(writeCatsup(back)).json.extensions.CATSUP_desk.paint), JSON.stringify({ brushes: { pen: { grain: 0.7, legacyOnly: true, size: 30, opacity: 0.4 } } }), "写回：grain 还在，tools 里那条不认识的键也带过来，tools 不再写");
  });
  it("类型不对的已知键不当值、原样带回；brushes / active 不是对象 = 原样带回，有认识的条目时以认识的为准；paint 不是对象 = 没有", () => {
    const back = (paint: unknown) => { const { json, bin } = jsonOf(writeCatsup(fresh())); json.extensions.CATSUP_desk.paint = paint; return readCatsup(encodeGlb(json, bin)); };
    const b = back({ color: "red", brushes: { pen: { size: "big", opacity: 0.5 }, odd: 7 }, active: { brush: 3, eraser: "eraser" } });
    eq(b.desk.paint?.color, undefined, "颜色不是 #rrggbb = 不当颜色");
    eq(b.desk.paint?.brushes.pen.size, undefined, "大小不是数 = 不当大小"); eq(b.desk.paint?.brushes.pen.opacity, 0.5);
    eq(b.desk.paint?.active.brush, undefined, "active 的值不是字符串 = 不当笔"); eq(b.desk.paint?.active.eraser, "eraser");
    eq(JSON.stringify(jsonOf(writeCatsup(b)).json.extensions.CATSUP_desk.paint), JSON.stringify({ color: "red", brushes: { odd: 7, pen: { size: "big", opacity: 0.5 } }, active: { brush: 3, eraser: "eraser" } }), "坏的那几个字节原样带回");
    for (const bad of [[1, "a"], "brushes"]) {
      const c = back({ color: "#AbCdEf", brushes: bad, active: bad });
      eq(c.desk.paint?.color, "#AbCdEf", "颜色原样（不改成小写）");
      eq(JSON.stringify(jsonOf(writeCatsup(c)).json.extensions.CATSUP_desk.paint), JSON.stringify({ color: "#AbCdEf", brushes: bad, active: bad }), `brushes / active = ${JSON.stringify(bad)} 原样写回`);
    }
    const d = back({ brushes: "x" }); d.desk.paint!.brushes.pen = { size: 9, extra: {} };   // app 改过笔：认识的为准
    eq(JSON.stringify(jsonOf(writeCatsup(d)).json.extensions.CATSUP_desk.paint), JSON.stringify({ brushes: { pen: { size: 9 } } }));
    eq(paintDeskOf(null), undefined); eq(paintDeskOf([1]), undefined); eq(paintDeskOf("x"), undefined);
  });
  it("menuTabsOf：只收字符串值，坏形状 = 空", () => {
    eq(JSON.stringify(menuTabsOf({ main: "settings", view: 3, x: null })), JSON.stringify({ main: "settings" }));
    eq(JSON.stringify(menuTabsOf(["a"])), "{}");
    eq(JSON.stringify(menuTabsOf(undefined)), "{}");
  });
});

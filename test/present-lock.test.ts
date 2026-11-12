// 演示锁（周账 F-124，2026-10-29；吃掉 v0.12.8 的定稿版本章）：锁住在桌面态 desk.locked（跟文件走、不是内容、不标脏）；
// 老定稿记录 final / finalRev 照读照写、一字不动；指纹没了。行为（锁着拒改 / 看和玩照旧）在探针 test/probes/probe-present-lock.mjs。created 2026-10-29 by Claude Fable 5.1 · edited by Claude Opus 5.5 2026-11-05（并进输入闸）
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup, documentFromScene, FORMAT } from "../src/format/index.ts";
import { isFinalRecord } from "../src/format/final.ts";
import { isReadOnlyTool } from "../src/editor/tool-ids.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { SCENE_DOCS } from "./format-scenes.ts";
const fs = (await import("node:fs" as string)) as { readFileSync(p: string, enc: string): string }, url = (await import("node:url" as string)) as { fileURLToPath(u: URL): string };
const src = (p: string): string => fs.readFileSync(url.fileURLToPath(new URL(p, import.meta.url)), "utf8");

const fresh = () => newDocument(new Kernel().toBrep(), "t");
const jsonOf = (bytes: Uint8Array): { json: any; bin: Uint8Array } => decodeGlb(bytes) as { json: any; bin: Uint8Array };

describe("演示锁：desk.locked 往返（desk 1.2）", () => {
  it("风格 / 屏幕（desk 1.3）：选过才写、读回原样；坏值（非字符串）= 没有", () => {
    const plain = jsonOf(writeCatsup(fresh()));
    assert(!("style" in plain.json.extensions.CATSUP_desk) && !("screen" in plain.json.extensions.CATSUP_desk), "没选不写键");
    const doc = fresh(); doc.desk = { ...doc.desk, style: "tron", screen: "crt3" };
    const back = readCatsup(writeCatsup(doc)).desk;
    eq(`${back.style}/${back.screen}`, "tron/crt3");
    const { json, bin } = jsonOf(writeCatsup(fresh())); json.extensions.CATSUP_desk.style = 7; json.extensions.CATSUP_desk.screen = { x: 1 };
    const bad = readCatsup(encodeGlb(json, bin)).desk;
    assert(bad.style === undefined && bad.screen === undefined, "坏值 = 没有");
  });
  it("拍子 = desk 1.2；没锁不写键；锁着写 locked:true 并读回；文件里 locked:false / 坏值 = 没锁", () => {
    eq(`${FORMAT.CATSUP_desk.major}.${FORMAT.CATSUP_desk.minor}`, "1.6");   // 1.6 = 按笔记（2026-11-12 施工单二十 1b）；1.5 = 画画工作台的笔跟文件走（2026-11-11）；1.3 = 风格 / 屏幕跟文件走（2026-10-29 Opus）；1.4 = 导出表单的选择跟文件走（2026-11-04）
    const plain = jsonOf(writeCatsup(fresh()));
    assert(!("locked" in plain.json.extensions.CATSUP_desk), "没锁不写键");
    assert(readCatsup(writeCatsup(fresh())).desk.locked === undefined, "读回没有键");
    const doc = fresh(); doc.desk = { ...doc.desk, locked: true };
    const bytes = writeCatsup(doc);
    eq(jsonOf(bytes).json.extensions.CATSUP_desk.locked, true, "写了 true");
    eq(readCatsup(bytes).desk.locked, true, "读回锁着");
    assert(!("locked" in jsonOf(bytes).json.extensions.CATSUP_document), "锁不在内容侧的 document 里");
    for (const bad of [false, 1, "yes", null]) {
      const { json, bin } = jsonOf(bytes); json.extensions.CATSUP_desk.locked = bad;
      assert(readCatsup(encodeGlb(json, bin)).desk.locked === undefined, `${JSON.stringify(bad)} 该当没锁`);
    }
  });
  it("锁着的文件 → 解锁 → 存：键消失（不是写 false）", () => {
    const doc = fresh(); doc.desk = { ...doc.desk, locked: true };
    const back = readCatsup(writeCatsup(doc)); delete back.desk.locked;
    assert(!("locked" in jsonOf(writeCatsup(back)).json.extensions.CATSUP_desk));
  });
  it("桌面态的老规矩不变：未知键直通、menuTabs / refPanel 和 locked 同住", () => {
    const doc = fresh(); doc.desk = { menuTabs: { main: "file" }, refPanel: { open: true, left: 1, top: 2, width: 3, height: 4 }, locked: true, extra: { later: 1 } };
    const back = readCatsup(writeCatsup(doc));
    eq(JSON.stringify(back.desk), JSON.stringify({ menuTabs: { main: "file" }, refPanel: { open: true, left: 1, top: 2, width: 3, height: 4 }, locked: true, extra: { later: 1 } }));
  });
});

describe("老定稿记录（v0.12.8–v0.16.52 的版本章）照读照写、不再起作用", () => {
  it("final / finalRev write → read 原样；没有的文档读回来没有这两个键", () => {
    const doc = documentFromScene(SCENE_DOCS.grouped(), "g");
    const plain = readCatsup(writeCatsup(doc));
    assert(plain.final === undefined && plain.finalRev === undefined, "没定稿不该有键");
    doc.final = { at: "2026-10-24T18:00:00.000Z", rev: 3, app: "v0.12.8-test", fingerprint: "a".repeat(64) };
    doc.finalRev = 3;
    const back = readCatsup(writeCatsup(doc));
    eq(JSON.stringify(back.final), JSON.stringify(doc.final), "记录一字不动");
    eq(back.finalRev, 3, "finalRev");
    assert(back.desk.locked === undefined, "老记录不会被读成演示锁（锁只认 desk.locked）");
  });
  it("坏记录当没有（isFinalRecord）", () => {
    assert(isFinalRecord({ at: "x", rev: 1, app: "", fingerprint: "a".repeat(64) }));
    assert(!isFinalRecord({ at: "x", rev: 1, fingerprint: "short" }));
    assert(!isFinalRecord(null));
  });
  it("指纹代码没了：src/ 里没人再算 contentFingerprint；session 不再按老记录锁", () => {
    for (const p of ["../src/app/session.ts", "../src/format/final.ts", "../src/format/write.ts", "../src/format/read.ts"]) assert(!src(p).includes("contentFingerprint"), `${p} 还提 contentFingerprint`);
    assert(!/verifyFinal|finalIntact|\.finalize\(\)/.test(src("../src/app/session.ts")), "session 还有老定稿流程");
  });
});

describe("演示锁的护栏各层都在（每层各自承重；行为在探针）", () => {
  it("③ 编辑器：commit / undo / redo / VCB / 指针按下 / 键盘起手 / 换工具 都问输入闸（host.editHold）；真值只在 session.desk.locked 一处", () => {
    const ed = src("../src/editor/editor.ts");
    const fn = (head: string): string => { const i = ed.indexOf(head); assert(i >= 0, `找不到 ${head}`); return ed.slice(i, i + 2500); };
    assert(/const h = this\.host\.editHold\?\.\(\); if \(h\?\.kind === "lock"\)/.test(fn("private commitIn(")), "commitIn 只看演示锁");
    for (const head of ["  undo(): void {", "  redo(): void {", "  startModal(", "private pointerDownStep("]) assert(fn(head).includes("this.refuse()"), `${head} 没问闸`);
    assert(/this\.host\.editHold\?\.\(\); if \(h\) return \{ ok: false, error: h\.why \}/.test(fn("  applyVcb(")), "applyVcb 没问闸");
    assert(fn("private previewApply(").includes("this.host.editHold?.()"), "previewApply 没问闸");
    assert(/this\.locked && !isReadOnlyTool\(t\)/.test(fn("  setTool(t: Tool): void {")), "换工具没问");
    assert(!/_locked|lockedSay|setLocked\(on: boolean\)/.test(ed.replace(/setLocked: "[^"]*"/, "")), "编辑器里不再有第二份锁的真值");
  });
  it("只读工具的名单：选择 / 走路 / 卷尺 / 量角器；它们不进改模型的那一拨（user 11-05「只读工具比如walk之类的应该全量可以的」）", () => {
    assert(isReadOnlyTool("walk") && isReadOnlyTool("select") && isReadOnlyTool("tape") && isReadOnlyTool("protractor"));
    for (const t of ["line", "rect", "move", "rotate", "scale", "pp", "erase", "paint", "axes", "compass"] as const) assert(!isReadOnlyTool(t), t);
  });
  it("④ 宿主：改模型的工具的指针不进编辑器（toolBlocked）、只读工具放行；右键不出菜单、灰的钮不是死的、☰ 同一行按状态换「锁上 / 解锁」", () => {
    const main = src("../src/app/main.ts"), css = src("../styles.css"), place = src("../src/controller/placement.ts");
    assert(/toolBlocked: \(\) => \{ if \(editor\.locked && !isReadOnlyTool\(editor\.tool\)\)/.test(main), "toolBlocked 没放行只读工具");
    assert(/inputGate\.hold\(\{ kind: "lock", why: HINT_LOCKED, on: \(\) => session\.locked\(\) \}\)/.test(main), "锁是闸的一条理由");
    assert(/onContext: .*editor\.locked/.test(main), "右键没查锁");
    assert(!/doc-locked \.hud-rail-tools/.test(css), "左柱不再整条 pointer-events:none（走路要能点）");
    assert(/\.tool\.held/.test(css) && /classList\.add\("held"\)/.test(main), "改模型的工具灰掉");
    assert(/doc-locked/.test(main), "护栏样式");
    assert(/\{ id: "lock", tab: "file" \}/.test(place), "☰ 文件页有锁那一行");
    assert(/case "lock": return session\.locked\(\)/.test(main) && /label: "解锁"/.test(main) && /label: "锁上"/.test(main), "锁上 / 解锁 换字");
    assert(!/finalize|finalRecord|finalRev|doc-final/.test(main), "main.ts 还有定稿残留");
  });
});

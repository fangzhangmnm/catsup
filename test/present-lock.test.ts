// 演示锁（周账 F-124，2026-10-29；吃掉 v0.12.8 的定稿版本章）：锁住在桌面态 desk.locked（跟文件走、不是内容、不标脏）；
// 老定稿记录 final / finalRev 照读照写、一字不动；指纹没了。行为（锁着拒改 / 看和玩照旧）在探针 test/probes/probe-present-lock.mjs。created 2026-10-29 by Claude Fable 5.1
import { describe, it, eq, assert } from "./runner.mjs";
import { Kernel } from "../src/kernel/kernel.ts";
import { newDocument, writeCatsup, readCatsup, documentFromScene, FORMAT } from "../src/format/index.ts";
import { isFinalRecord } from "../src/format/final.ts";
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
    eq(`${FORMAT.CATSUP_desk.major}.${FORMAT.CATSUP_desk.minor}`, "1.3");   // 1.3 = 风格 / 屏幕跟文件走（2026-10-29 Opus）
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
  it("② 编辑器：commit / undo / redo / VCB / 指针按下 / 键盘起手 六个口都查 _locked", () => {
    const ed = src("../src/editor/editor.ts");
    const fn = (name: string): string => { const i = ed.indexOf(name); assert(i >= 0, `找不到 ${name}`); return ed.slice(i, i + 2500); };
    for (const [name, head] of [["commitIn", "private commitIn("], ["undo", "  undo(): void {"], ["redo", "  redo(): void {"], ["applyVcb", "applyVcb("], ["pointerDownStep", "private pointerDownStep("], ["startModal", "  startModal("]] as const) assert(fn(head).includes("this._locked"), `${name} 没查锁`);
  });
  it("① 宿主：锁着时工具指针不进编辑器（toolBlocked）、右键不出菜单、body.doc-locked 灰掉工具区、☰ 同一行按状态换「锁上 / 解锁」", () => {
    const main = src("../src/app/main.ts"), css = src("../styles.css"), place = src("../src/controller/placement.ts");
    assert(/toolBlocked: \(\) => \{ if \(editor\.locked\)/.test(main), "toolBlocked 没带锁");
    assert(/onContext: .*editor\.locked/.test(main), "右键没查锁");
    assert(/doc-locked/.test(main) && /body\.doc-locked \.hud-rail-tools/.test(css), "护栏 ① 样式");
    assert(/\{ id: "lock", tab: "file" \}/.test(place), "☰ 文件页有锁那一行");
    assert(/case "lock": return session\.locked\(\)/.test(main) && /label: "解锁"/.test(main) && /label: "锁上"/.test(main), "锁上 / 解锁 换字");
    assert(!/finalize|finalRecord|finalRev|doc-final/.test(main), "main.ts 还有定稿残留");
  });
});

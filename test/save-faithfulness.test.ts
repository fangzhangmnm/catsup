// 存盘忠实度（统筹 11-12 裁定，清点 = ai-docs/20261112-save-faithfulness-audit.md）。created 2026-11-12 by Claude Opus 5.5
// 钉三件：① 住在文件设置里的网格 / 单位制 / 尺度参考，改了算改过（文档改动号升）；自由建模自己那份吸附开关不进文件、不算。
//        运行时那一半（改完 dirty、自动保存写了、重开值还在）= test/probes/probe-settings-dirty.mjs。
//      ② 读的时候悄悄修的两种悬空引用（材质槽 R1、组 / 实例的上一层 R2）记进 readNotes、打开时说；正常文件不记。
//      ③ 写的时候两处只好不写的兜底（实例的定义没了 W2、槽号指不到材质 W3）真走到了告诉调用方；正常场景不报。
import { describe, it, eq, assert } from "./runner.mjs";
import { GridState } from "../src/editor/grid-state.ts";
import { gridDocChanged, NEW_DOC_GRID } from "../src/editor/grid-settings.ts";
import { readCatsup, writeCatsup, sceneFromDocument, documentFromScene } from "../src/format/index.ts";
import { decodeGlb, encodeGlb } from "../src/format/glb.ts";
import { formatNotesSay, LOSSY_NOTES } from "../src/app/format-notes.ts";

const fs = (await import("node:fs" as string)) as { readFileSync(u: URL | string, enc?: "utf8"): Uint8Array & string; readdirSync(u: URL): string[]; statSync(u: URL): { isDirectory(): boolean } };
const read = (f: string): string => fs.readFileSync(new URL(`../${f}`, import.meta.url), "utf8");
const FIX = new URL("./fixtures/format/", import.meta.url);
const CUR = "v3.5.0-4.2.0-7.0.0-2.0.0-1.3.0-1.6.0-1.0.0-2.1.0-1.0.0-1.2.0";
const bytesOf = (dir: string, f: string): Uint8Array => new Uint8Array(fs.readFileSync(new URL(`${dir}/${f}`, FIX)));
type Json = Record<string, any>;
/** 拆开 → 改 JSON → 再包回去（二进制原样）。 */
const tamper = (bytes: Uint8Array, f: (j: Json) => void): Uint8Array => { const { json, bin } = decodeGlb(bytes) as { json: Json; bin: Uint8Array }; f(json); return encodeGlb(json, bin); };
const BOGUS = "0badc0de-0000-4000-8000-000000000000";

describe("① 住在文件设置里的那几样：改了算改过", () => {
  it("网格设置的五项，哪一项变了都算；一样就不算", () => {
    const a = { ...NEW_DOC_GRID };
    eq(gridDocChanged(a, { ...a }), false);
    for (const p of [{ on: !a.on }, { snap: 0.05 }, { plane: "yz" as const }, { system: "imperial" as const }, { shown: !a.shown }]) eq(gridDocChanged(a, { ...a, ...p }), true, JSON.stringify(p));
  });
  it("自由建模自己那份吸附开关不进文件 → 文件那份不变 = 不算改过；硬表面的开关算", () => {
    const g = new GridState(), was = g.doc;
    g.set("freeform", { on: !g.view("freeform").on }); eq(gridDocChanged(was, g.doc), false, "自由建模那份");
    g.set("geometry", { on: !g.doc.on }); eq(gridDocChanged(was, g.doc), true, "硬表面那份");
  });
  it("编辑器：setGrid 只在文件那份变了、又不是读盘 / 新建时升设置改动号；尺度参考的开关 / 清空升；docRevision 带着它（失败的一步退不回它）", () => {
    const src = read("src/editor/editor.ts");
    assert(/if \(!fromDoc && gridDocChanged\(was, this\.gridState\.doc\)\) this\._settingsRev\+\+/.test(src), "setGrid 没按文件那份判");
    assert(/toggleScaleRef\(id: string\): void \{[^\n]*this\._settingsRev\+\+/.test(src), "toggleScaleRef 没升");
    assert(/clearScaleRefs\(\): void \{[^\n]*this\._settingsRev\+\+/.test(src), "clearScaleRefs 没升");
    assert(/get docRevision\(\): number \{ return this\._docRevision \+ this\._settingsRev; \}/.test(src), "docRevision 没带设置改动号");
    assert(!/loadScaleRefs\([^\n]*_settingsRev/.test(src), "读盘 / 新建设尺度参考不该算改过");
  });
});

describe("② 读的时候悄悄修的悬空引用：记一笔、打开时说", () => {
  it("读完挂不挂 readNotes 按值判，不靠手写的键名单（以前新键没补进名单 = 记了等于没记）", () => {
    assert(/Object\.values\(notes\)\.some\(/.test(read("src/format/read.ts")), "read.ts 挂 readNotes 回到了手写名单");
  });
  it("正常文件不记", () => {
    for (const f of ["grouped.glb", "sided.glb"]) { const n = readCatsup(bytesOf(CUR, f)).readNotes; eq(n?.danglingMaterialSlots, undefined, f); eq(n?.danglingParents, undefined, f); }
  });
  it("R1 材质槽指着表里没有的材质 → 读成默认（槽缺），记下几格、说一句、算会丢", () => {
    const bad = tamper(bytesOf(CUR, "sided.glb"), (j) => { const d = j.extensions.CATSUP_definitions.list.find((x: Json) => (x.materialSlots ?? []).some(Boolean)); d.materialSlots = d.materialSlots.map((m: unknown) => (m ? BOGUS : m)); });
    const doc = readCatsup(bad), n = doc.readNotes!.danglingMaterialSlots!;
    assert(n >= 1, `记了 ${n}`);
    assert(doc.definitions.every((d) => !d.materialSlots.includes(BOGUS as never)), "悬空的值不带着走");
    assert(formatNotesSay(doc.readNotes!).some((t) => t.includes(`${n} 格材质指着的材质不在文件里`)), "打开时说一句");
    eq(LOSSY_NOTES.danglingMaterialSlots, true);
  });
  it("R2 组 / 实例的上一层指着不存在的组 → 放到最外层，记下几个、说一句、算会丢", () => {
    const bad = tamper(bytesOf(CUR, "grouped.glb"), (j) => { const d = j.extensions.CATSUP_definitions.list.find((x: Json) => (x.groups ?? []).length && (x.instances ?? []).length); d.groups[0].parent = BOGUS; d.instances[0].parent = BOGUS; });
    const doc = readCatsup(bad);
    eq(doc.readNotes!.danglingParents, 2, "一个组 + 一个实例");
    assert(doc.definitions.every((d) => d.groups.every((g) => g.parent !== BOGUS) && d.instances.every((i) => i.parent !== BOGUS)), "悬空的值不带着走");
    assert(formatNotesSay(doc.readNotes!).some((t) => t.includes("2 个组 / 组件的上一层指着不在文件里的组")), "打开时说一句");
    eq(LOSSY_NOTES.danglingParents, true);
  });
  it("老格式（定义 v6，按序号引用）升级时序号越界也记：材质槽、上一层", () => {
    let hit: { dir: string; f: string } | null = null;
    for (const dir of fs.readdirSync(FIX)) {
      if (!fs.statSync(new URL(dir, FIX)).isDirectory()) continue;
      for (const f of fs.readdirSync(new URL(dir + "/", FIX))) {
        if (!f.endsWith(".glb")) continue;
        const { json } = decodeGlb(bytesOf(dir, f)) as { json: Json }; const D = json.extensions?.CATSUP_definitions;
        if (D?.version === 6 && D.list.some((x: Json) => (x.materialSlots ?? []).length && (x.instances ?? []).length)) { hit = { dir, f }; break; }
      }
      if (hit) break;
    }
    assert(hit !== null, "冻样本里得有一份定义 v6、带材质槽和实例的");
    const clean = readCatsup(bytesOf(hit!.dir, hit!.f)).readNotes;
    eq(clean?.danglingMaterialSlots, undefined, "原样不记"); eq(clean?.danglingParents, undefined, "原样不记");
    const bad = tamper(bytesOf(hit!.dir, hit!.f), (j) => { const d = j.extensions.CATSUP_definitions.list.find((x: Json) => (x.materialSlots ?? []).length && (x.instances ?? []).length); d.materialSlots[0] = 999; d.instances[0].parent = 999; });
    const n = readCatsup(bad).readNotes!;
    eq(n.danglingMaterialSlots, 1); eq(n.danglingParents, 1);
  });
});

describe("③ 写的时候只好不写的兜底：真走到了告诉调用方", () => {
  const collect = () => { const got: string[] = []; return { got, onDrop: (w: "instance" | "materialSlot") => { got.push(w); } }; };
  it("正常场景不报", () => {
    for (const f of ["grouped.glb", "sided.glb"]) { const s = sceneFromDocument(readCatsup(bytesOf(CUR, f))), c = collect(); documentFromScene(s, "t", null, c.onDrop); eq(c.got.length, 0, f); }
  });
  it("W2 实例的定义没了（绕过清理直接删）→ 不写这个实例，报一个", () => {
    const s = sceneFromDocument(readCatsup(bytesOf(CUR, "grouped.glb")));
    const inst = [...s.def(s.root).instances.values()][0];
    const users = [...s.defs.values()].reduce((n, d) => n + [...d.instances.values()].filter((i) => i.def === inst.def).length, 0);
    s.defs.delete(inst.def);
    const c = collect(), doc = documentFromScene(s, "t", null, c.onDrop);
    eq(c.got.join(), Array(users).fill("instance").join(), `摆着它的 ${users} 个实例各报一个`);
    assert(!doc.definitions[doc.rootIndex].instances.some((i) => i.guid === inst.guid), "没写进去");
    void writeCatsup(doc);
  });
  it("W3 槽号指不到材质 → 写成空，报一格；槽缺（−1）是正常写法、不报", () => {
    const s = sceneFromDocument(readCatsup(bytesOf(CUR, "sided.glb")));
    const d = [...s.defs.values()].find((x) => x.body.materialSlots.length)!;
    d.body.materialSlots[0] = s.materials.length + 5;
    const c = collect(); documentFromScene(s, "t", null, c.onDrop);
    eq(c.got.join(), "materialSlot");
    d.body.materialSlots[0] = -1;
    const c2 = collect(); documentFromScene(s, "t", null, c2.onDrop); eq(c2.got.length, 0, "槽缺不报");
  });
  it("session 的存盘编码收这个数：记进调试日志、状态栏说、结果里带着", () => {
    const src = read("src/app/session.ts");
    assert(/documentFromScene\(this\.d\.editor\.sceneRef, name, this\.loaded, \(what, detail\) =>/.test(src), "freeze 没传回调");
    assert(/note\("save", `\$\{mode\}: dropped/.test(src), "没记调试日志");
    assert(/readonly dropped: \{ instances: number; materialSlots: number \}/.test(src), "结果里没带数");
  });
});

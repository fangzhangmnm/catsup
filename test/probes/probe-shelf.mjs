// test/probes/probe-shelf.mjs —— 素材架的界面（身份地基 ID-3，计划书 §15；app/shelf-actions.ts + hierarchy-window 资源页 + objects/verbs.ts）。无头。created 2026-11-04 by Claude Opus 5.5
// ① 物件菜单「放上素材架」：有名字的直接上；菜单翻成「从素材架取下」 ② 没起名：先问名字、取消 = 都不做、起名和上架一步撤销（user 10-30「进架必须命名」）
// ③ 资源页：素材架一节、取下、材质「上架」；架上的不算没人用 ④ 导入别的 .catsup：只列有名字的、挑、合并 + 上架一步撤销、场景不多摆；再导入 = 本文件已有；加密的先问口令；外来 glb 拒
// ④½ 站在要被更新的组件里导入：只有更新灰、默认留这里的、点完人还在里面；弹窗开着键盘不穿过去（Claude Opus 5.5 2026-11-05）
// ⑤ 太新的架子（更新版写的）：提示行说清、那一节只有说明、上架 / 导入 / 清理都不开；存盘原字节带回
// 用法：python3 -m http.server 8765 → node test/probes/probe-shelf.mjs
import { createRequire } from "node:module";
import { documentFromScene, writeCatsup, decodeGlb, mintGuid } from "../../src/format/index.ts";
import { encodeGlb } from "../../src/format/glb.ts";
import { Scene } from "../../src/scene/scene.ts";
import { IDENTITY } from "../../src/scene/xform.ts";
import { sceneBox } from "../format-scenes.ts";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const URL0 = process.argv[2] ?? "http://127.0.0.1:8765/";
const fails = [], check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const W = '.float-win[data-win="hierarchy"]';
const errs = [];
const open = async () => { const ctx = await browser.newContext({ viewport: { width: 1000, height: 800 } }); const p = await ctx.newPage(); p.setDefaultTimeout(4000); p.on("pageerror", (e) => errs.push(e.message)); await p.goto(URL0, { waitUntil: "load" }); await p.waitForTimeout(800); return p; };

// ---- 喂给导入的文件 ----
/** 沙发（有名字，里面摆着靠垫和一个没起名的 b7c1）+ 孤零零的边几（有名字）+ a3f2（没起名）。 */
function sourceScene() {
  const s = new Scene(sceneBox(1, 1));
  const cloth = s.addMaterial({ name: "布", color: [0.7, 0.2, 0.2] });
  const sofa = s.mintDef("沙发", sceneBox(1, 1)), pad = s.mintDef("靠垫", sceneBox(1, 1)), bare = s.mintDef("b7c1", sceneBox(1, 1));
  s.mintDef("边几", sceneBox(1, 1)); s.mintDef("a3f2", sceneBox(1, 1));
  const k = s.brep(sofa.id).kernel; k.setFaceMaterial([k.faces()[0].id], s.slotFor(sofa.id, cloth));
  s.layers.push({ id: s.nextLayer++, guid: mintGuid(), name: "家具", visible: true });
  s.mintInstance(s.root, null, sofa.id, IDENTITY);
  const i = s.mintInstance(sofa.id, null, pad.id, IDENTITY); i.layer = s.layers[1].id;
  s.mintInstance(sofa.id, null, bare.id, IDENTITY);
  return { s, sofa: sofa.guid };
}
const { s: src, sofa: sofaGuid } = sourceScene();
const catsupFile = (bytes, name = "别的模型.catsup") => ({ name, mimeType: "application/octet-stream", buffer: Buffer.from(bytes) });
const srcBytes = writeCatsup(documentFromScene(src, "别的模型"));

const page = await open();
const hint = () => page.evaluate(() => globalThis.__catsup.hud.status());
const toasts = () => page.evaluate(() => [...document.querySelectorAll(".toast-text")].map((t) => t.textContent));
const sheetUp = () => page.evaluate(() => !document.getElementById("sheet").hidden);
const shelf = () => page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return s.shelf.items.map((it) => ({ kind: it.kind, name: it.kind === "definition" ? s.defByGuid(it.ref)?.name : s.materials[s.materialByGuid(it.ref)]?.name })); });
const select = (name) => page.evaluate((n) => { const e = globalThis.__catsup.editor, s = e.sceneRef, i = [...s.def(s.root).instances.values()].find((x) => s.def(x.def).name === n || /^[0-9a-f]{4}$/.test(s.def(x.def).name) && n === "四位码"); e.deselectAll(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); return s.def(i.def).name; }, name);
const menu = () => page.evaluate(() => globalThis.__catsup.editor.commandMenu("objectMenu").map((m) => m.id));
const steps = () => page.evaluate(() => globalThis.__catsup.editor.history.steps());

await page.evaluate(() => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0) => { const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  box(0); e.selectAll(); e.makeComponent("椅子");
  e.deselectAll(); box(3); e.selectAll(); e.selectedPools.clear(); C.hud.pick("component");
  e.deselectAll();
});

// ① 有名字的直接上
await select("椅子");
check((await menu()).includes("shelve") && !(await menu()).includes("unshelve"), "菜单：还没上架 = 「放上素材架」");
const s1 = await steps();
await page.evaluate(() => globalThis.__catsup.hud.pick("action:shelve")); await page.waitForTimeout(60);
check(JSON.stringify(await shelf()) === '[{"kind":"definition","name":"椅子"}]', `上架了：${JSON.stringify(await shelf())}`);
check((await steps()) === s1 + 1, "一步");
check(/放上素材架 1 个/.test(await hint()), `提示：${await hint()}`);
check((await menu()).includes("unshelve") && !(await menu()).includes("shelve"), "菜单翻成「从素材架取下」");
await page.evaluate(() => globalThis.__catsup.hud.pick("action:unshelve")); await page.waitForTimeout(40);
check((await shelf()).length === 0, "取下了");
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(40);
check((await shelf()).length === 1, "撤销取下 = 回到架上");

// 锁着的也能上架
await select("四位码");
const code = await select("四位码");
check(/^[0-9a-f]{4}$/.test(code), `第二个组件没起名：${code}`);
await page.evaluate(() => globalThis.__catsup.editor.lockSelection(true)); await page.waitForTimeout(30);

// ② 没起名：先问名字
await page.evaluate(() => globalThis.__catsup.hud.pick("action:shelve")); await page.waitForTimeout(80);
check(await sheetUp(), "没起名 → 先弹起名");
await page.click("#sheetCancel"); await page.waitForTimeout(60);
check((await shelf()).length === 1 && await page.evaluate((c) => [...globalThis.__catsup.editor.sceneRef.defs.values()].some((d) => d.name === c), code), "取消 = 都不做");
const s2 = await steps();
await page.evaluate(() => globalThis.__catsup.hud.pick("action:shelve")); await page.waitForTimeout(80);
await page.fill("#sheetInput", "小猫"); await page.click("#sheetConfirm"); await page.waitForTimeout(80);
check((await shelf()).some((x) => x.name === "小猫"), `起名并上架（锁着的也行）：${JSON.stringify(await shelf())}`);
check((await steps()) === s2 + 1, "起名和上架 = 一步");
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(40);
check((await shelf()).length === 1 && await page.evaluate((c) => [...globalThis.__catsup.editor.sceneRef.defs.values()].some((d) => d.name === c), code), "一步撤销：名字和架子一起回去");
await page.evaluate(() => globalThis.__catsup.editor.redo()); await page.waitForTimeout(40);
check((await shelf()).length === 2, "重做回来");

// ③ 资源页
await page.click(".gizmo-hier"); await page.waitForTimeout(120);
await page.click(`${W} .float-title`); await page.waitForTimeout(80);
await page.locator(".popup-menu button", { hasText: "资源" }).click(); await page.waitForTimeout(120);
const res = () => page.evaluate((W) => { const q = (s) => [...document.querySelectorAll(`${W} ${s}`)]; return { heads: q(".res-head").map((h) => h.textContent), rows: q(".res-row").map((r) => ({ name: r.querySelector(".tree-name").textContent, meta: r.querySelector(".res-meta").textContent, act: r.querySelector(".res-act")?.textContent ?? null, orphan: r.classList.contains("is-orphan") })), purge: q(".res-purge").map((b) => ({ t: b.textContent, off: b.disabled })), notes: q(".res-note").map((n) => n.textContent) }; }, W);
let R = await res();
check(R.heads[0] === "素材架（2）", `第一节 = 素材架：${R.heads}`);
check(R.rows.slice(0, 2).every((r) => r.act === "取下"), `架上两行都能取下：${JSON.stringify(R.rows.slice(0, 2))}`);
check(R.rows.filter((r) => r.name === "椅子")[1]?.meta.includes("在素材架上"), `组件行说在架上：${JSON.stringify(R.rows)}`);
await page.evaluate(() => globalThis.__catsup.editor.commitOp({ op: "addMaterial", name: "木头", color: [0.5, 0.4, 0.3] })); await page.waitForTimeout(60);
R = await res();
const wood = R.rows.find((r) => r.name === "木头");
check(wood?.act === "上架" && wood.meta === "没人用" && wood.orphan, `没人用的材质有「上架」：${JSON.stringify(wood)}`);
await page.locator(`${W} .res-row`, { hasText: "木头" }).locator(".res-act").click(); await page.waitForTimeout(80);
R = await res();
check(R.heads[0] === "素材架（3）" && (await shelf()).some((x) => x.kind === "material" && x.name === "木头"), "材质上架了");
const wood2 = R.rows.filter((r) => r.name === "木头").at(-1);
check(wood2.meta === "收在素材架上" && !wood2.orphan && !wood2.act, `材质行：${JSON.stringify(wood2)}`);
check(R.purge.some((b) => /没有没人用的材质/.test(b.t) && b.off), `清理材质没得清：${JSON.stringify(R.purge)}`);
// 架上的组件一份都不摆：不算孤儿
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef, i = [...s.def(s.root).instances.values()].find((x) => s.def(x.def).name === "椅子"); e.commitOp({ op: "eraseInstance", def: s.root, instance: i.id }); }); await page.waitForTimeout(60);
R = await res();
check(R.rows.filter((r) => r.name === "椅子").at(-1).meta.includes("在素材架上") && !R.rows.filter((r) => r.name === "椅子").at(-1).orphan, "一份都不摆、在架上 = 不是孤儿");
check(R.purge.some((b) => /没有没人用的组件/.test(b.t)), "没有孤儿可清");
await page.locator(`${W} .res-row`, { hasText: "椅子" }).first().locator(".res-act").click(); await page.waitForTimeout(80);
R = await res();
check(R.rows.filter((r) => r.name === "椅子").at(-1).orphan && R.purge.some((b) => /清理没人用的组件（1 个）/.test(b.t)), `取下 = 变孤儿：${JSON.stringify(R.purge)}`);
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); e.undo(); }); await page.waitForTimeout(60);

// ④ 导入别的 .catsup
const before = () => page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return { defs: s.defs.size, mats: s.materials.length, layers: s.layers.length, root: s.def(s.root).instances.size, shelf: s.shelf.items.length, names: [...s.defs.values()].map((d) => d.name) }; });
const b0 = await before(), s4 = await steps();
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes)); await page.waitForTimeout(200);
check(await sheetUp(), "选了文件 → 问挑哪些");
const form = await page.evaluate(() => ({ title: document.getElementById("sheetTitle").textContent, msg: document.getElementById("sheetMessage").textContent, rows: [...document.querySelectorAll("#sheetChoices .sheet-field-label")].map((l) => l.textContent), keys: [...document.querySelectorAll("#sheetChoices .sheet-field")].map((f) => f.dataset.field) }));
check(form.rows.length === 3 && ["沙发", "靠垫", "边几"].every((n) => form.rows.some((r) => r.startsWith(n))), `只列有名字的：${form.rows}`);
check(/2 个没起名/.test(form.msg), `没起名的数出来说一声：${form.msg}`);
check(form.rows.find((r) => r.startsWith("沙发")).includes("摆了 1 份"), `摆了几份：${form.rows}`);
// 只要沙发（靠垫、b7c1 是它里面的，照样带）
for (const k of form.keys) if (k !== sofaGuid) await page.click(`#sheetChoices .sheet-field[data-field="${k}"] button[data-value="no"]`);
await page.click("#sheetConfirm"); await page.waitForTimeout(150);
const b1 = await before();
check(["沙发", "靠垫", "b7c1"].every((n) => b1.names.includes(n)) && !b1.names.includes("边几") && !b1.names.includes("a3f2"), `带进来的 = 挑中的 + 它里面的：${b1.names}`);
check(b1.root === b0.root, "场景里没多摆东西");
check(b1.mats === b0.mats + 1 && b1.layers === b0.layers + 1, `带进 1 个材质 1 个层：${JSON.stringify(b1)}`);
check((await shelf()).at(-1).name === "沙发" && b1.shelf === b0.shelf + 1, "只有挑中的上架");
check((await steps()) === s4 + 1, "一步");
const t1 = (await toasts()).at(-1);
check(/上架 1 个组件/.test(t1) && /新建 1 个/.test(t1) && /里面的组件新建了 2 个/.test(t1) && /1 个材质/.test(t1) && /1 个层/.test(t1), `通知说清：${t1}`);
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
const b2 = await before();
check(b2.defs === b0.defs && b2.mats === b0.mats && b2.layers === b0.layers && b2.shelf === b0.shelf, "一步撤销：全回去");
await page.evaluate(() => globalThis.__catsup.editor.redo()); await page.waitForTimeout(60);
// 再导入一次：全挑
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes)); await page.waitForTimeout(200);
await page.click("#sheetConfirm"); await page.waitForTimeout(150);
const b3 = await before(), t3 = (await toasts()).at(-1);
check(b3.shelf === b1.shelf + 2 && b3.names.includes("边几"), `已在架上的不重复放、别的上架：${JSON.stringify(b3)}`);
check(/本文件已有/.test(t3) && /本来就在架上/.test(t3), `通知说清：${t3}`);
// 同一个组件那边又改过：同一弹窗同一默认（设计书 §8，user 11-04「4 用」）
src.def([...src.defs.values()].find((d) => d.name === "沙发").id).name = "新版沙发";
const srcBytes2 = writeCatsup(documentFromScene(src, "别的模型"));
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes2)); await page.waitForTimeout(200);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
const conflict = await page.evaluate(() => ({ up: !document.getElementById("sheet").hidden, title: document.getElementById("sheetTitle").textContent, msg: document.getElementById("sheetMessage").textContent, on: document.querySelector('#sheetChoices [data-field="entries"] [aria-checked="true"]')?.dataset.value }));
check(conflict.up && /不一样/.test(conflict.title) && conflict.on === "update" && /沙发/.test(conflict.msg), `撞上内容不一样：弹同一个窗、默认更新：${JSON.stringify(conflict)}`);
await page.click("#sheetCancel"); await page.waitForTimeout(100);
const b5 = await before();
check(b5.defs === b3.defs && b5.shelf === b3.shelf && !b5.names.includes("新版沙发"), "取消 = 不导入");
// 站在要被更新的组件里导入：只有更新灰掉、默认留这里的（导入落在根，不会贴进它自己）；弹窗开着键盘不穿过去；点完人还站在里面（别让用户被踢下去）
const s5 = await steps();
await page.evaluate(async () => { const e = globalThis.__catsup.editor, s = e.sceneRef, sofa = [...s.defs.values()].find((d) => d.name === "沙发"); e.commitOp({ op: "placeInstance", at: { def: s.root, group: null }, definition: sofa.id, xform: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }); const i = [...s.def(s.root).instances.values()].find((x) => x.def === sofa.id); e.deselectAll(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); e.enterSelected(); await new Promise((r) => setTimeout(r, 30)); });
const standing = () => page.evaluate(() => { const e = globalThis.__catsup.editor; return { depth: e.context.chain.length, steps: e.history.steps(), tool: e.tool }; });
const k0 = await standing();
check(k0.depth === 1, `站进沙发了：${JSON.stringify(k0)}`);
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes2)); await page.waitForTimeout(200);
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
const kEsc = await standing();
check(!(await sheetUp()) && kEsc.depth === 1 && kEsc.steps === k0.steps, `Esc 只关弹窗，人还站在里面：${JSON.stringify(kEsc)}`);
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes2)); await page.waitForTimeout(200);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
const inSofa = await page.evaluate(() => ({ on: document.querySelector('#sheetChoices [data-field="entries"] [aria-checked="true"]')?.dataset.value, grey: [...document.querySelectorAll('#sheetChoices [data-field="entries"] button:disabled')].map((x) => x.dataset.value), why: [...document.querySelectorAll('#sheetChoices [data-field="entries"] .sheet-field-why')].map((x) => x.textContent) }));
check(inSofa.grey.join() === "update" && inSofa.on === "keep", `只有更新灰、默认留这里的：${JSON.stringify(inSofa)}`);
check(inSofa.why.length === 1 && inSofa.why[0].includes("沙发") && inSofa.why[0].includes("先退出来"), `原因带名字：${inSofa.why.join(" | ")}`);
await page.keyboard.press("Control+z"); await page.keyboard.press("l"); await page.waitForTimeout(80);
const k1 = await standing();
check(await sheetUp() && k1.steps === k0.steps && k1.tool === k0.tool, `弹窗开着键盘不穿过去（Ctrl+Z / 换工具）：${JSON.stringify(k1)}`);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
const k2 = await standing(), b5k = await before();
check(k2.depth === 1 && k2.steps === k0.steps + 1, `留这里的：一步、人还站在里面：${JSON.stringify(k2)}`);
check(b5k.names.includes("沙发") && !b5k.names.includes("新版沙发"), `留这里的：这边的不变：${b5k.names}`);
await page.evaluate((n) => { const e = globalThis.__catsup.editor; while (e.history.steps() > n && e.canUndo()) e.undo(); e.exitTo(0); }, s5); await page.waitForTimeout(60);   // 摆放、进组件、导入各算一步
const b5r = await before();
check(b5r.defs === b3.defs && b5r.shelf === b3.shelf && b5r.root === b3.root, `撤回去：${JSON.stringify(b5r)}`);
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes2)); await page.waitForTimeout(200);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
const b6 = await before(), t6 = (await toasts()).at(-1);
check(b6.names.includes("新版沙发") && !b6.names.includes("沙发") && b6.shelf === b3.shelf && b6.defs === b3.defs, `更新：原地换、架上不多：${JSON.stringify(b6)}`);
check(/更新了组件/.test(t6), `通知说清：${t6}`);
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
await page.setInputFiles("#shelfImportFile", catsupFile(srcBytes2)); await page.waitForTimeout(200);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
await page.click('#sheetChoices [data-field="entries"] button[data-value="detach"]'); await page.waitForTimeout(40);
await page.click("#sheetConfirm"); await page.waitForTimeout(200);
const b7 = await before(), t7 = (await toasts()).at(-1);
check(b7.names.includes("沙发") && b7.names.includes("新版沙发") && b7.shelf === b3.shelf + 1 && (await shelf()).some((x) => x.name === "新版沙发"), `断开：两个都在、架上放的是新的：${JSON.stringify(b7)}`);
check(/断开/.test(t7), `通知说清：${t7}`);
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
// 加密的：先问口令
const packed = await page.evaluate(async (bytes) => { const C = globalThis.__catsup; const blob = await C.encryption.packContainer({ dataBytes: new Uint8Array(bytes), fileName: "加密的", ext: "catsup", password: "口令" }); C.crypto.answer(async () => "口令"); return [...new Uint8Array(await blob.arrayBuffer())]; }, [...srcBytes]);
await page.setInputFiles("#shelfImportFile", catsupFile(new Uint8Array(packed), "加密的.catsup.zip")); await page.waitForTimeout(500);
check(await sheetUp() && /加密的/.test(await page.evaluate(() => document.getElementById("sheetTitle").textContent)), "加密的：解开后问挑哪些");
await page.click("#sheetCancel"); await page.waitForTimeout(60);
const b4 = await before();
check(b4.defs === b3.defs && b4.shelf === b3.shelf, "取消 = 什么都不动");
// 外来 glb：拒
await page.setInputFiles("#shelfImportFile", catsupFile(encodeGlb({ asset: { version: "2.0" }, scenes: [{ nodes: [] }] }, new Uint8Array(0)), "外来.glb")); await page.waitForTimeout(150);
check(/导入 glb/.test((await toasts()).at(-1)) && !(await sheetUp()), `外来 glb 指去导入：${(await toasts()).at(-1)}`);
// 坏文件：说失败，不炸
await page.setInputFiles("#shelfImportFile", catsupFile(new Uint8Array([1, 2, 3, 4]), "坏的.catsup")); await page.waitForTimeout(150);
check(/导入素材失败|不是/.test((await toasts()).at(-1)), `坏文件说清：${(await toasts()).at(-1)}`);
// 导入完存盘：架子和新条目都在（读回来）
const reread = await page.evaluate(() => { const C = globalThis.__catsup, bytes = C.session.encode(); return [...bytes]; });
const { json: J } = decodeGlb(new Uint8Array(reread));
check(J.extensions.CATSUP_shelf.items.some((it) => it.kind === "definition"), "存盘写进 CATSUP_shelf");

// ⑤ 太新的架子
const tooNew = (() => {
  const doc = documentFromScene(src, "太新的"), comp = doc.definitions.find((d) => d.name === "边几");
  doc.shelf = { folders: [], items: [{ guid: mintGuid(), kind: "definition", ref: comp.guid, folder: null }], extra: {} };
  const { json, bin } = decodeGlb(writeCatsup(doc));
  json.extensions.CATSUP_shelf.version = 9; json.extensions.CATSUP_shelf.future = 1;
  return { bytes: encodeGlb(json, bin), raw: JSON.stringify(json.extensions.CATSUP_shelf) };
})();
const p2 = await open();
const opened = await p2.evaluate(async (b) => { const C = globalThis.__catsup; const ok = await C.session.openLocalBytes(new Uint8Array(b), "太新的.catsup", null); return { ok, status: [...document.querySelectorAll(".toast-text")].map((x) => x.textContent).join(" | "), frozen: !!C.editor.sceneRef.shelfFrozen }; }, [...tooNew.bytes]);
check(opened.ok && opened.frozen, "能开、标着");
check(/素材架是更新版写的/.test(opened.status) && /原样带回/.test(opened.status) && !/只能看/.test(opened.status), `提示行说清（读不出就不说能看）：${opened.status}`);
await p2.click(".gizmo-hier"); await p2.waitForTimeout(120);
await p2.click(`${W} .float-title`); await p2.waitForTimeout(80);
await p2.locator(".popup-menu button", { hasText: "资源" }).click(); await p2.waitForTimeout(120);
const R5 = await p2.evaluate((W) => { const q = (s) => [...document.querySelectorAll(`${W} ${s}`)]; return { heads: q(".res-head").map((h) => h.textContent), notes: q(".res-shelf-note").map((n) => n.textContent), acts: q(".res-act").length, btns: q(".res-purge, .res-import").map((b) => ({ t: b.textContent, off: b.disabled })), orphan: q(".res-row").filter((r) => r.textContent.includes("边几")).map((r) => r.textContent) }; }, W);
check(R5.heads[0] === "素材架" && /更新版写的/.test(R5.notes[0]), `那一节只有说明：${JSON.stringify(R5.notes)}`);
check(R5.acts === 0, "没有「上架」「取下」");
check(R5.orphan.length === 1 && /可能收在素材架上/.test(R5.orphan[0]) && !/孤儿/.test(R5.orphan[0]), `看不见架子就不说它是孤儿：${R5.orphan}`);
check(R5.btns.length === 3 && R5.btns.every((b) => b.off), `导入 / 清理都不开：${JSON.stringify(R5.btns)}`);
const r5 = await p2.evaluate(() => { const C = globalThis.__catsup, e = C.editor, s = e.sceneRef, i = [...s.def(s.root).instances.values()][0]; e.deselectAll(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); const menu = e.commandMenu("objectMenu").map((m) => m.id); e.commitOp({ op: "shelfFolderAdd", name: "x", parent: null, guid: crypto.randomUUID() }); const hintAfter = C.hud.status(); const toast = [...document.querySelectorAll(".toast-error .toast-text")].map((t) => t.textContent); return { menu, hintAfter, toast, folders: e.sceneRef.shelf.folders.length }; });
check(!r5.menu.includes("shelve") && !r5.menu.includes("unshelve"), "物件菜单不露上架");
check(/更新版/.test(r5.hintAfter) && r5.toast.length === 0 && r5.folders === 0, `硬改也拒：提示行说、不弹错误：${JSON.stringify(r5)}`);
const raw2 = await p2.evaluate(() => [...globalThis.__catsup.session.encode()]);
check(JSON.stringify(decodeGlb(new Uint8Array(raw2)).json.extensions.CATSUP_shelf) === tooNew.raw, "存盘：架子原字节带回");

await browser.close();
check(errs.length === 0, `页面没报错：${errs.join(" | ").slice(0, 300)}`);
console.log(fails.length ? `probe-shelf FAIL\n- ${fails.join("\n- ")}` : "probe-shelf OK");
process.exit(fails.length ? 1 : 0);

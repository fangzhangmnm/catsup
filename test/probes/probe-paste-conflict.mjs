// test/probes/probe-paste-conflict.mjs —— 粘贴撞上「同一个组件、两边内容不一样」的弹窗（身份层 ID-4b，设计书 ai-docs/20261104-identity-layer-design.md §6 / §8；app/paste-actions.ts）。无头。created 2026-11-04 by Claude Opus 5.5
// user 11-04：「你可以把一个组件拷出去，修，然后拷回来，其他的实例都跟上」「也许需要做一个break link的选项」；深夜拍「2弹窗 3 跟，可开关」。
// ① 同一次打开：拷 → 改 → 贴 = 不问，用现在的 ② 换一次打开、内容一样 = 不问 ③ 内容不一样 = 弹：说事实、默认更新、不说「别的模型」；取消 = 不贴
// ④ 留这里的 = 只多摆一份 ⑤ 更新 = 摆着的每一份都跟上、一步撤销 ⑥ 断开 = 贴成新的、原来的不动 ⑦ 站在要贴的组件里 = 更新 / 留这里的灰掉带原因、默认落在断开、贴得出 ⑧ 材质开关
// ⑨ 站在里面、这边的上层不指它 = 只有更新灰掉、默认落在留这里的 ⑩ 三种都走不通 = 不弹、提示行说原因（ID-4 小尾巴 ①，设计书 §16；账本原写 ⑦ 落留这里的，但站在椅子里贴椅子留这里的也成环，实际落断开：Claude Opus 5.5 2026-11-05）
// ③½ 弹窗开着键盘不穿过去；问的时候场景变了 = 前沿作废重算（Claude Opus 5.5 2026-11-05）
// 用法：python3 -m http.server 8765 → node test/probes/probe-paste-conflict.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const fails = [], check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const sheetUp = () => page.evaluate(() => !document.getElementById("sheet").hidden);
const sheet = () => page.evaluate(() => ({ title: document.getElementById("sheetTitle").textContent, msg: document.getElementById("sheetMessage").textContent, on: document.querySelector('#sheetChoices [data-field="entries"] [aria-checked="true"]')?.dataset.value, materials: !!document.querySelector('#sheetChoices [data-field="materials"]'), grey: [...document.querySelectorAll('#sheetChoices [data-field="entries"] button:disabled')].map((x) => x.dataset.value), why: [...document.querySelectorAll('#sheetChoices [data-field="entries"] .sheet-field-why')].map((x) => x.textContent) }));
const paste = async () => { await page.evaluate(() => globalThis.__catsup.editor.pasteClipboard()); await page.waitForTimeout(80); };
const state = () => page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef, root = s.def(s.root); return { defs: s.defs.size, names: [...s.defs.values()].filter((d) => d.id !== s.root).map((d) => d.name), root: root.instances.size, kinds: [...root.instances.values()].map((i) => s.def(i.def).name), steps: e.history.steps(), colors: s.materials.map((m) => m.color[1]) }; });
const hint = () => page.evaluate(() => globalThis.__catsup.hud.status());
const choose = async (v) => { await page.click(`#sheetChoices [data-field="entries"] button[data-value="${v}"]`); await page.waitForTimeout(30); };
const ok = async () => { await page.click("#sheetConfirm"); await page.waitForTimeout(120); };
const undo = async () => { await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(50); };

const setup = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0, y0) => { const B = [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } return segs; };
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0) }); e.selectAll(); e.selectedPools.clear(); e.makeComponent("椅子"); await sleep(20);
  e.commitOp({ op: "addMaterial", name: "红", color: [1, 0, 0] });
  const s = () => e.sceneRef, inst = [...s().def(s().root).instances.values()][0], k = s().brep(inst.def).kernel;
  const f = k.faces()[0]; k.setFaceMaterial([f.id], s().slotFor(inst.def, 0));   // 直接涂：要的只是「组件用着红」
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id });
  e.copySelection(); await sleep(10);
  return { guid: s().def(inst.def).guid, def: inst.def };
});
// ① 同一次打开：拷 → 改 → 贴 = 不问、用现在的
await page.evaluate(({ def }) => { const e = globalThis.__catsup.editor; e.commitOp({ op: "rename", at: { def: e.sceneRef.root, group: null }, def, name: "改过的椅子" }); }, setup);
await paste();
check(!(await sheetUp()), "同一次打开：拷之后改过也不问");
let s1 = await state();
check(s1.root === 2 && s1.names.join() === "改过的椅子", `只多摆一份、用现在的：${JSON.stringify(s1)}`);
// ② 换一次打开（新建）：第一次贴 = 新建、不问；内容一样再贴 = 不问
await page.evaluate(async () => { const e = globalThis.__catsup.editor; e.loadKernel(new (Object.getPrototypeOf(e.scene.brep(e.scene.root).kernel).constructor)(), "新建"); await new Promise((r) => setTimeout(r, 40)); });
await paste();
check(!(await sheetUp()), "这边没有：不问，带原身份新建");
s1 = await state();
check(s1.root === 1 && s1.names.join() === "椅子", `新建：${JSON.stringify(s1)}`);
await paste();
check(!(await sheetUp()), "内容一样：不问，只多摆一份");
s1 = await state();
check(s1.root === 2 && s1.defs === 2, `多摆一份：${JSON.stringify(s1)}`);
check(/本文件已有/.test(await hint()), `说清用了这边的：${await hint()}`);
// ③ 这边改过 = 内容不一样 = 弹
await page.evaluate(({ guid }) => { const e = globalThis.__catsup.editor, s = e.sceneRef; e.commitOp({ op: "rename", at: { def: s.root, group: null }, def: s.defByGuid(guid).id, name: "这里的椅子" }); }, setup);
await paste();
check(await sheetUp(), "内容不一样：弹");
let f = await sheet();
check(f.title.includes("不一样"), `标题说事实：${f.title}`);
check(f.on === "update", `默认更新：${f.on}`);
check(!/别的模型/.test(f.title + f.msg), `不说「别的模型」：${f.msg}`);
check(f.msg.includes("这里的椅子") && f.msg.includes("摆了 2 份") && /\d+ 张面/.test(f.msg), `列事实：${f.msg}`);
check(!f.materials, "只有组件不一样：不露材质开关");
const s3 = await state();
await page.click("#sheetCancel"); await page.waitForTimeout(80);
s1 = await state();
check(s1.root === s3.root && s1.steps === s3.steps, "取消 = 不贴");
check(/没贴/.test(await hint()), `说清没贴：${await hint()}`);
// ③½ 弹窗开着键盘不穿过去；问的时候场景变了（这里用代码撤一步，键盘已经到不了）= 前沿作废重算，不按问的时候那份事实走
await paste();
const k0 = await page.evaluate(() => ({ steps: globalThis.__catsup.editor.history.steps(), tool: globalThis.__catsup.editor.tool }));
await page.keyboard.press("Control+z"); await page.keyboard.press("l"); await page.waitForTimeout(80);
const k1 = await page.evaluate(() => ({ steps: globalThis.__catsup.editor.history.steps(), tool: globalThis.__catsup.editor.tool }));
check(await sheetUp() && k1.steps === k0.steps && k1.tool === k0.tool, `Ctrl+Z / 换工具不穿过弹窗：${JSON.stringify(k1)}`);
await undo();   // 撤掉「这里的椅子」：两边又一样了
await ok();
check(!/更新了组件/.test(await hint()) && (await state()).root === 3, `场景变过：前沿重算，没有东西要更新，只多摆一份：${await hint()}`);
await undo();
await page.evaluate(({ guid }) => { const e = globalThis.__catsup.editor, s = e.sceneRef; e.commitOp({ op: "rename", at: { def: s.root, group: null }, def: s.defByGuid(guid).id, name: "这里的椅子" }); }, setup);
// ④ 留这里的
await paste(); await choose("keep");
f = await sheet();
check(/这份模型里的不变/.test(f.msg), `选了就说后果：${f.msg}`);
await ok();
s1 = await state();
check(s1.root === 3 && s1.names.join() === "这里的椅子" && s1.steps === s3.steps + 1, `留这里的 = 只多摆一份：${JSON.stringify(s1)}`);
check(/本文件这版/.test(await hint()), `提示行说了：${await hint()}`);
await undo();
// ⑤ 更新（默认）
await paste();
f = await sheet();
check(/每一份都会变/.test(f.msg), `更新的后果：${f.msg}`);
await ok();
s1 = await state();
check(s1.root === 3 && s1.defs === 2 && s1.kinds.every((n) => n === "椅子"), `摆着的都跟上、没多定义：${JSON.stringify(s1)}`);
check(s1.steps === s3.steps + 1, "一步");
check(/更新了组件/.test(await hint()), `提示行：${await hint()}`);
await undo();
s1 = await state();
check(s1.root === 2 && s1.kinds.every((n) => n === "这里的椅子"), `一步撤销全回去：${JSON.stringify(s1)}`);
// ⑥ 断开
await paste(); await choose("detach"); await ok();
s1 = await state();
check(s1.defs === 3 && s1.root === 3 && s1.kinds.filter((n) => n === "这里的椅子").length === 2 && s1.kinds.includes("椅子"), `贴成新的、原来的不动：${JSON.stringify(s1)}`);
check(/断开/.test(await hint()), `提示行：${await hint()}`);
await undo();
// ⑦ 站在要被更新的组件里
await page.evaluate(async () => { const e = globalThis.__catsup.editor, s = e.sceneRef, i = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); e.enterSelected(); await new Promise((r) => setTimeout(r, 30)); });
const s7 = await state();
await paste();
check(await sheetUp(), "站在里面：有走得通的就问");
f = await sheet();
check(f.grey.join() === "update,keep", `更新、留这里的灰掉：${f.grey}`);
check(f.on === "detach", `默认落在第一个走得通的（断开）：${f.on}`);
check(f.why.some((t) => t.startsWith("用拷来的更新") && t.includes("这里的椅子") && t.includes("先退出来")), `更新的原因写在下面、带名字：${f.why.join(" | ")}`);
check(f.why.some((t) => t.startsWith("留这份模型的") && t.includes("贴进它自己")), `留这里的的原因：${f.why.join(" | ")}`);
await page.click('#sheetChoices [data-field="entries"] button[data-value="update"]', { force: true }).catch(() => {}); await page.waitForTimeout(30);
check((await sheet()).on === "detach", "点灰的没反应");
await ok();
s1 = await state();
check(s1.steps === s7.steps + 1 && s1.defs === s7.defs + 1, `断开贴得出（新身份，不成环）：${JSON.stringify(s1)}`);
check(/断开/.test(await hint()), `提示行：${await hint()}`);
await undo();
await page.evaluate(() => globalThis.__catsup.editor.exitTo(0)); await page.waitForTimeout(30);
// ⑧ 材质开关：这边的红和拷来的不一样 + 组件也不一样
await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; s.materials[0] = { ...s.materials[0], color: [1, 0.5, 0] }; });
await paste();
f = await sheet();
check(f.materials, "组件和材质都不一样：露材质开关");
check(/材质「红」/.test(f.msg) && /#ff8000|#ff7f00|#ff8/.test(f.msg), `材质的事实：${f.msg}`);
await page.click('#sheetChoices [data-field="materials"] button[data-value="no"]'); await page.waitForTimeout(30);
await ok();
s1 = await state();
check(s1.colors[0] === 0.5 && s1.kinds.every((n) => n === "椅子"), `不跟：组件更新了、材质留这里的：${JSON.stringify(s1)}`);
await undo();
await paste(); await choose("keep");
check(!(await sheet()).materials, "留这里的：开关收起来（没有更新可跟）");
await page.click("#sheetCancel"); await page.waitForTimeout(40);
await paste(); await ok();
s1 = await state();
check(s1.colors[0] === 0, `默认跟：材质也更新了：${JSON.stringify(s1)}`);
// ⑨ 站在里面、这边的上层不指它：只有更新走不通 ⑩ 不一样的只是旁边的兄弟：断开也救不了 = 不弹
const fresh = async () => { await page.evaluate(async () => { const e = globalThis.__catsup.editor; e.loadKernel(new (Object.getPrototypeOf(e.scene.brep(e.scene.root).kernel).constructor)(), "新建"); await new Promise((r) => setTimeout(r, 40)); }); };
const built = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), s = () => e.sceneRef, P = (x, y, z = 0) => ({ x, y, z }), xf = [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
  const box = (x0) => { const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } return segs; };
  const comp = async (x0, name) => { e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(x0) }); e.selectAll(); e.selectedPools.clear(); e.makeComponent(name); await sleep(20); return [...s().defs.values()].find((d) => d.name === name); };
  e.loadKernel(new (Object.getPrototypeOf(s().brep(s().root).kernel).constructor)(), "新建"); await sleep(40);
  const x = await comp(20, "甲"), y = await comp(30, "乙"), parent = await comp(40, "父");
  const at = { def: parent.id, group: null };
  e.commitOp({ op: "placeInstance", at, definition: x.id, xform: xf }); e.commitOp({ op: "placeInstance", at, definition: y.id, xform: xf }); await sleep(10);
  const ip = [...s().def(s().root).instances.values()].find((i) => i.def === parent.id);
  e.selectedPools.clear(); e.selectedPools.set(`i${ip.id}`, { kind: "instance", instance: ip.id });
  e.copySelection(); await sleep(10);
  return { x: x.guid, y: y.guid, parent: parent.guid };
});
await fresh(); await paste();
check(!(await sheetUp()) && (await state()).names.length === 3, `第一次贴：父 / 甲 / 乙都新建：${JSON.stringify(await state())}`);
const enterX = () => page.evaluate(async ({ x, parent }) => { const e = globalThis.__catsup.editor, s = e.sceneRef, pick = (id) => { e.selectedPools.clear(); e.selectedPools.set(`i${id}`, { kind: "instance", instance: id }); e.enterSelected(); }; const ip = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).guid === parent); if (ip) { pick(ip.id); await new Promise((r) => setTimeout(r, 30)); } const ix = [...(ip ? s.def(ip.def) : s.def(s.root)).instances.values()].find((i) => s.def(i.def).guid === x); pick(ix.id); await new Promise((r) => setTimeout(r, 30)); }, built);
// ⑩ 只改乙：父、甲一样；站在 父 → 甲 里
await page.evaluate(({ y }) => { const e = globalThis.__catsup.editor, s = e.sceneRef; e.commitOp({ op: "rename", at: { def: s.root, group: null }, def: s.defByGuid(y).id, name: "改过的乙" }); }, built);
await enterX();
const s10 = await state();
await paste();
check(!(await sheetUp()), "⑩ 三种都走不通：不弹窗");
check(/三种处理都走不通/.test(await hint()) && /更新、留这里的、断开：会把物件贴进它自己里/.test(await hint()), `提示行说原因：${await hint()}`);
s1 = await state();
check(s1.steps === s10.steps && s1.root === s10.root, "⑩ 没动");
await page.evaluate(() => globalThis.__catsup.editor.exitTo(0)); await page.waitForTimeout(30);
// ⑨ 这边的父不再用甲、甲直接摆在根上、甲也改过：站在甲里 = 更新灰（脚下的路）；留这里的不成环（这边的父不指甲）
await page.evaluate(({ x, parent }) => { const e = globalThis.__catsup.editor, s = e.sceneRef, P = s.defByGuid(parent), X = s.defByGuid(x); for (const i of [...P.instances.values()]) if (i.def === X.id) P.instances.delete(i.id); e.commitOp({ op: "placeInstance", at: { def: s.root, group: null }, definition: X.id, xform: [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1] }); e.commitOp({ op: "rename", at: { def: s.root, group: null }, def: X.id, name: "这里的甲" }); }, built);
await page.evaluate(async ({ x }) => { const e = globalThis.__catsup.editor, s = e.sceneRef, ix = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).guid === x); e.selectedPools.clear(); e.selectedPools.set(`i${ix.id}`, { kind: "instance", instance: ix.id }); e.enterSelected(); await new Promise((r) => setTimeout(r, 30)); }, built);
const s9 = await state();
await paste();
check(await sheetUp(), "⑨ 有走得通的：弹");
f = await sheet();
check(f.grey.join() === "update", `⑨ 只有更新灰掉：${f.grey}`);
check(f.on === "keep", `⑨ 默认落在留这里的：${f.on}`);
check(f.why.length === 1 && f.why[0].includes("你站在组件「这里的甲」里面") && f.why[0].includes("先退出来"), `⑨ 原因：${f.why.join(" | ")}`);
await ok();
s1 = await state();
check(s1.steps === s9.steps + 1 && s1.defs === s9.defs, `⑨ 留这里的贴得出、没多定义：${JSON.stringify(s1)}`);
check(errs.length === 0, `页面没报错：${errs.join(" | ")}`);
await b.close();
if (fails.length) { console.error(`✗ probe-paste-conflict：${fails.length} 条`); process.exit(1); }
console.log("✓ probe-paste-conflict");

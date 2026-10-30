// 演示锁探针（headless，借 WeebPaint 的 playwright；周账 F-124 / F-125'）：
// 锁上 → ① commitOp 拒 ② 真鼠标在画布上拖画线 = 什么都没画 ③ 自由建模里按 G = 不起手 ④ Ctrl+Z 不动 ⑤ 右键不出菜单 ⑥ 中键拖 = 相机照转 ⑦ X 光照切
// ⑧ ☰ 文件页那一行写「解锁」、左上角「锁着」、body.doc-locked ⑨ 导出字节的 CATSUP_desk 带 locked:true、不带 final ⑩ 新页面读这份字节 = 打开就是锁着的 ⑪ 解锁 → 又能画。
// 用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-present-lock.mjs [url]`。created 2026-10-29 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 400)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const out = {}, ok = (k, v) => { out[k] = v; if (!v) process.exitCode = 1; };
const rev = () => page.evaluate(() => globalThis.__catsup.editor.revision);
const cam = () => page.evaluate(() => { const c = globalThis.__catsup.editor.cam; return [c.yaw, c.pitch, c.halfH].map((v) => +v.toFixed(5)).join(","); });

// 有内容：一个盒子（硬表面），再锁
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [2, 0], [2, 2], [0, 2]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.deselectAll(); e.zoomExtents(); e.draw(); });
const r0 = await rev(); ok("hasContent", r0 > 0);
await page.evaluate(async () => { await globalThis.__catsup.session.setLocked(true); }); await page.waitForTimeout(120);
ok("sessionLocked", await page.evaluate(() => globalThis.__catsup.session.locked() && globalThis.__catsup.editor.locked));
ok("badgeAndBody", await page.evaluate(() => document.getElementById("lockBadge").hidden === false && document.body.classList.contains("doc-locked")));
// 场景表 6（v0.17.58）：锁着 = 没有「正在编辑的那一层」——活动槽也按普通槽放（结构线跟画风走，不画线的画风就不画）
const tiers = () => page.evaluate(() => { const e = globalThis.__catsup.editor; e.draw(); return e.provider.pull({}).placements.map((p) => p.tier).join(","); });
ok("noEditingLayer", /^0(,0)*$/.test(await tiers()));

// ① 脚本提交被拒
ok("commitRefused", await page.evaluate((r) => { const e = globalThis.__catsup.editor; const ev = e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[{ x: 0, y: 5, z: 0 }, { x: 1, y: 5, z: 0 }]] }); return Array.isArray(ev) && ev.length === 0 && e.revision === r; }, r0));
// ② 真鼠标：画线工具在画布上点两下 = 什么都没画（指针按下这一口拒）
await page.evaluate(() => globalThis.__catsup.editor.setTool("line"));
const box = await page.evaluate(() => { const r = document.getElementById("board").getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
await page.mouse.click(box.x + box.w * 0.55, box.y + box.h * 0.55); await page.waitForTimeout(60);
await page.mouse.click(box.x + box.w * 0.75, box.y + box.h * 0.6); await page.waitForTimeout(120);
ok("mouseDrawRefused", (await rev()) === r0 && !(await page.evaluate(() => globalThis.__catsup.editor.isGestureActive())));
ok("hintSaysLocked", await page.evaluate(() => /锁着/.test(document.getElementById("hint").textContent)));
// ④ Ctrl+Z 不动
await page.keyboard.press("Control+z"); await page.waitForTimeout(80);
ok("undoRefused", (await rev()) === r0);
// ⑤ 右键不出菜单
await page.mouse.click(box.x + box.w * 0.5, box.y + box.h * 0.5, { button: "right" }); await page.waitForTimeout(150);
ok("noContextMenu", (await page.locator(".popup-menu").count()) === 0);
// ⑥ 相机照转（中键拖 = orbit）
const c0 = await cam();
await page.mouse.move(box.x + box.w * 0.5, box.y + box.h * 0.5); await page.mouse.down({ button: "middle" });
for (let i = 1; i <= 6; i++) { await page.mouse.move(box.x + box.w * 0.5 + i * 20, box.y + box.h * 0.5 + i * 8); await page.waitForTimeout(10); }
await page.mouse.up({ button: "middle" }); await page.waitForTimeout(60);
ok("orbitWorks", (await cam()) !== c0);
// ⑦ X 光照切（看的事）
ok("xrayWorks", await page.evaluate(() => { const e = globalThis.__catsup.editor, before = e.xray; e.setXray(!before); const after = e.xray; e.setXray(before); return after !== before; }));
// ⑧ ☰ 文件页：那一行是「解锁」
await page.click("#btnMenu"); await page.waitForTimeout(100); await page.click('.popup-menu [data-menu-tab="file"]', { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60);
const labels = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent));
ok("menuSaysUnlock", labels.includes("解锁") && !labels.some((l) => /定稿|改稿|锁上/.test(l)));
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
// ⑨ 导出字节带 desk.locked，不带老 final
const bytes = await page.evaluate(() => Array.from(globalThis.__catsup.session.encode()));
const glbJson = (arr) => { const buf = Buffer.from(arr); const len = buf.readUInt32LE(12); return JSON.parse(buf.subarray(20, 20 + len).toString("utf8")); };
{ const j = glbJson(bytes); ok("bytesCarryLock", j.extensions.CATSUP_desk.locked === true && !("final" in j.extensions.CATSUP_document) && j.extensions.CATSUP_desk.minor >= 2); }   // 锁是 desk 1.2 加的；之后加别的键（1.3 画风 / 屏幕）不影响

// ③ 自由建模里按 G：先解锁、造个网格体并选中一个点，再锁，按 G = 不起手
await page.evaluate(async () => { await globalThis.__catsup.session.setLocked(false); }); await page.waitForTimeout(60);
ok("editingLayerBack", (await tiers()).split(",").includes("1"));
await page.evaluate(async () => { const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.selectAll(); e.draw(); });
ok("inFreeform", await page.evaluate(() => globalThis.__catsup.editor.modeId === "freeform"));
await page.mouse.move(box.x + box.w * 0.5, box.y + box.h * 0.5); await page.waitForTimeout(40);
await page.evaluate(async () => { await globalThis.__catsup.session.setLocked(true); }); await page.waitForTimeout(80);
const r1 = await rev();
await page.keyboard.press("g"); await page.waitForTimeout(80);
ok("keyGRefused", !(await page.evaluate(() => globalThis.__catsup.editor.isGestureActive())) && (await page.evaluate(() => globalThis.__catsup.editor.tool)) !== "move");
await page.keyboard.press("Delete"); await page.waitForTimeout(80);
ok("deleteRefused", (await rev()) === r1);
await page.keyboard.press("Control+v"); await page.waitForTimeout(80);
ok("pasteRefused", (await rev()) === r1);

// ⑩ 新页面读这份字节（锁着导出的那份）= 打开就是锁着的；解锁后能画
const locked = await page.evaluate(() => Array.from(globalThis.__catsup.session.encode()));
const page2 = await b.newPage({ viewport: { width: 1000, height: 800 } }); page2.setDefaultTimeout(4000); page2.on("pageerror", (e) => errs.push("p2 " + String(e.stack ?? e).slice(0, 300)));
await page2.goto(url, { waitUntil: "load", timeout: 30000 }); await page2.waitForTimeout(1500);
const reopened = await page2.evaluate(async (arr) => { const s = globalThis.__catsup.session, e = globalThis.__catsup.editor; await s.openLocalBytes(new Uint8Array(arr), "锁着的.catsup", null); await new Promise((r) => setTimeout(r, 200));
  const lockedOnOpen = s.locked() && e.locked, r = e.revision; const ev = e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[{ x: 0, y: 9, z: 0 }, { x: 1, y: 9, z: 0 }]] }); const refused = Array.isArray(ev) && ev.length === 0 && e.revision === r;
  await s.setLocked(false); const r2 = e.revision; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[{ x: 0, y: 9, z: 0 }, { x: 1, y: 9, z: 0 }]] });
  return { lockedOnOpen, refused, drewAfterUnlock: e.revision !== r2, badgeHidden: document.getElementById("lockBadge").hidden }; }, locked);
ok("reopenLocked", reopened.lockedOnOpen && reopened.refused);
ok("unlockDraws", reopened.drewAfterUnlock && reopened.badgeHidden);

console.log(JSON.stringify(out, null, 1));
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)");
if (errs.length) process.exitCode = 1;
await b.close();

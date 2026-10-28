// 参考窗（@internal/reference-window 0.5.0；user 2026-10-25「咱们是不忘了接reference window…这个算视图，应该放右边汉堡」）：
// 视图 ☰「参考」页第一行「参考窗」→ 开窗、在右边（不压左柱）、拿焦点 → 导入一张图 + 一段文字 = 标脏、开关窗 / 挪窗不标脏 →
// 有焦点时按 R 不切工具 → 导出（= 保存同一个 encode）→ 刷新 → 打开那份 → 两张卡 + 窗的位置 / 开着都回来、不脏 → 新建 = 空牌组、窗收着；图库家空白新场景里只放参考卡也会安家落盘、再打开卡还在。
// （无头没有图库 store：用导出 + openLocalBytes 走同一条读写，同 probe-menu-tabs。）created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await b.newContext({ viewport: { width: 1000, height: 800 } })).newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(1200);
const r = {};
const win = () => page.evaluate(() => { const el = document.querySelector("wp-reference-window"); const rc = el?.getBoundingClientRect(); return el ? { open: el.open, focus: el.hasFocus, cards: el.deck.size, left: Math.round(rc.left), right: Math.round(rc.right), top: Math.round(rc.top) } : null; });
const dirty = () => page.evaluate(() => globalThis.__catsup.session.dirty());
// 一条边先让文件有内容（transient 家）
await page.evaluate(() => globalThis.__catsup.editor.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }]] }));
const [dl0] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => globalThis.__catsup.session.exportProject())]);
const base = [...(await (await import("node:fs")).promises.readFile(await dl0.path()))];
await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
await page.evaluate((arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "m.glb", null), base); await page.waitForTimeout(300);
r.dirty0 = await dirty();
// ① 视图 ☰ →「参考」页 → 第一行就是参考窗
await page.click(".gizmo-menu"); await page.waitForTimeout(100);
await page.click('.popup-menu [data-menu-tab="ref"]'); await page.waitForTimeout(100);
r.firstRow = await page.evaluate(() => document.querySelector(".popup-menu .menu-item")?.dataset.menuId ?? null);
r.section = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-section-label")].map((x) => x.textContent));
await page.click('.popup-menu [data-menu-id="refwin"]'); await page.waitForTimeout(200);
r.opened = await win();
r.railRight = await page.evaluate(() => Math.round(document.querySelector(".hud-rail-tools")?.getBoundingClientRect().right ?? 0));
r.dirtyAfterOpen = await dirty();
// ② 有焦点时按 R：不切工具
const toolBefore = await page.evaluate(() => globalThis.__catsup.editor.tool);
await page.keyboard.press("r"); await page.waitForTimeout(50);
r.toolKept = (await page.evaluate(() => globalThis.__catsup.editor.tool)) === toolBefore;
// ③ 导入一张 PNG + 一段文字（同 ＋ 菜单那条路）
await page.evaluate(async () => {
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 25, 73, 68, 65, 84, 120, 1, 1, 14, 0, 241, 255, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 255, 36, 151, 5, 253, 45, 31, 36, 196, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  const el = document.querySelector("wp-reference-window");
  await el.importFiles([new File([png], "格子.png", { type: "image/png" }), new File(["门高 2.1 m"], "尺寸.txt", { type: "text/plain" })], { kinds: ["image", "text", "audio", "video"] });
});
await page.waitForTimeout(400);
r.afterImport = await win();
r.dirtyAfterImport = await dirty();
// ④ 导出（= 保存同一个 encode）
const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => globalThis.__catsup.session.exportProject())]);
const bytes = [...(await (await import("node:fs")).promises.readFile(await dl.path()))];
r.glbHasRefs = (() => { const buf = Buffer.from(bytes); const len = buf.readUInt32LE(12); const json = JSON.parse(buf.subarray(20, 20 + len).toString("utf8")); return { used: json.extensionsUsed.includes("CATSUP_references"), files: json.extensions.CATSUP_references?.files.map((f) => f.path), panel: json.extensions.CATSUP_desk.refPanel ?? null }; })();
// ⑤ 刷新 → 打开那份：卡、窗都回来
await page.reload({ waitUntil: "load" }); await page.waitForTimeout(1200);
r.beforeOpen = await win();
await page.evaluate((arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "m.glb", null), bytes); await page.waitForTimeout(600);
r.reopened = await win();
r.dirtyReopened = await dirty();
r.reopenedKinds = await page.evaluate(() => document.querySelector("wp-reference-window").deck.cards().map((c) => c.kind).join());
// ⑥ 关窗（×）：视图态，不标脏；新建：空牌组、窗收着
await page.evaluate(() => { const el = document.querySelector("wp-reference-window"); el.shadowRoot.querySelector(".close").click(); });
await page.waitForTimeout(100);
r.dirtyAfterClose = await dirty();
await page.evaluate(() => globalThis.__catsup.session.newDoc()); await page.waitForTimeout(300);
r.afterNew = await win();
// ⑦ 图库家：空白新场景（lazyblank）里只放一张参考卡 = 有内容 → 自动安家落盘（别在新建 / 开别的时静默丢掉）→ 新建别的 → 从图库打开 → 卡回来
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && globalThis.__catsup.session.lazy && document.getElementById("galleryFull").hidden);
const gpath = await page.evaluate(() => globalThis.__catsup.session.home.path);
await page.evaluate(async () => { const R = globalThis.__catsup.refs; R.toggle(); await R.importFiles([new File(["只有参考，没画东西"], "笔记.txt", { type: "text/plain" })]); });
await page.waitForFunction(() => { const s = globalThis.__catsup.session; return !s.lazy && !s.saving && !s.dirty(); }, null, { timeout: 10000 }).catch(() => {});
r.refOnlyAdopted = await page.evaluate(async (p) => ({ lazy: globalThis.__catsup.session.lazy, dirty: globalThis.__catsup.session.dirty(), exists: await globalThis.__catsup.store().files.occupied(p) }), gpath);
await page.evaluate(() => globalThis.__catsup.session.newDoc()); await page.waitForTimeout(300);
r.afterNew2 = await win();
await page.evaluate((p) => globalThis.__catsup.session.openFromGallery(p), gpath); await page.waitForTimeout(600);
r.galleryReopen = await win();
console.log(JSON.stringify({ ...r, errs }));
const ok = !r.dirty0 && r.firstRow === "refwin" && r.section.includes("尺度参考")
  && r.opened.open && r.opened.focus && r.opened.left > r.railRight && r.opened.left >= 500 && r.opened.right <= 1000 && !r.dirtyAfterOpen && r.toolKept
  && r.afterImport.cards === 2 && r.dirtyAfterImport
  && r.glbHasRefs.used && r.glbHasRefs.files?.length === 3 && r.glbHasRefs.panel?.open === true
  && r.beforeOpen && !r.beforeOpen.open && r.beforeOpen.cards === 0
  && r.reopened.open && r.reopened.cards === 2 && r.reopenedKinds === "image,text" && Math.abs(r.reopened.left - r.afterImport.left) <= 1 && !r.dirtyReopened
  && !r.dirtyAfterClose && !r.afterNew.open && r.afterNew.cards === 0
  && !r.refOnlyAdopted.lazy && !r.refOnlyAdopted.dirty && r.refOnlyAdopted.exists && r.afterNew2.cards === 0 && r.galleryReopen.cards === 1 && r.galleryReopen.open && !errs.length;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

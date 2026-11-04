#!/usr/bin/env node
// test/probes/probe-folder-home.mjs —— 文件夹当家 + 图库必须有家 + 搬家（家族工单 H3 的 CatsUp 版 = 本仓 F-152 / F-153；规则书 §1 第 13 条）headless 探针。
//   created 2026-11-04 by Claude Opus 5.5。形状照 MoonSinger test/e2e/folder-home.mjs + fake-fsa.mjs：
//   假选夹 = showDirectoryPicker 给 OPFS 的一个子目录（真句柄、真 IDB 存句柄、folder provider 整条路都是真的）；
//   权限掉 = queryPermission 看 localStorage e2ePermLost（跨刷新）、requestPermission 给（记次数）。MSAL 用仓里 vendored 的真脚本，没账号。
// 四段：① 没有家点图库 = 先选家，取消什么都不建 ② 选夹 → 存一份 → 夹里出现文件 → 改名 / 回收站在夹内 → 重开静默恢复
//       ③ 权限掉 → 开机不弹、一键授权 → 攒着的写进去 ④ 旧设备浏览器里 3 份 → 开机问一次 → 选夹搬 → 夹里 3 份字节相等 → 旧库空
// 用法：python3 -m http.server 8765（仓根）后 `node test/probes/probe-folder-home.mjs [url]`（≈ 20 s）。
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const FOLDER = "my-models";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };

const FAKE_FSA = (folder) => {
  const lost = () => localStorage.getItem("e2ePermLost") === "1";
  window.showDirectoryPicker = async () => { window.__fsaPicks = (window.__fsaPicks ?? 0) + 1; return (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true }); };
  const P = globalThis.FileSystemHandle?.prototype;
  if (!P) return;
  P.queryPermission = async () => (lost() ? "prompt" : "granted");
  P.requestPermission = async () => { window.__fsaRequests = (window.__fsaRequests ?? 0) + 1; localStorage.removeItem("e2ePermLost"); return "granted"; };
};
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
async function device() {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1, acceptDownloads: true });
  await ctx.addInitScript(FAKE_FSA, FOLDER);
  const page = await ctx.newPage();
  page.__errs = [];
  page.on("pageerror", (e) => page.__errs.push("pageerror: " + e.message));
  page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !BENIGN.test(m.text())) page.__errs.push(`console.${m.type()}: ${m.text()}`); });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home);
  await page.waitForTimeout(600);   // 开机尾巴（initAuth / afterBootHome）
  return { ctx, page };
}
const sheetText = (p) => p.evaluate(() => (document.getElementById("sheet").hidden ? null : document.getElementById("sheet").textContent.replace(/\s+/g, " ")));
const clickChoice = (p, label) => p.click(`#sheetChoices button:has-text("${label}")`);
const notices = (p) => p.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "");
const home = (p) => p.evaluate(() => { const h = globalThis.__catsup.home; return { store: globalThis.__catsup.store() !== null, state: h.state(), folder: h.folder(), online: h.online(), browserOnly: h.browserOnly() }; });
const folderFiles = (p) => p.evaluate(async (name) => {
  const root = await (await navigator.storage.getDirectory()).getDirectoryHandle(name, { create: true }), out = {};
  const walk = async (d, pre) => { for await (const [n, h] of d.entries()) { if (h.kind === "file") out[pre + n] = (await h.getFile()).size; else await walk(h, `${pre}${n}/`); } };
  await walk(root, "");
  return out;
}, FOLDER);
const folderBytes = (p, rel) => p.evaluate(async ([name, pth]) => {
  let d = await (await navigator.storage.getDirectory()).getDirectoryHandle(name, { create: true });
  const parts = pth.split("/"), file = parts.pop();
  for (const s of parts) d = await d.getDirectoryHandle(s);
  return [...new Uint8Array(await (await (await d.getFileHandle(file)).getFile()).arrayBuffer())];
}, [FOLDER, rel]);
const storeBytes = (p, id) => p.evaluate(async (i) => { const b = await globalThis.__catsup.store().file(i, { mode: "existing" }).open(); return b ? [...new Uint8Array(await b.arrayBuffer())] : null; }, id);
const same = (a, b) => !!a && !!b && a.length === b.length && a.every((x, i) => x === b[i]);
const reloaded = async (p, act) => { const nav = p.waitForEvent("load", { timeout: 30000 }); await act(); await nav; await p.waitForFunction(() => globalThis.__catsup?.session && globalThis.__catsup.home); await p.waitForTimeout(800); };
/** 图库里新建一份、画个矩形，等它自动存好。返回身份。 */
async function newModel(page, dx = 0) {
  await page.evaluate(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
  await page.evaluate(() => { for (const n of [...document.querySelectorAll("#noticeStack > *")]) n.remove(); });   // 开机的通知别挡着画的那一笔（只是探针的手）
  const box = await page.locator("#board").boundingBox();
  const cx = box.x + box.width / 2 + dx, cy = box.y + box.height / 2;
  await page.evaluate(() => globalThis.__catsup.editor.setTool("rect"));
  await page.mouse.move(cx - 110, cy + 40); await page.mouse.down(); await page.mouse.move(cx + 110, cy + 60, { steps: 8 }); await page.mouse.up();   // 横着拖：两根轴之间，不会被推断成一条线
  try { await page.waitForFunction(() => !globalThis.__catsup.session.lazy && !globalThis.__catsup.session.saving && !globalThis.__catsup.session.dirty(), null, { timeout: 10000 }); }
  catch (e) { await page.screenshot({ path: "/tmp/catsup-probe-stuck.png" }); console.error("newModel stuck:", await page.evaluate(() => { const s = globalThis.__catsup.session; return JSON.stringify({ home: s.home, lazy: s.lazy, saving: s.saving, dirty: s.dirty(), edges: globalThis.__catsup.editor.kernel.edges().length, sheet: document.getElementById("sheet").hidden ? null : document.getElementById("sheet").textContent, notices: document.getElementById("noticeStack").textContent.slice(0, 200), log: globalThis.__catsup.debugLog.toText().split("\n").slice(-15).join("\n") }); })); throw e; }
  return page.evaluate(() => globalThis.__catsup.session.home.path);
}

console.log("\n① 没有家点「图库」= 先选家；取消什么都不建");
{
  const { ctx, page } = await device();
  check(!(await home(page)).store, "开机没有 store（文件模式）");
  void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
  await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
  const t = await sheetText(page);
  check(!!t && t.includes("图库要有一个家") && t.includes("连接网盘") && t.includes("选一个文件夹"), "一句说明 + 两个去处", String(t));
  check(!!t && t.includes("存到磁盘"), "说了不选也行（文件模式）", String(t));
  await page.click("#sheetCancel"); await page.waitForTimeout(300);
  check(!(await home(page)).store, "取消：store 没建");
  check(await page.evaluate(() => document.getElementById("galleryFull").hidden), "取消：图库没开");
  const dbs = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
  check(!dbs.some((n) => /^catsup\./.test(n ?? "")), "取消：store 的 IndexedDB 一个都没有", JSON.stringify(dbs));
  check(page.__errs.length === 0, "页面零报错", page.__errs.join(" ; "));
  await ctx.close();
}

console.log("\n② 选夹 → 存一份 → 夹里出现文件 → 改名 / 回收站在夹内 → 重开静默恢复");
const dev2 = await device();
{
  const { page } = dev2;
  void page.evaluate(() => { void globalThis.__catsup.home.openGallery(); });
  await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 });
  await reloaded(page, () => clickChoice(page, "选一个文件夹"));   // 没有旧模型：选完直接记名册、刷新
  let h = await home(page);
  check(h.store && h.state === "folder" && h.folder === FOLDER && h.online, "刷新后挂的是文件夹，有权限", JSON.stringify(h));
  check(await page.evaluate(() => window.__fsaPicks ?? 0) === 0, "开机没再弹选夹框");
  const id = await newModel(page);
  const files = await folderFiles(page);
  check(!!files[id], `存一份：夹里出现 ${id}`, JSON.stringify(files));
  check(same(await folderBytes(page, id), await storeBytes(page, id)), "夹里的字节 = 存的字节");
  check(/文件夹/.test(await page.evaluate(() => document.getElementById("btnSave").title)), "状态说的是文件夹不是云端", await page.evaluate(() => document.getElementById("btnSave").title));
  const renamed = id.replace(/\.catsup$/, "-改名.catsup");
  await page.evaluate(async ([a, b]) => { await globalThis.__catsup.session.flushLocal(); const r = await globalThis.__catsup.store().file(a, { mode: "existing" }).tryMove(b); if (!r.ok) throw new Error(JSON.stringify(r)); }, [id, renamed]);
  let f2 = await folderFiles(page);
  check(!!f2[renamed] && !f2[id], "改名：夹里旧名没了、新名在", JSON.stringify(f2));
  await page.evaluate(async (b) => { const r = await globalThis.__catsup.store().file(b, { mode: "existing" }).trash(); if (r.status !== "trashed") throw new Error(r.status); }, renamed);
  f2 = await folderFiles(page);
  check(!f2[renamed] && Object.keys(f2).some((k) => k.startsWith(".trash/")), "回收站：移进夹里的 .trash/（资源管理器看得见）", JSON.stringify(f2));
  await reloaded(page, () => page.reload());
  h = await home(page);
  check(h.state === "folder" && h.online && await page.evaluate(() => (window.__fsaPicks ?? 0) + (window.__fsaRequests ?? 0)) === 0, "重开：静默挂回文件夹，没弹选夹 / 授权", JSON.stringify(h));
  check(page.__errs.length === 0, "页面零报错", page.__errs.join(" ; "));
}

console.log("\n③ 权限掉 → 开机不弹、离线态 → 一键授权 → 攒着的写进去");
{
  const { page } = dev2;
  const id = await newModel(page, 30);
  const before = await folderBytes(page, id);
  await page.evaluate(() => localStorage.setItem("e2ePermLost", "1"));
  await reloaded(page, () => page.reload());
  let h = await home(page);
  check(h.state === "folder" && !h.online, "开机：还是文件夹家，权限掉了 = 离线态", JSON.stringify(h));
  check(await page.evaluate(() => window.__fsaRequests ?? 0) === 0, "开机没弹授权");
  check(/要重新授权/.test(await notices(page)), "一键 chip 在", (await notices(page)).slice(0, 80));
  if (await page.evaluate(() => globalThis.__catsup.session.home.kind) !== "gallery") await page.evaluate((i) => globalThis.__catsup.session.openFromGallery(i), id);
  await page.evaluate(() => globalThis.__catsup.editor.setTool("rect"));
  const box = await page.locator("#board").boundingBox();
  await page.mouse.move(box.x + box.width / 2 - 150, box.y + box.height / 2 + 120); await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2 + 140, { steps: 6 }); await page.mouse.up();
  await page.evaluate(() => globalThis.__catsup.session.save());
  await page.waitForFunction(() => !globalThis.__catsup.session.saving, null, { timeout: 8000 });
  check(same(await folderBytes(page, id), before), "权限掉着：夹里那份没动（改动攒在本机）");
  check(await page.evaluate(() => globalThis.__catsup.session.pushPending), "session 知道还欠一推");
  check(/重新授权/.test(await page.evaluate(() => document.getElementById("btnSave").title)), "状态行说要重新授权", await page.evaluate(() => document.getElementById("btnSave").title));
  await page.click("#noticeStack button:has-text('授权')");
  await page.waitForFunction(() => globalThis.__catsup.home.online(), null, { timeout: 5000 });
  await page.waitForFunction(() => !globalThis.__catsup.session.pushPending, null, { timeout: 10000 }).catch(() => {});
  h = await home(page);
  check(h.online && await page.evaluate(() => window.__fsaRequests ?? 0) === 1, "点授权：申请一次、回到在线", JSON.stringify(h));
  check(same(await folderBytes(page, id), await storeBytes(page, id)) && !same(await folderBytes(page, id), before), "攒着的写进夹里了（字节 = 本机那份）");
  check(page.__errs.length === 0, "页面零报错", page.__errs.join(" ; "));
  await dev2.ctx.close();
}

console.log("\n④ 旧设备：浏览器里 3 份（1 份加密）→ 开机问一次 → 选夹搬 → 夹里 3 份字节相等 → 旧库空 → 口令验证器跟着搬、原口令开得了");
{
  const PW = "猫猫口令";
  const { ctx, page } = await device();
  const ids = [await newModel(page, -60), await newModel(page, 0), await newModel(page, 60)];   // 模拟以前没登录也能建库的设备（直接开图库，绕过入口）
  const encId = ids[2];   // 开着的是第三份：加密它（设新口令两遍 → 验证器落进以前那个库的 app-state）
  const enc = await page.evaluate(async (pw) => { globalThis.__catsup.crypto.answer(async () => pw); return globalThis.__catsup.session.encryptCurrent(); }, PW);
  check(enc === true && await page.evaluate((i) => globalThis.__catsup.store().file(i, { mode: "existing" }).isEncrypted(), encId), "前提：第三份加密了（以前那个库里有验证器）");
  await page.waitForTimeout(1000);   // collection 本地写有 400 ms 防抖：验证器落进本机 IDB 再刷新（刷新前不到 400 ms 会丢 = 现有的另一个洞，报告里写了）
  const srcVerifier = await page.evaluate(async () => { const c = globalThis.__catsup.store().collection("app-state"); await c.init(); return JSON.stringify(c.getItem("galleryPasswordVerifier") ?? null); });
  const bytes = {};
  for (const i of ids.slice(0, 2)) bytes[i] = await storeBytes(page, i);
  bytes[encId] = await page.evaluate(async (i) => [...new Uint8Array(await (await globalThis.__catsup.store().file(i, { mode: "existing" }).getEncryptedBlob()).arrayBuffer())], encId);   // 容器字节
  const lf = await page.evaluate(() => globalThis.__catsup.home.legacyFiles());
  check(lf.items.length === 3 && lf.items.every((x) => x.kind === "move"), "前提：3 份只在浏览器里（从没同步过）", JSON.stringify(lf));
  await reloaded(page, () => page.reload());
  await page.waitForFunction(() => !document.getElementById("sheet").hidden, null, { timeout: 8000 }).catch(() => {});
  const t = await sheetText(page);
  check(!!t && t.includes("这个浏览器里有 3 份模型") && t.includes("选一个文件夹，搬进去") && t.includes("全部导出") && t.includes("稍后"), "开机问一次：搬 / 导出 / 稍后", String(t));
  await reloaded(page, () => clickChoice(page, "选一个文件夹，搬进去"));
  const h = await home(page);
  check(h.state === "folder" && h.browserOnly === 0, "搬完：家是文件夹，浏览器里不剩", JSON.stringify(h));
  const said = await notices(page);
  check(/3 份搬进了「my-models」/.test(said), "开机说搬了几份", said.slice(0, 160));
  const moveLine = await page.evaluate(() => globalThis.__catsup.debugLog.toText().split("\n").filter((l) => /\[home\] move →|verifier/.test(l)).join(" | "));
  check(/图库口令也一起搬进「my-models」了/.test(said) && /verifier=copied/.test(moveLine), "验证器原样拷进了文件夹（黑匣子 verifier=copied），结果那句话说了", `${said.slice(0, 160)} ‖ ${moveLine.slice(0, 300)}`);
  const folderVerifier = await page.evaluate(async () => { const c = globalThis.__catsup.store().collection("app-state"); await c.init(); return c.getItem("galleryPasswordVerifier") ?? null; });
  check(!!folderVerifier && folderVerifier.v === 1 && JSON.stringify(folderVerifier) === srcVerifier, "文件夹家开机就有验证器（还没开过任何加密件），和以前那个库里的逐字一样", JSON.stringify(folderVerifier));
  const files = await folderFiles(page);
  const at = (i) => (i === encId ? `${i}.zip` : i);   // 加密件在夹里多一个 .zip
  check(ids.every((i) => files[at(i)] !== undefined), "夹里 3 份都在（加密的那份是 .zip）", JSON.stringify(files));
  let eqAll = true;
  for (const i of ids) eqAll = eqAll && same(await folderBytes(page, at(i)), bytes[i]);
  check(eqAll, "夹里 3 份字节 = 原来浏览器里的（加密件 = 原容器）");
  check(Object.keys(files).some((k) => /^\.catsup\/app-state\.json$/.test(k)), "验证器住进了文件夹（.catsup/app-state.json）", JSON.stringify(files));
  const opened = await page.evaluate(async ([i, pw]) => {
    const c = globalThis.__catsup.crypto; c.lock();
    const asks = []; c.answer(async (o) => { asks.push(o.title); return pw; });
    const r = await globalThis.__catsup.session.openFromGallery(i);
    return { r, asks, encrypted: globalThis.__catsup.session.encrypted, edges: globalThis.__catsup.editor.kernel.edges().length };
  }, [encId, PW]);
  check(opened.r === true && opened.encrypted === true && opened.edges > 0, "文件夹家里输原口令，搬过去的加密件开得了", JSON.stringify(opened));
  const reenc = await page.evaluate(async ([i, pw]) => {
    const c = globalThis.__catsup.crypto; c.lock();
    await globalThis.__catsup.session.openFromGallery(i);
    const asks = []; c.answer(async (o) => { asks.push(o.title); return pw; });
    const r = await globalThis.__catsup.session.encryptCurrent();
    return { r, asks };
  }, [ids[0], PW]);
  check(reenc.r === true && reenc.asks.length === 1 && /输入图库口令/.test(reenc.asks[0]), "在文件夹里再加密一份：问「输入图库口令」（验证器在），不是「设置图库口令」（不会设出第二个口令）", JSON.stringify(reenc));
  const after = await page.evaluate(() => globalThis.__catsup.home.legacyFiles());
  check(after.total === 0, "旧库空了（移进旧库的回收站）", JSON.stringify(after));
  check(await page.evaluate(() => localStorage.getItem("catsup-7c1f0d2e9a4b6c58:legacy-retired")) === "1", "旧库退役：以后不再数、不再问");
  await page.evaluate(() => globalThis.__catsup.home.openGallery());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden, null, { timeout: 5000 });
  check(await page.evaluate(() => document.getElementById("galleryHomeBar").hidden), "图库顶上没有「只在浏览器里」那条");
  check(page.__errs.length === 0, "页面零报错", page.__errs.join(" ; "));
  await ctx.close();
}

await browser.close();
console.log(`\n  ${pass} passed, ${failN} failed`);

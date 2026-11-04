#!/usr/bin/env node
// test/probes/probe-c2.mjs —— 工单 C2 无头验收：解开的加密件的崩溃影子只存容器（真 7z）、口令忘掉零写入、恢复要口令且不进图库；黑匣子不记坐标；
//   加密后明文封面作废（挂库 / 没挂库两种）；没登录图库的披露条 + 全部导出（真 zip）；VR 手腕状态行带离线份数。created 2026-11-03 by Claude Opus 5.5
//   用法：python3 -m http.server 8765 后 `node test/probes/probe-c2.mjs [url]`。headless。
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { MSAL_STUB, fakeDrive } from "./fake-cloud.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const failures = [];
const eq = (a, b, what) => { if (a !== b) { failures.push(what); console.error(`  ✗ ${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); } else console.log("  ✓", what); };
const ok = (c, what) => eq(!!c, true, what);
const CRASH_DB = "catsup-7c1f0d2e9a4b6c58.crash", THUMB_DB = "catsup-7c1f0d2e9a4b6c58.thumbs";

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
async function newCtx(msal) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1, acceptDownloads: true, serviceWorkers: "block" });
  const drive = fakeDrive(); await drive.attach(ctx);
  await ctx.route(/vendor\/msal\/msal-browser\.min\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: MSAL_STUB }));
  await ctx.addInitScript((m) => { if (!localStorage.getItem("__fake_msal")) localStorage.setItem("__fake_msal", m); }, msal);
  return { ctx, drive };
}
async function open(ctx) {
  const page = await ctx.newPage(); page.setDefaultTimeout(15000);
  page.on("pageerror", (e) => { errs.push(String(e.stack ?? e).slice(0, 300)); });
  await page.goto(url, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__catsup?.session && !globalThis.__catsup.gate?.cloudGate?.isRunning?.());
  return page;
}
/** 读崩溃影子库：每条 { tag, state, name, size, encrypted, glTF（开头是不是明文 glb）}。 */
const frames = (page) => page.evaluate(async (db) => {
  const E = globalThis.__catsup.encryption;
  const idb = await new Promise((res, rej) => { const r = indexedDB.open(db); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const names = [...idb.objectStoreNames];
  const all = await new Promise((res, rej) => { const r = idb.transaction(names[0]).objectStore(names[0]).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  idb.close();
  const out = [];
  for (const x of all) { const u8 = new Uint8Array(await x.bytes.arrayBuffer()); out.push({ tag: x.tag, state: x.state, name: x.name, at: x.at, size: u8.length, encrypted: await E.isEncryptedBlob(x.bytes), glTF: String.fromCharCode(...u8.slice(0, 4)) === "glTF" }); }
  return out;
}, CRASH_DB);
const thumbEntry = (page, key) => page.evaluate(async ([db, k]) => {
  if (!(await indexedDB.databases()).some((d) => d.name === db)) return "no-db";
  const idb = await new Promise((res, rej) => { const r = indexedDB.open(db); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  if (!idb.objectStoreNames.contains("gallery-thumbs")) { idb.close(); return "no-store"; }
  const v = await new Promise((res, rej) => { const r = idb.transaction("gallery-thumbs").objectStore("gallery-thumbs").get(k); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  idb.close();
  return v === undefined ? "absent" : v.blob ? `cover:${v.blob.size}` : "null";
}, [THUMB_DB, key]);
const addEdge = (page, x = 0) => page.evaluate((dx) => { const e = globalThis.__catsup.editor, P = (a, b, c = 0) => ({ x: a, y: b, z: c }); e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", segs: [[P(dx, 0), P(dx + 1, 0)], [P(dx + 1, 0), P(dx + 1, 1)], [P(dx + 1, 1), P(dx, 1)], [P(dx, 1), P(dx, 0)]] }); }, x);
const newGalleryDoc = async (page) => {
  await page.evaluate(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
  await addEdge(page);
  await page.waitForFunction(() => { const s = globalThis.__catsup.session; return !s.lazy && !s.saving; });
  await page.evaluate(() => globalThis.__catsup.session.save());
  await page.waitForFunction(() => { const s = globalThis.__catsup.session; return !s.lazy && !s.saving && !s.dirty(); });
  return page.evaluate(() => globalThis.__catsup.session.home.path);
};
const waitCover = async (page, key) => {   // 真流程：开图库 → 卡片画封面 → 写缩略库
  await page.evaluate(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  const t0 = Date.now(); let v = "";
  while (Date.now() - t0 < 8000) { v = await thumbEntry(page, key); if (v.startsWith("cover:")) break; await page.waitForTimeout(150); }
  await page.evaluate(() => globalThis.__catsup.galleryHost.close());
  return v;
};

// ─────────────────────────────── ① 崩溃影子 ───────────────────────────────
console.log("① 解开的加密件：影子只存容器");
{
  const { ctx } = await newCtx("none");
  const page = await open(ctx);
  const opened = await page.evaluate(async () => {
    const s = globalThis.__catsup.session, E = globalThis.__catsup.encryption;
    const blob = await E.packContainer({ dataBytes: s.encode(), fileName: "本地加密", ext: "catsup", password: "本地口令" });
    globalThis.__catsup.crypto.answer(async () => "本地口令");
    const okOpen = await s.openLocalBytes(new Uint8Array(await blob.arrayBuffer()), "本地加密.catsup.zip", null);
    return { okOpen, home: s.home.kind, name: s.home.name };
  });
  ok(opened.okOpen && opened.home === "transient", "本地加密文件当临时模型打开");
  ok(await page.evaluate(() => !globalThis.__catsup.crypto.isUnlocked()), "这个口令没进全局（解开本地件不解锁图库）");
  await addEdge(page);
  const t0 = Date.now();
  ok(await page.evaluate(() => globalThis.__catsup.session.snapshot()), "脏了 → 留影子成功");
  console.log(`    封口一帧 ${Date.now() - t0} ms`);
  let fs = await frames(page);
  const f1 = fs.find((f) => f.name === "本地加密");
  ok(f1 && f1.encrypted && !f1.glTF, "影子字节是容器（真 isEncryptedBlob），开头不是明文 glb");
  // 恢复：另开一页 = 上一页崩了
  await page.evaluate(() => globalThis.__catsup.crypto.answer(null));
  const p2 = await open(ctx);
  await p2.evaluate(async () => { await globalThis.__catsup.galleryHost.open(); globalThis.__catsup.galleryHost.close(); });   // 接上图库：确认恢复不往图库里写明文
  await p2.waitForFunction(() => /本地加密/.test(document.getElementById("noticeStack")?.textContent ?? ""));
  // 口令面板取消 = 不恢复，记录放回
  await p2.evaluate(() => globalThis.__catsup.crypto.answer(async () => null));
  await p2.locator("#noticeStack button", { hasText: "恢复" }).first().click();
  await p2.waitForFunction(() => /\[?t-crash\]? ?recover cancelled|recover cancelled/.test(globalThis.__catsup.debugLog.toText()));
  fs = await frames(p2);
  ok(fs.some((f) => f.name === "本地加密" && f.encrypted), "口令面板取消 → 记录放回，还是容器");
  await p2.close();
  const p3 = await open(ctx);
  await p3.evaluate(async () => { await globalThis.__catsup.galleryHost.open(); globalThis.__catsup.galleryHost.close(); });
  await p3.waitForFunction(() => /本地加密/.test(document.getElementById("noticeStack")?.textContent ?? ""));
  const asks = [];
  await p3.exposeFunction("__ask", (t) => { asks.push(t); });
  await p3.evaluate(() => { let n = 0; globalThis.__catsup.crypto.answer(async (o) => { window.__ask(o.title ?? ""); n++; return n === 1 ? "错的" : "本地口令"; }); });
  await p3.locator("#noticeStack button", { hasText: "恢复" }).first().click();
  await p3.waitForFunction(() => globalThis.__catsup.session.home.kind === "transient" && globalThis.__catsup.session.home.name === "本地加密" && globalThis.__catsup.session.dirty());
  ok(asks.length === 2, "恢复要口令（错一次再对）");
  const listed = await p3.evaluate(() => new Promise((res) => { const off = { f: null }; off.f = globalThis.__catsup.store().files.watchFolder("", (s) => { res(s.items.map((i) => i.identifier)); queueMicrotask(() => off.f?.()); }); }));
  ok(!listed.some((n) => n.includes("恢复")), "解开的恢复帧没有进图库（那里会是明文）");
  await addEdge(p3, 3);
  ok(await p3.evaluate(() => globalThis.__catsup.session.snapshot()), "恢复出来的模型继续留影子");
  fs = await frames(p3);
  ok(fs.filter((f) => f.name === "本地加密").every((f) => f.encrypted), "恢复后的影子还是容器");
  // redirect 帧
  ok(await p3.evaluate(() => globalThis.__catsup.session.prepareForRedirect()), "登录跳转前：留帧后可以走");
  fs = await frames(p3);
  ok(fs.some((f) => f.state === "pending-adoption" && f.encrypted), "pending-adoption 帧也是容器");
  // 口令忘掉：零写入
  const before = JSON.stringify((await frames(p3)).filter((f) => f.name === "本地加密").map((f) => [f.tag, f.at, f.size]));
  await p3.evaluate(() => globalThis.__catsup.crypto.lock());
  await addEdge(p3, 6);
  eq(await p3.evaluate(() => globalThis.__catsup.session.snapshot()), false, "口令忘掉 → snapshot 不写");
  eq(JSON.stringify((await frames(p3)).filter((f) => f.name === "本地加密").map((f) => [f.tag, f.at, f.size])), before, "口令忘掉 → 库里零变化");
  ok(await p3.evaluate(() => /绝不|不留明文/.test(globalThis.__catsup.debugLog.toText()) || /never plaintext/.test(globalThis.__catsup.debugLog.toText())), "跳拍进黑匣子");
  ok(/口令已经忘掉/.test(await p3.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "")), "跳拍当面说一句（不静默）");
  // 口令忘掉后跳转：三键挽留，取消就不走
  const prep = p3.evaluate(() => globalThis.__catsup.session.prepareForRedirect());
  await p3.waitForFunction(() => !document.getElementById("sheet").hidden);
  ok(/没有家/.test(await p3.evaluate(() => document.getElementById("sheet").textContent)), "留不了影子 → 走挽留面（不静默丢改动）");
  await p3.keyboard.press("Escape");
  eq(await prep, false, "挽留面取消 → 不跳转");
  await ctx.close();
}

// ─────────────────────────────── ② 黑匣子 ───────────────────────────────
console.log("② 黑匣子不记坐标");
{
  const { ctx } = await newCtx("none");
  const page = await open(ctx);
  const r = await page.evaluate(() => {
    const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), M = 987.654321;
    e.setGrid({ ...e.grid, on: false });
    e.commitOp({ op: "addEdges", segs: [[P(M, M), P(M + 1, M)]] });
    try { e.commitOp({ op: "move", moves: [{ from: P(M, M), to: P(M, M + 7) }] }); } catch { /* 不管成不成，看记账 */ }
    try { e.commitOp({ op: "pushpull", face: [P(M, M), P(M + 1, M), P(M, M + 9)], dist: 1 }); } catch { /* 这笔要失败 */ }
    const text = globalThis.__catsup.debugLog.toText();
    const ls = Object.keys(localStorage).map((k) => localStorage.getItem(k) ?? "").join("\n");
    return { fail: text.split("\n").filter((l) => /FAIL/.test(l)).slice(-2), hasCoordLog: text.includes("987.65"), hasCoordLs: ls.includes("987.65"), hasJson: /op=\{/.test(text) };
  });
  console.log("    FAIL 行样本：", r.fail.join(" | ").slice(0, 200) || "（这轮没出 FAIL）");
  ok(!r.hasCoordLog && !r.hasJson, "黑匣子文本里没有模型坐标 / op JSON");
  ok(!r.hasCoordLs, "localStorage 全量扫：没有模型坐标");
  await ctx.close();
}

// ─────────────────────────────── ③ 封面 + ④ 披露条 / 全部导出 ───────────────────────────────
console.log("③ 加密后明文封面作废");
{
  const { ctx } = await newCtx("none");
  const page = await open(ctx);
  const path1 = await newGalleryDoc(page);
  const cover = await waitCover(page, path1);
  ok(cover.startsWith("cover:"), `前提：缩略库里有明文封面（${cover}）`);
  const enc = await page.evaluate(() => { globalThis.__catsup.crypto.answer(async () => "图库口令"); return globalThis.__catsup.session.encryptCurrent(); });
  ok(enc, "加密成功（离线也在本地成）");
  let after = await thumbEntry(page, path1);
  ok(after === "absent" || after === "null", `加密后该键为空（挂着库；${after}）`);
  ok(await page.evaluate(() => globalThis.__catsup.session.decryptCurrent()), "解除加密");
  eq(await thumbEntry(page, path1), "absent", "解除后作废，等重画");
  const again = await waitCover(page, path1);
  ok(again.startsWith("cover:"), `解除后重画出封面（${again}）`);
  // 没挂库：刷新后回到模型，图库一次没开过
  await page.reload({ waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__catsup?.session?.home?.kind === "gallery" && !globalThis.__catsup.session.lazy);
  eq(await page.evaluate(() => globalThis.__catsup.galleryHost.thumbStats()), null, "前提：这次开机图库还没挂");
  ok((await thumbEntry(page, path1)).startsWith("cover:"), "前提：明文封面还在缩略库");
  ok(await page.evaluate(() => { globalThis.__catsup.crypto.answer(async () => "图库口令"); return globalThis.__catsup.session.encryptCurrent(); }), "没挂库时加密");
  after = await thumbEntry(page, path1);
  ok(after === "absent" || after === "null", `没挂库也清掉了（${after}）`);

  console.log("④ 没登录：披露条 + 全部导出");
  const path2 = await newGalleryDoc(page);
  ok(path2 !== path1, "第二份（明文）");
  await page.evaluate(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  ok(await page.locator("#galleryHomeBar").isVisible(), "没登录：披露条在");
  ok(/只在这台设备的浏览器里，没有备份/.test(await page.locator("#galleryHomeBar").textContent()), "披露文案");
  await page.screenshot({ path: path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir(), "c2-homebar.png") });
  const dl = page.waitForEvent("download");
  await page.click("#galleryExportAll");
  const d = await dl;
  ok(/^CatsUp-图库-\d{8}\.zip$/.test(d.suggestedFilename()), `导出名（${d.suggestedFilename()}）`);
  const saved = path.join(process.env.CLAUDE_JOB_DIR ? path.join(process.env.CLAUDE_JOB_DIR, "tmp") : os.tmpdir(), "c2-export.zip");
  await d.saveAs(saved);
  const list = JSON.parse(execFileSync("python3", ["-I", "-c", `
import json,sys,zipfile
z=zipfile.ZipFile(sys.argv[1]); out=[]
for n in z.namelist():
    b=z.read(n); out.append({"n":n,"glTF":b[:4]==b"glTF","zip":b[:2]==b"PK","size":len(b)})
print(json.dumps(out))`, saved], { encoding: "utf8" }));
  console.log("    zip 里：", list.map((x) => `${x.n}(${x.glTF ? "glb" : x.zip ? "容器" : "?"})`).join("、"));
  ok(list.some((x) => x.n === `${path1}.zip` && x.zip && !x.glTF), "加密件 = 容器原样搬（不是明文）");
  ok(list.some((x) => x.n === path2 && x.glTF), "明文件 = 工程字节");
  eq(list.length, 2, "两份都在");
  ok(/已导出 2 份/.test(await page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "")) && /1 份是加密的/.test(await page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "")), "回执说清几份、哪些是加密的");
  await page.click("#galleryConnect");
  await page.waitForFunction(() => (window.__fakeLogins ?? 0) >= 1 || /登录|连接/.test(document.getElementById("noticeStack")?.textContent ?? ""), null, { timeout: 5000 }).catch(() => {});
  ok(await page.evaluate(() => (window.__fakeLogins ?? 0) >= 1), "连接网盘 = 走登录");
  await ctx.close();
}

console.log("④′ 登录了没有披露条；VR 手腕状态行");
{
  const { ctx, drive } = await newCtx("ok");
  const page = await open(ctx);
  await newGalleryDoc(page);
  await page.evaluate(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  eq(await page.locator("#galleryHomeBar").isVisible(), false, "登录了：没有披露条");
  await page.evaluate(() => globalThis.__catsup.galleryHost.close());
  eq(await page.evaluate(() => { const h = globalThis.__catsup.hud; document.getElementById("hint").textContent = "提示"; return h.status(); }), "提示", "在线：状态行不加东西");
  await page.evaluate(() => globalThis.__catsup.gate.cloudGate.escape());
  await addEdge(page, 3);
  await page.waitForFunction(() => /离线/.test(globalThis.__catsup.hud.status()));
  await page.evaluate(() => globalThis.__catsup.session.save({ implicit: true, localOnly: true }));
  await page.waitForFunction(() => /离线 · 还有 1 份没传上去/.test(globalThis.__catsup.hud.status()), null, { timeout: 5000 }).catch(() => {});
  ok(/离线 · 还有 1 份没传上去/.test(await page.evaluate(() => globalThis.__catsup.hud.status())), `离线：状态行带份数（${await page.evaluate(() => globalThis.__catsup.hud.status())}）`);
  // store 2.2.4：选了离线，collection 也一条网都不打（createStore 的 isOnline = cloudOnline）
  const n0 = drive.requests;
  const col = await page.evaluate(async () => { const c = globalThis.__catsup.store().collection("app-state"); await c.init(); return String((await c.reconcileWithRemote?.())?.status ?? "no-api"); });
  await page.waitForTimeout(300);
  eq(col, "offline", "离线：collection 同步回 offline");
  eq(drive.requests, n0, "离线：collection 零请求");
  await ctx.close();
}

await browser.close();
if (errs.length) { console.error("PAGEERRORS:\n" + errs.join("\n")); failures.push("pageerror"); }
console.log(failures.length ? `\n${failures.length} 条失败：\n  ${failures.join("\n  ")}` : "\n全部通过");
process.exitCode = failures.length ? 1 : 0;

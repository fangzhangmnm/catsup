#!/usr/bin/env node
// test/probes/probe-update-conflict.mjs —— 复现「一更新版本几乎总会出现云冲突」（周账 F-137 ⑫，工单 C2 ⑤）。created 2026-11-03 by Claude Opus 5.5
//   真的旧 bundle（git archive 解出来）和新 bundle 用同一个源、同一份浏览器存储；假的只有 MSAL 和 Graph（内存小网盘，记每次写）。headless。
//   用法：node test/probes/probe-update-conflict.mjs samples
//         node test/probes/probe-update-conflict.mjs pair <旧目录> <新目录> [标签] [场景,逗号分隔]     目录 = 仓根形状（index.html + dist/ + vendor/…）
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MSAL_STUB, fakeDrive } from "./fake-cloud.mjs";
import { fixtureDir, listFixtures, readFixture } from "../fixtures/format/fixtures.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.join(here, "../..");
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const ORIGIN = "http://127.0.0.1:8766";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json", ".glb": "model/gltf-binary" };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const errs = [];

async function device(drive, dir) {
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  const d = { ctx, dir };
  await ctx.route(`${ORIGIN}/**`, async (route) => {
    const u = new URL(route.request().url());
    let p = decodeURIComponent(u.pathname); if (p === "/") p = "/index.html";
    const f = path.join(d.dir, p);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: "" });
    await route.fulfill({ status: 200, contentType: MIME[path.extname(f)] ?? "application/octet-stream", body: readFileSync(f) });
  });
  await drive.attach(ctx);
  await ctx.route(/vendor\/msal\/msal-browser\.min\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: MSAL_STUB }));
  await ctx.addInitScript(() => localStorage.setItem("__fake_msal", "ok"));
  d.page = await ctx.newPage(); d.page.setDefaultTimeout(20000);
  d.page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 200)));
  d.boot = async () => {
    await d.page.goto(`${ORIGIN}/`, { waitUntil: "load" });
    await d.page.waitForFunction(() => globalThis.__catsup?.session);
  };
  d.update = async (newDir) => {   // 「更新版本」= 换 bundle + 刷新页面
    d.dir = newDir;
    await d.page.reload({ waitUntil: "load" });
    await d.page.waitForFunction(() => globalThis.__catsup?.session);
  };
  d.idle = () => d.page.waitForFunction(() => { const c = globalThis.__catsup, s = c.session; return !s.saving && !c.gate?.cloudGate?.isRunning?.() && !s.adopting; }, null, { timeout: 20000 });
  d.state = () => d.page.evaluate(async () => {
    const c = globalThis.__catsup, s = c.session;
    let storeDirty = -1; try { storeDirty = (await c.store()?.files.dirty.count()) ?? -1; } catch { /* 库没接 */ }
    const sheet = document.getElementById("sheet"), gate = document.getElementById("syncGate");
    return { home: s.home.kind === "gallery" ? s.home.path : s.home.kind, dirty: s.dirty(), rev: c.editor.revision, saved: s.savedRevision, storeDirty, pushPending: !!s.pushPending, attention: !!s.attention, sheet: sheet && !sheet.hidden ? sheet.textContent.replace(/\s+/g, " ").slice(0, 80) : "", gate: gate && !gate.hidden ? gate.textContent.replace(/\s+/g, " ").slice(0, 60) : "", notices: (document.getElementById("noticeStack")?.textContent ?? "").replace(/\s+/g, " ").slice(0, 140) };
  });
  d.draw = (x = 0) => d.page.evaluate((dx) => { const e = globalThis.__catsup.editor, P = (a, b, c = 0) => ({ x: a, y: b, z: c }); e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", segs: [[P(dx, 0), P(dx + 1, 0)], [P(dx + 1, 0), P(dx + 1, 1)], [P(dx + 1, 1), P(dx, 1)], [P(dx, 1), P(dx, 0)]] }); }, x);
  d.newDoc = async () => {
    await d.page.evaluate(() => globalThis.__catsup.galleryHost.open());
    await d.page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
    await d.page.click("#galleryNew");
    await d.page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
    await d.draw();
    await d.page.waitForFunction(() => !globalThis.__catsup.session.lazy);
    await d.idle();
    await d.page.evaluate(() => globalThis.__catsup.session.save());
    await d.idle();
    return d.page.evaluate(() => globalThis.__catsup.session.home.path);
  };
  d.openDoc = async (p) => {
    await d.page.evaluate(async () => { await globalThis.__catsup.galleryHost.open(); globalThis.__catsup.galleryHost.close(); });
    const r = await d.page.evaluate((x) => globalThis.__catsup.session.openFromGallery(x), p);
    await d.idle();
    return r;
  };
  /** 保存但不等它：撞上冲突面时 save 的 promise 在等人选，探针不能跟着卡。 */
  d.trySave = async () => { await d.page.evaluate(() => { void globalThis.__catsup.session.save(); }); await sleep(2200); };
  d.closeSheet = async () => { if (await d.page.evaluate(() => !document.getElementById("sheet").hidden)) { await d.page.locator("#sheet button", { hasText: "取消" }).first().click(); await sleep(300); } };
  return d;
}
const show = (label, st, drive) => console.log(`  ${label}: dirty=${st.dirty} storeDirty=${st.storeDirty} pushPending=${st.pushPending} attention=${st.attention}${st.sheet ? ` 面板「${st.sheet}」` : ""}${st.gate ? ` 闸门「${st.gate}」` : ""}${st.notices ? ` 通知「${st.notices}」` : ""}  |  网盘写=${drive.puts.length} 其中412=${drive.puts.filter((p) => p.status === 412).length}`);

// ── 嫌疑 1a：当前 bundle 打开各版本冻结样本，一下不碰 ──
async function samples() {
  const dirs = ["1", "3", "3.1.0-4.0.0-6.0.0-1.0.0-1.0.0-1.0.0", "3.1.0-4.2.0-6.3.0-1.0.0-1.0.0-1.1.0-1.0.0", "3.4.0-4.2.0-6.4.0-1.0.0-1.1.0-1.3.0-1.0.0-1.2.0"];
  const drive = fakeDrive();
  let i = 0; const list = [];
  for (const tag of dirs) for (const f of listFixtures(tag)) {
    const key = `s${++i}.catsup`;
    drive.items.set(key, { id: `i-${i}`, name: key, bytes: Buffer.from(readFixture(tag, f)), eTag: `"seed${i}"`, lastModifiedDateTime: new Date(Date.now() - 86400000).toISOString() });
    list.push({ key, tag, f });
  }
  const d = await device(drive, repo);
  await d.boot(); await d.idle();
  console.log(`冻结样本 ${list.length} 份，当前 bundle 打开、不碰：`);
  const bad = [];
  for (const it of list) {
    const r = await d.openDoc(it.key);
    const s0 = await d.state();
    await sleep(350);   // 参考卡片等异步落定
    const s1 = await d.state();
    if (!r || s0.dirty || s1.dirty || s1.storeDirty > 0 || s1.rev !== s0.rev) bad.push({ ...it, opened: r, dirty0: s0.dirty, dirty1: s1.dirty, storeDirty: s1.storeDirty, rev0: s0.rev, rev1: s1.rev });
  }
  console.log(bad.length ? `  打开就脏的 ${bad.length} 份：\n  ${bad.map((b) => JSON.stringify(b)).join("\n  ")}` : "  没有一份打开就脏");
  console.log(`  过程中网盘写 ${drive.puts.length} 次：${drive.puts.map((x) => `${x.key}=${x.status}`).join(" ")}`);
  // 停在最新版带参考卡的那份，等过自动保存的空闲时间（30 s）+ 切后台
  const ref = list.findLast((x) => x.f === "referenced.glb") ?? list.at(-1);
  await d.openDoc(ref.key);
  const before = drive.puts.length;
  await sleep(33000);
  await d.page.evaluate(() => globalThis.__catsup.session.flushForHide());
  await sleep(500);
  const st = await d.state();
  console.log(`  停在 ${ref.f} 上 33 s + 切后台：dirty=${st.dirty} storeDirty=${st.storeDirty}，这段网盘写 ${drive.puts.length - before} 次`);
  await d.ctx.close();
}

// ── 两台设备一起更新 ──
async function pair(oldDir, newDir, label, only) {
  console.log(`\n=== ${label} ===`);
  const want = (n) => !only || only.includes(String(n));
  // 场景 1（嫌疑 1b / 3）：两台设备都干净地开着同一份，一起更新，谁都不碰
  if (want(1)) {
    console.log("场景 1：两台都干净，更新后都不碰");
    const drive = fakeDrive();
    const A = await device(drive, oldDir), B = await device(drive, oldDir);
    await A.boot(); const p = await A.newDoc();
    await B.boot(); await B.idle(); await B.openDoc(p);
    await sleep(800);
    show("更新前 A", await A.state(), drive); show("更新前 B", await B.state(), drive);
    const n0 = drive.puts.length, e0 = drive.items.get(p)?.eTag;
    await A.update(newDir); await A.idle(); await sleep(2500);
    show("A 更新后", await A.state(), drive);
    await B.update(newDir); await B.idle(); await sleep(2500);
    show("B 更新后", await B.state(), drive);
    await sleep(33000);
    show("等过自动保存 A", await A.state(), drive); show("等过自动保存 B", await B.state(), drive);
    console.log(`  结论：更新后网盘写 ${drive.puts.length - n0} 次，eTag ${e0 === drive.items.get(p)?.eTag ? "没变" : "变了"}`);
    await A.ctx.close(); await B.ctx.close();
  }
  // 场景 2（嫌疑 2）：推到一半刷新——字节进了网盘、回执丢了
  if (want(2)) {
    console.log("场景 2：一笔推正在路上时更新（字节到了网盘，回执丢了）");
    const drive = fakeDrive();
    const A = await device(drive, oldDir);
    await A.boot(); const p = await A.newDoc();
    await sleep(500);
    await A.draw(3);
    drive.dropNextPutResponse = true;
    await A.page.evaluate(() => { void globalThis.__catsup.session.save(); });
    await A.page.waitForFunction(() => true);
    for (let i = 0; i < 40 && drive.dropNextPutResponse; i++) await sleep(100);
    console.log(`  回执丢了：${!drive.dropNextPutResponse}`);
    await A.update(newDir); await A.idle(); await sleep(3000);
    show("更新后", await A.state(), drive);
    await A.draw(6);
    await A.trySave();
    show("再改一笔并保存", await A.state(), drive);
    await A.ctx.close();
  }
  // 场景 3（开机抢跑）：别的设备刚推了新的；这台更新刷新后，从本机旧副本开，用户马上落笔
  if (want(3)) {
    console.log("场景 3：网盘上有别的设备刚推的新版本，这台更新后马上落笔");
    const drive = fakeDrive();
    const A = await device(drive, oldDir), B = await device(drive, oldDir);
    await A.boot(); const p = await A.newDoc();
    await B.boot(); await B.idle(); await B.openDoc(p);
    await sleep(500);
    await A.draw(3); await A.idle(); await A.page.evaluate(() => globalThis.__catsup.session.save()); await A.idle();
    await sleep(300);
    const n0 = drive.puts.length;
    drive.metaGate = new Promise((r) => setTimeout(r, 1500));   // 真网：核对云端要点时间
    B.dir = newDir;
    await B.page.reload({ waitUntil: "load" });
    await B.page.waitForFunction(() => globalThis.__catsup?.session?.home?.kind === "gallery");
    const canvasFirst = await B.page.evaluate(() => { const g = document.getElementById("syncGate"); return !g || g.hidden; });
    console.log(`  开机这一刻：${canvasFirst ? "画布可以画（没有罩）" : "罩着（闸门在等云端）"}`);
    // 用真输入落笔（闸门锁的就是真输入）；commitOp 绕过输入层，所以按屏幕点
    const box = await B.page.locator("#board").boundingBox();
    await B.page.evaluate(() => globalThis.__catsup.editor.setTool("rect"));
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    await B.page.mouse.move(cx - 70, cy - 30); await B.page.mouse.down(); await B.page.mouse.move(cx + 70, cy + 30, { steps: 6 }); await B.page.mouse.up();
    await sleep(2200);
    show("落笔后", await B.state(), drive);
    await B.trySave();
    show("保存后", await B.state(), drive);
    console.log(`  结论：这之后网盘写 ${drive.puts.length - n0} 次，412 = ${drive.puts.slice(n0).filter((x) => x.status === 412).length}`);
    await A.ctx.close(); await B.ctx.close();
  }
  // 场景 4（切走再更新）：改完 30 秒内切走窗口 = 只落本地不推；之后没再改，这份就一直没推；点更新刷新
  if (want(4)) {
    console.log("场景 4：改完切走窗口（只落本地），云端没人动，点更新");
    const drive = fakeDrive();
    const A = await device(drive, oldDir);
    await A.boot(); const p = await A.newDoc();
    await sleep(500);
    const n0 = drive.puts.length;
    await A.draw(3);
    await A.page.evaluate(() => globalThis.__catsup.session.flushForHide());   // 切走窗口 / 切后台（blur / visibilitychange）
    await sleep(600);
    show("切走之后", await A.state(), drive);
    await sleep(33000);   // 回来了、没再改；过了自动保存的空闲时间
    show("过 33 s 没再改", await A.state(), drive);
    console.log(`  这段网盘写 ${drive.puts.length - n0} 次（0 = 这笔一直没推）`);
    await A.page.evaluate(() => globalThis.__catsup.session.save({ implicit: true, localOnly: true }));   // 「有新版本」按钮的 onBeforeReload
    await A.update(newDir); await A.idle(); await sleep(3000);
    show("更新后", await A.state(), drive);
    await A.ctx.close();
  }
  // 场景 5（用户的日常）：电脑上改完切走（没推）→ 去 iPad 改了存（云端变了）→ 回电脑点更新
  if (want(5)) {
    console.log("场景 5：A 改完切走（没推）→ B 在云端版本上改了并推 → A 点更新");
    const drive = fakeDrive();
    const A = await device(drive, oldDir), B = await device(drive, oldDir);
    await A.boot(); const p = await A.newDoc();
    await B.boot(); await B.idle(); await B.openDoc(p);
    await sleep(500);
    const n0 = drive.puts.length;
    await A.draw(3);
    await A.page.evaluate(() => globalThis.__catsup.session.flushForHide());
    await sleep(600);
    await B.draw(6);
    await B.trySave();
    show("B 改完推了", await B.state(), drive);
    await A.update(newDir);
    for (const t of [1000, 3000, 6000, 10000]) { await sleep(t === 1000 ? 1000 : t === 3000 ? 2000 : t === 6000 ? 3000 : 4000); const st = await A.state(); show(`A 更新后 ${t / 1000} s（闸门跑着=${await A.page.evaluate(() => !!globalThis.__catsup.gate?.cloudGate?.isRunning?.())}）`, st, drive); }
    await A.page.keyboard.press("Escape"); await sleep(300);
    console.log(`  Esc 关得掉闸门上面的面板：${await A.page.evaluate(() => document.getElementById("sheet").hidden)}`);
    await A.closeSheet(); await sleep(500);
    show("A 关掉面板后（取消）", await A.state(), drive);
    await A.draw(9);
    await A.trySave();
    show("A 再改一笔保存", await A.state(), drive);
    await A.closeSheet();
    console.log(`  结论：这之后网盘写 ${drive.puts.length - n0} 次，412 = ${drive.puts.slice(n0).filter((x) => x.status === 412).length}`);
    await A.ctx.close(); await B.ctx.close();
  }
}

const [mode, a, b, label, only] = process.argv.slice(2);
if (mode === "samples") await samples();
else if (mode === "pair") await pair(a, b, label ?? `${path.basename(a)} → ${path.basename(b)}`, only ? only.split(",") : null);
else console.log("用法见文件头");
await browser.close();
console.log(errs.length ? `\nPAGEERRORS ${errs.length}:\n${[...new Set(errs)].slice(0, 6).join("\n")}` : "\n(no page errors)");

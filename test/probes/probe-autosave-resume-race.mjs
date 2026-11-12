#!/usr/bin/env node
// probe-autosave-resume-race.mjs —— 自动保存撞上「回来续推」之后，云端那份是不是最新的；不是的话，待传记号有没有留着。created 2026-11-12 by Claude Opus 5.5
// 起因（统筹 11-12，小黑屋维修线转来）：同步库仓的复现脚本 test/repro/f188-dirty-cleared-before-bytes-land.repro.ts（dd5b2ba）在 2.2.7 上四种时序里三种复现：
//   一次保存进了库、字节还没落本机，这时来了一次推送 → 推的是盘上的旧字节，却把待传记号清掉 → 网盘 = 旧的、本机 = 新的、待传 = 0（看着像同步好了）。
//   之后别的设备改了网盘，这台去核对 = 干净快进，本机换成云端那版，最后那一段没了、不留底。2.3.2 起修了。
// 三维里能不能踩到（只查不改的结论，详见报告）：会话层自己的保存排成一条队（session.save 的 saving 旗：自动撞自动 = 这一拍不存，人按的等前一次落地），
//   所以「app 自己叠着发两次保存」那几种踩不到；能踩到的是 ①「自动保存 + 自动续推」——续推（main.ts offerPushLocalOnly 的 dirty.pushAll、
//   afterCloudReachable 的 drainOfflineQueue）不经过会话那条队。自动保存带 tryPush:false 的几种时候：没网 / 没登录、回来那一串里 pushHoldAll 压着、只落本机（离页 / 刷新前）。
// 做法（假 MSAL + 假 Graph，fake-cloud.mjs）：登录着建一份、存并推（云端 = V0）→ 断网 → 改一笔 → 自动保存落定（待传 = 1，库复现 ① 的前提）→ 再改一笔 → 自动保存（没网 = 只落本机）：
//   A 同一刻：这次保存刚进库的那一下，网回来 + 直接调库的 dirty.pushAll（= offerPushLocalOnly 调的那一句）。
//   B 真路径：这次保存刚进库的那一下，网回来 + 发 window 的 online 事件，让 app 自己那一串（afterCloudReachable → … → pushAll）去跑；跑几轮记命中几次。
//   等都落定，比：云端字节 = 这次保存的字节？不等的话待传计数必须 > 0、会话的 pushPending 必须还是真。
//   命中的那一轮再看后果：别的设备改了网盘（换个 eTag）→ 这台去核对（refreshOpenDoc）→ 本机那一笔是不是被换没了。
// 测量时让页面报「看不见」（不发事件）：心跳的补推只在看得见时跑，不然它会在测量中途把这一下补好，看不清这一下本身对不对。
// 判两层：库这一层 = 云端不是这次的字节 ⟹ 库的待传记号还在（2.2.7 上 A / C / D 都红）；两层合起来 = 库的记号没了的话，会话的 pushPending 还在
//   （三维里它挡住了：心跳会补推、回前台的核对不快进）。但 offerPushLocalOnly 推完会按库的计数 noteCaughtUp——计数被错清成 0 时这一层也跟着清掉；
//   探针里没造出这个时序（要开着那份先推、它的保存在别的份推的时候落定），是读代码的结论，见只查不改报告。
// 用法：node test/probes/probe-autosave-resume-race.mjs [仓根目录，缺省 = 本仓]   （自己起 8767，≈ 30 s）。2.2.7 上应当红；收了 2.3.x 应当绿。
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MSAL_STUB, fakeDrive } from "./fake-cloud.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = process.argv[2] ?? path.join(here, "../..");
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const ORIGIN = "http://127.0.0.1:8767";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".json": "application/json", ".wasm": "application/wasm", ".webmanifest": "application/manifest+json" };
const B_ROUNDS = 6;
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what, extra && process.env.VERBOSE ? `  · ${extra}` : ""); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const sha = (b) => createHash("sha256").update(b).digest("hex").slice(0, 12);
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];

async function device() {
  const drive = fakeDrive();
  const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1, serviceWorkers: "block" });
  await ctx.route(`${ORIGIN}/**`, async (route) => {
    let p = decodeURIComponent(new URL(route.request().url()).pathname); if (p === "/") p = "/index.html";
    const f = path.join(repo, p);
    if (!existsSync(f)) return route.fulfill({ status: 404, body: "" });
    await route.fulfill({ status: 200, contentType: MIME[path.extname(f)] ?? "application/octet-stream", body: readFileSync(f) });
  });
  await drive.attach(ctx);
  await ctx.route(/vendor\/msal\/msal-browser\.min\.js/, (r) => r.fulfill({ contentType: "text/javascript", body: MSAL_STUB }));
  await ctx.addInitScript(() => localStorage.setItem("__fake_msal", "ok"));
  await ctx.addInitScript(() => Object.defineProperty(navigator, "onLine", { configurable: true, get: () => !window.__off }));
  const page = await ctx.newPage(); page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 200)));
  await page.goto(`${ORIGIN}/`, { waitUntil: "load" });
  await page.waitForFunction(() => globalThis.__catsup?.session);
  const idle = () => page.waitForFunction(() => { const c = globalThis.__catsup, s = c.session; return !s.saving && !c.gate?.cloudGate?.isRunning?.() && !s.adopting; }, null, { timeout: 20000 });
  const draw = (dx) => page.evaluate((dx) => { const e = globalThis.__catsup.editor, P = (a, b, c = 0) => ({ x: a, y: b, z: c }); e.setGrid({ ...e.grid, on: false }); e.commitOp({ op: "addEdges", segs: [[P(dx, 0), P(dx + 1, 0)], [P(dx + 1, 0), P(dx + 1, 1)], [P(dx + 1, 1), P(dx, 1)], [P(dx, 1), P(dx, 0)]] }); }, dx);
  // 建一份、登录着存并推
  await page.evaluate(() => globalThis.__catsup.galleryHost.open());
  await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
  await page.click("#galleryNew");
  await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
  await draw(0);
  await page.waitForFunction(() => !globalThis.__catsup.session.lazy);
  await idle();
  await page.evaluate(() => globalThis.__catsup.session.save());
  await idle();
  const docPath = await page.evaluate(() => globalThis.__catsup.session.home.path);
  return { drive, ctx, page, idle, draw, docPath };
}

/** 断网 → 改一笔 → 自动保存；它进库的那一下按 how 动手（A = 网回来 + 直接 pushAll；B = 网回来 + online 事件）。返回这次保存交给库的字节的哈希和落定后的状态。 */
const raceOnce = async (dv, how, dx) => {
  await dv.page.evaluate(() => { window.__off = true; window.dispatchEvent(new Event("offline")); });
  await dv.draw(dx);
  await dv.page.evaluate(() => globalThis.__catsup.session.save({ implicit: true }));   // 没网时的上一次自动保存落定了：待传 = 1（库复现脚本 ① 的前提）
  await dv.draw(dx + 1);
  const r = await dv.page.evaluate(async (how) => {
    const c = globalThis.__catsup, s = c.session, store = c.store(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    const hex = async (b) => [...new Uint8Array(await crypto.subtle.digest("SHA-256", b instanceof Blob ? await b.arrayBuffer() : b))].map((x) => x.toString(16).padStart(2, "0")).join("").slice(0, 12);
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });   // 不发事件：只让心跳（tick 的重推只在看得见时）别在测量中途把它补好，看清这一下本身对不对
    const origFile = store.file.bind(store), origPushAll = store.files.dirty.pushAll.bind(store.files.dirty);
    let seen = null, pushAll = null, t0 = 0;
    const tl = [];   // 时间线：进库、落本机、pushAll 开始 / 结束（毫秒，从进库算）
    const running = [];
    store.files.dirty.pushAll = (...a) => { tl.push(`pushAll 开始 ${Math.round(performance.now() - t0)}`); const q = origPushAll(...a).finally(() => tl.push(`pushAll 完 ${Math.round(performance.now() - t0)}`)); running.push(q.catch(() => {})); return q; };
    store.file = (id, o) => {
      const h = origFile(id, o), origSave = h.save.bind(h);
      h.save = (bytes, opts) => {
        if (seen || opts?.tryPush) return origSave(bytes, opts);
        seen = { bytes, tryPush: !!opts?.tryPush };
        let arg = bytes;
        const slow = how === "C" ? 500 : how === "D" ? 150 : 0;
        if (slow) {   // 本机写入慢（大文件 / 加密件的样子）：交给库一个读得慢的 Blob——只把「进库到落本机」这段拉长，别的不变
          arg = new Blob([bytes]); const orig = arg.arrayBuffer.bind(arg);
          arg.arrayBuffer = async () => { await sleep(slow); return orig(); };
        }
        t0 = performance.now();
        const p = origSave(arg, opts).finally(() => tl.push(`这次保存落定 ${Math.round(performance.now() - t0)}`));   // 进库了（库一进 save 就记一次改动，字节还没落本机）
        window.__off = false;              // 就在这一下，网回来了
        if (how === "A") pushAll = store.files.dirty.pushAll().catch((e) => ({ error: String(e) }));   // B / C：app 自己那一串
        else window.dispatchEvent(new Event("online"));
        return p;
      };
      return h;
    };
    try {
      await s.save({ implicit: true });   // 自动保存（tick 的那一句），这时没网 = tryPush:false
      if (pushAll) await pushAll;
      for (let i = 0; i < 200 && (s.saving || globalThis.__catsup.gate?.cloudGate?.isRunning?.()); i++) await sleep(25);
      await sleep(600);   // 回来那一串（refreshOpenDoc → drain → 数 → pushAll）跑完
      await Promise.all(running); await sleep(150);   // 正在传的 pushAll 传完、noteCaughtUp 也跑完
      for (let i = 0; i < 200 && s.saving; i++) await sleep(25);
    } finally { store.file = origFile; store.files.dirty.pushAll = origPushAll; }
    const out = { storeDirty: await store.files.dirty.count(), pushPending: !!s.pushPending };
    delete document.visibilityState;
    return { tl: tl.join(" → "), savedSha: seen ? await hex(seen.bytes) : null, tryPush: seen?.tryPush ?? null, storeDirty: out.storeDirty, pushPending: out.pushPending, sessionDirty: s.dirty(), attention: !!s.attention };
  }, how);
  const it = dv.drive.items.get(dv.docPath);
  return { ...r, cloudSha: it ? sha(it.bytes) : null };
};

/** 后果：别的设备改了网盘（同样的字节、新 eTag）→ 这台核对 → 本机那一笔还在不在。 */
const consequence = async (dv) => {
  dv.drive.bump(dv.docPath);
  return dv.page.evaluate(async () => {
    const c = globalThis.__catsup, edgesBefore = c.editor.sceneRef.brep(c.editor.sceneRef.root).kernel.toBrep().edges.length;
    const st = await c.session.refreshOpenDoc();
    const edgesAfter = c.editor.sceneRef.brep(c.editor.sceneRef.root).kernel.toBrep().edges.length;
    return { st, edgesBefore, edgesAfter };
  });
};

const libOk = (r) => r.cloudSha === r.savedSha || r.storeDirty > 0;                 // 库这一层：云端不是这次的字节 ⟹ 待传记号还在
const verdictOk = (r) => libOk(r) || r.pushPending;                                  // 两层：库的记号没了，会话的 pushPending 还在（心跳会补推、核对不快进）
const line = (r) => `[${r.tl}] 这次保存 ${r.savedSha}（tryPush ${r.tryPush}）· 云端 ${r.cloudSha} · 待传计数 ${r.storeDirty} · 会话 pushPending ${r.pushPending}${r.attention ? " · 横幅" : ""}`;

console.log("A 同一刻：自动保存刚进库，网回来 + 库的 dirty.pushAll（offerPushLocalOnly 调的那一句）");
{
  const dv = await device();
  const r = await raceOnce(dv, "A", 2);
  check(r.tryPush === false, "前提：这次自动保存没推（没网 = tryPush:false）", line(r));
  check(libOk(r), "库这一层：云端是这次保存的字节，或者库的待传记号还留着", line(r));
  check(verdictOk(r), "两层合起来：库的记号没了的话，会话的 pushPending 还在", line(r));
  if (!verdictOk(r)) { const q = await consequence(dv); check(q.edgesAfter === q.edgesBefore, "后果：别的设备改了网盘、这台去核对 → 本机这一笔还在", `核对 ${q.st}；边 ${q.edgesBefore} → ${q.edgesAfter}`); }
  await dv.ctx.close();
}

console.log("\nC 真路径 + 本机写入慢 0.5 秒（大文件 / 加密件）：自动保存刚进库，网回来 + online 事件");
{
  const dv = await device();
  const r = await raceOnce(dv, "C", 2);
  check(r.tryPush === false, "前提：这次自动保存没推（没网 = tryPush:false）", line(r));
  check(libOk(r), "库这一层：云端是这次保存的字节，或者库的待传记号还留着", line(r));
  check(verdictOk(r), "两层合起来：库的记号没了的话，会话的 pushPending 还在", line(r));
  if (!verdictOk(r)) { const q = await consequence(dv); check(q.edgesAfter === q.edgesBefore, "后果：别的设备改了网盘、这台去核对 → 本机这一笔还在", `核对 ${q.st}；边 ${q.edgesBefore} → ${q.edgesAfter}`); }
  await dv.ctx.close();
}

console.log("\nD 真路径 + 本机写入 0.15 秒、往网盘传 0.6 秒（平常的样子：传比落本机慢）：自动保存刚进库，网回来 + online 事件");
{
  const dv = await device();
  dv.drive.holdPut = { then: (res) => setTimeout(res, 600) };   // 这一轮每次往网盘写都要 0.6 秒（从这次写开始算）
  const r = await raceOnce(dv, "D", 2);
  dv.drive.holdPut = null;
  check(r.tryPush === false, "前提：这次自动保存没推（没网 = tryPush:false）", line(r));
  check(libOk(r), "库这一层：云端是这次保存的字节，或者库的待传记号还留着", line(r));
  check(verdictOk(r), "两层合起来：库的记号没了的话，会话的 pushPending 还在", line(r));
  if (!verdictOk(r)) { const q = await consequence(dv); check(q.edgesAfter === q.edgesBefore, "后果：别的设备改了网盘、这台去核对 → 本机这一笔还在", `核对 ${q.st}；边 ${q.edgesBefore} → ${q.edgesAfter}`); }
  await dv.ctx.close();
}

console.log(`\nB 真路径：自动保存刚进库，网回来 + online 事件（app 自己那一串去推），跑 ${B_ROUNDS} 轮`);
{
  const dv = await device();
  let hit = 0, firstBad = null;
  for (let k = 0; k < B_ROUNDS; k++) {
    const r = await raceOnce(dv, "B", 2 + 2 * k);
    const ok = verdictOk(r);
    console.log(`    第 ${k + 1} 轮 ${ok ? "对" : "✗ 云端旧、记号没了"}：${line(r)}`);
    if (!ok) { hit++; firstBad ??= r; break; }
  }
  check(hit === 0, `真路径 ${B_ROUNDS} 轮里没有一轮「云端旧、待传 0」`, `命中 ${hit} 轮`);
  if (firstBad) { const q = await consequence(dv); check(q.edgesAfter === q.edgesBefore, "后果：别的设备改了网盘、这台去核对 → 本机这一笔还在", `核对 ${q.st}；边 ${q.edgesBefore} → ${q.edgesAfter}`); }
  await dv.ctx.close();
}

await browser.close();
const realErrs = errs.filter((e) => !/Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal/i.test(e));
if (realErrs.length) { console.log("页面错误：", realErrs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-autosave-resume-race ${failN || realErrs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

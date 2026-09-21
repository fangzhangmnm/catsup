#!/usr/bin/env node
// test/boot-smoke.mjs —— 转正纪元 ② 冒烟（headless，借 WeebPaint 的 playwright）：无地导出/重开 → 图库懒建 → 新建安家 → 保存（缩略图）→ 刷新回到上次文档
//   → ③ 缩略图 IDB 命中 → ④ 盲快照 / redirect 留声 / 自动领养 → ⑤ crash 帧通知 → 恢复（0.5.2，user 2026-09-20「234批准」）。
// 用法：python3 -m http.server 8765 后 `node test/boot-smoke.mjs [url] [outdir]`。created 2026-09-20 by Claude Fable 5.1
import { createRequire } from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { readCatsup } from "../src/format/index.ts";
import { Kernel } from "../src/kernel/kernel.ts";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const out = process.argv[3] ?? "/tmp";
const BENIGN = /Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon|GPU stall due to ReadPixels|not persisted yet/i;
const errors = [];
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1100, height: 720 }, deviceScaleFactor: 1, acceptDownloads: true });
const page = await ctx.newPage();
page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
page.on("console", (m) => { if ((m.type() === "error" || m.type() === "warning") && !BENIGN.test(m.text())) errors.push(`console.${m.type()}: ${m.text()}`); });
const fail = (msg) => { console.error("✗", msg); process.exitCode = 1; };
const eq = (a, b, what) => { if (a !== b) fail(`${what}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`); else console.log("  ✓", what); };

await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session);
await page.waitForTimeout(400);
eq(await page.evaluate(() => globalThis.__catsup.session.home.kind), "transient", "boot: transient home");
eq(await page.evaluate(() => document.title), "新模型 — CatsUp", "boot: document.title = 名 — CatsUp"); eq(await page.evaluate(() => document.getElementById("btnSave").dataset.state), "none", "boot: save btn none");

// 画一个矩形 → dirty
const box = await page.locator("#board").boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
await page.keyboard.press("r");
await page.mouse.move(cx - 120, cy + 40); await page.mouse.down(); await page.mouse.move(cx + 80, cy + 120, { steps: 10 }); await page.mouse.up();
await page.waitForTimeout(1300);
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "rect drawn");
eq(await page.evaluate(() => document.getElementById("btnSave").dataset.state), "dirty", "save btn dirty"); eq((await page.evaluate(() => document.title)).startsWith("● "), true, "document.title carries dirty dot");

// 无地导出 .glb（下载）→ node 侧读回
const [dl] = await Promise.all([page.waitForEvent("download"), page.evaluate(() => globalThis.__catsup.session.exportDownload())]);
const dlPath = path.join(out, "smoke-export.glb");
await dl.saveAs(dlPath);
const bytes = new Uint8Array(readFileSync(dlPath));
const doc = readCatsup(bytes);
eq(Kernel.fromBrep(doc.root.brep).faces().length, 1, "exported .glb reads back (1 face)");
eq(!!doc.thumbnail && doc.thumbnail.bytes.length > 500, true, `exported .glb carries a JPEG thumbnail (${doc.thumbnail?.bytes.length ?? 0} B)`);
console.log("  · export size", bytes.byteLength, "B");
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-1-editor.png") });

// 从本地输入重开（文件家，无 FSA 句柄）
await page.setInputFiles("#glbFile", dlPath);
// 当前 transient 文档是脏的 → 挽留 sheet（保存 / 丢弃 / 取消）：冒烟选「丢弃」
await page.waitForSelector("#sheet:not([hidden])");
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-1b-leave-sheet.png") });
eq(await page.evaluate(() => document.getElementById("sheetTitle").textContent), "这个模型还没有家", "leave gate sheet for dirty transient");
await page.click("#sheetChoices .sheet-choice.danger");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "file");
eq(await page.evaluate(() => globalThis.__catsup.session.home.fileName), "smoke-export.glb", "opened local file → file home");
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "local open restores 1 face");
eq(await page.evaluate(() => document.getElementById("btnSave").dataset.state), "local-only", "save btn: file, clean = local-only");

// 图库：懒建 store（未配置云 → 本机图库），新建自动安家，保存（含缩略图），列表出现
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.waitForTimeout(800);
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-2-gallery-empty.png") });
await page.click("#galleryNew");
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "gallery" && document.getElementById("galleryFull").hidden);
const gpath = await page.evaluate(() => globalThis.__catsup.session.home.path);
eq(/^\d{8}-[0-9a-f]{4}\.glb$/.test(gpath), true, `new doc auto-homed in gallery (${gpath})`);
await page.waitForTimeout(300);
console.log("  · pre-draw state:", JSON.stringify(await page.evaluate((c) => ({ tool: globalThis.__catsup.editor.tool, active: document.activeElement?.tagName + "#" + document.activeElement?.id, top: document.elementFromPoint(c.x, c.y)?.id, saving: globalThis.__catsup.session.saving, gesture: globalThis.__catsup.editor.isGestureActive() }), { x: cx, y: cy })));
await page.keyboard.press("r");
// 拖的对角线别和世界轴平行（yaw −45° 下屏幕对角 (160,90) 会投成零宽矩形 = 合法的「画了个线」，冒烟要的是面）
await page.mouse.move(cx - 100, cy - 60); await page.mouse.down(); await page.mouse.move(cx + 100, cy + 20, { steps: 10 }); await page.mouse.up();
await page.waitForTimeout(300);
console.log("  · post-draw state:", JSON.stringify(await page.evaluate((c) => ({ tool: globalThis.__catsup.editor.tool, faces: globalThis.__catsup.editor.kernel.faces().length, edges: globalThis.__catsup.editor.kernel.edges().length, rev: globalThis.__catsup.editor.revision, gesture: globalThis.__catsup.editor.isGestureActive(), topEnd: document.elementFromPoint(c.x + 60, c.y + 30)?.id, marquee: document.getElementById("marquee")?.hidden, ed: (() => { const e = globalThis.__catsup.editor; return { armed: e.armed, canArm: e.canArm, anchor3: e.anchor3, down: e.downScreen, jc: e.justCommitted, live: !!e.live, suspended: e.drawSuspended }; })(), gest: (() => { const g = globalThis.__catsup.gestures; return g ? { pen: g.penEverSeen?.() } : null; })(), notices: document.getElementById("noticeStack")?.textContent }), { x: cx, y: cy })));
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-2b-after-draw.png") });
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "rect drawn in gallery-home doc");
eq(await page.evaluate(() => globalThis.__catsup.session.save()), true, "explicit save to gallery home");
const savedBytes = await page.evaluate(async (p) => { const b = await globalThis.__catsup.store().file(p, { isZip: false, mode: "existing" }).open(); return b ? b.size : -1; }, gpath);
console.log("  · saved size in store", savedBytes, "B");
eq(await page.evaluate(() => globalThis.__catsup.session.dirty()), false, "clean after save");
eq(await page.evaluate(() => document.getElementById("btnSave").dataset.state), "local-only", "save btn: gallery home, configured but signed out = local-only（斜杠云）");
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForTimeout(1200);
const tileText = await page.evaluate((p) => document.getElementById("galleryMount").textContent.includes(p.replace(/\.glb$/, "")), gpath);
eq(tileText, true, "gallery lists the saved doc");
await page.waitForTimeout(1500);
const thumb = await page.evaluate(() => ({ imgs: document.querySelectorAll("#galleryMount img").length, stats: globalThis.__catsup.galleryHost.thumbStats() }));
console.log("  · tile thumbnails:", JSON.stringify(thumb));
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-3-gallery-one.png") });
await page.evaluate(() => globalThis.__catsup.galleryHost.close());

// 刷新：自动回到上次文档（device-kv last-doc → store 本地副本）
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session?.home?.kind === "gallery", null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(500);
eq(await page.evaluate(() => globalThis.__catsup.session.home.kind), "gallery", "reload restores gallery home");
eq(await page.evaluate(() => globalThis.__catsup.session.home.path), gpath, "reload restores same path");
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "reload restores geometry");
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-4-reloaded.png") });

// ③ 缩略图 IDB 缓存（user 2026-09-20 批）：刷新后再开图库——内存已空，命中只能来自 IDB
await page.evaluate(() => globalThis.__catsup.galleryHost.open());
await page.waitForFunction(() => !document.getElementById("galleryFull").hidden);
await page.waitForTimeout(1500);
const thumb2 = await page.evaluate(() => ({ imgs: document.querySelectorAll("#galleryMount img").length, stats: globalThis.__catsup.galleryHost.thumbStats() }));
console.log("  · tile thumbnails after reload:", JSON.stringify(thumb2));
eq(!!thumb2.stats && thumb2.stats.hits >= 1, true, "thumbnail served from IDB cache after reload (cache hit)");
eq(thumb2.imgs >= 1, true, "tile still shows a thumbnail");
await page.evaluate(() => globalThis.__catsup.galleryHost.close());

// ④ T-crash（file 家）：本地重开 → 画 → 盲快照 → 登录 redirect 前留声（pending-adoption）→ 刷新 → 自动领养进图库
await page.setInputFiles("#glbFile", dlPath);
await page.waitForFunction(() => globalThis.__catsup.session.home.kind === "file");
const revBefore = await page.evaluate(() => globalThis.__catsup.editor.revision);
await page.keyboard.press("r");
await page.mouse.move(cx - 100, cy - 60); await page.mouse.down(); await page.mouse.move(cx + 100, cy + 20, { steps: 10 }); await page.mouse.up();
await page.waitForTimeout(1300);   // 标题胶囊随 1 s tick 刷新
const facesBefore = await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length);
eq((await page.evaluate(() => globalThis.__catsup.editor.revision)) > revBefore, true, "draw on file-home doc bumped revision");
eq(await page.evaluate(() => document.getElementById("btnSave").dataset.state), "dirty", "save btn dirty after draw (file home)");
eq(await page.evaluate(() => globalThis.__catsup.session.snapshot("crash")), true, "blind snapshot written to crash store");
let recs = await page.evaluate(() => globalThis.__catsup.crash.listAtBoot());
eq(recs.length, 1, "one crash record"); eq(recs[0]?.state, "crash", "record state crash"); eq(recs[0]?.homeKind, "file", "record homeKind file"); eq(recs[0]?.name, "smoke-export", "record carries display name");
await page.evaluate(() => globalThis.__catsup.session.prepareForRedirect());
recs = await page.evaluate(() => globalThis.__catsup.crash.listAtBoot());
eq(recs.length === 1 && recs[0].state === "pending-adoption", true, "redirect prep → same tag flipped to pending-adoption");
page.once("dialog", (d) => d.accept());   // beforeunload 承重层：脏的 file 家刷新会被浏览器挽留 → 冒烟放行
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.session?.home?.kind === "gallery" && /-恢复/.test(globalThis.__catsup.session.home.path), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(300);
const adoptedPath = await page.evaluate(() => globalThis.__catsup.session.home.path ?? "");
eq(/^smoke-export-恢复(-\d+)?\.glb$/.test(adoptedPath), true, `pending record auto-adopted into gallery as <name>-恢复 (${adoptedPath})`);
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), facesBefore, "adopted geometry matches the snapshot");
eq(await page.evaluate(() => globalThis.__catsup.session.dirty()), false, "adopted doc saved into gallery (clean)");
eq((await page.evaluate(() => globalThis.__catsup.crash.listAtBoot())).length, 0, "pending record consumed");
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-5-adopted.png") });

// ⑤ crash 帧通知：人工放一帧（= 真 crash 幸存的快照）→ 刷新 → 非模态通知 → 恢复
await page.evaluate(async (p) => { const b = await globalThis.__catsup.store().file(p, { isZip: false, mode: "existing" }).open(); await globalThis.__catsup.crash.put("tag-smoke-ghost", b, { state: "crash", name: "幽灵", at: Date.now(), homeKind: "transient" }); }, gpath);
await page.reload({ waitUntil: "load" });
await page.waitForFunction(() => (document.getElementById("noticeStack")?.textContent ?? "").includes("幽灵"), null, { timeout: 15000 }).catch(() => {});
eq((await page.evaluate(() => document.getElementById("noticeStack")?.textContent ?? "")).includes("上次没保存的模型「幽灵」"), true, "boot notice offers the crash frame");
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-6-crash-notice.png") });
await page.evaluate(() => { const t = [...document.querySelectorAll("#noticeStack .toast")].find((x) => x.textContent.includes("幽灵")); t.querySelector(".toast-btn.primary").click(); });
await page.waitForFunction(() => /幽灵-恢复/.test(globalThis.__catsup.session.home.path ?? ""), null, { timeout: 15000 }).catch(() => {});
await page.waitForTimeout(300);
const ghostPath = await page.evaluate(() => globalThis.__catsup.session.home.path ?? "");
eq(/^幽灵-恢复(-\d+)?\.glb$/.test(ghostPath), true, `crash frame recovered into gallery (${ghostPath})`);
eq(await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length), 1, "recovered geometry (1 face)");
eq((await page.evaluate(() => globalThis.__catsup.crash.listAtBoot())).length, 0, "crash record consumed");
if (!process.env.SKIP_SHOTS) await page.screenshot({ path: path.join(out, "smoke-7-recovered.png") });

await browser.close();
if (errors.length) { fail("page errors:\n" + errors.join("\n")); }
else console.log(process.exitCode ? "smoke FAILED" : "smoke ok, no page errors");

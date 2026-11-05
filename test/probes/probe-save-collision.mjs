// 按存撞上在飞的保存（headless）：设计 = ai-docs/20261105-save-and-dispose-fixes.md §1。created 2026-11-05 by Claude Opus 5.5
// 假的文件句柄把写盘拖慢 → 让一次自动存在路上 → 再改一笔 → 真按 Ctrl+S：人按的不能被吞（两次写、状态行说已保存、不脏、第二笔进了字节）。
// 对照：自动撞自动照旧跳过（只写一次）。用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-save-collision.mjs [url]`。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 400)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const out = {}, ok = (k, v) => { out[k] = !!v; if (!v) process.exitCode = 1; };
const seg = (y) => `({ op: "addEdges", at: e.activePool(), segs: [[{ x: 0, y: ${y}, z: 0 }, { x: 1, y: ${y}, z: 0 }]] })`;
await page.evaluate(() => { const s = globalThis.__catsup.session;
  globalThis.__writes = []; globalThis.__delay = 700;
  const handle = { name: "探针.catsup", createWritable: async () => { const parts = []; await new Promise((r) => setTimeout(r, globalThis.__delay)); return { write: async (b) => { parts.push(b); }, close: async () => { let n = 0; for (const p of parts) n += p.size ?? p.byteLength; globalThis.__writes.push({ n, rev: globalThis.__catsup.editor.revision }); } }; } };
  s.setHome({ kind: "file", handle, fileName: "探针.catsup" }); s.lazy = false; });
const status = () => page.evaluate(() => document.getElementById("noticeStack").textContent);
const edit = (y) => page.evaluate(new Function(`const e = globalThis.__catsup.editor; e.commitOp(${seg(y)}); return e.revision;`));

// ① 自动撞自动：第二次跳过（只写一次）
await edit(1);
const auto = await page.evaluate(async () => { const s = globalThis.__catsup.session, a = s.save({ implicit: true }), b = s.save({ implicit: true }); const [x, y] = await Promise.all([a, b]); return { x, y, writes: globalThis.__writes.length }; });
ok("autoVsAuto.firstWrote", auto.x === true);
ok("autoVsAuto.secondSkipped", auto.y === false && auto.writes === 1);

// ② 人按的撞上在飞的自动存：真按 Ctrl+S
await page.evaluate(() => { globalThis.__writes.length = 0; });
await edit(2);
await page.evaluate(() => { globalThis.__auto = globalThis.__catsup.session.save({ implicit: true }); });
await page.waitForTimeout(100);
ok("collide.inFlight", await page.evaluate(() => globalThis.__catsup.session.saveState() === "saving"));
const revB = await edit(3);   // 这一笔在飞的那次没带上
await page.keyboard.press("Control+s");
await page.waitForTimeout(2000);
ok("collide.noWaitingNoiseWhenQuick", !/还在路上/.test(await status()));
const r = await page.evaluate(() => { const s = globalThis.__catsup.session; return { writes: globalThis.__writes.length, dirty: s.dirty(), last: globalThis.__writes.at(-1), rev: globalThis.__catsup.editor.revision }; });
ok("collide.twoWrites", r.writes === 2);
ok("collide.notDirty", r.dirty === false);
ok("collide.secondHasNewEdit", r.last?.rev === revB && r.rev === revB);
ok("collide.saysSaved", /已保存/.test(await status()));

// ②½ 等得久（网慢）：说明在等什么，落地后照旧「已保存」
await page.evaluate(() => { globalThis.__writes.length = 0; globalThis.__delay = 1800; });
await edit(5);
await page.evaluate(() => { globalThis.__auto = globalThis.__catsup.session.save({ implicit: true }); });
await page.waitForTimeout(100);
await page.keyboard.press("Control+s"); await page.waitForTimeout(1300);
ok("slow.saysWaiting", /还在路上/.test(await status()));
await page.waitForTimeout(2800);
ok("slow.twoWrites", await page.evaluate(() => globalThis.__writes.length === 2 && !globalThis.__catsup.session.dirty()));

// ③ 连按三下：有限链，不并发、都走完
await page.evaluate(() => { globalThis.__writes.length = 0; globalThis.__delay = 300; });
await edit(4);
const multi = await page.evaluate(async () => { const s = globalThis.__catsup.session; const a = s.save(), b = s.save(), c = s.save(); const rs = await Promise.all([a, b, c]); return { rs, writes: globalThis.__writes.length, saving: s.saving }; });
ok("triple.allTrue", multi.rs.every((x) => x === true));
ok("triple.sequentialWrites", multi.writes === 3 && multi.saving === false);

console.log(JSON.stringify(out, null, 1));
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)");
if (errs.length) process.exitCode = 1;
await b.close();

// CatsUp 搬子域名第 0.1 步的证据：旧址整个 301 之后，CatsUp 的 service worker 会不会把导航弄坏（家族 W-21）。
// created 20261103 by Claude Opus 5.5。无头，用本地两个源模拟整站 301。SW 字节 = 本仓 service-worker.js。
// 反面对照：同一份 SW 塞进 W-21 的 withNoStore 坏写法，确认这个探针抓得到那个 bug。
import { createRequire } from "node:module";
import http from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const here = dirname(fileURLToPath(import.meta.url));
const REAL = readFileSync(join(here, "..", "..", "service-worker.js"), "utf8");

const HOOK = "event.respondWith(SCOPE_IS_DEV ? networkFirst(req) : cacheFirst(req));";
if (!REAL.includes(HOOK)) throw new Error("SW 改了，探针里的接缝对不上");
const BUGGY = REAL.replace(HOOK, `const p = SCOPE_IS_DEV ? networkFirst(req) : cacheFirst(req);
  event.respondWith(req.mode === "navigate" ? withNoStore(p) : p);`) + `
async function withNoStore(p) {
  const r = await p;
  const h = new Headers(); r.headers.forEach((v, k) => h.set(k, v)); h.set("Cache-Control", "no-store");
  return new Response(r.body, { status: r.status, statusText: r.statusText, headers: h });   // W-21：status 0 → RangeError
}`;

const page = (who) => `<!doctype html><meta charset=utf-8><title>${who}</title>
<script type="module" src="./dist/catsup-abc123.mjs"></script>
<body data-who="${who}">${who}</body>`;
const REG = `if (!window.__noReg) navigator.serviceWorker.register("./service-worker.js");`;

function serve(handler) {
  return new Promise((res) => { const s = http.createServer(handler); s.listen(0, "127.0.0.1", () => res({ s, port: s.address().port })); });
}

async function scenario(browser, { label, scope, swText }) {
  let moved = false, shellRev = "OLD";
  const newSrv = await serve((req, res) => {
    const p = req.url.split("?")[0];
    if (p.endsWith("/service-worker.js")) { res.writeHead(200, { "content-type": "text/javascript" }); return res.end(swText); }
    if (p.endsWith(".mjs")) { res.writeHead(200, { "content-type": "text/javascript" }); return res.end(REG); }
    if (p.endsWith("/") || p.endsWith(".html")) { res.writeHead(200, { "content-type": "text/html", etag: '"new"' }); return res.end(page("NEW")); }
    res.writeHead(200); res.end("x");
  });
  const NEW = `http://localhost:${newSrv.port}`;
  const oldSrv = await serve((req, res) => {
    const p = req.url.split("?")[0];
    if (moved) { res.writeHead(301, { location: NEW + p.replace(/^\/catsup/, "") }); return res.end(); }
    if (p.endsWith("/service-worker.js")) { res.writeHead(200, { "content-type": "text/javascript" }); return res.end(swText); }
    if (p.endsWith(".mjs")) { res.writeHead(200, { "content-type": "text/javascript" }); return res.end(REG); }
    if (p.endsWith("/") || p.endsWith(".html")) { res.writeHead(200, { "content-type": "text/html", etag: `"${shellRev}"` }); return res.end(page(shellRev)); }
    res.writeHead(200); res.end("x");
  });
  const OLD = `http://localhost:${oldSrv.port}`;
  const start = `${OLD}${scope}`;

  const ctx = await browser.newContext();
  const pg = await ctx.newPage();
  const out = { label };
  const nav = async (url) => {
    try {
      const r = await pg.goto(url, { waitUntil: "load", timeout: 8000 });
      const who = await pg.evaluate(() => document.body?.dataset?.who ?? "(没有页面)").catch(() => "(页面读不出)");
      return { ok: !!r && r.status() < 400, status: r?.status(), finalOrigin: new URL(pg.url()).origin === NEW ? "新址" : "旧址", path: new URL(pg.url()).pathname, who };
    } catch (e) { return { ok: false, error: String(e.message).split("\n")[0].slice(0, 90) }; }
  };

  await nav(start);
  await pg.evaluate(async () => { const r = await navigator.serviceWorker.ready; await new Promise((res) => r.active?.state === "activated" ? res() : setTimeout(res, 500)); });
  for (let i = 0; i < 30 && !(await pg.evaluate(() => !!navigator.serviceWorker.controller)); i++) await new Promise((r) => setTimeout(r, 100));
  out.controlled = await pg.evaluate(() => !!navigator.serviceWorker.controller);
  await pg.evaluate(() => { localStorage.setItem("marker", "old-box"); });

  moved = true;
  out.afterMove = await nav(start);
  out.afterMoveAgain = await nav(start);
  // 旧址这边还拿不拿得到本机数据（只有页面还留在旧址才读得到）
  out.oldBoxReadable = out.afterMove.finalOrigin === "旧址" ? await pg.evaluate(() => localStorage.getItem("marker")).catch(() => null) : "（页面已到新址）";
  // 离线壳自己的更新：按规范脚本被 301 算失败
  if (out.afterMove.finalOrigin === "旧址") {
    out.swUpdate = await pg.evaluate(async () => { try { const r = await navigator.serviceWorker.getRegistration(); await r.update(); return "update 没报错"; } catch (e) { return "update 失败：" + String(e.message).slice(0, 70); } });
    out.uncachedPath = await nav(`${start}never-cached.html`);
  }
  // 断网时开旧址：应该回退离线壳
  moved = false; await nav(start); moved = true;   // 让 dev 这条也先有一份缓存可回退
  await ctx.setOffline(true);
  out.offline = await nav(start);
  await ctx.setOffline(false);
  // 无网之外：搬完后从新址开一次
  out.newSite = await nav(`${NEW}${scope.replace(/^\/catsup/, "")}`);
  await ctx.close(); oldSrv.s.close(); newSrv.s.close();
  return out;
}

const t0 = performance.now();
const browser = await chromium.launch();
const results = [];
for (const c of [
  { label: "A 开发版路径（/dev/，网络优先），真 SW", scope: "/catsup/dev/", swText: REAL },
  { label: "B 正式版路径（/，缓存优先），真 SW", scope: "/catsup/", swText: REAL },
  { label: "C 反面对照：开发版路径 + W-21 坏写法", scope: "/catsup/dev/", swText: BUGGY },
]) results.push(await scenario(browser, c));
console.log("Chromium", await browser.version());
await browser.close();
for (const r of results) { console.log("\n== " + r.label); for (const [k, v] of Object.entries(r)) if (k !== "label") console.log("  " + k + ":", JSON.stringify(v)); }
console.log(`\n用时 ${((performance.now() - t0) / 1000).toFixed(1)} s`);

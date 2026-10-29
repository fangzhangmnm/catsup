// probe-style.mjs —— 风格（Tron 纪元第 1 步：预设 = 数据）的接线：规划器按预设排 pass、缩略图 / XR 退回白模、切回白模就是原来那条。
// 画面本身由截图基线管（style-pixel-*）；这里只验「哪条路」。无头。created 2026-10-29 by Claude Opus 5.5
// 用法：python3 -m http.server 8765 → node test/probes/probe-style.mjs
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };

const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await (await browser.newContext({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 1 })).newPage();
const errs = [];
page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error" && !/Not signed in|CloudNetworkError|Failed to fetch|net::ERR|msal|favicon/i.test(m.text())) errs.push(m.text().slice(0, 300)); });
await page.goto(url, { waitUntil: "load" });
await page.waitForFunction(() => globalThis.__catsup?.editor);
await page.waitForTimeout(300);

const r = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, r3 = e.renderer3, at = e.activePool();
  const P = (x, y, z) => ({ x, y, z });
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0, 0), P(1, 0, 0)], [P(1, 0, 0), P(1, 1, 0)], [P(1, 1, 0), P(0, 1, 0)], [P(0, 1, 0), P(0, 0, 0)]] });
  e.commitOp({ op: "pushpull", at, face: [P(0, 0, 0), P(1, 0, 0), P(1, 1, 0), P(0, 1, 0)], dist: 1 });
  const order = () => r3.lastPlan.order.join(",");
  const out = {};
  e.draw(); out.white = order(); out.whitePreset = r3.getPreset();
  const thumbWhite = e.captureRgba(32, 32);
  r3.setPreset("pixelOutline"); e.draw(); out.styled = order(); out.styledDraws = r3.lastMeasurement.drawCalls; out.styledPreset = r3.getPreset();
  // 缩略图：风格开着也画白模 = 和白模时截的逐字节一样
  const px = e.captureRgba(32, 32);
  out.thumbSame = px.length === thumbWhite.length && px.every((v, i) => v === thumbWhite[i]); out.afterThumb = (e.draw(), order());
  // XR 会话里：规划器只排白模（风格的小图 / 放大还没接两只眼）
  const xr = r3.renderer.xr, was = xr.isPresenting; xr.isPresenting = true;
  out.xrPasses = r3.passes().map((p) => p.id).join(",");
  xr.isPresenting = was;
  r3.setPreset("white"); e.draw(); out.back = order();
  return out;
});
check(r.white === "scene,grid,overlay" && r.whitePreset === "white", `默认 = 白模那一条：${r.white}`);
check(r.styled === "scene,pixelOutline,upscale,grid,overlay" && r.styledPreset === "pixelOutline", `像素描边 = 场景 → 描边 → 放大 → 网格 / 叠加层：${r.styled}`);
check(r.styledDraws >= 3, `风格那条路的 draw call 把几遍都算上了：${r.styledDraws}`);
check(r.thumbSame, "缩略图画白模：风格开着截的 = 白模时截的，逐字节一样");
check(r.afterThumb.includes("upscale"), `截完缩略图主视图还是风格：${r.afterThumb}`);
check(!r.xrPasses.includes("upscale") && r.xrPasses.startsWith("scene,grid"), `XR 会话里只排白模：${r.xrPasses}`);
check(r.back === "scene,grid,overlay", `切回白模 = 原来那一条：${r.back}`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-style：${fails.length} 条没过` : "✓ probe-style");
process.exit(fails.length ? 1 : 0);

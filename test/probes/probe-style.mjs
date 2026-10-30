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
  // CRT Tron：地面（地格）→ 模型 → 辉光那遍 → 辉光 → 合成 → CRT 放大；风格那条路的显存把辉光图算上
  r3.setPreset("tron"); e.draw(); out.tron = order(); out.tronVram = r3.lastMeasurement.vramMb;
  // 铸铜：环境图只烘一次（太阳不变不重烘）
  r3.setPreset("bronze"); e.draw(); e.draw(); out.bronze = order(); out.envBakes = r3.perf.count.envBake ?? 0;
  // 剪纸：遮蔽第一次立刻烘；改了模型马上画 = 不烘（影子停在上一份）
  const bakeBase = r3.perf.count.aoBake ?? 0;
  r3.setPreset("papercut"); e.draw(); out.paper = order(); out.bake1 = (r3.perf.count.aoBake ?? 0) - bakeBase;
  e.commitOp({ op: "addEdges", at, segs: [[P(2, 0, 0), P(3, 0, 0)], [P(3, 0, 0), P(3, 1, 0)], [P(3, 1, 0), P(2, 1, 0)], [P(2, 1, 0), P(2, 0, 0)]] }); e.draw();
  out.bake2 = (r3.perf.count.aoBake ?? 0) - bakeBase;
  out.bakeBase = bakeBase;
  return out;
});
// 停手 0.25 秒后：后端自己要一帧（onRedrawWanted → editor.draw）、重烘
await page.waitForTimeout(450);
const later = await page.evaluate((base) => { const r3 = globalThis.__catsup.editor.renderer3, n = (r3.perf.count.aoBake ?? 0) - base; r3.setPreset("white"); globalThis.__catsup.editor.draw(); return { bake3: n, back: r3.lastPlan.order.join(",") }; }, r.bakeBase);
r.back = later.back;
check(r.white === "scene,grid,overlay" && r.whitePreset === "white", `默认 = 白模那一条：${r.white}`);
check(r.styled === "scene,grid,pixelOutline,upscale,overlay" && r.styledPreset === "pixelOutline", `像素描边 = 场景 → 描边 → 放大 → 网格 / 叠加层：${r.styled}`);
check(r.styledDraws >= 3, `风格那条路的 draw call 把几遍都算上了：${r.styledDraws}`);
check(r.thumbSame, "缩略图画白模：风格开着截的 = 白模时截的，逐字节一样");
check(r.afterThumb.includes("upscale"), `截完缩略图主视图还是风格：${r.afterThumb}`);
check(!r.xrPasses.includes("upscale") && r.xrPasses.startsWith("scene,grid"), `XR 会话里只排白模：${r.xrPasses}`);
check(["ground", "scene", "glow", "bloom", "composite", "upscale", "grid", "overlay"].every((x) => r.tron.split(",").includes(x)) && r.tron.indexOf("composite") < r.tron.indexOf("upscale") && r.tron.indexOf("bloom") < r.tron.indexOf("composite"), `CRT Tron = 地面 / 模型 / 辉光那遍 → 辉光 → 合成 → 放大：${r.tron}`);
check(r.tronVram > 0, `Tron 的显存估算有数：${r.tronVram?.toFixed?.(2)} MB`);
check(["aoBake", "envBake", "ground", "scene"].every((x) => r.bronze.split(",").includes(x)), `铸铜 = 遮蔽 / 环境 → 地面 → 模型：${r.bronze}`);
check(r.envBakes === 1, `铸铜的环境图画两帧只烘一次：${r.envBakes} 次`);
check(r.paper === "aoBake,ground,scene,grid,overlay", `剪纸 = 遮蔽 → 地面 → 模型追加 → 网格 / 叠加层：${r.paper}`);
check(r.bake1 === 1, `剪纸第一次就烘遮蔽：${r.bake1} 次`);
check(r.bake2 === 1, `改了模型马上画不重烘（拖着改的时候不烘）：${r.bake2} 次`);
check(later.bake3 === 2, `停手 0.25 秒后自己要一帧、重烘了：${later.bake3} 次`);
check(r.back === "scene,grid,overlay", `切回白模 = 原来那一条：${r.back}`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-style：${fails.length} 条没过` : "✓ probe-style");
process.exit(fails.length ? 1 : 0);

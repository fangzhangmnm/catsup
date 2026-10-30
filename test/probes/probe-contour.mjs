// test/probes/probe-contour.mjs —— 软边只在转成外轮廓时画（I12；pool-mesh buildEdgeRec contour + profile-line-shader 旗 ≥ 10）。无头。created 2026-10-30 by Claude Opus 5.5
// user 10-30「软边没有变成外轮廓」→ 拍「光滑那片沿软边画折线、不画交线、Opus 直接做」。粗线（线宽 > 1）那条路；细线（电脑 1 像素）还没做（账本 I12）。
// 24 段圆柱、侧面全软：中间高度那一行，左右两头是深色的轮廓线、中间没有深色的线；X 光开着软边也不全冒出来。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 700, height: 520 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(800);
const fails = []; const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const info = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), N = 24, segs = [], ring = [];
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2; segs.push([P(Math.cos(a), Math.sin(a)), P(Math.cos(b), Math.sin(b))]); ring.push(P(Math.cos(a), Math.sin(a))); }
  e.setLineWeight(2);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs });
  e.commitOp({ op: "pushpull", at: e.activePool(), face: ring, dist: 2 });
  e.selectAll(); e.softenByAngle(35); e.cancel();
  const k = e.kernel, c = document.querySelector("canvas").getBoundingClientRect();
  return { soft: k.edges().filter((x) => k.isSoft(x.id)).length, w: c.width, h: c.height };
});
/** 截图 → 中间那一段高度的一行：深色像素（亮度 < 90）的 x。 */
const darkRow = async (yFrac) => {
  await page.waitForTimeout(250);
  const b64 = (await page.locator("canvas").first().screenshot()).toString("base64");
  return page.evaluate(async ([b64, yFrac]) => {
    const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode();
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0);
    const y = Math.round(img.height * yFrac), d = g.getImageData(0, y, img.width, 1).data, xs = [];
    for (let x = Math.round(img.width * 0.3); x < img.width * 0.7; x++) { const l = 0.3 * d[x * 4] + 0.59 * d[x * 4 + 1] + 0.11 * d[x * 4 + 2]; if (l < 90) xs.push(x); }
    return { xs, w: img.width };
  }, [b64, yFrac]);
};
const r = await darkRow(0.42);
const left = r.xs.filter((x) => x < r.w * 0.45), right = r.xs.filter((x) => x > r.w * 0.55), middle = r.xs.filter((x) => x > r.w * 0.45 && x < r.w * 0.55);
check(info.soft === 24, `侧面 24 条边都是软边：${info.soft}`);
check(left.length > 0 && right.length > 0, `中间高度那一行：左右两头有深色轮廓线（左 ${left.length} 格、右 ${right.length} 格）`);
check(middle.length === 0, `侧面中间没有深色的线（软边不在外轮廓上 = 不画）：${middle.length} 格`);
await page.evaluate(() => globalThis.__catsup.editor.setXray(true));
const rx = await darkRow(0.42);
const midX = rx.xs.filter((x) => x > rx.w * 0.45 && x < rx.w * 0.55);
check(midX.length === 0, `X 光开着：侧面中间也没有冒出软边（${midX.length} 格）`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-contour：${fails.length} 条没过` : "✓ probe-contour");
process.exit(fails.length ? 1 : 0);

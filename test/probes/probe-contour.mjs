// test/probes/probe-contour.mjs —— 软边只在转成外轮廓时画（I12；pool-mesh buildEdgeRec contour + profile-line-shader 旗 ≥ 10）。无头。created 2026-10-30 by Claude Opus 5.5
// user 10-30「软边没有变成外轮廓」→ 拍「光滑那片沿软边画折线、不画交线、Opus 直接做」。粗线（线宽 > 1，v0.18.7）+ 1 像素原生线（contour-line-material.ts，v0.18.8）两条路都测。
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
// 1 像素那条路（电脑默认线宽）：同样两头有、中间没有、X 光也干净
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setXray(false); e.setLineWeight(1); });
const r1 = await darkRow(0.42);
const l1 = r1.xs.filter((x) => x < r1.w * 0.45), g1 = r1.xs.filter((x) => x > r1.w * 0.55), m1 = r1.xs.filter((x) => x > r1.w * 0.45 && x < r1.w * 0.55);
check(l1.length > 0 && g1.length > 0 && m1.length === 0, `1 像素线：两头有轮廓（左 ${l1.length} 右 ${g1.length}）、侧面中间没线（${m1.length}）`);
await page.evaluate(() => globalThis.__catsup.editor.setXray(true));
const r1x = await darkRow(0.42);
check(r1x.xs.filter((x) => x > r1x.w * 0.45 && x < r1x.w * 0.55).length === 0, "1 像素线 + X 光：侧面中间也没冒出软边");
// 圆锥放在地面上、从上往下斜着看（user 10-30 截图：1-bit 圆锥侧边和底弧接不上 = 「还是有一点点断边」）：线稿 + 像素 ×3 屏（只有线、没有描边那遍兜底）和 1-bit 两种，
// 圆锥那一圈外轮廓在画布上连成一整圈（8 邻接一个连通块，从尖顶连到底弧最低点）。根因 + 修法 = contour-line-material.ts 头（线沿视线往镜头挪，按贴着的面的坡度）。
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, r3 = e.renderer3, P = (x, y, z = 0) => ({ x, y, z }), N = 24, segs = [], apex = P(0, 0, 2.2);
  e.setXray(false); e.setLineWeight(1); e.commitOp({ op: "clear" }); e.setGrid({ shown: false });
  const at = e.activePool();
  e.commitOp({ op: "addEdges", at, segs: [[P(-40, -40), P(40, -40)], [P(40, -40), P(40, 40)], [P(40, 40), P(-40, 40)], [P(-40, 40), P(-40, -40)]] });   // 地面（边在画面外）：底圈和它共面（底圈缺格那一半）
  for (let i = 0; i < N; i++) { const a = (i / N) * Math.PI * 2, b = ((i + 1) / N) * Math.PI * 2; segs.push([P(Math.cos(a), Math.sin(a)), P(Math.cos(b), Math.sin(b))], [apex, P(Math.cos(a), Math.sin(a))]); }
  e.commitOp({ op: "addEdges", at, segs });
  e.selectAll(); e.softenByAngle(35); e.cancel(); e.deselectAll();
  e.cam.setView("front"); e.cam.orbit(0, 120); e.cam.target = P(0, 0, 1); e.cam.halfH = 2.2;   // 地面的边在画面外，最低的墨线 = 底弧
});
/** 像素小图（描边那遍之前，只有面和线）里的墨线（线材质在这一遍透明通道写 0 = 墨线记号）：从尖顶那一格出发的 8 邻接连通块往下能走多远，对比墨线最低的一行。
 *  圆锥一圈断开 = 连通块停在侧边上、到不了底弧最低点。读小图 = 不让描边那遍替线兜底（1-bit / 像素描边会把断口描上，看不出线本身断没断）。 */
const coneReach = () => page.evaluate(() => {
  const e = globalThis.__catsup.editor, r3 = e.renderer3; e.draw();
  const t = r3.pixelScreen.low, W = t.width, H = t.height, a = new Uint8Array(W * H * 4); r3.renderer.readRenderTargetPixels(t, 0, 0, W, H, a);
  const ink = (x, y) => a[((H - 1 - y) * W + x) * 4 + 3] < 64;   // 读回来是自下而上
  let top = null; for (let y = 0; y < H && !top; y++) for (let x = 0; x < W; x++) if (ink(x, y)) { top = [x, y]; break; }
  let bottom = 0; for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (ink(x, y)) bottom = y;
  if (!top) return { reach: -1, bottom };
  const seen = new Set([top[1] * W + top[0]]), st = [top]; let reach = top[1];
  while (st.length) { const [x, y] = st.pop(); if (y > reach) reach = y; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const nx = x + dx, ny = y + dy, k = ny * W + nx; if (nx >= 0 && nx < W && ny >= 0 && ny < H && !seen.has(k) && ink(nx, ny)) { seen.add(k); st.push([nx, ny]); } } }
  return { reach, bottom, top: top[1] };
});
for (const [style, label] of [["white", "线稿 + 像素 ×3"], ["onebit", "1-bit 线稿"]]) {
  await page.evaluate((style) => { const r3 = globalThis.__catsup.editor.renderer3; r3.setPreset(style); r3.setScreen("pixel3"); }, style);
  await page.waitForTimeout(200);
  const r = await coneReach();
  check(r.reach >= 0 && r.reach >= r.bottom - 1, `${label}：小图里圆锥那一圈墨线从尖顶（第 ${r.top} 行）连到底弧最低点（连通到第 ${r.reach} 行，最低第 ${r.bottom} 行）`);
}
await page.evaluate(() => { const r3 = globalThis.__catsup.editor.renderer3; r3.setPreset("white"); r3.setScreen(null); });
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-contour：${fails.length} 条没过` : "✓ probe-contour");
process.exit(fails.length ? 1 : 0);

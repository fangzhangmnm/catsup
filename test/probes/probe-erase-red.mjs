// 橡皮擦悬停的红边 / 选中的蓝边要画在黑边上面（user 2026-10-25「bug：橡皮擦的红线不见了。也许是zorder」）。
// 根因：覆盖层（选中 / 刮擦 / 悬停）和底下的边同一个材质、同一个深度偏移 = 深度相等，谁后画谁赢，先后没人管。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const res = {};
for (const lw of ["1.5", "1"]) {   // 粗线稿（iPad 默认）和原生细线两种都核
  const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
  await page.addInitScript((w) => { try { localStorage.setItem("catsup.kv.ui.lineWeight", w); } catch {} }, lw);
  await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
  await page.evaluate((w) => globalThis.__catsup.editor.renderer3.setLineWeight(Number(w)), lw);
  const box = await page.locator("#board").boundingBox();
  const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
  const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(100); };
  await page.evaluate(() => globalThis.__catsup.hud.pick("rect"));
  await clickAt({ x: 0, y: 0, z: 0 }); await clickAt({ x: 2, y: 1.5, z: 0 });
  await page.evaluate(() => globalThis.__catsup.hud.pick("erase"));
  const mid = await px({ x: 1, y: 0, z: 0 });
  await page.mouse.move(box.x + mid.x, box.y + mid.y, { steps: 4 }); await page.waitForTimeout(200);
  const hover = await page.evaluate(() => globalThis.__catsup.editor.hoverEdge ?? null);
  const shot = await page.screenshot({ clip: { x: box.x + mid.x - 30, y: box.y + mid.y - 6, width: 60, height: 12 } });
  // 数「将删」色像素（edgeHot：2026-10-29 选中统一红之后改橙 #f08a00；键名 red 是历史）
  const n = await page.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let red = 0, dark = 0; for (let i = 0; i < d.length; i += 4) { if (d[i] > 180 && d[i + 1] > 100 && d[i + 1] < 170 && d[i + 2] < 80) red++; if (d[i] < 90 && d[i + 1] < 90 && d[i + 2] < 90) dark++; } return { red, dark }; }, shot.toString("base64"));
  // 选中的边（edgeSelected：2026-10-29 起红 #d8323a；键名 blue 是历史）：选择工具点这条边
  await page.mouse.move(box.x + mid.x, box.y + mid.y - 40); await page.evaluate(() => globalThis.__catsup.hud.pick("select")); await page.waitForTimeout(60);
  await page.mouse.move(box.x + mid.x, box.y + mid.y, { steps: 3 }); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150);
  await page.mouse.move(box.x + mid.x, box.y + mid.y - 60, { steps: 3 }); await page.waitForTimeout(150);   // 挪开：不让悬停的红盖住
  const shot2 = await page.screenshot({ clip: { x: box.x + mid.x - 30, y: box.y + mid.y - 6, width: 60, height: 12 } });
  const blue = await page.evaluate(async (b64) => { const img = new Image(); img.src = "data:image/png;base64," + b64; await img.decode(); const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"); g.drawImage(img, 0, 0); const d = g.getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] > 150 && d[i + 1] < 110 && d[i + 2] < 110) n++; return n; }, shot2.toString("base64"));
  res[`lw${lw}`] = { hover, ...n, blue };
  await page.close();
}
console.log(JSON.stringify(res));
const ok = Object.values(res).every((r) => r.hover !== null && r.red >= 20 && r.red > r.dark && r.blue >= 20);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

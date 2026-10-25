// 边线压过三色轴 / 栅格（user 2026-10-24「边线应该优先于axis和grid，而不是被axes挡住」）。created 2026-10-24 by Claude Opus 5.5
// 面内分割线压在 X / Y 轴上，沿线取点看最暗像素是否带轴色；轴上无边处当对照。细线 1 px / 粗线 1.5 px 各一次；轴强制最后画。
// 用法：node probe-edge-over-axes.mjs [url] → 打印 JSON（像素颜色由本脚本自己解 PNG）
import { createRequire } from "node:module";
import { inflateSync } from "node:zlib";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
/** 最小 PNG 解码（8 bit RGB/RGBA，非隔行）→ 取 (x, y) 的 RGB。 */
function pngPixel(buf, x, y) {
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; } else if (type === "IDAT") idat.push(data); else if (type === "IEND") break; off += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let r = 0; r < h; r++) { const f = raw[r * (stride + 1)], src = raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? out[r * stride + i - bpp] : 0, up = r ? out[(r - 1) * stride + i] : 0, ul = r && i >= bpp ? out[(r - 1) * stride + i - bpp] : 0;
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? up : f === 3 ? (a + up) >> 1 : (() => { const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul); return pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; })();
      out[r * stride + i] = (src[i] + pr) & 255; } }
  const k = y * stride + x * bpp; return [out[k], out[k + 1], out[k + 2]];
}
const res = {};
// 方块 (-1..2) × (-1..1) 被 y=0 / x=0 两条线切成四块：压在 X / Y 轴上的是**面内分割线**（两侧共面 = 不是轮廓线，细线模式下走原生线）。
// 再把三色轴强制排到最后画（renderOrder）——bug 取决于绘制顺序，探针不能靠运气。
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
  e.commitOp({ op: "addEdges", segs: [[P(-1, -1), P(2, -1)], [P(2, -1), P(2, 1)], [P(2, 1), P(-1, 1)], [P(-1, 1), P(-1, -1)], [P(-1, 0), P(2, 0)], [P(0, -1), P(0, 1)]] });
  e.r3.axesObj.renderOrder = 5; });
for (const lw of [1, 1.5]) {
  await page.evaluate((lw) => { const e = globalThis.__catsup.editor; e.setLineWeight(lw); e.select?.([]); }, lw);
  await page.mouse.move(box.x + 5, box.y + 5); await page.waitForTimeout(400);
  // 沿两条压轴的边各取 9 点：底边 y=0 压 X 轴（红）、左边 x=0 压 Y 轴（绿）；对照点 = 轴上没有边的地方
  const pts = await page.evaluate(() => { const e = globalThis.__catsup.editor, vp = e.vp(), out = { ex: [], ey: [], ax: e.cam.angularPx({ x: -2, y: 0, z: 0 }, vp), ay: e.cam.angularPx({ x: 0, y: -2, z: 0 }, vp) };
    for (let i = 1; i <= 9; i++) { out.ex.push(e.cam.angularPx({ x: 0.2 + 1.6 * i / 10, y: 0, z: 0 }, vp)); out.ey.push(e.cam.angularPx({ x: 0, y: 0.1 + 0.8 * i / 10, z: 0 }, vp)); } return out; });
  const shot = await page.screenshot();
  const at = (p) => pngPixel(shot, Math.round(box.x + p.x), Math.round(box.y + p.y));
  const win = (p) => { const out = []; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) out.push(at({ x: p.x + dx, y: p.y + dy })); return out; };
  const darkest = (p) => win(p).sort((a, b) => a[0] + a[1] + a[2] - (b[0] + b[1] + b[2]))[0];
  const redness = (c) => c[0] - (c[1] + c[2]) / 2, greenness = (c) => c[1] - (c[0] + c[2]) / 2;
  // 边被轴盖住 = 那一点最暗的像素也带着轴色（边是近黑；轴色像素比边亮得多）
  // 「盖住」= 线正中那个像素是轴色（轴比边窄时，轴画在上面只会染中心，边缘还是边色——看最暗像素会漏判）
  const centerX = pts.ex.map(at), centerY = pts.ey.map(at);
  const coveredX = centerX.filter((c) => redness(c) > 30).length;
  const coveredY = centerY.filter((c) => greenness(c) > 20).length;
  const axisRed = redness(win(pts.ax).sort((a, b) => redness(b) - redness(a))[0]), axisGreen = greenness(win(pts.ay).sort((a, b) => greenness(b) - greenness(a))[0]);
  res[`lw${lw}`] = { coveredX, coveredY, axisRed, axisGreen, sampleX: centerX.slice(0, 4), sampleY: centerY.slice(0, 4) };
}
console.log(JSON.stringify(res));
// 判据：对照处确实有轴色；沿边 9 + 9 个点没有一个被轴色盖住
const ok = Object.values(res).every((r) => r.axisRed > 60 && r.axisGreen > 30 && r.coveredX === 0 && r.coveredY === 0);
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

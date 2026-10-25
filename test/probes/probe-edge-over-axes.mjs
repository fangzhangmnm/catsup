// 边线压过三色轴（user 2026-10-24「边线应该优先于axis和grid，而不是被axes挡住」，10-25「画面」）。created 2026-10-24 by Claude Opus 5.5，10-25 重写判据
// 2× 像素比（iPad）下，一条悬空线压在 X 轴上：
//   粗线 1.5 px：边上下 1 px 内不许有亮红（轴不许从边两侧露出来 / 盖住边）；
//   细线 1 px：每个采样点 3×3 里最暗的像素必须是深色（边看得见，不被轴盖掉）。
// 根因（10-25 实测）：① 轴是三根 100 m 长的粗线，LineMaterial 按两端点在屏幕上插值深度，一端被近平面截断后误差大到多边形偏移救不回来 → 切 2 m 短段；
// ② 轴在 2× 屏上 2.4 px 比 1.5 px 的边宽 → 轴不比边粗；③ 深度阶梯：栅格 / 轴在面后、边前（render3 DEPTH）。
import { createRequire } from "node:module";
import { inflateSync } from "node:zlib";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
function decode(buf) {
  let off = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (off < buf.length) { const len = buf.readUInt32BE(off), type = buf.toString("ascii", off + 4, off + 8), data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") { w = data.readUInt32BE(0); h = data.readUInt32BE(4); ct = data[9]; } else if (type === "IDAT") idat.push(data); else if (type === "IEND") break; off += 12 + len; }
  const bpp = ct === 6 ? 4 : 3, raw = inflateSync(Buffer.concat(idat)), stride = w * bpp, out = Buffer.alloc(h * stride);
  for (let r = 0; r < h; r++) { const f = raw[r * (stride + 1)], src = raw.subarray(r * (stride + 1) + 1, (r + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) { const a = i >= bpp ? out[r * stride + i - bpp] : 0, up = r ? out[(r - 1) * stride + i] : 0, ul = r && i >= bpp ? out[(r - 1) * stride + i - bpp] : 0;
      const pr = f === 0 ? 0 : f === 1 ? a : f === 2 ? up : f === 3 ? (a + up) >> 1 : (() => { const p = a + up - ul, pa = Math.abs(p - a), pb = Math.abs(p - up), pc = Math.abs(p - ul); return pa <= pb && pa <= pc ? a : pb <= pc ? up : ul; })();
      out[r * stride + i] = (src[i] + pr) & 255; } }
  return (x, y) => { const k = y * stride + x * bpp; return [out[k], out[k + 1], out[k + 2]]; };
}
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [], res = {};
for (const lw of [1, 1.5]) {
  const page = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
  const box = await page.locator("#board").boundingBox();
  const pts = await page.evaluate((lw) => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
    e.commitOp({ op: "addEdges", segs: [[P(0.3, 0), P(2.5, 0)]] }); e.setLineWeight(lw); e.draw();
    const out = []; for (let i = 1; i <= 9; i++) out.push(e.cam.angularPx(P(0.3 + 2.2 * i / 10, 0), e.vp())); return out; }, lw);
  await page.mouse.move(box.x + 3, box.y + 3); await page.waitForTimeout(350);
  const px = decode(await page.screenshot());
  const red = (c) => c[0] - (c[1] + c[2]) / 2, sum = (c) => c[0] + c[1] + c[2];
  let brightRed = 0, hidden = 0;
  for (const p of pts) {
    const cx = Math.floor((box.x + p.x) * 2), cy = Math.floor((box.y + p.y) * 2);
    const win = []; for (let dy = -2; dy <= 2; dy++) for (let dx = -1; dx <= 1; dx++) win.push(px(cx + dx, cy + dy));
    if (win.some((c) => red(c) > 90)) brightRed++;
    if (Math.min(...win.map(sum)) > 250) hidden++;
  }
  res[`lw${lw}`] = { brightRed, hidden };
  await page.close();
}
console.log(JSON.stringify(res));
const ok = res.lw1.hidden === 0 && res["lw1.5"].brightRed === 0 && res["lw1.5"].hidden === 0;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

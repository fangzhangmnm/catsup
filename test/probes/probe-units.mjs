// 单位深模块（user「dnd单位的时候你tooltip还是SI」）：切到英尺英寸后，推拉提示 / 选区读数念英制；单位存进文档、重开读回。created 2026-10-24 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
  e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(1.524, 0)], [P(1.524, 0), P(1.524, 1.524)], [P(1.524, 1.524), P(0, 1.524)], [P(0, 1.524), P(0, 0)]] });
  globalThis.__catsup.hud.pick("select"); e.selectAll();
  const readM = e.readoutText();
  e.vcbUnit = "ft";
  const readFt = e.readoutText();
  return { readM, readFt };
});
// 工具读数（走 fmtLen）：画线工具从 (3,0) 点一下，移到 (3 + 5 ft, 0) → 拖动中的读数念英制、不念米
const box = await page.locator("#board").boundingBox();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.selectAll(); globalThis.__catsup.hud.pick("line"); });
const [p0, p1] = await page.evaluate(() => { const e = globalThis.__catsup.editor, vp = e.vp(); return [e.cam.angularPx({ x: 3, y: 0, z: 0 }, vp), e.cam.angularPx({ x: 3 + 1.524, y: 0, z: 0 }, vp)]; });
await page.mouse.move(box.x + p0.x, box.y + p0.y); await page.waitForTimeout(60); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + p0.x + (p1.x - p0.x) * i / 8, box.y + p0.y + (p1.y - p0.y) * i / 8); await page.waitForTimeout(30); }
await page.waitForTimeout(150);
res.lineReadout = await page.evaluate(() => globalThis.__catsup.editor.readoutText());

console.log(JSON.stringify(res));
const ok = /m²/.test(res.readM) && /ft²/.test(res.readFt) && /^长 ~?\d+' /.test(res.lineReadout) && !/ m$| cm$/.test(res.lineReadout);
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

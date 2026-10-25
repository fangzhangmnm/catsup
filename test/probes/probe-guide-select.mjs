// A31 参考几何可选可删（user 2026-10-24「参考线如果能被擦应该也能被选」）：选择工具单击参考线 = 选中、Shift 追加参考点、Delete 一起删、框选收参考点。created 2026-10-24 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(400); };
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, g = e.worldGeom().guides(); return { lines: g.lines.length, points: g.points.length, sel: [...e.selection.guides].sort(), has: e.hasSelection() }; });
await page.evaluate(() => { const e = globalThis.__catsup.editor; const at = e.activePool();
  e.commitOp({ op: "addGuide", at, line: { p: { x: 0, y: 1, z: 0 }, dir: { x: 1, y: 0, z: 0 } } });
  e.commitOp({ op: "addGuide", at, point: { x: 2, y: -1, z: 0 } });
  globalThis.__catsup.hud.pick("select"); });
const res = { start: await st() };
await clickAt({ x: 0.7, y: 1, z: 0 }); res.afterLine = await st();
await page.keyboard.down("Shift"); await clickAt({ x: 2, y: -1, z: 0 }); await page.keyboard.up("Shift"); res.afterShift = await st();
await page.keyboard.press("Delete"); await page.waitForTimeout(150); res.afterDelete = await st();
await page.keyboard.press("Control+z"); await page.waitForTimeout(150); res.afterUndo = await st();
// 框选：围着参考点的屏幕位置拉一个 80 px 的框（只框住参考点；参考线在别处）
const gp = await px({ x: 2, y: -1, z: 0 }), a = { x: gp.x - 40, y: gp.y - 40 }, c = { x: gp.x + 40, y: gp.y + 40 };
await page.mouse.move(box.x + a.x, box.y + a.y); await page.mouse.down(); await page.mouse.move(box.x + c.x, box.y + c.y, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(200);
res.afterBox = await st();
console.log(JSON.stringify(res));
const ok = res.start.lines === 1 && res.start.points === 1 && res.afterLine.sel.length === 1 && res.afterShift.sel.length === 2 && res.afterDelete.lines === 0 && res.afterDelete.points === 0 && !res.afterDelete.has
  && res.afterUndo.lines + res.afterUndo.points >= 1 && res.afterBox.sel.length === 1;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

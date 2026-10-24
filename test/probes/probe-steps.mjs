// 统一手势语法（提案 §7 / A29，v0.13.6）：steps 工具 点一下 → 移动 → 点一下 = 落定；按住拖 → 松手 = 落定。卷尺（平行参考线）与偏移各验两种。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const S = (p) => page.evaluate((q) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(q, e.vp()); }, p);
const at = async (p) => { const s = await S(p); return { x: box.x + s.x, y: box.y + s.y }; };
const clickAt = async (p) => { const q = await at(p); await page.mouse.move(q.x, q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60); };
const hoverTo = async (p) => { const q = await at(p); await page.mouse.move(q.x, q.y, { steps: 5 }); await page.waitForTimeout(150); };
const dragTo = async (p0, p1) => { const a = await at(p0), c = await at(p1); await page.mouse.move(a.x, a.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.move(c.x, c.y, { steps: 8 }); await page.waitForTimeout(200); await page.mouse.up(); await page.waitForTimeout(80); };
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor; const g = e.worldGeom().guides(); return { faces: e.kernel.faces().length, guides: g.lines.length + g.points.length, active: e.isGestureActive(), tool: e.tool }; });
await page.evaluate(() => { const e = globalThis.__catsup.editor; const P = (x, y) => ({ x, y, z: 0 }); e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(2, 0)], [P(2, 0), P(2, 1.5)], [P(2, 1.5), P(0, 1.5)], [P(0, 1.5), P(0, 0)]] }); });
const out = { start: await st() };
// 卷尺：点一下（边上）→ 移开 → 点一下 = 平行参考线
await page.evaluate(() => globalThis.__catsup.editor.setTool("tape"));
await clickAt({ x: 0.6, y: 0, z: 0 }); out.tapeArmed = await st();
await hoverTo({ x: 0.6, y: 0.5, z: 0 });
await clickAt({ x: 0.6, y: 0.5, z: 0 }); out.tapeClick = await st();
// 卷尺：按住拖 → 松手 = 落定
await dragTo({ x: 1.4, y: 0, z: 0 }, { x: 1.4, y: 0.7, z: 0 }); out.tapeDrag = await st();
// 偏移：点一下（面里靠左边）→ 移动 → 点一下
await page.evaluate(() => globalThis.__catsup.editor.setTool("offset"));
await clickAt({ x: 0.15, y: 0.75, z: 0 }); out.offArmed = await st();
await hoverTo({ x: 0.45, y: 0.75, z: 0 });
await clickAt({ x: 0.45, y: 0.75, z: 0 }); out.offClick = await st();
await page.evaluate(() => globalThis.__catsup.editor.undo());
// 偏移：按住拖 → 松手
await dragTo({ x: 0.15, y: 0.75, z: 0 }, { x: 0.45, y: 0.75, z: 0 }); out.offDrag = await st();
console.log(JSON.stringify(out));
const ok = out.start.faces === 1 && out.tapeArmed.active && out.tapeClick.guides === 1 && !out.tapeClick.active && out.tapeDrag.guides === 2 && out.offArmed.active && out.offClick.faces === 2 && !out.offClick.active && out.offDrag.faces === 2 && !out.offDrag.active;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

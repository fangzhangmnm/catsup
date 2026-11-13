// 替换档单击点中已经选着的 = 选区不变（user 11-13「单选选中选区的时候也应该是non op除非是不同的boolean模式」；统筹 11-13 第 A 件）。created 2026-11-13 by Claude Opus 5.5
// 硬表面根上两块方面 A、B（鼠标、选择工具）：
// ① 点 A、Shift 点 B = 两张 ② 替换档点 A = 还是两张（以前缩成 A 一张）③ Ctrl 点 A = 减掉 A（剩 B）④ 多选档点 A = 切掉 A ⑤ 点空白 = 清空
// ⑥ 参考线 + 一张面选着，替换档点参考线 = 还是两样 ⑦ A 做成组件，组件 + B 选着，替换档点组件 = 还是两样；双击照旧进组件
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-select-keep.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
  e.setGrid({ ...e.grid, on: false });
  const sq = (x0, y0) => { const Q = [P(x0, y0), P(x0 + 1, y0), P(x0 + 1, y0 + 1), P(x0, y0 + 1)]; e.addSegments(Q.map((q, i) => [q, Q[(i + 1) % 4]]), "sq"); };
  sq(-2, -0.5); sq(1, -0.5);
  e.cam.setView("top"); e.cam.halfH = 3; e.cam.target = { x: 0, y: 0, z: 0 }; e.draw();
  globalThis.__catsup.hud.pick("select");
});
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p, key) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); if (key) await page.keyboard.down(key); await page.mouse.down(); await page.mouse.up(); if (key) await page.keyboard.up(key); await page.waitForTimeout(450); };
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor; return { faces: [...e.selection.faces].sort((a, b) => a - b), pools: e.selectedPools.size, guides: [...e.selectedGuides.view].length }; });
const A = { x: -1.5, y: 0, z: 0 }, B = { x: 1.5, y: 0, z: 0 }, EMPTY = { x: 0, y: 2, z: 0 };
const res = {};
await clickAt(A); res.a = await st();
await clickAt(B, "Shift"); res.ab = await st();
await clickAt(A); res.replaceA = await st();
await clickAt(A, "Control"); res.ctrlA = await st();
await clickAt(A, "Shift"); res.ab2 = await st();
await page.evaluate(() => globalThis.__catsup.editor.config.set("select", "mode", "multi"));
await clickAt(A); res.multiA = await st();
await page.evaluate(() => globalThis.__catsup.editor.config.set("select", "mode", "replace"));
await clickAt(EMPTY); res.empty = await st();
// ⑥ 参考线（y = 1.5 横着）+ 面 B
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addGuide", at: e.activePool(), line: { p: { x: 0, y: 1.5, z: 0 }, dir: { x: 1, y: 0, z: 0 } } }); });
const G = { x: 0, y: 1.5, z: 0 };
await clickAt(G); await clickAt(B, "Shift"); res.gb = await st();
await clickAt(G); res.replaceG = await st();
// ⑦ A 做成组件；组件 + B 选着，替换档点组件 = 不变；双击组件 = 进去
await clickAt(EMPTY); await clickAt(A);
await page.evaluate(() => globalThis.__catsup.editor.makeComponent("块"));
await clickAt(EMPTY); await clickAt(A); await clickAt(B, "Shift"); res.pb = await st();
await clickAt(A); res.replaceP = await st();
{ const q = await px(A); await page.mouse.move(box.x + q.x, box.y + q.y); await page.mouse.dblclick(box.x + q.x, box.y + q.y); await page.waitForTimeout(450); }
res.entered = await page.evaluate(() => globalThis.__catsup.editor.contextDepth?.() ?? (globalThis.__catsup.editor.ctx?.length ?? 0));
await b.close();
const ok = [], bad = [], chk = (n, c, d) => (c ? ok : bad).push(`${n}${c ? "" : "  ← " + JSON.stringify(d)}`);
chk("① 点 A = 一张", res.a.faces.length === 1, res.a);
chk("① Shift 点 B = 两张", res.ab.faces.length === 2, res.ab);
chk("② 替换档点 A（已选着）= 还是两张", JSON.stringify(res.replaceA) === JSON.stringify(res.ab), res.replaceA);
chk("③ Ctrl 点 A = 减掉 A、剩 B", res.ctrlA.faces.length === 1 && !res.ctrlA.faces.includes(res.a.faces[0]), res.ctrlA);
chk("④ 多选档点 A = 切掉 A", res.ab2.faces.length === 2 && res.multiA.faces.length === 1 && !res.multiA.faces.includes(res.a.faces[0]), { ab2: res.ab2, multiA: res.multiA });
chk("⑤ 点空白 = 清空", res.empty.faces.length === 0 && res.empty.pools === 0 && res.empty.guides === 0, res.empty);
chk("⑥ 参考线 + 面选着", res.gb.guides === 1 && res.gb.faces.length === 1, res.gb);
chk("⑥ 替换档点参考线 = 还是两样", JSON.stringify(res.replaceG) === JSON.stringify(res.gb), res.replaceG);
chk("⑦ 组件 + 面选着", res.pb.pools === 1 && res.pb.faces.length === 1, res.pb);
chk("⑦ 替换档点组件 = 还是两样", JSON.stringify(res.replaceP) === JSON.stringify(res.pb), res.replaceP);
chk("⑦ 双击组件照旧进去", res.entered > 0, res.entered);
chk("没有脚本错误", errs.length === 0, errs);
for (const s of ok) console.log("✓", s);
for (const s of bad) console.log("✗", s);
process.exit(bad.length ? 1 : 0);

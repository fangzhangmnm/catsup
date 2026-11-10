// v0.18.42 加 ⑤–⑨（2026-11-09 Claude Opus 5.5；计划书 20261109-audit-fixes-plan.md 工单 1）：选中的参考线被清空 / 擦掉以后不再「还选着」、Delete 不再多一步空撤销；只选着参考线时移动工具照常拿起面、右键菜单不露点了没反应的项。
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
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, g = e.worldGeom().guides(); return { lines: g.lines.length, points: g.points.length, sel: [...e.selectedGuides.view].sort(), has: e.hasAnySelection(), steps: e.history.steps() }; });   // 选中的参考几何住编辑器（v0.18.42 搬出选区类型）
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
const addLine = (y) => page.evaluate((y) => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addGuide", at: e.activePool(), line: { p: { x: 0, y, z: 0 }, dir: { x: 1, y: 0, z: 0 } } }); globalThis.__catsup.hud.pick("select"); }, y);
const del = async () => { const s0 = (await st()).steps; await page.keyboard.press("Delete"); await page.waitForTimeout(150); return (await st()).steps - s0; };
// ⑤ 选中参考线 → 「清空参考几何」→ 不再选着；再按 Delete = 撤销栈不多一步（以前多一步空的「删参考线」）
await page.keyboard.press("Escape"); await addLine(1); await clickAt({ x: 0.7, y: 1, z: 0 }); res.clearSel = await st();
await page.evaluate(() => globalThis.__catsup.editor.clearGuides()); await page.waitForTimeout(100); res.afterClear = await st(); res.clearDelSteps = await del();
// ⑥ 选中参考线 → 橡皮擦掉它 → 不再选着；Delete 同上
await addLine(1); await clickAt({ x: 0.7, y: 1, z: 0 }); res.eraseSel = await st();
await page.evaluate(() => globalThis.__catsup.hud.pick("erase")); await clickAt({ x: 0.7, y: 1, z: 0 });
await page.evaluate(() => globalThis.__catsup.hud.pick("select")); res.afterErase = await st(); res.eraseDelSteps = await del();
// ⑦ 只选着一条参考线：移动工具按在一个面上 = 和没选区时一样拿起那个面（以前按下去没反应）
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 }), Q = [P(-1.5, -1.5), P(-0.5, -1.5), P(-0.5, -0.5), P(-1.5, -0.5)]; e.addSegments(Q.map((q, i) => [q, Q[(i + 1) % 4]])); });
await addLine(1); await clickAt({ x: 0.7, y: 1, z: 0 }); res.moveSel = await st();
const xs = () => page.evaluate(() => { const W = globalThis.__catsup.editor.worldGeom(); return W.slots.flatMap((sl, i) => [...W.parts[i].verts.values()]).map((v) => v.x).filter((x) => x < 0).sort((a, b) => a - b).join(","); });
const x0 = await xs();
await page.evaluate(() => globalThis.__catsup.hud.pick("move"));
{ const a2 = await px({ x: -1, y: -1, z: 0 }); await page.mouse.move(box.x + a2.x, box.y + a2.y); await page.waitForTimeout(60); await page.mouse.down(); await page.mouse.move(box.x + a2.x + 70, box.y + a2.y + 10, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(250); }
res.move = { before: x0, after: await xs() };
// ⑧ 只选着一条参考线时右键空处：出的是选区的菜单（删除 / 取消选择），没有点了没反应的项（建组 / 建组件 / 镜像… / 剪切 / 拷贝 / 隐藏）
await page.evaluate(() => { globalThis.__catsup.editor.undo(); globalThis.__catsup.hud.pick("select"); }); await page.waitForTimeout(100);
await page.keyboard.press("Escape"); await clickAt({ x: 0.7, y: 1, z: 0 }); res.menuSel = await st();
{ const e2 = await px({ x: 3.5, y: 2.5, z: 0 }); await page.mouse.click(box.x + e2.x, box.y + e2.y, { button: "right" }); await page.waitForTimeout(250); }
res.menu = await page.evaluate(() => [...document.querySelectorAll(".popup-menu:not(.choice-layer) .menu-label")].map((n) => n.textContent?.trim()).filter(Boolean));
console.log(JSON.stringify(res));
const ok = res.start.lines === 1 && res.start.points === 1 && res.afterLine.sel.length === 1 && res.afterShift.sel.length === 2 && res.afterDelete.lines === 0 && res.afterDelete.points === 0 && !res.afterDelete.has
  && res.afterUndo.lines + res.afterUndo.points >= 1 && res.afterBox.sel.length === 1
  && res.clearSel.sel.length === 1 && !res.afterClear.has && res.afterClear.sel.length === 0 && res.clearDelSteps === 0
  && res.eraseSel.sel.length === 1 && res.afterErase.lines === 0 && !res.afterErase.has && res.eraseDelSteps === 0
  && res.moveSel.sel.length === 1 && res.move.before !== res.move.after
  && res.menuSel.sel.length === 1 && res.menu.includes("删除") && res.menu.includes("取消选择") && !["建组", "建组件", "镜像…", "剪切", "拷贝", "隐藏"].some((x) => res.menu.includes(x));
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

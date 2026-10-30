// 指令板（浮板；UX 心智模型 §8 补 4 / 账本 UX41；ui/command-board.ts + machine-window.ts；created 2026-10-28 by Claude Opus 5.5）。
// 桌面：① 点扳手开板、再点关 ② 拖标题 = 挪；关了再开 = 回到挪过的地方 ③ 长按标题 = 归位 ④ 点板上一条修复 = 跑了、板不关、数跟着变
// ⑤ 板上「应用」修复面板 → 马后炮回右下角（参数区搬回去）⑥ 没应用就关板 = 修复面板一起收（右下角不冒出来）
// 手机竖屏：⑦ 板 = 底部抽屉；开物品栏 = 板收起。跑法：python3 -m http.server 8765 后 node test/probes/probe-board.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
// 修复板的入口 = 物件窗口的「修复」页签 →「修复面板…」（v0.17.53；user 10-29「修复菜单不应该挂在视图那边，而是物品选项里面的一个tab」；以前是右边视图那一列的扳手钮）。再走一遍 = 关板
const openRepair = async (pg) => { if (!(await pg.evaluate(() => !!document.querySelector(".popup-menu .menu-item[data-menu-id^='machine:']")))) await pg.click(".gizmo-object"); await pg.waitForTimeout(80); await pg.click(".popup-menu .menu-item:has-text('修复面板')"); await pg.waitForTimeout(40); };   // 物件窗口 = 弹出菜单、不分页签（v0.17.65）
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const errs = [];
const scene = (page) => page.evaluate(() => {   // 一个挪歪 1 mm 的盒子 + 一条断口：修复面板有事可做
  const e = globalThis.__catsup.editor, at = e.activePool(), P = (x, y, z = 0) => ({ x, y, z });
  const rect = (x, y, w, h) => [[P(x, y), P(x + w, y)], [P(x + w, y), P(x + w, y + h)], [P(x + w, y + h), P(x, y + h)], [P(x, y + h), P(x, y)]];
  e.setGrid({ on: false });
  e.commitOp({ op: "addEdges", at, segs: rect(0, 0, 1, 1) });
  e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.commitOp({ op: "move", at, moves: [{ from: P(1, 1, 1), to: P(1.001, 1, 1.001) }] });
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 3), P(1, 3)], [P(1, 3), P(2, 3)]] });
  e.deselectAll(); e.cam.setView("iso"); e.zoomExtents?.(); e.draw();
});
const r = {};
{
  const page = await b.newPage({ viewport: { width: 1100, height: 800 } }); page.setDefaultTimeout(4000);
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
  await scene(page);
  const board = '.board[data-board="repairWindow"]';
  const pos = () => page.evaluate((sel) => { const el = document.querySelector(sel); if (!el) return null; const q = el.getBoundingClientRect(); return { x: Math.round(q.left), y: Math.round(q.top) }; }, board);
  await openRepair(page); await page.waitForTimeout(120);
  r.open = { pos0: await pos(), session: await page.evaluate(() => globalThis.__catsup.editor.repairPanelOpen()) };
  await openRepair(page); await page.waitForTimeout(80);
  r.toggleClosed = (await pos()) === null;
  r.closedCancels = await page.evaluate(() => !globalThis.__catsup.editor.repairPanelOpen() && !document.querySelector("#vcb > .vcb-params:not([hidden])"));   // ⑥
  // ② 拖
  await openRepair(page); await page.waitForTimeout(120);
  const p0 = await pos(), hb = await page.locator(`${board} .board-title`).boundingBox();
  await page.mouse.move(hb.x + 20, hb.y + hb.height / 2); await page.mouse.down(); await page.mouse.move(hb.x - 180, hb.y + 140, { steps: 8 }); await page.mouse.up(); await page.waitForTimeout(60);
  r.dragged = { from: p0, to: await pos() };
  await page.click(`${board} .board-close`); await page.waitForTimeout(60);
  await openRepair(page); await page.waitForTimeout(120);
  r.reopened = await pos();
  // ③ 长按归位
  const hb2 = await page.locator(`${board} .board-title`).boundingBox();
  await page.mouse.move(hb2.x + 20, hb2.y + hb2.height / 2); await page.mouse.down(); await page.waitForTimeout(800); await page.mouse.up(); await page.waitForTimeout(80);
  r.reset = await pos();
  // ④ 点一条修复（焊断口）
  r.weldBefore = await page.evaluate(() => globalThis.__catsup.editor.repairCount("brep.weld", "context"));
  await page.click(`${board} [data-cmd="action:brep.weld"]`); await page.waitForTimeout(150);
  r.afterWeld = { stillOpen: (await pos()) !== null, weld: await page.evaluate(() => globalThis.__catsup.editor.repairCount("brep.weld", "context")), weldRow: await page.evaluate((sel) => !!document.querySelector(`${sel} [data-cmd="action:brep.weld"]`), board) };
  // ⑤ 板上应用修复面板 → 马后炮回右下角
  await page.evaluate(() => { const e = globalThis.__catsup.editor; if (!e.repairPanelOpen()) e.beginRepairPanel(); globalThis.__catsup.hud && null; });
  await page.waitForTimeout(80);
  r.beforeApply = await page.evaluate((sel) => ({ inBoard: !!document.querySelector(`${sel} .board-params .vcb-params`), corner: !!document.querySelector("#vcb > .vcb-params:not([hidden])") }), board);
  await page.click(`${board} .vcb-params-buttons .strip-action.primary`); await page.waitForTimeout(150);
  r.afterApply = await page.evaluate((sel) => ({ inBoard: !!document.querySelector(`${sel} .board-params .vcb-params`), corner: !!document.querySelector("#vcb > .vcb-params:not([hidden])"), title: document.querySelector("#vcb .vcb-params-title")?.textContent ?? "" }), board);
  await page.close();
}
{ // ⑦ 手机竖屏
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }); const page = await ctx.newPage(); page.setDefaultTimeout(4000);
  page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
  await scene(page);
  await openRepair(page); await page.waitForTimeout(150);
  r.phone = await page.evaluate(() => { const el = document.querySelector(".board"); const q = el?.getBoundingClientRect(); return el ? { drawer: el.classList.contains("board-drawer"), bottom: Math.round(innerHeight - q.bottom), full: Math.round(q.width) === innerWidth } : null; });
  await ctx.close();
}
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const moved = r.dragged.to && (Math.abs(r.dragged.to.x - r.dragged.from.x) > 100 || Math.abs(r.dragged.to.y - r.dragged.from.y) > 100);
const ok = r.open.pos0 && r.open.session && r.toggleClosed && r.closedCancels && moved
  && r.reopened && r.reopened.x === r.dragged.to.x && r.reopened.y === r.dragged.to.y && r.reset && r.reset.x === r.open.pos0.x && r.reset.y === r.open.pos0.y
  && r.weldBefore > 0 && r.afterWeld.stillOpen && r.afterWeld.weld === 0
  && r.beforeApply.inBoard && !r.beforeApply.corner && !r.afterApply.inBoard && r.afterApply.corner && /修复/.test(r.afterApply.title)
  && r.phone?.drawer && r.phone.bottom === 0 && r.phone.full && errs.length === 0;   // 「开物品栏 = 收起指令板」那段随物品栏抽屉 sunset 撤了（2026-10-30）
console.log(ok ? "probe-board OK" : "probe-board FAIL");
process.exit(ok ? 0 : 1);

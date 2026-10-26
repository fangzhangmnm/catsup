// 物品栏 = 非模态底部抽屉（user 2026-10-25「物品栏不应该是模态的」「物品栏弹起来时会把小窗顶到上面，然后其他的hud也一样」）：
// 开着时抽屉上方的画布照样收指针；参数小窗 / 提示行贴在抽屉上沿之上；开着时建组件 = 清单当场多一行；关了全部落回原位。iPad mini 竖屏。SHOT=前缀 截图。
// created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const box = (x0) => { const B = [[x0, 0], [x0 + 1, 0], [x0 + 1, 1], [x0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.commitOp({ op: "addEdges", segs }); };
  box(0); e.selectAll(); e.makeComponent("盒");
  e.cam.setView("iso"); e.zoomExtents();
  e.selectAll();   // 选区在 → 底部选项条 / 参数小窗露出
});
await page.waitForTimeout(100);
const measure = () => page.evaluate(() => {
  const r = (id) => { const el = document.getElementById(id); return el && !el.hidden ? el.getBoundingClientRect() : null; };
  const vcb = r("vcb"), hint = document.getElementById("hintWrap").getBoundingClientRect(), sheet = document.querySelector("#shop .sheet");
  const top = sheet && !document.getElementById("shop").hidden ? sheet.getBoundingClientRect().top : innerHeight;
  const probeY = Math.max(10, top - 120), probeX = innerWidth / 2;
  return { drawerH: getComputedStyle(document.documentElement).getPropertyValue("--drawer-h").trim(), drawerTop: Math.round(top), vcbBottom: vcb ? Math.round(vcb.bottom) : null, hintBottom: Math.round(hint.bottom),
    canvasAbove: document.elementFromPoint(probeX, probeY)?.id ?? document.elementFromPoint(probeX, probeY)?.tagName, rows: document.querySelectorAll("#shopList .shop-row").length };
});
const closed0 = await measure();
await page.locator("#btnShop").click(); await page.waitForTimeout(150);
const open = await measure();
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-drawer.png` });
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); const B = [[3, 0], [4, 0], [4, 1], [3, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.commitOp({ op: "addEdges", segs }); e.selectAll(); e.selectedPools.clear(); e.makeComponent("盒2"); });
await page.waitForTimeout(150);
const live = await measure();
await page.locator("#shopClose").click(); await page.waitForTimeout(150);
const closed = await measure();
const res = { closed0, open, live: live.rows, closed };
console.log(JSON.stringify(res));
const ok = open.drawerH !== "0px" && open.vcbBottom !== null && open.vcbBottom <= open.drawerTop && open.hintBottom <= open.drawerTop && open.canvasAbove === "board" && open.rows === 1
  && live.rows === 2 && closed.drawerH === "0px" && closed.vcbBottom === closed0.vcbBottom && closed.hintBottom === closed0.hintBottom && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

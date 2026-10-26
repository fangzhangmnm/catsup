// 只看这个（DT44，user 2026-10-25「然后左上角的hierarchy tree可以切换只看该组件」）：进组件 → 面包屑「只看这个」→ 外面那份不画、不吸；再点放回来；退到根时按钮不出现。
// SHOT=前缀 截图。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const step = (fn) => page.evaluate(fn);
await step(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  e.selectAll(); e.makeComponent("盒"); e.copyInstance(P(2, 0, 0));
  e.cam.setView("iso"); e.zoomExtents();
  e.selectAll(); e.enterSelected();
});
await page.waitForTimeout(100);
const before = await step(() => ({ slots: globalThis.__catsup.editor.worldGeom().slots.length, btn: !!document.querySelector("#crumbs .crumb-toggle"), depth: globalThis.__catsup.editor.contextCrumbs().length }));
await page.locator("#crumbs .crumb-toggle").click(); await page.waitForTimeout(100);
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-isolate.png` });
const on = await step(() => ({ slots: globalThis.__catsup.editor.worldGeom().slots.length, pressed: document.querySelector("#crumbs .crumb-toggle")?.getAttribute("aria-pressed") }));
await page.locator("#crumbs .crumb-toggle").click(); await page.waitForTimeout(100);
const off = await step(() => globalThis.__catsup.editor.worldGeom().slots.length);
await step(() => globalThis.__catsup.editor.exitContext()); await page.waitForTimeout(100);
const root = await step(() => !!document.querySelector("#crumbs .crumb-toggle") && !document.getElementById("crumbs").hidden);
const res = { before, on, off, rootBtnVisible: root };
console.log(JSON.stringify(res));
const ok = before.depth === 2 && before.btn && before.slots === 3 && on.slots === 1 && on.pressed === "true" && off === 3 && !root && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

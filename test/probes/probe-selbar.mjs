// 右下不再堆选区动作（created 2026-10-28 by Claude Opus 5.5；user 10-28 夜截图「可选操作应该放到右键菜单里而不是全堆在马后炮，好好整理一下」）。
// 笔（iPad 竖屏）、自由建模网格体盒子：① 选一张面 → 右下选区那一截只有「删除」「更多…」② 点「更多…」= 弹出和右键同一份菜单（有「分开」「复制」，没有「删除」重复）
// ③ 菜单里点「翻转法线」= 真做了。跑法：python3 -m http.server 8765 后 node test/probes/probe-selbar.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true });
const page = await ctx.newPage(); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); globalThis.__catsup.hud.pick("select");
  return inst.def;
});
// 碰一下笔：选区路由 = 浮条
await page.evaluate(() => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); for (const t of ["pointerdown", "pointerup"]) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: q.left + 40, clientY: q.top + 1100, pointerType: "pen", pointerId: 9, isPrimary: true, buttons: t === "pointerdown" ? 1 : 0 })); });
await page.waitForTimeout(100);
const f = await page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel; e.deselectAll(); const f = m.faces()[0]; e.selection.faces.add(f); globalThis.__catsup.hud.pick("select"); return { f, ring: [...m.faceVerts(f)] }; }, def);
await page.waitForTimeout(100);
const r = {};
r.bar = await page.evaluate(() => [...document.querySelectorAll("#toolStrip .selbar-btn")].map((x) => (x.textContent.trim() || x.getAttribute("aria-label") || "")).join(" | "));
await page.click("#toolStrip .selbar-btn:has-text('更多')"); await page.waitForTimeout(120);
r.menu = await page.evaluate(() => [...document.querySelectorAll(".popup-menu:not(.choice-layer) .menu-label")].map((x) => x.textContent).join(" | "));
await page.evaluate(() => [...document.querySelectorAll(".popup-menu:not(.choice-layer) [data-menu-id]")].find((x) => /翻转法线/.test(x.textContent ?? ""))?.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await page.waitForTimeout(100);
r.flipped = await page.evaluate(([d, f, ring]) => JSON.stringify([...globalThis.__catsup.editor.scene.mesh(d).kernel.faceVerts(f)]) !== JSON.stringify(ring), [def, f.f, f.ring]);
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.bar === "删除 | 更多…" && /建组件/.test(r.menu) && /复制/.test(r.menu)   // v0.16.45：「分开」撤了，= 原地建组件 && !/^删除|\| 删除 \|/.test(r.menu) && r.flipped && errs.length === 0;
console.log(ok ? "probe-selbar OK" : "probe-selbar FAIL");
process.exit(ok ? 0 : 1);

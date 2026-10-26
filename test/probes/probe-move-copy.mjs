// DT14：移动复制有预演 + 底部条「复制」开关（平板没有 Ctrl）。user 2026-10-25「move 复制的时候没有预览，然后平板上想一下如何复制move，我觉得可以算到move的context menu里面可以开复制」。
// 选中组件 → 开「复制」→ 拖：途中视图里有副本槽、原件的槽没在手里；松手 = 两份实例、原件没动。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = async (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);

const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const N = 24, pts = [];
  for (let i = 0; i < N; i++) { const a = (2 * Math.PI * i) / N; pts.push(P(5 + Math.cos(a), 5 + Math.sin(a), 0)); }
  e.commitOp({ op: "addEdges", segs: pts.map((p, i) => [p, pts[(i + 1) % N]]), curve: { kind: "circle", closed: true, params: { center: P(5, 5, 0), radius: 1, normal: P(0, 0, 1), xaxis: P(1, 0, 0), segments: N } } });
  const fid = e.kernel.faces()[0].id;
  e.commitOp({ op: "pushpull", at: e.activePool(), face: e.kernel.faceRings3(fid).outer, dist: 0.5 });
  e.selectAll(); const made = e.makeComponent("轮子"); e.cancel();
  e.zoomExtents(); e.cam.halfH *= 3;
  globalThis.__catsup.hud.pick("select");
  return { made };
});
const cap = await px({ x: 5.3, y: 5.2, z: 0.5 });
await page.mouse.move(box.x + cap.x, box.y + cap.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150);
const picked = await page.evaluate(() => { const c = globalThis.__catsup; c.hud.pick("move"); const ok = c.editor.config.set("move", "copy", true); return c.editor.hasPoolSelection() && ok; });
// 拖：从顶帽圆心往 +x 3 m
const from = await px({ x: 5, y: 5, z: 0.5 }), to = await px({ x: 8, y: 5, z: 0.5 });
await page.mouse.move(box.x + from.x, box.y + from.y); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + from.x + (to.x - from.x) * i / 10, box.y + from.y + (to.y - from.y) * i / 10); await page.waitForTimeout(16); }
const mid = await page.evaluate(() => { const e = globalThis.__catsup.editor; const v = e.liveWorld(); return { ghosts: v.slots.filter((s) => s.ghost).length, origHand: v.slots.filter((s) => !s.ghost && !s.active).some((s) => s.overridden), hint: document.querySelector("#hint")?.textContent ?? "" }; });
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT });   // 可选：拖动途中截图（人工看副本画没画出来）
await page.mouse.up(); await page.waitForTimeout(200);
const after = await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef; const def = [...s.defs.keys()].find((id) => id !== s.root); const xs = [...s.def(s.root).instances.values()].map((i) => +i.xform[3].toFixed(3)); return { count: s.instanceCount(def), xs }; });
const res = { setup, picked, mid, after };
console.log(JSON.stringify(res));
const ok = setup.made && picked && mid.ghosts >= 1 && !mid.origHand && mid.hint.includes("复制") && after.count === 2 && after.xs.includes(5) && after.xs.includes(8) && !errs.length;   // 组件轴默认底面中心 (5,5,0)：原件 x = 5，复制往 +x 3 m = 8
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

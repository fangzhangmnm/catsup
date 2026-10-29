// 左栏 dial（app/left-dial.ts + ui/vslider.ts；created 2026-10-29 by Claude Opus 5.5；user 10-28 夜「不要使用内置的，学一下weebpaint那个」、10-29「这个条子以后也能支持opacity和color」「反正就是和weebpaint一样」）。
// iPad 竖屏尺寸、自由建模网格体盒子、移动工具、开软选择——① 卡片露、里面没有浏览器自带的 range、一格软选择半径 + 下面笔粗图标
// ② 按在滑条下端拖到上端 = 半径一路变大、每个值都在档位上（整数、不出 137）、拖的时候读数气泡露、画布上半径圈露
// ③ 在滑条外面松手（指针捕获）= 圈收掉、气泡 1.5 s 后收 ④ 键盘 ] = 上一档、气泡闪 ⑤ 换选择工具 = 卡片收。跑法：python3 -m http.server 8765 后 node test/probes/probe-left-dial.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 } });
const page = await ctx.newPage(); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  const m = s.mesh(inst.def).kernel; e.deselectAll(); e.selection.faces.add(m.faces()[0]);
  globalThis.__catsup.hud.pick("move"); e.config.set("soft", "on", true); e.config.set("soft", "radius", 10);
});
await page.waitForTimeout(150);
const r = {};
r.one = await page.evaluate(() => { const c = document.querySelector(".left-dial"); return { shown: !!c && !c.hidden, nativeRange: !!c?.querySelector("input[type=range]"), slots: c?.querySelectorAll(".left-dial-slot:not([hidden])").length ?? 0, icon: c?.querySelector(".left-dial-label use")?.getAttribute("href") ?? "" }; });
const box = await page.evaluate(() => { const q = document.querySelector(".vslider").getBoundingClientRect(); return { x: q.left + q.width / 2, top: q.top, bottom: q.bottom }; });
const radius = () => page.evaluate(() => globalThis.__catsup.editor.config.get("soft", "radius"));
// 真鼠标输入（合成事件不是真指针，浏览器不给捕获；鼠标走的是真输入，捕获是真的——笔 / 手指走同一个 API）
await page.mouse.move(box.x, box.bottom - 4); await page.mouse.down();
const seen = [];
for (let i = 1; i <= 12; i++) { await page.mouse.move(box.x + 2, box.bottom - 4 - (box.bottom - box.top) * i / 12); await page.waitForTimeout(12); seen.push(await radius()); }
r.two = { seen, rising: seen.every((v, i) => i === 0 || v >= seen[i - 1]), top: seen[seen.length - 1],
  bubble: await page.evaluate(() => { const bb = document.querySelector(".vslider-bubble"); return bb && !bb.hidden ? bb.textContent : null; }),
  ring: await page.evaluate(() => !document.getElementById("softRing")?.hidden) };
// ③ 拖到滑条外面（画布上）再松手：捕获让松手回到滑条
await page.mouse.move(box.x + 300, box.top + 40);
await page.mouse.up(); await page.waitForTimeout(60);
r.three = { ring: await page.evaluate(() => !document.getElementById("softRing")?.hidden), bubbleNow: await page.evaluate(() => !document.querySelector(".vslider-bubble").hidden), r: await radius() };
await page.waitForTimeout(1700);
r.three.bubbleLater = await page.evaluate(() => !document.querySelector(".vslider-bubble").hidden);
// ④ ]
await page.evaluate(() => globalThis.__catsup.editor.config.set("soft", "radius", 120));
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "]", code: "BracketRight", bubbles: true, cancelable: true }))); await page.waitForTimeout(60);
r.four = { r: await radius(), bubble: await page.evaluate(() => !document.querySelector(".vslider-bubble").hidden) };
// ⑤
await page.evaluate(() => globalThis.__catsup.hud.pick("select")); await page.waitForTimeout(80);
r.five = await page.evaluate(() => !!document.querySelector(".left-dial")?.hidden);
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const nice = (v) => v === Math.round(v) && (v < 20 || (v < 50 ? v % 2 === 0 : v < 100 ? v % 5 === 0 : v < 200 ? v % 10 === 0 : v < 500 ? v % 20 === 0 : v % 50 === 0));
const ok = r.one.shown && !r.one.nativeRange && r.one.slots === 1 && r.one.icon === "#brush-width"
  && r.two.rising && r.two.top === 800 && r.two.seen.every(nice) && /半径 \d+ 像素/.test(r.two.bubble ?? "") && r.two.ring
  && !r.three.ring && r.three.bubbleNow && !r.three.bubbleLater && nice(r.three.r)   /* 捕获着：拖出滑条外面值仍跟着高度走（WeebPaint 那根也一样） */
  && r.four.r > 120 && nice(r.four.r) && r.four.bubble && r.five && errs.length === 0;
console.log(ok ? "probe-left-dial OK" : "probe-left-dial FAIL");
process.exit(ok ? 0 : 1);

// iPad 交付前的无头自测（created 2026-10-28 by Claude Fable 5.1；user 10-28 晚「ipad」= 下一步真机）：iPad 竖屏 820 × 1180、触屏、用笔（pointerType pen）走今晚改的几条路——
// ① 自由建模左柱九格都在屏里、不溢出（撤销 / 重做是另外的钮，不在这个容器里） ② 芯片：闲着不出；全选 + 移动 = 锁轴 + 「吸附」开关，没有键名 ③ 点「锁 Z」芯片 = 锁上（亮）+ 轴线画出来
// ④ 点「吸附」开关 = 亮；笔拖一个角 = 真的动了、只沿 Z ⑤ 换工具 = 开关放开 ⑥ 左柱换脸：选一张面 → 垃圾桶，笔点它 = 删了一张面
// ⑦ 新建工具：笔点地面 = 建一个（工具条尺寸）。跑法：python3 -m http.server 8765 后 node test/probes/probe-ipad-pen.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: { width: 820, height: 1180 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const page = await ctx.newPage(); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const r = {};
const chips = () => page.evaluate(() => { const m = document.querySelector(".mfd"); return m && !m.hidden ? [...m.querySelectorAll(".mfd-slot:not(.empty)")].map((s) => `${s.dataset.slot}:${[...s.querySelectorAll(".mfd-chip")].map((c) => (c.querySelector("kbd") ? "K" : "") + c.lastElementChild.textContent + (c.classList.contains("on") ? "*" : "")).join(",")}`) : []; });
const pen = (type, x, y) => page.evaluate(([type, x, y]) => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: q.left + x, clientY: q.top + y, pointerType: "pen", pointerId: 7, isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.5 })); }, [type, x, y]);
const penTap = async (x, y) => { await pen("pointerdown", x, y); await page.waitForTimeout(30); await pen("pointerup", x, y); await page.waitForTimeout(60); };
const penDrag = async (x0, y0, x1, y1) => { await pen("pointerdown", x0, y0); for (let i = 1; i <= 8; i++) { await pen("pointermove", x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * i / 8); await page.waitForTimeout(16); } await pen("pointerup", x1, y1); await page.waitForTimeout(80); };
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.3; e.draw(); globalThis.__catsup.hud.pick("select"); e.deselectAll();
  return inst.def;
});
// 先碰一下笔：芯片 / 手柄按最近一次按下的指针走
await penTap(60, 1100); await page.waitForTimeout(100);
// ①
r.rail = await page.evaluate(() => { const tb = document.getElementById("toolbar"), bs = [...tb.querySelectorAll("button")]; const inView = bs.every((x) => { const q = x.getBoundingClientRect(); return q.top >= 0 && q.bottom <= innerHeight && q.width > 0; }); return { n: bs.length, labels: bs.map((x) => x.querySelector(".tool-label")?.textContent ?? x.title ?? "?").join(" "), inView, overflow: tb.scrollHeight > tb.clientHeight + 2 }; });
r.idleChips = await chips();
// ②
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.selectAll(); globalThis.__catsup.hud.pick("move"); }); await page.waitForTimeout(100);
r.selChips = await chips();
// ③
await page.click(".mfd-slot[data-slot=lock] .mfd-chip:has-text('锁 Z')"); await page.waitForTimeout(80);
r.lockZ = { chips: await chips(), axisLock: await page.evaluate(() => globalThis.__catsup.editor.axisLock), line: await page.evaluate(() => !!globalThis.__catsup.editor.r3.lockLinesObj?.visible && (globalThis.__catsup.editor.lockGuide()?.length ?? 0) === 1) };
// ④
await page.click(".mfd-slot[data-slot=shift] .mfd-chip"); await page.waitForTimeout(80);
r.latch = await chips();
const corner = await page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel, eye = e.cam.eye(), top = m.verts().filter((v) => m.pt(v).z > 0.5).sort((a, c) => { const p = m.pt(a), q = m.pt(c); return Math.hypot(p.x - eye.x, p.y - eye.y, p.z - eye.z) - Math.hypot(q.x - eye.x, q.y - eye.y, q.z - eye.z); })[0]; const s = e.cam.angularPx(m.pt(top), e.vp()); return { v: top, p: m.pt(top), s }; }, def);
await penDrag(corner.s.x, corner.s.y, corner.s.x + 30, corner.s.y - 60);
r.drag = await page.evaluate(([d, v, p0]) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel, p = m.pt(v); return { dx: +(p.x - p0.x).toFixed(6), dy: +(p.y - p0.y).toFixed(6), dz: +(p.z - p0.z).toFixed(6), hint: globalThis.__catsup.hud.status() }; }, [def, corner.v, corner.p]);
// ⑤
await page.evaluate(() => globalThis.__catsup.hud.pick("rotate")); await page.waitForTimeout(80);
r.afterSwitch = await chips();
// ⑥
await page.evaluate(() => globalThis.__catsup.hud.pick("select")); await page.waitForTimeout(60);
await page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel; e.deselectAll(); e.selection.faces.add(m.faces()[0]); globalThis.__catsup.hud.pick("select"); }, def); await page.waitForTimeout(80);
const f0 = await page.evaluate((d) => globalThis.__catsup.editor.scene.mesh(d).kernel.faceCount(), def);
const delBtn = await page.$("#toolStrip .selbar-btn:has-text('删除')");   // v0.16.31 起删除在右下（左柱垃圾桶撤了）；v0.16.38 起右下只有「删除」「更多…」
r.face = { present: !!delBtn, bar: await page.evaluate(() => [...document.querySelectorAll("#toolStrip .selbar-btn")].map((x) => x.textContent.trim()).join(" | ")) };
if (delBtn) { await delBtn.click(); await page.waitForTimeout(100); }
r.face.deleted = (await page.evaluate((d) => globalThis.__catsup.editor.scene.mesh(d).kernel.faceCount(), def)) === f0 - 1;
// ⑦
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.deselectAll(); globalThis.__catsup.hud.pick("create"); e.config.set("create", "kind", "box"); e.config.set("create", "size", 0.5); }); await page.waitForTimeout(60);
const ground = await page.evaluate(() => { const e = globalThis.__catsup.editor; return e.cam.angularPx({ x: 3, y: 0, z: 0 }, e.vp()); });
const v0 = await page.evaluate((d) => globalThis.__catsup.editor.scene.mesh(d).kernel.vertexCount(), def);
await penTap(ground.x, ground.y);
r.create = { added: (await page.evaluate((d) => globalThis.__catsup.editor.scene.mesh(d).kernel.vertexCount(), def)) - v0, hint: await page.evaluate(() => globalThis.__catsup.hud.status()) };
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const noK = (s) => s.every((x) => !/:K|,K/.test(x));
const ok = r.rail.n === 9 && r.rail.inView && !r.rail.overflow && /新建/.test(r.rail.labels)
  && r.idleChips.length === 0 && r.selChips.some((s) => s.startsWith("lock:")) && r.selChips.some((s) => s === "shift:吸附") && noK(r.selChips)
  && r.lockZ.axisLock === "z" && r.lockZ.chips.some((s) => /锁 Z\*/.test(s)) && r.lockZ.line
  && r.latch.some((s) => s === "shift:吸附*") && r.drag.dx === 0 && r.drag.dy === 0 && Math.abs(r.drag.dz) > 0.02
  && !r.afterSwitch.some((s) => /吸附\*/.test(s))
  && r.face.present && r.face.bar === "删除 | 更多…" && r.face.deleted && r.create.added === 8 && errs.length === 0;
console.log(ok ? "probe-ipad-pen OK" : "probe-ipad-pen FAIL");
process.exit(ok ? 0 : 1);

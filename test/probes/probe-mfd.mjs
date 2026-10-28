// 键名芯片（MFD；账本 UX19；app/mfd.ts + controller/chips.ts；created 2026-10-28 by Claude Opus 5.5）。
// ⓪ 开机的画线工具（吃锁）：方向键锁轴芯片 ① 硬表面选择工具：有 Shift / Ctrl 芯片、没有锁轴 ② 自由建模移动工具：锁轴 X / Y / Z 三个芯片；点「X」= 真锁 X（和按 X 键同一条）③ 鼠标下能收起、收起记住；
// ④ 碰过笔：收起钮不见、芯片照样显示。跑法：python3 -m http.server 8765 后 node test/probes/probe-mfd.mjs [截图路径]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2]?.startsWith("http") ? process.argv[2] : "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const chips = () => page.evaluate(() => { const m = document.querySelector(".mfd"); return { hidden: !m || m.hidden, collapsed: !!m?.classList.contains("collapsed"), toggle: !!m && !m.querySelector(".mfd-toggle").hidden, slots: m ? [...m.querySelectorAll(".mfd-slot:not(.empty)")].map((s) => `${s.dataset.slot}:${[...s.querySelectorAll("kbd")].map((k) => k.textContent).join("/")}`) : [] }; });
const r = {};
r.lineBoot = await chips();   // 开机的工具（画线，吃锁）= 方向键锁轴芯片
await page.evaluate(() => globalThis.__catsup.hud.pick("select")); await page.waitForTimeout(100);
r.geometry = await chips();
await page.evaluate(async () => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms)); const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.addSegments(segs); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20); const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); e.setTool("move"); e.selectAll(); globalThis.__catsup.hud.pick("move"); });
await page.waitForTimeout(150);
r.freeformMove = await chips();
if (process.argv[2] && !process.argv[2].startsWith("http")) await page.locator("#hintWrap").screenshot({ path: process.argv[2] });
await page.click(".mfd-slot[data-slot=lock] .mfd-chip:has-text('X')"); await page.waitForTimeout(80);
r.lockAfterTap = await page.evaluate(() => globalThis.__catsup.editor.axisLock ?? null);
// ③ 收起（鼠标）→ 记住
await page.click(".mfd-toggle"); await page.waitForTimeout(60);
r.collapsed = await chips();
r.pref = await page.evaluate(() => { try { return Object.keys(localStorage).filter((k) => /ui\.mfd$/.test(k)).map((k) => localStorage.getItem(k)); } catch { return null; } });
await page.click(".mfd-toggle"); await page.waitForTimeout(60);
// ④ 笔：收起钮不见
await page.evaluate(() => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); for (const t of ["pointerdown", "pointerup"]) c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: q.left + 30, clientY: q.top + 700, pointerType: "pen", pointerId: 5, isPrimary: true, buttons: t === "pointerdown" ? 1 : 0 })); });
await page.waitForTimeout(150);
r.pen = await chips();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.lineBoot.slots[0] === "lock:→/←/↑" && !r.geometry.hidden && r.geometry.slots.some((s) => s.startsWith("shift:")) && r.geometry.slots.some((s) => s.startsWith("ctrl:")) && !r.geometry.slots.some((s) => s.startsWith("lock:"))
  && r.freeformMove.slots[0] === "lock:X/Y/Z" && r.lockAfterTap === "x" && r.collapsed.collapsed && r.collapsed.slots.length === 0 && (r.pref === null || r.pref.includes("0"))
  && !r.pen.toggle && !r.pen.collapsed && r.pen.slots.length > 0 && errs.length === 0;
console.log(ok ? "probe-mfd OK" : "probe-mfd FAIL");
process.exit(ok ? 0 : 1);

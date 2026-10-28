// 键名芯片（MFD；账本 UX19；app/mfd.ts + controller/chips.ts；created 2026-10-28 by Claude Opus 5.5；2026-10-28 晚按 user「实时响应按键 / 有context才显示 / ipad不显示键位」改）。
// ⓪ 开机闲着 = 整排不出 ① 选择工具闲着不出；按住 Shift = Shift 那枚出来并亮、松开收 ② 自由建模移动、有选区闲着 = 只出锁轴（对选区做事 = 有事可做；修饰键要按住才出）；
// 按 X 键 = X 亮；点「Y」芯片 = 真锁 Y（和按 Y 键同一条）、Y 亮 ③ 拖着没松 = 锁轴 + Shift，没有取消（松手就是决定）④ 鼠标下能收起、收起记住
// ⑤ 碰过笔：收起钮不见、不印键名；有选区 = 锁轴 + 修饰键开关；点「吸附」= 锁住（亮）、真的当 Shift 用；换工具 = 放开。跑法：python3 -m http.server 8765 后 node test/probes/probe-mfd.mjs [截图路径]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2]?.startsWith("http") ? process.argv[2] : "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const shot = process.argv[2] && !process.argv[2].startsWith("http") ? process.argv[2] : null;
const chips = () => page.evaluate(() => {
  const m = document.querySelector(".mfd");
  return { hidden: !m || m.hidden, collapsed: !!m?.classList.contains("collapsed"), toggle: !!m && !m.querySelector(".mfd-toggle").hidden,
    slots: m && !m.hidden ? [...m.querySelectorAll(".mfd-slot:not(.empty)")].map((s) => `${s.dataset.slot}:${[...s.querySelectorAll(".mfd-chip")].map((c) => (c.querySelector("kbd")?.textContent ?? "") + "|" + c.lastElementChild.textContent + (c.classList.contains("on") ? "*" : "")).join(",")}`) : [] };
});
const fire = (type, x, y, pointerType = "mouse") => page.evaluate(([type, x, y, pointerType]) => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: q.left + x, clientY: q.top + y, pointerType, pointerId: 5, isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1 })); }, [type, x, y, pointerType]);
const r = {};
r.boot = await chips();
// ①
await page.evaluate(() => globalThis.__catsup.hud.pick("select")); await page.waitForTimeout(100);
r.selectIdle = await chips();
await page.keyboard.down("Shift"); await page.waitForTimeout(60);
r.shiftHeld = await chips();
await page.keyboard.up("Shift"); await page.waitForTimeout(60);
r.shiftUp = await chips();
// ② 自由建模移动
const center = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.addSegments(segs); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  globalThis.__catsup.hud.pick("move"); e.selectAll(); globalThis.__catsup.hud.pick("move"); await sleep(30);
  return e.cam.angularPx(P(0.5, 0.5, 1), e.vp());
});
await page.waitForTimeout(100);
r.moveIdleSel = await chips();
await page.keyboard.press("x"); await page.waitForTimeout(80);
r.afterKeyX = await chips();
await page.click(".mfd-slot[data-slot=lock] .mfd-chip:has-text('Y')"); await page.waitForTimeout(80);
r.lockAfterTap = await page.evaluate(() => globalThis.__catsup.editor.axisLock ?? null);
r.afterTapY = await chips();
// ③ 拖的过程中
await fire("pointermove", center.x, center.y); await fire("pointerdown", center.x, center.y); await fire("pointermove", center.x + 20, center.y - 10); await page.waitForTimeout(80);
r.dragging = await chips();
if (shot) await page.locator("#hintWrap").screenshot({ path: shot });
await page.keyboard.press("Escape"); await fire("pointerup", center.x + 20, center.y - 10); await page.waitForTimeout(80);
// ④ 收起（鼠标）→ 记住
await page.evaluate(() => { const e = globalThis.__catsup.editor; if (e.axisLock !== "x") e.lockKey("x", false); }); await page.waitForTimeout(60);
await page.evaluate(() => globalThis.__catsup.hud.pick("move")); await page.waitForTimeout(60);
await page.click(".mfd-toggle"); await page.waitForTimeout(60);
r.collapsed = await chips();
r.pref = await page.evaluate(() => { try { return Object.keys(localStorage).filter((k) => /ui\.mfd$/.test(k)).map((k) => localStorage.getItem(k)); } catch { return null; } });
await page.click(".mfd-toggle"); await page.waitForTimeout(60);
// ⑤ 笔
await fire("pointerdown", 30, 700, "pen"); await fire("pointerup", 30, 700, "pen"); await page.waitForTimeout(100);
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setAxisLock?.(null); e.selectAll(); globalThis.__catsup.hud.pick("move"); }); await page.waitForTimeout(80);
r.penSel = await chips();
await page.click(".mfd-slot[data-slot=shift] .mfd-chip"); await page.waitForTimeout(80);
r.penLatched = await chips();
r.shiftFlag = await page.evaluate(() => globalThis.__catsup.editor.mods?.shift ?? null);
await page.evaluate(() => globalThis.__catsup.hud.pick("rotate")); await page.waitForTimeout(80);
await page.evaluate(() => globalThis.__catsup.hud.pick("move")); await page.waitForTimeout(80);
r.penAfterToolChange = await chips();
await fire("pointerdown", center.x, center.y, "pen"); await fire("pointermove", center.x + 20, center.y - 10, "pen"); await page.waitForTimeout(80);
r.penDragging = await chips();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const noKbd = (s) => s.every((x) => x.split(":")[1].split(",").every((c) => c.startsWith("|")));
const ok = r.boot.hidden && r.selectIdle.hidden && !r.shiftHeld.hidden && r.shiftHeld.slots.length === 1 && /^shift:Shift\|.+\*$/.test(r.shiftHeld.slots[0]) && r.shiftUp.hidden
  && r.moveIdleSel.slots.length === 1 && r.moveIdleSel.slots[0].startsWith("lock:X|") && !/\*/.test(r.moveIdleSel.slots[0]) && r.afterKeyX.slots.length === 1 && r.afterKeyX.slots[0].startsWith("lock:X|") && /X\|[^,]+\*/.test(r.afterKeyX.slots[0]) && !/Y\|[^,]+\*/.test(r.afterKeyX.slots[0])
  && r.lockAfterTap === "y" && /Y\|[^,]+\*/.test(r.afterTapY.slots[0]) && !/X\|[^,]+\*/.test(r.afterTapY.slots[0])
  && r.dragging.slots.some((s) => s.startsWith("lock:X|")) && r.dragging.slots.some((s) => s === "shift:Shift|吸附") && !r.dragging.slots.some((s) => s.startsWith("cancel:"))
  && r.collapsed.collapsed && r.collapsed.slots.length === 0 && (r.pref === null || r.pref.includes("0"))
  && !r.penSel.hidden && !r.penSel.toggle && noKbd(r.penSel.slots) && r.penSel.slots.some((s) => s.startsWith("lock:")) && r.penSel.slots.includes("shift:|吸附")
  && r.penLatched.slots.includes("shift:|吸附*") && r.shiftFlag !== false && r.penAfterToolChange.slots.includes("shift:|吸附")
  && r.penDragging.slots.length > 0 && noKbd(r.penDragging.slots) && errs.length === 0;
console.log(ok ? "probe-mfd OK" : "probe-mfd FAIL");
process.exit(ok ? 0 : 1);

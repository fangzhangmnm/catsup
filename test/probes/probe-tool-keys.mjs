// 工具栏右上角的快捷键小字（统筹 11-13 第 D 件；判据 = 这次打开之后按过实体键盘，src/app/keyboard-seen.ts）。created 2026-11-13 by Claude Opus 5.5
// ① 开机、全程没按过键：工具栏小字不显示、键名芯片不印键名
// ② 用笔点过画布（最后一次指针 = 笔）、脚本发的假按键（isTrusted = false）：照旧不显示
// ③ 按一个真的键（Shift）：小字出现、键名芯片印键名；每个小字不压到图标；字从键表来（选择 = ␣、硬表面画线 = K、推拉 = P）
// ④ 自由建模里也有（移动 = M）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-tool-keys.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const state = () => page.evaluate(() => {
  const marks = [...document.querySelectorAll("#toolbar .tool")].map((b) => { const k = b.querySelector(".tool-key"), ico = b.querySelector(".ico"); if (!k) return null; const kr = k.getBoundingClientRect(), ir = ico?.getBoundingClientRect(); const shown = getComputedStyle(k).display !== "none";
    const overlap = shown && ir ? !(kr.right <= ir.left || kr.left >= ir.right || kr.bottom <= ir.top || kr.top >= ir.bottom) : false;
    return { holds: b.dataset.holds ?? "", text: k.textContent, shown, overlap }; }).filter(Boolean);
  const chips = [...document.querySelectorAll(".mfd-chip")].map((c) => ({ nokeys: c.classList.contains("nokeys"), text: c.textContent }));
  return { marks, chips, seen: document.body.classList.contains("keys-seen") };
});
// 场景：画一张面、选着它（键名芯片在有选区时出来）
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 }), Q = [P(-1, -1), P(1, -1), P(1, 1), P(-1, 1)]; e.setGrid({ ...e.grid, on: false }); e.addSegments(Q.map((q, i) => [q, Q[(i + 1) % 4]]), "sq"); e.cam.setView("top"); e.zoomExtents(); e.draw(); globalThis.__catsup.hud.pick("select"); });
const box = await page.locator("#board").boundingBox();
const pen = (type, x, y, buttons) => page.evaluate(([type, x, y, buttons]) => { const c = document.getElementById("board"), r = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "pen", isPrimary: true, button: 0, buttons, pressure: buttons ? 0.5 : 0 })); }, [type, x, y, buttons]);
const res = {};
res.one = await state();
// ② 用笔点画布中间（选中那张面）、脚本发一个假按键
const cx = box.width / 2, cy = box.height / 2;
await pen("pointermove", cx, cy, 0); await pen("pointerdown", cx, cy, 1); await page.waitForTimeout(30); await pen("pointerup", cx, cy, 0); await page.waitForTimeout(400);
await page.evaluate(() => globalThis.__catsup.hud.pick("move"));   // 键名芯片在「对选区做事、有选区」时出来：拿移动
await page.waitForTimeout(100);
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "Shift", code: "ShiftLeft", bubbles: true })));
await page.waitForTimeout(100);
res.two = await state();
res.sel = await page.evaluate(() => globalThis.__catsup.editor.selection.faces.size);
// ③ 真的按一下 Shift（playwright 的键盘 = 浏览器里 isTrusted）
await page.keyboard.press("Shift"); await page.waitForTimeout(150);
res.three = await state();
// 有键盘时修饰键芯片只在按着 / 手势中出来（chips.ts 现有的规矩）：按住 Shift 看它印的是键名
await page.keyboard.down("Shift"); await page.waitForTimeout(150); res.held = await state(); await page.keyboard.up("Shift"); await page.waitForTimeout(50);
// ④ 自由建模：转成网格体、进去
await page.evaluate(async () => { const e = globalThis.__catsup.editor, S = e.scene; e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); const inst = [...S.def(S.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await new Promise((r) => setTimeout(r, 50)); globalThis.__catsup.hud.pick("select"); });
await page.waitForTimeout(150);
res.four = await state(); res.mode = await page.evaluate(() => globalThis.__catsup.editor.modeId);
await b.close();
const ok = [], bad = [], chk = (n, c, d) => (c ? ok : bad).push(`${n}${c ? "" : "  ← " + JSON.stringify(d)}`);
const mark = (s, tool) => s.marks.find((m) => m.holds.split(",").includes(tool));
chk("① 没按过键：工具栏小字一个都不显示", res.one.marks.length > 0 && res.one.marks.every((m) => !m.shown) && !res.one.seen, res.one);
chk("② 用笔点过、脚本发的假按键：照旧不显示、键名芯片不印键名", res.two.marks.every((m) => !m.shown) && !res.two.seen && res.two.chips.length > 0 && res.two.chips.every((c) => c.nokeys), { two: res.two, sel: res.sel });
chk("③ 按了真的 Shift：小字出现（有键的都显示）", res.three.seen && res.three.marks.filter((m) => m.text).every((m) => m.shown), res.three);
chk("③ 键名芯片也印键名了（按住 Shift 时出来、不带「没键盘」的样子）", res.held.chips.length > 0 && res.held.chips.every((c) => !c.nokeys), res.held.chips);
chk("③ 小字不压到图标", res.three.marks.every((m) => !m.overlap), res.three.marks.filter((m) => m.overlap));
chk("③ 字从键表来：选择 ␣、画线 K、推拉 P", mark(res.three, "select")?.text === "␣" && mark(res.three, "line")?.text === "K" && mark(res.three, "pp")?.text === "P", res.three.marks);
chk("④ 自由建模里也有：移动 = M", res.mode === "freeform" && mark(res.four, "move")?.text === "M" && mark(res.four, "move")?.shown, { mode: res.mode, marks: res.four.marks });
chk("没有脚本错误", errs.length === 0, errs);
for (const s of ok) console.log("✓", s);
for (const s of bad) console.log("✗", s);
process.exit(bad.length ? 1 : 0);

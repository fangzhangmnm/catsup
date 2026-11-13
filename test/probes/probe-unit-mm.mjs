#!/usr/bin/env node
// probe-unit-mm.mjs —— 毫米单位制（施工单 ai-docs/20261112-unit-system-mm-workorder.md 第五节验收）。created 2026-11-13 by Claude Opus 5.5
// user 11-12：「为什么我输入一的时候它会识别为一米而不是一厘米？……就加一个工业设计的毫米单位制」。
// 做法：单位页换成「毫米」→ 推拉一张 4 厘米的面（数值小窗开着）→ 打 1 / 1.5 / 1cm 回车，量高度；读数、吸附标签写 mm；
//   吸附 10 毫米时拖推拉，高度是 10 毫米的整数倍；导出 → 重开：单位制和吸附长度还在；换回公制再换回来，模型一个数不变。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-unit-mm.mjs [url]（≈ 15 s）
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const ctx = await browser.newContext({ viewport: { width: 1000, height: 760 }, acceptDownloads: true });
const page = await ctx.newPage();
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);
const S = (f, a) => page.evaluate(f, a);
const top = () => S(() => Math.max(...globalThis.__catsup.editor.sceneRef.brep(globalThis.__catsup.editor.sceneRef.root).kernel.toBrep().vertices.map((p) => p.z)));

console.log("单位页换成「毫米」（右上渲染窗 · 单位）");
await S(() => { if (!document.querySelector('.float-win[data-win="view"]:not([hidden])')) document.querySelector(".gizmo-menu").click(); }); await page.waitForTimeout(150);
await page.click('.float-win[data-win="view"] [data-menu-tab="units"]'); await page.waitForTimeout(80);
await page.click('.float-win[data-win="view"] [data-menu-id^="sys:"]'); await page.waitForTimeout(100);
await page.locator(".choice-layer button", { hasText: "毫米" }).first().click(); await page.waitForTimeout(120);
const g0 = await S(() => ({ ...globalThis.__catsup.editor.grid, vcb: globalThis.__catsup.editor.vcbUnit }));
check(g0.system === "metric-mm" && Math.abs(g0.snap - 0.001) < 1e-12 && g0.vcb === "mm", "换成毫米：单位制 metric-mm、吸附默认 1 mm、不带单位的数按毫米", JSON.stringify(g0));
const snapSay = await S(() => document.querySelector('.float-win[data-win="view"] [data-menu-id^="snap:"] .menu-value')?.textContent ?? "");
check(/^1 mm$/.test(snapSay.trim()), "吸附长度那一行写「1 mm」", snapSay);
await S(() => document.querySelector('.float-win[data-win="view"] .float-close')?.click());

console.log("\n推拉一张 4 厘米的面，打数");
await S(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); const w = 0.04; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(w, 0)], [P(w, 0), P(w, w)], [P(w, w), P(0, w)], [P(0, w), P(0, 0)]] }); e.cam.setView("iso"); e.zoomExtents(); e.draw(); });
const scr = await S(() => { const e = globalThis.__catsup.editor, q = e.cam.project({ x: 0.02, y: 0.02, z: 0 }, e.vp()), r = document.getElementById("board").getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; });
await S(() => globalThis.__catsup.editor.setTool("pp"));
await page.mouse.move(scr.x, scr.y); await page.mouse.down(); await page.mouse.move(scr.x, scr.y - 120, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
for (const [txt, want] of [["1", 0.001], ["1.5", 0.0015], ["1cm", 0.01], ["0.25", 0.00025]]) {
  for (const ch of txt) { await page.keyboard.press(ch); await page.waitForTimeout(15); }
  await page.keyboard.press("Enter"); await page.waitForTimeout(150);
  const h = await top();
  check(Math.abs(h - want) < 1e-9, `打「${txt}」回车 → 高 ${want * 1000} mm`, `实得 ${h}`);
}
const say = await S(() => globalThis.__catsup.hud?.status?.() ?? "");
check(/mm/.test(say) && !/\bcm\b|\d m\b/.test(say), "读数写 mm", say.slice(0, 80));

console.log("\n吸附 10 毫米时拖推拉：高度是 10 毫米的整数倍");
{
  const r = await S(async () => {
    const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((q) => setTimeout(q, ms));
    e.setTool("select"); e.selectAll(); e.deleteSelection(); await sleep(20);
    e.setGrid({ on: true, snap: 0.01 });
    const w = 0.04; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(w, 0)], [P(w, 0), P(w, w)], [P(w, w), P(0, w)], [P(0, w), P(0, 0)]] });
    e.deselectAll(); e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(30);
    const c = document.getElementById("board"), R = c.getBoundingClientRect();
    const fire = (t, q, b) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: R.left + q.x, clientY: R.top + q.y, pointerId: 19, pointerType: "mouse", isPrimary: true, button: 0, buttons: b }));
    const q0 = e.cam.project(P(0.02, 0.02, 0), e.vp()), qH = e.cam.project(P(0.02, 0.02, 0.026), e.vp());
    e.setTool("pp"); await sleep(10);
    fire("pointermove", q0, 0); fire("pointerdown", q0, 1); await sleep(10);
    for (let k = 1; k <= 8; k++) { fire("pointermove", { x: q0.x + (qH.x - q0.x) * k / 8, y: q0.y + (qH.y - q0.y) * k / 8 }, 1); await sleep(8); }
    fire("pointerup", qH, 0); await sleep(60);
    return Math.max(...e.sceneRef.brep(e.sceneRef.root).kernel.toBrep().vertices.map((p) => p.z));
  });
  check(Math.abs(r / 0.01 - Math.round(r / 0.01)) < 1e-6 && r > 0, `拖到 26 mm → ${Math.round(r * 1000)} mm（10 mm 的整数倍）`, String(r));
}

console.log("\n导出 → 重开：单位制、吸附长度还在；换回公制再换回来模型不变");
{
  const before = await S(() => JSON.stringify(globalThis.__catsup.editor.sceneRef.brep(globalThis.__catsup.editor.sceneRef.root).kernel.toBrep().vertices.map((p) => [p.x, p.y, p.z].map((v) => Math.round(v * 1e9) / 1e9).join(",")).sort()));
  const [dl] = await Promise.all([page.waitForEvent("download"), S(() => globalThis.__catsup.session.exportProject())]);
  const bytes = [...(await (await import("node:fs")).promises.readFile(await dl.path()))];
  await page.reload({ waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.session); await page.waitForTimeout(800);
  await S((arr) => globalThis.__catsup.session.openLocalBytes(new Uint8Array(arr), "mm.catsup", null), bytes); await page.waitForTimeout(300);
  const g1 = await S(() => globalThis.__catsup.editor.grid);
  check(g1.system === "metric-mm" && Math.abs(g1.snap - 0.01) < 1e-12, "重开：单位制 metric-mm、吸附 10 mm", JSON.stringify(g1));
  const v1 = await S(() => JSON.stringify(globalThis.__catsup.editor.sceneRef.brep(globalThis.__catsup.editor.sceneRef.root).kernel.toBrep().vertices.map((p) => [p.x, p.y, p.z].map((v) => Math.round(v * 1e9) / 1e9).join(",")).sort()));
  check(v1 === before, "重开：模型一个数不变（点的坐标集合，1e-9 米）", `${before.slice(0, 120)} / ${v1.slice(0, 120)}`);
  await S(() => { const e = globalThis.__catsup.editor; e.setGrid({ system: "metric", snap: 0.2 }); e.setGrid({ system: "metric-mm", snap: 0.001 }); });
  const v2 = await S(() => JSON.stringify(globalThis.__catsup.editor.sceneRef.brep(globalThis.__catsup.editor.sceneRef.root).kernel.toBrep().vertices.map((p) => [p.x, p.y, p.z].map((v) => Math.round(v * 1e9) / 1e9).join(",")).sort()));
  check(v2 === v1, "换回公制再换回毫米：模型一个数不变");
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-unit-mm ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

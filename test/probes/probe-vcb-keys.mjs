#!/usr/bin/env node
// probe-vcb-keys.mjs —— 数值小窗：软键盘每一个键按下去框里的字都对；实体键盘和软键盘两条路都打得出小数和单位。created 2026-11-12 by Claude Opus 5.5
// 起因（user 11-12，做 3D 打印小零件）：「我没法输入小数…输入了一之后，它直接跳成了一米而不是一厘米」「软键盘里的那个厘米和键盘的小数点都动不了」。
//   查出来：软键盘上多字符的键（cm / mm / ft / in）整个当一个键送，两种语法都只认单字符 = 按了没反应（打 1、按 cm 没反应、回车 = 1 米）；
//   数值小窗空着时「.」不收（实体键盘上它是缩放到选区）；中文输入法打出来的全角「。」「１」不认。修法在 controller/typed-input.ts。
// 做法：推拉落定（数值小窗开着）→ 点开软键盘，每个键一组：按一串、比框里的字；回车那组量面的高度。实体键盘打「1.5cm」「15mm」回车量高度。
//   手势那条路：自由建模里按 G 起手移动，点软键盘的 1 . 5 cm，看打数的字。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-vcb-keys.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);
const S = (f, a) => page.evaluate(f, a);
const buf = () => S(() => globalThis.__catsup.editor.typing.text());
const top = () => S(() => Math.max(...globalThis.__catsup.editor.sceneRef.brep(globalThis.__catsup.editor.sceneRef.root).kernel.toBrep().vertices.map((p) => p.z)));
const key = async (g) => { await page.locator(".vcb-pad .vcb-key").filter({ hasText: new RegExp(`^${g.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&")}$`) }).first().click(); await page.waitForTimeout(30); };

// 一张 4 厘米的面，推拉落定（数值小窗开着）
await S(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.setGrid({ on: true, snap: 0.01 }); const w = 0.04; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(w, 0)], [P(w, 0), P(w, w)], [P(w, w), P(0, w)], [P(0, w), P(0, 0)]] }); e.cam.setView("iso"); e.zoomExtents(); e.draw(); });
const scr = await S(() => { const e = globalThis.__catsup.editor, q = e.cam.project({ x: 0.02, y: 0.02, z: 0 }, e.vp()), r = document.getElementById("board").getBoundingClientRect(); return { x: r.left + q.x, y: r.top + q.y }; });
await S(() => globalThis.__catsup.editor.setTool("pp"));
await page.mouse.move(scr.x, scr.y); await page.mouse.down(); await page.mouse.move(scr.x, scr.y - 150, { steps: 6 }); await page.mouse.up(); await page.waitForTimeout(150);
check((await S(() => globalThis.__catsup.editor.typing.target())) === "vcb" && (await top()) > 0, "推拉落定，数值小窗开着");

console.log("\n软键盘：每个键");
await page.click(".vcb-field"); await page.waitForTimeout(80);
const keys = await S(() => [...document.querySelectorAll(".vcb-pad .vcb-key")].map((b) => b.textContent));
check(["7", "8", "9", "⌫", "4", "5", "6", ",", "1", "2", "3", "-", "0", ".", "x", "/", "m", "cm", "mm", "清空", "↵"].every((k) => keys.includes(k)), `键都在：${keys.join(" ")}`);
for (const [what, seq, want] of [
  ["每个数字", ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"], "0123456789"],
  ["小数", ["1", ".", "5"], "1.5"],
  ["空框先按点 = 0.5", [".", "5"], "0.5"],
  ["逗号（两个数）", ["1", ",", "2"], "1,2"],
  ["负号", ["-", "3"], "-3"],
  ["阵列 x", ["5", "x"], "5x"],
  ["斜杠", ["6", "/", "2"], "6/2"],
  ["米", ["1", "m"], "1m"],
  ["厘米", ["1", ".", "5", "cm"], "1.5cm"],
  ["毫米", ["1", "5", "mm"], "15mm"],
  ["退格", ["1", "2", "⌫"], "1"],
]) {
  await key("清空"); for (const k of seq) await key(k);
  const got = await buf();
  check(got === want, `${what}：按 ${seq.join(" ")} → 框里「${want}」`, `实得「${got}」`);
}
await key("清空"); check((await buf()) === "", "清空 → 框里是空的");
for (const k of ["1", ".", "5", "cm"]) await key(k);
await key("↵"); await page.waitForTimeout(150);
check(Math.abs((await top()) - 0.015) < 1e-9, "软键盘打 1.5cm 回车 → 面抬 1.5 厘米", `实得 ${await top()}`);

console.log("\n实体键盘");
for (const [txt, want] of [["1.5cm", 0.015], ["15mm", 0.015], ["0.5cm", 0.005], ["2cm", 0.02]]) {
  for (const ch of txt) { await page.keyboard.press(ch); await page.waitForTimeout(15); }
  const got = await buf();
  await page.keyboard.press("Enter"); await page.waitForTimeout(150);
  check(got === txt && Math.abs((await top()) - want) < 1e-9, `打「${txt}」回车 → 框里「${txt}」、面抬 ${want * 100} 厘米`, `框里「${got}」、高 ${await top()}`);
}

console.log("\n手势中打数（自由建模、按 G 移动）点软键盘");
const g = await S(async () => {
  const C = globalThis.__catsup, e = C.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(30);
  const inst = [...e.sceneRef.def(e.sceneRef.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set("i" + inst.id, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  C.pickWorkbench("freeform"); e.selectAll(); await sleep(20);
  return { mode: e.modeId, sel: e.hasActableSelection() };
});
check(g.mode === "freeform" && g.sel, "进了自由建模、选中了", JSON.stringify(g));
await page.mouse.move(scr.x + 40, scr.y - 40); await page.keyboard.press("g"); await page.waitForTimeout(80);
const gt = await S(() => globalThis.__catsup.editor.typing.target());
check(gt === "gesture", "按 G 起手：打的字归手势", String(gt));
await page.click(".vcb-field"); await page.waitForTimeout(80);
for (const k of ["1", ".", "5", "cm"]) await key(k);
check((await buf()) === "1.5cm", "手势中点软键盘 1 . 5 cm → 「1.5cm」", `实得「${await buf()}」`);
await page.keyboard.press("Escape"); await page.waitForTimeout(60);

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-vcb-keys ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

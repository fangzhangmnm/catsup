// 状态行披露（接线清单第 5 条；created 2026-10-28 by Claude Opus 5.5）：按住 Shift 一小会儿 = 提示行露出这把工具按住 Shift 是什么 + 带 Shift 的和弦；
// 松开 = 回到原来的提示；Shift+Z 一下按完（没停够）= 不露；自由建模操作工具里 Ctrl = 环切 / 倒角那几条。跑法：python3 -m http.server 8765 后 node test/probes/probe-mod-peek.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const hint = () => page.evaluate(() => document.getElementById("hint").textContent);
const r = {};
await page.mouse.move(500, 400);
r.before = await hint();
await page.keyboard.down("Shift"); await page.waitForTimeout(700);
r.held = await hint();
await page.keyboard.up("Shift"); await page.waitForTimeout(60);
r.after = await hint();
await page.keyboard.down("Shift"); await page.keyboard.press("KeyZ"); await page.keyboard.up("Shift"); await page.waitForTimeout(700);
r.quick = await hint();
// 自由建模、移动工具：Ctrl
await page.evaluate(async () => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms)); const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.addSegments(segs); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20); const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); e.setTool("move"); });
await page.keyboard.down("Control"); await page.waitForTimeout(700);
r.ctrlFreeform = await hint();
await page.keyboard.up("Control");
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = /^按住 Shift/.test(r.held) && /Shift\+Z 缩放到全部/.test(r.held) && r.after === r.before && !/^按住/.test(r.quick)
  && /^按住 Ctrl/.test(r.ctrlFreeform) && /Ctrl\+R 环切/.test(r.ctrlFreeform) && /Ctrl\+B 倒角/.test(r.ctrlFreeform) && errs.length === 0;
console.log(ok ? "probe-mod-peek OK" : "probe-mod-peek FAIL");
process.exit(ok ? 0 : 1);

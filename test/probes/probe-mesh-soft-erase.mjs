// 自由建模的软边橡皮（2026-10-29 Claude Opus 5.5；user 10-29「软边橡皮或者说硬边软边切换，现在自由建模蛮需要的」）：
// 网格体盒子，刮一条竖棱（90°）→ 手标平滑（网格体不管「最大角度」）；按住 Shift 再刮 → 手标棱；一刮一次撤销；左柱「删除 ▾」里有它；选项条里没有「最大角度」。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));
const box = await page.locator("#board").boundingBox();
const scrub = async (p, q, shift = false) => { await page.mouse.move(box.x + p.x, box.y + p.y); if (shift) await page.keyboard.down("Shift"); await page.mouse.down(); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 8 }); await page.mouse.up(); if (shift) await page.keyboard.up("Shift"); await page.waitForTimeout(120); };
const setup = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), at = e.activePool();
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.cam.setView("iso"); e.zoomExtents(); await sleep(30);
  globalThis.__catsup.hud.pick("softErase"); await sleep(50);
  const vp = e.vp(), rib = e.cam.angularPx({ x: 1, y: 0, z: 0.5 }, vp);
  const bar = [...document.querySelectorAll("#contextBar *")].map((x) => x.textContent).join("|");
  const rail = [...document.querySelectorAll(".tool .tool-label")].map((x) => x.textContent);
  return { mode: e.modeId, tool: e.tool, rib, bar, rail };
});
const flags = () => page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.scene, d = [...s.defs.values()].find((x) => x.body.kind === "mesh"), m = d.body.kernel;
  return { smooth: m.edges().filter((x) => m.edgeFlags[x] === 3).length, sharp: m.edges().filter((x) => m.edgeFlags[x] === 32).length, hint: document.querySelector("#hint")?.textContent ?? "" }; });
await scrub({ x: setup.rib.x - 8, y: setup.rib.y }, { x: setup.rib.x + 8, y: setup.rib.y });
const soft = await flags();
await scrub({ x: setup.rib.x - 8, y: setup.rib.y }, { x: setup.rib.x + 8, y: setup.rib.y }, true);
const hard = await flags();
await page.evaluate(() => globalThis.__catsup.editor.undo());
const undo1 = await flags();
console.log(JSON.stringify({ setup, soft, hard, undo1 }));
const ok = setup.mode === "freeform" && setup.tool === "softErase" && !/最大角度/.test(setup.bar) && soft.smooth === 1 && soft.sharp === 0 && hard.smooth === 0 && hard.sharp === 1 && undo1.smooth === 1 && undo1.sharp === 0 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

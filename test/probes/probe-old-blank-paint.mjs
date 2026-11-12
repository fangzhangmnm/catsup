#!/usr/bin/env node
// probe-old-blank-paint.mjs —— 老文件里「开始画了一笔没画就存」的画，再打开画得上（统筹 11-12；画画内核 v0.14.89 读的那一头兜住）。created 2026-11-12 by Claude Opus 5.5
// 样本 test/fixtures/paint/v0.19.60-unpainted.catsup = 三维 v0.19.60（6064f7f7）的构建在无头浏览器里真写的：盒子 → 组件 → 网格体 → 开始画 64（不进画画工作台 = 没有画板）
//   → session.encodeNow()。那张画的分层字节是 v0.19.60 存盘器编的空白（stack.xml 里 weebpaint:id="undefined"、src="data/layerundefined.png"，没有合成图）。
//   以前（内核 v0.14.88 及以前）读回来图层号是 NaN，第一笔就「这一笔没能开始」。
// ① 打开这份文件；那张画是冷的；变热 = hot（不是只能看不能画）
// ② 在它上面落一笔（调试钩子 stroke2dOpen = 小窗落笔的同一个口）：落上了、一步、图层变了
// 用法：python3 -m http.server 8765 后 node test/probes/probe-old-blank-paint.mjs [url]
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const FIXTURE = Array.from(readFileSync(path.join(here, "../fixtures/paint/v0.19.60-unpainted.catsup")));
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const S = (f, a) => page.evaluate(f, a);
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor && globalThis.__catsup.session); await page.waitForTimeout(600);

console.log("\n① 打开 v0.19.60 写的文件；那张一笔没画的画变热");
const tex = await S(async (arr) => {
  const C = globalThis.__catsup;
  await C.session.openLocalBytes(Uint8Array.from(arr), "v0.19.60-unpainted.catsup", null);
  const S = C.editor.sceneRef;
  return [...S.textures.values()].find((t) => t.content.kind === "layered")?.guid ?? null;
}, FIXTURE);
check(typeof tex === "string", "打开了、有那张画");
const st0 = await S((t) => globalThis.__catsup.paint.state(t), tex);
const warmed = await S(async (t) => { const C = globalThis.__catsup, e = C.editor, Sc = e.sceneRef, inst = [...Sc.def(Sc.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); C.pickWorkbench("paint"); e.setTool("paintPen"); return C.paint.warm(t); }, tex);
check(st0 === "cold" && warmed === "hot", "冷的 → 变热 = 能画（不是只能看）", JSON.stringify({ st0, warmed }));

console.log("\n② 在它上面落一笔");
const r = await S((t) => {
  const C = globalThis.__catsup, e = C.editor, b = C.paint.boards.get(t), id = b.wp.exportData().activeId, p0 = e.history.position();
  const before = b.wp.exportData().nodes.map((n) => (n.pixels ? n.pixels.bytes.length : 0)).join(",");
  const h = C.paint.stroke2dOpen({ guid: t, x: 6, y: 6, size: 6, color: [0.9, 0.2, 0.1] });
  if (h.refused) return { refused: h.refused, hint: document.getElementById("hint")?.textContent ?? "" };
  for (let i = 1; i <= 10; i++) h.move(6 + 4 * i, 6 + 3 * i, 0.8);
  const up = h.up(), after = b.wp.exportData().nodes.map((n) => (n.pixels ? n.pixels.bytes.length : 0)).join(",");
  return { id, up, steps: e.history.position() - p0, changed: before !== after, hint: document.getElementById("hint")?.textContent ?? "" };
}, tex);
check(Number.isSafeInteger(r.id) && r.up?.landed === true && !r.up?.threw && r.steps === 1 && r.changed, "当前图层是正常的数；落上了、一步、图层变了", JSON.stringify(r));
check(errs.length === 0, "没有页面错误", errs.slice(0, 2).join(" | "));
console.log(`\nprobe-old-blank-paint ${failN ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);
await browser.close();

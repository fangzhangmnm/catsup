// 补洞（纪元账本 DT103，v0.14.67）从编辑条这条路走：缺顶的盒子 → 「补洞…（1 个）」→ 6 张面 → 撤销一步回 5 张。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const rect = [P(0, 0), P(1, 0), P(1, 2), P(0, 2)];
  e.commitOp({ op: "addEdges", at, segs: rect.map((p, i) => [p, rect[(i + 1) % 4]]) });
  e.commitOp({ op: "pushpull", at, face: rect, dist: 1 });
  e.commitOp({ op: "eraseFaces", at, faces: [rect.map((p) => P(p.x, p.y, 1))] });
  e.deselectAll(); e.draw(); await sleep(30);
  const out = { faces0: e.kernel.faces().length, menu: e.repairMenu().map((m) => m.label) };
  C.hud.pick("repair:fillHoles"); await sleep(30);
  out.hint = document.getElementById("hint")?.textContent ?? ""; out.faces1 = e.kernel.faces().length;
  e.undo(); await sleep(20); out.faces2 = e.kernel.faces().length;
  return out;
});
console.log(JSON.stringify(res));
const ok = res.faces0 === 5 && res.menu.includes("补洞…（1 个）") && /补了 1 个洞/.test(res.hint) && res.faces1 === 6 && res.faces2 === 5 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

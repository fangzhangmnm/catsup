// 改段数（回转体，纪元账本 DT94，v0.14.69）从编辑条这条路走：画圆 → 推拉成圆柱 → 「改段数…（1 个回转体）」→ 默认 = 画圆的段数（一样 → 没改，
// 右下角照样打开）→ 选 48 段 → 两圈都是 48 段的圆 → 撤销回 24。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const N = e.config.get("circle", "segments"), pts = Array.from({ length: N }, (_, j) => P(Math.cos((2 * Math.PI * j) / N), Math.sin((2 * Math.PI * j) / N)));
  e.commitOp({ op: "addEdges", at, segs: pts.map((p, i) => [p, pts[(i + 1) % N]]), curve: { kind: "circle", closed: true, params: { center: P(0, 0), radius: 1, normal: P(0, 0, 1), xaxis: P(1, 0, 0), segments: N } } });
  e.commitOp({ op: "pushpull", at, face: pts, dist: 1 });
  e.deselectAll(); e.draw(); await sleep(30);
  const segs = () => e.kernel.curves().filter((c) => c.kind === "circle" && c.params).map((c) => c.params.segments).join();
  const out = { N, menu: e.repairMenu().map((m) => m.label), before: segs() };
  C.hud.pick("repair:resegment"); await sleep(30);
  out.hint0 = document.getElementById("hint")?.textContent ?? ""; out.panelOpen = !!e.paramPanel(); out.same = segs();
  e.setParam("segments", "48"); await sleep(30);
  out.hint48 = document.getElementById("hint")?.textContent ?? ""; out.after = segs(); out.faces = e.kernel.faces().length;
  e.undo(); await sleep(20); out.undo = segs();
  return out;
});
console.log(JSON.stringify(res));
const ok = res.menu.includes("改段数…（1 个回转体）") && res.panelOpen && res.same === res.before && /48 段/.test(res.hint48) && res.after === "48,48" && res.faces === 50 && res.undo === res.before && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

// 焊接（B19，v0.13.5）：画三段折线 → 选中三条边 → 选区菜单有「焊接」→ weldSelection → 一条折线曲线且整条选中 → 撤销回三条散边。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, out = {};
  const P = (x, y, z = 0) => ({ x, y, z });
  e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(2, 1)], [P(2, 1), P(3, 1)]] });
  out.edges = e.kernel.edges().length; out.curvesBefore = e.kernel.curves().length;
  for (const ed of e.kernel.edges()) e.selection.edges.add(ed.id);
  out.canWeld = e.canWeldSelection();
  out.menuHasWeld = globalThis.__catsup.hud.edits().filter((x) => !x.hidden).map((x) => x.id).includes("weld");
  out.welded = e.weldSelection();
  out.curvesAfter = e.kernel.curves().length; out.curveEdges = e.kernel.curves()[0]?.edges.length; out.selectedAfter = e.selection.edges.size;
  out.hasCurveSel = e.hasCurveSelection();
  e.undo(); out.curvesAfterUndo = e.kernel.curves().length; out.edgesAfterUndo = e.kernel.edges().length;
  return out;
});
console.log(JSON.stringify(res));
const ok = res.edges === 3 && res.curvesBefore === 0 && res.canWeld && res.menuHasWeld && res.welded && res.curvesAfter === 1 && res.curveEdges === 3 && res.selectedAfter === 3 && res.hasCurveSel && res.curvesAfterUndo === 0 && res.edgesAfterUndo === 3;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

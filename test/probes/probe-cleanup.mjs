// 清理碎渣（纪元账本 DT102，v0.14.68）从编辑条这条路走：一张面被一条线切成两半 + 旁边一根孤线 → 「清理碎渣…（2 处）」→ 一张面、没有孤线
// → 马后炮四项 → 撤销一步回原样（擦掉中线后上下两条边还在中点断开 = 6 条，并起来是下一步「焊断口」的事）。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const r = [P(0, 0), P(2, 0), P(2, 1), P(0, 1)];
  e.commitOp({ op: "addEdges", at, segs: r.map((p, i) => [p, r[(i + 1) % 4]]) });
  e.commitOp({ op: "addEdges", at, segs: [[P(1, 0), P(1, 1)]] });
  e.commitOp({ op: "addEdges", at, segs: [[P(4, 0), P(5, 0)]] });
  e.deselectAll(); e.draw(); await sleep(30);
  const out = { faces0: e.kernel.faces().length, edges0: e.kernel.edges().length, menu: e.repairMenu().map((m) => m.label) };
  C.hud.pick("repair:cleanup"); await sleep(30);
  out.hint = document.getElementById("hint")?.textContent ?? ""; out.faces1 = e.kernel.faces().length; out.edges1 = e.kernel.edges().length;
  const pp = e.paramPanel(); out.fields = pp ? pp.fields.map((f) => f.key) : null;
  e.undo(); await sleep(20); out.faces2 = e.kernel.faces().length; out.edges2 = e.kernel.edges().length;
  return out;
});
console.log(JSON.stringify(res));
const ok = res.faces0 === 2 && res.menu.includes("清理碎渣…（2 处）") && /清理了 2 处碎渣/.test(res.hint) && res.faces1 === 1 && res.edges1 === 6
  && JSON.stringify(res.fields) === JSON.stringify(["children", "stray", "tinyMm", "coplanar", "softToo"]) && res.faces2 === 2 && res.edges2 === res.edges0 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

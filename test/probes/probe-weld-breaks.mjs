// 焊接全部断口（纪元排期 T7 / 账本 DT5；user「他们语义上就是一个东西，只是作用域……不同」）。断口 = 共线、只连两段、两边挂的面一样的点（画面上的小鼓包）。
// 矩形底边被中点断成两段 + 一条被断成两段的散线：① ☰「焊接全部断口（2）」→ 两处都焊、面还在 ② 撤销回原样 ③ 只选散线 → 选区菜单「焊接断口（1）」只焊它。
// created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(2, 0)], [P(2, 0), P(2, 1)], [P(2, 1), P(0, 1)], [P(0, 1), P(0, 0)]] });
  e.commitOp({ op: "addEdges", segs: [[P(4, 0), P(5, 0)], [P(5, 0), P(6, 0)]] });
  const count = () => ({ edges: e.kernel.edges().length, faces: e.kernel.faces().length, ticks: e.breakTicks().length });
  const out = { before: count(), scopeAll: e.repairCount("weld", "context") };
  out.welded = e.repair("weld", "context"); out.after = count();
  e.undo(); await sleep(20); out.undone = count();
  // 只选散线
  e.cancel();
  for (const ed of e.kernel.edges()) { const a = e.kernel.graph.pt(ed.a); if (a.x >= 4) e.selection.edges.add(ed.id); }
  out.menu = hud.edits().filter((it) => !it.hidden).map((it) => it.label).filter((l) => l.startsWith("焊接断口"));
  hud.pick("repair:weld"); await sleep(20);
  out.afterSel = count();
  return out;
});
console.log(JSON.stringify(res));
const ok = res.before.edges === 7 && res.before.faces === 1 && res.before.ticks === 2 && res.scopeAll === 2 && res.welded === 2
  && res.after.edges === 5 && res.after.faces === 1 && res.after.ticks === 0 && res.undone.edges === 7 && res.undone.ticks === 2
  && res.menu.length === 1 && res.menu[0] === "焊接断口（1）" && res.afterSel.edges === 6 && res.afterSel.ticks === 1 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

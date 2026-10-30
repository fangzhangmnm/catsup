// 拉正（纪元账本 DT101，v0.14.66）从编辑条这条路走：盒子放在不在格点上的地方、一个角歪了 0.2° → 「拉正…（N 个点）」→ 角回原位、盒子不吸格点
// → 右下角马后炮勾「顺便吸到格点」重做 → 全部点在格点上 → 撤销一步回原样。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const x0 = 0.0337, rect = [P(x0, 0), P(x0 + 1, 0), P(x0 + 1, 1), P(x0, 1)];
  e.commitOp({ op: "addEdges", at, segs: rect.map((p, i) => [p, rect[(i + 1) % 4]]) });
  e.commitOp({ op: "pushpull", at, face: rect, dist: 1 });
  e.commitOp({ op: "move", at, moves: [{ from: P(x0 + 1, 1, 1), to: P(x0 + 1.003, 1, 1.002) }] });
  e.deselectAll(); e.draw(); await sleep(30);
  const step = e.grid.snap, on = (c) => Math.abs(c - Math.round(c / step) * step) < 2e-6;
  const menu = e.commandMenu().map((m) => m.label);
  const out = { menu, count: e.repairMenuCount("brep.straighten") };
  C.hud.pick("action:brep.straighten"); await sleep(30);
  out.hint = document.getElementById("hint")?.textContent ?? "";
  const vs = () => e.kernel.vertices();
  out.cornerBack = vs().some((v) => Math.abs(v.x - (x0 + 1)) < 1e-9 && v.y === 1 && v.z === 1) && !vs().some((v) => Math.abs(v.x - (x0 + 1.003)) < 1e-9);
  out.notSnapped = vs().some((v) => Math.abs(v.x - x0) < 1e-9);
  const pp = e.paramPanel(); out.fields = pp ? pp.fields.map((f) => f.key) : null;
  e.setParam("grid", true); await sleep(30);
  out.hintGrid = document.getElementById("hint")?.textContent ?? "";
  out.allOn = vs().every((v) => on(v.x) && on(v.y) && on(v.z));
  e.undo(); await sleep(20);
  out.undoBack = vs().some((v) => Math.abs(v.x - (x0 + 1.003)) < 1e-9);
  return out;
});
console.log(JSON.stringify(res));
const ok = res.menu.some((l) => /^拉正…（\d+ 个点）$/.test(l)) && res.count > 0 && /拉正了 \d+ 个点/.test(res.hint) && res.cornerBack && res.notSnapped
  && JSON.stringify(res.fields) === JSON.stringify(["children", "deg", "frame", "grid", "crease"]) && res.allOn && res.undoBack && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

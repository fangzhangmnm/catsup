// 定稿探针（headless，借 WeebPaint 的 playwright）：无地 → 定稿 → 画线被拒 / undo 被拒 / 角标 + body.doc-final / ☰ 显示「改稿」 → 导出字节带记录 → 改稿解锁。
// 用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-final.mjs [url]`。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 400)));
await page.goto(url, { waitUntil: "load", timeout: 30000 });
await page.waitForTimeout(2500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = await page.evaluate(async () => {
  const g = globalThis.__catsup; const e = g.editor, s = g.session;
  const out = {};
  // 先画一条线：有内容
  const r0 = e.revision;
  e.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 0, z: 0 }, { x: 1, y: 0, z: 0 }]] });
  out.drewBefore = e.revision !== r0;
  out.finalBefore = s.finalRecord();
  await s.finalize();
  out.locked = e.locked;
  out.rec = s.finalRecord();
  out.rev = s.finalRev();
  out.badge = document.getElementById("finalBadge")?.hidden === false ? document.getElementById("finalBadge").textContent : null;
  out.bodyClass = document.body.classList.contains("doc-final");
  const r1 = e.revision;
  const ev = e.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 1, z: 0 }, { x: 1, y: 1, z: 0 }]] });
  out.refused = Array.isArray(ev) && ev.length === 0 && e.revision === r1;
  e.undo(); out.undoRefused = e.revision === r1;
  // 导出字节里带记录
  const bytes = s.encode();   // 导出走的同一条编码路（TS private，探针直呼）
  out.exportHasFinal = new TextDecoder().decode(bytes).includes('"final"');
  await s.revise();
  out.unlocked = !e.locked && s.finalRecord() === null && s.finalRev() === 1;
  out.bodyClassAfter = document.body.classList.contains("doc-final");
  const r2 = e.revision;
  e.commitOp({ op: "addEdges", segs: [[{ x: 0, y: 2, z: 0 }, { x: 1, y: 2, z: 0 }]] });
  out.drewAfter = e.revision !== r2;
  return out;
});
console.log(JSON.stringify(res, null, 1));
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)");
await b.close();

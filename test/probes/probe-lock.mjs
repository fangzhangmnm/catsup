// 锁定（A27，v0.13.4；0.14 起锁只给实例——组不是物体）：盒子 → 全选建组件 → 锁定 → 整体移 / 删除 / 进入全被拦（revision 不动、上下文不变）→ 解锁 → 能移。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const res = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, out = {};
  const S = 2, H = 1.5, P = (x, y, z = 0) => ({ x, y, z });
  const loops = [[P(0, 0), P(S, 0), P(S, S), P(0, S)], [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)], [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)], [P(S, S), P(0, S), P(0, S, H), P(S, S, H)], [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]];
  for (const l of loops) e.commitOp({ op: "addEdges", segs: l.map((p, i) => [p, l[(i + 1) % l.length]]) });
  out.boxFaces = e.kernel.faces().length;
  // 全选：用 marquee 太绕，直接把所有面和边塞进选区（私有字段，探针直呼）
  const k = e.kernel; for (const f of k.faces()) e.selection.faces.add(f.id); for (const ed of k.edges()) e.selection.edges.add(ed.id);
  e.makeComponent("盒"); out.grouped = e.sceneRef.def(e.sceneRef.root).instances.size === 1;
  out.poolSel = e.hasPoolSelection();
  const def = e.sceneRef.root, iid = [...e.sceneRef.def(def).instances.keys()][0];
  out.lockItemBefore = globalThis.__catsup.hud.edits().filter((x) => !x.hidden).map((x) => x.id);
  out.locked = e.lockSelection(true);
  out.hasLocked = e.hasLockedSelection();
  out.lockItemAfter = globalThis.__catsup.hud.edits().filter((x) => !x.hidden).map((x) => x.id);
  const r0 = e.revision;
  const ev = e.commitOp({ op: "transformInstance", def, instance: iid, xform: [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0] });
  out.moveRefused = ev.length === 0 && e.revision === r0;
  e.deleteSelection(); out.deleteRefused = e.revision === r0 && e.sceneRef.def(def).instances.size === 1;
  e.enterSelected(); out.enterRefused = e.contextDepth() === 0;
  out.unlocked = e.lockSelection(false);
  const r1 = e.revision;
  e.commitOp({ op: "transformInstance", def, instance: iid, xform: [1, 0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0] });
  out.moveAfterUnlock = e.revision === r1 + 1;
  return out;
});
console.log(JSON.stringify(res));
const ok = res.boxFaces === 6 && res.grouped && res.poolSel && res.lockItemBefore.includes("lock") && !res.lockItemBefore.includes("unlock") && res.locked && res.hasLocked && res.lockItemAfter.includes("unlock") && res.moveRefused && res.deleteRefused && res.enterRefused && res.unlocked && res.moveAfterUnlock;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

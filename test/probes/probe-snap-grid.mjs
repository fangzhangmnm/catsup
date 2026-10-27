// 吸到格点（纪元排期 T8 / 账本 DT4）从界面这条路走：右键菜单的数字 → 应用 → 提示行披露 → 右下角马后炮四项 → 改「按世界格点」重做。
// 场景：根上一个盒子（一个角挪了 1 mm）+ 组件 A（一张 1×1 的面，摆在 x = 5.03：组件原点不在世界格点上；定义里一个点挪了 3 mm）。
// 按物体自己的坐标架（默认）：只把两个挪歪的点拉回来（A 在自己的坐标架里本来就在格上）；按世界格点：A 的四个点都挪到世界格点。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, s = () => e.scene, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const P = (x, y, z = 0) => ({ x, y, z });
  const rect = (x, y, w, h) => [[P(x, y), P(x + w, y)], [P(x + w, y), P(x + w, y + h)], [P(x + w, y + h), P(x, y + h)], [P(x, y + h), P(x, y)]];
  e.commitOp({ op: "addEdges", at, segs: rect(0, 0, 1, 1) });
  e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.commitOp({ op: "move", at, moves: [{ from: P(1, 1, 1), to: P(1.001, 1, 1.001) }] });
  e.commitOp({ op: "addEdges", at, segs: rect(5.03, 0, 1, 1) });
  e.commitOp({ op: "makeComponent", at, faces: [[P(5.03, 0), P(6.03, 0), P(6.03, 1), P(5.03, 1)]], edges: [], name: "A" });
  const inst = Math.max(...s().def(s().root).instances.keys()), A = s().def(s().root).instances.get(inst).def, aAt = { def: A, group: null };
  const kA = () => s().kernelOf(aAt), v0 = kA().vertices()[0];
  e.commitOp({ op: "move", at: aAt, moves: [{ from: { x: v0.x, y: v0.y, z: v0.z }, to: { x: v0.x + 0.003, y: v0.y, z: v0.z } }] });
  e.deselectAll(); e.draw();
  const step = e.grid.step / e.grid.subdiv, on = (c) => Math.abs(c - Math.round(c / step) * step) < 2e-6;
  const allOn = (pts) => pts.every((p) => on(p.x) && on(p.y) && on(p.z));
  const X = () => s().def(s().root).instances.get(inst).xform, world = (p) => { const m = X(); return { x: m[0] * p.x + m[1] * p.y + m[2] * p.z + m[3], y: m[4] * p.x + m[5] * p.y + m[6] * p.z + m[7], z: m[8] * p.x + m[9] * p.y + m[10] * p.z + m[11] }; };
  const out = { step, count: e.repairCount("snap") };
  out.n = e.repair("snap"); await sleep(30);
  out.hint = document.getElementById("hint")?.textContent ?? "";
  out.rootOn = allOn(e.kernel.vertices());
  out.aOwnOn = allOn(kA().vertices());
  out.aWorldOnBefore = allOn(kA().vertices().map(world));
  const pp = e.paramPanel(); out.fields = pp ? pp.fields.map((f) => f.key) : null;
  e.setParam("frame", "world"); await sleep(30);
  out.hintWorld = document.getElementById("hint")?.textContent ?? "";
  out.aWorldOn = allOn(kA().vertices().map(world));
  out.undoBack = (() => { e.undo(); return !allOn(e.kernel.vertices()); })();   // 撤一次 = 整个修复一步撤完（马后炮重做过也是一步）
  return out;
});
console.log(JSON.stringify(res));
const ok = res.count === 2 && res.n === 2 && /吸了 2 个点到格点/.test(res.hint) && /作用于：整个物体；含 1 个组件/.test(res.hint)
  && res.rootOn && res.aOwnOn && !res.aWorldOnBefore && JSON.stringify(res.fields) === JSON.stringify(["children", "step", "frame", "crease", "curves", "straighten"])
  && res.aWorldOn && /吸了 \d+ 个点到格点/.test(res.hintWorld) && res.undoBack && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

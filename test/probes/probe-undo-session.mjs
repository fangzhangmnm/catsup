// 撤销 / 重做带着会话走（2026-10-26 重设计）。user：「undo似乎全坏了，可能需要系统大修。涉及组件的修改进出之类的」「undo你先修，不要ad hoc，而是思考系统重新设计」。
// 每一步存「之前 / 之后」的会话 = 在哪个组件里 + 选区；撤销 = 场景和会话一起回到之前，重做 = 一起回到之后（这一步结束时封的，2026-10-28 起；以前是撤销那一刻）。设计稿 ai-docs/20261026-undo-session-redesign.md。
// ① 进第二份组件、选中顶面、推拉 0.5、退出 → Ctrl+Z：顶面回去、人回到那份组件里、选区 = 顶面 ② Ctrl+Y：顶面又上去、人回到最外层（撤销时在那）
// ③ 组件里画线 → 组件里 Ctrl+Z：线没了、人还在组件里 ④ 一路撤到「建组件」之前：人退回最外层、不报错 ⑤ 一路重做回来：场景逐步和当初一致。
// created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const key = (k) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: true, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const sig = () => [...e.scene.defs.entries()].sort((a, b) => a[0] - b[0]).map(([id, d]) => `D${id}:` + (d.body.kind === "brep" ? `${d.body.kernel.faces().length}f${d.body.kernel.edges().length}e` + d.body.kernel.vertices().map((v) => `${v.x.toFixed(3)},${v.y.toFixed(3)},${v.z.toFixed(3)}`).sort().join(";") : "") + "{" + [...d.instances.values()].map((i) => `${i.def}@${i.xform.map((v) => v.toFixed(3)).join(",")}`).sort().join("/") + "}").join("\n");
  const depth = () => e.contextCrumbs().length - 1;   // 0 = 最外层
  const S = () => e.scene, root = () => S().def(S().root);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  const sigs = [sig()];
  box(0, 0, 0, 1, 1, 1); sigs.push(sig());
  e.selectAll(); e.makeComponent("块"); sigs.push(sig());   // 选区 = 新实例（复制要用）
  e.copyInstance(P(2, 0, 0)); e.cancel(); sigs.push(sig());
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.3; e.draw();
  const inst2 = [...root().instances.values()][1], def = inst2.def, T = inst2.xform;
  // ① 进第二份、选顶面、推拉 0.5、退出
  e.selectedPools.clear(); e.selectedPools.set(`i${inst2.id}`, { kind: "instance", instance: inst2.id }); e.enterSelected();
  const k = S().def(def).body.kernel, top = k.faces().find((f) => k.faceRings3(f.id).outer.every((q) => Math.abs(q.z - 1) < 1e-9));
  e.selection.faces.add(top.id); e.draw();
  const o = k.faceRings3(top.id).outer, cl = o.reduce((a, q) => ({ x: a.x + q.x / o.length, y: a.y + q.y / o.length }), { x: 0, y: 0 });
  const wTop = { x: cl.x + T[3], y: cl.y + T[7], z: 1 + T[11] };
  e.setTool("pp"); await sleep(20);
  { const a = px(wTop), z = px({ ...wTop, z: wTop.z + 0.5 }); fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1); for (let i = 1; i <= 10; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 10, a.y + (z.y - a.y) * i / 10, 1); await sleep(16); } await sleep(60); fire("pointerup", z.x, z.y, 0); await sleep(40); }
  const topZ = () => Math.max(...S().def(def).body.kernel.vertices().map((v) => v.z));
  out.pushed = +topZ().toFixed(3); sigs.push(sig());
  e.setTool("select"); e.exitContext();
  out.depthBeforeUndo = depth();
  key("z"); await sleep(40);
  out.undo1 = { topZ: +topZ().toFixed(3), depth: depth(), selFaces: e.selection.faces.size, selIsTop: e.selection.faces.has(top.id), ok: sig() === sigs[3] };
  key("y"); await sleep(40);
  out.redo1 = { topZ: +topZ().toFixed(3), depth: depth(), ok: sig() === sigs[4] };
  // ③ 组件里画线 → 组件里撤（2026-10-28 起重做回到「这一步刚做完」= 还在组件里，不用再进；以前重做回到「撤销那一刻」= 根）
  if (depth() !== 1) throw new Error(`重做之后应该还在组件里，depth=${depth()}`);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(-0.3, -0.3, 1.5), P(0.3, 0.3, 1.5)]] }); sigs.push(sig());
  key("z"); await sleep(40);
  out.undoInside = { depth: depth(), ok: sig() === sigs[4] };
  // ④ 一路撤到最开头（中途撤掉「建组件」时人在组件里）
  let threw = false;
  try { for (let i = 0; i < 10 && e.history.position() > 0; i++) { key("z"); await sleep(30); } } catch { threw = true; }
  out.undoAll = { depth: depth(), ok: sig() === sigs[0], threw };
  // ⑤ 一路重做（推拉那一步之后应该和 sigs[4] 一致）
  const redoSigs = [];
  for (let i = 0; i < 10; i++) { const p0 = e.history.position(); key("y"); await sleep(30); if (e.history.position() === p0) break; redoSigs.push(sig()); }
  // 7 步 = 盒 / 全选（只改选区的一步，几何不变；2026-10-27 起选区进撤销）/ 建组件 / 复制 / 取消选择（Esc 清掉选区 = 选区步，2026-10-28 起 cancel 也是一步）/ 推拉 / 组件里那条线（③ 撤掉后还在重做队列里）
  const want = [sigs[1], sigs[1], sigs[2], sigs[3], sigs[3], sigs[4], sigs[5]];
  out.redoAll = { steps: redoSigs.length, ok: redoSigs.length === 7 && redoSigs.every((s2, i) => s2 === want[i]) };
  return out;
});
console.log(JSON.stringify(res));
const ok = res.pushed === 1.5 && res.depthBeforeUndo === 0
  && res.undo1.ok && res.undo1.topZ === 1 && res.undo1.depth === 1 && res.undo1.selIsTop && res.undo1.selFaces === 1
  && res.redo1.ok && res.redo1.topZ === 1.5 && res.redo1.depth === 1   // 重做回到「这一步刚做完」= 还在组件里（2026-10-28 起；以前 = 撤销那一刻 = 根）
  && res.undoInside.ok && res.undoInside.depth === 1
  && res.undoAll.ok && res.undoAll.depth === 0 && !res.undoAll.threw && res.redoAll.ok && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

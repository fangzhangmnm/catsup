// 分开 / 合并物体（Editor.separateSelection / joinSelection，op separateObject / joinObjects；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「6非常重要，67放右键」）。
// 网格体组件挪到 (3, 1, 0)、绕 Z 30°——① 进去选顶面、右键有「分开（成新物体）」、点它 = 最外层多一个组件（1 张面），原来的剩 5 张；那张面的世界坐标一点没动；一步
// ② 撤销 = 回到一个组件 6 张面 ③ 再分一次、出来到最外层、选两个组件、Ctrl+J = 合回一个（6 张面）、世界坐标不动 ④ 撤销 = 两个。跑法：python3 -m http.server 8765 后 node test/probes/probe-separate-join.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const r = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const root = () => e.scene.def(e.scene.root), inst0 = [...root().instances.values()][0];   // 场景对象现取：整场景记录的撤销会换掉它
  const c = Math.cos(Math.PI / 6), sn = Math.sin(Math.PI / 6);
  e.commitOp({ op: "transformInstance", def: e.scene.root, instance: inst0.id, xform: [c, -sn, 0, 3, sn, c, 0, 1, 0, 0, 1, 0] });
  const W = (inst, p) => { const X = inst.xform; return { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }; };
  const worldPts = () => [...root().instances.values()].flatMap((i) => { const m = e.scene.mesh(i.def).kernel; return m.faces().flatMap((f) => m.faceVerts(f).map((v) => { const w = W(i, m.pt(v)); return `${w.x.toFixed(6)},${w.y.toFixed(6)},${w.z.toFixed(6)}`; })); }).sort().join(";");
  const counts = () => [...root().instances.values()].map((i) => e.scene.mesh(i.def).kernel.faceCount()).sort((a, b) => a - b).join(",");
  const enter = async (inst) => { e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20); };
  const out = {}, w0 = worldPts();
  // ①
  await enter(inst0);
  const m = e.scene.mesh(inst0.def).kernel, zt = Math.max(...m.verts().map((v) => m.pt(v).z)), top = m.faces().find((f) => m.faceVerts(f).every((v) => Math.abs(m.pt(v).z - zt) < 1e-9));
  e.deselectAll(); e.selection.faces.add(top);
  out.menu = hud.edits().filter((x) => !x.hidden).map((x) => x.label).join(" | ");
  const st0 = e.history.steps();
  hud.pick("separate"); await sleep(20);
  out.one = { counts: counts(), same: worldPts() === w0, steps: e.history.steps() - st0, depth: e.ctx.chain.length };
  // ②
  e.undo(); await sleep(20);
  out.two = { counts: counts() };
  // ③
  e.deselectAll(); e.selection.faces.add(top); hud.pick("separate"); await sleep(20);
  e.exitTo(0); await sleep(20);
  e.deselectAll(); for (const i of root().instances.values()) e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id });
  out.joinMenu = hud.edits().filter((x) => !x.hidden).map((x) => x.label).join(" | ");
  const st1 = e.history.steps();
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "j", code: "KeyJ", ctrlKey: true, bubbles: true, cancelable: true })); await sleep(30);
  out.three = { counts: counts(), same: worldPts() === w0, steps: e.history.steps() - st1, check: e.scene.mesh([...root().instances.values()][0].def).kernel.check().join(";") };
  // ④
  e.undo(); await sleep(20);
  out.four = { counts: counts(), same: worldPts() === w0 };
  return out;
});
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = /分开（成新物体）/.test(r.menu) && r.one.counts === "1,5" && r.one.same && r.one.steps === 1 && r.two.counts === "6"
  && /合并物体/.test(r.joinMenu) && r.three.counts === "6" && r.three.same && r.three.steps === 1 && r.four.counts === "1,5" && r.four.same && errs.length === 0;
console.log(ok ? "probe-separate-join OK" : "probe-separate-join FAIL");
process.exit(ok ? 0 : 1);

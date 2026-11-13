// 压平 + 缩放时的快捷值（白模第一批 W-5；created 2026-11-10 by Claude Opus 5.5；editor/mesh-edits 的 mesh.flatten.*、mesh/ops/flatten.ts、app/vcb.ts 快捷值、main.ts 缩放工具条「压平…」）。
// 网格体立方体、进到它里面：
// ① 顶上一圈点弄歪 → 右键「压平 › 沿 Z」= 这一圈 z 都等于平均值、一步；马后炮「压到」换成最后选中的那个点 = z 都等于它；撤销一步回原样；镜像没开 = 菜单里没有「到镜像面」
// ② 一圈斜着、带乱的点 → 「沿这圈的朝向」= 四个点共面（以前不共面）；撤销回原样
// ③ 左面（x = −0.5）四个点挪到离中缝（x = 0）差几毫米、开镜像（X）→ 「到镜像面」= x 正好是 0；撤销回原样
// ④ 键盘 S 起手缩放：没锁轴时快捷值那排不出；按 X 锁轴才出；点「0」= 这一圈 x 都相等（压平）、手势收了、一步
// ⑤ 缩放工具、有选区：右下角「压平…」→ 弹出来的就是那几项（没开镜像 = 没有「到镜像面」）→ 点「沿 Z」= z 都相等
// ⑥ 没有页面错误。跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-flatten.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = {};
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0];
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.setTool("select"); e.deselectAll();
  const m = () => S.mesh(inst.def).kernel;
  const near = (v, x, y, z) => { const p = m().pt(v); return Math.abs(p.x - x) < 1e-9 && Math.abs(p.y - y) < 1e-9 && Math.abs(p.z - z) < 1e-9; };
  const find = (x, y, z) => m().verts().find((v) => near(v, x, y, z));
  window.__f = {
    def: inst.def, m,
    top: [find(-0.5, -0.5, 1), find(0.5, -0.5, 1), find(0.5, 0.5, 1), find(-0.5, 0.5, 1)],   // 组件里的坐标：原点在底面中心（x / y ∈ [−0.5, 0.5]，z ∈ [0, 1]）；镜像面 x = 0 = 正中间
    left: [find(-0.5, -0.5, 0), find(-0.5, 0.5, 0), find(-0.5, 0.5, 1), find(-0.5, -0.5, 1)],
    set: (vs, f) => { e.commitOp({ op: "meshMove", def: inst.def, moves: vs.map((v, i) => ({ v, to: f(m().pt(v), i) })) }); },
    pick: (vs) => { e.deselectAll(); for (const v of vs) e.selection.verts.add(v); },   // 按这个顺序选：最后一个 = 最后选中的
    pts: (vs) => vs.map((v) => { const p = m().pt(v); return [p.x, p.y, p.z]; }),
    menu: () => e.commandMenu().map((x) => x.id),
  };
});
// ① 右键「压平 › 沿 Z」+ 马后炮 + 撤销
res.one = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, F = window.__f, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const dz = [0.2, -0.1, 0.05, 0];
  F.set(F.top, (p, i) => ({ x: p.x, y: p.y, z: 1 + dz[i] })); await sleep(20);
  F.pick(F.top); await sleep(20);
  const before = F.pts(F.top), pos0 = e.history.position();   // 选区变化本身也记一步：换完选区再数
  const menu = F.menu();
  hud.pick("action:mesh.flatten.z"); await sleep(40);
  const zs = F.pts(F.top).map((p) => p[2]), mean = 1 + (0.2 - 0.1 + 0.05 + 0) / 4;
  const panel = document.querySelector(".vcb-params:not([hidden]) .vcb-params-title")?.textContent ?? "";
  const afterMean = { spread: Math.max(...zs) - Math.min(...zs), offMean: Math.abs(zs[0] - mean), steps: e.history.position() - pos0, hint: hud.status() };
  e.setParam("to", "last"); await sleep(40);
  const zs2 = F.pts(F.top).map((p) => p[2]);
  const afterLast = { spread: Math.max(...zs2) - Math.min(...zs2), offLast: Math.abs(zs2[0] - 1), steps: e.history.position() - pos0 };
  e.undo(); await sleep(30);
  const undone = JSON.stringify(F.pts(F.top)) === JSON.stringify(before);
  return { menuHas: ["mesh.flatten.x", "mesh.flatten.y", "mesh.flatten.z", "mesh.flatten.normal"].every((id) => menu.includes(id)), mirrorItem: menu.includes("mesh.flatten.mirror"), panel, afterMean, afterLast, undone, check: F.m().check().join(";") };
});
// ② 沿这圈的朝向
res.two = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, F = window.__f, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const noise = [0.03, -0.02, 0.025, -0.01];
  F.set(F.top, (p, i) => ({ x: p.x, y: p.y, z: 1 + 0.3 * p.x + 0.15 * p.y + noise[i] })); await sleep(20);
  const det = () => { const [a, b, c, d] = F.pts(F.top); const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]], w = [d[0] - a[0], d[1] - a[1], d[2] - a[2]]; return u[0] * (v[1] * w[2] - v[2] * w[1]) - u[1] * (v[0] * w[2] - v[2] * w[0]) + u[2] * (v[0] * w[1] - v[1] * w[0]); };
  F.pick(F.top); await sleep(20);
  const before = F.pts(F.top), det0 = det(), pos0 = e.history.position();
  hud.pick("action:mesh.flatten.normal"); await sleep(40);
  const r = { det0: +det0.toExponential(3), det1: +det().toExponential(3), steps: e.history.position() - pos0, check: F.m().check().join(";"), hint: hud.status() };
  e.undo(); await sleep(30);
  r.undone = JSON.stringify(F.pts(F.top)) === JSON.stringify(before);
  return r;
});
// ③ 到镜像面
res.three = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, F = window.__f, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const dx = [0.003, -0.002, 0.004, 0.0005];
  F.set(F.left, (p, i) => ({ x: dx[i], y: p.y, z: p.z })); await sleep(20);
  e.commitOp({ op: "setMeshMirror", def: F.def, mirror: { mode: "edit", axis: 0 } }); await sleep(20);
  F.pick(F.left); await sleep(20);
  const before = F.pts(F.left), pos0 = e.history.position();
  const menu = F.menu();
  hud.pick("action:mesh.flatten.mirror"); await sleep(40);
  const xs = F.pts(F.left).map((p) => p[0]);
  const r = { mirrorItem: menu.includes("mesh.flatten.mirror"), xs, exactZero: xs.every((x) => x === 0), steps: e.history.position() - pos0, check: F.m().check().join(";"), hint: hud.status() };
  e.undo(); await sleep(30);
  r.undone = JSON.stringify(F.pts(F.left)) === JSON.stringify(before);
  e.commitOp({ op: "setMeshMirror", def: F.def, mirror: null }); await sleep(20);   // 关掉镜像，后面两节不受它影响
  return r;
});
// ④ 键盘 S 起手、锁 X、点快捷值「0」
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, F = window.__f, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  F.set(F.top, (p, i) => ({ x: p.x + [0.05, -0.04, 0.02, -0.03][i], y: p.y, z: p.z })); await sleep(20);
  F.pick(F.top); globalThis.__catsup.hud.pick("scale"); await sleep(40);
  window.__f.pos4 = e.history.position();
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), s = e.cam.angularPx({ x: 0.5, y: 0.5, z: 1 }, e.vp());
  c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + s.x + 40, clientY: r.top + s.y + 20, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: 0 })); await sleep(30);
});
const quickShown = () => page.evaluate(() => { const q = document.querySelector(".vcb-quick"); return !!q && !q.hidden && q.offsetParent !== null; });
await page.keyboard.press("s"); await page.waitForTimeout(80);
res.four = { started: await page.evaluate(() => ({ active: globalThis.__catsup.editor.isGestureActive(), tool: globalThis.__catsup.editor.tool })), quickBeforeLock: await quickShown() };
await page.keyboard.press("x"); await page.waitForTimeout(80);
res.four.lock = await page.evaluate(() => { const k = globalThis.__catsup.editor.axisConstraintNow(); return k.kind === "line" && Math.abs(Math.abs(k.dir.x) - 1) < 1e-9 ? "x" : JSON.stringify(k); });   // 手势里按的 X = 轴键那份（锁的一轮第二步），不进按钮锁
res.four.quickAfterLock = await quickShown();
res.four.labels = await page.evaluate(() => [...document.querySelectorAll(".vcb-quick button")].map((x) => x.textContent).join(" "));
if (res.four.quickAfterLock) { await page.click(".vcb-quick button:has-text('0')"); await page.waitForTimeout(80); }
res.four.after = await page.evaluate(() => { const e = globalThis.__catsup.editor, F = window.__f, xs = F.pts(F.top).map((p) => p[0]); return { active: e.isGestureActive(), spread: Math.max(...xs) - Math.min(...xs), steps: e.history.position() - F.pos4, check: F.m().check().join(";") }; });
await page.evaluate(async () => { globalThis.__catsup.editor.undo(); await new Promise((r) => setTimeout(r, 30)); });
// ⑤ 缩放工具右下角「压平…」
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, F = window.__f;
  F.set(F.top, (p, i) => ({ x: p.x, y: p.y, z: 1 + [0.1, 0, -0.05, 0.02][i] }));
  F.pick(F.top); globalThis.__catsup.hud.pick("select"); globalThis.__catsup.hud.pick("scale"); await new Promise((r) => setTimeout(r, 60));
  window.__f.pos5 = e.history.position();
});
const flatBtn = await page.$("#toolStrip button:has-text('压平…')");
res.five = { button: !!flatBtn };
if (flatBtn) {
  await flatBtn.click(); await page.waitForTimeout(120);
  res.five.items = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-item")].map((x) => x.textContent.replace(/\s+/g, " ").trim()));
  const item = await page.$(".popup-menu .menu-item:has-text('沿 Z')");
  if (item) { await item.click(); await page.waitForTimeout(80); }
  res.five.after = await page.evaluate(() => { const e = globalThis.__catsup.editor, F = window.__f, zs = F.pts(F.top).map((p) => p[2]); return { spread: Math.max(...zs) - Math.min(...zs), steps: e.history.position() - F.pos5, hint: globalThis.__catsup.hud.status() }; });
}
await b.close();
res.errs = errs;
const E = 1e-12;
const ok = res.one.menuHas && !res.one.mirrorItem && res.one.panel === "刚才：压平" && res.one.afterMean.spread <= E && res.one.afterMean.offMean <= E && res.one.afterMean.steps === 1
  && res.one.afterLast.spread <= E && res.one.afterLast.offLast <= E && res.one.afterLast.steps === 1 && res.one.undone && res.one.check === ""
  && Math.abs(res.two.det0) > 1e-4 && Math.abs(res.two.det1) <= 1e-12 && res.two.steps === 1 && res.two.check === "" && res.two.undone
  && res.three.mirrorItem && res.three.exactZero && res.three.steps === 1 && res.three.check === "" && res.three.undone
  && res.four.started.active && res.four.started.tool === "scale" && !res.four.quickBeforeLock && res.four.lock === "x" && res.four.quickAfterLock
  && !res.four.after.active && res.four.after.spread <= E && res.four.after.steps === 1 && res.four.after.check === ""
  && res.five.button && res.five.items?.length === 4 && !res.five.items.some((t) => t.includes("镜像")) && res.five.after?.spread <= E && res.five.after?.steps === 1
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-flatten OK" : "probe-mesh-flatten FAIL");
process.exit(ok ? 0 : 1);

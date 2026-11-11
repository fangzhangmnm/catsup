// 刀和环切做完进参数小窗、小窗有「确定」（白模 W-8，created 2026-11-10 by Claude Opus 5.5；施工单 ai-docs/20261110-whitebox-batch1.md W-8 + Fable 11-10 裁定）。网格体盒子里——
// ① Ctrl+R 环切：小窗「环切」有确定；位置改 0.3 → 那一圈跟着滑（新点都在同一个高度）；圈数改 3 → 18 张面、位置那一行灰掉；Ctrl+Z 一次 = 回到没切、小窗收起
// ② 选一条边、浮条「环切」：同一个小窗；位置改 0.25 → 那圈在 0.25 / 0.75；点「确定」= 小窗收起、提示「环切：定了」
// ③ 刀切一刀（竖边上的点 → 顶边中点），收刀（左下钮那条路）→ 小窗「切割」两行；悬在第 1 行 = 模型上标出那个点、离开 = 不标；
//    第 2 点改 0.25 → 新点挪过去、面数不变；第 1 点改 1（端头）→ 退回原值、提示说端头、模型不动；Esc 收刀也开小窗；点确定收起
// ④ 插入、倒角（浮条指令）的小窗也有确定（第二次 Esc 没选区 = 照老规矩退出组件，先进回去）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-afterthought-ok.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const tap = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(15); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(40); };
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: k === "Escape" ? "Escape" : "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const q = (x) => +x.toFixed(4), out = {};
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const S = e.scene, inst = [...S.def(S.root).instances.values()][0], m = () => S.mesh(inst.def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const pp = () => { const s = e.paramPanel(); return s ? { title: s.title, keys: s.fields.map((f) => f.key), labels: s.fields.map((f) => f.def.label), buttons: s.buttons.map((x) => x.label), values: { ...s.values } } : null; };
  const zsOf = (vs) => [...new Set(vs.map((v) => q(m().pt(v).z)))].sort((a, b) => a - b);
  const orig = new Set(m().verts()), f0 = m().faceCount();
  // ① Ctrl+R 环切
  e.setTool("knife"); e.armLoopCut(); await sleep(20); await tap(P(1, 0, 0.5));
  out.loop = { panel: pp(), faces: m().faceCount() };
  e.setParam("t", 0.3); await sleep(20);
  out.loopSlide = { z: zsOf(m().verts().filter((v) => !orig.has(v))), faces: m().faceCount(), check: m().check().join(";") };
  e.setParam("cuts", 3); await sleep(30);
  out.loop3 = { faces: m().faceCount(), z: zsOf(m().verts().filter((v) => !orig.has(v))), off: document.querySelectorAll(".vcb-params-fields .off").length, panel: pp()?.values };
  key("z"); await sleep(40);
  out.loopUndo = { faces: m().faceCount(), panel: pp() };
  // ② 浮条「环切」（有选区）
  e.setTool("select"); e.deselectAll(); await sleep(700);
  { const s = px(P(1, 0, 0.5)); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(30); }
  const menu = e.commandMenu().map((x) => x.id); if (menu.includes("mesh.loopCut")) hud.pick("action:mesh.loopCut"); await sleep(30);
  out.menuLoop = { panel: pp() };
  e.setParam("t", 0.25); await sleep(20);
  out.menuSlide = { z: zsOf([...e.selection.edges].flatMap((x) => [m().edgeA[x], m().edgeB[x]])) };
  const ok = [...document.querySelectorAll(".vcb-params-buttons button")].find((x) => x.textContent === "确定");
  ok?.click(); await sleep(30);
  out.menuOk = { found: !!ok, panel: pp(), hint: hud.status() };
  key("z"); await sleep(40); e.deselectAll(); await sleep(700);
  // ③ 刀切一刀：竖边 (1,0,z) 上的点 → 顶边 (1,y,1) 中点；收刀走左下钮那条路（finishChain）
  const before = m().faceCount();
  e.setTool("knife"); await sleep(20); await tap(P(1, 0, 0.4)); await tap(P(1, 0.5, 1));
  out.cut = { dfaces: m().faceCount() - before, active: e.isGestureActive() };
  e.finishChain(); await sleep(30);
  out.knife = { panel: pp(), active: e.isGestureActive() };
  const rows = [...document.querySelectorAll(".vcb-params-fields > *")];
  rows[0]?.dispatchEvent(new PointerEvent("pointerenter")); await sleep(20);
  const mark = e.snapInfo ? { x: q(e.snapInfo.p.x), y: q(e.snapInfo.p.y), z: q(e.snapInfo.p.z) } : null;
  rows[0]?.dispatchEvent(new PointerEvent("pointerleave")); await sleep(20);
  out.mark = { on: mark, off: e.snapInfo ?? null };
  const snapGeom = () => JSON.stringify(m().verts().map((v) => { const p = m().pt(v); return [v, q(p.x), q(p.y), q(p.z)]; }));
  // 网格体是组件里的本地坐标（原点挪过）：按本地的最大 / 最小值找右侧顶边上的点，y 换成 0–1 里的比例
  const ext = (a, f) => f(...m().verts().map((v) => m().pt(v)[a]));
  const topYs = () => { const X = ext("x", Math.max), Z = ext("z", Math.max), y0 = ext("y", Math.min), y1 = ext("y", Math.max); return m().verts().filter((v) => Math.abs(m().pt(v).x - X) < 1e-6 && Math.abs(m().pt(v).z - Z) < 1e-6).map((v) => q((m().pt(v).y - y0) / (y1 - y0))).sort((a, b) => a - b); };
  out.topBefore = topYs();
  e.setParam("p1", 0.25); await sleep(20);
  out.topAfter = topYs();
  out.knifeSlide = { faces: m().faceCount() - before, moved: out.topBefore.join() === "0,0.5,1" && (out.topAfter.join() === "0,0.25,1" || out.topAfter.join() === "0,0.75,1"), check: m().check().join(";") };
  const g1 = snapGeom(), v0 = e.paramPanel()?.values.p0;
  e.setParam("p0", 1); await sleep(20);
  out.knifeRefuse = { same: snapGeom() === g1, p0: e.paramPanel()?.values.p0, was: v0, hint: hud.status(), panel: !!pp() };
  const ok2 = [...document.querySelectorAll(".vcb-params-buttons button")].find((x) => x.textContent === "确定"); ok2?.click(); await sleep(30);
  out.knifeOk = { panel: pp(), hint: hud.status() };
  // Esc 收刀也开小窗
  await tap(P(1, 1, 0.4)); await tap(P(1, 0.5, 0)); key("Escape", false); await sleep(30);
  out.esc = { panel: pp()?.title ?? null, active: e.isGestureActive() };
  key("Escape", false); await sleep(30);
  out.esc2 = { panel: pp() };
  // ④ 插入、倒角的小窗也有确定
  e.setTool("select"); e.deselectAll(); await sleep(50);
  if (e.contextDepth() === 0) { e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); }   // 第二次 Esc 没选区 = 照老规矩退出了组件：进回去
  const Z = ext("z", Math.max), top = m().faces().find((f) => m().faceVerts(f).every((v) => Math.abs(m().pt(v).z - Z) < 1e-6));
  e.toolCtx.setSelection({ faces: [top] }); await sleep(20);   // 选区直接设（这一步验的是小窗，不是拾取）
  if (e.commandMenu().some((x) => x.id === "mesh.inset")) hud.pick("action:mesh.inset"); await sleep(30);
  out.inset = pp();
  key("z"); await sleep(40); e.deselectAll(); await sleep(50);
  e.toolCtx.setSelection({ edges: [m().fEdges(top)[0]] }); await sleep(20);
  if (e.commandMenu().some((x) => x.id === "mesh.bevel")) hud.pick("action:mesh.bevel"); await sleep(30);
  out.bevel = pp();
  out.f0 = f0;
  return out;
});
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const okBtn = (p) => !!p && p.buttons.includes("确定");
const ok = okBtn(res.loop.panel) && res.loop.panel.title === "环切" && res.loop.faces === res.f0 + 4
  && res.loopSlide.z.length === 1 && (res.loopSlide.z[0] === 0.3 || res.loopSlide.z[0] === 0.7) && res.loopSlide.faces === res.f0 + 4 && res.loopSlide.check === ""
  && res.loop3.faces === res.f0 + 12 && res.loop3.z.join() === "0.25,0.5,0.75" && res.loop3.off >= 1
  && res.loopUndo.faces === res.f0 && res.loopUndo.panel === null
  && okBtn(res.menuLoop.panel) && res.menuLoop.panel.title === "环切"
  && res.menuSlide.z.length === 1 && (res.menuSlide.z[0] === 0.25 || res.menuSlide.z[0] === 0.75)
  && res.menuOk.found && res.menuOk.panel === null && /环切：定了/.test(res.menuOk.hint)
  && res.cut.dfaces === 1 && okBtn(res.knife.panel) && res.knife.panel.title === "切割" && res.knife.panel.keys.join() === "p0,p1" && !res.knife.active
  && res.mark.on && res.mark.on.x === 1 && res.mark.on.y === 0 && res.mark.off === null
  && res.knifeSlide.faces === 1 && res.knifeSlide.moved && res.knifeSlide.check === ""
  && res.knifeRefuse.same && res.knifeRefuse.p0 === res.knifeRefuse.was && /端头/.test(res.knifeRefuse.hint) && res.knifeRefuse.panel
  && res.knifeOk.panel === null && /切割：定了/.test(res.knifeOk.hint)
  && res.esc.panel === "切割" && !res.esc.active && res.esc2.panel === null
  && okBtn(res.inset) && okBtn(res.bevel)
  && errs.length === 0;
console.log(ok ? "probe-afterthought-ok OK" : "probe-afterthought-ok FAIL");
process.exit(ok ? 0 : 1);

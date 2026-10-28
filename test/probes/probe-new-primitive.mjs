// 右键新建（2026-10-27 Claude Opus 5.5；纪元账本 FM120 / FM122）：① 硬表面空地上右键 → 没有「新建…」（user 10-27「然后硬表面建模不应该有新建网络体」）；
// ② 进网格体（自由建模）→ 右键空地 → 「新建立方体」→ 落在右键那一点的地面上、新面被选中；③ 右键顶面 → 「新建圆柱」→ 圆柱长在顶面上、轴沿法向；④ 撤销回去。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-new-primitive.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const rclick = async (p) => { const s = px(p); c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s.x, clientY: r.top + s.y, button: 2 })); await sleep(40); };
  const closeMenus = () => document.querySelectorAll(".popup-menu").forEach((m) => m.remove());
  const newItems = () => hud.edits().filter((it) => it.id.startsWith("new:") && !it.hidden).map((it) => it.label);
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  // ①
  await rclick(P(1.5, 1.5, 0)); out.menuHard = newItems(); closeMenus();
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(40);
  out.mode = e.modeId;
  const pos0 = e.history.position(), v0 = m().vertexCount(), f0 = m().faceCount();
  const world = (v) => { const X = S().def(S().root).instances.get(inst.id).xform, p = m().pt(v); return { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }; };
  // ②
  await rclick(P(2.5, 0.5, 0)); out.menuBlank = newItems();
  hud.pick("new:box"); await sleep(40); closeMenus();
  { const nv = m().verts().filter((v) => v >= v0).map(world), cx = nv.reduce((s, p) => s + p.x, 0) / (nv.length || 1), cy = nv.reduce((s, p) => s + p.y, 0) / (nv.length || 1);
    out.box = { dv: nv.length, df: m().faceCount() - f0, selF: e.selection.faces.size, cx: +cx.toFixed(3), cy: +cy.toFixed(3), zmin: +Math.min(...nv.map((p) => p.z)).toFixed(4), hint: hud.status(), tool: e.tool }; }
  // ③
  const v1 = m().vertexCount(), f1 = m().faceCount();
  await rclick(P(0.5, 0.5, 1)); out.menuOnFace = newItems();
  hud.pick("new:cylinder"); await sleep(40); closeMenus();
  { const zs = m().verts().filter((v) => v >= v1).map((v) => world(v).z);
    out.cyl = { df: m().faceCount() - f1, selF: e.selection.faces.size, onTop: zs.length > 0 && Math.min(...zs) > 0.999, up: Math.max(...zs) > 1.5, check: m().check().join(";") }; }
  // ④
  let threw = false;
  try { for (let i = 0; i < 10 && e.history.position() > pos0; i++) { window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true, cancelable: true })); await sleep(30); } } catch { threw = true; }
  out.undo = { threw, dv: m().vertexCount() - v0, pos: e.history.position() - pos0 };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.menuHard.length === 0 && res.mode === "freeform"
  && res.menuBlank.length === 5 && res.menuBlank[0] === "新建立方体"
  && res.box.dv === 8 && res.box.df === 6 && res.box.selF === 6 && Math.abs(res.box.cx - 2.5) < 0.05 && Math.abs(res.box.cy - 0.5) < 0.05 && res.box.zmin === 0 && /地面/.test(res.box.hint)
  && res.menuOnFace.length === 5 && res.cyl.df === 18 && res.cyl.selF === 18 && res.cyl.onTop && res.cyl.up && res.cyl.check === ""
  && !res.undo.threw && res.undo.dv === 0 && res.undo.pos === 0 && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-new-primitive OK" : "probe-new-primitive FAIL");
process.exit(ok ? 0 : 1);

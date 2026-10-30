// 套索（账本 UX5「套索要进 0.16」；接线清单第 3 条；created 2026-10-28 by Claude Opus 5.5）。
// 选择工具、「空处拖」= 套索：① 拖的时候虚线套索露出来，松手收起 ② 硬表面方块（等轴视角）一圈圈住：X 光关着只进看得见的面（3 张）、X 光开着 6 张
// ③ 圈一块空地 = 什么都不选 ④ 自由建模的移动工具没选区时空处拖也是套索（同一个选项）⑤ 切回「框」照旧是框。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-lasso.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  let shift = false;   // 按住 Shift（加选）画这一圈
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons, shiftKey: shift }));
  // 画一圈：圆心 (cx, cy)、半径 rad，24 个点
  const circle = async (cx, cy, rad, mid) => {
    fire("pointermove", cx + rad, cy, 0); await sleep(10); fire("pointerdown", cx + rad, cy, 1); await sleep(10);
    for (let i = 1; i <= 24; i++) { const a = (i / 24) * Math.PI * 2; fire("pointermove", cx + rad * Math.cos(a), cy + rad * Math.sin(a), 1); await sleep(8); if (i === 12 && mid) mid(); }
    fire("pointerup", cx + rad, cy, 0); await sleep(60);
  };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 2.5; e.cam.target = P(0.5, 0.5, 0.5); e.draw();
  box(0, 0, 0, 1, 1, 1); e.deselectAll(); e.setTool("select"); await sleep(20);
  e.config.set("select", "drag", "lasso");
  out.option = e.config.get("select", "drag") ?? null;
  const ctr = e.cam.angularPx(P(0.5, 0.5, 0.5), e.vp());
  // ① ②（X 光关）
  e.setXray(false);
  await circle(ctr.x, ctr.y, 260, () => { const L = document.getElementById("lasso"); out.shown = !!L && !L.hidden && (L.querySelector("polygon")?.getAttribute("points") ?? "").split(" ").length > 5; });
  out.hiddenAfter = document.getElementById("lasso").hidden;
  out.xrayOff = { faces: e.selection.faces.size, edges: e.selection.edges.size };
  // X 光开
  e.deselectAll(); e.setXray(true); await sleep(20);
  await circle(ctr.x, ctr.y, 260);
  out.xrayOn = { faces: e.selection.faces.size };
  e.setXray(false);
  // ③ 空地
  e.deselectAll(); await sleep(10);
  await circle(80, 620, 40);
  out.empty = { faces: e.selection.faces.size, edges: e.selection.edges.size };
  // ③′ 有选区时按住 Shift（加选）在空地圈一圈 = 清空选区（user 10-30「矩形选区选空的时候语义应该是清除选区。zbrush的肌肉记忆」）
  e.selectAll(); await sleep(10); out.beforeClear = e.selection.faces.size;
  shift = true; await circle(80, 620, 40); shift = false;
  out.cleared = { faces: e.selection.faces.size, edges: e.selection.edges.size, hint: document.getElementById("hint")?.textContent ?? "" };
  // ⑤ 切回框：从左上空处拖到右下 = 框住
  e.config.set("select", "drag", "box"); e.deselectAll(); await sleep(10);
  fire("pointermove", 20, 20, 0); await sleep(10); fire("pointerdown", 20, 20, 1); await sleep(10);
  for (let i = 1; i <= 6; i++) { fire("pointermove", 20 + 860 * i / 6, 20 + 660 * i / 6, 1); await sleep(10); if (i === 3) out.boxShown = !document.getElementById("marquee").hidden && document.getElementById("lasso").hidden; }
  fire("pointerup", 880, 680, 0); await sleep(60);
  out.box = { faces: e.selection.faces.size };
  // ④ 自由建模的移动工具：没选区空处拖 = 套索
  e.config.set("select", "drag", "lasso"); e.deselectAll();
  e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.setTool("move"); e.deselectAll(); await sleep(20);
  const before = JSON.stringify(s.mesh(inst.def).kernel.verts().map((v) => s.mesh(inst.def).kernel.pt(v)));
  await circle(ctr.x, ctr.y, 260);
  out.freeform = { mode: e.mode.id, verts: e.selection.verts?.size ?? 0, untouched: JSON.stringify(s.mesh(inst.def).kernel.verts().map((v) => s.mesh(inst.def).kernel.pt(v))) === before };
  return out;
});
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const ok = res.option === "lasso" && res.shown && res.hiddenAfter && res.xrayOff.faces === 3 && res.xrayOn.faces === 6 && res.empty.faces === 0 && res.empty.edges === 0
  && res.beforeClear > 0 && res.cleared.faces === 0 && res.cleared.edges === 0
  && res.boxShown && res.box.faces === 3 && res.freeform.mode === "freeform" && res.freeform.verts > 0 && res.freeform.verts < 8 && res.freeform.untouched && errs.length === 0;
console.log(ok ? "probe-lasso OK" : "probe-lasso FAIL");
process.exit(ok ? 0 : 1);

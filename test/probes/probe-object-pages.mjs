// 物体窗口四页（第 1 版施工单第五节第 2 条；物体种类施工稿第三节；2026-11-13 Claude Opus 5.5）。
// ① 网格体：四页 = 物体 / 网格体 / 元素 / 材质和贴图；物体页 = 「谁」+ 转种类；网格体页 = 对称 + 细分 + 默认平滑；材质页没画时说「没有挂材质」「还没有贴图坐标」
// ② 开始画之后材质页列出画和那一套贴图坐标，有「把画拿掉」；点它 = 走画的面全换回默认材质（面一张不少），一步撤销回来
// ③ 硬表面体：种类页叫「硬表面体」；材质页说硬表面体不能画 ④ 空物体：没有种类页（三页），元素页 / 材质页各说一句为什么没有
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-object-pages.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(6000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const r = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((res) => setTimeout(res, ms)), S = () => e.scene;
  const box = (x0, y0, z0, x1, y1, z1) => { const s = []; const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(a[0], a[1], z0), P(d[0], d[1], z0)], [P(a[0], a[1], z1), P(d[0], d[1], z1)], [P(a[0], a[1], z0), P(a[0], a[1], z1)]); } return s; };
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)");
  const click = (el) => el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  const closeAll = async () => { if (menu()) { click(document.querySelector(".gizmo-object")); await sleep(40); } };   // 物件钮是开关；不按 Esc（编辑器里 Esc = 退出一层）
  const open = async () => { await closeAll(); click(document.querySelector(".gizmo-object")); await sleep(80); };
  const tabs = () => [...(menu()?.querySelectorAll("[data-menu-tab]") ?? [])].map((t) => t.textContent.trim());
  const tab = async (id) => { click(menu()?.querySelector(`[data-menu-tab="${id}"]`)); await sleep(40); };
  const ids = () => [...(menu()?.querySelectorAll("[data-menu-id]") ?? [])].map((x) => x.getAttribute("data-menu-id"));
  const texts = () => [...(menu()?.querySelectorAll("[data-menu-id], .menu-note") ?? [])].map((x) => x.textContent.trim());   // 说明行（.menu-note）也收
  /** 物体页「切换种类 ›」展开后的每一项：id / 字 / 灰没灰。 */
  const casts = async () => { await tab("object"); click(menu()?.querySelector('[data-menu-id="cast"]')); await sleep(60); return [...document.querySelectorAll(".popup-menu.choice-layer [data-choice-id]")].map((x) => ({ id: x.getAttribute("data-choice-id"), text: x.textContent.trim(), off: x.disabled })); };
  const castPick = async (id) => { click(document.querySelector(`.popup-menu.choice-layer [data-choice-id="${id}"]`)); await sleep(80); };
  const enter = async (name) => { const d = S().def(S().defOfContext(e.ctx)); const i = [...d.instances.values()].find((x) => S().def(x.def).name === name); e.selectedPools.clear(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); e.enterSelected(); await sleep(40); };
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0, 0, 1, 1, 1) }); e.selectAll(); e.makeComponent("网"); e.deselectAll(); e.selectedPools.clear();
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(3, 0, 0, 4, 1, 1) });
  { const k = e.kernel; for (const f of k.faces()) { const rr = k.faceRings3(f.id); if (rr && rr.outer.every((p) => p.x > 2)) e.selection.faces.add(f.id); } for (const ed of k.edges()) if (k.graph.pt(ed.a).x > 2 && k.graph.pt(ed.b).x > 2) e.selection.edges.add(ed.id); }
  e.makeComponent("硬"); e.deselectAll(); e.selectedPools.clear();
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(60);
  const out = {};
  // ① 网格体
  await enter("网"); e.deselectAll(); e.runAction("object.toMesh"); await sleep(30);
  await open(); out.meshTabs = tabs();
  await tab("object"); out.objIds = ids(); out.who = menu()?.querySelector(".menu-note")?.textContent ?? "";
  out.meshCasts = await casts(); await open();
  await tab("kind"); out.kindIds = ids(); out.kindTexts = texts();
  await tab("materials"); out.mat0 = texts();
  // ② 开始画 → 材质页 → 把画拿掉 → 撤销
  await closeAll(); e.deselectAll(); e.runAction("mesh.startPaint", { canvas: 256, arrange: "patches" }); await sleep(60);
  const def = S().defOfContext(e.ctx), k = () => S().mesh(def).kernel;
  const faces0 = k().faceCount();
  await open(); await tab("materials"); out.mat1 = texts(); out.mat1Ids = ids();
  out.paintedBefore = out.mat1.some((t) => /走画/.test(t));
  click(menu()?.querySelector('[data-menu-id="action:mesh.dropPaint"]')); await sleep(80);
  out.hintDrop = document.getElementById("hint")?.textContent ?? "";
  await open(); await tab("materials"); out.mat2 = texts(); out.facesAfter = k().faceCount() === faces0;
  await closeAll(); e.undo(); await sleep(60);
  await open(); await tab("materials"); out.mat3 = texts();
  await closeAll(); e.exitContext(); await sleep(30);
  // ③ 硬表面体
  await enter("硬"); await open(); out.brepTabs = tabs(); await tab("materials"); out.brepMat = texts();
  await closeAll(); e.exitContext(); await sleep(30);
  // ④ 空物体：根（网格体）里把两份包成一个组件 = 空物体
  e.deselectAll(); e.selectedPools.clear(); e.runAction("object.toMesh"); await sleep(30);
  { const d = S().def(S().root); e.selectedPools.clear(); for (const i of d.instances.values()) e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); e.makeComponent("空"); await sleep(30); }
  await enter("空"); out.emptyKind = S().kindOf(S().defOfContext(e.ctx));
  await open(); out.emptyTabs = tabs(); await tab("elements"); out.emptyEl = texts(); await tab("materials"); out.emptyMat = texts();
  await closeAll();
  // ⑤ 空物体 → 网格体（不丢东西）→ 没有几何的网格体能切回空物体
  await open(); out.emptyCasts = await casts(); await castPick("action:object.toMesh"); await closeAll();
  out.afterToMesh = S().kindOf(S().defOfContext(e.ctx)); out.modeAfterToMesh = e.mode.id;
  await open(); out.bareMeshCasts = await casts(); await castPick("action:object.toEmpty"); await closeAll();
  out.afterToEmpty = S().kindOf(S().defOfContext(e.ctx)); out.modeAfterToEmpty = e.mode.id;
  e.undo(); await sleep(40); out.afterUndo = S().kindOf(S().defOfContext(e.ctx));
  return out;
});
await b.close();
r.errs = errs;
const has = (arr, re) => (arr ?? []).some((t) => re.test(t));
const checks = [
  ["① 网格体四页", r.meshTabs?.join("|") === "物体|网格体|元素|材质和贴图"],
  ["① 物体页：谁 + 切换种类 ›（转换不再平铺）", /网/.test(r.who) && (r.objIds ?? []).includes("cast") && !(r.objIds ?? []).includes("action:object.toBrep")],
  ["① 网格体页：对称 + 细分 + 默认平滑，没有转种类", (r.kindIds ?? []).includes("mirror:mode") && has(r.kindTexts, /细分/) && has(r.kindTexts, /默认平滑/) && !(r.kindIds ?? []).includes("action:object.toBrep")],
  ["① 材质页没画：没有挂材质 / 还没有贴图坐标", has(r.mat0, /没有挂材质/) && has(r.mat0, /还没有贴图坐标/) && !has(r.mat0, /把画拿掉/)],
  ["② 开始画之后：材质页列出画 + 贴图坐标 + 把画拿掉", r.paintedBefore && has(r.mat1, /格/) && (r.mat1Ids ?? []).includes("action:mesh.dropPaint")],
  ["② 把画拿掉：提示行说了、面一张不少、走画的那个槽没有面用了（0 张面）、出口收起", /把画拿掉了/.test(r.hintDrop) && r.facesAfter && has(r.mat2, /走画.*（0 张面）/) && !has(r.mat2, /把画拿掉/)],
  ["② 撤销一步：画回来", has(r.mat3, /走画/)],
  ["③ 硬表面体：种类页叫硬表面体；材质页说不能画", r.brepTabs?.join("|") === "物体|硬表面体|元素|材质和贴图" && has(r.brepMat, /硬表面体不能画/)],
  ["④ 空物体：三页（没有种类页）", r.emptyKind === "empty" && r.emptyTabs?.join("|") === "物体|元素|材质和贴图"],
  ["④ 空物体：元素页 / 材质页各说一句", has(r.emptyEl, /只装子物体/) && has(r.emptyMat, /只装子物体/)],
  ["⑤ 网格体：切换种类列出硬表面体（说丢什么）、空物体灰着（还有几何）", (() => { const c = r.meshCasts ?? [], b = c.find((x) => x.id === "action:object.toBrep"), m = c.find((x) => x.id === "action:object.toEmpty"); return c.length === 2 && b && !b.off && /会丢/.test(b.text) && m && m.off && /还有几何/.test(m.text); })()],
  ["⑤ 空物体：切到硬表面体 / 网格体都不丢东西", (r.emptyCasts ?? []).length === 2 && r.emptyCasts.every((x) => !x.off && /不丢东西/.test(x.text))],
  ["⑤ 空物体 → 网格体：种类和工作台跟着换", r.afterToMesh === "mesh" && r.modeAfterToMesh === "freeform"],
  ["⑤ 没有几何的网格体能切回空物体；撤销一步回到网格体", (r.bareMeshCasts ?? []).some((x) => x.id === "action:object.toEmpty" && !x.off) && r.afterToEmpty === "empty" && r.modeAfterToEmpty === "object" && r.afterUndo === "mesh"],
  ["没有页面错误", errs.length === 0],
];
console.log(JSON.stringify(r, null, 1));
let bad = 0; for (const [n, ok] of checks) { console.log(`${ok ? "✓" : "✗"} ${n}`); if (!ok) bad++; }
console.log(bad ? `probe-object-pages FAIL（${bad} / ${checks.length}）` : `probe-object-pages OK（${checks.length} / ${checks.length}）`);
process.exit(bad ? 1 : 0);

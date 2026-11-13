// 物体窗口「元素」页（属性地基轮 3½ 第一版：只看；2026-11-13 Claude Opus 5.5，统筹 11-13 深夜定的四件 + 分组先后）。
// ① 网格体（盒子转过来、标一条棱）：开「这一层」的物体窗口 → 点「元素」页签 → 第一行几何个数（点 / 边 / 面 / 角 / 不挂面的线）和内核一样；
//    每一列一行、行数 = 内核的列数；保留名带小灰字原名、中文名对；分组先后 = 边上在面上之前（点 → 边 → 面 → 角）；类型 / 个数 / 大小三格。
// ② 关掉再开：停在「元素」页（记住上次停在哪）；切回「物体」页：第一行还是「设置的是谁」。
// ③ 退到最外层（硬表面体，没有层）：几何行没有「角」，一行灰字「还没有元素属性」。④ 没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-element-page.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)");
  const openObj = async () => { document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(80); };
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); };
  const tab = async (id) => { menu()?.querySelector(`[data-menu-tab="${id}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40); };
  const onTab = () => menu()?.querySelector(".menu-tab.on")?.textContent ?? "";
  const rows = () => [...(menu()?.querySelectorAll(".menu-readout") ?? [])].map((d) => ({ id: d.dataset.id, name: d.querySelector(".menu-readout-name")?.firstChild?.textContent ?? "", code: d.querySelector(".menu-readout-code")?.textContent ?? null, cells: [...d.querySelectorAll(".menu-readout-cell")].map((c) => c.textContent) }));
  const sections = () => [...(menu()?.querySelectorAll(".menu-section-label") ?? [])].map((x) => x.textContent);
  const notes = () => [...(menu()?.querySelectorAll(".menu-note") ?? [])].map((x) => x.textContent);
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(40);
  e.deselectAll(); e.selection.edges.add(m().edges()[0]); e.runAction("mesh.markSharp"); e.deselectAll(); await sleep(20);
  e.commitOp({ op: "addMaterial", name: "红", color: [1, 0, 0] }); e.commitOp({ op: "meshPaintFaces", def: inst.def, faces: [m().faces()[0]], material: S().materials.length - 1 }); await sleep(20);   // 一张面刷上材质 = 面上有「材质」那一列
  // ① 网格体
  await openObj(); await tab("elements");
  const k = m(), g = k.elementCounts(), cols = k.columnList();
  out.one = { tab: onTab(), rows: rows(), sections: sections(), geo: `点 ${g.points} · 边 ${g.edges} · 面 ${g.faces} · 角 ${g.corners} · 不挂面的线 ${g.wires}`, cols: cols.map((c) => `${c.id}/${c.on}/${c.type}/${c.count}/${c.bytes}`) };
  await closeAll();
  // ② 关掉再开：停在元素页；切回物体页
  await openObj(); out.two = { tab: onTab() }; await tab("object"); out.two.back = onTab(); out.two.who = notes()[0] ?? ""; await closeAll();
  // ③ 最外层（硬表面体）：根上什么层都没有
  e.exitTo(0); e.deselectAll(); await sleep(30);
  await openObj(); await tab("elements");
  out.three = { rows: rows(), notes: notes(), tab: onTab() };
  await closeAll();
  return out;
});
await b.close();
res.errs = errs;
const one = res.one, body = one.rows.filter((r) => r.id !== "el:geometry" && r.id !== "el:head");
const sharp = body.find((r) => r.code === "sharp_edge"), groupsOrder = one.sections.join(">");
const checks = {
  "① 停在元素页": one.tab === "元素",
  "① 几何行和内核一样": one.rows[0]?.name === one.geo,
  "① 行数 = 列数": body.length === one.cols.length && one.cols.length > 0,
  "① 每一行的原名都是内核里的列名": body.every((r) => one.cols.some((c) => c.startsWith(`${r.code ?? r.name}/`))),
  "① 棱：带原名 sharp_edge、是 / 否、个数 = 边数": !!sharp && sharp.name === "棱" && sharp.cells[0] === "是 / 否" && sharp.cells[1] === String(one.cols.find((c) => c.startsWith("sharp_edge/")).split("/")[3]),
  "① 分组先后：边上在面上之前（点 → 边 → 面 → 角；没有的组不出）": one.sections.join(">") === "边上>面上",
  "① 材质：带原名 material_index、整数": body.some((r) => r.code === "material_index" && r.name === "材质" && r.cells[0] === "整数"),
  "② 再开停在元素页": res.two.tab === "元素",
  "② 物体页第一行还是「设置的是谁」": res.two.back === "物体" && /块/.test(res.two.who),
  "③ 硬表面：几何行没有「角」": res.three.rows[0]?.name?.startsWith("点 ") && !/角/.test(res.three.rows[0]?.name ?? ""),
  "③ 硬表面没有层：一行灰字": res.three.notes.includes("还没有元素属性") && res.three.rows.length === 1,
  "④ 没有页面错误": errs.length === 0,
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ checks, groupsOrder, res }, null, 1));
console.log(ok ? "probe-element-page OK" : "probe-element-page FAIL");
process.exit(ok ? 0 : 1);

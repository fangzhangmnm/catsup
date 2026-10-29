// 物件层动词（设计稿 20261028-object-layer-and-clipboard-design §4；created 2026-10-28 by Claude Fable 5.1；user 10-28 夜「你右键点在谁身上，谁留下 可以」「「分开」整个撤掉，只留原地建组件 先这么试着」「允许cast但是会弹窗」）。
// 最外层硬表面，两个网格体组件 A（6 面）、B（6 面，挪到 (3,0,0)）——
// ① 两个都选着、右键点在 A 上 = 菜单有「把其余合并进这个」、没有「分开」「合并物体」；点它 = 只剩 A、A 有 12 张面、B 那 6 张的世界坐标没动；一步撤销；撤销 = 回两个
// ② 鼠标压着 B 按 Ctrl+J = 并进 B（B 留下）③ 硬表面组件 C + 网格体 A 都选、右键点 C「把其余合并进这个」= 弹「要转种类」；「不做」= 什么都没动；再来、「转成硬表面体再并」= C 多了面、A 没了
// ④ 炸开网格体组件（在硬表面最外层）= 弹「要转种类」；「不做」= 没炸；「转成硬表面体再炸」= 最外层多了面、组件没了
// ⑤ 做成唯一：A 再摆一份（两份同定义）、选其中一份右键有「做成唯一」、点它 = 定义不同、面数一样、另一份的定义还是原来的
// ⑥ 网格体里选两张面右键 = 「建组件」在、「分开」不在；点建组件 = 这一层多一个子物件、面少两张
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-objects-merge.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const ids = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (x0, y0) => { const B = [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } return segs; };
  const S = () => e.scene, insts = () => [...S().def(S().root).instances.values()];
  e.setGrid({ ...e.grid, on: false });
  const mk = async (name, x0, y0, mesh) => { e.deselectAll(); e.selectedPools.clear(); e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(x0, y0) }); e.selectAll(); e.selectedPools.clear(); e.makeComponent(name); if (mesh) e.runAction("object.toMesh"); await sleep(20); return insts().find((i) => S().def(i.def).name === name).id; };
  const A = await mk("A", 0, 0, true), B = await mk("B", 3, 0, true), C = await mk("C", 0, 3, false);
  e.cam.setView("top"); e.zoomExtents(); e.cam.halfH *= 1.5; e.draw(); e.deselectAll();
  return { A, B, C };
});
const scr = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor, c = document.getElementById("board").getBoundingClientRect(), s = e.cam.angularPx(p, e.vp()); return { x: c.left + s.x, y: c.top + s.y }; }, p);
const state = () => page.evaluate(() => { const e = globalThis.__catsup.editor, S = e.scene, out = {}; for (const i of S.def(S.root).instances.values()) { const d = S.def(i.def); out[d.name] = { id: i.id, def: i.def, faces: d.body.kind === "mesh" ? d.body.kernel.faceCount() : d.body.kernel.faces().length, kind: d.body.kind }; } out.n = S.def(S.root).instances.size; out.rootFaces = S.brep(S.root).kernel.faces().length; out.steps = e.history.steps(); out.hint = globalThis.__catsup.hud.status(); return out; });
const select = (list) => page.evaluate((list) => { const e = globalThis.__catsup.editor; e.deselectAll(); for (const id of list) e.selectedPools.set(`i${id}`, { kind: "instance", instance: id }); }, list);
const menu = () => page.evaluate(() => [...document.querySelectorAll(".popup-menu:not(.choice-layer) .menu-label")].map((x) => x.textContent).join(" | "));
const menuClick = (re) => page.evaluate((src) => { const re = new RegExp(src); const el = [...document.querySelectorAll(".popup-menu:not(.choice-layer) [data-menu-id]")].find((x) => re.test(x.textContent ?? "")); el?.dispatchEvent(new MouseEvent("click", { bubbles: true })); return !!el; }, re.source);
const sheetClick = (re) => page.evaluate((src) => { const re = new RegExp(src); const el = [...document.querySelectorAll(".sheet button, [class*=sheet] button")].find((x) => x.offsetParent && re.test(x.textContent ?? "")); el?.click(); return !!el; }, re.source);
const worldPts = (name) => page.evaluate((name) => { const e = globalThis.__catsup.editor, S = e.scene, i = [...S.def(S.root).instances.values()].find((x) => S.def(x.def).name === name), m = S.def(i.def).body.kernel, X = i.xform, W = (p) => `${(X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3]).toFixed(6)},${(X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7]).toFixed(6)},${(X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11]).toFixed(6)}`; return m.faces().flatMap((f) => m.faceVerts(f).map((v) => W(m.pt(v)))).sort().join(";"); }, name);
const r = {};
// ①
const bPts = await worldPts("B"), aPts0 = await worldPts("A");
await select([ids.A, ids.B]);
const pA = await scr({ x: 0.5, y: 0.5, z: 1 });
await page.mouse.click(pA.x, pA.y, { button: "right" }); await page.waitForTimeout(120);
r.one = { menu: await menu() };
r.one.clicked = await menuClick(/把其余合并进这个/); await page.waitForTimeout(100);
const s1 = await state();
r.one.after = { n: s1.n, aFaces: s1.A?.faces, hint: s1.hint };
r.one.keptB = (await worldPts("A")).split(";").filter((p) => bPts.includes(p)).length === bPts.split(";").length;
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
const s1u = await state(); r.one.undone = s1u.n === 3 && s1u.A?.faces === 6 && s1u.B?.faces === 6;
// ② Ctrl+J 光标压着 B
await select([ids.A, ids.B]);
const pB = await scr({ x: 3.5, y: 0.5, z: 1 });
await page.mouse.move(pB.x, pB.y); await page.mouse.move(pB.x + 1, pB.y); await page.waitForTimeout(40);
await page.keyboard.press("Control+j"); await page.waitForTimeout(100);
const s2 = await state(); r.two = { n: s2.n, bFaces: s2.B?.faces, aGone: !s2.A, keptA: (await worldPts("B")).split(";").filter((p) => aPts0.includes(p)).length === aPts0.split(";").length };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
// ③ 跨种类合并：C（硬表面）留下、A（网格体）并进去 → 弹选择
await select([ids.A, ids.C]);
const pC = await scr({ x: 0.5, y: 3.5, z: 1 });
await page.mouse.click(pC.x, pC.y, { button: "right" }); await page.waitForTimeout(120);
r.three = { clicked: await menuClick(/把其余合并进这个/) }; await page.waitForTimeout(150);
r.three.declined = await sheetClick(/不做|取消/); await page.waitForTimeout(100);
const s3a = await state(); r.three.untouched = s3a.n === 3 && s3a.C?.faces === 6 && /没并/.test(s3a.hint);
await page.mouse.click(pC.x, pC.y, { button: "right" }); await page.waitForTimeout(120);
await menuClick(/把其余合并进这个/); await page.waitForTimeout(150);
r.three.cast = await sheetClick(/转成硬表面体再并/); await page.waitForTimeout(200);
const s3 = await state(); r.three.after = { n: s3.n, cFaces: s3.C?.faces, aGone: !s3.A, cKind: s3.C?.kind };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
// ④ 炸开网格体组件（最外层硬表面）
await select([ids.A]);
await page.mouse.click(pA.x, pA.y, { button: "right" }); await page.waitForTimeout(120);
await menuClick(/^炸开$|炸开(?!曲线)/); await page.waitForTimeout(150);
r.four = { declined: await sheetClick(/不做|取消/) }; await page.waitForTimeout(100);
const s4a = await state(); r.four.untouched = s4a.n === 3 && s4a.rootFaces === 0;
await page.mouse.click(pA.x, pA.y, { button: "right" }); await page.waitForTimeout(120);
await menuClick(/^炸开$|炸开(?!曲线)/); await page.waitForTimeout(150);
r.four.cast = await sheetClick(/转成硬表面体再炸/); await page.waitForTimeout(200);
const s4 = await state(); r.four.after = { n: s4.n, rootFaces: s4.rootFaces, aGone: !s4.A };
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
// ⑤ 做成唯一
await page.evaluate((A) => { const e = globalThis.__catsup.editor, S = e.scene, i = S.def(S.root).instances.get(A); e.commitOp({ op: "placeInstance", at: { def: S.root, group: null }, definition: i.def, xform: [1, 0, 0, 0, 0, 1, 0, -3, 0, 0, 1, 0] }); }, ids.A);
await page.waitForTimeout(40);
const copyId = await page.evaluate((A) => { const S = globalThis.__catsup.editor.scene, a = S.def(S.root).instances.get(A); return [...S.def(S.root).instances.values()].find((i) => i.def === a.def && i.id !== A).id; }, ids.A);
await select([copyId]);
const pCopy = await scr({ x: 0.5, y: -2.5, z: 1 });
await page.mouse.click(pCopy.x, pCopy.y, { button: "right" }); await page.waitForTimeout(120);
r.five = { menu: await menu() };
r.five.clicked = await menuClick(/做成唯一/); await page.waitForTimeout(100);
r.five.after = await page.evaluate(([A, c]) => { const S = globalThis.__catsup.editor.scene, a = S.def(S.root).instances.get(A), cc = S.def(S.root).instances.get(c); return { differ: a.def !== cc.def, faces: S.def(cc.def).body.kernel.faceCount(), aFaces: S.def(a.def).body.kernel.faceCount(), aCopies: S.instanceCount(a.def) }; }, [ids.A, copyId]);
// ⑥ 网格体里建组件（= 原地分开）
await page.evaluate(async (A) => { const e = globalThis.__catsup.editor; e.deselectAll(); e.selectedPools.set(`i${A}`, { kind: "instance", instance: A }); e.enterSelected(); await new Promise((r) => setTimeout(r, 30)); const m = e.scene.mesh(e.activePool().def).kernel; e.deselectAll(); for (const f of m.faces().slice(0, 2)) e.selection.faces.add(f); }, ids.A);
await page.mouse.click(720, 140, { button: "right" }); await page.waitForTimeout(120);
r.six = { menu: await menu() };
r.six.clicked = await menuClick(/建组件/); await page.waitForTimeout(100);
r.six.after = await page.evaluate(() => { const e = globalThis.__catsup.editor, d = e.scene.def(e.activePool().def); return { faces: d.body.kernel.faceCount(), children: d.instances.size, depth: e.ctx.chain.length }; });
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = /把其余合并进这个/.test(r.one.menu) && !/分开|合并物体/.test(r.one.menu) && r.one.clicked && r.one.after.n === 2 && r.one.after.aFaces === 12 && r.one.keptB && /合并了 1 个/.test(r.one.after.hint) && r.one.undone
  && r.two.n === 2 && r.two.bFaces === 12 && r.two.aGone && r.two.keptA
  && r.three.clicked && r.three.declined && r.three.untouched && r.three.cast && r.three.after.n === 2 && r.three.after.cFaces > 6 && r.three.after.aGone && r.three.after.cKind === "brep"
  && r.four.declined && r.four.untouched && r.four.cast && r.four.after.n === 2 && r.four.after.rootFaces >= 6 && r.four.after.aGone
  && /做成唯一/.test(r.five.menu) && r.five.clicked && r.five.after.differ && r.five.after.faces === 6 && r.five.after.aFaces === 6 && r.five.after.aCopies === 1
  && /建组件/.test(r.six.menu) && !/分开/.test(r.six.menu) && r.six.clicked && r.six.after.faces === 4 && r.six.after.children === 1 && r.six.after.depth === 1 && errs.length === 0;
console.log(ok ? "probe-objects-merge OK" : "probe-objects-merge FAIL");
process.exit(ok ? 0 : 1);

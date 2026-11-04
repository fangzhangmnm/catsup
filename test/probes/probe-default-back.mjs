// 单面 / 双面第四版（ID-2b）走真工具：矩形工具画一张面 → 背面是默认背面（从下面看灰蓝、从上面看白模灰）；推拉工具推成盒子 → 全部朝外；
// 导出表单写「N 张面两侧都会出」且选择跟文件走；吸色吸到默认背面；翻面；演示锁 / 风格预览不画默认背面。created 2026-11-04 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 800, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);
const box = await page.locator("#board").boundingBox();
const px = (rx, ry) => ({ x: box.x + box.width * rx, y: box.y + box.height * ry });
/** 画布中间偏一点的像素（避开原点的轴线；截图读，不靠 WebGL 缓冲还在）。 */
const center = async () => {
  await page.evaluate(() => globalThis.__catsup.editor.draw()); await page.waitForTimeout(180);
  const png = await page.screenshot({ clip: { x: Math.round(box.x + box.width * 0.56), y: Math.round(box.y + box.height * 0.56), width: 1, height: 1 } });
  return page.evaluate(async (b64) => { const bin = atob(b64), u8 = Uint8Array.from(bin, (c) => c.charCodeAt(0)), bmp = await createImageBitmap(new Blob([u8], { type: "image/png" })), c = new OffscreenCanvas(1, 1), x = c.getContext("2d"); x.drawImage(bmp, 0, 0); return [...x.getImageData(0, 0, 1, 1).data.slice(0, 3)]; }, png.toString("base64"));
};
const state = () => page.evaluate(() => {
  const e = globalThis.__catsup.editor, k = e.kernel, s = e.scene, slots = s.brep(s.root).materialSlots, back = slots.indexOf(-2);
  const verts = k.vertices(), c = { x: verts.reduce((a, v) => a + v.x, 0) / verts.length, y: verts.reduce((a, v) => a + v.y, 0) / verts.length, z: verts.reduce((a, v) => a + v.z, 0) / verts.length };
  return { faces: k.faces().length, back, slots: [...slots], materials: s.materials.length, sides: k.faces().map((f) => { const n = k.planeOf(f.id).plane.n, p = k.faceRings3(f.id).outer[0], out = n.x * (p.x - c.x) + n.y * (p.y - c.y) + n.z * (p.z - c.z) > 0 ? 0 : 1, a = k.faceMaterialOf(f.id, 0) === back, bb = k.faceMaterialOf(f.id, 1) === back; return { up: n.z, backSide: a === bb ? null : a ? 0 : 1, outside: out }; }) };
});
const out = {};
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setGrid({ on: false }); e.cam.setView("top"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 4; e.setTool("rect"); e.draw(); });
// ① 真矩形工具：从上面画
const a = px(0.3, 0.3), c = px(0.7, 0.7);
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
await page.mouse.move(c.x, c.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(120);
out.rect = await state();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.deselectAll(); e.setTool("select"); e.draw(); });
out.frontCol = await center();
await page.evaluate(() => globalThis.__catsup.editor.cam.setView("bottom"));
out.backCol = await center();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.draw(); });
// ② 吸色吸到默认背面：吸到之后「蘸的」就是那一格
out.pick = await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel, f = k.faces()[0], n = k.planeOf(f.id).plane.n; e.pickMaterialOf(f.id, n.z > 0 ? 1 : 0); const a = e.paint; e.pickMaterialOf(f.id, n.z > 0 ? 0 : 1); return { under: a, top: e.paint }; });
// ③ 真推拉工具：盒子全部朝外
await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel, f = k.faces()[0], n = k.planeOf(f.id).plane.n; e.commitOp({ op: "pushpull", at: e.activePool(), face: k.faceRings3(f.id).outer, dist: Math.sign(n.z) }); });   // 底面有朝向：不带 front 也全部朝外
await page.waitForTimeout(80);
out.box = await state();
// ④ 导出表单：新画的盒子一张面都不多；老白模才有那一行；选择跟文件走
out.counts = await page.evaluate(() => globalThis.__catsup.session.exportSides());
await page.evaluate(() => { const e = globalThis.__catsup.editor, at = e.activePool(), P = (x, y, z = 0) => ({ x, y, z }); e.commitOp({ op: "addEdges", at, segs: [[P(9, 9), P(10, 9)], [P(10, 9), P(10, 10)], [P(10, 10), P(9, 10)], [P(9, 10), P(9, 9)]] }); });   // 老式面（没 front）：两侧默认正面
out.counts2 = await page.evaluate(() => globalThis.__catsup.session.exportSides());
await page.click("#btnMenu"); await page.waitForTimeout(100); await page.click('.popup-menu [data-menu-tab="file"]', { timeout: 1500 }).catch(() => {}); await page.waitForTimeout(60); await page.click(".popup-menu .menu-item:has-text('导出与另存')"); await page.waitForTimeout(120); await page.click(".popup-menu .menu-item:has-text('导出模型')"); await page.waitForTimeout(150);
out.sheetNote = await page.evaluate(() => document.getElementById("sheetMessage").textContent);
await page.click('#sheetChoices [data-field="format"] button[data-value="obj"]'); await page.waitForTimeout(50);
out.sheetNoteObj = await page.evaluate(() => document.getElementById("sheetMessage").textContent);
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
out.choice = await page.evaluate(() => { const s = globalThis.__catsup.session; s.setExportChoice({ format: "glb", scope: "all", textures: "none", lines: "none" }); return s.exportChoice; });
// ⑤ 翻面（指令 + 撤销）
out.flip = await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel, f = k.faces().find((x) => k.faceRings3(x.id).outer.some((p) => p.z > 0.5)), back = e.scene.brep(e.scene.root).materialSlots.indexOf(-2), s0 = k.faceMaterialOf(f.id, 0) === back; e.deselectAll(); e.selection.faces.add(f.id); e.afterSelectForProbe?.(); const menu = e.commandMenu().map((m) => m.id); e.runAction("brep.flipSides", {}); const k2 = e.kernel, s1 = k2.faceMaterialOf(f.id, 0) === back; e.undo(); const s2 = e.kernel.faceMaterialOf(f.id, 0) === back; return { menu: menu.includes("brep.flipSides"), s0, s1, s2 }; });
// ⑥ 演示锁 / 风格预览不画默认背面（面朝下那一格像素 = 背景）
await page.evaluate(() => { const e = globalThis.__catsup.editor; const k = e.kernel; e.commitOp({ op: "clear" }); const at = e.activePool(), P = (x, y) => ({ x, y, z: 0 }); e.commitOp({ op: "addEdges", at, segs: [[P(-1, -1), P(1, -1)], [P(1, -1), P(1, 1)], [P(1, 1), P(-1, 1)], [P(-1, 1), P(-1, -1)]], front: { x: 0, y: 0, z: 1 } }); e.setGrid({ on: false }); e.cam.setView("bottom"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 2; });
out.under = await center();
await page.evaluate(async () => { await globalThis.__catsup.session.setLocked(true); }); await page.waitForTimeout(120);
out.underLocked = await center();
await page.evaluate(async () => { await globalThis.__catsup.session.setLocked(false); }); await page.waitForTimeout(120);
out.underAgain = await center();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.renderer3.setPreset("realistic"); e.draw(); }); await page.waitForTimeout(200);
out.underStyled = await center();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.renderer3.setPreset("white"); e.cam.setView("top"); e.draw(); }); await page.waitForTimeout(100);
out.overWhite = await center();
// ⑦ 预演 = 同一条指令（计划书 §12 C1）：矩形第二点还悬停着（没落定），从下面看已经是灰蓝；真身一个字节没动；落定前后像素不变
const liveState = () => page.evaluate(() => {
  const e = globalThis.__catsup.editor, w = e.liveWorldForProbe(), k = w.activeSlot().kernel, s = w.scene, back = s.brep(s.root).materialSlots.indexOf(-2);
  const verts = k.vertices(), c = { x: verts.reduce((a, v) => a + v.x, 0) / verts.length, y: verts.reduce((a, v) => a + v.y, 0) / verts.length, z: verts.reduce((a, v) => a + v.z, 0) / verts.length };
  return { realFaces: e.kernel.faces().length, realSlots: [...e.scene.brep(e.scene.root).materialSlots], faces: k.faces().length, back, sides: k.faces().map((f) => { const n = k.planeOf(f.id).plane.n, p = k.faceRings3(f.id).outer[0], out = n.x * (p.x - c.x) + n.y * (p.y - c.y) + n.z * (p.z - c.z) > 0 ? 0 : 1; return { up: n.z > 0.5 ? 1 : 0, backSide: k.faceMaterialOf(f.id, 1) === back ? 1 : 0, outside: out }; }) };
});
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clear" }); e.setGrid({ on: false }); e.cam.setView("top"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 4; e.setTool("rect"); e.draw(); });
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
await page.mouse.move(c.x - 2, c.y - 2); await page.waitForTimeout(20); await page.mouse.move(c.x, c.y); await page.waitForTimeout(60);
out.midRect = await liveState();
out.midRectTop = await center();
await page.evaluate(() => globalThis.__catsup.editor.cam.setView("bottom"));
out.midRectUnder = await center();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.setView("top"); e.draw(); });
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(120);
out.doneRectTop = await center();
await page.evaluate(() => globalThis.__catsup.editor.cam.setView("bottom"));
out.doneRectUnder = await center();
// ⑧ 推拉拖到一半：影子里全部朝外（外面白模灰、里面灰蓝），真身还是一张面；侧面的像素松手前后不变
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.setView("iso"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 4; e.setTool("pp"); e.draw(); });
const onBoard = (p) => page.evaluate((q) => { const e = globalThis.__catsup.editor, s = e.cam.angularPx(q, e.vp()); return { x: s.x, y: s.y }; }, p);
const ring = await page.evaluate(() => { const k = globalThis.__catsup.editor.kernel; return k.faceRings3(k.faces()[0].id).outer; });
const mid = { x: ring.reduce((s, p) => s + p.x, 0) / ring.length, y: ring.reduce((s, p) => s + p.y, 0) / ring.length, z: 0 }, s0 = await onBoard(mid);
await page.mouse.move(box.x + s0.x, box.y + s0.y); await page.waitForTimeout(40); await page.mouse.down(); await page.waitForTimeout(20);
for (const dy of [20, 50, 80]) { await page.mouse.move(box.x + s0.x, box.y + s0.y - dy); await page.waitForTimeout(40); }
out.midPP = await liveState();
const sideAt = async () => {   // 朝相机的那两张侧面各一个点（避开光标在的顶面）
  const pts = await page.evaluate((m) => { const e = globalThis.__catsup.editor, w = e.liveWorldForProbe(), k = w.activeSlot().kernel, zs = k.vertices().map((v) => v.z), h = Math.max(...zs), xs = k.vertices().map((v) => v.x), ys = k.vertices().map((v) => v.y), P = (x, y, z) => e.cam.angularPx({ x, y, z }, e.vp()); return [P(Math.max(...xs), m.y, h / 2), P(m.x, Math.min(...ys), h / 2)]; }, mid);
  const out2 = [];
  for (const q of pts) { const png = await page.screenshot({ clip: { x: Math.round(box.x + q.x), y: Math.round(box.y + q.y), width: 1, height: 1 } }); out2.push(await page.evaluate(async (b64) => { const bin = atob(b64), u8 = Uint8Array.from(bin, (ch) => ch.charCodeAt(0)), bmp = await createImageBitmap(new Blob([u8], { type: "image/png" })), cv = new OffscreenCanvas(1, 1), x = cv.getContext("2d"); x.drawImage(bmp, 0, 0); const d = x.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; }, png.toString("base64"))); }
  return out2;
};
await page.evaluate(() => globalThis.__catsup.editor.draw()); await page.waitForTimeout(120);
out.midPPSide = await sideAt();
await page.mouse.up(); await page.waitForTimeout(150);
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setTool("select"); e.deselectAll(); e.draw(); }); await page.waitForTimeout(120);
out.donePP = await state();
out.donePPSide = await sideAt();
// ⑨ 数值小窗重画复用第一次的方向（§12 C2）：从上面画完转到下面再打尺寸 / 高度，朝向不翻
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clear" }); e.cam.setView("top"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 4; e.setTool("rect"); e.draw(); });
await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60);
await page.mouse.move(c.x, c.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(120);
out.vcb0 = await state();
out.vcb = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.setView("bottom"); e.draw(); return e.applyVcb("3,3"); });
out.vcb1 = await state();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "clear" }); const at = e.activePool(), P = (x, y) => ({ x, y, z: 0 }); e.commitOp({ op: "addEdges", at, segs: [[P(-1, -1), P(1, -1)], [P(1, -1), P(1, 1)], [P(1, 1), P(-1, 1)], [P(-1, 1), P(-1, -1)]] }); e.cam.setView("iso"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 4; e.setTool("pp"); e.draw(); });
{ const q = await onBoard({ x: 0, y: 0, z: 0 });
  await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.waitForTimeout(20);
  for (const dy of [30, 60]) { await page.mouse.move(box.x + q.x, box.y + q.y - dy); await page.waitForTimeout(40); }
  await page.mouse.up(); await page.waitForTimeout(150); }
out.ppVcb0 = await state();
out.ppVcb = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.yaw += Math.PI; e.cam.pitch = -Math.abs(e.cam.pitch); e.draw(); return e.applyVcb("2"); });
out.ppVcb1 = await state();
console.log(JSON.stringify(out, null, 0));
const eqc = (a, b, t = 6) => a.every((v, i) => Math.abs(v - b[i]) <= t);
const blueish = (c) => c[2] > c[0] + 12;   // 灰蓝：蓝通道明显高过红通道（白模灰和米白背景不会）
const checks = {
  rectFace: out.rect.faces === 1 && out.rect.back >= 0 && out.rect.materials === 0,
  rectFront: out.rect.sides[0].backSide === (out.rect.sides[0].up > 0 ? 1 : 0),
  colors: !blueish(out.frontCol) && blueish(out.backCol),
  pick: out.pick.under?.kind === "back" && out.pick.top === null,
  box: out.box.faces === 6 && out.box.sides.every((x) => x.backSide === (x.outside === 0 ? 1 : 0)),
  counts: out.counts.both === 0 && out.counts2.both === 1,
  sheetNote: /1 张面两侧都会出（其中 0 张两侧材质不同）/.test(out.sheetNote) && !/两侧都会出/.test(out.sheetNoteObj),
  choice: out.choice.lines === "none",
  flip: out.flip.menu && out.flip.s0 !== out.flip.s1 && out.flip.s2 === out.flip.s0,
  lockCull: blueish(out.under) && !blueish(out.underLocked) && blueish(out.underAgain) && !eqc(out.under, out.underLocked),
  styleCull: !eqc(out.underStyled, out.under),
  midRealUntouched: out.midRect.realFaces === 0 && out.midRect.realSlots.length === 0,
  midRectBack: out.midRect.faces === 1 && out.midRect.back >= 0 && out.midRect.sides[0].backSide === (out.midRect.sides[0].up > 0 ? 1 : 0),
  midRectColors: !blueish(out.midRectTop) && blueish(out.midRectUnder),
  rectSameAfterRelease: eqc(out.midRectTop, out.doneRectTop) && eqc(out.midRectUnder, out.doneRectUnder),
  midPP: out.midPP.realFaces === 1 && out.midPP.faces === 6 && out.midPP.sides.every((x) => x.backSide === (x.outside === 0 ? 1 : 0)),
  ppSameAfterRelease: out.donePP.faces === 6 && out.midPPSide.every((c0, i) => eqc(c0, out.donePPSide[i]) && !blueish(c0)),
  vcbKeepsFront: out.vcb.ok && out.vcb0.sides[0].backSide === out.vcb1.sides[0].backSide && out.vcb0.sides[0].up === out.vcb1.sides[0].up,
  ppVcbKeepsFront: out.ppVcb.ok && out.ppVcb1.faces === 6 && out.ppVcb1.sides.every((x) => x.backSide === (x.outside === 0 ? 1 : 0)),
  errs: errs.length === 0,
};
console.log(JSON.stringify(checks));
const ok = Object.values(checks).every(Boolean);
if (errs.length) console.log(errs.join("\n"));
console.log(ok ? "probe-default-back OK" : "probe-default-back FAIL");
await b.close(); process.exit(ok ? 0 : 1);

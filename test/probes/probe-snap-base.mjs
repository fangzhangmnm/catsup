// 自由建模吸附的底按设备（周账 F-128；user 10-29「触屏版…一开始默认开着吸附，然后toggle反转」）：
// 右上锁钮开着时——笔拖一个点到另一个点旁边 = 吸上去（底 = 锁钮）；笔 + Shift = 不吸（反过来）；鼠标拖 = 不吸（底 = 关）；鼠标 + Shift = 吸；
// 锁钮关掉后笔拖 = 不吸、笔 + Shift = 吸（底跟钮）。提示行按设备换说法。
// 用法：python3 -m http.server 8765 --bind 127.0.0.1 后 `node test/probes/probe-snap-base.mjs`。created 2026-10-29 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const out = {}, ok = (k, v) => { out[k] = v; if (!v) process.exitCode = 1; };
// 一块 4×4 平板细分三次、顶视图、移动工具、锁钮开
const def = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.selectAll(); e.deleteSelection(); await sleep(10);
  e.commitOp({ op: "meshAddPrimitive", def: inst.def, kind: "plane", frame: { o: P(0, 0, 0), x: P(1, 0, 0), y: P(0, 1, 0), z: P(0, 0, 1) }, size: [4, 4, 0] });
  e.commitOp({ op: "meshSubdivide", def: inst.def, levels: 2 });
  e.deselectAll(); e.cam.setView("top"); e.zoomExtents(); e.draw(); e.setTool("move"); e.setGrid({ ...e.grid, on: true });
  return inst.def;
});
ok("inFreeform", await page.evaluate(() => globalThis.__catsup.editor.modeId === "freeform" && globalThis.__catsup.editor.tool === "move" && globalThis.__catsup.editor.grid.on));
// 屏幕坐标（画布局部）
const scr = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor, X = e.scene.xformOfContext(e.ctx), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }; return e.frame().project(w, e.vp()); }, p);
const pt = (v) => page.evaluate(([d, v]) => { const p = globalThis.__catsup.editor.scene.mesh(d).kernel.pt(v); return { x: p.x, y: p.y, z: p.z }; }, [def, v]);
// 挑两个点：A 拖、B 目标，屏上相距 60–140 px
const pair = await page.evaluate((d) => { const e = globalThis.__catsup.editor, m = e.scene.mesh(d).kernel, vs = m.verts(), X = e.scene.xformOfContext(e.ctx), vp = e.vp();
  const sc = (v) => { const p = m.pt(v), w = { x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] }; return e.frame().project(w, vp); };
  for (const a of vs) for (const c of vs) { if (a === c) continue; const pa = sc(a), pc = sc(c); const dd = Math.hypot(pa.x - pc.x, pa.y - pc.y); if (dd > 60 && dd < 140 && pa.x > 200 && pa.x < 800 && pc.x > 200 && pc.x < 800 && pa.y > 150 && pa.y < 650 && pc.y > 150 && pc.y < 650) return { a, c }; }
  return null; }, def);
ok("pairFound", !!pair);
const box = await page.evaluate(() => { const r = document.getElementById("board").getBoundingClientRect(); return { x: r.left, y: r.top }; });
const pen = (type, x, y, shift) => page.evaluate(([type, x, y, shift]) => { const c = document.getElementById("board"), q = c.getBoundingClientRect(); c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: q.left + x, clientY: q.top + y, pointerType: "pen", pointerId: 7, isPrimary: true, button: 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : 0.5, shiftKey: !!shift })); }, [type, x, y, shift]);
const close = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-6;
const hint = () => page.evaluate(() => document.getElementById("hint").textContent);
/** 拖 A 到 B 屏幕位置旁 5 px，返回 A 落点和 B 一样不一样（= 吸上了）。 */
async function dragA(how) {
  const A = await pt(pair.a), B = await pt(pair.c), sa = await scr(A), sb = await scr(B), tx = sb.x + 5, ty = sb.y + 3;
  if (how.pen) { await pen("pointerdown", sa.x, sa.y, how.shift); await page.waitForTimeout(40); out[how.name + "Hint"] = await hint(); for (let i = 1; i <= 8; i++) { await pen("pointermove", sa.x + (tx - sa.x) * i / 8, sa.y + (ty - sa.y) * i / 8, how.shift); await page.waitForTimeout(16); } await pen("pointerup", tx, ty, how.shift); await page.waitForTimeout(80); }
  else { if (how.shift) await page.keyboard.down("Shift"); await page.mouse.move(box.x + sa.x, box.y + sa.y); await page.mouse.down(); await page.waitForTimeout(40); out[how.name + "Hint"] = await hint(); for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + sa.x + (tx - sa.x) * i / 8, box.y + sa.y + (ty - sa.y) * i / 8); await page.waitForTimeout(16); } await page.mouse.up(); if (how.shift) await page.keyboard.up("Shift"); await page.waitForTimeout(80); }
  const A2 = await pt(pair.a), moved = !close(A, A2), snapped = close(A2, B);
  await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(40);
  ok(how.name + "Moved", moved);
  return snapped;
}
ok("penSnaps", await dragA({ name: "pen", pen: true, shift: false }));
ok("penShiftNoSnap", !(await dragA({ name: "penShift", pen: true, shift: true })));
ok("mouseNoSnap", !(await dragA({ name: "mouse", pen: false, shift: false })));
ok("mouseShiftSnaps", await dragA({ name: "mouseShift", pen: false, shift: true }));
ok("hintByDevice", /Shift = 反过来/.test(out.penHint) && /按住 Shift = 吸附/.test(out.mouseHint));
// 锁钮关掉：笔的底跟着关
await page.evaluate(() => globalThis.__catsup.editor.setGrid({ ...globalThis.__catsup.editor.grid, on: false }));
ok("lockOffPenNoSnap", !(await dragA({ name: "penLockOff", pen: true, shift: false })));
ok("lockOffPenShiftSnaps", await dragA({ name: "penLockOffShift", pen: true, shift: true }));
// 键名芯片锁住 Shift = 反过来（iPad 没键盘）：先选中 A 再切移动，芯片才出；芯片不在就如实记「没测到」
await page.evaluate(() => globalThis.__catsup.editor.setGrid({ ...globalThis.__catsup.editor.grid, on: true }));
{ const A = await pt(pair.a), sa = await scr(A);
  await page.evaluate(() => globalThis.__catsup.editor.setTool("select")); await pen("pointerdown", sa.x, sa.y); await page.waitForTimeout(20); await pen("pointerup", sa.x, sa.y); await page.waitForTimeout(80);
  await page.evaluate(() => globalThis.__catsup.editor.setTool("move")); await page.waitForTimeout(80);
  const chip = page.locator('.mfd-slot[data-slot="shift"] .mfd-chip');
  if (await chip.count()) { await chip.first().click(); await page.waitForTimeout(60);
    ok("latchChipNoSnap", !(await dragA({ name: "penLatched", pen: true, shift: false })));
    const chip2 = page.locator('.mfd-slot[data-slot="shift"] .mfd-chip'); if (await chip2.count()) { await chip2.first().click(); await page.waitForTimeout(40); } }
  else out.latchChip = "没测到：Shift 芯片没出来"; }
console.log(JSON.stringify(out, null, 1));
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)");
if (errs.length) process.exitCode = 1;
await b.close();

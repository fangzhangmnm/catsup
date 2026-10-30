// X 光面点（pick.ts faceDotPoint + render3 faceDots；created 2026-10-29 by Claude Opus 5.5；纪元账本 FM3「x光需要每个面有小点吧……这个才是x ray 承重的」、UX71「X 光下每张面一个小点 做做做」）。
// 自由建模网格体扁盒子（1 × 1 × 0.4）、等轴视图（从上往下看，底面被挡住）、选择工具——
// ① X 光关：点底面中心那一点 = 选中的是挡在前面的那张面（不是底面）② X 光开：同一点 = 什么面都不选（2026-10-29 起 X 光只吃点和边，T149）③ 硬表面也一样。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-xray-facedots.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
let page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const setup = (mesh) => page.evaluate(async (mesh) => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), H = 0.4;   // 扁盒子：单位立方体在这个等轴角度下底面中心正好压在一个顶点上（顶点优先）
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], H), P(d[0], d[1], H)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], H)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs });
  if (mesh) { e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20); const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); }
  e.deselectAll(); e.cam.setView("iso"); e.zoomExtents(); e.draw(); globalThis.__catsup.hud.pick("select");
}, mesh);
// 底面中心（世界 0.5, 0.5, 0）在屏幕上的位置；点一下；返回选中的那张面中心的 z
const clickBottom = async () => {
  const at = await page.evaluate(() => { const e = globalThis.__catsup.editor, c = document.getElementById("board"), r = c.getBoundingClientRect(), view = e.liveWorldForProbe();
    // 正在编辑那一层里最低的那张面（底面）的中心（世界）：从几何里找，不假设组件坐标（组件原点在底面中心）
    let best = null;
    for (const f of view.faces()) { if (view.isActive && !view.isActive(f.id)) continue; const ring = view.faceRings3(f.id)?.outer ?? []; if (!ring.length) continue; const cz = ring.reduce((a, p) => a + p.z, 0) / ring.length; if (!best || cz < best.z) best = { z: cz, x: ring.reduce((a, p) => a + p.x, 0) / ring.length, y: ring.reduce((a, p) => a + p.y, 0) / ring.length }; }
    const s = e.cam.angularPx(best, e.vp()); e.deselectAll(); return { x: r.left + s.x, y: r.top + s.y }; });
  await page.mouse.move(at.x, at.y); await page.mouse.click(at.x, at.y); await page.waitForTimeout(760);   // 真鼠标（选择工具认真指针）；等过双击窗口
  return page.evaluate(() => { const e = globalThis.__catsup.editor, f = [...e.selection.faces][0]; if (f === undefined) return null;
    const view = e.liveWorldForProbe(), act = view.activeSlot(), gid = f + act.index * (1 << 22), ring = view.faceRings3(gid)?.outer ?? [];
    return ring.length ? +(ring.reduce((a, p) => a + p.z, 0) / ring.length).toFixed(3) : null; });
};
const r = {};
await setup(true);
r.meshOff = await clickBottom();
await page.evaluate(() => globalThis.__catsup.editor.setXray(true)); await page.waitForTimeout(60);
r.meshOn = await clickBottom();
if (process.argv[2]) { await page.evaluate(() => globalThis.__catsup.editor.draw()); await page.screenshot({ path: process.argv[2] }); }
await page.close();
page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000); page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));   // 硬表面那段另开一页（重新加载会被「没保存」挡住）
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await setup(false);
await page.evaluate(() => globalThis.__catsup.editor.setXray(true)); await page.waitForTimeout(60);
r.brepOn = await clickBottom();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r));
// 2026-10-29 改（user「先这样，x光先统一不开面拾取……x光只吃点和边，面拾取以后再头疼」，账本 T149）：X 光开着 = 点面心什么面都不选（以前 = 选中被挡住的底面）；X 光关着照旧选前面那张
const ok = r.meshOff !== null && r.meshOff !== 0 && r.meshOn === null && r.brepOn === null && errs.length === 0;
console.log(ok ? "probe-xray-facedots OK" : "probe-xray-facedots FAIL");
process.exit(ok ? 0 : 1);

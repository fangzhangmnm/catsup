// 沿边滑（Blender G G；tools/mesh-transform.ts solveSlide；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「5 做，快捷键同意，然后手势的话就是g的gizmos的一种模式」）。
// 盒子中间环切一圈、选那一圈的四个点——① G、再按 G = 沿边滑开（工具条「沿边滑」开）② 往上拖、回车 = 每个点只沿竖边往上滑：x / y 不变、z 在 (中缝, 顶) 之间、四个点一样高；一步
// ③ 再来一次 G G 往下拖 = 往下滑 ⑤ 单按 G（没有第二下）= 照常移动、不滑 ④ 工具条里有「沿边滑」。跑法：python3 -m http.server 8765 后 node test/probes/probe-edge-slide.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const info = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0], m = () => s.mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const zs = m().verts().map((v) => m().pt(v).z), z0 = Math.min(...zs), z1 = Math.max(...zs);
  const vert = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).z - m().pt(m().edgeB[x]).z) > 0.5);
  e.commitOp({ op: "meshLoopCut", def: inst.def, edge: vert, t: 0.5 });
  const mid = (z0 + z1) / 2, ring = m().verts().filter((v) => Math.abs(m().pt(v).z - mid) < 1e-9);
  e.cam.setView("front"); e.zoomExtents(); e.cam.halfH *= 1.5; e.draw();
  e.deselectAll(); for (const v of ring) e.selection.verts.add(v); globalThis.__catsup.hud.pick("move");
  return { def: inst.def, ring, z0, z1, mid, xy: ring.map((v) => [m().pt(v).x, m().pt(v).y]) };
});
const pts = () => page.evaluate(([d, ring]) => { const m = globalThis.__catsup.editor.scene.mesh(d).kernel; return ring.map((v) => { const p = m.pt(v); return [p.x, p.y, p.z]; }); }, [info.def, info.ring]);
const r = {};
await page.mouse.move(500, 400); await page.mouse.move(505, 402); await page.waitForTimeout(40);
r.strip = await page.evaluate(() => /沿边滑/.test(document.getElementById("toolStrip")?.textContent ?? ""));
const st0 = await page.evaluate(() => globalThis.__catsup.editor.history.steps());
await page.keyboard.press("g"); await page.waitForTimeout(40); await page.keyboard.press("g"); await page.waitForTimeout(40);
r.slideOn = await page.evaluate(() => !globalThis.__catsup.editor.config.get("slide", "on"));   // G G 只管这一次：工具条上的常驻开关不动
for (let i = 1; i <= 8; i++) { await page.mouse.move(505, 402 - 8 * i); await page.waitForTimeout(16); }
r.hint = await page.evaluate(() => globalThis.__catsup.hud.status());
await page.keyboard.press("Enter"); await page.waitForTimeout(60);
r.up = { p: await pts(), steps: (await page.evaluate(() => globalThis.__catsup.editor.history.steps())) - st0 };
// ③ 往下
await page.mouse.move(500, 400); await page.mouse.move(505, 402); await page.waitForTimeout(40);
await page.keyboard.press("g"); await page.waitForTimeout(40); await page.keyboard.press("g"); await page.waitForTimeout(40);   // G G 只管一次：再来一次要再按两下
for (let i = 1; i <= 8; i++) { await page.mouse.move(505, 402 + 12 * i); await page.waitForTimeout(16); }
await page.keyboard.press("Enter"); await page.waitForTimeout(60);
r.down = { p: await pts() };
// ⑤ 单按 G 往右拖 = 照常移动（离开了竖边：x 变了）
await page.mouse.move(500, 400); await page.mouse.move(505, 402); await page.waitForTimeout(40);
await page.keyboard.press("g"); await page.waitForTimeout(40);
for (let i = 1; i <= 6; i++) { await page.mouse.move(505 + 10 * i, 402); await page.waitForTimeout(16); }
await page.keyboard.press("Enter"); await page.waitForTimeout(60);
r.plain = { p: await pts() };
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const sameXY = (ps) => ps.every((p, i) => Math.abs(p[0] - info.xy[i][0]) < 1e-9 && Math.abs(p[1] - info.xy[i][1]) < 1e-9);
const level = (ps) => ps.every((p) => Math.abs(p[2] - ps[0][2]) < 1e-9);
const ok = r.strip && r.slideOn && /沿边滑/.test(r.hint) && sameXY(r.up.p) && level(r.up.p) && r.up.p[0][2] > info.mid + 0.05 && r.up.p[0][2] < info.z1 + 1e-9 && r.up.steps === 1
  && sameXY(r.down.p) && level(r.down.p) && r.down.p[0][2] < r.up.p[0][2] - 0.05 && r.down.p[0][2] > info.z0 - 1e-9 && Math.abs(r.plain.p[0][0] - info.xy[0][0]) > 0.02 && errs.length === 0;
console.log(ok ? "probe-edge-slide OK" : "probe-edge-slide FAIL");
process.exit(ok ? 0 : 1);

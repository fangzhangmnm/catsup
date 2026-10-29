// 锁看得见（controller/lock-guide.ts + render3 lockLines；created 2026-10-28 by Claude Opus 5.5）。user 10-28 晚「轴锁的时候能不能看到小轴线，blender就是这么做的」。
// ① 转过的网格体组件里、全选、移动工具、锁 Z：画一根线，方向 = 组件自己的 Z（不是世界 Z）、过选区中心 ② 拖的过程中：线过按下的那一点（锚点）
// ③ 解锁：线没了 ④ 面锁 XY：两根（X、Y）⑤ 硬表面画线：点了起点、按 ↑ 锁 Z：线过起点、沿世界 Z。跑法：python3 -m http.server 8765 后 node test/probes/probe-lock-line.mjs [截图路径]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
const shot = process.argv[2] && !process.argv[2].startsWith("http") ? process.argv[2] : null;
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), S = () => e.scene, px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 17, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const near = (a, b, tol = 1e-6) => a && b && Math.abs(a.x - b.x) < tol && Math.abs(a.y - b.y) < tol && Math.abs(a.z - b.z) < tol;
  const nrm = (v) => { const l = Math.hypot(v.x, v.y, v.z); return { x: v.x / l, y: v.y / l, z: v.z / l }; };
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("斜"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  const a = 37 * Math.PI / 180, bb = 20 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(bb), sb = Math.sin(bb);
  e.commitOp({ op: "transformInstance", def: S().root, instance: inst.id, xform: [ca, -sa * cb, sa * sb, 2, sa, ca * cb, -ca * sb, 1, 0, sb, cb, 0.5] });
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const X = S().xformOfContext(e.ctx), L2W = (lp) => ({ x: X[0] * lp.x + X[1] * lp.y + X[2] * lp.z + X[3], y: X[4] * lp.x + X[5] * lp.y + X[6] * lp.z + X[7], z: X[8] * lp.x + X[9] * lp.y + X[10] * lp.z + X[11] });
  const ownZ = nrm({ x: X[2], y: X[6], z: X[10] });
  { const ctr = L2W(P(0, 0.5, 0.5)); e.cam.setView("iso"); e.cam.target = ctr; e.cam.halfH = 2.4; e.draw(); await sleep(20); }
  // ①
  e.setTool("move"); e.selectAll(); e.setAxisLock("z"); e.draw(); await sleep(30);
  const vs = m().verts(), mean = vs.reduce((acc, v) => { const w = L2W(m().pt(v)); return { x: acc.x + w.x / vs.length, y: acc.y + w.y / vs.length, z: acc.z + w.z / vs.length }; }, P(0, 0, 0));
  const g1 = e.lockGuide();
  out.one = { n: g1?.length ?? 0, color: g1?.[0]?.color, ownZ: g1 ? near(g1[0].dir, ownZ) || near(g1[0].dir, { x: -ownZ.x, y: -ownZ.y, z: -ownZ.z }) : false, notWorldZ: g1 ? Math.abs(g1[0].dir.z) < 0.99 : false, throughMean: g1 ? near(g1[0].through, mean, 1e-6) : false, visible: e.r3.overlayVisible("lockLines") };
  // ②
  { const corner = vs.map((v) => L2W(m().pt(v))).sort((p, q) => { const ey = e.cam.eye(); return Math.hypot(p.x - ey.x, p.y - ey.y, p.z - ey.z) - Math.hypot(q.x - ey.x, q.y - ey.y, q.z - ey.z); })[0], s0 = px(corner);
    fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10);
    for (let i = 1; i <= 5; i++) { fire("pointermove", s0.x + 6 * i, s0.y - 9 * i, 1); await sleep(15); }
    e.draw(); await sleep(20);
    const g2 = e.lockGuide();
    out.two = { n: g2?.length ?? 0, throughAnchor: g2 ? !near(g2[0].through, mean, 1e-3) : false, visible: e.r3.overlayVisible("lockLines") };
    globalThis.__lockShotReady = true; await sleep(10);
    out.shotAt = { x: s0.x, y: s0.y };
    fire("pointerup", s0.x + 30, s0.y - 45, 0); await sleep(40); }
  // ③
  e.setAxisLock(null); e.draw(); await sleep(20);
  out.three = { none: e.lockGuide() === null, hidden: !e.r3.overlayVisible("lockLines") };
  // ④
  e.selectAll(); e.lockKey("z", true); e.draw(); await sleep(20);
  const g4 = e.lockGuide();
  out.four = { colors: g4 ? g4.map((l) => l.color).join("") : "" };
  e.setAxisLock(null); e.exitTo(0); await sleep(20);
  // ⑤ 硬表面画线
  e.setMode?.("geometry"); e.setTool("line"); await sleep(10);
  const p0 = P(-3, -3, 0), s0 = px(p0);
  fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10); fire("pointerup", s0.x, s0.y, 0); await sleep(20);
  fire("pointermove", s0.x + 20, s0.y - 30, 0); await sleep(20);
  e.lockKey("z", false); fire("pointermove", s0.x + 22, s0.y - 34, 0); await sleep(20); e.draw(); await sleep(20);
  const g5 = e.lockGuide();
  out.five = { n: g5?.length ?? 0, color: g5?.[0]?.color, worldZ: g5 ? Math.abs(Math.abs(g5[0].dir.z) - 1) < 1e-9 : false, throughStart: g5 ? Math.hypot(g5[0].through.x - p0.x, g5[0].through.y - p0.y) < 0.05 : false, anchor: e.anchor3 ?? null };
  e.cancelGesture?.();
  return out;
});
if (shot) {   // 截图：重新做一遍 ② 停在拖的半路（锁 Z 的线 + 预演）
  await page.evaluate(async () => {
    const e = globalThis.__catsup.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), S = e.scene;
    const inst = [...S.def(S.root).instances.values()][0];
    e.setMode?.("freeform"); e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
    e.setTool("move"); e.selectAll(); e.setAxisLock("z"); e.draw(); await sleep(60);
  });
  await page.waitForTimeout(200);
  await page.screenshot({ path: shot });
}
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const ok = res.one.n === 1 && res.one.color === "z" && res.one.ownZ && res.one.notWorldZ && res.one.throughMean && res.one.visible
  && res.two.n === 1 && res.two.throughAnchor && res.two.visible && res.three.none && res.three.hidden && res.four.colors === "xy"
  && res.five.n === 1 && res.five.color === "z" && res.five.worldZ && res.five.throughStart && errs.length === 0;
console.log(ok ? "probe-lock-line OK" : "probe-lock-line FAIL");
process.exit(ok ? 0 : 1);

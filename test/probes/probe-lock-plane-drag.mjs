// 锁面拖动跟手（白模 W-13，2026-11-11 Claude Opus 5.5；user 11-11 凌晨报：自由建模、移动、锁 XY、透视、选了几个高度不同的点拖——「有的方向快有的方向慢」）。
// 透视下锁 XY（法向 Z），按在一个选中的点上，朝上 / 下 / 左 / 右 / 两个斜向各拖 100 个像素：被抓的那个点在屏幕上各走 100 ± 1 个像素、方向和光标一样；
// 别的选中的点（高度不同）走同一个世界位移；每次一步撤销回去。挤出（锁 XY）同一条。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-lock-plane-drag.mjs [网址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const S = () => e.scene, root = () => S().def(S().root);
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块");
  e.runAction("object.toMesh"); await sleep(30);
  const inst = [...root().instances.values()][0], def = inst.def;
  e.cam.setView("iso"); e.cam.projection = "persp"; e.zoomExtents(); e.cam.halfH *= 2.2; e.draw(); await sleep(30);
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const m = () => S().mesh(def).kernel, xf = inst.xform, W = (q) => ({ x: xf[0] * q.x + xf[1] * q.y + xf[2] * q.z + xf[3], y: xf[4] * q.x + xf[5] * q.y + xf[6] * q.z + xf[7], z: xf[8] * q.x + xf[9] * q.y + xf[10] * q.z + xf[11] });   // 定义坐标 → 世界（组件原点在底面中心）
  const vAt = (q) => m().verts().find((v) => { const p = m().pt(v); return Math.abs(p.x - q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9; });
  const grabV = vAt(P(0.5, 0.5, 1)), otherV = vAt(P(-0.5, -0.5, 0));   // 抓顶上那个角；底下另一个角一起选（高度不同）
  const drag = async (tool, dir) => {
    e.setTool(tool); await sleep(10);
    e.deselectAll(); e.selection.verts.add(grabV); e.selection.verts.add(otherV);
    if (tool === "pp") { e.selection.verts.clear(); e.selection.verts.add(grabV); }   // 挤出：只挤这一个点（拉出一条边，新点 = 被抓的点）
    e.setPlaneLock("z"); await sleep(10);
    const before = new Set(m().verts()), p0w = W(m().pt(grabV)), o0w = W(m().pt(otherV)), s0 = px(p0w), n = Math.hypot(dir[0], dir[1]), dx = dir[0] / n * 100, dy = dir[1] / n * 100;
    const pos0 = e.history.position();
    fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10);
    for (let i = 1; i <= 10; i++) { fire("pointermove", s0.x + dx * i / 10, s0.y + dy * i / 10, 1); await sleep(8); }
    fire("pointerup", s0.x + dx, s0.y + dy, 0); await sleep(40);
    const fresh = m().verts().filter((v) => !before.has(v)), moved = tool === "pp" ? (fresh.length === 1 ? W(m().pt(fresh[0])) : null) : W(m().pt(grabV));   // 挤出一个点 = 长出一个新点，新点就是被抓的那个
    const s1 = moved ? px(moved) : null, err = s1 ? Math.hypot(s1.x - (s0.x + dx), s1.y - (s0.y + dy)) : Infinity, step = s1 ? Math.hypot(s1.x - s0.x, s1.y - s0.y) : 0;
    const d = moved ? { x: moved.x - p0w.x, y: moved.y - p0w.y, z: moved.z - p0w.z } : null, od = W(m().pt(otherV));
    const sameD = tool === "pp" ? true : !!d && Math.abs(od.x - o0w.x - d.x) < 1e-9 && Math.abs(od.y - o0w.y - d.y) < 1e-9 && Math.abs(od.z - o0w.z - d.z) < 1e-9;
    const steps = e.history.position() - pos0;
    key("z"); await sleep(30);
    const back = Math.abs(W(m().pt(grabV)).x - p0w.x) < 1e-12 && Math.abs(W(m().pt(grabV)).y - p0w.y) < 1e-12 && m().verts().length === 8;
    e.setPlaneLock(null);
    return { tool, dir, err: +err.toFixed(2), step: +step.toFixed(2), dz: d ? +d.z.toFixed(9) : null, sameD, steps, back };
  };
  const out = [];
  for (const tool of ["move", "pp"]) for (const dir of [[0, -1], [0, 1], [-1, 0], [1, 0], [1, -1], [-1, 1]]) out.push(await drag(tool, dir));
  return out;
});
const ok = res.every((r) => r.err <= 1 && r.dz === 0 && r.sameD && r.back) && !errs.length;
for (const r of res) console.log(`${r.tool} dir ${r.dir.join(",")}: 走了 ${r.step} px，离光标 ${r.err} px，dz=${r.dz}，别的点同位移 ${r.sameD}，撤销回去 ${r.back}`);
if (errs.length) console.log(errs);
console.log(ok ? "probe-lock-plane-drag OK" : "probe-lock-plane-drag FAIL");
await b.close();
process.exit(ok ? 0 : 1);

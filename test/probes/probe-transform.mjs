// 缩放柄埋在几何里也点得中（user 2026-10-25「缩放的gizmos如果卡几何里面应该能点中」）：柄透视画、透视拾；屏上叠在一起 = 离相机近的赢。
// ① 小盒做成组、外面再画一个大盒把它包住 → 选组 → 缩放工具拖一个角柄（在大盒里面）→ 组真的放大了。
// ③ ×−1 吸附：拖面心柄过对面差几个像素 → 正好镜像。
// ④ 移动箭头：沿 X 拖 1 m 正好 1 m、悬停高亮、数值小窗改距离；⑤ 旋转环：咬到 45°（2026-10-26）。
// ② 前视图 / 后视图对着一个盒：前后两个面心柄叠在屏上同一处 → 按住的是前面那个（锚点 = 后面的面心）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
if (process.env.SHOT) await page.exposeFunction("__SHOT", () => page.screenshot({ path: `${process.env.SHOT}-scale-xray.png` }));
if (process.env.SHOT) await page.exposeFunction("__SHOT2", () => page.screenshot({ path: `${process.env.SHOT}-gizmo.png` }));
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const drag = async (a, z, steps = 8) => { fire("pointerdown", a.x, a.y, 1); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1); await sleep(16); } await sleep(80); fire("pointerup", z.x, z.y, 0); await sleep(30); };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  e.setGrid({ ...e.grid, on: false });
  const out = {};
  // ①
  box(-0.5, -0.5, 0.5, 0.5, 0.5, 1.5);
  e.selectAll(); e.makeGroup();
  box(-2, -2, 0, 2, 2, 2);
  e.cam.setView("iso"); e.zoomExtents();
  e.setTool("select");
  const gk = [...e.scene.brep(e.scene.root).groups.keys()][0];
  e.selectedPools.clear(); e.selectedPools.set(`g${gk}`, { kind: "group", group: gk });
  e.setTool("transform");
  const corner = P(0.5, 0.5, 1.5), out1 = P(1, 1, 2.5);
  const a = px(corner), z = px({ x: corner.x + 0.5, y: corner.y + 0.5, z: corner.z + 0.5 });
  if (globalThis.__SHOT) await globalThis.__SHOT();
  await drag(a, z);
  const gv = e.worldGeom(), xs = gv.slots.filter((s) => s.pool && s.pool.group === gk).flatMap((s) => [...gv.parts[s.index].verts.values()].map((v) => v.x));
  out.groupMaxX = xs.length ? +Math.max(...xs).toFixed(3) : null;
  out.buriedScaled = out.groupMaxX !== null && out.groupMaxX > 0.6;
  // ②
  e.clearAll(); e.setTool("select");
  box(0, 0, 0, 1, 1, 1);
  out.anchors = {};
  for (const [view, y] of [["front", 0], ["back", 1]]) {
    e.cam.setView(view); e.zoomExtents();
    e.selectAll(); e.setTool("transform");
    const fc = px(P(0.5, y, 0.5));
    fire("pointerdown", fc.x, fc.y, 1); await sleep(30);
    const h = e.handlers.transform.h;
    out.anchors[view] = h ? h.anchor.y : null;
    fire("pointerup", fc.x, fc.y, 0); await sleep(30);
    e.cancel();
  }
  // ③ ×−1 吸附（user 2026-10-25「scale有snapping吗。最常用的就是用来x -1」）：盒 x∈[1,2]，拖右面心柄到 x≈0.03（差几个像素）→ 咬到 −1 = x∈[0,1]
  e.clearAll(); e.setTool("select");
  box(1, 0, 0, 2, 1, 1);
  e.cam.setView("iso"); e.zoomExtents();
  e.selectAll(); e.setTool("transform");
  await drag(px(P(2, 0.5, 0.5)), px(P(0.03, 0.5, 0.5)), 12);
  const vx = e.kernel.vertices().map((v) => v.x);
  out.negX = [Math.min(...vx), Math.max(...vx)].map((x) => +x.toFixed(6));
  out.faces = e.kernel.faces().length;
  // ④ 移动箭头（2026-10-26，user「或者其实scale改名就是move rotate scale全家？」）：盒 [0,1]³，格点吸附开 0.2 m；X 箭头中段抓住、沿 X 拖 1 m → 正好 1 m；
  //    悬停 Y 箭头 = 高亮；落定后数值小窗输「2」= 改成 2 m
  e.clearAll(); e.setTool("select");
  box(0, 0, 0, 1, 1, 1);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4;
  e.setGrid({ ...e.grid, on: true, step: 1, subdiv: 5 });
  e.selectAll(); e.setTool("transform");
  const O = P(0.5, 0.5, 0.5), ppm = (d) => { const a0 = px(O), b0 = px({ x: O.x + d.x, y: O.y + d.y, z: O.z + d.z }); return Math.hypot(a0.x - b0.x, a0.y - b0.y); };
  const onArrow = (d) => { const L = 50 / ppm(d); return { x: O.x + d.x * L, y: O.y + d.y * L, z: O.z + d.z * L }; };   // 箭杆 50 px 处（箭头 14–64 px，环 84 px）
  const yGrip = px(onArrow(P(0, 1, 0)));
  fire("pointermove", yGrip.x, yGrip.y, 0); await sleep(30);
  out.hotY = e.handlers.transform.hot;
  const g0 = onArrow(P(1, 0, 0)), g1 = { x: g0.x + 1, y: g0.y, z: g0.z };
  await drag(px(g0), px(g1), 10);
  const xs4 = () => { const v = e.kernel.vertices().map((q) => q.x); return [Math.min(...v), Math.max(...v)].map((x) => +x.toFixed(6)); };
  out.moved = xs4();
  out.vcbKind = e.vcbState().kind;
  out.vcb2 = e.applyVcb("2").ok; out.moved2 = xs4();
  // ⑤ 旋转环：新盒 [0,1]²×[0,1]，Z 环（水平）从 20° 抓到 66° → 格点吸附开 = 咬到 45° → 盒子转成菱形，最大 x = 0.5 + √2/2
  e.clearAll(); e.setTool("select");
  box(0, 0, 0, 1, 1, 1);
  e.selectAll(); e.setTool("transform");
  const R = 84 / ppm(P(1, 0, 0)), ring = (deg) => ({ x: O.x + R * Math.cos(deg * Math.PI / 180), y: O.y + R * Math.sin(deg * Math.PI / 180), z: O.z });
  const r0 = px(ring(20));   // 不抓 0°：那里 Y 环和 Z 环相交
  fire("pointerdown", r0.x, r0.y, 1);
  for (let d = 24; d <= 66; d += 6) { const q = px(ring(d)); fire("pointermove", q.x, q.y, 1); await sleep(16); }
  const qe = px(ring(66)); fire("pointermove", qe.x, qe.y, 1); await sleep(80); fire("pointerup", qe.x, qe.y, 0); await sleep(30);
  out.rotMaxX = +Math.max(...e.kernel.vertices().map((q) => q.x)).toFixed(4);
  out.rotKind = e.vcbState().kind;
  out.label = [...document.querySelectorAll(".hud-rail-tools .tb-btn")].map((b) => b.textContent.trim()).filter((t) => t === "变换" || t === "缩放");
  if (globalThis.__SHOT2) await globalThis.__SHOT2();
  return out;
});
console.log(JSON.stringify(res));
const near = res.anchors.front === 1 && res.anchors.back === 0;   // 前视图相机在 −Y：前面 = y=0 的面心柄、锚点 y=1；后视图反过来
const ok = res.buriedScaled && near && res.negX[0] === 0 && res.negX[1] === 1 && res.faces === 6
  && res.hotY === "my" && res.moved[0] === 1 && res.moved[1] === 2 && res.vcbKind === "move" && res.vcb2 && res.moved2[0] === 2 && res.moved2[1] === 3
  && Math.abs(res.rotMaxX - (0.5 + Math.SQRT1_2)) < 1e-3 && res.rotKind === "rotate" && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

// 缩放柄埋在几何里也点得中（user 2026-10-25「缩放的gizmos如果卡几何里面应该能点中」）：柄透视画、透视拾；屏上叠在一起 = 离相机近的赢。
// ① 小盒做成组、外面再画一个大盒把它包住 → 选组 → 缩放工具拖一个角柄（在大盒里面）→ 组真的放大了。
// ③ ×−1 吸附：拖面心柄过对面差几个像素 → 正好镜像。
// ② 前视图 / 后视图对着一个盒：前后两个面心柄叠在屏上同一处 → 按住的是前面那个（锚点 = 后面的面心）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
if (process.env.SHOT) await page.exposeFunction("__SHOT", () => page.screenshot({ path: `${process.env.SHOT}-scale-xray.png` }));
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
  out.label = [...document.querySelectorAll(".hud-rail-tools .tb-btn")].map((b) => b.textContent.trim()).filter((t) => t === "变换" || t === "缩放");
  return out;
});
console.log(JSON.stringify(res));
const near = res.anchors.front === 1 && res.anchors.back === 0;   // 前视图相机在 −Y：前面 = y=0 的面心柄、锚点 y=1；后视图反过来
const ok = res.buriedScaled && near && res.negX[0] === 0 && res.negX[1] === 1 && res.faces === 6 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

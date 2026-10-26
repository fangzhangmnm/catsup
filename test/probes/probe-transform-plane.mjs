// 变换工具的平面（双轴）缩放块（2026-10-26，user「然后应该有一个均匀放大的快捷键，或者你做一下xy yz xz xyz的handle？」「以及变换你还是没给我xy yz xz的手柄」）。
// 盒 [0,1]³，轴心 = 包围盒中心：① 悬停 xy 块 = 高亮 ② 拖 xy 块 ×2 → x、y ∈ [−0.5, 1.5]、z 不变 ③ 数值小窗「3」→ 两轴 ×3 ④ 撤销回原样
// ⑤ yz 块 ×2 → y、z 变、x 不变。SHOT=前缀 截图。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
if (process.env.SHOT) await page.exposeFunction("__SHOT", () => page.screenshot({ path: `${process.env.SHOT}-plane.png` }));
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const ext = () => { const v = e.kernel.vertices(); const r3 = (k) => [Math.min(...v.map((q) => q[k])), Math.max(...v.map((q) => q[k]))].map((x) => +x.toFixed(4)); return { x: r3("x"), y: r3("y"), z: r3("z") }; };
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw();
  e.selectAll(); e.config.set("transform", "pivot", "bbox"); e.setTool("transform"); await sleep(30);
  const T = e.handlers.transform, G = () => T.viewExtras(e.toolCtx).xformGizmo;
  const g = G(), O = g.origin, at = (a, b2, k) => ({ x: O.x + (g.axes[a].x + g.axes[b2].x) * g.plane * k, y: O.y + (g.axes[a].y + g.axes[b2].y) * g.plane * k, z: O.z + (g.axes[a].z + g.axes[b2].z) * g.plane * k });
  const out = {};
  const hxy = px(at("x", "y", 1));
  fire("pointermove", hxy.x, hxy.y, 0); await sleep(30);
  out.hot = T.hot;
  if (globalThis.__SHOT) await globalThis.__SHOT();
  // 拖到 ×2.0：在 xy 平面里沿对角线到 2 倍远
  const to = px(at("x", "y", 2));
  fire("pointerdown", hxy.x, hxy.y, 1);
  for (let i = 1; i <= 10; i++) { fire("pointermove", hxy.x + (to.x - hxy.x) * i / 10, hxy.y + (to.y - hxy.y) * i / 10, 1); await sleep(16); }
  await sleep(60); fire("pointerup", to.x, to.y, 0); await sleep(40);
  out.xy2 = ext();
  out.vcb = e.applyVcb("3").ok; out.xy3 = ext();
  e.undo(); await sleep(30); out.undone = ext();
  // yz 块
  e.selectAll(); e.setTool("select"); e.setTool("transform"); await sleep(30);
  const g2 = G(); const at2 = (k) => ({ x: g2.origin.x + (g2.axes.y.x + g2.axes.z.x) * g2.plane * k, y: g2.origin.y + (g2.axes.y.y + g2.axes.z.y) * g2.plane * k, z: g2.origin.z + (g2.axes.y.z + g2.axes.z.z) * g2.plane * k });
  const a = px(at2(1)), z2 = px(at2(2));
  fire("pointermove", a.x, a.y, 0); await sleep(20); fire("pointerdown", a.x, a.y, 1);
  for (let i = 1; i <= 10; i++) { fire("pointermove", a.x + (z2.x - a.x) * i / 10, a.y + (z2.y - a.y) * i / 10, 1); await sleep(16); }
  await sleep(60); fire("pointerup", z2.x, z2.y, 0); await sleep(40);
  out.yz2 = ext();
  return out;
});
console.log(JSON.stringify(res));
const eq = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
const ok = res.hot === "pxy" && eq(res.xy2, { x: [-0.5, 1.5], y: [-0.5, 1.5], z: [0, 1] }) && res.vcb && eq(res.xy3, { x: [-1, 2], y: [-1, 2], z: [0, 1] })
  && eq(res.undone, { x: [0, 1], y: [0, 1], z: [0, 1] }) && eq(res.yz2, { x: [0, 1], y: [-0.5, 1.5], z: [-0.5, 1.5] }) && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

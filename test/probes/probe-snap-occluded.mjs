// 吸附不吸被挡住的东西（2026-10-26）。user：「然后面上面拖的时候为什么会有时候突然弹到下面。你看一下我的坦克顶部那个圆盖子，你在炮塔顶面上随便拖一下，有时候会抖动」。
// 根因：线的被挡区间判定用严格不等号，候选先被钳到线段端点、整段都被挡时端点恰在区间边界上 → 当成可见 → 隔着炮塔吸到后面车身边的一小段。
// 场景：盒 [0,1]³ 挡在前面；正后方（沿视线）藏一条切成 16 小段的线。光标扫过盒子看得见的三个面：每次吸附的点，
// 在屏上它那个位置最前面的面不许比它近（= 没被挡）。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: 0 }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  e.setGrid({ ...e.grid, on: false });
  e.cam.setView("iso");
  box(0, 0, 0, 1, 1, 1);
  // 视线方向（从眼睛往里）：取盒心处的 viewDir 反向
  const vd = e.toolCtx.frame().viewDir(P(0.5, 0.5, 0.5)), into = { x: -vd.x, y: -vd.y, z: -vd.z };
  const side = (() => { const cx = { x: into.y, y: -into.x, z: 0 }, l = Math.hypot(cx.x, cx.y) || 1; return { x: cx.x / l, y: cx.y / l, z: 0 }; })();
  const cen = { x: 0.5 + into.x * 2, y: 0.5 + into.y * 2, z: 0.5 + into.z * 2 };
  const segs = [];
  for (let i = 0; i < 16; i++) { const t0 = -0.6 + 1.2 * i / 16, t1 = -0.6 + 1.2 * (i + 1) / 16; segs.push([{ x: cen.x + side.x * t0, y: cen.y + side.y * t0, z: cen.z }, { x: cen.x + side.x * t1, y: cen.y + side.y * t1, z: cen.z }]); }
  e.commitOp({ op: "addEdges", segs });
  e.zoomExtents(); e.cam.halfH *= 0.7; e.cam.target = P(0.5, 0.5, 0.5); e.draw();
  e.setTool("line"); e.cancel(); await sleep(20);
  const frame = e.toolCtx.frame(), vp = e.vp();
  const occluded = (p) => {   // 屏上 p 那个位置最前面的面比 p 近 = 被挡
    const q = px(p), R = frame.ray(q.x, q.y, vp), h = e.pickAt(q.x, q.y);
    if (h.face === undefined) return false;
    const pl = e.liveWorld().planeOf(h.face).plane, dn = pl.n.x * R.dir.x + pl.n.y * R.dir.y + pl.n.z * R.dir.z;
    if (Math.abs(dn) < 1e-9) return false;
    const tf = (pl.d - (pl.n.x * R.origin.x + pl.n.y * R.origin.y + pl.n.z * R.origin.z)) / dn;
    const tp = (p.x - R.origin.x) * R.dir.x + (p.y - R.origin.y) * R.dir.y + (p.z - R.origin.z) * R.dir.z;
    return tp > tf + 1e-3;
  };
  const pts = [];
  for (let i = 1; i < 20; i++) for (let j = 1; j < 20; j++) { const u = i / 20, v = j / 20; pts.push(P(u, v, 1), P(u, 0, v), P(1, u, v), P(0, u, v), P(u, 1, v)); }
  let tested = 0, bad = 0, sample = null;
  for (const w of pts) {
    const s = px(w);
    if (s.x < 0 || s.y < 0 || s.x > vp.w || s.y > vp.h) continue;
    const h = e.pickAt(s.x, s.y);
    if (h.face === undefined) continue;   // 只扫盒子看得见的面
    fire("pointermove", s.x, s.y); await sleep(0);
    const sn = e.snapInfo;
    if (!sn?.kind) continue;
    tested++;
    if (occluded(sn.p)) { bad++; sample ??= { cursor: w, kind: sn.kind, p: sn.p }; }
  }
  return { tested, bad, sample };
});
console.log(JSON.stringify(res));
const ok = res.tested > 200 && res.bad === 0 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

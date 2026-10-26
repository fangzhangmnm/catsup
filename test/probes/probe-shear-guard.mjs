// 斜切护栏（2026-10-26，user「斜切：和gltf对齐。然后如果发生斜切能不能在发生的时候护栏住，然后提示报错？」）。
// 组件 A（盒）转 30°，组件 B（盒）不转：
// ① 只选 A → 缩放工具的包围盒沿 A 自己的轴（斜的）；拖 +X 面心柄 ×2 → A 沿自己的 X 拉长、矩阵没有斜切
// ② 撤销；A、B 一起选 → 包围盒沿上下文的轴；拖 +X 面心柄 → 拖的时候提示「会斜切」、松手被拦（提示行说原因）、场景不变、没有弹错误胶囊
// created 2026-10-26 by Claude Opus 5.5
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
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const shear = (X) => { const cl = [0, 1, 2].map((j) => [X[j], X[4 + j], X[8 + j]]); const d = (a, b2) => a[0] * b2[0] + a[1] * b2[1] + a[2] * b2[2], n = (a) => Math.hypot(...a); return [[0, 1], [0, 2], [1, 2]].some(([i, j]) => Math.abs(d(cl[i], cl[j])) / (n(cl[i]) * n(cl[j])) > 1e-6); };
  const errCapsule = () => !!document.querySelector(".error-capsule:not([hidden]), .err-capsule:not([hidden])");
  e.setGrid({ ...e.grid, on: false });
  box(-0.5, -0.5, 0, 0.5, 0.5, 1); e.selectAll(); e.makeComponent("A"); e.cancel();
  box(2, -0.5, 0, 3, 0.5, 1); e.setTool("select"); e.cancel();
  { const k = e.kernel; e.selection.faces = new Set(k.faces().map((f) => f.id)); e.selection.edges = new Set(k.edges().map((x) => x.id)); e.makeComponent("B"); e.cancel(); }
  const S = () => e.scene, root = () => S().def(S().root);
  const [iA, iB] = [...root().instances.values()].map((i) => i.id);
  const a = Math.PI / 6, X = [Math.cos(a), -Math.sin(a), 0, 0, Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0];
  e.commitOp({ op: "transformInstance", def: S().root, instance: iA, xform: X });
  e.cam.setView("top"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw();
  const out = {};
  // ① 只选 A
  e.selectedPools.clear(); e.selectedPools.set(`i${iA}`, { kind: "instance", instance: iA }); e.setTool("scale"); await sleep(20);
  const H = e.handlers.scale, hs = H.handles(e.toolCtx), fx = hs.find((h) => h.kind === "face" && h.axis && Math.abs(h.axis.x - Math.cos(a)) < 1e-9 && Math.abs(h.axis.y - Math.sin(a)) < 1e-9);
  out.orientedFace = !!fx;
  const drag = async (h, f) => { const p0 = px(h.p), q = { x: h.anchor.x + (h.p.x - h.anchor.x) * f, y: h.anchor.y + (h.p.y - h.anchor.y) * f, z: h.anchor.z + (h.p.z - h.anchor.z) * f }, p1 = px(q); fire("pointermove", p0.x, p0.y, 0); await sleep(10); fire("pointerdown", p0.x, p0.y, 1); for (let i = 1; i <= 10; i++) { fire("pointermove", p0.x + (p1.x - p0.x) * i / 10, p0.y + (p1.y - p0.y) * i / 10, 1); await sleep(16); } await sleep(60); const hintMid = document.querySelector("#hint")?.textContent ?? ""; fire("pointerup", p1.x, p1.y, 0); await sleep(60); return hintMid; };
  if (fx) await drag(fx, 2);
  const xa = root().instances.get(iA).xform;
  out.ownAxis = { shear: shear(xa), lenX: +Math.hypot(xa[0], xa[4], xa[8]).toFixed(4), lenY: +Math.hypot(xa[1], xa[5], xa[9]).toFixed(4) };
  e.undo(); await sleep(20);
  while (e.contextCrumbs().length > 1) e.exitContext();
  // ② A + B 一起
  e.setTool("select"); e.cancel();
  e.selectedPools.set(`i${iA}`, { kind: "instance", instance: iA }); e.selectedPools.set(`i${iB}`, { kind: "instance", instance: iB }); e.setTool("scale"); await sleep(20);
  const hs2 = H.handles(e.toolCtx), fx2 = hs2.find((h) => h.kind === "face" && h.axis && Math.abs(h.axis.x - 1) < 1e-9);
  const before = JSON.stringify([...root().instances.values()].map((i) => i.xform.map((v) => +v.toFixed(6))));
  const hintMid = fx2 ? await drag(fx2, 1.5) : "";
  const after = JSON.stringify([...root().instances.values()].map((i) => i.xform.map((v) => +v.toFixed(6))));
  out.multi = { warnedWhileDragging: /斜切/.test(hintMid), hintAfter: document.querySelector("#hint")?.textContent ?? "", unchanged: before === after, capsule: errCapsule() };
  return out;
});
console.log(JSON.stringify(res));
const ok = res.orientedFace && !res.ownAxis.shear && res.ownAxis.lenX === 2 && res.ownAxis.lenY === 1
  && res.multi.warnedWhileDragging && /斜切/.test(res.multi.hintAfter) && res.multi.unchanged && !res.multi.capsule && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

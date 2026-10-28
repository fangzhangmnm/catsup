// 细分接线（2026-10-28 Claude Opus 5.5；纪元账本 FM133）：① 自由建模右键没有「细分…」、右边「物体」钮 → 物体窗口「属性」页有「细分（Catmull-Clark）…」（2026-10-28 Claude Fable 5.1：物体级搬进物体窗口）② 点它 = 6 → 24 面、提示行说现在几张面
// ③ 马后炮「细分」改次数 2 → 96 面 ④ 撤销一下回到 6 面 ⑤ 强行对称开着细分：还是对称、只多一条 op（已经对称不重建另一半）⑥ 没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-subdivide.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const rclick = async () => { c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 120, clientY: r.top + 200, button: 2 })); await sleep(60); };
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)");
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); };
  const openObj = async () => { document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); };   // 右边「物体」钮 → 物体窗口（这一层）
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, hint = () => hud.status(), out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  // ①②
  await rclick(); out.notInMenu = !menu()?.querySelector('[data-menu-id="action:mesh.subdivide"]'); await closeAll();
  await openObj();
  const item = menu()?.querySelector('[data-menu-id="action:mesh.subdivide"]');
  out.one = !!item;
  item?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60);
  out.two = { faces: m().faceCount(), hint: hint() };
  // ③
  const panel = document.querySelector(".vcb-params:not([hidden])");
  out.three = { title: panel?.querySelector(".vcb-params-title")?.textContent ?? "" };
  e.setParam("levels", 2); await sleep(30);
  out.three.faces = m().faceCount();
  // ④
  e.undo(); await sleep(20);
  out.four = { faces: m().faceCount(), hint: hint() };
  // ⑤ 中缝切一圈、开强行对称、细分
  const xs = m().verts().map((v) => m().pt(v).x), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const cut = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).x - m().pt(m().edgeB[x]).x) > 1);
  e.commitOp({ op: "meshLoopCut", def, edge: cut, t: 0.5 });
  out.five = { cx };
  e.setMirror("force", 0);
  const pos0 = e.history.position();
  e.runAction("mesh.subdivide"); await sleep(30);
  const sym = (k) => k.verts().every((v) => { const q = k.pt(v); return k.verts().some((w) => { const p = k.pt(w); return Math.abs((p.x - cx) + (q.x - cx)) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9; }); });
  out.five.faces = m().faceCount(); out.five.sym = sym(m()); out.five.ops = e.history.position() - pos0;
  return out;
});
await b.close();
res.errs = errs;
const ok = res.notInMenu && res.one && res.two.faces === 24 && /24 张面/.test(res.two.hint) && /细分/.test(res.three.title) && res.three.faces === 96
  && res.four.faces === 6 && res.five.cx === 0 && res.five.faces === 40 && res.five.sym && res.five.ops === 1 && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-subdivide OK" : "probe-mesh-subdivide FAIL");
process.exit(ok ? 0 : 1);

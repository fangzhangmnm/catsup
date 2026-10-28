// 右键菜单的子菜单（2026-10-27 Claude Opus 5.5；纪元账本 FM128；user「新建能不能收到一个子菜单里面…需要把菜单的深模块做成支持子菜单的，还要防止跑到屏幕外面」）：
// ① 自由建模空地右键 → 菜单里只有一行「新建 ›」（没有平铺的五项）② 点它 → 旁边一层五项（立方体…平面），在屏幕里、在这一行右边 ③ 点「立方体」→ 建出来、菜单全关
// ④ 屏幕右边缘右键 → 子菜单往左开、不出屏 ⑤ 屏幕下边缘右键 → 菜单不出屏 ⑥ 鼠标悬停开 / 移到别的行一会儿后收。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-submenu.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
  const rclickClient = async (cx, cy) => { c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: cx, clientY: cy, button: 2 })); await sleep(60); };
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)"), layer = () => document.querySelector(".popup-menu.choice-layer.submenu");
  const rect = (el) => { const q = el.getBoundingClientRect(); return { l: Math.round(q.left), t: Math.round(q.top), r: Math.round(q.right), b: Math.round(q.bottom) }; };
  const inScreen = (q) => q.l >= 0 && q.t >= 0 && q.r <= vw && q.b <= vh;
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(40);
  // ①
  const mid = { x: Math.round(vw * 0.2), y: Math.round(vh * 0.4) };   // 屏幕左边一点（新建在自由建模里右键哪儿都露）
  await rclickClient(r.left + mid.x, r.top + mid.y);
  const row = () => menu()?.querySelector('[data-menu-id="submenu:新建"]');
  out.one = { row: !!row(), sub: !!row()?.classList.contains("menu-sub"), flat: !!menu()?.querySelector('[data-menu-id="new:box"]') };
  // ②
  row()?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  { const L = layer(); out.two = L ? { n: L.querySelectorAll(".menu-item").length, labels: [...L.querySelectorAll(".menu-label")].map((x) => x.textContent).join(","), inScreen: inScreen(rect(L)), right: rect(L).l >= rect(row()).r } : null; }
  // ③
  { const f0 = m().faceCount(); layer()?.querySelector('[data-choice-id="new:box"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60);
    out.three = { df: m().faceCount() - f0, menus: document.querySelectorAll(".popup-menu").length }; }
  await closeAll();
  // ④ 右边缘（空地：屏幕右边缘中间）
  await rclickClient(vw - 24, Math.round(vh * 0.45));
  out.fourMenu = !!menu();
  if (row()) { row().dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40); }
  { const L = layer(), R = row(); out.four = L && R ? { inScreen: inScreen(rect(L)), left: rect(L).r <= rect(R).l, menuIn: inScreen(rect(menu())) } : null; }
  await closeAll();
  // ⑤ 下边缘
  await rclickClient(Math.round(vw * 0.3), vh - 8);
  out.five = menu() ? { inScreen: inScreen(rect(menu())) } : null;
  if (row()) { row().dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40); out.fiveLayer = layer() ? inScreen(rect(layer())) : null; }
  await closeAll();
  // ⑥ 悬停开、移到别的行一会儿后收
  await rclickClient(r.left + mid.x, r.top + mid.y);
  row()?.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" })); await sleep(30);
  out.hoverOpen = !!layer();
  const other = [...(menu()?.querySelectorAll(".menu-item") ?? [])].find((x) => !x.classList.contains("menu-sub"));
  other?.dispatchEvent(new PointerEvent("pointerenter", { pointerType: "mouse" })); await sleep(60);
  out.stillOpenSoon = !!layer();
  await sleep(300);
  out.closedLater = !layer() && !!menu();
  await closeAll();
  return out;
});
await b.close();
res.errs = errs;
const ok = res.one.row && res.one.sub && !res.one.flat
  && res.two && res.two.n === 5 && res.two.labels === "立方体,圆柱,圆锥,球,平面" && res.two.inScreen && res.two.right
  && res.three.df === 6 && res.three.menus === 0
  && res.fourMenu && res.four && res.four.inScreen && res.four.left && res.four.menuIn
  && res.five && res.five.inScreen && res.fiveLayer === true
  && res.hoverOpen && res.stillOpenSoon && res.closedLater && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-submenu OK" : "probe-submenu FAIL");
process.exit(ok ? 0 : 1);

// 网格体的手标 + 默认平滑：右键菜单接线（2026-10-28 Claude Opus 5.5；纪元账本 FM129 / FM138）。
// ① 自由建模全选后右键 → 菜单里有「手标 ›」（不平铺）、没有「默认平滑 ›」——它是物件级的，住右边「物件」钮的物件窗口「属性」页（2026-10-28 Claude Fable 5.1：物件级搬进物件窗口）
//   ② 物件窗口 默认平滑 › 全部平滑 → 网格体的默认平滑 = smooth，平滑边淡线露出来 ③ 撤销提示行「撤销：默认平滑」、回到全是棱
// ④ 手标 › 标成棱 → 选中的边全带棱标、马后炮不弹（没参数）⑤ 默认平滑 › 按角度… → 马后炮小窗有角度、改成 100° 生效 ⑥ 没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-marks.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
  const rclick = async () => { c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + Math.round(vw * 0.2), clientY: r.top + Math.round(vh * 0.4), button: 2 })); await sleep(60); };
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)"), layer = () => document.querySelector(".popup-menu.choice-layer");
  const openObj = async () => { document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); };   // 右边「物件」钮 → 物件窗口（这一层）
  const smoothRow = () => !!menu()?.querySelector('[data-menu-id="submenu:默认平滑"]');
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); };
  const pick = async (sub, id, via = "menu") => {   // via = "menu"（右键，几何层）/ "object"（物件窗口，物件级）
    if (via === "object") await openObj(); else await rclick();
    const row = menu()?.querySelector(`[data-menu-id="submenu:${sub}"]`);
    if (!row) return false;
    row.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
    const it = layer()?.querySelector(`[data-choice-id="action:${id}"]`);
    if (!it) return false;
    it.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60);
    return true;
  };
  const hint = () => document.querySelector(".hint, #hint, .tip-line")?.textContent ?? "";
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], m = () => S().mesh(inst.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(40);
  out.mode = e.mode.id;
  m().setSmoothDefault({ mode: "hard", deg: 30 }); e.draw();
  // ⓪ 没选区：「默认平滑 ›」露（管整个网格体）、「手标 ›」不露（要选边）——2026-10-28 修：以前没选区网格体指令拿不到单位
  e.deselectAll(); await sleep(10); await rclick();
  out.zero = { smoothInMenu: smoothRow(), marks: !!menu()?.querySelector('[data-menu-id="submenu:手标"]') };
  await closeAll(); await openObj();
  out.zero.smooth = smoothRow(); out.zero.who = menu()?.querySelector(".menu-note")?.textContent ?? "";
  await closeAll();
  // ①
  e.selectAll(); await sleep(20);
  await rclick();
  out.one = { marks: !!menu()?.querySelector('[data-menu-id="submenu:手标"]'), smoothInMenu: smoothRow(), flat: !!menu()?.querySelector('[data-menu-id="action:mesh.markSharp"]') };
  await closeAll(); await openObj(); out.one.smooth = smoothRow(); await closeAll();
  // ②
  out.two = { clicked: await pick("默认平滑", "mesh.smooth.smooth", "object") };
  out.two.mode = m().smoothDefault.mode; out.two.softLines = e.r3.overlayVisible("soft");
  await closeAll();
  // ③
  e.undo(); await sleep(30);
  out.three = { mode: m().smoothDefault.mode, hint: hint() };
  // ④
  e.selectAll(); await sleep(20);
  out.four = { clicked: await pick("手标", "mesh.markSharp") };
  out.four.sharp = m().edges().filter((x) => m().edgeFlags[x] & 32).length; out.four.total = m().edges().length;
  await closeAll();
  // ⑤
  out.five = { clicked: await pick("默认平滑", "mesh.smooth.angle", "object") };
  const panel = document.querySelector(".vcb-params:not([hidden])");
  out.five.panel = !!panel;
  out.five.title = panel?.querySelector(".vcb-params-title")?.textContent ?? "";
  out.five.text = panel?.textContent?.slice(0, 120) ?? "";
  e.setParam("deg", 100); await sleep(30);
  out.five.deg = m().smoothDefault.deg;
  return out;
});
await b.close();
res.errs = errs;
const ok = res.mode === "freeform" && res.zero.smooth && !res.zero.smoothInMenu && !res.zero.marks && /组件「块」/.test(res.zero.who)
  && res.one.marks && res.one.smooth && !res.one.smoothInMenu && !res.one.flat
  && res.two.clicked && res.two.mode === "smooth" && res.two.softLines
  && res.three.mode === "hard"
  && res.four.clicked && res.four.sharp === res.four.total && res.four.total === 12
  && res.five.clicked && res.five.panel && res.five.title.includes("默认平滑") && res.five.deg === 100
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-marks OK" : "probe-mesh-marks FAIL");
process.exit(ok ? 0 : 1);

// test/probes/probe-context.mjs —— 上下文菜单 / 选区浮条 / 英制单位 headless 探针（#19，2026-10-21，Claude Fable 5.1）。
// 右键面 → 该面被选中 + 菜单弹出含「建组」→ 点建组 → group +1；Pencil 长按（选择工具）→ 菜单；选中后顶部浮条可见；VCB 英尺英寸输入。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-context.mjs（借 WeebPaint 的 playwright）。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏 */ });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = () => e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: extra.id ?? 9, pointerType: extra.pt ?? "mouse", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0 }));
  const Pt = (x, y, z = 0) => ({ x, y, z });
  const menu = () => document.querySelector(".popup-menu");
  const menuLabels = () => [...document.querySelectorAll(".popup-menu .menu-label")].map((el) => el.textContent);
  const out = {};
  // 盒子
  const B = [[0, 0], [2, 0], [2, 2], [0, 2]]; const segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([Pt(a[0], a[1], 0), Pt(b[0], b[1], 0)]); segs.push([Pt(a[0], a[1], 2), Pt(b[0], b[1], 2)]); segs.push([Pt(a[0], a[1], 0), Pt(a[0], a[1], 2)]); }
  e.addSegments(segs, "probe");
  e.cam.setView("iso"); e.zoomExtents();
  e.setTool("select");
  const top = px(Pt(1, 1, 2));
  out.selBarHiddenBefore = document.getElementById("selBar").hidden;
  // ① 右键顶面：先选中再弹菜单（右键 = pointerdown button 2 + pointerup + contextmenu）
  fire("pointerdown", top.x, top.y, { button: 2, buttons: 2 });
  fire("pointerup", top.x, top.y, { button: 2, buttons: 0 });
  c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + top.x, clientY: r.top + top.y, button: 2 }));
  await sleep(30);
  out.rightClickSelected = e.hasGeometrySelection();
  out.menuOpen = !!menu();
  out.menuLabels = menuLabels();
  // ② 点「建组」→ group +1
  const defsBefore = e.sceneRef.brep(e.sceneRef.root).groups.size;
  const groupBtn = [...document.querySelectorAll(".popup-menu .menu-item")].find((b) => b.textContent.includes("建组") && !b.textContent.includes("组件"));
  groupBtn?.click();
  await sleep(30);
  out.groupMade = e.sceneRef.brep(e.sceneRef.root).groups.size === defsBefore + 1;
  out.menuClosedAfterPick = !menu();
  // ③ 选区浮条：鼠标路由下不浮（右键在手边）；换成笔之后才浮（含「炸开」）
  out.selBarHiddenForMouse = document.getElementById("selBar").hidden;
  // 用笔点一下刚建的 group（选择工具里的单击 = 选它）：输入模态变成笔 + 选区还在 → 浮条出现
  fire("pointerdown", top.x, top.y, { pt: "pen", id: 12, button: 0, buttons: 1 }); fire("pointerup", top.x, top.y, { pt: "pen", id: 12, button: 0, buttons: 0 }); await sleep(30);
  out.selBarShown = !document.getElementById("selBar").hidden;
  out.selBarLabels = [...document.querySelectorAll("#selBar .selbar-btn")].map((b) => b.title);
  // ③b 面包屑（#25）：进 group → 左上角出「根 › 组」；点「根」退出
  e.enterSelected();
  const crumbsEl = document.getElementById("crumbs");
  out.crumbsShown = !crumbsEl.hidden && [...crumbsEl.querySelectorAll(".crumb")].map((x) => x.textContent).join("›") === "根›组";
  crumbsEl.querySelector("button.crumb")?.click(); await sleep(30);
  out.crumbsExit = e.contextDepth() === 0 && crumbsEl.hidden;
  // ④ Pencil 长按（选择工具）：600 ms 不动 → 菜单
  e.cancel();
  const side = px(Pt(2, 1, 1));
  fire("pointerdown", side.x, side.y, { pt: "pen", id: 11, button: 0, buttons: 1 });
  await sleep(650);
  out.longPressMenu = !!menu();
  out.longPressSelected = e.hasSelection();
  fire("pointerup", side.x, side.y, { pt: "pen", id: 11, button: 0, buttons: 0 });
  await sleep(30);
  out.menuStillOpenAfterLift = !!menu();
  document.body.click(); await sleep(30);
  // ⑤ 英制：单位切 ft，推拉后打 3'6" → 1.0668
  e.cancel(); e.vcbUnit = "ft";
  e.setTool("pp");
  const topGroupHit = e.pickAt(top.x, top.y);
  out.topIsPool = !!topGroupHit && (topGroupHit.face !== undefined);
  // group 里的面推拉要先进入；这里换一块地面：画一个新方再推
  e.addSegments([[Pt(4, 0, 0), Pt(6, 0, 0)], [Pt(6, 0, 0), Pt(6, 2, 0)], [Pt(6, 2, 0), Pt(4, 2, 0)], [Pt(4, 2, 0), Pt(4, 0, 0)]], "probe");
  e.zoomExtents();
  const c2 = px(Pt(5, 1, 0));
  fire("pointerdown", c2.x, c2.y, { button: 0, buttons: 1 });
  for (let i = 1; i <= 5; i++) fire("pointermove", c2.x, c2.y - 12 * i, { buttons: 1 });
  await sleep(120);
  fire("pointerup", c2.x, c2.y - 60, { button: 0 });
  await sleep(30);
  const r2 = e.applyVcb("3'6\"");
  out.imperialOk = r2.ok;
  const zs = e.kernel.vertices().filter((v) => v.x > 3.5).map((v) => v.z);
  out.imperialZ = Math.max(...zs);
  out.imperialExact = Math.abs(out.imperialZ - (3 * 0.3048 + 6 * 0.0254)) < 1e-9;
  out.echo = e.vcbState().echo;
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.selBarHiddenBefore && res.rightClickSelected && res.menuOpen && res.menuLabels.includes("建组") && res.groupMade && res.menuClosedAfterPick && res.selBarHiddenForMouse && res.selBarShown && res.selBarLabels.includes("炸开") && res.crumbsShown && res.crumbsExit && res.longPressMenu && res.longPressSelected && res.imperialOk && res.imperialExact && res.echo === "3' 6\"" && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);

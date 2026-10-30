// 最外层也能转网格体 / 转回来（2026-10-28 Claude Opus 5.5；user「以及最外层的base节点为什么不能转mesh」）：
// ① 最外层：一个散盒子 + 一个组（组里另一个盒子 + 一份组件）；什么都不选右键 → 没有「转成网格体」（空处右键只剩新建 / 回上一层）；点右边「物件」钮 → 物件窗口第一行「最外层」、有「转成网格体」
//   （2026-10-28 Claude Fable 5.1：物件级搬进物件窗口，UX 心智模型 §2.1 / §2.2） ② 点它 → 最外层是网格体、工作台切到自由建模、
//    组里的几何也进了网格体（以前只转最外面那块 = 组里的静默丢了）、组里那份组件挂回最外层且位置不变 ③ 撤销一下全回来（还是硬表面、组还在、组件还在组里）
// ④ 重做 → 什么都不选右键「转回硬表面体」→ 回硬表面建模 ⑤ 没有页面错误。跑法：python3 -m http.server 8765 后 node test/probes/probe-root-cast.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const rclick = async () => { c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 30, clientY: r.top + 600, button: 2 })); await sleep(60); };
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)") ?? document.querySelector(".float-win:not([hidden]) .menu-panel");
  const openObj = async () => { if (document.querySelector('.float-win[data-win="object"]:not([hidden])')) return; document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); };   // 右边「物件」钮 → 物件窗口（这一层）
  const who = () => menu()?.querySelector(".menu-note")?.textContent ?? "";
  const labels = () => [...(menu()?.querySelectorAll(".menu-label") ?? [])].map((x) => x.textContent);
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); document.querySelectorAll(".float-win:not([hidden]) .float-close").forEach((b) => b.click()); };
  const clickLabel = async (re) => { const it = [...(menu()?.querySelectorAll(".menu-item, [data-menu-id]") ?? [])].find((x) => re.test(x.textContent)); it?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); return !!it; };
  const S = () => e.scene, root = () => S().def(S().root), out = {};
  e.setGrid({ ...e.grid, on: false });
  // 组：盒子 B（3..4）+ 一份组件（5..6）都进组
  box(5, 0, 0, 6, 1, 1); e.selectAll(); e.makeComponent("件"); await sleep(10);
  box(3, 0, 0, 4, 1, 1); e.selectAll(); e.makeGroup(); await sleep(10);   // 盒子 B + 那份组件一起进组
  e.deselectAll();
  box(0, 0, 0, 1, 1, 1);   // 散的
  const inst0 = [...root().instances.values()][0], wpos0 = [...inst0.xform];
  out.setup = { kind: root().body.kind, groups: root().body.groups.size, instParent: inst0.parent, rootFaces: root().body.kernel.faces().length, groupFaces: [...root().body.groups.values()].reduce((n, g) => n + g.kernel.faces().length, 0) };
  e.deselectAll(); await sleep(10);
  await rclick(); out.menuEmpty = labels(); await closeAll();   // 空处右键：物件级的不在这
  await openObj(); out.who = who(); out.menu = labels(); out.clicked = await clickLabel(/转成网格体/); await closeAll();
  const m = root().body.kind === "mesh" ? root().body.kernel : null;
  out.after = { kind: root().body.kind, mode: e.modeId, faces: m ? m.faces().length : 0, instParent: [...root().instances.values()][0].parent, samePos: JSON.stringify([...root().instances.values()][0].xform) === JSON.stringify(wpos0), hint: hud.status() };
  e.undo(); await sleep(20);
  out.undone = { kind: root().body.kind, groups: root().body.kind === "brep" ? root().body.groups.size : -1, instParent: [...root().instances.values()][0].parent, mode: e.modeId };
  e.redo(); await sleep(20); e.deselectAll();
  await openObj(); out.who2 = who(); out.menu2 = labels(); out.clicked2 = await clickLabel(/转回硬表面体/); await sleep(40); await closeAll();
  out.back = { kind: root().body.kind, mode: e.modeId };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.setup.kind === "brep" && res.setup.groups === 1 && res.setup.instParent !== null && res.setup.groupFaces === 6
  && !res.menuEmpty.some((l) => /转成网格体/.test(l)) && /最外层/.test(res.who) && /硬表面体/.test(res.who) && res.menu.some((l) => /转成网格体/.test(l)) && res.clicked && /最外层/.test(res.who2) && /网格体/.test(res.who2)
  && res.after.kind === "mesh" && res.after.mode === "freeform" && res.after.faces === res.setup.rootFaces + res.setup.groupFaces && res.after.instParent === null && res.after.samePos
  && res.undone.kind === "brep" && res.undone.groups === 1 && res.undone.instParent !== null && res.undone.mode !== "freeform"
  && res.menu2.some((l) => /转回硬表面体/.test(l)) && res.clicked2 && res.back.kind === "brep" && res.back.mode !== "freeform"
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-root-cast OK" : "probe-root-cast FAIL");
process.exit(ok ? 0 : 1);

// 右键新建（2026-10-27 Claude Opus 5.5；纪元账本 FM120）：① 硬表面空地上右键 → 菜单里有「新建立方体（网格体）」→ 新的网格体组件落在右键那一点（地面）、被选中；
// ② 双击进去（自由建模）→ 右键顶面 → 「新建圆柱」（网格体里不带「（网格体）」）→ 圆柱长在顶面上、轴沿法向、新面被选中 ③ 撤销回去。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-new-primitive.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const rclick = async (p) => { const s = px(p); c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s.x, clientY: r.top + s.y, button: 2 })); await sleep(40); };
  const newItems = () => hud.edits().filter((it) => it.id.startsWith("new:") && !it.hidden).map((it) => it.label);
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  const pos0 = e.history.position(), d0 = S().defs.size;
  // ①
  await rclick(P(1.5, 0.5, 0)); out.menuBlank = newItems();
  hud.pick("new:box"); await sleep(40);
  const inst = [...S().def(S().root).instances.values()].pop();
  out.box = { defs: S().defs.size - d0, kind: inst ? S().kindOf(inst.def) : null, at: inst ? [inst.xform[3], inst.xform[7], inst.xform[11]].map((x) => +x.toFixed(3)) : null, selected: e.selectedPools.size, hint: hud.status(), steps: e.history.position() - pos0 };
  document.querySelectorAll(".popup-menu").forEach((m) => m.remove());
  // ②
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(40);
  const m = () => S().mesh(inst.def).kernel, f0 = m().faceCount();
  out.mode = e.modeId;
  await rclick(P(1.5, 0.5, 1)); out.menuOnFace = newItems();   // 右键点在顶面上：新建也露（落在这张面上、沿它的法向）
  hud.pick("new:cylinder"); await sleep(40); document.querySelectorAll(".popup-menu").forEach((x) => x.remove());
  const zs = m().verts().slice(8).map((v) => m().pt(v).z);
  out.cyl = { df: m().faceCount() - f0, selF: e.selection.faces.size, onTop: zs.length > 0 && Math.min(...zs) > 0.999, up: Math.max(...zs) > 1.5, check: m().check().join(";") };
  // ④
  let threw = false;
  try { for (let i = 0; i < 10 && e.history.position() > pos0; i++) { window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", ctrlKey: true, bubbles: true, cancelable: true })); await sleep(30); } } catch { threw = true; }
  out.undo = { threw, defs: S().defs.size - d0, pos: e.history.position() - pos0 };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.menuBlank.includes("新建立方体（网格体）") && res.menuBlank.length === 5
  && res.box.defs === 1 && res.box.kind === "mesh" && res.box.at && Math.abs(res.box.at[0] - 1.5) < 0.05 && Math.abs(res.box.at[1] - 0.5) < 0.05 && res.box.at[2] === 0 && res.box.selected === 1 && /地面/.test(res.box.hint)
  && res.mode === "freeform" && res.menuOnFace.length === 5 && res.menuOnFace[0] === "新建立方体"
  && res.cyl.df === 18 && res.cyl.selF === 18 && res.cyl.onTop && res.cyl.up && res.cyl.check === ""
  && !res.undo.threw && res.undo.defs === 0 && res.undo.pos === 0 && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-new-primitive OK" : "probe-new-primitive FAIL");
process.exit(ok ? 0 : 1);

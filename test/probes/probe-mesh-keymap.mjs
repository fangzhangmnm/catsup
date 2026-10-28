// 自由建模的 Blender 键位 + 删除（2026-10-27 Claude Opus 5.5；user「然后能不能blender 快捷键无缝接上」）：网格体盒子里——
// ① 选顶面按 G：光标一动顶面跟着走（不用按下）、点一下落定；Ctrl+Z 回来 ② G 中按 Z = 锁 Z ③ G 中 Esc / 右键 = 取消 ④ 没选区按 G = 只切到移动工具
// ⑤ 选顶面按 E = 挤出跟鼠标 ⑥ X 删选中的面 ⑦ 选两个对角点按 J = 连线 ⑧ Ctrl+R 再点一条竖边 = 环切 ⑨ 删除工具点一张面 = 删、Ctrl 点一条边 = 溶解。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-keymap.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const px = (p) => e.cam.angularPx(p, e.vp());   // 世界坐标
  const fire = (type, x, y, buttons, shift = false) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons, shiftKey: shift }));
  const drag = async (a, z, shift = false, steps = 10) => { fire("pointermove", a.x, a.y, 0, shift); await sleep(10); fire("pointerdown", a.x, a.y, 1, shift); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1, shift); await sleep(8); } fire("pointerup", z.x, z.y, 0, shift); await sleep(40); };
  const click = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(30); };
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, root = () => S().def(S().root), q = (x) => +x.toFixed(4);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...root().instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const snap = () => m().verts().map((v) => { const p = m().pt(v); return [v, q(p.x), q(p.y), q(p.z)]; });
  const topIds = () => m().verts().filter((v) => Math.abs(m().pt(v).z - 1) < 1e-6);
  const stat = () => ({ f: m().faceCount(), v: m().vertexCount(), e: m().edgeCount() });
  const kd = (k, o = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: o.code ?? (k.length === 1 ? "Key" + k.toUpperCase() : k), ctrlKey: !!o.ctrl, shiftKey: !!o.shift, bubbles: true, cancelable: true }));
  const hover = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(25); return s; };
  const topZ = () => Math.max(...m().verts().map((v) => m().pt(v).z));
  const selTop = async () => { e.setTool("select"); e.deselectAll(); await sleep(400); await click(P(0.5, 0.5, 1)); };
  const st0 = stat(), pos0 = e.history.position();
  // ① G
  await selTop(); const s0 = await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20);
  out.gStart = { active: e.isGestureActive(), tool: e.tool };
  for (let i = 1; i <= 6; i++) { fire("pointermove", s0.x, s0.y - 10 * i, 0); await sleep(15); }
  out.gPreview = { committed: e.history.position() - pos0 };
  fire("pointerdown", s0.x, s0.y - 60, 1); await sleep(10); fire("pointerup", s0.x, s0.y - 60, 0); await sleep(40);
  out.gDone = { moved: topZ() !== 1 || m().verts().some((v) => { const p = m().pt(v); return p.z === 1 && (Math.abs(Math.abs(p.x) - 0.5) > 1e-9 || Math.abs(Math.abs(p.y) - 0.5) > 1e-9); }), active: e.isGestureActive(), sel: e.selection.faces.size };
  kd("z", { ctrl: true }); await sleep(40); out.gUndo = JSON.stringify(stat()) === JSON.stringify(st0) && topZ() === 1;
  // ② G + Z 锁
  await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20); kd("z"); await sleep(10); out.zLock = e.axisLock;
  for (let i = 1; i <= 6; i++) { fire("pointermove", s0.x + 8 * i, s0.y - 8 * i, 0); await sleep(15); }
  fire("pointerdown", s0.x + 48, s0.y - 48, 1); await sleep(10); fire("pointerup", s0.x + 48, s0.y - 48, 0); await sleep(40);
  out.zOnly = m().verts().filter((v) => m().pt(v).z > 1.001).length === 4 && m().verts().every((v) => { const p = m().pt(v); return Math.abs(Math.abs(p.x) - 0.5) < 1e-9 && Math.abs(Math.abs(p.y) - 0.5) < 1e-9; });
  kd("z", { ctrl: true }); await sleep(40);
  // ③ Esc / 右键 取消
  await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20); fire("pointermove", s0.x, s0.y - 40, 0); await sleep(20); kd("Escape", { code: "Escape" }); await sleep(30);
  out.esc = { active: e.isGestureActive(), same: topZ() === 1, pos: e.history.position() - pos0 };
  await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20); fire("pointermove", s0.x, s0.y - 40, 0); await sleep(20);
  c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s0.x, clientY: r.top + s0.y - 40, button: 2 })); await sleep(30);
  out.rclick = { active: e.isGestureActive(), same: topZ() === 1 };
  // ④ 没选区按 G
  e.deselectAll(); e.setTool("select"); await hover(P(0.5, 0.5, 1)); kd("g"); await sleep(20);
  out.gNoSel = { tool: e.tool, active: e.isGestureActive() };
  // ⑤ E
  await selTop(); await hover(P(0.5, 0.5, 1)); kd("e"); await sleep(20);
  for (let i = 1; i <= 6; i++) { fire("pointermove", s0.x, s0.y - 10 * i, 0); await sleep(15); }
  fire("pointerdown", s0.x, s0.y - 60, 1); await sleep(10); fire("pointerup", s0.x, s0.y - 60, 0); await sleep(40);
  out.eDone = { df: stat().f - st0.f, sel: e.selection.faces.size, topUp: topZ() > 1 };
  kd("z", { ctrl: true }); await sleep(40);
  // ⑥ X 删选中的面
  await selTop(); kd("x"); await sleep(30); out.xDel = { df: stat().f - st0.f }; kd("z", { ctrl: true }); await sleep(40);
  // ⑦ J：选两个对角点（点一个、Shift 点另一个）
  e.setTool("select"); e.deselectAll(); await sleep(400); await click(P(0, 0, 1)); await sleep(400);
  { const s = px(P(1, 1, 1)); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1, true); await sleep(10); fire("pointerup", s.x, s.y, 0, true); await sleep(40); }
  out.jSel = e.selection.verts.size; kd("j"); await sleep(30); out.jDone = { df: stat().f - st0.f, selE: e.selection.edges.size, check: m().check().join(";") }; kd("z", { ctrl: true }); await sleep(40);
  // ⑧ Ctrl+R 再点右侧前面那条竖边
  e.deselectAll(); kd("r", { ctrl: true, code: "KeyR" }); await sleep(20); out.crTool = e.tool;
  { const s = px(P(1, 0, 0.5)); fire("pointermove", s.x, s.y, 0); await sleep(15); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(50); }
  out.crDone = { df: stat().f - st0.f, active: e.isGestureActive(), check: m().check().join(";") }; kd("z", { ctrl: true }); await sleep(40);
  // ⑨ 删除工具：点顶面 = 删；Ctrl 点右侧前面那条竖边 = 溶解（两侧面并一张）
  e.setTool("erase"); out.eraseLabel = hud.tools().find((t) => t.id === "erase")?.label;
  await click(P(0.5, 0.5, 1)); out.eraseFace = { df: stat().f - st0.f }; kd("z", { ctrl: true }); await sleep(40);
  { const s = px(P(1, 0, 0.5)); c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, buttons: 0, ctrlKey: true })); await sleep(15);
    c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: 1, ctrlKey: true })); await sleep(10);
    c.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, clientX: r.left + s.x, clientY: r.top + s.y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: 0, ctrlKey: true })); await sleep(40); }
  out.dissolve = { df: stat().f - st0.f, de: stat().e - st0.e, check: m().check().join(";"), hint: hud.status() };
  kd("z", { ctrl: true }); await sleep(40);
  // ⑩ I = 插入：选顶面，光标放在靠近顶面一角的地方按 I，往面中心挪，点一下
  await selTop(); { const near = px(P(0.9, 0.9, 1)), ctr = px(P(0.5, 0.5, 1)); fire("pointermove", near.x, near.y, 0); await sleep(25); kd("i"); await sleep(20);
    out.iStart = { active: e.isGestureActive(), tool: e.tool };
    for (let i = 1; i <= 5; i++) { fire("pointermove", near.x + (ctr.x - near.x) * i / 10, near.y + (ctr.y - near.y) * i / 10, 0); await sleep(15); }
    const mid = { x: near.x + (ctr.x - near.x) * 0.5, y: near.y + (ctr.y - near.y) * 0.5 };
    fire("pointerdown", mid.x, mid.y, 1); await sleep(10); fire("pointerup", mid.x, mid.y, 0); await sleep(40); }
  { const f = [...e.selection.faces][0], xs = f !== undefined ? m().faceVerts(f).map((v) => m().pt(v).x) : [];
    out.inset = { df: stat().f - st0.f, sel: e.selection.faces.size, smaller: xs.length === 4 && Math.max(...xs) - Math.min(...xs) < 0.999, check: m().check().join(";"), label: hud.tools().find((t) => t.id === "offset")?.label }; }
  kd("z", { ctrl: true }); await sleep(40);
  // ⑪ 右键面 → 「插入」= 指令：不换工具、不进手势，做完马后炮改宽度（user 10-27「右键的插入，切环不应该切到工具里面，插入好了应该还是之前的操作模式」）
  e.setTool("select"); e.deselectAll(); await sleep(400);
  const rc = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(20); c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s.x, clientY: r.top + s.y, button: 2 })); await sleep(40); };
  await rc(P(0.9, 0.9, 1));
  out.rInsetItem = hud.edits().some((it) => it.id === "action:mesh.inset" && !it.hidden);
  { const f0 = stat().f; hud.pick("action:mesh.inset"); await sleep(20); document.querySelectorAll(".popup-menu").forEach((x) => x.remove());
    out.rInset = { active: e.isGestureActive(), tool: e.tool, df: stat().f - f0, sel: e.selection.faces.size, check: m().check().join(";"), panel: !!document.querySelector(".param-panel, .afterthought, [data-afterthought]") }; }
  kd("z", { ctrl: true }); await sleep(40);
  // ⑪b 右键面 → 「设置原点到选择中心」：世界里不动，原点到了那张面的中心
  e.deselectAll(); await sleep(400); await rc(P(0.5, 0.5, 1));
  out.rOriginItem = hud.edits().some((it) => it.id === "action:mesh.originToSelection" && !it.hidden);
  { const W = () => { const I = root().instances.get(inst.id), X = I.xform; return m().verts().map((v) => { const p = m().pt(v); return [q(X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3]), q(X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7]), q(X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11])].join(","); }).sort().join(" "); };
    const w0 = W(); hud.pick("action:mesh.originToSelection"); await sleep(20); document.querySelectorAll(".popup-menu").forEach((x) => x.remove());
    const X = root().instances.get(inst.id).xform;
    out.rOrigin = { same: W() === w0, origin: [q(X[3]), q(X[7]), q(X[11])], tool: e.tool, mode: e.modeId };
    kd("z", { ctrl: true }); await sleep(40);
    const X2 = root().instances.get(inst.id).xform; out.rOriginUndo = { same: W() === w0, origin: [q(X2[3]), q(X2[7]), q(X2[11])] }; }
    // ⑫ 点一下的规矩（user「当你单击空白的时候取消选择，只有在空白拖动的时候才是操作」）：移动工具里点顶面 = 选它、点空处 = 取消选择，都不进「再点一下」
  e.deselectAll(); e.setTool("move"); await sleep(400);
  await click(P(0.5, 0.5, 1)); out.tapFace = { faces: e.selection.faces.size, active: e.isGestureActive() };
  await sleep(400); await click(P(-1.5, -1.5, 0)); out.tapBlank = { faces: e.selection.faces.size, active: e.isGestureActive(), depth: e.contextCrumbs().length - 1 };
  // ⑬ Alt+S 沿法线：选顶面、光标离面中心远一点按 Alt+S、往外挪、点一下 → 顶面四个点都升高（顶面法向 +Z）
  await selTop(); { const ctr = px(P(0.5, 0.5, 1)), a0 = { x: ctr.x + 60, y: ctr.y }; fire("pointermove", a0.x, a0.y, 0); await sleep(20);
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "s", code: "KeyS", altKey: true, bubbles: true, cancelable: true })); await sleep(20);
    out.altS = { active: e.isGestureActive(), tool: e.tool };
    for (let i = 1; i <= 5; i++) { fire("pointermove", a0.x + 8 * i, a0.y, 0); await sleep(15); }
    fire("pointerdown", a0.x + 40, a0.y, 1); await sleep(10); fire("pointerup", a0.x + 40, a0.y, 0); await sleep(40); }
  out.fatten = { top: m().verts().filter((v) => m().pt(v).z > 1.001).length, xyKept: m().verts().every((v) => { const p = m().pt(v); return Math.abs(Math.abs(p.x) - 0.5) < 1e-9 && Math.abs(Math.abs(p.y) - 0.5) < 1e-9; }) };
  kd("z", { ctrl: true }); await sleep(40);
  // ⑭ 双击空处 = 退出一层（单击不退）：选择工具
  e.setTool("select"); e.deselectAll(); await sleep(400);
  await click(P(-1.5, -1.5, 0)); out.singleBlank = e.contextCrumbs().length - 1;
  { const s = px(P(-1.5, -1.5, 0)); for (let k = 0; k < 2; k++) { fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(60); } }
  out.doubleBlank = { depth: e.contextCrumbs().length - 1, mode: e.modeId };
  // ⑮ 硬表面里按 K：不会切到没反应的切割
  kd("k", { code: "KeyK" }); await sleep(20); out.kInGeometry = e.tool;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(40);
  out.backToStart = (() => { let n = 0; while (e.history.position() > pos0 && n++ < 30) kd("z", { ctrl: true }); return JSON.stringify(stat()) === JSON.stringify(st0); })();
  return out;
});
await b.close();
res.errs = errs;
const ok = res.gStart.active && res.gStart.tool === "move" && res.gPreview.committed <= 1 && res.gDone.moved && !res.gDone.active && res.gUndo
  && res.zLock === "z" && res.zOnly && !res.esc.active && res.esc.same && !res.rclick.active && res.rclick.same
  && res.gNoSel.tool === "move" && !res.gNoSel.active
  && res.eDone.df === 4 && res.eDone.sel === 1 && res.eDone.topUp && res.xDel.df === -1
  && res.jSel === 2 && res.jDone.df === 1 && res.jDone.selE === 1 && res.jDone.check === ""
  && res.crTool === "knife" && res.crDone.df === 4 && !res.crDone.active && res.crDone.check === ""
  && res.eraseLabel === "删除" && res.eraseFace.df === -1 && res.dissolve.df === -1 && res.dissolve.check === ""
  && res.tapFace.faces === 1 && !res.tapFace.active && res.tapBlank.faces === 0 && !res.tapBlank.active && res.tapBlank.depth === 1
  && res.altS.active && res.altS.tool === "shrink" && res.fatten.top === 4 && res.fatten.xyKept
  && res.singleBlank === 1 && res.doubleBlank.depth === 0 && res.doubleBlank.mode === "geometry" && res.kInGeometry !== "knife"
  && res.rInsetItem && !res.rInset.active && res.rInset.tool === "select" && res.rInset.df === 4 && res.rInset.sel === 1 && res.rInset.check === ""
  && res.rOriginItem && res.rOrigin.same && res.rOrigin.origin.join() === "0.5,0.5,1" && res.rOrigin.tool === "select" && res.rOrigin.mode === "freeform" && res.rOriginUndo.same
  && res.iStart.active && res.iStart.tool === "offset" && res.inset.df === 4 && res.inset.sel === 1 && res.inset.smaller && res.inset.check === "" && res.inset.label === "插入"
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-keymap OK" : "probe-mesh-keymap FAIL");
process.exit(ok ? 0 : 1);

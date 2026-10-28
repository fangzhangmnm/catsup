// 自由建模工作台的边界（2026-10-27 接缝，Claude Fable 5.1）：网格体池能进了——进去工作台自动切到「自由建模」、选区变成 mesh 的 id 空间；
// 选择工具点一下选面、Ctrl+A 全选、brep 专属动词（删除几何 / 建组 / 软化）诚实拒绝不崩、退出回到硬表面建模；「挪」动作按种类路由：
// 在网格体池里 runAction("move") 挪网格点（撤销能回）；在根池里选中网格体实例 + 根池的膜 → 一步两条调用（object.move + brep.move）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-workbench.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const click = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(30); };
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, root = () => S().def(S().root), depth = () => e.contextCrumbs().length - 1, hint = () => hud.status();
  const out = { errs: [] };
  e.setGrid({ ...e.grid, on: false });
  // 根池：一个盒子做成组件「块」，再转成网格体；旁边再画一个松散的盒子留在根池
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块");
  out.toMeshMenu = e.commandMenu().map((m) => m.id);
  e.runAction("object.toMesh"); await sleep(30);
  const inst = [...root().instances.values()][0], def = inst.def;
  out.kindAfterCast = S().kindOf(def);
  box(3, 0, 0, 4, 1, 1);
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.3; e.draw();
  // ① 进网格体池：工作台切到自由建模、选区 kind = mesh、下拉只列自由建模
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  out.enter = { depth: depth(), mode: e.modeId, kind: e.activeKind(), selKind: e.selection.kind, modes: e.modes().map((m) => m.id), tool: e.tool, hint: hint() };
  // ② 选择工具点顶面中心 → 选中一张面；状态行数面；Ctrl+A 全选 = 6 面 12 边
  e.setTool("select"); await click(P(0.5, 0.5, 1));
  out.pickTop = { faces: e.selection.faces.size, readout: e.readoutText(), hasSel: e.hasSelection(), hud: hud.edits().filter((x) => !x.hidden).map((x) => x.id) };
  key("z"); await sleep(30); const undoClick = { faces: e.selection.faces.size, pos: e.history.position() };   // 鼠标点选也是一步（v0.15.15 的 bug：点选发生在指针那一步里没记）
  key("y"); await sleep(30); out.clickUndo = { ...undoClick, redoFaces: e.selection.faces.size };
  key("a"); await sleep(20);
  out.selectAll = { faces: e.selection.faces.size, edges: e.selection.edges.size };
  // ③ brep 专属动词在网格体池里：诚实拒绝、不崩、不记步
  const pos0 = e.history.position();
  out.hudInMesh = hud.edits().filter((x) => !x.hidden).map((x) => x.id);
  e.hideSelection(); const h1 = hint(); e.makeGroup(); const h2 = hint(); e.softenSelection(true); const h3 = hint();   // 删除在网格体里能用了（v0.15.22），换隐藏当「SU 专属动词」的例子
  out.brepVerbs = { pos: e.history.position() - pos0, faces: e.selection.faces.size, hints: [h1, h2, h3].map((h) => /SU 体的动词/.test(h ?? "")) };
  // ④ 挪：网格体池里选中顶面 → runAction("move", dz=0.5) → 顶面四个点上去；撤销回来
  e.deselectAll(); await click(P(0.5, 0.5, 1));
  const m = S().mesh(def).kernel, topZ = () => Math.max(...m.verts().map((v) => m.pt(v).z));
  const posSel = e.history.position();
  e.runAction("move", { dx: 0, dy: 0, dz: 0.5 }); await sleep(20);
  out.meshMove = { topZ: +topZ().toFixed(3), hint: hint(), steps: e.history.position() - posSel, selSteps: posSel - pos0 };
  key("z"); await sleep(40);
  out.meshMoveUndo = { topZ: +topZ().toFixed(3), depth: depth(), mode: e.modeId, selKind: e.selection.kind };
  // ⑤ 退出：回到根池、工作台回硬表面建模、选区 kind = brep、实例被选中
  e.exitContext(); await sleep(20);
  out.exit = { depth: depth(), mode: e.modeId, selKind: e.selection.kind, pools: e.selectedPools.size, modes: e.modes().map((m) => m.id) };
  // ⑥ 混选一挪 = 一步两条调用：网格体实例（object.move）+ 根池松散盒子的顶面（brep.move）
  const k = e.kernel, top = k.faces().find((f) => k.faceRings3(f.id).outer.every((q) => Math.abs(q.z - 1) < 1e-9 && q.x >= 2.9));
  e.selection.faces.add(top.id);
  const instX = () => +S().instance(S().root, inst.id).xform[3].toFixed(3), looseTopX = () => +Math.max(...k.faceRings3(top.id).outer.map((q) => q.x)).toFixed(3);
  const before = { instX: instX(), looseTopX: looseTopX(), pos: e.history.position() };
  e.runAction("move", { dx: 1, dy: 0, dz: 0 }); await sleep(20);
  out.mixed = { dInstX: +(instX() - before.instX).toFixed(3), dLooseTopX: +(looseTopX() - before.looseTopX).toFixed(3), steps: e.history.position() - before.pos, hint: hint() };
  key("z"); await sleep(40);
  out.mixedUndo = { dInstX: +(instX() - before.instX).toFixed(3), dLooseTopX: +(looseTopX() - before.looseTopX).toFixed(3), pos: e.history.position() - before.pos };
  // ⑦ 没选东西时挪：说清没事做，不崩
  e.deselectAll(); e.runAction("move", { dx: 1, dy: 0, dz: 0 }); out.nothing = hint();
  // ⑧ 撤到转换之前（人在根池；定义回 SU 体）再重做回来，不崩
  let threw = false;
  try { for (let i = 0; i < 12 && e.history.position() > 0; i++) { key("z"); await sleep(25); } } catch { threw = true; }
  out.undoAll = { threw, kind: S().defs.has(def) ? S().kindOf(def) : "gone", depth: depth(), mode: e.modeId };
  for (let i = 0; i < 12; i++) { const p0 = e.history.position(); key("y"); await sleep(25); if (e.history.position() === p0) break; }
  out.redoAll = { kind: S().kindOf(def), depth: depth(), mode: e.modeId };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.kindAfterCast === "mesh" && res.enter.mode === "freeform" && res.enter.kind === "mesh" && res.enter.selKind === "mesh" && res.enter.modes.join() === "freeform" && res.enter.depth === 1
  && res.pickTop.faces === 1 && /1 面/.test(res.pickTop.readout) && res.clickUndo.faces === 0 && res.clickUndo.redoFaces === 1 && res.selectAll.faces === 6 && res.selectAll.edges === 12
  && res.brepVerbs.pos === 0 && res.brepVerbs.faces === 6 && res.brepVerbs.hints.every(Boolean)
  && ["group", "component", "mirror", "hide", "soften", "harden", "explode"].every((id) => !res.hudInMesh.includes(id)) && res.hudInMesh.includes("deselect") && res.hudInMesh.includes("delete")
  && res.meshMove.topZ === 1.5 && res.meshMove.steps === 1 && res.meshMoveUndo.topZ === 1 && res.meshMoveUndo.mode === "freeform" && res.meshMoveUndo.selKind === "mesh"
  && res.exit.depth === 0 && res.exit.mode === "geometry" && res.exit.selKind === "brep" && res.exit.pools === 1 && res.exit.modes.join() === "geometry,surface"
  && res.mixed.dInstX === 1 && res.mixed.dLooseTopX === 1 && res.mixedUndo.dInstX === 0 && res.mixedUndo.dLooseTopX === 0 && res.mixedUndo.pos === 0
  && /没有能移动/.test(res.nothing) && !res.undoAll.threw && res.undoAll.kind === "gone" && res.undoAll.mode === "geometry" && res.redoAll.kind === "mesh" && res.redoAll.mode === "geometry"
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-workbench OK" : "probe-mesh-workbench FAIL");
process.exit(ok ? 0 : 1);

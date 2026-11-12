// 油漆桶认网格体的面（白模 W-12，2026-11-11 Claude Opus 5.5）：网格体也能进「表面」工作台；油漆桶点一张面 = 走 meshPaintFaces、一步撤销；
// 吸色读网格体的槽号；强行对称时另一半跟着（现成的对称化）；换成别的物件的画 = 拒、说清原因、模型不动。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-bucket.mjs [网址]
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
  const click = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(400); };   // 等过双击的窗口（单击 = 平滑组那一档）
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  const S = () => e.scene, root = () => S().def(S().root), hint = () => hud.status();
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  // 一个盒子（x 从 −1 到 1，跨着镜像面）做成组件、转网格体
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块");
  e.runAction("object.toMesh"); await sleep(30);
  const inst = [...root().instances.values()][0], def = inst.def;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.4; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  // ① 网格体的下拉里有「表面」；切过去、拿油漆桶
  out.modes = e.modes().map((m) => m.id);
  e.setMode("surface"); await sleep(20);
  out.mode = e.modeId;
  e.commitOp({ op: "addMaterial", name: "红", color: [1, 0, 0] });
  const red = S().materials.length - 1;
  e.setPaint(e.materialPick(S().materials[red])); e.setMode("surface"); e.setTool("paint"); await sleep(20);   // v0.19.47 起 setTool 不替人换工作台：明着换到表面
  const m = () => S().mesh(def).kernel, slotOf = (i) => { const j = S().mesh(def).materialSlots.indexOf(i); return j < 0 ? -99 : j; };   // 槽表里没有 = 一个不会撞上 −1（默认）的数
  const top = () => m().faces().find((f) => m().faceVerts(f).every((v) => Math.abs(m().pt(v).z - 1) < 1e-9));
  // ② 点顶面：顶面换成红、一步撤销、重做回来
  const pos0 = e.history.position(), t = top();
  await click(P(0.5, 0.5, 1));
  out.paint = { topRed: m().faceMat[t] === slotOf(red), redCount: m().faces().filter((f) => m().faceMat[f] === slotOf(red)).length, steps: e.history.position() - pos0, hint: hint() };
  const pu = e.history.position(); key("z"); await sleep(40); out.undo = { topRed: m().faceMat[top()] === slotOf(red), pos: [pu, e.history.position()], hint: hint() };
  key("y"); await sleep(40); out.redo = { topRed: m().faceMat[top()] === slotOf(red) };
  // ③ 吸色：蘸的清空，Alt 点顶面 → 蘸回「红」
  e.setPaint(null); await sleep(10);
  e.pickMaterialOf(top()); out.eyedrop = e.paint?.name ?? null;
  // ④ 强行对称：只涂 +x 那一头，另一头跟着变红（现成的对称化），一次撤销回去
  e.commitOp({ op: "setMeshMirror", def, mirror: { mode: "force", axis: 0 } }); await sleep(20);
  e.setPaint(e.materialPick(S().materials[red]));
  const endFace = (sx) => m().faces().filter((f) => m().faceVerts(f).every((v) => Math.abs(m().pt(v).x - sx) < 1e-9));
  const posM = e.history.position();
  await click(P(1, 0.5, 0.5));
  out.mirror = { plusRed: endFace(1).some((f) => m().faceMat[f] === slotOf(red)), minusRed: endFace(-1).some((f) => m().faceMat[f] === slotOf(red)), ops: e.history.position() - posM, hint: hint() };   // 一步里两条指令（涂 + 对称化）：position 数的是指令
  key("z"); await sleep(40);
  out.mirrorUndo = { plusRed: endFace(1).some((f) => m().faceMat[f] === slotOf(red)), minusRed: endFace(-1).some((f) => m().faceMat[f] === slotOf(red)) };
  e.commitOp({ op: "setMeshMirror", def, mirror: null });
  // ⑤ 别的物件的画：在另一份网格体上开始画（指令；界面入口是 1-7），拿它的画来涂这个物件 = 拒、说清原因、模型不动
  e.exitContext(); await sleep(20);
  box(3, 0, 0, 4, 1, 1); e.deselectAll();
  const k = e.kernel; for (const f of k.faces()) if (k.faceRings3(f.id).outer.every((q) => q.x >= 2.9)) e.selection.faces.add(f.id);
  e.makeComponent("另一块"); e.runAction("object.toMesh"); await sleep(30);
  const other = [...root().instances.values()].find((i) => i.def !== def).def;
  const g = () => globalThis.crypto.randomUUID();
  e.commitOp({ op: "startPaint", def: other, faces: S().mesh(other).kernel.faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "别人的画", material: "别人的画" }, color: [0.5, 0.5, 0.5] });
  const theirs = S().materials.length - 1;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.setMode("surface"); e.setPaint(e.materialPick(S().materials[theirs])); e.setTool("paint"); await sleep(20);
  const before = JSON.stringify(Array.from(m().faceMat)), posR = e.history.position();
  await click(P(0.5, 0.5, 1));
  out.other = { unchanged: JSON.stringify(Array.from(m().faceMat)) === before, steps: e.history.position() - posR, hint: hint() };
  return out;
});
const ok = res.modes.includes("surface") && res.mode === "surface" && res.paint.topRed && res.paint.redCount === 1 && res.paint.steps === 1 && !res.undo.topRed && res.redo.topRed && res.eyedrop === "红"
  && res.mirror.plusRed && res.mirror.minusRed && !res.mirrorUndo.plusRed && !res.mirrorUndo.minusRed
  && res.other.unchanged && res.other.steps === 0 && /别的物件/.test(res.other.hint ?? "") && !errs.length;
console.log(JSON.stringify({ ...res, errs }, null, 1));
console.log(ok ? "probe-mesh-bucket OK" : "probe-mesh-bucket FAIL");
await b.close();
process.exit(ok ? 0 : 1);

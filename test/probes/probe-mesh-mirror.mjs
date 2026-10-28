// 网格体镜像接线（2026-10-28 Claude Opus 5.5；纪元账本 FM23 / FM134 / FM136）。中缝切开的盒子（-1..1）：
// ① 右键「镜像 ›」子菜单（关 / 镜像编辑 / 强行对称 / 镜像面 / 对称对齐…）② 开镜像编辑：镜像面的框 + 中缝点画出来 ③ 挪 +x 一个角 → 对面跟着镜、一步撤销两个一起回
// ④ 镜像编辑开着用挤出（改拓扑）→ 应用内确认「关掉镜像，照做」→ 照做了、镜像关了 ⑤ 强行对称：开的时候按选区那边对称一次；之后挤出 +x 一张面 → -x 也长出来、同一步、撤销一下全回
// ⑥ 对称对齐：歪一个点、选两边那一对 → 右键「对称对齐」对回来 ⑦ 没有页面错误。跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-mirror.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), vw = innerWidth, vh = innerHeight;
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 11, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const drag = async (x0, y0, x1, y1) => { fire("pointermove", x0, y0, 0); await sleep(10); fire("pointerdown", x0, y0, 1); await sleep(10); for (let i = 1; i <= 6; i++) { fire("pointermove", x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6, 1); await sleep(10); } fire("pointerup", x1, y1, 0); await sleep(40); };
  const rclick = async () => { c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + Math.round(vw * 0.15), clientY: r.top + Math.round(vh * 0.3), button: 2 })); await sleep(60); };
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)"), layer = () => document.querySelector(".popup-menu.choice-layer.submenu");
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, px = (p) => e.cam.angularPx(p, e.vp()), hint = () => hud.status();
  const at = (k, x, y, z) => k.verts().find((v) => { const q = k.pt(v); return Math.abs(q.x - x) < 1e-9 && Math.abs(q.y - y) < 1e-9 && Math.abs(q.z - z) < 1e-9; });
  const sym = (k) => k.verts().every((v) => { const q = k.pt(v); return k.verts().some((w) => { const p = k.pt(w); return Math.abs(p.x + q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9; }); });
  const out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.cam.target = P(0, 0.5, 0.5); e.draw();
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  // 组件的原点 = 盒子角（-1, 0, 0）？对齐到盒子中心的 x = 0：网格体本地坐标里中缝在 x = 0 才对称（看本地坐标）
  const xs = m().verts().map((v) => m().pt(v).x), cx = (Math.min(...xs) + Math.max(...xs)) / 2;
  const Y1 = Math.max(...m().verts().map((v) => m().pt(v).y)), Y0 = Math.min(...m().verts().map((v) => m().pt(v).y)), Z1 = Math.max(...m().verts().map((v) => m().pt(v).z));
  out.localCenterX = cx; out.local = { Y0, Y1, Z1 };
  const cut = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).x - m().pt(m().edgeB[x]).x) > 1);
  e.commitOp({ op: "meshLoopCut", def, edge: cut, t: 0.5 });
  out.cutVerts = m().vertexCount();
  // ①
  await rclick();
  const row = menu()?.querySelector('[data-menu-id="submenu:镜像"]');
  row?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  out.one = { row: !!row, items: layer() ? [...layer().querySelectorAll(".menu-label")].map((x) => x.textContent).join("|") : "" };
  layer()?.querySelector('[data-choice-id="mirror:edit"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  await closeAll();
  // ②
  out.two = { mode: e.mirrorOf()?.mode, axis: e.mirrorOf()?.axis, lines: !!e.r3.mirrorLines?.visible, seam: !!e.r3.seamDots?.visible };
  // ③（本地坐标里中缝在 x = cx；盒子在本地是 cx ± 1）
  const v = at(m(), cx + 1, Y1, Z1), w = at(m(), cx - 1, Y1, Z1), steps0 = e.history.steps();
  out.found = { v, w };
  e.commitOp({ op: "meshMove", def, moves: [{ v, to: P(cx + 1.3, Y1 + 0.2, Z1 + 0.1) }] });
  out.three = { v: m().pt(v), w: m().pt(w), steps: e.history.steps() - steps0 };
  e.undo(); await sleep(10);
  out.three.afterUndo = { v: m().pt(v), w: m().pt(w) };
  // ④ 挤出 +x 那张端面（选中 → 挤出工具往外拖）→ 应用内确认 → 关掉镜像，照做
  const endFace = () => m().faces().find((f) => m().faceVerts(f).every((x) => Math.abs(m().pt(x).x - (cx + 1)) < 1e-9));
  const f0 = m().faceCount();
  e.setTool("select"); const sF = px(P(1, 0.5, 0.5)); fire("pointermove", sF.x, sF.y, 0); fire("pointerdown", sF.x, sF.y, 1); await sleep(10); fire("pointerup", sF.x, sF.y, 0); await sleep(40);
  out.four = { selFaces: e.selection.faces.size };
  e.setTool("pp"); await sleep(10);
  await drag(sF.x, sF.y, sF.x + 60, sF.y + 10);
  const sheetOk = document.getElementById("sheetConfirm");
  out.four.sheet = sheetOk && !sheetOk.closest("[hidden]") ? sheetOk.textContent : null;
  out.four.facesBefore = m().faceCount() - f0;
  sheetOk?.click(); await sleep(80);
  out.four.facesAfter = m().faceCount() - f0; out.four.mirrorAfter = e.mirrorOf()?.mode ?? null; out.four.hint = hint();
  e.undo(); await sleep(10);
  out.four.undone = m().faceCount() - f0;
  // ⑤ 强行对称：先把 -x 那个角挪歪（镜像关着），选 +x 的一张面再开强行对称（以选区那边为准）→ 对称了
  e.commitOp({ op: "meshMove", def, moves: [{ v: w, to: P(cx - 1.5, Y1, Z1) }] });
  out.five = { symBefore: sym(m()) };
  await rclick(); menu()?.querySelector('[data-menu-id="submenu:镜像"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  layer()?.querySelector('[data-choice-id="mirror:force"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); await closeAll();
  out.five.mode = e.mirrorOf()?.mode; out.five.symAfterOn = sym(m()); out.five.hint = hint();
  const fF = m().faceCount(), sBefore = e.history.steps();
  e.commitOp({ op: "meshExtrude", def, faces: [endFace()], offset: P(0.5, 0, 0) });
  out.five.extrude = { dFaces: m().faceCount() - fF, steps: e.history.steps() - sBefore, sym: sym(m()) };
  e.undo(); await sleep(10);
  out.five.undo = m().faceCount() - fF;
  // ⑥ 对称对齐：关镜像，歪一个点 5 mm，全选 → 对称对齐（以选区重心那边为准）
  e.setMirror(null);
  const v2 = at(m(), cx + 1, Y0, Z1);
  e.commitOp({ op: "meshMove", def, moves: [{ v: v2, to: P(cx + 1.004, Y0 + 0.003, Z1) }] });
  out.six = { symBefore: sym(m()) };
  e.selectAll(); await sleep(10);
  e.runAction("mesh.symmetrySnap"); await sleep(20);
  out.six.symAfter = sym(m()); out.six.hint = hint();
  // ⑦ user 10-28 截图那一案：没在中缝切过的方块、拉歪一个角 → 开强行对称 = 自己沿镜像面切开再对称（「镜像你忘了做切割」）
  e.exitContext(); await sleep(20);
  box(4, 0, 0, 6, 1, 1); e.deselectAll();
  { const before = new Set([...S().def(S().root).instances.keys()]); e.selectAll(); }
  const loose = () => [...S().def(S().root).instances.values()];
  e.makeComponent("块2"); e.runAction("object.toMesh"); await sleep(20);
  const inst2 = loose().find((i) => i.id !== inst.id), m2 = () => S().mesh(inst2.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst2.id}`, { kind: "instance", instance: inst2.id }); e.enterSelected(); await sleep(30);
  e.selectAll(); e.runAction("mesh.originToSelection"); e.deselectAll(); await sleep(10);   // 镜像面 = 物体自己的原点：先把原点放到方块中间
  const xs2 = m2().verts().map((x) => m2().pt(x).x), c2 = (Math.min(...xs2) + Math.max(...xs2)) / 2;
  const corner = m2().verts().find((x) => m2().pt(x).x === Math.max(...xs2));
  e.commitOp({ op: "meshMove", def: inst2.def, moves: [{ v: corner, to: { ...m2().pt(corner), x: m2().pt(corner).x + 0.3 } }] });
  out.seven = { faces0: m2().faceCount(), center: c2 };
  e.setMirror("force", 0); await sleep(20);
  const sym2 = (k) => k.verts().every((v) => { const q = k.pt(v); return k.verts().some((w) => { const p = k.pt(w); return Math.abs((p.x - c2) + (q.x - c2)) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9; }); });
  out.seven.faces = m2().faceCount(); out.seven.sym = sym2(m2()); out.seven.hint = hint();
  return out;
});
await b.close();
res.errs = errs;
const ok = res.one.row && /关/.test(res.one.items) && /镜像编辑/.test(res.one.items) && /强行对称/.test(res.one.items) && res.found.v !== undefined && res.found.w !== undefined   // 「对称对齐…」要有选区才露（没选 = 不露），⑥ 走它
  && res.two.mode === "edit" && res.two.lines && res.two.seam
  && Math.abs(res.three.w.x - (res.localCenterX - 1.3)) < 1e-9 && Math.abs(res.three.w.y - (res.local.Y1 + 0.2)) < 1e-9 && res.three.steps === 1 && Math.abs(res.three.afterUndo.w.x - (res.localCenterX - 1)) < 1e-9
  && res.four.selFaces === 1 && /关掉镜像/.test(res.four.sheet ?? "") && res.four.facesBefore === 0 && res.four.facesAfter === 4 && res.four.mirrorAfter === null && res.four.undone === 0
  && res.five.symBefore === false && res.five.mode === "force" && res.five.symAfterOn && res.five.extrude.dFaces === 8 && res.five.extrude.steps === 1 && res.five.extrude.sym && res.five.undo === 0
  && res.six.symBefore === false && res.six.symAfter
  && res.seven.faces0 === 6 && Math.abs(res.seven.center) < 1e-9 && res.seven.faces === 10 && res.seven.sym && /切开/.test(res.seven.hint)
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-mirror OK" : "probe-mesh-mirror FAIL");
process.exit(ok ? 0 : 1);

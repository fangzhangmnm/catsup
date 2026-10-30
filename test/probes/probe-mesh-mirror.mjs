// 网格体镜像接线（2026-10-28 Claude Opus 5.5；纪元账本 FM23 / FM134 / FM136）。中缝切开的盒子（-1..1）：
// ① 右边「物件」钮 → 物件窗口第一行「组件「块」（网格体）」、「属性」页「对称」下拉（关 / 强行对称 / 镜像编辑）、开了才露「镜像面」（2026-10-28 Claude Fable 5.1：对称 = 网格体的属性，搬进物件窗口，UX 心智模型 §2.1）
//   ② 开镜像编辑：镜像面的框 + 中缝点画出来 ③ 挪 +x 一个角 → 对面跟着镜、一步撤销两个一起回
// ④ 镜像编辑开着用挤出（改拓扑）→ 应用内确认「关掉镜像，照做」→ 照做了、镜像关了 ⑤ 强行对称：开的时候按选区那边对称一次；之后挤出 +x 一张面 → -x 也长出来、同一步、撤销一下全回
// ⑥ 对称对齐：歪一个点、选两边那一对 → 右键「对称对齐」对回来 ⑦ 强行对称先沿镜像面切开
// ⑧（2026-10-28 user「镜像编辑还是坏的」「其实我倾向于不画。可以画在gizmos之类的上面」）：模型偏在镜像面一边 → 右上角视图 gizmo 的镜像方片橙色虚线 + 对不上的个数、
//   模型上不画镜像面；全选「设置原点到选择中心」→ 方片变紫、0 个对不上 → 移动工具真拖一个角点：预演和松手后对面那点都跟着镜。没有页面错误。跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-mirror.mjs
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
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)") ?? document.querySelector(".float-win:not([hidden]) .menu-panel"), layer = () => document.querySelector(".popup-menu.choice-layer");
  const openObj = async () => { if (document.querySelector('.float-win[data-win="object"]:not([hidden])')) return; document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); };   // 右边「物件」钮 → 物件窗口（这一层）
  const mirrorPick = async (id) => { await openObj(); menu()?.querySelector('[data-menu-id="mirror:mode"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40); layer()?.querySelector(`[data-choice-id="mirror:mode:${id}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); };
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); document.querySelectorAll(".float-win:not([hidden]) .float-close").forEach((b) => b.click()); };
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
  await openObj();
  const row = menu()?.querySelector('[data-menu-id="mirror:mode"]');
  out.one = { row: !!row, who: menu()?.querySelector(".menu-note")?.textContent ?? "", axisBefore: !!menu()?.querySelector('[data-menu-id="mirror:axis"]') };
  row?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  out.one.items = layer() ? [...layer().querySelectorAll(".menu-label")].map((x) => x.textContent).join("|") : "";
  layer()?.querySelector('[data-choice-id="mirror:mode:edit"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40);
  out.one.axisAfter = !!menu()?.querySelector('[data-menu-id="mirror:axis"]');   // 开了才露「镜像面」
  await closeAll();
  // ②（镜像面不画在模型上，画在右上角视图 gizmo；rAF 轮询，等一下）
  const gz = () => { const g = document.querySelector(".gizmo-mirror"); return g ? { mode: g.dataset.mode, unpaired: Number(g.dataset.unpaired), stroke: g.querySelector("polygon")?.getAttribute("stroke"), badge: g.querySelector("text")?.textContent ?? null } : null; };
  await sleep(250);
  out.two = { mode: e.mirrorOf()?.mode, axis: e.mirrorOf()?.axis, noPlaneOnModel: !e.r3.mirrorLines, gizmo: gz(), seam: e.r3.overlayVisible("seam") };
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
  await mirrorPick("force"); await closeAll();
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
  e.selectAll(); e.runAction("mesh.originToSelection"); e.deselectAll(); await sleep(10);   // 镜像面 = 物件自己的原点：先把原点放到方块中间
  const xs2 = m2().verts().map((x) => m2().pt(x).x), c2 = (Math.min(...xs2) + Math.max(...xs2)) / 2;
  const corner = m2().verts().find((x) => m2().pt(x).x === Math.max(...xs2));
  e.commitOp({ op: "meshMove", def: inst2.def, moves: [{ v: corner, to: { ...m2().pt(corner), x: m2().pt(corner).x + 0.3 } }] });
  out.seven = { faces0: m2().faceCount(), center: c2 };
  e.setMirror("force", 0); await sleep(20);
  const sym2 = (k) => k.verts().every((v) => { const q = k.pt(v); return k.verts().some((w) => { const p = k.pt(w); return Math.abs((p.x - c2) + (q.x - c2)) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9; }); });
  out.seven.faces = m2().faceCount(); out.seven.sym = sym2(m2()); out.seven.hint = hint();
  e.setMirror(null); e.exitTo(0); await sleep(20);
  // ⑧ 偏在一边的盒子：本地整体挪 +0.7（镜像面还在原点）
  box(8, 0, 0, 10, 1, 1); e.deselectAll();
  const before8 = new Set(S().def(S().root).instances.keys());
  e.selectAll(); e.makeComponent("偏"); e.runAction("object.toMesh"); await sleep(20);
  const inst3 = [...S().def(S().root).instances.values()].find((x) => !before8.has(x.id) && S().kindOf?.(x.def) !== "brep") ?? [...S().def(S().root).instances.values()].at(-1), m3 = () => S().mesh(inst3.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst3.id}`, { kind: "instance", instance: inst3.id }); e.enterSelected(); await sleep(30);
  e.commitOp({ op: "meshMove", def: inst3.def, moves: m3().verts().map((q) => ({ v: q, to: { ...m3().pt(q), x: m3().pt(q).x + 0.7 } })) });
  e.setMirror("edit", 0); await sleep(250);
  for (let i = 0; i < 12 && !gz(); i++) await sleep(120);   // 方片是 rAF 画的：机器忙时 250 ms 可能还没画上（2026-10-28 一次假红），轮询等它出现
  out.eight = { gizmoOff: gz(), hintOn: hint() };
  e.selectAll(); e.runAction("mesh.originToSelection"); e.deselectAll(); await sleep(250);
  out.eight.gizmoCentered = gz();
  const vs3 = m3().verts(), X3 = Math.max(...vs3.map((q) => m3().pt(q).x)), Yt = Math.max(...vs3.map((q) => m3().pt(q).y)), Zt = Math.max(...vs3.map((q) => m3().pt(q).z));
  const near3 = (q, x) => Math.abs(m3().pt(q).x - x) < 1e-9 && Math.abs(m3().pt(q).y - Yt) < 1e-9 && Math.abs(m3().pt(q).z - Zt) < 1e-9;
  const v8 = vs3.find((q) => near3(q, X3)), w8 = vs3.find((q) => near3(q, X3 - 2)), w0 = { ...m3().pt(w8) };
  e.cam.target = P(9, 0.5, 0.5); e.draw(); await sleep(20);
  const X = S().xformOfContext(e.ctx), lp = m3().pt(v8), sc = px({ x: X[0] * lp.x + X[1] * lp.y + X[2] * lp.z + X[3], y: X[4] * lp.x + X[5] * lp.y + X[6] * lp.z + X[7], z: X[8] * lp.x + X[9] * lp.y + X[10] * lp.z + X[11] });   // 本地 → 世界（3×4 行主序）
  e.setTool("move"); await sleep(10);
  fire("pointermove", sc.x, sc.y, 0); await sleep(10); out.eight.pressInView = sc.x > 0 && sc.y > 0 && sc.x < vw && sc.y < vh; await sleep(10); fire("pointerdown", sc.x, sc.y, 1); await sleep(10);
  for (let i = 1; i <= 6; i++) { fire("pointermove", sc.x + 8 * i, sc.y - 5 * i, 1); await sleep(15); }
  const lm = e.liveMesh, pv = lm ? lm.pt(v8) : null, pw = lm ? lm.pt(w8) : null;
  out.eight.preview = pv && pw ? { moved: Math.hypot(pv.x - X3, pv.y - Yt, pv.z - Zt) > 0.05, mirrored: Math.abs(pw.x + pv.x) < 1e-6 && Math.abs(pw.y - pv.y) < 1e-6 && Math.abs(pw.z - pv.z) < 1e-6 } : null;
  fire("pointerup", sc.x + 48, sc.y - 30, 0); await sleep(60);
  const a = m3().pt(v8), bq = m3().pt(w8);
  out.eight.after = { moved: Math.hypot(a.x - X3, a.y - Yt, a.z - Zt) > 0.05, mirrored: Math.abs(bq.x + a.x) < 1e-6 && Math.abs(bq.y - a.y) < 1e-6 && Math.abs(bq.z - a.z) < 1e-6, wMoved: Math.hypot(bq.x - w0.x, bq.y - w0.y, bq.z - w0.z) > 0.05, hint: hint() };
  // ⑨（2026-10-28 晚 Claude Fable 5.1，账本 UX31 / 设计稿 20261028-mirror-redo-design.md）：镜像编辑真拖 v8 穿过镜像面到对面 → 预演里就停在中缝、和 w8 并成一个点；松手 = 一步（挪 + 并）；撤销一下全回
  {
    const n0 = m3().vertexCount(), pv0 = { ...m3().pt(v8) }, tgt = { x: -pv0.x - 0.3, y: pv0.y, z: pv0.z };
    const w2s = (lp) => px({ x: X[0] * lp.x + X[1] * lp.y + X[2] * lp.z + X[3], y: X[4] * lp.x + X[5] * lp.y + X[6] * lp.z + X[7], z: X[8] * lp.x + X[9] * lp.y + X[10] * lp.z + X[11] });
    const s0 = w2s(pv0), s1 = w2s(tgt);
    e.setTool("move"); await sleep(10);
    fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10);
    for (let i = 1; i <= 8; i++) { fire("pointermove", s0.x + (s1.x - s0.x) * i / 8, s0.y + (s1.y - s0.y) * i / 8, 1); await sleep(15); }
    const lm9 = e.liveMesh;
    out.nine = { n0, previewVerts: lm9 ? lm9.vertexCount() : null, previewKeepX: lm9 && lm9.hasV(v8) ? lm9.pt(v8).x : null };
    fire("pointerup", s1.x, s1.y, 0); await sleep(60);
    out.nine.verts = m3().vertexCount(); out.nine.keepX = m3().hasV(v8) ? m3().pt(v8).x : null; out.nine.dropGone = !m3().hasV(w8); out.nine.sym = sym(m3()); out.nine.check = m3().check().length; out.nine.hint = hint();
    e.undo(); await sleep(20);
    out.nine.undoVerts = m3().vertexCount(); out.nine.undoBack = m3().hasV(w8) && Math.abs(m3().pt(v8).x - pv0.x) < 1e-9;
  }
  // ⑩ 强行对称：中缝上的点往外拖 → 钉在镜像面上只在面内滑，点数不变（user「不应该变成两个点，而是被吸附在中线上」）
  e.setMirror("force", 0); await sleep(20);
  {
    const cut3 = m3().edges().find((x) => Math.abs(m3().pt(m3().edgeA[x]).x - m3().pt(m3().edgeB[x]).x) > 1);
    e.commitOp({ op: "meshLoopCut", def: inst3.def, edge: cut3, t: 0.5 }); await sleep(20);   // 这个盒子还没切过中缝：先环切一圈，才有中缝点可拖
    const seamV = m3().verts().find((q) => Math.abs(m3().pt(q).x) < 1e-9), n0 = m3().vertexCount(), p0 = { ...m3().pt(seamV) };
    e.commitOp({ op: "meshMove", def: inst3.def, moves: [{ v: seamV, to: { x: 0.4, y: p0.y + 0.1, z: p0.z } }] }); await sleep(20);
    out.ten = { n0, verts: m3().vertexCount(), x: m3().pt(seamV).x, dy: m3().pt(seamV).y - p0.y, sym: sym(m3()), faces: m3().faceCount() };
    e.undo(); await sleep(10);
  }
  return out;
});
await b.close();
res.errs = errs;
const ok = res.one.row && /组件「块」/.test(res.one.who) && /网格体/.test(res.one.who) && !res.one.axisBefore && res.one.axisAfter && /关/.test(res.one.items) && /镜像编辑/.test(res.one.items) && /强行对称/.test(res.one.items) && res.found.v !== undefined && res.found.w !== undefined   // 「对称对齐…」要有选区才露（没选 = 不露），⑥ 走它
  && res.two.mode === "edit" && res.two.noPlaneOnModel && res.two.gizmo?.mode === "edit" && res.two.gizmo?.unpaired === 0 && res.two.gizmo?.stroke === "#8b5cf6" && res.two.seam
  && Math.abs(res.three.w.x - (res.localCenterX - 1.3)) < 1e-9 && Math.abs(res.three.w.y - (res.local.Y1 + 0.2)) < 1e-9 && res.three.steps === 1 && Math.abs(res.three.afterUndo.w.x - (res.localCenterX - 1)) < 1e-9
  && res.four.selFaces === 1 && /关掉镜像/.test(res.four.sheet ?? "") && res.four.facesBefore === 0 && res.four.facesAfter === 4 && res.four.mirrorAfter === null && res.four.undone === 0
  && res.five.symBefore === false && res.five.mode === "force" && res.five.symAfterOn && res.five.extrude.dFaces === 8 && res.five.extrude.steps === 1 && res.five.extrude.sym && res.five.undo === 0
  && res.six.symBefore === false && res.six.symAfter
  && res.seven.faces0 === 6 && Math.abs(res.seven.center) < 1e-9 && res.seven.faces === 10 && res.seven.sym && /切开/.test(res.seven.hint)
  && res.eight.gizmoOff?.unpaired === 8 && res.eight.gizmoOff?.stroke === "#e8890c" && res.eight.gizmoOff?.badge === "8" && /设置原点到选择中心/.test(res.eight.hintOn)
  && res.eight.gizmoCentered?.unpaired === 0 && res.eight.gizmoCentered?.stroke === "#8b5cf6"
  && res.eight.preview?.moved && res.eight.preview?.mirrored && res.eight.after.moved && res.eight.after.mirrored && res.eight.after.wMoved
  && res.nine.previewVerts === res.nine.n0 - 1 && res.nine.previewKeepX === 0 && res.nine.verts === res.nine.n0 - 1 && res.nine.keepX === 0 && res.nine.dropGone && res.nine.sym && res.nine.check === 0 && /并成一个/.test(res.nine.hint)
  && res.nine.undoVerts === res.nine.n0 && res.nine.undoBack
  && res.ten.n0 === 12 && res.ten.verts === 12 && res.ten.x === 0 && Math.abs(res.ten.dy - 0.1) < 1e-9 && res.ten.sym && res.ten.faces === 10
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-mirror OK" : "probe-mesh-mirror FAIL");
process.exit(ok ? 0 : 1);

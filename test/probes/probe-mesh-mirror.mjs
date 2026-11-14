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
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)") ?? document.querySelector(".float-win:not([hidden]) .float-body"), layer = () => document.querySelector(".popup-menu.choice-layer");
  const openObj = async () => { if (document.querySelector('.float-win[data-win="object"]:not([hidden])')) return; document.querySelector(".gizmo-object")?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); document.querySelector('.popup-menu [data-menu-tab="kind"], .float-win [data-menu-tab="kind"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(30); };   // 第 1 版第五节第 2 条：对称 / 细分 / 默认平滑住种类那一页（有就切过去）   // 右边「物件」钮 → 物件窗口（这一层）
  const mirrorPick = async (id) => { await openObj(); menu()?.querySelector('[data-menu-id="mirror:mode"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(40); layer()?.querySelector(`[data-choice-id="mirror:mode:${id}"]`)?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60); };
  const closeAll = async () => { document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); await sleep(30); document.querySelectorAll(".popup-menu").forEach((m) => m.remove()); document.querySelectorAll(".float-win:not([hidden]) .float-close").forEach((b) => b.click()); };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, px = (p) => e.cam.angularPx(p, e.vp()), hint = () => hud.status();
  const at = (k, x, y, z) => k.verts().find((v) => { const q = k.pt(v); return Math.abs(q.x - x) < 1e-9 && Math.abs(q.y - y) < 1e-9 && Math.abs(q.z - z) < 1e-9; });
  const sym = (k) => k.verts().every((v) => { const q = k.pt(v); return k.verts().some((w) => { const p = k.pt(w); return Math.abs(p.x + q.x) < 1e-9 && Math.abs(p.y - q.y) < 1e-9 && Math.abs(p.z - q.z) < 1e-9; }); });
  const out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.cam.target = P(0, 0.5, 0.5); e.draw();
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
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
  out.one = { row: !!row, who: await (async () => { document.querySelector('.popup-menu [data-menu-tab="object"], .float-win [data-menu-tab="object"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(30); const w = menu()?.querySelector(".menu-note")?.textContent ?? ""; document.querySelector('.popup-menu [data-menu-tab="kind"], .float-win [data-menu-tab="kind"]')?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(30); return w; })(), axisBefore: !!menu()?.querySelector('[data-menu-id="mirror:axis"]') };
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
  out.four.undone = m().faceCount() - f0; out.four.mirrorUndone = e.mirrorOf()?.mode ?? null;   // 2026-11-09 起「关掉镜像，照做」= 一步：撤销一下镜像编辑也回来
  // ⑤ 强行对称：先把 -x 那个角挪歪（镜像关着），选 +x 的一张面再开强行对称（以选区那边为准）→ 对称了
  e.setMirror(null);   // ④ 的撤销把镜像编辑也撤回来了（v0.18.46 起开关进撤销）：这里明确关掉
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
  e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块2"); e.runAction("object.toMesh"); await sleep(20);
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
  e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("偏"); e.runAction("object.toMesh"); await sleep(20);
  const inst3 = [...S().def(S().root).instances.values()].find((x) => !before8.has(x.id) && S().kindOf?.(x.def) !== "brep") ?? [...S().def(S().root).instances.values()].at(-1), m3 = () => S().mesh(inst3.def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst3.id}`, { kind: "instance", instance: inst3.id }); e.enterSelected(); await sleep(30);
  e.commitOp({ op: "meshMove", def: inst3.def, moves: m3().verts().map((q) => ({ v: q, to: { ...m3().pt(q), x: m3().pt(q).x + 0.7 } })) });
  // 方片每个动画帧重画一次（view-gizmo.ts tick）：等真出两帧 = 一定按现在的状态画过了，和机器快慢无关（以前按墙上 250 ms 等 + 只等「出现」：机器忙时读到旧的，2026-10-28 / 11-09 各假红过）
  const frames = (n) => new Promise((res) => { let k = n; const f = () => (--k <= 0 ? res() : requestAnimationFrame(f)); requestAnimationFrame(f); });
  e.setMirror("edit", 0); await frames(2);
  out.eight = { gizmoOff: gz(), hintOn: hint() };
  e.selectAll(); e.runAction("mesh.originToSelection"); e.deselectAll(); await frames(2);
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
  // ⑪⑫（2026-11-09 Claude Opus 5.5；计划书 20261109-audit-fixes-plan.md §3 第 0 层）：空的那半不当准。新做一个网格体盒子，本地挪到想要的位置（镜像关着），再开强行对称
  let freshN = 0;   // 每个新盒子摆在不同的地方（2026-11-09：⑪–⑭ 以前全叠在 x 14..16 同一处，按点的时候被叠着的别的组件挡住）
  const freshMesh = async (shiftTo) => {
    e.setMirror(null); e.exitTo(0); await sleep(20);
    const before = new Set(S().def(S().root).instances.keys()), yo = 4 * freshN++;   // 只包新画的盒子：selectAll 之后清掉选中的子物体（2026-11-13 统筹：以前把前几段的组件也包了进去，第十四段靠拷贝时连带的子物体碰巧绿）
    box(14, yo, 0, 16, yo + 1, 1); e.selectAll(); e.selectedPools.clear(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("偏2"); e.runAction("object.toMesh"); await sleep(20);
    const it = [...S().def(S().root).instances.values()].find((x) => !before.has(x.id) && S().kindOf(x.def) === "mesh");
    e.selectedPools.clear(); e.selectedPools.set(`i${it.id}`, { kind: "instance", instance: it.id }); e.enterSelected(); await sleep(30);
    const k = () => S().mesh(it.def).kernel, xs = k().verts().map((q) => k().pt(q).x), d = shiftTo - (Math.min(...xs) + Math.max(...xs)) / 2;
    e.commitOp({ op: "meshMove", def: it.def, moves: k().verts().map((q) => ({ v: q, to: { ...k().pt(q), x: k().pt(q).x + d } })) }); await sleep(20);
    return { def: it.def, k };
  };
  // ⑪ 模型整个在 −X 那半（本地 −3..−1）、什么都没选、开强行对称 → 以 −X 为准镜过去（以前 = 以 +X 为准、删光 6 张面）
  {
    const { k } = await freshMesh(-2);
    e.deselectAll(); const f0 = k().faceCount();
    e.setMirror("force", 0); await sleep(30);
    out.eleven = { f0, faces: k().faceCount(), sym: sym(k()), hint: hint() };
    e.undo(); await sleep(20); out.eleven.undone = k().faceCount(); out.eleven.mirrorAfterUndo = e.mirrorOf()?.mode ?? null;   // 11-09 审查：以前撤销后模型回来了、强行对称还开着（设置不进撤销）
  }
  // ⑫（v0.18.45 改：第 1 层）强行对称开着、盒子在中间（已经对称）→ 选 +X 那张面「设置原点到选择中心」= 模型会整个跑到 −X 那半 → 先问「关掉镜像，照做 / 取消」
  //   （v0.18.40 这一下悄悄换了原点、下一步挪中缝点 6 张面 → 1 张；v0.18.41 不删光了但补成 10 张）。取消 = 模型、原点、镜像都没动；照做 = 强行对称关了、原点换了
  {
    const { def, k } = await freshMesh(0);
    e.setMirror("force", 0); await sleep(30);
    const rf = () => k().faces().find((f) => k().faceVerts(f).every((q) => k().pt(q).x > 0.5));
    const xs = () => k().verts().map((q) => k().pt(q).x), sheet = () => { const b = document.getElementById("sheetConfirm"); return b && !b.closest("[hidden]") ? b.textContent : null; };
    const xs0 = xs().join(","), steps0 = e.history.steps();
    e.deselectAll(); e.selection.faces.add(rf()); e.runAction("mesh.originToSelection"); await sleep(60);
    out.twelve = { ask: sheet(), f0: k().faceCount() };
    document.getElementById("sheetCancel")?.click(); await sleep(60);
    out.twelve.cancel = { faces: k().faceCount(), same: xs().join(",") === xs0, mode: e.mirrorOf()?.mode ?? null, steps: e.history.steps() - steps0, hint: hint() };
    e.deselectAll(); e.selection.faces.add(rf()); e.runAction("mesh.originToSelection"); await sleep(60);
    document.getElementById("sheetConfirm")?.click(); await sleep(80);
    out.twelve.ok = { faces: k().faceCount(), xmax: Math.max(...xs()), mode: e.mirrorOf()?.mode ?? null, hint: hint() };
    e.undo(); await sleep(20);
  }
  // ⑭（v0.18.45：第 2 / 3 层）强行对称下：删左边一张面 / 给左边一条边打标记 / 翻左边一张面 = 对面那份一起做（不重建另一半：这一步最后一条指令就是它自己）；
  //   左边原位贴进一张面，再在右边挪一个点 = 贴的那张还在、右边也有了（以前贴的不对称化，下一步被当成「另一半」删掉）
  {
    const { def, k } = await freshMesh(0);
    const cut = k().edges().find((x) => Math.abs(k().pt(k().edgeA[x]).x - k().pt(k().edgeB[x]).x) > 1);
    e.commitOp({ op: "meshLoopCut", def, edge: cut, t: 0.5 }); await sleep(20);
    e.setMirror("force", 0); await sleep(30);
    const side = (f) => { const r = k().faceVerts(f); return r.reduce((a, q) => a + k().pt(q).x, 0) / r.length; };
    const LR = () => { let L = 0, R = 0; for (const f of k().faces()) (side(f) < 0 ? L++ : R++); return `${L}/${R}`; };
    const lastOp = () => e.history.ops.at(-1)?.op;
    const leftEnd = () => k().faces().find((f) => k().faceVerts(f).every((q) => k().pt(q).x < -0.5));
    out.fourteen = { start: LR() };
    e.deselectAll(); e.selection.faces.add(leftEnd()); e.deleteSelection(); await sleep(30);
    out.fourteen.del = { lr: LR(), last: lastOp(), sym: sym(k()) };
    e.undo(); await sleep(20);
    const markable = k().edges().find((x) => k().pt(k().edgeA[x]).x < -0.5 && k().pt(k().edgeB[x]).x < -0.5);
    e.deselectAll(); e.selection.edges.add(markable); e.runAction("mesh.markSharp"); await sleep(30);
    const marked = (sgn) => k().edges().filter((x) => ["sharp_edge", "smooth", "soft", "uv_seam", "hide_edge"].some((id) => k().edgeValue(x, id) === 1) && sgn * (k().pt(k().edgeA[x]).x + k().pt(k().edgeB[x]).x) > 0).length;
    out.fourteen.mark = { left: marked(-1), right: marked(1), last: lastOp() };
    e.undo(); await sleep(20);
    const lf = k().faces().find((f) => side(f) < -0.1 && k().faceVerts(f).some((q) => Math.abs(k().pt(q).x) < 1e-9));
    e.deselectAll(); e.selection.faces.add(lf); e.runAction("mesh.flipNormals"); await sleep(30);
    out.fourteen.flip = { last: lastOp(), symmetric: e.mirrorOf() ? !document.querySelector(".gizmo-mirror[data-unpaired]:not([data-unpaired='0'])") : null, lr: LR() };
    e.undo(); await sleep(20);
    e.deselectAll(); e.selection.faces.add(leftEnd()); const copied = e.copySelection(); e.pasteClipboard(); await sleep(40);
    out.fourteen.paste = { copied, afterPaste: LR() };
    const rv = k().verts().find((q) => k().pt(q).x > 0.5), p0 = { ...k().pt(rv) };
    e.deselectAll(); e.commitOp({ op: "meshMove", def, moves: [{ v: rv, to: { ...p0, z: p0.z + 0.2 } }] }); await sleep(30);
    out.fourteen.paste.afterMove = LR(); out.fourteen.paste.sym = sym(k());
    e.setMirror(null);
  }
  // ⑬（2026-11-09 Claude Opus 5.5；计划书 20261109-audit-fixes-plan 工单 3）：镜像编辑开着，移动工具真拖一个角点、按住 Shift 开吸附，光标停在它孪生点「原来」的屏幕位置上 = 不吸它
  //   （孪生点跟着镜过去了，原来的位置画面上已经看不见）；对照：停在一个不动的角点上 = 吸得到
  {
    const { def, k } = await freshMesh(0);
    e.setMirror("edit", 0); e.deselectAll(); await sleep(20);
    const X = S().xformOfContext(e.ctx), W = (q) => { const lp = k().pt(q); return { x: X[0] * lp.x + X[1] * lp.y + X[2] * lp.z + X[3], y: X[4] * lp.x + X[5] * lp.y + X[6] * lp.z + X[7], z: X[8] * lp.x + X[9] * lp.y + X[10] * lp.z + X[11] }; };
    const vs = k().verts(), Xm = Math.max(...vs.map((q) => k().pt(q).x)), Ym = Math.max(...vs.map((q) => k().pt(q).y)), Zm = Math.max(...vs.map((q) => k().pt(q).z)), Y0 = Math.min(...vs.map((q) => k().pt(q).y));
    const near = (q, x, y, z) => Math.abs(k().pt(q).x - x) < 1e-9 && Math.abs(k().pt(q).y - y) < 1e-9 && Math.abs(k().pt(q).z - z) < 1e-9;
    const v = vs.find((q) => near(q, Xm, Ym, Zm)), w = vs.find((q) => near(q, -Xm, Ym, Zm)), u = vs.find((q) => near(q, Xm, Y0, Zm));
    const vw = W(v), ww = W(w), uw = W(u);
    e.cam.target = { x: (vw.x + ww.x) / 2, y: (vw.y + uw.y) / 2, z: 0.5 }; e.draw(); await sleep(20);
    const sv = px(vw), swn = px(ww), su = px(uw);
    const fireS = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 11, pointerType: "mouse", isPrimary: true, button: 0, buttons, shiftKey: true }));
    e.setTool("move"); await sleep(10);
    fire("pointermove", sv.x, sv.y, 0); await sleep(10); fire("pointerdown", sv.x, sv.y, 1); await sleep(10);
    for (let i = 1; i <= 4; i++) { fire("pointermove", sv.x + 6 * i, sv.y - 4 * i, 1); await sleep(15); }
    const at = async (q) => { fireS("pointermove", q.x + 2, q.y + 1, 1); await sleep(15); fireS("pointermove", q.x, q.y, 1); await sleep(30); const sn = e.snapInfo; return sn ? { kind: sn.kind, p: sn.p } : null; };
    const same = (a, b) => !!a && Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z) < 1e-6;
    const snW = await at(swn), snU = await at(su);
    out.thirteen = { moving: e.isGestureActive(), twinSnapped: same(snW?.p, ww), otherSnapped: same(snU?.p, uw), otherKind: snU?.kind ?? null };
    e.cancel(); fire("pointerup", su.x, su.y, 0); await sleep(30); e.cancel();
    out.thirteen.unchanged = same(W(v), vw) && same(W(w), ww);
    e.setMirror(null);
  }
  // ⑮（2026-11-10 Claude Fable 5.2 审 v0.18.45）：强行对称下把 + 那半朝着镜像面的那张面推过头（推拉 = 一条带位移的 meshExtrude）→ 以点名的 + 那半为准：
  //   推出去的那段在中缝切开、和对面焊成一座桥 = 一个连通块（v0.18.46：新点落在 − 那半 → 以 − 为准，推出去的那段和盒子脱开、盒子上那张面被镜回来 = 三块）
  {
    const { def, k } = await freshMesh(1.5);   // 本地 0.5..2.5：整个在 + 那半、离镜像面 0.5
    e.deselectAll(); e.setMirror("force", 0); await sleep(30);
    const blocks = () => { const par = new Map(k().verts().map((q) => [q, q])), find = (a) => { while (par.get(a) !== a) a = par.get(a); return a; }; for (const x of k().edges()) par.set(find(k().edgeA[x]), find(k().edgeB[x])); return new Set(k().verts().map(find)).size; };
    const inner = k().faces().find((f) => k().faceVerts(f).every((q) => Math.abs(k().pt(q).x - 0.5) < 1e-9));
    out.fifteen = { faces0: k().faceCount(), blocks0: blocks() };
    e.commitOp({ op: "meshExtrude", def, faces: [inner], offset: { x: -0.8, y: 0, z: 0 } }); await sleep(30);
    out.fifteen.after = { faces: k().faceCount(), blocks: blocks(), sym: sym(k()), open: k().edges().filter((x) => k().eFaces(x).length === 1).length, hint: hint() };
    e.undo(); await sleep(20); out.fifteen.undone = { faces: k().faceCount(), blocks: blocks() };
    e.setMirror(null);
  }
  return out;
});
await b.close();
res.errs = errs;
const ok = res.one.row && /组件「块」/.test(res.one.who) && /网格体/.test(res.one.who) && !res.one.axisBefore && res.one.axisAfter && /关/.test(res.one.items) && /镜像编辑/.test(res.one.items) && /强行对称/.test(res.one.items) && res.found.v !== undefined && res.found.w !== undefined   // 「对称对齐…」要有选区才露（没选 = 不露），⑥ 走它
  && res.two.mode === "edit" && res.two.noPlaneOnModel && res.two.gizmo?.mode === "edit" && res.two.gizmo?.unpaired === 0 && res.two.gizmo?.stroke === "#8b5cf6" && res.two.seam
  && Math.abs(res.three.w.x - (res.localCenterX - 1.3)) < 1e-9 && Math.abs(res.three.w.y - (res.local.Y1 + 0.2)) < 1e-9 && res.three.steps === 1 && Math.abs(res.three.afterUndo.w.x - (res.localCenterX - 1)) < 1e-9
  && res.four.selFaces === 1 && /关掉镜像/.test(res.four.sheet ?? "") && res.four.facesBefore === 0 && res.four.facesAfter === 4 && res.four.mirrorAfter === null && res.four.undone === 0 && res.four.mirrorUndone === "edit"
  && res.five.symBefore === false && res.five.mode === "force" && res.five.symAfterOn && res.five.extrude.dFaces === 8 && res.five.extrude.steps === 1 && res.five.extrude.sym && res.five.undo === 0
  && res.six.symBefore === false && res.six.symAfter
  && res.seven.faces0 === 6 && Math.abs(res.seven.center) < 1e-9 && res.seven.faces === 10 && res.seven.sym && /切开/.test(res.seven.hint)
  && res.eight.gizmoOff?.unpaired === 8 && res.eight.gizmoOff?.stroke === "#e8890c" && res.eight.gizmoOff?.badge === "8" && /设置原点到选择中心/.test(res.eight.hintOn)
  && res.eight.gizmoCentered?.unpaired === 0 && res.eight.gizmoCentered?.stroke === "#8b5cf6"
  && res.eight.preview?.moved && res.eight.preview?.mirrored && res.eight.after.moved && res.eight.after.mirrored && res.eight.after.wMoved
  && res.nine.previewVerts === res.nine.n0 - 1 && res.nine.previewKeepX === 0 && res.nine.verts === res.nine.n0 - 1 && res.nine.keepX === 0 && res.nine.dropGone && res.nine.sym && res.nine.check === 0 && /并成一个/.test(res.nine.hint)
  && res.nine.undoVerts === res.nine.n0 && res.nine.undoBack
  && res.ten.n0 === 12 && res.ten.verts === 12 && res.ten.x === 0 && Math.abs(res.ten.dy - 0.1) < 1e-9 && res.ten.sym && res.ten.faces === 10
  && res.eleven.f0 === 6 && res.eleven.faces === 12 && res.eleven.sym && /以 −X 那半为准/.test(res.eleven.hint) && /\+X 那半是空的/.test(res.eleven.hint) && res.eleven.undone === 6 && res.eleven.mirrorAfterUndo === null
  && /关掉镜像/.test(res.twelve.ask ?? "") && res.twelve.cancel.faces === 6 && res.twelve.cancel.same && res.twelve.cancel.mode === "force" && res.twelve.cancel.steps === 0 && /没做/.test(res.twelve.cancel.hint)
  && res.twelve.ok.faces === 6 && Math.abs(res.twelve.ok.xmax) < 1e-9 && res.twelve.ok.mode === null && /照做了/.test(res.twelve.ok.hint)
  && res.fourteen.start === "5/5" && res.fourteen.del.lr === "4/4" && res.fourteen.del.last === "meshDelete" && res.fourteen.del.sym
  && res.fourteen.mark.left === 1 && res.fourteen.mark.right === 1 && res.fourteen.mark.last === "meshEdgeMarks"
  && res.fourteen.flip.last === "meshFlip" && res.fourteen.flip.lr === "5/5"
  && res.fourteen.paste.copied && res.fourteen.paste.afterPaste === "6/6" && res.fourteen.paste.afterMove === "6/6" && res.fourteen.paste.sym
  && res.thirteen.moving && !res.thirteen.twinSnapped && res.thirteen.otherSnapped && res.thirteen.unchanged
  && res.fifteen.faces0 === 12 && res.fifteen.blocks0 === 2 && res.fifteen.after.blocks === 1 && res.fifteen.after.sym && res.fifteen.after.open === 0 && res.fifteen.undone.faces === 12 && res.fifteen.undone.blocks === 2
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-mesh-mirror OK" : "probe-mesh-mirror FAIL");
process.exit(ok ? 0 : 1);

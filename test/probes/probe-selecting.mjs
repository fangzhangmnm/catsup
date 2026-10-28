// 「会选的工具」（2026-10-28 Claude Opus 5.5；user「move之类的因为也可以选择，能不能理一下深模块」「move的时候在没选择的时候能不能拖框，其他的同理」
// 「alt 点边可以选择洞还是环，然后有镜像的时候环的算法要小心一点」）。自由建模里一个环切过的网格盒子：
// ① 移动工具、没选区：空处拖 = 框选（框住的点进选区、盒子没被挪）② 挤出、插入工具同理 ③ 移动工具点一下点 = 选它；Shift 再点另一个点 = 加上（和选择工具同一套）
// ④ Alt 点环切那一圈的边 = 整圈 4 条 ⑤ 再沿中间竖切一刀（中缝上有点）、强行对称开着：Alt 点横着那圈中缝一侧的一段 = 走过中缝、整圈 6 条 ⑥ 选一条边 → 右键「选成环 / 洞」⑦ 选两个点 → 右键「合并到中心」→ 少一个点、撤销回来 ⑧ 没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-selecting.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const fire = (type, x, y, buttons, mods = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 11, pointerType: "mouse", isPrimary: true, button: 0, buttons, ...mods }));
  const drag = async (x0, y0, x1, y1) => { fire("pointermove", x0, y0, 0); await sleep(10); fire("pointerdown", x0, y0, 1); await sleep(10); for (let i = 1; i <= 6; i++) { fire("pointermove", x0 + (x1 - x0) * i / 6, y0 + (y1 - y0) * i / 6, 1); await sleep(12); } fire("pointerup", x1, y1, 0); await sleep(60); };
  const tap = async (x, y, mods = {}) => { fire("pointermove", x, y, 0, mods); await sleep(10); fire("pointerdown", x, y, 1, mods); await sleep(15); fire("pointerup", x, y, 0, mods); await sleep(500); };   // 点完等过双击窗口
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 2.2; e.cam.target = P(0, 0.5, 0.5); e.draw();
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const X = () => S().xformOfContext(e.ctx), W = (p) => { const x = X(); return { x: x[0] * p.x + x[1] * p.y + x[2] * p.z + x[3], y: x[4] * p.x + x[5] * p.y + x[6] * p.z + x[7], z: x[8] * p.x + x[9] * p.y + x[10] * p.z + x[11] }; };
  const px = (v) => e.cam.angularPx(W(m().pt(v)), e.vp()), mid = (ed) => { const a = px(m().edgeA[ed]), b2 = px(m().edgeB[ed]); return { x: (a.x + b2.x) / 2, y: (a.y + b2.y) / 2 }; };
  // 环切一圈（横着、z = 0.5）
  const vert = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).z - m().pt(m().edgeB[x]).z) > 0.5);
  e.commitOp({ op: "meshLoopCut", def, edge: vert, t: 0.5 }); e.deselectAll(); await sleep(20);
  const sum = () => JSON.stringify(m().verts().map((v) => m().pt(v)));
  // ① 移动工具，没选区：从左上空处拖到右下 = 框住整个盒子
  for (const tool of ["move", "pp", "offset"]) {
    e.setTool(tool); e.deselectAll(); await sleep(20);
    const before = sum();
    await drag(20, 20, 880, 680);
    out[tool] = { verts: e.selection.verts?.size ?? 0, edges: e.selection.edges.size, faces: e.selection.faces.size, untouched: sum() === before, steps: e.history.steps() };
  }
  // ③ 移动工具：点一个点 = 选它；Shift 点另一个 = 加上
  e.setTool("move"); e.deselectAll(); await sleep(20);
  const top = m().verts().filter((v) => Math.abs(m().pt(v).z - 1) < 1e-9), v1 = top[0], v2 = top[1];
  const p1 = px(v1), p2 = px(v2);
  await tap(p1.x, p1.y); out.tap1 = [...(e.selection.verts ?? [])];
  await tap(p2.x, p2.y, { shiftKey: true }); out.tap2 = [...(e.selection.verts ?? [])].sort((a, b2) => a - b2);
  // ④ Alt 点环切那一圈的一条边（选择工具）
  e.setTool("select"); e.deselectAll(); await sleep(20);
  const ringE = m().edges().filter((x) => Math.abs(m().pt(m().edgeA[x]).z - 0.5) < 1e-9 && Math.abs(m().pt(m().edgeB[x]).z - 0.5) < 1e-9);
  const front = ringE.find((x) => Math.min(m().pt(m().edgeA[x]).y, m().pt(m().edgeB[x]).y) < -0.4 && Math.max(m().pt(m().edgeA[x]).y, m().pt(m().edgeB[x]).y) < -0.4) ?? ringE[0];
  const fm = mid(front);
  await tap(fm.x, fm.y, { altKey: true });
  out.alt = { edges: [...e.selection.edges].sort((a, b2) => a - b2), ring: ringE.sort((a, b2) => a - b2), hint: hud.status() };
  // ⑤ 强行对称（沿 X 切开）：环切那一圈被中缝劈成 6 段，Alt 点一段 = 整圈（走过中缝）
  // 先沿中间竖着再切一刀（x = 0 上出点 = 中缝上有点），开强行对称（已经对称，不改形）；横着那一圈被中缝劈成 6 段
  const xEdge = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).x - m().pt(m().edgeB[x]).x) > 1.5 && Math.abs(m().pt(m().edgeA[x]).z) < 1e-9);
  e.commitOp({ op: "meshLoopCut", def, edge: xEdge, t: 0.5 });
  e.deselectAll(); e.setMirror("force", 0); await sleep(30);
  const ring2 = m().edges().filter((x) => Math.abs(m().pt(m().edgeA[x]).z - 0.5) < 1e-9 && Math.abs(m().pt(m().edgeB[x]).z - 0.5) < 1e-9);
  const f2 = ring2.find((x) => Math.min(m().pt(m().edgeA[x]).y, m().pt(m().edgeB[x]).y) < -0.4 && Math.max(m().pt(m().edgeA[x]).y, m().pt(m().edgeB[x]).y) < -0.4 && Math.min(m().pt(m().edgeA[x]).x, m().pt(m().edgeB[x]).x) > -0.01) ?? ring2[0];
  const fm2 = mid(f2);
  await tap(fm2.x, fm2.y, { altKey: true });
  out.mirror = { ring: ring2.length, picked: e.selection.edges.size, crosses: [...e.selection.edges].some((x) => m().pt(m().edgeA[x]).x < -0.01 || m().pt(m().edgeB[x]).x < -0.01) && [...e.selection.edges].some((x) => m().pt(m().edgeA[x]).x > 0.01 || m().pt(m().edgeB[x]).x > 0.01) };
  e.setMirror(null);
  // ⑥ 右键「选成环 / 洞」
  e.deselectAll(); await tap(fm2.x, fm2.y); const one = e.selection.edges.size;
  c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 640, button: 2 })); await sleep(60);
  const row = [...document.querySelectorAll(".popup-menu:not(.choice-layer) [data-menu-id]")].find((x) => /选成环/.test(x.textContent));
  row?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60);
  document.querySelectorAll(".popup-menu").forEach((x) => x.remove());
  out.menu = { one, row: !!row, after: e.selection.edges.size };
  // ⑦ 合并到中心（user 10-28「选择多个点的时候右键可以merge to center」）：选顶上两个点 → 右键「合并到中心」→ 少一个点、一步撤销
  e.setMirror(null); e.deselectAll();
  const tv = m().verts().filter((v) => Math.abs(m().pt(v).z - 1) < 1e-9).slice(0, 2), n0 = m().vertexCount(), st0 = e.history.steps();
  e.setTool("select"); for (const [i, v] of tv.entries()) { const q = px(v); await tap(q.x, q.y, i ? { shiftKey: true } : {}); }
  c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + 40, clientY: r.top + 640, button: 2 })); await sleep(60);
  const mr = [...document.querySelectorAll(".popup-menu:not(.choice-layer) [data-menu-id]")].find((x) => /合并到中心/.test(x.textContent));
  mr?.dispatchEvent(new MouseEvent("click", { bubbles: true })); await sleep(60);
  document.querySelectorAll(".popup-menu").forEach((x) => x.remove());
  out.merge = { picked: tv.length, row: !!mr, before: n0, after: m().vertexCount(), steps: e.history.steps() - st0 };
  e.undo(); await sleep(20); out.merge.undone = m().vertexCount();
  return out;
});
await b.close();
res.errs = errs;
const boxOk = (o) => o && o.untouched && (o.verts + o.edges + o.faces) > 0;
const ok = boxOk(res.move) && boxOk(res.pp) && boxOk(res.offset)
  && res.tap1.length === 1 && res.tap2.length === 2
  && JSON.stringify(res.alt.edges) === JSON.stringify(res.alt.ring) && res.alt.ring.length === 4 && /环/.test(res.alt.hint)
  && res.mirror.ring === 6 && res.mirror.picked === 6 && res.mirror.crosses
  && res.menu.one === 1 && res.menu.row && res.menu.after > 1
  && res.merge.row && res.merge.after === res.merge.before - 1 && res.merge.undone === res.merge.before
  && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-selecting OK" : "probe-selecting FAIL");
process.exit(ok ? 0 : 1);

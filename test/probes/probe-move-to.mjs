// 「移到…」「移出一层」（第 1 版施工单第三节；2026-11-13 Claude Opus 5.5）。根上：散几何的盒子 G（x 0..1）+ 组件 A（x 3..4）+ 组件 B（x 6..7）。
// ① 选 G →「移到…」→ 鼠标点 A = G 的几何搬进 A、世界位置不变、根上没了；一步撤销回来 ② 选 B →「移到…」→ 点 A = B 成了 A 的子物体、GUID 不变、世界位置不变
// ③ 进 A、选 B →「移出一层」= B 回到根上、GUID 不变、世界位置不变 ④ 根上「移出一层」= 说「已经在最外一层」
// ⑤ A 摆了两份：搬进 A 的提示说「摆了 2 份，每一份里都多了它」（和层级窗口拖动同一句） ⑥「移到…」等着时按 Esc = 取消，点了也不搬
// ⑦ A 转成网格体后把散几何搬进去 = 先问「搬过去要转种类」；点「不做」= 什么都没动
// ⑧ 强行对称下移出一层：对称的另一半一起搬、提示行说张数；找不到另一半的只搬选中的、明说；普通删除的提示行说一起删了几张（版末审查第 1 条）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-move-to.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(6000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (x0, y0, z0, x1, y1, z1) => { const s = []; const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(a[0], a[1], z0), P(d[0], d[1], z0)], [P(a[0], a[1], z1), P(d[0], d[1], z1)], [P(a[0], a[1], z0), P(a[0], a[1], z1)]); } return s; };
  const inBox = (p, lo, hi) => p.x >= lo.x - 1e-6 && p.y >= lo.y - 1e-6 && p.z >= lo.z - 1e-6 && p.x <= hi.x + 1e-6 && p.y <= hi.y + 1e-6 && p.z <= hi.z + 1e-6;
  const selectIn = (lo, hi) => { const k = e.kernel; e.deselectAll(); e.selectedPools.clear(); for (const f of k.faces()) { const r = k.faceRings3(f.id); if (r && r.outer.every((p) => inBox(p, lo, hi))) e.selection.faces.add(f.id); } for (const ed of k.edges()) if (inBox(k.graph.pt(ed.a), lo, hi) && inBox(k.graph.pt(ed.b), lo, hi)) e.selection.edges.add(ed.id); e.draw(); };
  const instNamed = (name) => { const S = e.scene, d = S.def(S.defOfContext(e.ctx)); for (const i of d.instances.values()) if (S.def(i.def).name === name) return i; return null; };
  const selInst = (name) => { const i = instNamed(name); e.deselectAll(); e.selectedPools.clear(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); e.draw(); };
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(6, 0, 0, 7, 1, 1) }); selectIn(P(6, 0, 0), P(7, 1, 1)); e.makeComponent("B");
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(3, 0, 0, 4, 1, 1) }); selectIn(P(3, 0, 0), P(4, 1, 1)); e.makeComponent("A");
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0, 0, 1, 1, 1) });
  e.setTool("select"); e.deselectAll(); e.selectedPools.clear(); e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(150);
  /** 某个物体（按名字）在世界里的包围盒（所有槽里定义名叫它、链最后一份是它的）。 */
  const worldBox = (name) => { const v = e.liveWorld(), S = e.scene; let lo = null, hi = null; for (const sl of v.slots) { if (S.def(sl.pool.def).name !== name) continue; for (const vx of sl.kernel.vertices()) { const gv = vx.id + sl.index * (1 << 22); if (!v.graph.hasVertex(gv)) continue; const p = v.graph.pt(gv); lo = lo ? { x: Math.min(lo.x, p.x), y: Math.min(lo.y, p.y), z: Math.min(lo.z, p.z) } : { ...p }; hi = hi ? { x: Math.max(hi.x, p.x), y: Math.max(hi.y, p.y), z: Math.max(hi.z, p.z) } : { ...p }; } } const q = (o) => o && [o.x, o.y, o.z].map((x) => +x.toFixed(4)); return { lo: q(lo), hi: q(hi) }; };
  /** A 身上一个点得到 A（整个子物体）的屏幕点。 */
  const pointOn = (name) => { const v = e.liveWorld(), A = instNamed(name); for (const sl of v.slots) { if (sl.chain[sl.chain.length - 1] !== A.id || sl.chain.length !== e.ctx.chain.length + 1) continue; for (const f of sl.kernel.faces()) { const r = v.faceRings3(f.id + sl.index * (1 << 22)); if (!r) continue; const c = r.outer.reduce((a, p) => ({ x: a.x + p.x / r.outer.length, y: a.y + p.y / r.outer.length, z: a.z + p.z / r.outer.length }), { x: 0, y: 0, z: 0 }); const q = e.cam.angularPx(c, e.vp()), k = e.classify(v, e.pickAt(q.x, q.y)); if (k.kind === "pool" && k.pick.instance === A.id) return q; } } return null; };
  const rootLoose = () => { const k = e.scene.kernelOf({ def: e.scene.root, group: null }); return k.graph.vertexCount(); };
  window.__m = { e, P, sleep, selectIn, selInst, instNamed, worldBox, pointOn, rootLoose, hint: () => document.getElementById("hint")?.textContent ?? "" };
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const bx = await page.locator("#board").boundingBox();
const clickOn = async (name) => { const q = await ev((n) => window.__m.pointOn(n), name); if (!q) return false; await page.mouse.move(bx.x + q.x, bx.y + q.y, { steps: 2 }); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(150); return true; };
const r = {};
// ① 散几何 G 搬进 A
r.one = { loose0: await ev(() => window.__m.rootLoose()), aBox0: await ev(() => window.__m.worldBox("A")) };
await ev(() => { const { selectIn, P, e } = window.__m; selectIn(P(0, 0, 0), P(1, 1, 1)); e.armMoveTo(); });
r.one.armedHint = await ev(() => window.__m.hint());
r.one.clicked = await clickOn("A");
r.one.loose1 = await ev(() => window.__m.rootLoose()); r.one.aBox1 = await ev(() => window.__m.worldBox("A")); r.one.hint = await ev(() => window.__m.hint());
r.one.sel = await ev(() => [...window.__m.e.selectedPools.values()].map((p) => p.kind));
await ev(() => window.__m.e.undo()); await page.waitForTimeout(80);
r.one.loose2 = await ev(() => window.__m.rootLoose()); r.one.aBox2 = await ev(() => window.__m.worldBox("A"));
// ② 子物体 B 搬进 A
r.two = { bBox0: await ev(() => window.__m.worldBox("B")), guid: await ev(() => window.__m.instNamed("B").guid) };
await ev(() => { const { selInst, e } = window.__m; selInst("B"); e.armMoveTo(); });
r.two.clicked = await clickOn("A");
r.two.bAtRoot = await ev(() => !!window.__m.instNamed("B"));
r.two.inA = await ev(() => { const { e, instNamed } = window.__m, A = instNamed("A"); return [...e.scene.def(A.def).instances.values()].map((i) => i.guid); });
r.two.bBox1 = await ev(() => window.__m.worldBox("B"));
// ③ 进 A、选 B → 移出一层
await ev(async () => { const { e, instNamed, sleep } = window.__m, A = instNamed("A"); e.selectedPools.clear(); e.selectedPools.set(`i${A.id}`, { kind: "instance", instance: A.id }); e.enterSelected(); await sleep(30); window.__m.selInst("B"); e.moveSelectionTo({ kind: "up" }); await sleep(60); });
r.three = { depth: await ev(() => window.__m.e.contextDepth()), guid: await ev(() => window.__m.instNamed("B")?.guid ?? null), bBox: await ev(() => window.__m.worldBox("B")), sel: await ev(() => window.__m.e.selectedPoolKeys().length), hint: await ev(() => window.__m.hint()) };
// ④ 根上移出一层
await ev(() => { const { e, selInst } = window.__m; selInst("B"); e.moveSelectionTo({ kind: "up" }); });
r.four = await ev(() => window.__m.hint());
// ⑤ A 摆两份：搬进 A 说份数
await ev(() => { const { e, instNamed } = window.__m, A = instNamed("A"); e.commitOp({ op: "placeInstance", at: e.activePool(), definition: A.def, xform: [1, 0, 0, 0, 0, 1, 0, -3, 0, 0, 1, 0] }); e.draw(); });
await ev(() => { const { selInst, e } = window.__m; selInst("B"); e.armMoveTo(); });
r.five = { clicked: await clickOn("A"), hint: await ev(() => window.__m.hint()) };
await ev(() => window.__m.e.undo()); await page.waitForTimeout(80);
// ⑥ Esc 取消
await ev(() => { const { selInst, e } = window.__m; selInst("B"); e.armMoveTo(); });
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
r.six = { hint: await ev(() => window.__m.hint()) };
await clickOn("A");
r.six.bAtRoot = await ev(() => !!window.__m.instNamed("B"));
// ⑦ A 转成网格体后，硬表面散几何搬进去 = 先问；点「不做」
await ev(async () => { const { e, instNamed, sleep } = window.__m, A = instNamed("A"); e.selectedPools.clear(); e.selectedPools.set(`i${A.id}`, { kind: "instance", instance: A.id }); e.runAction("object.toMesh"); await sleep(60); e.selectedPools.clear(); });
r.seven = { loose0: await ev(() => window.__m.rootLoose()) };
await ev(() => { const { selectIn, P, e } = window.__m; selectIn(P(0, 0, 0), P(1, 1, 1)); e.armMoveTo(); });
r.seven.clicked = await clickOn("A");
await page.waitForTimeout(200);
r.seven.sheet = await ev(() => [...document.querySelectorAll("h1,h2,h3,.sheet-title,[role=dialog] *")].map((x) => x.textContent ?? "").find((t) => /搬过去要转种类/.test(t)) ?? null);
const no = page.locator("button", { hasText: "不做" }); if (await no.count()) await no.first().click(); await page.waitForTimeout(120);
r.seven.loose1 = await ev(() => window.__m.rootLoose()); r.seven.hint = await ev(() => window.__m.hint());
// ⑧ 强行对称（第 1 版版末审查第 1 条）：M = x −1..1 的盒子 → 网格体、原点居中、中缝切开、开强行对称（左 / 右 5/5）。
// 左端一张面「移出一层」= 右端那张一起搬上去（M 里 4/4、根上多 2 张、提示行说一起搬了 1 张、一共 2 张）；撤销回来；
// 右端挪一个点（两边不一样）再搬左端那张 = 提示行说找不到另一半、只搬了选中的；普通删除左端一张 = 提示行说对称的另一半一起删了 1 张面。
r.eight = await ev(async () => {
  const { e, P, sleep, hint } = window.__m, S = () => e.scene;
  const box = (x0, y0, z0, x1, y1, z1) => { const s = []; const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(a[0], a[1], z0), P(d[0], d[1], z0)], [P(a[0], a[1], z1), P(d[0], d[1], z1)], [P(a[0], a[1], z0), P(a[0], a[1], z1)]); } return s; };
  e.exitTo(0); e.deselectAll(); e.selectedPools.clear();
  const before = new Set(S().def(S().root).instances.keys());
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(-1, 20, 0, 1, 21, 1) });
  { const k = e.kernel; e.deselectAll(); for (const f of k.faces()) { const rr = k.faceRings3(f.id); if (rr && rr.outer.every((q) => q.y >= 19.99)) e.selection.faces.add(f.id); } for (const ed of k.edges()) if (k.graph.pt(ed.a).y >= 19.99 && k.graph.pt(ed.b).y >= 19.99) e.selection.edges.add(ed.id); }
  e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("M"); e.runAction("object.toMesh"); await sleep(30);
  const M = [...S().def(S().root).instances.values()].find((x) => !before.has(x.id) && S().def(x.def).name === "M");
  const enterM = async () => { e.exitTo(0); e.selectedPools.clear(); e.selectedPools.set(`i${M.id}`, { kind: "instance", instance: M.id }); e.enterSelected(); await sleep(30); };
  await enterM();
  const k = () => S().mesh(M.def).kernel, xs = k().verts().map((q) => k().pt(q).x), dx = -(Math.min(...xs) + Math.max(...xs)) / 2;
  e.commitOp({ op: "meshMove", def: M.def, moves: k().verts().map((q) => ({ v: q, to: { ...k().pt(q), x: k().pt(q).x + dx } })) });
  const cut = k().edges().find((x) => Math.abs(k().pt(k().edgeA[x]).x - k().pt(k().edgeB[x]).x) > 1);
  e.commitOp({ op: "meshLoopCut", def: M.def, edge: cut, t: 0.5 }); e.setMirror("force", 0); await sleep(30);
  const side = (f) => { const rr = k().faceVerts(f); return rr.reduce((a, q) => a + k().pt(q).x, 0) / rr.length; };
  const LR = () => { let L = 0, R = 0; for (const f of k().faces()) side(f) < 0 ? L++ : R++; return `${L}/${R}`; };
  const leftEnd = () => k().faces().find((f) => k().faceVerts(f).every((q) => k().pt(q).x < -0.9));
  const rootFaces = () => S().kernelOf({ def: S().root, group: null }).faces().length;
  const out = { start: LR() };
  // a. 移出一层：两半一起
  let rf0 = rootFaces(); e.deselectAll(); e.selection.faces.add(leftEnd()); e.moveSelectionTo({ kind: "up" }, "brep"); await sleep(60);
  out.upHint = hint(); out.upRootAdded = rootFaces() - rf0; await enterM(); out.upAfter = LR();
  e.undo(); await sleep(40); await enterM(); out.undone = LR(); out.undoneRoot = rootFaces() - rf0;
  // b. 普通删除左端一张
  e.deselectAll(); e.selection.faces.add(leftEnd()); e.deleteSelection(); await sleep(40);
  out.delHint = hint(); out.delAfter = LR();
  e.undo(); await sleep(40); await enterM();
  // c. 两边不一样：文件里写着强行对称、几何却不对称（别的程序写的文件 = 这样打开）。开关那条路会当场对称化，所以关掉挪右端一个点、再直接提交对称属性那条指令（分类表 meta，不触发对称化）
  e.setMirror(null); const v = k().verts().find((q) => k().pt(q).x > 0.9); const p0 = { ...k().pt(v) };
  e.commitOp({ op: "meshMove", def: M.def, moves: [{ v, to: { ...p0, z: p0.z + 0.2 } }] }); e.commitOp({ op: "setMeshMirror", def: M.def, mirror: { mode: "force", axis: 0 } }); await sleep(30);
  rf0 = rootFaces(); e.deselectAll(); e.selection.faces.add(leftEnd()); e.moveSelectionTo({ kind: "up" }, "brep"); await sleep(60);
  // 搬完 M 里是 4/4、右端挪过点的那张没了：强行对称这一步按动过的这边把另一边重做了（几何不对称时的老行为，提示行不说）——已报统筹，没改，这里只记不断言
  out.loneHint = hint(); out.loneRootAdded = rootFaces() - rf0; await enterM(); out.loneAfter = LR(); out.loneRightEndMoved = k().verts().some((q) => k().pt(q).x > 0.9 && Math.abs(k().pt(q).z - p0.z - 0.2) < 1e-6);
  e.setMirror(null);
  return out;
});
await b.close();
const same = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
const checks = [
  ["①「移到…」等着时提示「点要搬进去的物体」", /点要搬进去的物体/.test(r.one.armedHint)],
  ["① 点 A = G 搬进 A：根上散几何没了、A 的世界范围多了 G（x 0..4）、位置不动", r.one.clicked && r.one.loose0 > 0 && r.one.loose1 === 0 && same(r.one.aBox1, { lo: [0, 0, 0], hi: [4, 1, 1] }) && /搬进「A」/.test(r.one.hint)],
  ["① 搬完选中 A", same(r.one.sel, ["instance"])],
  ["① 一步撤销回来", r.one.loose2 === r.one.loose0 && same(r.one.aBox2, r.one.aBox0)],
  ["② B 搬进 A：根上没有 B、A 里有 B（GUID 不变）、世界位置不动", r.two.clicked && !r.two.bAtRoot && r.two.inA.includes(r.two.guid) && same(r.two.bBox1, r.two.bBox0)],
  ["③ 进 A 把 B 移出一层：回到根上、GUID 不变、位置不动、选中它", r.three.depth === 0 && r.three.guid === r.two.guid && same(r.three.bBox, r.two.bBox0) && r.three.sel === 1],
  ["④ 根上移出一层 = 说已经在最外一层", /已经在最外一层/.test(r.four)],
  ["⑤ A 摆了两份：提示说「摆了 2 份，每一份里都多了它」", r.five.clicked && /摆了 2 份，每一份里都多了它/.test(r.five.hint)],
  ["⑥ Esc = 取消，再点 A 也不搬", /取消了/.test(r.six.hint) && r.six.bAtRoot],
  ["⑦ 搬进网格体 = 先问「搬过去要转种类」；点「不做」= 没动", r.seven.clicked && !!r.seven.sheet && r.seven.loose1 === r.seven.loose0],
  ["⑧ 强行对称下移出一层：对称的另一半一起搬上去（M 里 5/5 → 4/4、根上多 2 张），提示行说「一起搬了 1 张面，一共 2 张面」", r.eight.start === "5/5" && r.eight.upAfter === "4/4" && r.eight.upRootAdded === 2 && /对称的另一半一起搬了 1 张面，一共 2 张面/.test(r.eight.upHint)],
  ["⑧ 一步撤销：M 回到 5/5、根上那两张也没了", r.eight.undone === "5/5" && r.eight.undoneRoot === 0],
  ["⑧ 普通删除左端一张：行为不变（5/5 → 4/4），提示行说「对称的另一半一起删了 1 张面」", r.eight.delAfter === "4/4" && /删除：强行对称，对称的另一半一起删了 1 张面/.test(r.eight.delHint)],
  ["⑧ 两边不一样时搬左端那张：只搬它（根上多 1 张），提示行说找不到另一半、只搬了选中的", r.eight.loneRootAdded === 1 && /1 张面找不到对称的另一半（这一刻两边不一样），只搬了选中的这 1 张面/.test(r.eight.loneHint)],
  ["没有脚本错误", errs.length === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
if (checks.some(([, ok]) => !ok)) { console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log(errs.join("\n")); }
console.log(`${checks.filter(([, ok]) => ok).length}/${checks.length}`);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

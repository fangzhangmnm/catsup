// 剪贴板（editor/transfer.ts + clipboard.ts + op paste；created 2026-10-28 by Claude Fable 5.1；设计稿 20261028-object-layer-and-clipboard-design §3；
// user 10-28 夜「复制黏贴我们没做」「paste落点：原位落下」「允许cast但是会弹窗。然后变成选择」）。
// 最外层硬表面：① 盒子做成组件 A、挪到 (3,0,0)；进 A 选顶面 Ctrl+X = A 少一张面；出来 Ctrl+V = 最外层多一张面、世界坐标和原来那张一样（原位 = 按进来的链换算）；一步撤销；贴出来的在选区里
// ② 拷贝组件 A（最外层选它 Ctrl+C）再 Ctrl+V = 两份同定义、同位置；撤销 = 一份
// ③ 剪切 A、进另一个组件 B、Ctrl+V = A 成了 B 的子物件，世界位置不变（层级移动 = 剪切 + 粘贴）
// ④ 环：剪切 A 的一份、进 A 自己、Ctrl+V = 拒绝、说清
// ⑤ 网格体 → 硬表面：网格体组件 M 里剪两张面、出来到最外层 Ctrl+V = 弹「要转种类」；点「不转」= 什么都没贴；再贴、点「转」= 最外层多两张硬表面面
// ⑥ 网格体 → 网格体：M 里剪两张面、进另一个网格体组件 N（挪过的）、Ctrl+V = N 多两张面、世界坐标不变
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-clipboard.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const key = (k, mods = {}) => page.evaluate(([k, m]) => { window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), bubbles: true, cancelable: true, ...m })); }, [k, mods]);
const r = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((rr) => setTimeout(rr, ms));
  const key = (k, m = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), bubbles: true, cancelable: true, ...m }));
  const box = (x0, y0) => { const B = [[x0, y0], [x0 + 1, y0], [x0 + 1, y0 + 1], [x0, y0 + 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } return segs; };
  const S = () => e.scene, root = () => S().def(S().root), insts = () => [...root().instances.values()];
  const enter = async (inst) => { e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20); };
  const W = (X, p) => ({ x: X[0] * p.x + X[1] * p.y + X[2] * p.z + X[3], y: X[4] * p.x + X[5] * p.y + X[6] * p.z + X[7], z: X[8] * p.x + X[9] * p.y + X[10] * p.z + X[11] });
  const q = (v) => +v.toFixed(6);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  // 组件 A（挪到 3,0,0）、组件 B（挪到 0,4,0）
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0) }); e.selectAll(); e.makeComponent("A"); await sleep(10);
  const A = insts()[0]; e.commitOp({ op: "transformInstance", def: S().root, instance: A.id, xform: [1, 0, 0, 3, 0, 1, 0, 0, 0, 0, 1, 0] });
  e.deselectAll(); e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(10, 10) }); e.selectAll(); e.selectedPools.clear(); e.makeComponent("B"); await sleep(10);
  const B = insts().find((i) => i.id !== A.id); e.commitOp({ op: "transformInstance", def: S().root, instance: B.id, xform: [1, 0, 0, 0, 0, 1, 0, 4, 0, 0, 1, 0] });
  const rootFaces = () => S().kernelOf({ def: S().root, group: null }).faces().length;
  // ①
  await enter(insts().find((i) => i.id === A.id));
  const kA = () => S().kernelOf(e.activePool()), topA = kA().faces().map((f) => f.id).find((f) => kA().face(f).outer.edges.every((d) => { const ed = kA().graph.edge(d.edge); return Math.abs(kA().graph.pt(ed.a).z - 1) < 1e-9; }));
  const Ax = insts().find((i) => i.id === A.id).xform;   // transformInstance 是叠上去的（组件原点在底面中心 → 实例本来就带 (0.5,0.5,0)）
  const topW = kA().face(topA).outer.edges.map((d) => { const ed = kA().graph.edge(d.edge); return W(Ax, kA().graph.pt(d.forward ? ed.a : ed.b)); }).map((p) => `${q(p.x)},${q(p.y)},${q(p.z)}`).sort().join(";");
  const fA0 = kA().faces().length, r0 = rootFaces();
  e.deselectAll(); e.selection.faces.add(topA); e.afterSelectForProbe?.();
  key("x", { ctrlKey: true }); await sleep(30);
  out.one = { cutA: fA0 - kA().faces().length, hint1: hud.status() };
  e.exitTo(0); await sleep(20);
  const st = e.history.steps();
  key("v", { ctrlKey: true }); await sleep(40);
  const rk = S().kernelOf({ def: S().root, group: null }), newF = rk.faces().map((f) => f.id).slice(-1)[0];
  const newW = rk.face(newF).outer.edges.map((d) => { const ed = rk.graph.edge(d.edge); return rk.graph.pt(d.forward ? ed.a : ed.b); }).map((p) => `${q(p.x)},${q(p.y)},${q(p.z)}`).sort().join(";");
  out.one.pasted = rootFaces() - r0; out.one.samePlace = newW === topW; out.one.steps = e.history.steps() - st; out.one.sel = e.selection.faces.size; out.one.hint2 = hud.status();
  e.undo(); await sleep(20); out.one.undone = rootFaces() === r0;
  // ② 拷贝物件
  e.deselectAll(); e.selectedPools.set(`i${A.id}`, { kind: "instance", instance: A.id });
  key("c", { ctrlKey: true }); await sleep(20); key("v", { ctrlKey: true }); await sleep(40);
  const copies = insts().filter((i) => i.def === A.def);
  out.two = { n: copies.length, samePlace: copies.every((i) => i.xform.join() === copies[0].xform.join()), selIsNew: [...e.selectedPools.values()].some((p) => p.kind === "instance" && p.instance !== A.id) };
  e.undo(); await sleep(20); out.two.undone = insts().filter((i) => i.def === A.def).length === 1;
  // ③ 层级移动：剪 A → 进 B → 贴
  e.deselectAll(); e.selectedPools.set(`i${A.id}`, { kind: "instance", instance: A.id });
  const Aw = W(A.xform, P(0.5, 0.5, 1));
  key("x", { ctrlKey: true }); await sleep(30);
  out.three = { rootAfterCut: insts().length };
  await enter(insts().find((i) => i.id === B.id));
  key("v", { ctrlKey: true }); await sleep(40);
  const Bdef = S().def(B.def), child = [...Bdef.instances.values()].find((i) => i.def === A.def);
  out.three.inB = !!child; out.three.rootNow = insts().length;
  if (child) { const Xb = B.xform, Xc = child.xform, pw = W(Xb, W(Xc, P(0.5, 0.5, 1))); out.three.samePlace = Math.hypot(pw.x - Aw.x, pw.y - Aw.y, pw.z - Aw.z) < 1e-9; }
  e.undo(); await sleep(20); e.exitTo(0); e.undo(); await sleep(20);
  out.three.undone = insts().length === 2 && [...S().def(B.def).instances.values()].length === 0;
  // ④ 环
  e.deselectAll(); e.selectedPools.set(`i${A.id}`, { kind: "instance", instance: A.id });
  key("c", { ctrlKey: true }); await sleep(20);
  await enter(insts().find((i) => i.id === A.id));
  const nA = [...S().def(A.def).instances.values()].length, st4 = e.history.steps();
  key("v", { ctrlKey: true }); await sleep(40);
  out.four = { refused: [...S().def(A.def).instances.values()].length === nA && e.history.steps() === st4, hint: hud.status() };
  e.exitTo(0); await sleep(20);
  // ⑤ 网格体 → 硬表面：M（网格体组件）
  e.deselectAll(); e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(20, 20) }); e.selectAll(); e.selectedPools.clear(); e.makeComponent("M"); e.runAction("object.toMesh"); await sleep(20);
  const M = insts().find((i) => S().kindOf(i.def) === "mesh");
  await enter(M);
  const mk = () => S().mesh(M.def).kernel, two = mk().faces().slice(0, 2);
  e.deselectAll(); for (const f of two) e.selection.faces.add(f); e.afterSelectForProbe?.();
  key("x", { ctrlKey: true }); await sleep(30);
  out.five = { cut: mk().faces().length === 4 };
  e.exitTo(0); await sleep(20);
  const r5 = rootFaces();
  key("v", { ctrlKey: true }); await sleep(150);
  const sheetBtns = () => [...document.querySelectorAll(".sheet button, [class*=sheet] button")].filter((x) => x.offsetParent).map((x) => x.textContent.trim());
  out.five.asked = sheetBtns();
  [...document.querySelectorAll(".sheet button, [class*=sheet] button")].find((x) => x.offsetParent && /不做|取消/.test(x.textContent ?? ""))?.click(); await sleep(100);   // 宿主的确认 sheet：取消钮叫「不做」
  out.five.declined = rootFaces() === r5; out.five.hintNo = hud.status();
  key("v", { ctrlKey: true }); await sleep(150);
  [...document.querySelectorAll(".sheet button, [class*=sheet] button")].find((x) => x.offsetParent && /转成硬表面体再贴/.test(x.textContent ?? ""))?.click(); await sleep(150);
  out.five.pasted = rootFaces() - r5; out.five.check = 0;
  // ⑥ 网格体 → 网格体：N（挪到 0,0,5）
  e.deselectAll(); e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(30, 30) }); e.selectAll(); e.selectedPools.clear(); e.makeComponent("N"); e.runAction("object.toMesh"); await sleep(20);
  const N = insts().find((i) => S().kindOf(i.def) === "mesh" && i.id !== M.id); e.commitOp({ op: "transformInstance", def: S().root, instance: N.id, xform: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 5] });
  await enter(insts().find((i) => i.id === M.id));
  const mk2 = () => S().mesh(M.def).kernel, two2 = mk2().faces().slice(0, 2), mw = two2.flatMap((f) => mk2().faceVerts(f).map((v) => { const p = W(M.xform, mk2().pt(v)); return `${q(p.x)},${q(p.y)},${q(p.z)}`; })).sort().join(";");
  e.deselectAll(); for (const f of two2) e.selection.faces.add(f); e.afterSelectForProbe?.();
  key("x", { ctrlKey: true }); await sleep(30);
  e.exitTo(0); await sleep(20);
  await enter(insts().find((i) => i.id === N.id));
  const nk = () => S().mesh(N.def).kernel, nf0 = nk().faces().length, Nx = insts().find((i) => i.id === N.id).xform;
  key("v", { ctrlKey: true }); await sleep(40);
  const added = nk().faces().slice(nf0), nw = added.flatMap((f) => nk().faceVerts(f).map((v) => { const p = W(Nx, nk().pt(v)); return `${q(p.x)},${q(p.y)},${q(p.z)}`; })).sort().join(";");
  out.six = { added: added.length, samePlace: nw === mw, check: nk().check().join(";"), sel: e.selection.faces.size };
  return out;
});
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.one.cutA === 1 && r.one.pasted === 1 && r.one.samePlace && r.one.steps === 1 && r.one.sel === 1 && r.one.undone
  && r.two.n === 2 && r.two.samePlace && r.two.selIsNew && r.two.undone
  && r.three.rootAfterCut === 1 && r.three.inB && r.three.rootNow === 1 && r.three.samePlace && r.three.undone
  && r.four.refused && /自己/.test(r.four.hint)
  && r.five.cut && r.five.asked.some((t) => /转成硬表面体再贴/.test(t)) && r.five.asked.some((t) => /不做|取消/.test(t)) && r.five.declined && /没贴/.test(r.five.hintNo) && r.five.pasted === 2 && r.five.check === 0
  && r.six.added === 2 && r.six.samePlace && !r.six.check && r.six.sel === 2 && errs.length === 0;
console.log(ok ? "probe-clipboard OK" : "probe-clipboard FAIL");
process.exit(ok ? 0 : 1);

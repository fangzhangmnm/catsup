// 新建子物体（第 1 版施工单第五节第 5 条；2026-11-13 Claude Opus 5.5）。根 = 硬表面体，地上一个 1 m 的盒子（散几何，不是组件）。
// ① 右键空白 → 「新建子物体 ›」三种 → 空物体：进去了、工作台 = 摆放、落在这一层的原点、根上的面一张不少、提示行说了
// ② 撤销一步 = 没建（回到根、根上没有子物体）
// ③ 右键点在盒子顶面上 → 「新建子物体 ›」也在 → 网格体：落在点的那一点（≈ 顶面那一点）、工作台 = 自由建模
// ④ 回根，物体窗口（这一层）物体页「新建子物体 ›」→ 硬表面体：落在原点、工作台 = 硬表面建模；选中子物体时的物体窗口没有这一项
// ⑤ 层级窗口：子物体那一行的菜单「新建子物体 ›」→ 空物体 = 建在那个物体里面（深两层）
// ⑥ 锁着：右键新建 = 什么都不建，提示行说锁着
// ⑦⑧ 创建父物体（第五节第 7 条）：选中的那一份 / 这一层自己（人留在里面）；炸开新父亲 = 回去
// ⑨ 最外层自己「创建父物体」= 给根包一层：新的最外层是空物体、人留在原来那一层里、世界里的点不动；回到最外层「去掉这一层」= 回去（身份、点都回来）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-new-child.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(6000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms)), S = () => e.scene;
  const box = (x0, y0, z0, x1, y1, z1) => { const s = []; const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(a[0], a[1], z0), P(d[0], d[1], z0)], [P(a[0], a[1], z1), P(d[0], d[1], z1)], [P(a[0], a[1], z0), P(a[0], a[1], z1)]); } return s; };
  const click = (el) => el?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
  const menu = () => document.querySelector(".popup-menu:not(.choice-layer)");
  const choices = () => [...document.querySelectorAll(".popup-menu.choice-layer [data-choice-id]")].map((x) => x.getAttribute("data-choice-id"));
  const pickChoice = async (id) => { click(document.querySelector(`.popup-menu.choice-layer [data-choice-id="${id}"]`)); await sleep(100); };
  const openRow = async (id) => { click(menu()?.querySelector(`[data-menu-id="${id}"]`)); await sleep(60); return choices(); };
  const thrown = []; const onErr = (ev) => thrown.push(String(ev.message ?? ev.reason)); window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
  const here = () => { const ctx = e.context, d = S().defOfContext(ctx); return { depth: ctx.chain.length, kind: S().kindOf(d), mode: e.mode.id }; };
  const lastInst = () => { const ctx = e.context; if (!ctx.chain.length) return null; let def = S().root, inst = null; for (const id of ctx.chain) { inst = S().instance(def, id); def = inst.def; } return { o: [inst.xform[3], inst.xform[7], inst.xform[11]].map((v) => +v.toFixed(3)) }; };
  const rootKids = () => S().def(S().root).instances.size, rootFaces = () => S().kernelOf({ def: S().root, group: null }).faces().length;
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0, 0, 1, 1, 1) }); e.deselectAll(); e.setTool("select");
  e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(100);
  /** 画布上一个真空白的点：最上面是画布（不是左上角的按钮这些），编辑器在那儿也拾不到东西（右键 = 空白处的菜单）。 */
  const blankPoint = () => { const b = document.getElementById("board").getBoundingClientRect(); for (let fy = 0.2; fy < 0.85; fy += 0.05) for (let fx = 0.15; fx < 0.9; fx += 0.05) { const x = b.width * fx, y = b.height * fy, el = document.elementFromPoint(b.left + x, b.top + y), h = e.pickAt(x, y); if (el && (el.id === "board" || el.closest?.("#board")) && h.face === undefined && h.edge === undefined && h.vertex === undefined) return { x, y }; } return null; };
  window.__m = { C, e, P, sleep, S, click, menu, choices, pickChoice, openRow, thrown, here, lastInst, rootKids, rootFaces, blankPoint, hint: () => document.getElementById("hint")?.textContent ?? "" };
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const bx = await page.locator("#board").boundingBox();
const rightClick = async (x, y) => { await page.mouse.move(bx.x + x, bx.y + y, { steps: 2 }); await page.waitForTimeout(40); await page.mouse.click(bx.x + x, bx.y + y, { button: "right" }); await page.waitForTimeout(150); };
const r = {};
// ① 右键空白 → 空物体
r.faces0 = await ev(() => window.__m.rootFaces());
const blank = await ev(() => window.__m.blankPoint());
if (!blank) { console.log("probe-new-child FAIL（找不到空白点）"); await b.close(); process.exit(1); }
await rightClick(blank.x, blank.y);
r.one = await ev(async () => {
  const { openRow, pickChoice, here, lastInst, rootFaces, hint } = window.__m, kinds = await openRow("submenu:新建子物体");
  await pickChoice("newChild:empty");
  return { kinds, ...here(), at: lastInst(), faces: rootFaces(), hint: hint() };
});
// ② 撤销一步
r.two = await ev(async () => { const { e, here, rootKids, sleep } = window.__m; e.undo(); await sleep(60); return { ...here(), kids: rootKids() }; });
// ③ 右键顶面那一点 → 网格体
const top = await ev(() => { const { e, P } = window.__m; return e.cam.angularPx(P(0.5, 0.5, 1), e.vp()); });
await rightClick(top.x, top.y);
r.three = await ev(async () => {
  const { openRow, pickChoice, here, lastInst, rootFaces, menu } = window.__m, rows = [...(menu()?.querySelectorAll("[data-menu-id]") ?? [])].map((x) => x.getAttribute("data-menu-id"));
  const kinds = await openRow("submenu:新建子物体"); await pickChoice("newChild:mesh");
  return { rows, kinds, ...here(), at: lastInst(), faces: rootFaces() };
});
// ④ 回根，物体窗口（这一层）→ 硬表面体；再看选中子物体时的那一份
r.four = await ev(async () => {
  const { e, click, menu, openRow, pickChoice, here, lastInst, sleep } = window.__m;
  e.exitTo(0); await sleep(40);
  click(document.querySelector(".gizmo-object")); await sleep(100);
  const kinds = await openRow("newChild"); await pickChoice("newChild:brep");
  const out = { kinds, ...here(), at: lastInst(), menuGone: !menu() };
  e.exitTo(0); await sleep(40);
  const kid = [...e.scene.def(e.scene.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${kid.id}`, { kind: "instance", instance: kid.id }); e.draw();
  window.__catsup.hud.pick("objectWindow"); await sleep(100);
  out.childWindowHasIt = !!menu()?.querySelector('[data-menu-id="newChild"]');
  click(document.querySelector(".gizmo-object")); await sleep(60);   // 收起（物件钮是开关；不按 Esc）
  if (menu()) { document.body.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })); await sleep(40); }
  out.kids = e.scene.def(e.scene.root).instances.size;
  return out;
});
// ⑤ 层级窗口：子物体那一行 → 空物体（建在它里面）
await page.click(".gizmo-hier"); await page.waitForTimeout(150);
r.five = await ev(async () => {
  const { e, openRow, pickChoice, here, sleep } = window.__m, W = '.float-win[data-win="hierarchy"]';
  e.exitTo(0); await sleep(40);
  const row = [...document.querySelectorAll(`${W} .tree-row`)].find((x) => x.dataset.key);
  if (!row) return { noRow: true };
  row.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); await sleep(100);
  const kinds = await openRow("newChild"); await pickChoice("newChild:empty");
  return { kinds, ...here(), parentKey: row.dataset.key, chain: e.context.chain.map((i) => `i${i}`).join("/") };
});
// ⑥ 锁着：右键不出菜单（演示锁的规矩）；就算直接调新建的口也拒、提示行说锁着
await ev(async () => { const { e, C, sleep } = window.__m; e.exitTo(0); await sleep(30); await C.session.setLocked(true); await sleep(100); e.exitTo(0); await sleep(30); });
r.six0 = await ev(() => ({ kids: window.__m.rootKids(), depth: window.__m.here().depth }));
const blank2 = await ev(() => window.__m.blankPoint());
if (blank2) await rightClick(blank2.x, blank2.y);
r.six = await ev(async () => {
  const { e, openRow, pickChoice, here, rootKids, hint, C, sleep } = window.__m, kinds = await openRow("submenu:新建子物体");
  if (kinds.length) await pickChoice("newChild:brep");
  const direct = e.newChild("brep", "zz99"); await sleep(30);
  const out = { kinds, direct, ...here(), kids: rootKids(), hint: hint() };
  await C.session.setLocked(false); await sleep(60);
  return out;
});
// ⑦ 创建父物体（第五节第 7 条）：选中根上的一个子物体 → 物体窗口（那一份）「创建父物体」→ 新父亲是空物体、它整个在下面、世界位置不动、选中新父亲；炸开新父亲 = 回去（反过来的动作）
r.seven = await ev(async () => {
  const { e, S, click, menu, sleep } = window.__m, pts = () => S().pointsOfDef(S().root).map((p) => [p.x, p.y, p.z].map((v) => v.toFixed(6)).join(",")).sort().join(";");
  e.exitTo(0); await sleep(30);
  const kid = [...S().def(S().root).instances.values()][0], kidGuid = kid.guid, n0 = S().def(S().root).instances.size, before = pts();
  e.selectedPools.clear(); e.selectedPools.set(`i${kid.id}`, { kind: "instance", instance: kid.id }); e.draw();
  window.__catsup.hud.pick("objectWindow"); await sleep(100);
  const row = menu()?.querySelector('[data-menu-id="addParent"]'), rowOff = !!row?.disabled;
  click(row); await sleep(100);
  const top = [...S().def(S().root).instances.values()], par = top.find((i) => [...S().def(i.def).instances.values()].some((k) => k.guid === kidGuid));
  const out = { rowFound: !!row, rowOff, n0, n1: top.length, parKind: par ? S().kindOf(par.def) : null, kidsInPar: par ? S().def(par.def).instances.size : 0, still: pts() === before, selected: par ? e.selectedPools.has(`i${par.id}`) : false };
  if (menu()) { click(document.querySelector(".gizmo-object")); await sleep(40); }
  e.runAction("explode"); await sleep(60);   // 动作 id（放置表）= explode，指令 = object.explode
  out.backGuid = [...S().def(S().root).instances.values()].some((i) => i.guid === kidGuid); out.backPts = pts() === before; out.backN = S().def(S().root).instances.size; out.backHint = window.__m.hint();
  out.back = out.backGuid && out.backPts;
  return out;
});
// ⑧ 在一个子物体里面（这一层自己）创建父物体：人留在它里面（深一层）；⑨ 最外层：给根包一层，再去掉这一层
r.eight = await ev(async () => {
  const { e, S, click, menu, sleep, here } = window.__m;
  e.exitTo(0); await sleep(30);
  const kid = [...S().def(S().root).instances.values()].find((i) => S().kindOf(i.def) !== "empty") ?? [...S().def(S().root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${kid.id}`, { kind: "instance", instance: kid.id }); e.enterSelected(); await sleep(40);
  const d0 = here().depth, def0 = S().defOfContext(e.context);
  if (menu()) { click(document.querySelector(".gizmo-object")); await sleep(40); }
  click(document.querySelector(".gizmo-object")); await sleep(100);
  click(menu()?.querySelector('[data-menu-id="addParent"]')); await sleep(100);
  const out = { d0, d1: here().depth, sameDef: S().defOfContext(e.context) === def0, upKind: S().kindOf(S().def(S().root).instances.get(e.context.chain[0])?.def ?? -1) };
  if (menu()) { click(document.querySelector(".gizmo-object")); await sleep(40); }
  e.exitTo(0); await sleep(30); e.selectedPools.clear(); e.draw();
  click(document.querySelector(".gizmo-object")); await sleep(100);
  const pts = () => S().pointsOfDef(S().root).map((p) => [p.x, p.y, p.z].map((v) => v.toFixed(6)).join(",")).sort().join(";");
  const root0 = S().def(S().root).guid, pts0 = pts(), rootRow = menu()?.querySelector('[data-menu-id="addParent"]');
  out.rootOn = !!rootRow && !rootRow.disabled;
  click(rootRow); await sleep(120);
  out.wrapped = { depth: here().depth, rootKind: S().kindOf(S().root), newRoot: S().def(S().root).guid !== root0, kidIsOld: S().def([...S().def(S().root).instances.values()][0]?.def ?? -1)?.guid === root0, still: pts() === pts0 };
  if (menu()) { click(document.querySelector(".gizmo-object")); await sleep(40); }
  e.exitTo(0); await sleep(30); e.selectedPools.clear(); e.draw();
  click(document.querySelector(".gizmo-object")); await sleep(100);
  const un = menu()?.querySelector('[data-menu-id="unwrapRoot"]');
  out.unwrapOn = !!un && !un.disabled;
  click(un); await sleep(120);
  out.unwrapped = { depth: here().depth, back: S().def(S().root).guid === root0, still: pts() === pts0 };
  if (menu()) { click(document.querySelector(".gizmo-object")); await sleep(40); }
  // 撤销 / 重做（第 1 版版末审查第 2 条）：一下一下撤回去再重做回来；每一下人所在的那一层都指着还在的那一份、点不动
  const ctxOk = () => { let def = S().root; for (const id of e.context.chain) { const i = S().def(def).instances.get(id); if (!i) return false; def = i.def; } return S().defs.has(S().defOfContext(e.context)); };
  const rootIs = () => (S().def(S().root).guid === root0 ? "旧根" : S().kindOf(S().root) === "empty" ? "外面那层" : "别的");
  out.undoRedo = [];
  for (const step of ["undo", "undo", "redo", "redo"]) { e[step](); await sleep(60); out.undoRedo.push({ step, ok: ctxOk(), depth: here().depth, root: rootIs(), still: pts() === pts0 }); }
  return out;
});
r.thrown = await ev(() => window.__m.thrown);
const near = (a, b2, tol = 0.03) => !!a && a.every((v, i) => Math.abs(v - b2[i]) <= tol);
const ALL = "newChild:brep,newChild:mesh,newChild:empty";
const checks = [
  ["① 右键空白有「新建子物体 ›」、三种都在", r.one.kinds.join(",") === ALL],
  ["① 建了空物体、进去了、工作台 = 摆放", r.one.depth === 1 && r.one.kind === "empty" && r.one.mode === "object"],
  ["① 落在这一层的原点", near(r.one.at?.o, [0, 0, 0], 1e-6)],
  ["① 根上的面一张不少、提示行说了", r.one.faces === r.faces0 && /新建了.*进到它里面/.test(r.one.hint)],
  ["② 撤销一步 = 没建", r.two.depth === 0 && r.two.kids === 0],
  ["③ 右键点在面上也有「新建子物体 ›」", r.three.rows.includes("submenu:新建子物体") && r.three.kinds.join(",") === ALL],
  ["③ 建了网格体、工作台 = 自由建模", r.three.depth === 1 && r.three.kind === "mesh" && r.three.mode === "freeform"],
  ["③ 落在点的那一点（顶面中间）", near(r.three.at?.o, [0.5, 0.5, 1])],
  ["③ 根上的面一张不少", r.three.faces === r.faces0],
  ["④ 物体窗口（这一层）有「新建子物体 ›」→ 硬表面体、落在原点、窗口收了", r.four.kinds.join(",") === ALL && r.four.depth === 1 && r.four.kind === "brep" && r.four.mode === "geometry" && near(r.four.at?.o, [0, 0, 0], 1e-6) && r.four.menuGone],
  ["④ 选中子物体时的物体窗口没有这一项", r.four.childWindowHasIt === false],
  ["⑤ 层级窗口子物体那一行 → 建在它里面（深两层、空物体）", !r.five.noRow && r.five.kinds?.join(",") === ALL && r.five.depth === 2 && r.five.kind === "empty" && r.five.chain.startsWith(r.five.parentKey + "/")],
  ["⑥ 锁着：右键里没有新建、直接调也拒、什么都不建、提示行说锁着", r.six0.depth === 0 && r.six.kinds.length === 0 && r.six.direct === false && r.six.kids === r.six0.kids && r.six.depth === 0 && /锁/.test(r.six.hint)],
  ["⑦ 物体窗口（选中的那一份）有「创建父物体」、能点", r.seven.rowFound && !r.seven.rowOff],
  ["⑦ 新父亲是空物体、它整个在下面、根上份数不变、世界位置不动、选中新父亲", r.seven.n1 === r.seven.n0 && r.seven.parKind === "empty" && r.seven.kidsInPar === 1 && r.seven.still && r.seven.selected],
  ["⑦ 炸开新父亲 = 回去（世界位置照旧、根上份数照旧；孩子那一份的身份炸开时现铸 = 记在施工单顾虑里，不在这里验）", r.seven.backPts && r.seven.backN === r.seven.n0],
  ["⑧ 在这一层自己创建父物体：人留在它里面（深一层）、上一层是空物体", r.eight.d0 === 1 && r.eight.d1 === 2 && r.eight.sameDef && r.eight.upKind === "empty"],
  ["⑨ 最外层「创建父物体」= 给根包一层：新的最外层是空物体、原来的最外层在它下面、人留在原来那一层（深一层）、点不动", r.eight.rootOn && r.eight.wrapped.depth === 1 && r.eight.wrapped.rootKind === "empty" && r.eight.wrapped.newRoot && r.eight.wrapped.kidIsOld && r.eight.wrapped.still],
  ["⑨ 回到最外层「去掉这一层」= 回去（身份、点都回来、人在最外层）", r.eight.unwrapOn && r.eight.unwrapped.back && r.eight.unwrapped.still && r.eight.unwrapped.depth === 0],
  ["⑨ 撤销 / 重做：撤去掉这一层 = 又包着、再撤 = 没包过；重做两下回来；每一下人所在的那一层都指着还在的那一份、点不动", r.eight.undoRedo.map((x) => x.root).join(",") === "外面那层,旧根,外面那层,旧根" && r.eight.undoRedo.every((x) => x.ok && x.still)],
  ["没有报错", r.thrown.length === 0 && errs.length === 0],
];
console.log(JSON.stringify(r, null, 1));
let bad = 0; for (const [n, ok] of checks) { console.log(`${ok ? "✓" : "✗"} ${n}`); if (!ok) bad++; }
console.log(bad ? `probe-new-child FAIL（${bad} / ${checks.length}）` : `probe-new-child OK（${checks.length} / ${checks.length}）`);
await b.close();
process.exit(bad ? 1 : 0);

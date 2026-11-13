// 自由建模接上轴键（锁的一轮第二步，2026-11-13 Claude Opus 5.5；设计稿 ai-docs/20261113-axis-constraint-module-design.md，施工单 ai-docs/20261113-lock-round-workorder.md）。
// 网格体楔形（一张斜面：法线 ∝ (1, 0, 2)，不和任何轴平行）里，全部走键盘起手（G / R）+ 真键盘事件：
// ① G 再 X = 沿 X（一根红线、提示「沿 X」）；再按 X = 取消（不限制、提示说取消了）；Esc
// ② G 再 Shift+Z = 只在 XY 面里（红绿两根线），落定后每个点 z 不变；落定以后不再限制
// ③ 光标压在斜面上 G 再 N = 沿斜面法线（品红 dir 一根），落定后每个点的位移都平行于法线
// ④ G、Shift+N（斜面）、再 X = 在斜面里、沿 X 投进去的方向（品红 + 面里另一根绿），落定位移平行于那个方向
// ⑤ R 再 T（光标压在一条斜边上）= 绕这条边转：每个点的位移垂直于边
// ⑥ G 再 N、光标在空处 = 不变（不限制）、提示「N：把光标放到一张面上再按」
// ⑦ 动作外：选斜面和后墙之间那条边按 X = 光标处弹「删除 / 溶解」，点溶解 = 两张面并成一张；选一张面按 X = 只有「删除」；按 Y = 什么都不发生
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-axis-freeform.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), hint = () => document.getElementById("hint")?.textContent ?? "";
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const kd = (k, o = {}) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: o.code ?? (k.length === 1 ? "Key" + k.toUpperCase() : k), ctrlKey: !!o.ctrl, shiftKey: !!o.shift, bubbles: true, cancelable: true }));
  const hover = async (p) => { const s = px(p); fire("pointermove", s.x, s.y, 0); await sleep(25); return s; };
  const S = () => e.scene, root = () => S().def(S().root);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  // 楔形：底 2×1，x = 0 那边高 1，斜面从 (0, *, 1) 落到 (2, *, 0)
  const A = P(0, 0, 0), B = P(2, 0, 0), C = P(2, 1, 0), D = P(0, 1, 0), E = P(0, 0, 1), F = P(0, 1, 1);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[A, B], [B, C], [C, D], [D, A], [A, E], [D, F], [E, F], [E, B], [F, C]] });
  e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("楔"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...root().instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.8; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  out.mesh = { kind: e.activeKind(), faces: m().faceCount(), mode: e.modeId };
  const n0 = (() => { const l = Math.hypot(1, 0, 2); return P(1 / l, 0, 2 / l); })();
  const pts = () => new Map(m().verts().map((v) => [v, { ...m().pt(v) }]));
  const dots = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z, sub = (a, b) => P(a.x - b.x, a.y - b.y, a.z - b.z), len = (a) => Math.hypot(a.x, a.y, a.z);
  const crossLen = (a, b) => Math.hypot(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const moved = (before) => { const now = pts(); return [...before].map(([v, p]) => sub(now.get(v), p)); };
  const guide = () => { const g = e.lockGuide(); return g ? g.map((l) => l.color).join(",") : ""; };
  const con = () => { const k = e.axisConstraintNow(); return { kind: k.kind, dir: k.dir ? [+k.dir.x.toFixed(3), +k.dir.y.toFixed(3), +k.dir.z.toFixed(3)] : null, normal: k.normal ? [+k.normal.x.toFixed(3), +k.normal.y.toFixed(3), +k.normal.z.toFixed(3)] : null }; };
  const commitAt = async (s, dx, dy) => { for (let i = 1; i <= 5; i++) { fire("pointermove", s.x + dx * i / 5, s.y + dy * i / 5, 0); await sleep(15); } fire("pointerdown", s.x + dx, s.y + dy, 1); await sleep(10); fire("pointerup", s.x + dx, s.y + dy, 0); await sleep(40); };
  const undo = async () => { kd("z", { ctrl: true }); await sleep(40); };
  const selAll = async () => { e.setTool("select"); e.selectAll(); await sleep(20); };
  const slopeMid = P(1, 0.5, 0.5);
  // ① G 再 X、再 X
  await selAll(); let s = await hover(slopeMid); kd("g"); await sleep(20);
  kd("x"); await sleep(20); out.one = { active: e.isGestureActive(), con: con(), guide: guide(), hint: hint() };
  kd("x"); await sleep(20); out.oneOff = { con: con().kind, guide: guide(), hint: hint() };
  kd("Escape", { code: "Escape" }); await sleep(30); out.oneEsc = { active: e.isGestureActive() };
  // ② G 再 Shift+Z → 落定
  await selAll(); s = await hover(slopeMid); let before = pts(); kd("g"); await sleep(20);
  kd("z", { shift: true }); await sleep(20); out.two = { con: con(), guide: guide(), hint: hint() };
  await commitAt(s, 40, -30);
  { const d = moved(before); out.twoDone = { movedAny: d.some((x) => len(x) > 1e-3), zKept: d.every((x) => Math.abs(x.z) < 1e-9), after: con().kind, guideAfter: guide() }; }
  await undo();
  // ③ 斜面上 G 再 N → 落定
  await selAll(); s = await hover(slopeMid); before = pts(); kd("g"); await sleep(20);
  kd("n"); await sleep(20); out.three = { con: con(), guide: guide(), hint: hint() };
  await commitAt(s, 10, -50);
  { const d = moved(before), big = d.filter((x) => len(x) > 1e-3); out.threeDone = { movedAny: big.length > 0, alongNormal: big.length > 0 && big.every((x) => crossLen(x, n0) / len(x) < 1e-6), after: con().kind }; }
  await undo();
  // ④ G、Shift+N、X → 落定
  await selAll(); s = await hover(slopeMid); before = pts(); kd("g"); await sleep(20);
  kd("n", { shift: true }); await sleep(20); out.fourPlane = { con: con(), guide: guide() };
  kd("x"); await sleep(20); out.four = { con: con(), guide: guide(), hint: hint() };
  const want4 = (() => { const d = sub(P(1, 0, 0), P(n0.x * n0.x, 0, n0.x * n0.z)), l = len(d); return P(d.x / l, d.y / l, d.z / l); })();
  await commitAt(s, 50, 20);
  { const d = moved(before), big = d.filter((x) => len(x) > 1e-3); out.fourDone = { movedAny: big.length > 0, alongDir: big.length > 0 && big.every((x) => crossLen(x, want4) / len(x) < 1e-6) }; }
  await undo();
  // ⑤ R 再 T（光标压在 y = 0 或 y = 1 那条斜边上，哪条拾得到用哪条）
  await selAll();
  let edgeHit = null;
  for (const mid of [P(1, 0, 0.5), P(1, 1, 0.5)]) { const q = px(mid), h = e.pickAt(q.x, q.y, { kinds: { edges: true } }); if (h.edge !== undefined) { edgeHit = mid; break; } }
  out.fiveEdge = edgeHit;
  if (edgeHit) {
    s = await hover(edgeHit); before = pts(); kd("r"); await sleep(20);
    kd("t"); await sleep(20); out.five = { con: con(), guide: guide(), hint: hint() };
    const ed = P(2, 0, -1), edl = len(ed), edu = P(ed.x / edl, 0, ed.z / edl);
    await commitAt(s, 60, 40);
    { const d = moved(before), big = d.filter((x) => len(x) > 1e-3); out.fiveDone = { movedAny: big.length > 0, perpToEdge: big.length > 0 && big.every((x) => Math.abs(dots(x, edu)) / len(x) < 1e-6), tool: e.tool }; }
    await undo();
  }
  // ⑥ 空处 G 再 N
  await selAll(); fire("pointermove", 20, 20, 0); await sleep(25); kd("g"); await sleep(20);
  kd("n"); await sleep(20); out.six = { active: e.isGestureActive(), con: con().kind, hint: hint() };
  kd("Escape", { code: "Escape" }); await sleep(30);
  // ⑦ 动作外 X / Y
  e.setTool("move"); e.deselectAll(); await sleep(20);
  const ridge = m().edges().find((x) => { const a = m().pt(m().edgeA[x]), bb = m().pt(m().edgeB[x]); return Math.abs(a.z - 1) < 1e-9 && Math.abs(bb.z - 1) < 1e-9; });
  e.selection.edges.add(ridge); e.draw(); await hover(P(0.2, 0.5, 0.95)); const f0 = m().faceCount(), pos0 = e.history.position();
  kd("x"); await sleep(60);
  const items = () => [...document.querySelectorAll(".popup-menu [data-menu-id]")].map((x) => x.dataset.menuId).join(",");
  out.sevenEdgeMenu = { items: items(), gesture: e.isGestureActive(), con: con().kind };
  document.querySelector('.popup-menu [data-menu-id="dissolve"]')?.click(); await sleep(60);
  out.sevenDissolve = { df: m().faceCount() - f0, steps: e.history.position() - pos0, menuGone: !document.querySelector(".popup-menu") };
  await undo();
  e.setTool("select"); e.deselectAll(); await sleep(400); const q = await hover(slopeMid); fire("pointerdown", q.x, q.y, 1); await sleep(10); fire("pointerup", q.x, q.y, 0); await sleep(40);
  out.sevenFaceSel = { faces: e.selection.faces.size, edges: e.selection.edges.size };
  kd("x"); await sleep(60); out.sevenFaceMenu = { items: items() };
  document.querySelector('.popup-menu [data-menu-id="delete"]')?.click(); await sleep(60);
  out.sevenDelete = { df: m().faceCount() - f0 };
  await undo();
  const pos1 = e.history.position(); kd("y"); await sleep(40);
  out.sevenY = { menu: !!document.querySelector(".popup-menu"), steps: e.history.position() - pos1, con: con().kind, gesture: e.isGestureActive() };
  return out;
});
const near = (a, b, t = 2e-3) => !!a && a.length === b.length && a.every((x, i) => Math.abs(x - b[i]) < t);
const N0 = [0.447, 0, 0.894];
const checks = [
  ["进到网格体楔形（5 张面）", res.mesh.kind === "mesh" && res.mesh.faces === 5 && res.mesh.mode === "freeform"],
  ["① G 再 X = 沿 X：一根红线、提示「沿 X」", res.one.active && res.one.con.kind === "line" && near(res.one.con.dir, [1, 0, 0]) && res.one.guide === "x" && res.one.hint.includes("沿 X")],
  ["① 再按 X = 取消：不限制、没有线、提示说取消了", res.oneOff.con === "free" && res.oneOff.guide === "" && res.oneOff.hint.includes("取消")],
  ["① Esc = 退出动作", !res.oneEsc.active],
  ["② G 再 Shift+Z = 只在 XY 面里：红绿两根线、提示「XY 面」", res.two.con.kind === "plane" && near(res.two.con.normal, [0, 0, 1]) && res.two.guide === "x,y" && res.two.hint.includes("XY 面")],
  ["② 落定：挪了、每个点 z 不变；落定以后不再限制、没有线", res.twoDone.movedAny && res.twoDone.zKept && res.twoDone.after === "free" && res.twoDone.guideAfter === ""],
  ["③ 斜面上 G 再 N = 沿斜面法线：一根品红（dir）", res.three.con.kind === "line" && near(res.three.con.dir.map(Math.abs), N0) && res.three.guide === "dir" && res.three.hint.includes("N")],
  ["③ 落定：每个点的位移都平行于斜面法线；之后不再限制", res.threeDone.movedAny && res.threeDone.alongNormal && res.threeDone.after === "free"],
  ["④ Shift+N = 只在斜面里：面里两根（正好平行于 Y 的那根用 Y 的绿，另一根中性）", res.fourPlane.con.kind === "plane" && res.fourPlane.guide === "y,n"],
  ["④ 再按 X = 斜面里沿 X 投进去的方向：品红 + 面里另一根绿（Y）", res.four.con.kind === "planeDir" && near(res.four.con.dir, [0.894, 0, -0.447]) && res.four.guide === "dir,y"],
  ["④ 落定：位移平行于那个方向", res.fourDone.movedAny && res.fourDone.alongDir],
  ["⑤ 拾得到一条斜边", !!res.fiveEdge],
  ["⑤ R 再 T = 沿那条边（品红）、提示说边", !!res.five && res.five.con.kind === "line" && near(res.five.con.dir.map(Math.abs), [0.894, 0, 0.447]) && res.five.guide === "dir" && res.five.hint.includes("T")],
  ["⑤ 落定：绕这条边转（每个点的位移垂直于边）", !!res.fiveDone && res.fiveDone.movedAny && res.fiveDone.perpToEdge],
  ["⑥ 空处按 N = 不变、提示「N：把光标放到一张面上再按」", res.six.active && res.six.con === "free" && res.six.hint.includes("N：把光标放到一张面上再按")],
  ["⑦ 动作外选一条边按 X = 光标处弹「删除 / 溶解」、不进动作、不限制", res.sevenEdgeMenu.items === "delete,dissolve" && !res.sevenEdgeMenu.gesture && res.sevenEdgeMenu.con === "free"],
  ["⑦ 点溶解 = 两张面并成一张、一步、菜单收起", res.sevenDissolve.df === -1 && res.sevenDissolve.steps === 1 && res.sevenDissolve.menuGone],
  ["⑦ 选一张面按 X = 只有「删除」（面的溶解没有现成命令）", res.sevenFaceSel.faces === 1 && res.sevenFaceMenu.items === "delete"],
  ["⑦ 点删除 = 删掉那张面", res.sevenDelete.df === -1],
  ["⑦ 动作外按 Y = 什么都不发生", !res.sevenY.menu && res.sevenY.steps === 0 && res.sevenY.con === "free" && !res.sevenY.gesture],
  ["没有脚本错误", errs.length === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
if (checks.some(([, ok]) => !ok)) { console.log(JSON.stringify(res, null, 1)); if (errs.length) console.log(errs.join("\n")); }
console.log(`${checks.filter(([, ok]) => ok).length}/${checks.length}`);
await b.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

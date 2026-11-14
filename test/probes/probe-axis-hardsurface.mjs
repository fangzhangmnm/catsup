// 硬表面接上轴键（锁的一轮第三步，2026-11-13 Claude Opus 5.5；设计稿 ai-docs/20261113-axis-constraint-module-design.md，施工单 ai-docs/20261113-lock-round-workorder.md 第五节）。
// 场景：地上一个楔形（斜屋顶法线 ∝ (1, 0, 2)）+ 一条平放的边（端点 (1.237, 2, 0) 和 (2.5, 3.1, 0) 都不在格上）。全部走真鼠标 / 真键盘。
// ① 画线：X = 只沿 X；再按 X = 不限制；Y = 换成 Y；再按 Y 取消后 Shift+Z = 只在水平面里
// ② 斜屋顶上起一条线按 N = 垂直于屋顶出去（品红 dir 一根线）
// ③ 矩形：Shift+N（斜屋顶）再 X = 贴着屋顶、一条边顺着 X 投进去的方向；N 再 X = 立在屋顶上（面由法线和 X 撑出、第一条边 = 法线）
// ④ 锁 X、整格开着，光标压在不在格上的端点上 = 线头和它齐平（不取整）
// ⑤ 锁 X、整格开着、没有对齐对象 = 整格；⑥ 同一处按住 Shift = 不取整
// ⑦ 锁 X、在一个端点上停一下充能再移开、对着它 = 对得上（整格关着，免得取整碰巧对上）
// ⑧ 画线中打「3」再按 T（光标压在一条边上）= 沿那条边，不是换卷尺（统筹 11-13 补的一格）
// ⑨ 选着一条边、动作外按 X = 光标处弹菜单、第一项「删除」正好压在光标下，回车 = 删除；⑩ 没选区按 X = 不弹、提示「X：先选中要删的东西」
// ⑪ E = 推拉；橡皮在工具栏橡皮格上能拿、三种能换（统筹 11-13：硬表面 E = 推拉、橡皮不占键）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-axis-hardsurface.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const P = (x, y, z = 0) => ({ x, y, z });
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const hoverTo = async (p, steps = 6, wait = 120) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y, { steps }); await page.waitForTimeout(wait); return q; };
const clickAt = async (p) => { await hoverTo(p, 4, 60); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const key = async (k, wait = 60) => { await page.keyboard.press(k); await page.waitForTimeout(wait); };
const esc = async () => { await key("Escape", 80); };
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.axisConstraintNow(), c = e.cursor3, a = e.anchor3, g = e.lockGuide(), r = (v) => v ? [v.x, v.y, v.z] : null; return { tool: e.tool, con: { kind: k.kind, dir: r(k.dir), n: r(k.normal) }, cur: r(c), a: r(a), guide: g ? g.map((l) => l.color).join(",") : "", hint: document.getElementById("hint")?.textContent ?? "", label: e.snapInfo?.label ?? "", kind: e.snapInfo?.kind ?? null }; });
const pick = (t) => page.evaluate((t) => globalThis.__catsup.hud.pick(t), t);
const grid = (on) => page.evaluate((on) => { const e = globalThis.__catsup.editor; e.setGrid({ ...e.grid, on }); }, on);
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const A = P(0, 0), B = P(2, 0), C = P(2, 1), D = P(0, 1), E = P(0, 0, 1), F = P(0, 1, 1);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[A, B], [B, C], [C, D], [D, A], [A, E], [D, F], [E, F], [E, B], [F, C], [P(1.237, 2), P(2.5, 3.1)]] });
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.5; e.draw();
});
const snap0 = await page.evaluate(() => globalThis.__catsup.editor.grid.snap);
const n0 = (() => { const l = Math.hypot(1, 0, 2); return [1 / l, 0, 2 / l]; })();
const par = (a, b2, t = 1e-6) => !!a && !!b2 && Math.abs(Math.abs(a[0] * b2[0] + a[1] * b2[1] + a[2] * b2[2]) - Math.hypot(...a) * Math.hypot(...b2)) < t;
const near = (a, b2, t = 1e-6) => Math.abs(a - b2) < t;
const res = {};
// ① 画线 X / X / Y / Shift+Z
await pick("line"); await clickAt(P(-1, -1));
await key("x"); await hoverTo(P(0.4, 0.3)); res.oneX = await st();
await key("x"); res.oneOff = await st();
await key("y"); await hoverTo(P(-0.3, 0.6)); res.oneY = await st();
await key("y"); await key("Shift+KeyZ"); await hoverTo(P(-0.2, 0.2, 0.4)); res.oneSZ = await st();   // 先按 Y 取消（不然 = 在水平面里沿 Y），再 Shift+Z
await esc();
// ② 斜屋顶上起线按 N
await clickAt(P(1, 0.5, 0.5)); await key("n"); { const q = await px(P(1, 0.5, 0.5)); await page.mouse.move(box.x + q.x + 5, box.y + q.y - 70, { steps: 6 }); await page.waitForTimeout(120); } res.two = await st(); await esc();
// ③ 矩形 Shift+N 再 X；N 再 X
await pick("rect"); await clickAt(P(1, 0.5, 0.5)); await key("Shift+KeyN"); await key("x"); await hoverTo(P(1.4, 0.7, 0.3));
res.threeA = { ...(await st()), plane: await page.evaluate(() => { const h = globalThis.__catsup.editor.handlers.rect, r = (v) => [v.x, v.y, v.z]; return { n: r(h.plane.plane.n), u: r(h.plane.basis.u) }; }) };
await esc();
await clickAt(P(1, 0.5, 0.5)); await key("n"); await key("x"); await hoverTo(P(1.3, 0.5, 0.9));
res.threeB = { ...(await st()), plane: await page.evaluate(() => { const h = globalThis.__catsup.editor.handlers.rect, r = (v) => [v.x, v.y, v.z]; return { n: r(h.plane.plane.n), u: r(h.plane.basis.u) }; }) };
await esc();
// ④ 锁 X、整格开着、压在不在格上的端点上
await pick("line"); await grid(true); await clickAt(P(0, -1)); await key("x"); await hoverTo(P(1.237, 2)); res.four = await st(); await esc();
// ⑤ / ⑥ 没有对齐对象 = 整格；按住 Shift = 不取整
await clickAt(P(0, -1)); await key("x"); await hoverTo(P(1.33, -0.62)); res.five = await st();
await page.keyboard.down("Shift"); await page.waitForTimeout(120); res.six = await st(); await page.keyboard.up("Shift"); await page.waitForTimeout(60); await esc();
// ⑦ 充能后对得上（整格关）
await grid(false); await clickAt(P(0, -1)); await key("x");
{ const q = await hoverTo(P(2.5, 3.1), 6, 60); for (let i = 0; i < 8; i++) { await page.mouse.move(box.x + q.x + (i % 2), box.y + q.y); await page.waitForTimeout(60); } }   // 在端点上停一下 = 充能（停着时手会微动：充能要持续收到移动、累计够 120 ms）
await hoverTo(P(2.5, 0.6), 8, 200); res.seven = await st(); await esc();
// ⑧ 画线中打「3」再按 T（光标压在那条平放的边上）
await clickAt(P(0, -1.5)); await key("3"); await hoverTo(P((1.237 + 2.5) / 2, (2 + 3.1) / 2)); await key("t"); res.eight = await st(); await esc(); await esc();
// ⑨ 选着那条边、动作外按 X = 第一项压在光标下、回车 = 删除
await pick("select");
const e0 = await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel; e.deselectAll(); const id = k.edges().find((ed) => { const a = k.graph.pt(ed.a); return Math.abs(a.x - 1.237) < 1e-9 || Math.abs(k.graph.pt(ed.b).x - 1.237) < 1e-9; })?.id; e.selection.edges.add(id); e.draw(); return k.edges().length; });
const qm = await hoverTo(P(1.6, 1.0));
await key("x", 120);
res.nine = await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y)?.closest?.("[data-menu-id]"); return { under: el?.dataset.menuId ?? null, items: [...document.querySelectorAll(".popup-menu [data-menu-id]")].map((b) => b.dataset.menuId).join(","), focus: document.activeElement?.dataset?.menuId ?? null }; }, [box.x + qm.x, box.y + qm.y]);
await key("Enter", 120);
res.nineAfter = await page.evaluate((e0) => { const e = globalThis.__catsup.editor; return { de: e.kernel.edges().length - e0, menu: !!document.querySelector(".popup-menu") }; }, e0);
await key("Control+z", 120);
// ⑩ 没选区按 X
await page.evaluate(() => globalThis.__catsup.editor.deselectAll()); await key("x", 120);
res.ten = { menu: await page.evaluate(() => !!document.querySelector(".popup-menu")), hint: (await st()).hint };
// ⑪ E = 推拉；橡皮格三种能换
await key("e"); res.eleven = { e: (await st()).tool };
const slot = page.locator("#toolbar button").filter({ has: page.locator(".tool-flyout") }).filter({ hasText: /橡皮/ }).first();
await slot.click(); await page.waitForTimeout(80); const eraser1 = (await st()).tool;
const pickFly = async (id) => { await slot.click({ button: "right" }); await page.waitForTimeout(120); await page.click(`.popup-menu [data-menu-id="${id}"]`); await page.waitForTimeout(80); return (await st()).tool; };
res.eleven.toolbar = [eraser1, await pickFly("weldErase"), await pickFly("softErase"), await pickFly("erase")];
const eAfterEraser = async () => { await key("e"); return (await st()).tool; };
res.eleven.eFromEraser = await eAfterEraser();

const checks = [
  ["① 画线中按 X = 只沿 X（锚点那根 X 线上，红线）", res.oneX.con.kind === "line" && par(res.oneX.con.dir, [1, 0, 0]) && near(res.oneX.cur[1], -1) && near(res.oneX.cur[2], 0) && res.oneX.guide === "x"],
  ["① 再按 X = 不限制", res.oneOff.con.kind === "free"],
  ["① 按 Y = 换成只沿 Y", res.oneY.con.kind === "line" && par(res.oneY.con.dir, [0, 1, 0]) && near(res.oneY.cur[0], -1) && near(res.oneY.cur[2], 0)],
  ["① Shift+Z = 只在水平面里（落点和起点同高）", res.oneSZ.con.kind === "plane" && par(res.oneSZ.con.n, [0, 0, 1]) && near(res.oneSZ.cur[2], 0) && res.oneSZ.guide === "x,y"],
  ["② 斜屋顶上按 N = 垂直于屋顶出去（品红一根）", res.two.con.kind === "line" && par(res.two.con.dir, n0) && !!res.two.cur && par([res.two.cur[0] - res.two.a[0], res.two.cur[1] - res.two.a[1], res.two.cur[2] - res.two.a[2]], n0, 1e-6) && res.two.guide === "dir" && res.two.kind === "axis-dir"],
  ["③ 矩形 Shift+N 再 X = 贴着屋顶、一条边顺着 X 投进去的方向", par(res.threeA.plane.n, n0) && par(res.threeA.plane.u, [0.894427191, 0, -0.4472135955], 1e-6)],
  ["③ 矩形 N 再 X = 立在屋顶上：面由法线和 X 撑出（法向 Y）、第一条边 = 法线", par(res.threeB.plane.n, [0, 1, 0]) && par(res.threeB.plane.u, n0)],
  [`④ 锁 X、整格开着（格 ${snap0}），压在 x = 1.237 的端点上 = 线头 x = 1.237（不取整）`, res.four.con.kind === "line" && near(res.four.cur[0], 1.237) && near(res.four.cur[1], -1)],
  ["⑤ 锁 X、整格开着、没有对齐对象 = 整格", res.five.con.kind === "line" && near(res.five.cur[1], -1) && near(Math.round(res.five.cur[0] / snap0) * snap0, res.five.cur[0], 1e-9)],
  ["⑥ 同一处按住 Shift = 不取整", !!res.six.cur && near(res.six.cur[1], -1) && !near(Math.round(res.six.cur[0] / snap0) * snap0, res.six.cur[0], 1e-4)],
  ["⑦ 锁 X、在 (2.5, 3.1) 上充能后移开对着它 = x 对得上 2.5", res.seven.con.kind === "line" && near(res.seven.cur[0], 2.5) && near(res.seven.cur[1], -1)],
  ["⑧ 画线中打「3」再按 T = 沿那条边（还拿着画线，不是换卷尺）", res.eight.tool === "line" && res.eight.con.kind === "line" && par(res.eight.con.dir, [1.263, 1.1, 0], 1e-6)],
  ["⑨ 选着边按 X = 弹「删除」、第一项正好压在光标下、焦点在它上面", res.nine.under === "delete" && res.nine.focus === "delete" && res.nine.items.startsWith("delete")],
  ["⑨ 回车 = 删除（少一条边、菜单收起）", res.nineAfter.de === -1 && !res.nineAfter.menu],
  ["⑩ 没选区按 X = 不弹、提示「X：先选中要删的东西」", !res.ten.menu && res.ten.hint.includes("X：先选中要删的东西")],
  ["⑪ 硬表面 E = 推拉", res.eleven.e === "pp"],
  ["⑪ 橡皮在工具栏橡皮格上能拿、三种能换", res.eleven.toolbar.join(",") === "erase,weldErase,softErase,erase"],
  ["⑪ 拿着橡皮按 E = 推拉（不是换下一种橡皮）", res.eleven.eFromEraser === "pp"],
  ["没有脚本错误", errs.length === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
if (checks.some(([, ok]) => !ok)) { console.log(JSON.stringify(res, null, 1)); if (errs.length) console.log(errs.join("\n")); }
console.log(`${checks.filter(([, ok]) => ok).length}/${checks.length}`);
await b.close();
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

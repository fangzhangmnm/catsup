// A9 轴锁 + 视图侧吸附挂件（user 2026-10-24「键盘小箭头控制axis，然后触屏上应该有对应的虚拟键」「视图侧有一个按钮可以toggle snap」）。created 2026-10-24 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const hoverTo = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 6 }); await page.waitForTimeout(150); };
const keyed = "(() => { const k = globalThis.__catsup.editor.axisConstraintNow(); return k.kind === \"line\" ? ([\"x\", \"y\", \"z\"].find((a) => Math.abs(Math.abs(k.dir[a]) - 1) < 1e-9) ?? \"dir\") : k.kind === \"free\" ? null : k.kind; })()";   // 动作里按的轴键那份（锁的一轮第三步：方向键退了，改按 X / Z）
const snap = () => page.evaluate((keyed) => { const e = globalThis.__catsup.editor, s = e.snapInfo; return { lock: eval(keyed), kind: s?.kind ?? null, label: s?.label ?? "", p: s ? [+s.p.x.toFixed(4), +s.p.y.toFixed(4), +s.p.z.toFixed(4)] : null }; }, keyed);
const res = {};
// ① 画线：起点 (0.5,0.5,0)，按 X（手势里的轴键）锁 X，光标拉到 (1.7,1.3,0) → 终点 y = 0.5、z = 0
await page.evaluate(() => globalThis.__catsup.hud.pick("line"));
await clickAt({ x: 0.5, y: 0.5, z: 0 });
await page.keyboard.press("x");
await hoverTo({ x: 1.7, y: 1.3, z: 0 });
res.lockX = await snap();
await clickAt({ x: 1.7, y: 1.3, z: 0 });
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
res.afterX = await page.evaluate((keyed) => { const e = globalThis.__catsup.editor; return { lock: eval(keyed), edges: e.kernel.edges().map((ed) => { const a = e.kernel.graph.pt(ed.a), c = e.kernel.graph.pt(ed.b); return [a.x, a.y, a.z, c.x, c.y, c.z].map((v) => +v.toFixed(4)); }) }; }, keyed);
// ② 按 Z 锁 Z：在地面上往屏幕上方拉 → 终点 x / y 不动、z > 0
await clickAt({ x: -1, y: -1, z: 0 });
await page.keyboard.press("z");
const base = await px({ x: -1, y: -1, z: 0 });
await page.mouse.move(box.x + base.x, box.y + base.y - 120, { steps: 6 }); await page.waitForTimeout(150);
res.lockZ = await snap();
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
res.lockAfterEsc = await page.evaluate((keyed) => eval(keyed), keyed);
// ③ 挂件：点一下 = 栅格开 / 关；右键 = 菜单里不再有锁的选项（白模 W-6，2026-11-10：锁都在右上角那三行）；画线工具吃方向锁 → 锁的三行看得见、左边那颗也在
const g0 = await page.evaluate(() => globalThis.__catsup.editor.grid.on);
await page.locator(".gizmo-snap").click(); await page.waitForTimeout(100);
const g1 = await page.evaluate(() => globalThis.__catsup.editor.grid.on);
await page.locator(".gizmo-snap").click({ button: "right" }); await page.waitForTimeout(150);
const menuText = await page.evaluate(() => [...document.querySelectorAll("button")].map((x) => x.textContent ?? "").filter((t) => /方向锁|面锁/.test(t)).join("|"));
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
const rows = await page.evaluate(() => { const box = document.querySelector(".gizmo-locks"), vis = (el) => !!el && !el.closest("[hidden]") && el.getClientRects().length > 0; return { box: vis(box), x: vis(document.querySelector(".gizmo-lock.lock-x:not(.lock-plane)")), yz: vis(document.querySelector(".gizmo-lock.lock-x.lock-plane")), xText: document.querySelector(".gizmo-lock.lock-x:not(.lock-plane)")?.textContent, yzText: document.querySelector(".gizmo-lock.lock-x.lock-plane")?.textContent }; });
res.widget = { g0, g1, menuText, rows };
console.log(JSON.stringify(res));
const near = (a, b2) => Math.abs(a - b2) < 1e-6;
const seg = res.afterX.edges.find((e) => near(e[1], 0.5) && near(e[4], 0.5) && near(e[2], 0) && near(e[5], 0) && Math.abs(e[3] - e[0]) > 0.5);
const ok = res.lockX.lock === "x" && res.lockX.kind === "axis-x" && /方向锁 X/.test(res.lockX.label) && /方向锁 Z/.test(res.lockZ.label) && res.lockX.p && near(res.lockX.p[1], 0.5) && near(res.lockX.p[2], 0) && !!seg && res.afterX.lock === null
  && res.lockZ.lock === "z" && res.lockZ.p && near(res.lockZ.p[0], -1) && near(res.lockZ.p[1], -1) && res.lockZ.p[2] > 0.05 && res.lockAfterEsc === null
  && res.widget.g0 === false && res.widget.g1 === true && res.widget.menuText === "" && res.widget.rows.box && res.widget.rows.x && res.widget.rows.yz && res.widget.rows.xText === "X" && res.widget.rows.yzText === "YZ";
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

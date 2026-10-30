// 左柱 + ☰ 长什么样（放置表 src/controller/placement.ts；接线清单第 1 条；created 2026-10-28 by Claude Opus 5.5）。
// 抓：硬表面开局的左柱（第一组常驻 + 各组常驻 + ⌄）、用过池里的工具（旋转）后长出的格、自由建模 / 验证定死的一列（含改名「挤出 / 删除 / 插入/倒角」）、
// 自由建模的折叠组（删除 / 插入倒角平时收在 ⌄，用过才长出来；v0.16.42）、☰ 每页的行。
// 期望值 = 放置表搬家前（v0.16.8）的样子（零行为变更）。2026-10-28 晚加：按钮提示（title）= 键表生成，按工作台不同（user「tooltip你没有更新」；奶酪第四层 = 读页面上真的 title）。跑法：python3 -m http.server 8765 后 node test/probes/probe-rail.mjs [--print]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 900 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const rail = () => page.evaluate(() => [...document.getElementById("toolbar").children].map((el) => el.classList.contains("rail-sep") ? "|" : el.classList.contains("rail-more") ? "⌄" : (el.querySelector(".tool-label")?.textContent ?? "?") + (el.querySelector(".tool-flyout") ? "▾" : "")).join(" "));
const titles = () => page.evaluate(() => [...document.getElementById("toolbar").querySelectorAll("button.tool")].map((el) => el.title).join(" | "));
const r = {};
r.geometry = await rail();
r.geometryTitles = await titles();
await page.evaluate(() => { globalThis.__catsup.hud.pick("rotate"); globalThis.__catsup.hud.pick("select"); }); await page.waitForTimeout(80);
r.geometryAfterRotate = await rail();
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); } e.addSegments(segs); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); });
await page.waitForTimeout(120);
r.freeform = await rail();
r.freeformTitles = await titles();
await page.evaluate(() => { globalThis.__catsup.hud.pick("offset"); globalThis.__catsup.hud.pick("select"); }); await page.waitForTimeout(80);
r.freeformAfterUse = await rail();   // 折叠组：用过插入/倒角 = 它长出来，删除还在「…」里（user 10-28 夜「删除，插入倒角也折叠」）
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.exitTo(0); e.setMode("verify"); }); await page.waitForTimeout(120);
r.verify = await rail();
await page.evaluate(() => globalThis.__catsup.editor.setMode("geometry")); await page.waitForTimeout(80);
r.menu = {};
await page.click("#btnMenu"); await page.waitForTimeout(100);
for (const t of ["file", "settings", "help"]) { await page.click(`.popup-menu [data-menu-tab="${t}"]`); await page.waitForTimeout(60); r.menu[t] = await page.evaluate(() => [...document.querySelectorAll(".popup-menu:not(.choice-layer) .menu-section-label, .popup-menu:not(.choice-layer) .menu-label")].map((x) => (x.classList.contains("menu-section-label") ? `§${x.textContent}` : x.textContent)).join(" / ")); }
await b.close();
r.errs = errs;
if (process.argv.includes("--print")) { console.log(JSON.stringify(r, null, 1)); process.exit(0); }
const want = JSON.parse(process.env.PROBE_RAIL_WANT ?? "null") ?? EXPECTED();
const diffs = Object.keys(want).filter((k) => JSON.stringify(want[k]) !== JSON.stringify(r[k]));
console.log(JSON.stringify({ diffs: diffs.map((k) => ({ k, want: want[k], got: r[k] })), errs }, null, 1));
const ok = !diffs.length && !errs.length;
console.log(ok ? "probe-rail OK" : "probe-rail FAIL");
process.exit(ok ? 0 : 1);
function EXPECTED() { return {"geometryTitles": "选择（Space · Tab） | 画线（L · K） | 矩形（R） | 橡皮（E · X） | 推拉（P） | 移动（M） | 卷尺（T） | 坐标架（再按 T）", "freeformTitles": "选择（Space · Tab） | 拉出（Shift+A） | 挤出（P · E 键盘起手） | 移动（M · G 键盘起手） | 旋转（Q · R 键盘起手） | 缩放（S 键盘起手） | 切割（K）", "geometry": "选择 画线 矩形▾ 橡皮▾ | 推拉 移动 ⌄ | 卷尺 坐标架 ⌄", "geometryAfterRotate": "选择 画线 矩形▾ 橡皮▾ | 推拉 移动 旋转 ⌄ | 卷尺 坐标架 ⌄", "freeform": "选择 拉出 挤出▾ 移动 旋转 缩放 切割 | ⌄", "freeformAfterUse": "选择 拉出 挤出▾ 移动 旋转 缩放 切割 | 插入/倒角 ⌄", "verify": "步行 选择 变换 ⌄ 卷尺 ⌄", "menu": {"file": "图库 / 新建 / 打开… / 导入… / 导出与另存… / 锁上", "settings": "手指也能画 / §开发者 / 还原出厂设置…", "help": "使用手册 / 调试日志 / 强制更新"}}; }

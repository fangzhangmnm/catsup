// test/probes/probe-hierarchy.mjs —— 层级浮窗（0.18 物品栏纪元 I1；src/app/hierarchy-window.ts + src/editor/object-tree.ts）。无头。created 2026-10-30 by Claude Opus 5.5
// user 10-30「hierarchy就是有小三角有小眼睛的。右键或者点...就是物品按钮」「没有赋予名字的全用四位hash这种……然后可以淡化」；10-24「组永远不进hierarchy」。
// 用法：python3 -m http.server 8765 → node test/probes/probe-hierarchy.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(700);
const fails = []; const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const W = '.float-win[data-win="hierarchy"]';
const made = await page.evaluate(() => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0) => { e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(x0, 0), P(x0 + 1, 0)], [P(x0 + 1, 0), P(x0 + 1, 1)], [P(x0 + 1, 1), P(x0, 1)], [P(x0, 1), P(x0, 0)]] }); e.commitOp({ op: "pushpull", at: e.activePool(), face: [P(x0, 0), P(x0 + 1, 0), P(x0 + 1, 1), P(x0, 1)], dist: 1 }); };
  box(0); e.selectAll(); C.hud.pick("component");   // 默认名 = 四位码
  box(3); e.selectAll(); e.makeComponent("椅子");      // 把上一个连同新盒子装进「椅子」
  const s = e.sceneRef, names = [...s.defs.values()].filter((d) => d.id !== s.root).map((d) => d.name);
  return { names };
});
check(made.names.length === 2 && made.names.some((n) => /^[0-9a-f]{4}$/.test(n)) && made.names.includes("椅子"), `新组件默认名 = 四位码（不是「组件 N」）：${made.names.join(" / ")}`);
await page.click(".gizmo-hier"); await page.waitForTimeout(120);
const rows = () => page.evaluate((W) => [...document.querySelectorAll(`${W} .tree-row`)].map((r) => ({ key: r.dataset.key, name: r.querySelector(".tree-name")?.textContent, unnamed: !!r.querySelector(".tree-name.is-unnamed"), sel: r.classList.contains("is-selected"), here: r.classList.contains("is-here"), hidden: r.classList.contains("is-hidden") })), W);
const r1 = await rows();
check(r1.length === 2 && r1[0].name === "根" && r1[1].name === "椅子" && r1[0].here, `打开 = 根 + 椅子（根是你在的那层；和左上面包屑同一个叫法）：${JSON.stringify(r1.map((r) => r.name))}`);
await page.click(`${W} .tree-row:nth-child(2) .tree-caret`); await page.waitForTimeout(80);
const r2 = await rows();
check(r2.length === 3 && r2[2].unnamed && /^[0-9a-f]{4}$/.test(r2[2].name), `展开椅子 = 露出里面那个四位码物件、淡色：${JSON.stringify(r2[2])}`);
await page.click(`${W} .tree-row:nth-child(3) .tree-name`); await page.waitForTimeout(100);
const st1 = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { chain: e.context.chain.length, sel: e.selectedPoolKeys() }; });
const r3 = await rows();
check(st1.chain === 1 && st1.sel.length === 1 && r3[2].sel && r3[1].here, `点它 = 走进椅子那一层 + 选中它（画布和窗口一起亮）：${JSON.stringify(st1)}`);
await page.click(`${W} .tree-row:nth-child(3) .tree-eye`); await page.waitForTimeout(100);
const hid = await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef, inst = [...s.def(s.root).instances.values()][0], inner = [...s.def(inst.def).instances.values()][0]; return !!inner.hidden; });
const r4 = await rows();
check(hid && r4[2].hidden, "小眼睛 = 藏起来（行变淡）");
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(80);
const unhid = await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef, inst = [...s.def(s.root).instances.values()][0], inner = [...s.def(inst.def).instances.values()][0]; return !inner.hidden; });
check(unhid, "藏 = 一步撤销");
await page.dblclick(`${W} .tree-row:nth-child(3) .tree-name`); await page.waitForTimeout(120);
check(await page.evaluate(() => globalThis.__catsup.editor.context.chain.length === 2), "双击 = 进去编辑");
await page.click(`${W} .tree-row:nth-child(2) .tree-more`); await page.waitForTimeout(120);
const m1 = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent.trim()));
check(m1.includes("物件设置…") && m1.includes("做成唯一") === m1.includes("做成唯一"), `物件行的「…」= 物件菜单：${m1.slice(0, 6).join(" / ")}`);
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await page.click(`${W} .tree-row:nth-child(1) .tree-more`); await page.waitForTimeout(120);
const m2 = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent.trim()));
const st2 = await page.evaluate(() => globalThis.__catsup.editor.context.chain.length);
check(st2 === 0 && m2.includes("物件设置…"), `根那行的「…」= 走回根 + 空白处菜单：${m2.join(" / ")}`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-hierarchy：${fails.length} 条没过` : "✓ probe-hierarchy");
process.exit(fails.length ? 1 : 0);

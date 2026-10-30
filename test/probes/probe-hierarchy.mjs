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
const rootCode = r1[0]?.name;
check(r1.length === 2 && /^[0-9a-f]{4}$/.test(rootCode) && r1[0].unnamed && r1[1].name === "椅子" && r1[0].here, `打开 = 根组件（老文件的程序占位名 model → 打开时起四位码、没起名、淡色；user 10-30）+ 椅子：${JSON.stringify(r1.map((r) => [r.name, r.unnamed]))}`);
await page.click(`${W} .tree-row:nth-child(2) .tree-caret`); await page.waitForTimeout(80);
const r2 = await rows();
check(r2.length === 3 && r2[2].unnamed && /^[0-9a-f]{4}$/.test(r2[2].name), `展开椅子 = 露出里面那个四位码物件、淡色：${JSON.stringify(r2[2])}`);
await page.click(`${W} .tree-row:nth-child(3) .tree-name`); await page.waitForTimeout(100);
const st1 = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { chain: e.context.chain.length, sel: e.selectedPoolKeys() }; });
const r3 = await rows();
check(st1.chain === 1 && st1.sel.length === 1 && r3[2].sel && r3[1].here, `点它 = 走进椅子那一层 + 选中它（画布和窗口一起亮）：${JSON.stringify(st1)}`);
const shot = () => page.locator("canvas").first().screenshot();
const before = await shot();
await page.click(`${W} .tree-row:nth-child(3) .tree-eye`); await page.waitForTimeout(150);
const after = await shot();
check(!before.equals(after), "小眼睛一点画布马上变（以前只改了数据、要等下一次碰画布才重画，user「小眼睛开关没用」）");
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
const m2dis = await page.evaluate(() => [...document.querySelectorAll(".popup-menu button")].filter((b) => b.disabled).map((b) => b.textContent.trim()));
check(st2 === 0 && m2.join("/") === "改名…/炸开/物件设置…" && m2dis.some((t) => t.startsWith("炸开")), `根那行的「…」= 走回根 + 和物件行同样子的菜单（炸开灰着：根没有父亲）：${m2.join(" / ")}；灰着：${m2dis.join(" / ")}`);
// 根改名（I13）：「…」→「改名…」→ 树上跟着变；撤销一步回来
await page.locator(".popup-menu button", { hasText: "改名…" }).click(); await page.waitForTimeout(150);
await page.fill("#sheetInput", "小镇"); await page.keyboard.press("Enter"); await page.waitForTimeout(150);
const rootRenamed = (await rows())[0];
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(100);
check(rootRenamed.name === "小镇" && !rootRenamed.unnamed && (await rows())[0].name === rootCode, `根改名 = 树上变「${rootRenamed.name}」、撤销回四位码 ${rootCode}`);
// 改名（I4）：「…」→「改名…」→ 输入框；没自己名字的物件 = 改组件名；撤销一步回来
await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await page.click(`${W} .tree-row:nth-child(2) .tree-more`); await page.waitForTimeout(120);
await page.locator(".popup-menu button", { hasText: "改名…" }).click(); await page.waitForTimeout(150);
const sheetTitle = await page.evaluate(() => document.getElementById("sheetTitle")?.textContent ?? "");
await page.fill("#sheetInput", "小红帽的家"); await page.keyboard.press("Enter"); await page.waitForTimeout(150);
const renamed = (await rows())[1]?.name;
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(100);
const back = (await rows())[1]?.name;
check(sheetTitle === "改组件名" && renamed === "小红帽的家" && back === "椅子", `改名：「${sheetTitle}」→ ${renamed}，撤销回 ${back}`);
// 合成行（user 10-30「hierarchy显示的时候应该collapse同实例变成 x几，可以开这个开关」「每个物体能显示自己的type as icon」）：
// 根里再摆一份椅子 → 「椅子 ×2」一行 + 每行种类图标 → 合成行小眼睛 = 两份一起藏、一步撤销 → 标题下拉关掉合成 = 两行 → 撤回那一份
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef; e.exitTo(0); const ch = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).name === "椅子"); e.commitOp({ op: "placeInstance", at: { def: s.root, group: null }, definition: ch.def, xform: [1, 0, 0, 6, 0, 1, 0, 0, 0, 0, 1, 0] }); });
await page.waitForTimeout(150);
const mrows = () => page.evaluate((W) => [...document.querySelectorAll(`${W} .tree-row`)].map((r) => ({ name: r.querySelector(".tree-name")?.textContent, count: r.querySelector(".tree-count")?.textContent ?? "", kind: r.querySelector(".tree-kind use")?.getAttribute("href") ?? "" })), W);
const mr = await mrows();
check(mr.some((r) => r.name === "椅子" && r.count === "×2") && mr.every((r) => r.kind.startsWith("#kind-")), `同一组件两份 = 一行「椅子 ×2」，每行名字前有种类图标：${JSON.stringify(mr)}`);
const ci = mr.findIndex((r) => r.count === "×2");
await page.click(`${W} .tree-row:nth-child(${ci + 1}) .tree-eye`); await page.waitForTimeout(120);
const chairsHidden = () => page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return [...s.def(s.root).instances.values()].filter((i) => s.def(i.def).name === "椅子").map((i) => !!i.hidden); });
const h1 = await chairsHidden();
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(100);
const h2 = await chairsHidden();
check(h1.length === 2 && h1.every(Boolean) && h2.every((x) => !x), `合成行小眼睛 = 两份一起藏（${JSON.stringify(h1)}），撤销一步都回来（${JSON.stringify(h2)}）`);
await page.click(`${W} .float-title-menu`); await page.waitForTimeout(100);
await page.locator(".popup-menu button", { hasText: "同一组件合成一行" }).click(); await page.waitForTimeout(120);
const off = await mrows();
await page.click(`${W} .float-title-menu`); await page.waitForTimeout(100);
await page.locator(".popup-menu button", { hasText: "同一组件合成一行" }).click(); await page.waitForTimeout(120);
check(off.filter((r) => r.name === "椅子").length === 2 && !off.some((r) => r.count), `标题下拉关掉合成 = 两份各一行：${JSON.stringify(off.map((r) => r.name))}`);
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(120);   // 撤回多摆的那一份
// 资源页（I10）：炸开最外层的椅子 → 椅子成孤儿（定义照留）→ 资源页标孤儿 → 清理（确认框列名字）→ 没了 → 撤销回来
await page.evaluate(() => { const C = globalThis.__catsup, e = C.editor; e.exitTo(0); const s = e.sceneRef, chair = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).name === "椅子"); e.selectPools([{ kind: "instance", instance: chair.id }]); C.hud.pick("action:explode"); });
await page.waitForTimeout(150);
const kept = await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return [...s.defs.values()].some((d) => d.name === "椅子"); });
check(kept, "炸开最后一份：组件定义照留（以前会顺手删）");
await page.click(`${W} .float-title-menu`); await page.waitForTimeout(100);   // 换页 = 标题下拉（user 10-30「窗口名字就是下拉」）
await page.locator(".popup-menu button", { hasText: "资源" }).click(); await page.waitForTimeout(120);
const res = await page.evaluate((W) => ({ title: document.querySelector(`${W} .float-title-text`)?.textContent, rows: [...document.querySelectorAll(`${W} .res-row`)].map((r) => [r.querySelector(".tree-name")?.textContent, r.querySelector(".res-meta")?.textContent, r.classList.contains("is-orphan")]), btn: document.querySelector(`${W} .res-purge`)?.textContent }), W);
check(res.title === "资源" && res.rows.some((r) => r[0] === "椅子" && r[2] && /孤儿/.test(r[1])) && /1 个/.test(res.btn ?? ""), `资源页：椅子 = 孤儿、清理钮说 1 个：${JSON.stringify(res)}`);
await page.click(`${W} .res-purge`); await page.waitForTimeout(150);
const msg = await page.evaluate(() => document.getElementById("sheetMessage")?.textContent ?? "");
await page.click("#sheetConfirm"); await page.waitForTimeout(150);
const gone = await page.evaluate(() => !globalThis.__catsup.editor.sceneRef.defs.size || ![...globalThis.__catsup.editor.sceneRef.defs.values()].some((d) => d.name === "椅子"));
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(120);
const back2 = await page.evaluate(() => [...globalThis.__catsup.editor.sceneRef.defs.values()].some((d) => d.name === "椅子"));
check(/「椅子」/.test(msg) && gone && back2, `清理：确认框列名字（${msg.split("\n")[1] ?? ""}）→ 删了 → 撤销一步回来`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-hierarchy：${fails.length} 条没过` : "✓ probe-hierarchy");
process.exit(fails.length ? 1 : 0);

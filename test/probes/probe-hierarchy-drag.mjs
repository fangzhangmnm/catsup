// test/probes/probe-hierarchy-drag.mjs —— 层级窗拖一行换父亲（0.18 物品栏纪元 I3；src/app/ui/tree-drag.ts + object-tree.ts reparentOp）。无头。created 2026-10-30 by Claude Opus 5.5
// user 10-30「hierarchy拖拽同意」；设计稿 §2.1（一行中间 = 放进去；缝 = 横向定深度）。
// 用法：python3 -m http.server 8765 → node test/probes/probe-hierarchy-drag.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(700);
const fails = []; const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const W = '.float-win[data-win="hierarchy"]';
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  const box = (x0) => { e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(x0, 0), P(x0 + 1, 0)], [P(x0 + 1, 0), P(x0 + 1, 1)], [P(x0 + 1, 1), P(x0, 1)], [P(x0, 1), P(x0, 0)]] }); e.commitOp({ op: "pushpull", at: e.activePool(), face: [P(x0, 0), P(x0 + 1, 0), P(x0 + 1, 1), P(x0, 1)], dist: 1 }); };
  box(0); box(3);
  const comp = (x0, name) => { const s = e.sceneRef, k = s.brep(s.root).kernel, faces = k.faces().map((f) => k.faceRings3(f.id).outer).filter((r) => r.every((q) => q.x >= x0 - 1e-9 && q.x <= x0 + 1 + 1e-9)); e.commitOp({ op: "makeComponent", at: { def: s.root, group: null }, faces, edges: [], name }); };
  comp(0, "桌"); comp(3, "椅");
});
await page.click(".gizmo-hier"); await page.waitForTimeout(150);
const rows = () => page.evaluate((W) => [...document.querySelectorAll(`${W} .tree-row`)].map((r) => ({ name: r.querySelector(".tree-name")?.textContent, pad: parseFloat(r.style.paddingLeft), sel: r.classList.contains("is-selected") })), W);
const rowBox = async (name) => { const i = (await rows()).findIndex((r) => r.name === name); return page.locator(`${W} .tree-row`).nth(i).boundingBox(); };
/** 椅的世界变换（不管它挂在哪）。 */
const chairWorld = () => page.evaluate(() => {
  const s = globalThis.__catsup.editor.sceneRef, mul = (a, b) => { const o = []; for (let r = 0; r < 3; r++) { for (let c = 0; c < 3; c++) o.push(a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c]); o.push(a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3]); } return o; };
  const find = (def, M) => { for (const i of s.def(def).instances.values()) { const W2 = mul(M, i.xform); if (s.def(i.def).name === "椅") return W2; const f = find(i.def, W2); if (f) return f; } return null; };
  return find(s.root, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]);
});
const same = (a, b) => a && b && a.every((v, i) => Math.abs(v - b[i]) < 1e-9);
const drag = async (from, to, dx = 0, peek) => {
  const a = await rowBox(from), b = await rowBox(to);
  const x0 = a.x + 60, y0 = a.y + a.height / 2;
  await page.mouse.move(x0, y0); await page.mouse.down();
  await page.mouse.move(x0 + 3, y0 + 3, { steps: 2 });
  const ty = typeof peek === "number" ? b.y + b.height * peek : b.y + b.height / 2;
  await page.mouse.move(x0 + dx, ty, { steps: 8 }); await page.waitForTimeout(60);
  const marks = await page.evaluate((W) => ({ into: document.querySelectorAll(`${W} .tree-row.is-drop-into`).length, line: !!document.querySelector(`${W} .tree-drop-line`), src: document.querySelectorAll(`${W} .tree-row.is-drag-source`).length }), W);
  await page.mouse.up(); await page.waitForTimeout(150);
  return marks;
};
const r0 = await rows();
check(r0.map((r) => r.name).join("/") === "model/桌/椅", `起手：根底下桌、椅：${r0.map((r) => r.name).join("/")}`);
const w0 = await chairWorld();
// ① 拖到「桌」那一行中间 = 放进去
const m1 = await drag("椅", "桌");
const st1 = await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef; return { root: s.def(s.root).instances.size, chain: e.context.chain.length, sel: e.selectedPoolKeys().length, hint: document.getElementById("hint")?.textContent ?? "" }; });
const r1 = await rows();
check(m1.into === 1 && m1.src === 1, `拖着时：目标那行描边、拖着的那行变淡：${JSON.stringify(m1)}`);
check(st1.root === 1 && same(await chairWorld(), w0), `放进桌：根里只剩桌、椅的世界位置不动：${JSON.stringify(st1)}`);
check(st1.chain === 1 && st1.sel === 1 && r1.find((r) => r.name === "椅")?.sel && r1.find((r) => r.name === "椅").pad > r1.find((r) => r.name === "桌").pad, `走进桌那一层、选中椅、树上椅缩进到桌底下：${JSON.stringify(r1)}`);
check(/挪进「桌」底下/.test(st1.hint), `提示行说了：${st1.hint}`);
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(150);
const st2 = await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef; return { root: s.def(s.root).instances.size, chain: e.context.chain.length }; });
check(st2.root === 2 && st2.chain === 0 && same(await chairWorld(), w0), `撤销一步 = 回到根、两个都在根底下：${JSON.stringify(st2)}`);
// ② 拖到「桌」下面那条缝、往右挪一格缩进 = 当桌的孩子
const m2 = await drag("椅", "桌", 16, 0.92);
const st3 = await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return s.def(s.root).instances.size; });
check(m2.line && st3 === 1 && same(await chairWorld(), w0), `缝里 + 右一格 = 桌的孩子（拖着时有插入线）：${JSON.stringify(m2)} 根里 ${st3}`);
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(150);
// ③ 桌锁着：拖进去被挡、说为什么、什么都没变
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef, t = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).name === "桌"); e.selectPools([{ kind: "instance", instance: t.id }]); e.lockSelection(true); e.cancel(); });
await page.waitForTimeout(100);
await drag("椅", "桌");
const st4 = await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return { root: s.def(s.root).instances.size, hint: document.getElementById("hint")?.textContent ?? "" }; });
check(st4.root === 2 && /锁着/.test(st4.hint), `桌锁着 = 挡下、说为什么：${JSON.stringify(st4)}`);
// ④ 普通点一下照旧 = 选中（拖拽没吃掉点击）
await page.click(`${W} .tree-row:nth-child(3) .tree-name`); await page.waitForTimeout(100);
check(await page.evaluate(() => globalThis.__catsup.editor.selectedPoolKeys().length === 1), "点一下照旧 = 选中那一行");
// ⑤ 手指：长按起拖（合成触摸指针事件；先解锁桌）→ 拖到桌中间 = 放进去；⑥ 长按不挪就松手 = 弹这一行的菜单
await page.evaluate(() => { const e = globalThis.__catsup.editor, s = e.sceneRef, t = [...s.def(s.root).instances.values()].find((i) => s.def(i.def).name === "桌"); e.selectPools([{ kind: "instance", instance: t.id }]); e.lockSelection(false); e.cancel(); });
const touch = async (from, to, hold = 480) => {
  const a = await rowBox(from), b = to ? await rowBox(to) : null;
  const x = a.x + 60, y = a.y + a.height / 2;
  await page.evaluate(([x, y]) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, pointerId: 7, pointerType: "touch", button: 0, clientX: x, clientY: y, isPrimary: true })); }, [x, y]);
  await page.waitForTimeout(hold);
  const ty = b ? b.y + b.height / 2 : y;
  await page.evaluate(([x, y, ty]) => { for (let i = 1; i <= 6; i++) window.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 7, pointerType: "touch", clientX: x, clientY: y + (ty - y) * i / 6 })); window.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 7, pointerType: "touch", clientX: x, clientY: ty })); }, [x, y, ty]);
  await page.waitForTimeout(150);
};
await touch("椅", "桌");
check(await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return s.def(s.root).instances.size === 1; }), "手指长按起拖 → 拖到桌中间 = 放进去");
await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(120);
await touch("椅", null);
const menu = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent.trim()));
check(menu.includes("物件设置…") && await page.evaluate(() => { const s = globalThis.__catsup.editor.sceneRef; return s.def(s.root).instances.size === 2; }), `手指长按不挪就松手 = 弹这一行的菜单、什么都没挪：${menu.slice(0, 4).join(" / ")}`);
await page.keyboard.press("Escape");
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-hierarchy-drag：${fails.length} 条没过` : "✓ probe-hierarchy-drag");
process.exit(fails.length ? 1 : 0);

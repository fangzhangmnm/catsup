// test/probes/probe-walk-pen.mjs —— 步行放人走输入层（user 10-30「步行为什么没有做触控笔的悬浮，而是笔碰到屏幕就跳了。如果input层窄接口的话应该自动翻译好了hover和click啊」「1做」）。
// 笔：悬停 = 虚影跟着；按下 = 不落、虚影到按下处；拖 = 跟着；抬笔 = 落人。见过笔的设备上手指轻点 = 落人（fingerTap）。无头。created 2026-10-30 by Claude Opus 5.5
// 用法：python3 -m http.server 8765 → node test/probes/probe-walk-pen.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 1 });
await page.addInitScript(() => { HTMLCanvasElement.prototype.requestPointerLock = function () {}; });   // 无头锁鼠标会掉帧（probe-walk 同款）
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(500);
const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };
const r = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, L = C.locomotion, sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const c = document.getElementById("board"), b = c.getBoundingClientRect();
  const fire = (type, x, y, buttons, pointerType = "pen", id = 3) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: b.left + x, clientY: b.top + y, pointerId: id, pointerType, isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons }));
  const feet = () => { const g = L.placeGhost(); return g ? [Math.round(g.feet.x * 100) / 100, Math.round(g.feet.y * 100) / 100] : null; };
  const out = {};
  e.setMode("verify"); await sleep(50); C.hud.pick("walk"); await sleep(50);
  out.placing = L.walkPhase();
  fire("pointermove", 300, 700, 0); await sleep(30); out.hover1 = feet();          // 笔悬停（没碰屏幕）
  fire("pointermove", 420, 760, 0); await sleep(30); out.hover2 = feet();
  fire("pointerdown", 420, 760, 1); await sleep(30); out.afterDown = L.walkPhase();  // 按下：不落
  fire("pointermove", 480, 820, 1); await sleep(30); out.drag = feet(); out.afterDrag = L.walkPhase();
  fire("pointerup", 480, 820, 0); await sleep(60); out.afterUp = L.walkPhase();      // 抬笔：落
  // 离开，再进放置：这台设备见过笔 → 手指 = 相机，轻点 = 交给步行工具落人
  L.exitWalk(); await sleep(50); C.hud.pick("walk"); await sleep(1200); out.placing2 = L.walkPhase();   // 等过掌触门（笔刚抬起时手指落下 = 当手掌，输入层的防误触）
  fire("pointerdown", 360, 800, 1, "touch", 9); await sleep(40); fire("pointerup", 360, 800, 0, "touch", 9); await sleep(80);
  out.fingerTap = L.walkPhase();
  L.exitWalk(); await sleep(50);
  return out;
});
console.log(JSON.stringify(r));
check(r.placing === "place", `选步行 = 进放置：${r.placing}`);
check(!!r.hover1 && !!r.hover2 && r.hover1.join() !== r.hover2.join(), `笔悬停：虚影跟着走 ${JSON.stringify(r.hover1)} → ${JSON.stringify(r.hover2)}`);
check(r.afterDown === "place", `笔按下不落人：${r.afterDown}`);
check(!!r.drag && r.drag.join() !== r.hover2.join() && r.afterDrag === "place", `按着拖：虚影跟着、还没落 ${JSON.stringify(r.drag)}`);
check(r.afterUp === "walk", `抬笔 = 落人：${r.afterUp}`);
check(r.placing2 === "place" && r.fingerTap === "walk", `见过笔的设备上手指轻点 = 落人：${r.placing2} → ${r.fingerTap}`);
check(errs.length === 0, `页面没报错${errs.length ? "：" + errs.join(" | ") : ""}`);
await browser.close();
console.log(fails.length ? `✗ probe-walk-pen：${fails.length} 条没过` : "✓ probe-walk-pen");
process.exit(fails.length ? 1 : 0);

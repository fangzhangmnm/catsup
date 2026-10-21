// test/probes/probe-lift.mjs —— 抬笔结算探针（A21，2026-10-21，Claude Fable 5.1）：Pencil 对齐到目标后、抬笔前的肌肉抖动不改变提交点。
// user 2026-10-21：「我抬笔的时候总是会抖一下……这会导致我对齐的点滑掉」「把屋脊抬起来的时候，我小心的对齐中间，但是抬笔的时候总是会抖一下然后歪掉」。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-lift.mjs（借 WeebPaint 的 playwright）。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏（user 2026-10-21「默认测试按 ipad mini」「我比较习惯竖屏」）*/ });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
await page.evaluate(() => globalThis.__catsup.editor.applyPreset("日字"));
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp);
  const fire = (type, x, y, extra) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 7, pointerType: "pen", isPrimary: true, button: extra.button ?? -1, buttons: extra.buttons ?? 0, pressure: extra.pressure ?? 0 }));
  const out = {};
  // 场景：日字（两格）。目标 = 中缝的中点 (0, 0, 0)。
  const mid = { x: 0, y: 0, z: 0 };
  const corner = e.kernel.vertices().find((v) => v.x === -1 && v.y === -0.6);
  // ① 画线：从角点落笔，拖到中缝中点（吸「中点」），抬笔前抖 18 px，抬笔 → 线的终点仍是中点
  e.setTool("line");
  const a = px(corner), m = px(mid);
  fire("pointerdown", a.x, a.y, { button: 0, buttons: 1, pressure: 0.5 });
  fire("pointermove", (a.x + m.x) / 2, (a.y + m.y) / 2, { buttons: 1, pressure: 0.5 });
  fire("pointermove", m.x, m.y, { buttons: 1, pressure: 0.5 }); await sleep(60);
  out.lineTipBeforeLift = document.getElementById("tip").textContent;
  fire("pointermove", m.x + 18, m.y + 14, { buttons: 1, pressure: 0.2 }); await sleep(20);   // 抖动（离开吸附圈，< 150 ms）
  fire("pointerup", m.x + 18, m.y + 14, { button: 0, buttons: 0 });
  const hitMid = e.kernel.vertices().some((v) => Math.abs(v.x - mid.x) < 1e-9 && Math.abs(v.y - mid.y) < 1e-9 && Math.abs(v.z) < 1e-9);
  const stray = e.kernel.vertices().filter((v) => ![-1, 1, 0].includes(v.x) || ![-0.6, 0.6, 0].includes(v.y));
  out.lineEndsOnMidpoint = hitMid && stray.length === 0;
  out.strayVerts = stray.map((v) => [v.x, v.y, v.z]);
  // ② 移动：把刚画的线的角点端拖到另一个角点（吸「端点」= 合并），抬笔前抖，抬笔 → 合并发生、无歪点
  e.cancel(); e.setTool("move");
  const other = e.kernel.vertices().find((v) => v.x === -1 && v.y === 0.6);
  const vb = e.kernel.vertices().length;
  const p0 = px(corner), p1 = px(other);
  fire("pointerdown", p0.x, p0.y, { button: 0, buttons: 1, pressure: 0.5 });
  fire("pointermove", (p0.x + p1.x) / 2, (p0.y + p1.y) / 2, { buttons: 1, pressure: 0.5 });
  fire("pointermove", p1.x, p1.y, { buttons: 1, pressure: 0.5 }); await sleep(60);
  out.moveTipBeforeLift = document.getElementById("tip").textContent;
  fire("pointermove", p1.x - 16, p1.y + 12, { buttons: 1, pressure: 0.2 }); await sleep(20);
  fire("pointerup", p1.x - 16, p1.y + 12, { button: 0, buttons: 0 });
  out.moveMerged = e.kernel.vertices().length === vb - 1;
  out.moveStray = e.kernel.vertices().filter((v) => ![-1, 1, 0].includes(v.x) || ![-0.6, 0.6, 0].includes(v.y)).map((v) => [v.x, v.y, v.z]);
  // ③ 对照：抖动超过窗口（停 300 ms 再抬）→ 用抬笔位置（自由解），证明窗口是时间门不是永远黏住
  e.cancel(); e.setTool("line");
  const c2 = e.kernel.vertices().find((v) => v.x === 1 && v.y === -0.6);
  const q = px(c2);
  fire("pointerdown", q.x, q.y, { button: 0, buttons: 1, pressure: 0.5 });
  fire("pointermove", m.x, m.y, { buttons: 1, pressure: 0.5 }); await sleep(60);
  fire("pointermove", m.x + 60, m.y + 50, { buttons: 1, pressure: 0.5 }); await sleep(350);
  fire("pointerup", m.x + 60, m.y + 50, { button: 0, buttons: 0 });
  out.lateLiftUsesFreePoint = e.kernel.vertices().some((v) => ![-1, 1, 0].includes(v.x) || ![-0.6, 0.6, 0].includes(v.y));
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.lineEndsOnMidpoint && res.moveMerged && res.moveStray.length === 0 && res.lateLiftUsesFreePoint && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);

// 步行 FPS 的触屏摇杆（吃鸡式；2026-10-28 Claude Opus 5.5；纪元账本 FM142）：iPad mini 竖屏为主、横屏也跑一遍。
// ① 有触屏 + FPS = 操作层露（左摇杆区 / 右转头区 / 跳 / 蹲 / 原地编辑 / 离开）② 左半屏按住往上推满 = 往前走（约 3 m/s）③ 推出底座边缘 = 冲刺（更快）
// ④ 右半屏往右拖 100 px = 往右转约 0.45 弧度 ⑤ 按住「跳」= 离地 ⑥「原地编辑」= 进原地编辑、操作层收起 ⑦ 没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-touch-stick.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const results = {}, errs = [];
for (const [name, vp] of [["竖屏", { width: 744, height: 1133 }], ["横屏", { width: 1133, height: 744 }]]) {
  const page = await b.newPage({ viewport: vp, hasTouch: true });
  page.on("pageerror", (e) => errs.push(`${name}: ${String(e).slice(0, 200)}`));
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.requestPointerLock = function () {};   // 触屏设备锁不上鼠标（无头锁了还会掉帧）
    const mm = window.matchMedia.bind(window); window.matchMedia = (q) => (q.includes("coarse") ? { matches: true, media: q, addEventListener() {}, removeEventListener() {} } : mm(q));
  });
  await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(600);
  results[name] = await page.evaluate(async () => {
    const L = globalThis.__catsup.locomotion, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
    const root = document.querySelector(".touch-ctl"), left = root.querySelector(".tc-left"), right = root.querySelector(".tc-right");
    L.enterWalk(); L.sim.reset({ x: 0, y: 0, z: 0 }, 0, { x: 0, y: 0, z: 1.7 }); await sleep(100);
    // enterWalk 不经 onPhase 以外的路：确保操作层按阶段露
    out.visible = !root.hidden && getComputedStyle(root).display !== "none";
    const lr = left.getBoundingClientRect(), rr = right.getBoundingClientRect();
    out.zones = { leftW: Math.round(lr.width), rightW: Math.round(rr.width), vw: innerWidth };
    const fire = (t, el, x, y, id) => el.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: x, clientY: y, pointerId: id, pointerType: "touch", isPrimary: id === 21, buttons: t === "pointerup" ? 0 : 1 }));
    // ② 往上推满（56 px）走 0.5 s
    const sx = lr.left + lr.width / 2, sy = lr.top + lr.height * 0.7;
    fire("pointerdown", left, sx, sy, 21); fire("pointermove", left, sx, sy - 56, 21);
    const p0 = { ...L.sim.state.pos }; await sleep(500); const p1 = { ...L.sim.state.pos };
    out.walk = { dist: Math.hypot(p1.x - p0.x, p1.y - p0.y), read: L.touch() };
    // ③ 推出底座边缘 = 冲刺
    fire("pointermove", left, sx, sy - 56 * 1.6, 21);
    const q0 = { ...L.sim.state.pos }; await sleep(500); const q1 = { ...L.sim.state.pos };
    out.dash = { dist: Math.hypot(q1.x - q0.x, q1.y - q0.y), dash: L.touch().dash };
    fire("pointerup", left, sx, sy - 90, 21); await sleep(50);
    out.released = L.touch();
    // ④ 右半屏往右拖 100 px
    const h0 = L.sim.state.heading, rx = rr.left + rr.width / 2, ry = rr.top + rr.height * 0.5;
    fire("pointerdown", right, rx, ry, 22); for (let i = 1; i <= 5; i++) fire("pointermove", right, rx + i * 20, ry, 22); fire("pointerup", right, rx + 100, ry, 22);
    out.turn = h0 - L.sim.state.heading;
    // ⑤ 跳
    const jump = root.querySelector(".tc-jump"), jr = jump.getBoundingClientRect();
    jump.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, clientX: jr.left + 10, clientY: jr.top + 10, pointerId: 23, pointerType: "touch" }));
    await sleep(250); out.jumpZ = L.sim.state.pos.z;
    jump.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, pointerId: 23, pointerType: "touch" }));
    await sleep(800);
    // ⑥ 原地编辑
    root.querySelector(".tc-edit").click(); await sleep(50);
    out.edit = { phase: L.walkPhase(), hidden: root.hidden };
    L.exitWalk();
    return out;
  });
  await page.close();
}
await b.close();
const ok = Object.values(results).every((r) => r.visible && Math.abs(r.zones.leftW - r.zones.vw / 2) <= 1 && Math.abs(r.zones.rightW - r.zones.vw / 2) <= 1
  && r.walk.dist > 1.2 && r.walk.dist < 1.8 && Math.abs(r.walk.read.walkY - 1) < 1e-9 && !r.walk.read.dash
  && r.dash.dash && r.dash.dist > 2.4 && r.released.walkX === 0 && r.released.walkY === 0
  && Math.abs(r.turn - 0.45) < 0.02 && r.jumpZ > 0.2 && r.edit.phase === "edit" && r.edit.hidden) && errs.length === 0;
console.log(JSON.stringify({ results, errs }, null, 1));
console.log(ok ? "probe-touch-stick OK" : "probe-touch-stick FAIL");
process.exit(ok ? 0 : 1);

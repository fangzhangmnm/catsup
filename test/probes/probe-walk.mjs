// test/probes/probe-walk.mjs —— 步行相机探针：合成键盘驱动 player 穿过盒子被挡 / 跳上去 / 视角与截图（借 WeebPaint 的 playwright；先起 python3 -m http.server 8765）。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；「不戴头显验证移动/碰撞的唯一途径」）
// 用法：node test/probes/probe-walk.mjs（非 npm test 的一部分）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const out = process.env.PROBE_OUT ?? "/tmp";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(500);
const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };

// 场景：x∈[1,3] 的 2×2 盒子，高 0.8 m（可跳上，不可走上——腹球球心 0.6 m，低于它的沿都会像轮子上路缘一样滚上去，有效台阶 ≈0.6）
await page.evaluate(() => {
  const e = globalThis.__catsup.editor;
  const P = (x, y, z = 0) => ({ x, y, z });
  e.addSegments([[P(1, -1), P(3, -1)], [P(3, -1), P(3, 1)], [P(3, 1), P(1, 1)], [P(1, 1), P(1, -1)]], "probe box");
  const fid = e.kernel.faces()[0].id;
  e.commitOp({ op: "pushpull", face: fid, dist: 0.8 });   // TS private 只是编译期；探针不是 API
});
const faces = await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length);
check(faces === 6, `盒子六膜 (faces=${faces})`);

// 经视图菜单开步行相机（走 UI 一次 = 接线 + 起循环），再把人放到 (-1,0,0) 面朝 +X
await page.click("#btnView"); await page.waitForTimeout(80);
await page.click(".menu-item:has-text('步行相机')"); await page.waitForTimeout(80);
const walkChecked = await page.evaluate(() => [...document.querySelectorAll(".menu-item")].some((b) => b.textContent.includes("步行相机") && b.querySelector(".menu-check")));
check(walkChecked, "视图菜单「步行相机」已勾");
await page.keyboard.press("Escape"); await page.waitForTimeout(50);
await page.evaluate(() => { globalThis.__catsup.locomotion.sim.reset({ x: -1, y: 0, z: 0 }, -Math.PI / 2, { x: 0, y: 0, z: 1.7 }); });
const st0 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos, walking: globalThis.__catsup.locomotion.isWalking() }));
check(st0.walking && Math.abs(st0.x + 1) < 1e-9, `就位 ${JSON.stringify(st0)}`);
const hint = await page.evaluate(() => document.getElementById("hint").textContent);
check(hint.startsWith("步行"), `状态行切到步行提示：${hint.slice(0, 20)}…`);

// W 走 1.5 s：被挡在 x ≈ 0.7
await page.keyboard.down("w");
await page.waitForTimeout(1500);
await page.keyboard.up("w");
const st1 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos }));
check(st1.x > 0.4 && st1.x < 0.75 && Math.abs(st1.z) < 0.01, `走到墙边被挡 ${JSON.stringify(st1)}`);
await page.screenshot({ path: out + "/probe-walk-1-wall.png" });

// 后退一点，空格+W 跳上盒子
await page.keyboard.down("s"); await page.waitForTimeout(300); await page.keyboard.up("s");
await page.keyboard.down("Space"); await page.keyboard.down("w");
await page.waitForTimeout(300);
await page.keyboard.up("Space");
await page.waitForTimeout(400);
await page.keyboard.up("w");
await page.waitForTimeout(600);
const st2 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos, grounded: globalThis.__catsup.locomotion.sim.state.grounded }));
check(st2.x > 1 && st2.z > 0.75 && st2.grounded, `跳上盒顶 ${JSON.stringify(st2)}`);
await page.screenshot({ path: out + "/probe-walk-2-top.png" });

// 右键拖看：heading 变
const box = await page.locator("#board").boundingBox();
const h0 = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.heading);
await page.mouse.move(box.x + 600, box.y + 400);
await page.mouse.down({ button: "right" });
await page.mouse.move(box.x + 700, box.y + 400, { steps: 5 });
await page.mouse.up({ button: "right" });
const h1 = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.heading);
check(h1 < h0, `右拖看向右 heading ${h0.toFixed(3)} → ${h1.toFixed(3)}`);

// 工具在步行模式仍可用：画线 hover 有吸附标签（把线画在盒顶角上）
await page.keyboard.press("l");
const corner = await page.evaluate(() => {
  const e = globalThis.__catsup.editor; const vp = e.vp(); const eye = e.cam.eye(), fwd = e.cam.forward();
  for (const v of e.kernel.vertices()) {
    if (v.z < 0.4) continue;
    const d = { x: v.x - eye.x, y: v.y - eye.y, z: v.z - eye.z };
    if (d.x * fwd.x + d.y * fwd.y + d.z * fwd.z < 0.5) continue;   // 正前方
    const s = e.cam.angularPx(v, vp);
    if (s.x > 40 && s.x < vp.w - 40 && s.y > 40 && s.y < vp.h - 40) return s;
  }
  return null;
});
check(!!corner, `视口内有正前方的盒顶角点 ${JSON.stringify(corner)}`);
await page.mouse.move(box.x + corner.x, box.y + corner.y); await page.waitForTimeout(80);
const tip = await page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? null : t.textContent; });
check(tip === "端点", `步行模式吸附角点 tip=${tip}`);

// 冻结票：拖线中 player 不掉（先把人放半空）
await page.mouse.move(box.x + 500, box.y + 500); await page.mouse.down();
await page.mouse.move(box.x + 560, box.y + 520, { steps: 4 });
await page.evaluate(() => { globalThis.__catsup.locomotion.sim.state.pos.z = 3; globalThis.__catsup.locomotion.sim.state.grounded = false; });
await page.waitForTimeout(150);
const zFrozen1 = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.pos.z);
await page.waitForTimeout(400);
const zFrozen = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.pos.z);
check(Math.abs(zFrozen - 3) < 1e-6 && zFrozen === zFrozen1, `手势中冻结不掉 z=${zFrozen}`);
await page.mouse.up();
await page.waitForTimeout(150);
const zArmed = await page.evaluate(() => ({ z: globalThis.__catsup.locomotion.sim.state.pos.z, active: globalThis.__catsup.editor.isGestureActive() }));
check(zArmed.active && Math.abs(zArmed.z - 3) < 1e-6, `线工具连画待命 = 手势仍进行中 = 仍冻结 ${JSON.stringify(zArmed)}`);
await page.keyboard.press("Escape");   // 收笔 = 手势结束 = 解冻
await page.waitForTimeout(900);
const zThawed = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.pos.z);
check(zThawed < 0.9, `收笔后落地 z=${zThawed}`);

// teleport：T 按住瞄准前方地面 → 松开跳过去
await page.keyboard.press("Escape");
await page.evaluate(() => { const l = globalThis.__catsup.locomotion; l.sim.reset({ x: -4, y: 0, z: 0 }, -Math.PI / 2, { x: 0, y: 0, z: 1.7 }); });
await page.mouse.move(box.x + 600, box.y + 600);   // 光标偏下 = 瞄地面
await page.keyboard.down("t"); await page.waitForTimeout(300);
const arc = await page.evaluate(() => { const a = globalThis.__catsup.locomotion.sim.state.teleport.arc; return a ? { valid: a.valid, n: a.points.length, reason: a.reason } : null; });
check(arc && arc.valid, `充能弧线 ${JSON.stringify(arc)}`);
await page.screenshot({ path: out + "/probe-walk-3-arc.png" });
await page.keyboard.up("t"); await page.waitForTimeout(150);
const st3 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos }));
check(st3.x > -3.5, `瞬移落地 ${JSON.stringify(st3)}`);

// 退出步行：轨道相机恢复
await page.click("#btnView"); await page.waitForTimeout(50);
await page.click(".menu-item:has-text('步行相机')");
await page.waitForTimeout(80);
const after = await page.evaluate(() => ({ walking: globalThis.__catsup.locomotion.isWalking(), halfH: globalThis.__catsup.editor.cam.halfH }));
check(!after.walking && after.halfH === 4, `退出步行恢复轨道相机 ${JSON.stringify(after)}`);

console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
if (errs.length || fails.length) { console.log("FAILED:", fails.join(" | ")); process.exit(1); }
console.log("probe-walk ok");

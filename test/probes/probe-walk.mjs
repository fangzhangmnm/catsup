// test/probes/probe-walk.mjs —— 步行相机探针：合成键盘驱动 player 穿过盒子被挡 / 跳上去 / 视角与截图（借 WeebPaint 的 playwright；先起 python3 -m http.server 8765）。
// created 2026-09-07 by Claude Fable 5.1（0.4 VR 纪元；「不戴头显验证移动/碰撞的唯一途径」）
// 用法：node test/probes/probe-walk.mjs（非 npm test 的一部分）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const out = process.env.PROBE_OUT ?? "/tmp";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏（user 2026-10-21「默认测试按 ipad mini」「我比较习惯竖屏」）*/ });
// v0.17.54 起「视图」是常驻浮窗：钮 = 开 / 关；没开才点（点完菜单不再自动收，再点一下钮会把它关掉）
const openViewWin = async () => { if (!(await page.evaluate(() => !!document.querySelector('.float-win[data-win="view"]:not([hidden])')))) await page.click('#viewGizmo .gizmo-btn[title="视图"]'); };
const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
// 无头 Chromium 锁上鼠标会把动画帧压到每秒 6 帧（真浏览器不会；2026-10-28 实测 60 → 6）：探针当「锁不上鼠标的设备」（触屏那条路：右键拖看），只记有没有请求锁
await page.addInitScript(() => { globalThis.__lockRequests = 0; HTMLCanvasElement.prototype.requestPointerLock = function () { globalThis.__lockRequests++; }; });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };

// 场景：x∈[1,3] 的 2×2 盒子，高 0.8 m（可跳上，不可走上——腹球球心 0.6 m，低于它的沿都会像轮子上路缘一样滚上去，有效台阶 ≈0.6）
await page.evaluate(() => {
  const e = globalThis.__catsup.editor;
  const P = (x, y, z = 0) => ({ x, y, z });
  e.addSegments([[P(1, -1), P(3, -1)], [P(3, -1), P(3, 1)], [P(3, 1), P(1, 1)], [P(1, 1), P(1, -1)]], "probe box");
  const fid = e.kernel.faces()[0].id;
  e.commitOp({ op: "pushpull", at: e.activePool(), face: e.kernel.faceRings3(fid).outer, dist: 0.8 });   // TS private 只是编译期；探针不是 API（op 按坐标寻址：face = 外环）
});
const faces = await page.evaluate(() => globalThis.__catsup.editor.kernel.faces().length);
check(faces === 6, `盒子六膜 (faces=${faces})`);

// 经验证工作台左柱「步行」开步行相机（2026-10-28 改成 FPS：放置（虚影）→ 点地面落人；纪元账本 FM140 / FM145 / FM154）
const box = await page.locator("#board").boundingBox();
// v0.17.62 起视图菜单的「相机」页撤了（user 10-30「相机tab也不要了，步行在验证工具栏里面」）：步行 = 验证工作台左柱第一格
const startWalk = async () => { await page.evaluate(() => { const e = globalThis.__catsup.editor; if (e.modeId !== "verify") e.setMode("verify"); }); await page.waitForTimeout(80); await page.click(".hud-rail-tools .tool:has-text('步行')"); await page.waitForTimeout(80); };
await startWalk();
const placing = await page.evaluate(() => ({ phase: globalThis.__catsup.locomotion.walkPhase(), panel: globalThis.__catsup.editor.paramPanel()?.title ?? null }));
check(placing.phase === "place" && placing.panel === "步行：点一下落在哪", `菜单 → 放置（马前炮小窗）${JSON.stringify(placing)}`);
// 平时按什么都不进步行：放置里 Esc = 取消、什么都没发生
await page.keyboard.press("Escape"); await page.waitForTimeout(50);
check(await page.evaluate(() => globalThis.__catsup.locomotion.walkPhase() === "off" && !globalThis.__catsup.editor.paramPanel()), "放置里 Esc = 取消");
await startWalk();
// 悬停在原点南边的地面上：虚影绿（站得下）；悬停在盒子侧面：落到墙脚
const ground = await page.evaluate(() => { const e = globalThis.__catsup.editor; return e.cam.angularPx({ x: -1.5, y: -1, z: 0 }, e.vp()); });
await page.mouse.move(box.x + ground.x, box.y + ground.y); await page.waitForTimeout(60);
const ghost = await page.evaluate(() => globalThis.__catsup.locomotion.placeGhost());
check(!!ghost && ghost.ok && Math.abs(ghost.feet.z) < 1e-6 && Math.abs(ghost.stature - 1.72) < 1e-9 && !("height" in ghost), `悬停地面：虚影站得下、画的是身高 1.72（不露眼高） ${JSON.stringify(ghost)}`);
// 马前炮：这个人的参数（2026-10-28 user「眼睛top，身高，宽度，蹲高，爬高」「然后移动速度，跑步倍速，跳高」「然后应该能估算跳远距离」「速度可以识别配速，然后你可以输入其他单位文本框能接住」）
const typeInto = async (label, text) => {
  const f = page.locator(".vcb-params .strip-field", { has: page.locator(".strip-label", { hasText: new RegExp(`^${label}$`) }) });
  await f.locator(".strip-value").click(); await page.waitForTimeout(30);
  await f.locator(".strip-input").fill(text); await f.locator(".strip-input").press("Enter"); await page.waitForTimeout(40);
};
// v0.17.56（user 10-29「步行相机的马前炮太长了挡住了很多屏幕没法选，特别是屏幕下缘，能不能就一个设置然后弹一个小窗口」）：右下角平时只剩钮；点「设置…」= 参数区搬进「步行设置」浮窗
const compact = await page.evaluate(() => ({ fields: document.querySelectorAll(".vcb-params .strip-label").length, buttons: [...document.querySelectorAll(".vcb-params .strip-action")].map((b) => b.textContent).join(","), note: document.querySelector(".vcb-params .vcb-params-note")?.textContent ?? "" }));
check(compact.fields === 0 && compact.buttons === "设置…,在相机这里出生,取消" && /站得下/.test(compact.note) && !/跳远/.test(compact.note), `右下角只剩钮 ${JSON.stringify(compact)}`);
await page.click(".vcb-params .strip-action:has-text('设置…')"); await page.waitForTimeout(80);
check(await page.evaluate(() => !!document.querySelector('.float-win[data-win="walk"]:not([hidden]) .vcb-params')), "点「设置…」= 参数区搬进步行设置浮窗");
const panel0 = await page.evaluate(() => ({ labels: [...document.querySelectorAll(".vcb-params .strip-label")].map((x) => x.textContent), values: [...document.querySelectorAll(".vcb-params .strip-value")].map((x) => x.textContent), note: document.querySelector(".vcb-params-note")?.textContent ?? "" }));
check(panel0.labels.join() === "身高,宽度,眼到头顶,蹲高,爬高,走速,跑步倍速,跳高" && panel0.values[0] === "1.72 m" && /\/km$/.test(panel0.values[5]) && /跑着/.test(panel0.note) && /跳远/.test(panel0.note), `马前炮八项 + 跳远估算 ${JSON.stringify(panel0)}`);
await typeInto("身高", `6'2"`);
await typeInto("走速", "5:00/km");
const typed = await page.evaluate(() => { const L = globalThis.__catsup.locomotion, g = L.placeGhost(), b = L.body(); return { stature: g?.stature, walk: b.walkSpeed, radius: b.radius, shown: [...document.querySelectorAll(".vcb-params .strip-value")].map((x) => x.textContent) }; });
check(Math.abs(typed.stature - 74 * 0.0254) < 1e-9 && Math.abs(typed.walk - 1000 / 300) < 1e-9 && Math.abs(typed.radius - 0.3 * 74 * 0.0254 / 1.72) < 1e-9 && typed.shown[5] === "5'00\"/km", `打字带单位：身高 6'2" → 虚影跟着长、宽度按比例；走速 5:00/km ${JSON.stringify(typed)}`);
await page.click(".vcb-params .strip-action:has-text('恢复默认')"); await page.waitForTimeout(40);
check(await page.evaluate(() => Math.abs(globalThis.__catsup.locomotion.placeGhost().stature - 1.72) < 1e-9 && globalThis.__catsup.locomotion.body().walkSpeed === 3), "恢复默认");
await page.click('.float-win[data-win="walk"] .float-close'); await page.waitForTimeout(60);   // 关窗 = 参数区搬回右下角（又只剩钮），不挡下面点地面
check(await page.evaluate(() => document.querySelectorAll("#vcb .vcb-params .strip-label").length === 0 && !!document.querySelector("#vcb .vcb-params")), "关掉设置窗 = 参数区回右下角、只剩钮");
await page.mouse.move(box.x + ground.x + 1, box.y + ground.y); await page.waitForTimeout(40); await page.mouse.move(box.x + ground.x, box.y + ground.y); await page.waitForTimeout(40);
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
const placed = await page.evaluate(() => ({ phase: globalThis.__catsup.locomotion.walkPhase(), walking: globalThis.__catsup.locomotion.isWalking(), pos: { ...globalThis.__catsup.locomotion.sim.state.pos }, panel: globalThis.__catsup.editor.paramPanel()?.title ?? null }));
check(placed.phase === "walk" && placed.walking && Math.abs(placed.pos.x + 1.5) < 0.05 && !placed.panel, `点地面 = 落在那里、进 FPS、小窗收起 ${JSON.stringify(placed)}`);
check(await page.evaluate(() => globalThis.__lockRequests >= 1), "落人那一下请求了锁鼠标（FPS）");
await page.evaluate(() => { globalThis.__catsup.locomotion.sim.standAt({ x: -1, y: 0, z: 0 }, -Math.PI / 2); });
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

// 右键拖看：heading 变（无头里锁不上鼠标 = 触屏那条路：右键拖看）
const h0 = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.heading);
await page.mouse.move(box.x + 600, box.y + 400);
await page.mouse.down({ button: "right" });
await page.mouse.move(box.x + 700, box.y + 400, { steps: 5 });
await page.mouse.up({ button: "right" });
const h1 = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.heading);
check(h1 < h0, `右拖看向右 heading ${h0.toFixed(3)} → ${h1.toFixed(3)}`);

// teleport：T 按住瞄准前方地面 → 松开跳过去
await page.evaluate(() => { const l = globalThis.__catsup.locomotion; l.sim.standAt({ x: -4, y: 0, z: 0 }, -Math.PI / 2); });
await page.mouse.move(box.x + 600, box.y + 600);   // 光标偏下 = 瞄地面
await page.keyboard.down("t"); await page.waitForTimeout(300);
const arc = await page.evaluate(() => { const a = globalThis.__catsup.locomotion.sim.state.teleport.arc; return a ? { valid: a.valid, n: a.points.length, reason: a.reason } : null; });
check(arc && arc.valid, `充能弧线 ${JSON.stringify(arc)}`);
await page.screenshot({ path: out + "/probe-walk-3-arc.png" });
await page.keyboard.up("t"); await page.waitForTimeout(150);
const st3 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos }));
check(st3.x > -3.5, `瞬移落地 ${JSON.stringify(st3)}`);

await page.evaluate((h) => { const L = globalThis.__catsup.locomotion; L.sim.standAt({ x: 1.95, y: 0, z: 0.8 }, h); L.look(0, 150); }, h1);   // 落人以后视线水平（SU 步行同款）：低头看盒顶   // 放回瞬移之前的样子（盒顶、右拖过的朝向）：下面的吸附角点从这里看

// FPS 里工具键不响应（监工不编辑）；Tab = 原地编辑：上方正中「继续走」、工具照常用
await page.evaluate(() => globalThis.__catsup.editor.setTool("select"));
const beforeL = await page.evaluate(() => ({ tool: globalThis.__catsup.editor.tool, phase: globalThis.__catsup.locomotion.walkPhase() }));
await page.keyboard.press("l"); await page.waitForTimeout(30);
const afterL = await page.evaluate(() => ({ tool: globalThis.__catsup.editor.tool, phase: globalThis.__catsup.locomotion.walkPhase() }));
check(beforeL.phase === "walk" && afterL.tool === beforeL.tool, `FPS 里按 L 不换工具 ${JSON.stringify({ beforeL, afterL })}`);
await page.keyboard.press("Tab"); await page.waitForTimeout(60);
const editInPlace = await page.evaluate(() => ({ phase: globalThis.__catsup.locomotion.walkPhase(), bar: !document.getElementById("walkBar").hidden, label: document.getElementById("walkBtn").textContent }));
check(editInPlace.phase === "edit" && editInPlace.bar && editInPlace.label === "继续走", `Tab = 原地编辑、上方「继续走」${JSON.stringify(editInPlace)}`);
// 原地编辑里工具照常用：画线 hover 有吸附标签（把线画在盒顶角上）
await page.keyboard.press("l");
await page.evaluate(() => { globalThis.__catsup.locomotion.sim.state.pos.x = 2.0; }); await page.waitForTimeout(80);   // 走多远随真实时间浮动（1.85–2.0 m），角点会贴着视口下沿忽进忽出：先把人放到固定位置再找（2026-10-27 Opus）
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
await page.keyboard.press("Escape");   // 收笔 = 手势结束
await page.waitForTimeout(600);
const zPaused = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.pos.z);
check(Math.abs(zPaused - 3) < 1e-6, `原地编辑 = 时间暂停：收笔后也停在这一帧 z=${zPaused}`);   // v0.17.49 起（user 10-29「蹲下的时候tab会是当前这一帧的位置，动画到一半也是一样，类似时间暂停」）；以前收笔就解冻往下掉
// 「继续走」回 FPS：从停住的那一帧接着走 → 这才落地；FPS 里 Esc = 离开步行、回到进来之前的视角（什么都没发生过）
await page.click("#walkBtn"); await page.waitForTimeout(900);
const resumed = await page.evaluate(() => ({ phase: globalThis.__catsup.locomotion.walkPhase(), hidden: document.getElementById("walkBar").hidden, z: globalThis.__catsup.locomotion.sim.state.pos.z }));
check(resumed.phase === "walk" && resumed.hidden, "点「继续走」= 回 FPS、按钮收起");
check(resumed.z < 0.9, `继续走之后才落地 z=${resumed.z}`);
// Tab 来回切（user 10-29「fps的暂停的时候tab应该能切回去」）
await page.keyboard.press("Tab"); await page.waitForTimeout(60);
const tab1 = await page.evaluate(() => globalThis.__catsup.locomotion.walkPhase());
await page.keyboard.press("Tab"); await page.waitForTimeout(60);
const tab2 = await page.evaluate(() => globalThis.__catsup.locomotion.walkPhase());
check(tab1 === "edit" && tab2 === "walk", `Tab = 暂停 / 再按 Tab = 接着走 ${tab1} → ${tab2}`);
// Ctrl = 蹲的开关；蹲到一半按 Tab = 停在这一帧（user 10-29「蹲下的时候tab会是当前这一帧的位置，动画到一半也是一样，类似时间暂停」；按住 Ctrl 再按 Tab = 浏览器切标签页，所以 Ctrl 是开关）
const eyeZ = () => page.evaluate(() => globalThis.__catsup.editor.cam.eye().z);
await page.waitForTimeout(300);
const stand = await eyeZ();
await page.keyboard.press("ControlLeft"); await page.waitForTimeout(70);
await page.keyboard.press("Tab"); await page.waitForTimeout(40);
const mid1 = await eyeZ(); await page.waitForTimeout(500); const mid2 = await eyeZ();
await page.keyboard.press("Tab"); await page.waitForTimeout(700);
const low = await eyeZ();
await page.keyboard.press("ControlLeft"); await page.waitForTimeout(800);
const back = await eyeZ();
check(mid1 < stand - 1e-3 && Math.abs(mid1 - mid2) < 1e-9 && low < mid1 - 1e-3 && Math.abs(back - stand) < 0.02,
  `Ctrl 开关蹲 + 蹲到一半 Tab 定格：站 ${stand.toFixed(3)} → 一半 ${mid1.toFixed(3)} / 半秒后 ${mid2.toFixed(3)} → 接着蹲 ${low.toFixed(3)} → 再按 Ctrl 起来 ${back.toFixed(3)}`);
// FPS 时看的工具 = 步行（修饰键都空着）：按住 Shift / Ctrl 左下不跳别的工具的芯片（user 10-29「fps的时候工具应该是fps，一个隐藏的工具」）
await page.keyboard.down("Shift"); await page.waitForTimeout(80);
const chipsShift = await page.evaluate(() => document.querySelectorAll(".mfd-chip").length);
await page.keyboard.up("Shift"); await page.keyboard.down("Control"); await page.waitForTimeout(80);
const chipsCtrl = await page.evaluate(() => document.querySelectorAll(".mfd-chip").length);
await page.keyboard.up("Control");
check(chipsShift === 0 && chipsCtrl === 0, `FPS 里按住 Shift / Ctrl 不出芯片 ${chipsShift} / ${chipsCtrl}`);
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
const after = await page.evaluate(() => ({ walking: globalThis.__catsup.locomotion.isWalking(), phase: globalThis.__catsup.locomotion.walkPhase(), halfH: globalThis.__catsup.editor.cam.halfH }));
check(!after.walking && after.phase === "off" && after.halfH === 4, `Esc 离开步行、恢复轨道相机 ${JSON.stringify(after)}`);

// 在相机这里出生（user 10-29「步行相机的马前炮还有一个就是spawn在当前摄像机位置的选项」）：眼 = 现在的眼位、朝向不变；锁鼠标后第一个假位移丢掉（不然镜头猛甩）
const camBefore = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.projection = "persp"; e.cam.pitch = 0.3; e.cam.yaw = -1; e.draw(); return { eye: e.cam.eye(), fwd: e.cam.forward() }; });
await startWalk(); await page.waitForTimeout(20);
await page.click("button:has-text('在相机这里出生')"); await page.waitForTimeout(60);
const camAfter = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { phase: globalThis.__catsup.locomotion.walkPhase(), eye: e.cam.eye(), fwd: e.cam.forward() }; });
const dEye = Math.hypot(camAfter.eye.x - camBefore.eye.x, camAfter.eye.y - camBefore.eye.y), dFwd = Math.hypot(camAfter.fwd.x - camBefore.fwd.x, camAfter.fwd.y - camBefore.fwd.y, camAfter.fwd.z - camBefore.fwd.z);
check(camAfter.phase === "walk" && dEye < 1e-6 && dFwd < 1e-6, `在相机这里出生：水平位置 / 朝向不变 Δ眼 ${dEye.toExponential(1)} Δ朝向 ${dFwd.toExponential(1)}`);
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
if (errs.length || fails.length) { console.log("FAILED:", fails.join(" | ")); process.exit(1); }
console.log("probe-walk ok");

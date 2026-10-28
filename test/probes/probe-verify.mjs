// 「验证」工作台（2026-10-28 Claude Opus 5.5；纪元账本 FM169；user「要不加一个验证tab把步行相机作为第一个工具？」「12同意」
// 「tab的话还是验证啦。比如你在验证里面摆关卡。tab的时候还是继续摆」）：
// ① 根上下拉框有「验证」；切过去左柱 = 步行 / 选择 / 移动 / 旋转，第一格是步行 ② 点步行 = 放置（马前炮小窗）③ 放置里 Esc = 取消、放下步行工具（回选择）
// ④ 再点步行、点地面 = 落人进 FPS ⑤ Tab = 原地编辑、还在验证、能换选择工具 ⑥ 原地编辑里再点步行 = 继续走 ⑦ 没有页面错误。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-verify.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 300)));
await page.addInitScript(() => { HTMLCanvasElement.prototype.requestPointerLock = function () {}; });   // 无头锁鼠标会掉帧（见 probe-walk）
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(800);
const box = await page.locator("#board").boundingBox();
const res = await page.evaluate(async () => {
  const { editor: e, hud, locomotion: L } = globalThis.__catsup, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), out = {};
  out.modes = e.modes().map((m) => m.id);
  e.setMode("verify"); await sleep(20);
  out.rail = { mode: e.modeId, tools: hud.tools().filter((t) => e.mode.tools.includes(t.id)).map((t) => t.id), railLabels: [...document.querySelectorAll(".hud-rail-tools .tool .tool-label")].map((x) => x.textContent).slice(0, 4) };
  hud.pick("walk"); await sleep(30);
  out.place = { phase: L.walkPhase(), tool: e.tool, panel: e.paramPanel()?.title ?? null };
  window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true })); await sleep(30);
  out.cancel = { phase: L.walkPhase(), tool: e.tool, mode: e.modeId };
  hud.pick("walk"); await sleep(30);
  return out;
});
// ④ 点地面落人（地面上原点南边）
const g = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cam.setView("iso"); e.cam.target = { x: 0, y: 0, z: 0 }; e.cam.halfH = 4; e.draw(); return e.cam.angularPx({ x: 0, y: -1, z: 0 }, e.vp()); });
await page.mouse.move(box.x + g.x, box.y + g.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
res.walk = await page.evaluate(() => ({ phase: globalThis.__catsup.locomotion.walkPhase(), mode: globalThis.__catsup.editor.modeId }));
await page.keyboard.press("Tab"); await page.waitForTimeout(60);
res.edit = await page.evaluate(() => { const { editor: e, hud, locomotion: L } = globalThis.__catsup; hud.pick("select"); return { phase: L.walkPhase(), mode: e.modeId, tool: e.tool }; });
res.resume = await page.evaluate(() => { const { hud, locomotion: L } = globalThis.__catsup; hud.pick("walk"); return { phase: L.walkPhase() }; });
await b.close();
res.errs = errs;
const ok = res.modes.includes("verify") && res.rail.mode === "verify" && res.rail.tools.includes("walk") && res.rail.railLabels.join() === "步行,选择,移动,旋转"
  && res.place.phase === "place" && res.place.tool === "walk" && res.place.panel === "步行：点一下落在哪"
  && res.cancel.phase === "off" && res.cancel.tool === "select" && res.cancel.mode === "verify"
  && res.walk.phase === "walk" && res.walk.mode === "verify"
  && res.edit.phase === "edit" && res.edit.mode === "verify" && res.edit.tool === "select"
  && res.resume.phase === "walk" && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-verify OK" : "probe-verify FAIL");
process.exit(ok ? 0 : 1);

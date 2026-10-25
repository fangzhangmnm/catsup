// B43 人的尺度参考（user 2026-10-25 grill 定案）：跟指针提示框里出参考名字；浓淡字 / 迷你带 / 每项小条 三种样式 + 最多几条在视图 ☰「参考」页切；单选；新手提醒。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(3000);   // 默认「室内」：开机 1.5 s 后懒加载梯子
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const hoverTo = async (p, dy = 0) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y + dy, { steps: 5 }); await page.waitForTimeout(120); };
const tip = () => page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? "" : t.innerHTML; });
const refPage = async () => { await page.click('#viewGizmo .gizmo-btn[title="视图"]'); await page.waitForTimeout(80); await page.click(".menu-tab:has-text('参考')"); await page.waitForTimeout(80); };
const chip = async (text) => { await page.click(`.popup-menu .menu-chip:text-is("${text}")`); await page.waitForTimeout(60); };
const res = { loaded: await page.evaluate(() => globalThis.__catsup.editor.scaleLadderLoaded), ref0: await page.evaluate(() => globalThis.__catsup.editor.scaleRef) };
// ① 画线锁 Z 竖着拉到 0.914 m：浓淡字里有「栏杆」且命中发亮
const drawUp = async () => { await page.evaluate(() => globalThis.__catsup.hud.pick("line")); await clickAt({ x: 0, y: 0, z: 0 }); await page.keyboard.press("ArrowUp"); await hoverTo({ x: 0, y: 0, z: 0.914 }); await hoverTo({ x: 0, y: 0, z: 0.914 }, 0); };
await drawUp();
res.z = await page.evaluate(() => +globalThis.__catsup.editor.cursor3?.z.toFixed(3));
res.fade = await tip();
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
// ② 参考页：单选块、试用开关、新手提醒
await refPage();
res.page = await page.evaluate(() => { const m = document.querySelector(".popup-menu"); return { chips: [...m.querySelectorAll(".menu-chip")].map((c) => c.textContent + (c.classList.contains("on") ? "*" : "")).join("|"), notes: [...m.querySelectorAll(".menu-note")].map((n) => n.textContent).join("|"), sections: [...m.querySelectorAll(".menu-section-label")].map((n) => n.textContent).join("|") }; });
await chip("迷你带"); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await drawUp(); res.tape = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await refPage(); await chip("每项小条"); await chip("5 条"); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await drawUp(); res.bars = await tip(); res.barRows = await page.evaluate(() => document.querySelectorAll("#tip .tip-bar-row").length); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
await refPage(); await chip("浓淡字"); await chip("3 条"); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ③ 地上拉一个矩形 = 面积参考（房间类；光标会被矩形工具的正方形 / 黄金分割目标吸走，实际约 2 m × 2 m ≈ 4 m² → 衣帽间 / 卫生间）
await page.evaluate(() => globalThis.__catsup.hud.pick("rect"));
await clickAt({ x: 1, y: 1, z: 0 }); await hoverTo({ x: 4.3, y: 4.6, z: 0 });
res.rect = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ④ 选 DnD = 单选换掉室内、新手提醒多 DnD 那条；「不显示」= 提示框只剩吸附字
await refPage(); await page.click('.popup-menu .menu-chip[data-chip="ref:interior/DND"]'); await page.waitForTimeout(60);
res.dnd = await page.evaluate(() => ({ ref: globalThis.__catsup.editor.scaleRef, on: [...document.querySelectorAll(".popup-menu .menu-chip.on")].map((c) => c.dataset.chip).filter((x) => x.startsWith("ref:") ).join("|"), notes: [...document.querySelectorAll(".popup-menu .menu-note")].map((n) => n.textContent).join("|") }));
await page.click(".popup-menu .menu-item:has-text('不显示')"); await page.waitForTimeout(60); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
res.refOff = await page.evaluate(() => globalThis.__catsup.editor.scaleRef);
await drawUp(); res.off = await tip(); await page.keyboard.press("Escape");
console.log(JSON.stringify({ ...res, fade: res.fade.slice(0, 400), tape: res.tape.slice(0, 120), bars: res.bars.slice(0, 120), rect: res.rect.slice(0, 300), off: res.off.slice(0, 200) }));
const fadeNames = (res.fade.match(/<span class="(hit)?" style/g) ?? []).length;
const ok = res.loaded && res.ref0 === "interior/ALL" && Math.abs(res.z - 0.914) < 0.02
  && /栏杆/.test(res.fade) && /class="hit"[^>]*>栏杆/.test(res.fade) && fadeNames === 3
  && /新手提醒/.test(res.page.sections) && /估算/.test(res.page.notes) && /浓淡字\*/.test(res.page.chips) && /3 条\*/.test(res.page.chips) && /室内\*/.test(res.page.chips)
  && /tip-tape/.test(res.tape) && /tip-bars/.test(res.bars) && res.barRows >= 4 && res.barRows <= 5
  && /tip-ref/.test(res.rect) && /间|卧|厨|厅/.test(res.rect)
  && res.dnd.ref === "interior/DND" && res.dnd.on === "ref:interior/DND" && /SRD 5\.1/.test(res.dnd.notes)
  && res.refOff === null && !/tip-ref|tip-tape|tip-bars/.test(res.off);
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

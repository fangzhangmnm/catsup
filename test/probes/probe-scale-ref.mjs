// B43 人的尺度参考（user 2026-10-25）：跟指针提示框第二行出参考名字（只有字的深浅）；☰「单位」页（10-30 从视图窗搬来）尺度参考一行 =「看哪些」下拉多选（默认室内 + 室外）· 最多几条 · 适用范围与出处（全量静态，10-30）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
// v0.17.54 起「视图」是常驻浮窗：钮 = 开 / 关；没开才点（点完菜单不再自动收，再点一下钮会把它关掉）
const openViewWin = async () => { if (!(await page.evaluate(() => !!document.querySelector('.float-win[data-win="view"]:not([hidden])')))) await page.click('#viewGizmo .gizmo-btn[title="视图"]'); };
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(3000); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格   // 默认勾了：开机 1.5 s 后懒加载梯子
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const hoverTo = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 5 }); await page.waitForTimeout(120); };
const tip = () => page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? "" : t.innerHTML; });
const refs = () => page.evaluate(() => [...globalThis.__catsup.editor.scaleRefs].join("|"));
const M = ".popup-menu:not(.choice-layer)";
const refPage = async () => { if (!(await page.evaluate((M) => !!document.querySelector(M), M))) { await page.click("#btnMenu"); await page.waitForTimeout(120); } await page.click(`${M} [data-menu-tab="units"]`); await page.waitForTimeout(80); };
const pageInfo = () => page.evaluate((M) => { const m = document.querySelector(M); return m ? { pick: m.querySelector('[data-menu-id="ref:pick"]')?.textContent ?? "", notesBtn: m.querySelector('[data-menu-id="ref:notes"]')?.textContent ?? "", sections: [...m.querySelectorAll(".menu-section-label")].map((n) => n.textContent).join("|"), max: m.querySelector('[data-menu-id="refmax:3"] .menu-value')?.textContent ?? "" } : null; }, M);
/** 点「适用范围与出处…」→ 弹出的那张说明（全量、静态）的正文，读完关掉。 */
const notesSheet = async () => { await page.click(`${M} [data-menu-id="ref:notes"]`); await page.waitForTimeout(150); const t = await page.evaluate(() => document.getElementById("sheetMessage")?.textContent ?? ""); await page.click("#sheetConfirm"); await page.waitForTimeout(120); return t; };   // 只有「知道了」一颗钮（没有取消 = Esc 不收）
const closeWins = async () => { await page.evaluate(() => document.querySelectorAll(".float-win:not([hidden]) .float-close").forEach((b) => b.click())); if (await page.evaluate((M) => !!document.querySelector(M), M)) { await page.keyboard.press("Escape"); await page.waitForTimeout(60); } };   // v0.17.54：视图是常驻浮窗，Esc 不收它；画之前关掉，别挡着画布
const drawUp = async () => { await closeWins(); await page.evaluate(() => globalThis.__catsup.hud.pick("line")); await clickAt({ x: 0, y: 0, z: 0 }); await page.keyboard.press("ArrowUp"); await hoverTo({ x: 0, y: 0, z: 0.914 }); await hoverTo({ x: 0, y: 0, z: 0.914 }); };
const names = (h) => (h.match(/<span style="opacity/g) ?? []).length;
const res = { loaded: await page.evaluate(() => globalThis.__catsup.editor.scaleLadderLoaded), refs0: await refs() };
// ① 默认室内 + 室外：竖着拉 0.914 m 有「栏杆」，3 条、只有字
await drawUp(); res.fade = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(80);
// ② 参考页：一行「看哪些：室内、室外」+ 最多几条（一行下拉）+ 新手提醒
await refPage(); res.page0 = await pageInfo(); res.notes0 = await notesSheet(); await refPage();
await page.click(`${M} [data-menu-id="refmax:3"]`); await page.waitForTimeout(60); await page.click('.choice-layer [data-choice-id="refmax:5"]'); await page.waitForTimeout(60);   // 「最多」= 下拉行（2026-10-25 起）
// ③ 点「看哪些」= 下拉多选；勾「室内 · DnD」= 加一项（不是换掉），上层菜单不关、摘要跟着变、新手提醒多 DnD
await page.click(`${M} [data-menu-id="ref:pick"]`); await page.waitForTimeout(100);
res.msOpen = await page.evaluate(() => ({ n: document.querySelectorAll(".choice-layer [data-choice-id]").length, on: [...document.querySelectorAll('.choice-layer [aria-selected="true"]')].map((b) => b.dataset.choiceId).join("|") }));
await page.click('.choice-layer [data-choice-id="interior/DND"]'); await page.waitForTimeout(100);
res.afterDnd = { refs: await refs(), parentOpen: await page.evaluate((M) => !!document.querySelector(M), M), msOpen: await page.evaluate(() => !!document.querySelector(".choice-layer")), page: await pageInfo() };
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
await drawUp(); res.five = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ④ 地上拉一个矩形 = 面积参考（房间类）
await closeWins(); await page.evaluate(() => globalThis.__catsup.hud.pick("rect")); await clickAt({ x: 1, y: 1, z: 0 }); await hoverTo({ x: 4.3, y: 4.6, z: 0 });
res.rect = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ⑤ 全部取消 = 不显示
await refPage(); await page.click(`${M} [data-menu-id="ref:pick"]`); await page.waitForTimeout(100);
await page.click(".choice-layer .ms-clear"); await page.waitForTimeout(80);
res.cleared = { refs: await refs(), page: await pageInfo() };
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
await drawUp(); res.off = await tip(); await page.keyboard.press("Escape");
// ⑥ 笔 / 手指：提示框摆到光标左上（user「tooltip右手惯用手的话会被笔挡住」）——先让 app 认成笔输入（选择工具在空处点一下），再拉线
await refPage(); await page.click(`${M} [data-menu-id="ref:pick"]`); await page.waitForTimeout(80); await page.click('.choice-layer [data-choice-id="interior/ALL"]'); await page.waitForTimeout(60); await page.keyboard.press("Escape"); await page.keyboard.press("Escape"); await page.waitForTimeout(60);   // 第一下 Esc 收下拉层，第二下收菜单
// 整笔用合成的笔事件：落点 → 抬起（第一下）→ ↑ 锁 Z → 笔悬停挪到 0.914 m（真鼠标一点就会让 app 认回鼠标）
const a0 = await px({ x: 0, y: 0, z: 0 }), a1 = await px({ x: 0, y: 0, z: 0.914 });
await page.evaluate(() => globalThis.__catsup.hud.pick("line"));
await page.evaluate(([x, y]) => { const c = document.elementFromPoint(x, y); const o = { bubbles: true, pointerId: 9, pointerType: "pen", clientX: x, clientY: y, isPrimary: true, button: 0, buttons: 1 }; c.dispatchEvent(new PointerEvent("pointerdown", o)); c.dispatchEvent(new PointerEvent("pointerup", { ...o, buttons: 0 })); }, [box.x + a0.x, box.y + a0.y]);
await page.waitForTimeout(80); await page.keyboard.press("ArrowUp");
await page.evaluate(([x0, y0, x1, y1]) => { const c = document.elementFromPoint(x0, y0); for (let i = 1; i <= 6; i++) { const x = x0 + (x1 - x0) * i / 6, y = y0 + (y1 - y0) * i / 6; c.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, pointerId: 9, pointerType: "pen", clientX: x, clientY: y, isPrimary: true, buttons: 0 })); } }, [box.x + a0.x, box.y + a0.y, box.x + a1.x, box.y + a1.y]);
await page.waitForTimeout(150);
res.penBox = await page.evaluate(() => { const r = document.getElementById("tip").getBoundingClientRect(); return { right: Math.round(r.right), bottom: Math.round(r.bottom) }; });
res.cursor = await (async () => { const q = await px({ x: 0, y: 0, z: 0.914 }); return { x: Math.round(box.x + q.x), y: Math.round(box.y + q.y) }; })();
res.penTip = await tip(); await page.keyboard.press("Escape");
console.log(JSON.stringify({ ...res, penTip: res.penTip.slice(0, 80), off: res.off.slice(0, 120), fade: res.fade.slice(0, 300), five: res.five.slice(0, 120), rect: res.rect.slice(0, 200) }));
const ok = res.loaded && res.refs0 === "interior/ALL|exterior/ALL"
  && /栏杆/.test(res.fade) && names(res.fade) === 3 && /<sup class="tip-sign">[+−]<\/sup>/.test(res.fade + res.five) && !/<svg|hit/.test(res.fade) && /^<div class="tip-main"><span class="tip-measure">长 /.test(res.fade)
  && /室内、室外/.test(res.page0.pick) && /3 条/.test(res.page0.max) && /尺度参考/.test(res.page0.sections) && /适用范围与出处/.test(res.page0.notesBtn) && /估算/.test(res.notes0) && /SRD 5\.1/.test(res.notes0)
  && res.msOpen.n >= 20 && res.msOpen.on === "interior/ALL|exterior/ALL"
  && res.afterDnd.refs === "interior/ALL|exterior/ALL|interior/DND" && res.afterDnd.parentOpen && res.afterDnd.msOpen && /等 3 项/.test(res.afterDnd.page.pick)
  && names(res.five) === 5
  && /tip-ref/.test(res.rect) && /间|卧|厨|厅|车/.test(res.rect)
  && res.cleared.refs === "" && /不显示/.test(res.cleared.page.pick) && !/tip-ref/.test(res.off) && /tip-measure/.test(res.off)
  && /tip-ref/.test(res.penTip) && res.penBox.right <= res.cursor.x && res.penBox.bottom <= res.cursor.y;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

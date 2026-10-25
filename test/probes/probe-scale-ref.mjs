// B43 人的尺度参考（user 2026-10-25）：跟指针提示框第二行出参考名字（只有字的深浅）；视图 ☰「参考」页 = 一行「看哪些」下拉多选（默认室内 + 室外）+ 最多几条 + 新手提醒。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(3000);   // 默认勾了：开机 1.5 s 后懒加载梯子
const box = await page.locator("#board").boundingBox();
const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const clickAt = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80); };
const hoverTo = async (p) => { const q = await px(p); await page.mouse.move(box.x + q.x, box.y + q.y, { steps: 5 }); await page.waitForTimeout(120); };
const tip = () => page.evaluate(() => { const t = document.getElementById("tip"); return t.hidden ? "" : t.innerHTML; });
const refs = () => page.evaluate(() => [...globalThis.__catsup.editor.scaleRefs].join("|"));
const refPage = async () => { await page.click('#viewGizmo .gizmo-btn[title="视图"]'); await page.waitForTimeout(80); await page.click(".menu-tab:has-text('参考')"); await page.waitForTimeout(80); };
const pageInfo = () => page.evaluate(() => { const m = document.querySelector(".popup-menu:not(.multi-select)"); return m ? { pick: m.querySelector('[data-menu-id="ref:pick"]')?.textContent ?? "", notes: [...m.querySelectorAll(".menu-note")].map((n) => n.textContent).join("|"), sections: [...m.querySelectorAll(".menu-section-label")].map((n) => n.textContent).join("|"), chips: m.querySelectorAll(".menu-chip").length } : null; });
const drawUp = async () => { await page.evaluate(() => globalThis.__catsup.hud.pick("line")); await clickAt({ x: 0, y: 0, z: 0 }); await page.keyboard.press("ArrowUp"); await hoverTo({ x: 0, y: 0, z: 0.914 }); await hoverTo({ x: 0, y: 0, z: 0.914 }); };
const names = (h) => (h.match(/<span style="opacity/g) ?? []).length;
const res = { loaded: await page.evaluate(() => globalThis.__catsup.editor.scaleLadderLoaded), refs0: await refs() };
// ① 默认室内 + 室外：竖着拉 0.914 m 有「栏杆」，3 条、只有字
await drawUp(); res.fade = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(80);
// ② 参考页：一行「看哪些：室内、室外」+ 最多几条（只剩这三块小钮）+ 新手提醒
await refPage(); res.page0 = await pageInfo();
await page.click('.popup-menu .menu-chip:text-is("5 条")'); await page.waitForTimeout(60);
// ③ 点「看哪些」= 下拉多选；勾「室内 · DnD」= 加一项（不是换掉），上层菜单不关、摘要跟着变、新手提醒多 DnD
await page.click('.popup-menu [data-menu-id="ref:pick"]'); await page.waitForTimeout(100);
res.msOpen = await page.evaluate(() => ({ n: document.querySelectorAll(".multi-select [data-ms-id]").length, on: [...document.querySelectorAll('.multi-select [aria-selected="true"]')].map((b) => b.dataset.msId).join("|") }));
await page.click('.multi-select [data-ms-id="interior/DND"]'); await page.waitForTimeout(100);
res.afterDnd = { refs: await refs(), parentOpen: await page.evaluate(() => !!document.querySelector(".popup-menu:not(.multi-select)")), msOpen: await page.evaluate(() => !!document.querySelector(".multi-select")), page: await pageInfo() };
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
await drawUp(); res.five = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ④ 地上拉一个矩形 = 面积参考（房间类）
await page.evaluate(() => globalThis.__catsup.hud.pick("rect")); await clickAt({ x: 1, y: 1, z: 0 }); await hoverTo({ x: 4.3, y: 4.6, z: 0 });
res.rect = await tip(); await page.keyboard.press("Escape"); await page.waitForTimeout(60);
// ⑤ 全部取消 = 不显示
await refPage(); await page.click('.popup-menu [data-menu-id="ref:pick"]'); await page.waitForTimeout(100);
await page.click(".multi-select .ms-clear"); await page.waitForTimeout(80);
res.cleared = { refs: await refs(), page: await pageInfo() };
await page.keyboard.press("Escape"); await page.waitForTimeout(80);
await drawUp(); res.off = await tip(); await page.keyboard.press("Escape");
console.log(JSON.stringify({ ...res, fade: res.fade.slice(0, 300), five: res.five.slice(0, 120), rect: res.rect.slice(0, 200) }));
const ok = res.loaded && res.refs0 === "interior/ALL|exterior/ALL"
  && /栏杆/.test(res.fade) && names(res.fade) === 3 && !/<svg|hit/.test(res.fade)
  && /室内、室外/.test(res.page0.pick) && res.page0.chips === 3 && /新手提醒/.test(res.page0.sections) && /估算/.test(res.page0.notes)
  && res.msOpen.n >= 20 && res.msOpen.on === "interior/ALL|exterior/ALL"
  && res.afterDnd.refs === "interior/ALL|exterior/ALL|interior/DND" && res.afterDnd.parentOpen && res.afterDnd.msOpen && /等 3 项/.test(res.afterDnd.page.pick) && /SRD 5\.1/.test(res.afterDnd.page.notes)
  && names(res.five) === 5
  && /tip-ref/.test(res.rect) && /间|卧|厨|厅|车/.test(res.rect)
  && res.cleared.refs === "" && /不显示/.test(res.cleared.page.pick) && !/tip-ref/.test(res.off);
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

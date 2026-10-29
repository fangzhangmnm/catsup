// X 光快捷钮（右上角视图挂件条、吸附锁钮旁边；created 2026-10-29 by Claude Opus 5.5；user 10-29「xray开关放一个快捷键到视图快捷键区的锁快捷键旁边」）。
// ① 钮在挂件条里、紧挨着吸附锁钮后面、图标 = xray、开局不亮 ② 点它 = X 光开、钮亮 ③ Alt+Z = 关、钮跟着灭（同一个开关）。跑法：python3 -m http.server 8765 后 node test/probes/probe-xray-btn.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const look = () => page.evaluate(() => { const x = document.querySelector(".gizmo-widgets .gizmo-xray"); return { there: !!x, afterSnap: x?.previousElementSibling?.classList.contains("gizmo-snap") ?? false, icon: x?.querySelector("use")?.getAttribute("href") ?? "", on: !!x?.classList.contains("on"), xray: globalThis.__catsup.editor.xray }; });
const r = {};
r.one = await look();
await page.click(".gizmo-widgets .gizmo-xray"); await page.waitForTimeout(80);
r.two = await look();
await page.mouse.move(500, 400);
await page.evaluate(() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", altKey: true, bubbles: true, cancelable: true }))); await page.waitForTimeout(80);
r.three = await look();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.one.there && r.one.afterSnap && r.one.icon === "#xray" && !r.one.on && !r.one.xray && r.two.on && r.two.xray && !r.three.on && !r.three.xray && errs.length === 0;
console.log(ok ? "probe-xray-btn OK" : "probe-xray-btn FAIL");
process.exit(ok ? 0 : 1);

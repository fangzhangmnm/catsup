// 右键兜底（user 10-30「没有右键的ui能不能统一拦截兜底一下右键，不要弹浏览器的右键……统一拦截」）：无头。created 2026-10-30 by Claude Opus 5.5
// 在几处没有自己右键菜单的界面上发 contextmenu：都被拦（defaultPrevented）；输入框放行（浏览器菜单里有粘贴）；画布自己的右键照旧（工具菜单 / 取消）。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e).slice(0, 200)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(800);
const res = await page.evaluate(() => {
  const fire = (el) => { const ev = new MouseEvent("contextmenu", { bubbles: true, cancelable: true, button: 2 }); el.dispatchEvent(ev); return ev.defaultPrevented; };
  const input = document.createElement("input"); input.type = "text"; document.body.appendChild(input);
  const opt = document.createElement("div"); opt.dataset.nativeMenu = ""; const inner = document.createElement("span"); opt.appendChild(inner); document.body.appendChild(opt);
  const out = {
    menuBtn: fire(document.getElementById("btnMenu")),
    body: fire(document.body),
    rail: fire(document.querySelector(".tb-btn, button") ?? document.body),
    version: fire(document.querySelector("#version, .version") ?? document.body),
    input: fire(input),
    optIn: fire(inner),
  };
  input.remove(); opt.remove();
  return out;
});
const ok = res.menuBtn && res.body && res.rail && res.version && !res.input && !res.optIn && !errs.length;
console.log(JSON.stringify(res)); if (errs.length) console.log(errs);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

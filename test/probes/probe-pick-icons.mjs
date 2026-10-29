// 拾取 点 / 边 / 面 = 三颗图标开关（context-bar.ts pickToggles；created 2026-10-28 by Claude Opus 5.5；user 10-28 夜「拾取能不能点边面自己就是toggleable，最好换成icon」）。
// 自由建模网格体里、选择工具——① 工具条有三颗图标钮（各带 sprite 里真有的图标、提示字 = 拾取点 / 拾取边 / 拾取面），开局全亮、没有「开 / 关」字
// ② 点「点」= 只灭它（拾取开关 verts 关），另两颗照亮 ③ 再点「边」= 只剩面亮 ④ 点最后亮着的「面」= 三颗全亮（全关本来就当全开，照实画）
// ⑤ 换到硬表面工作台 = 不出这一组。跑法：python3 -m http.server 8765 后 node test/probes/probe-pick-icons.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.deselectAll(); globalThis.__catsup.hud.pick("select");
});
await page.waitForTimeout(100);
const look = () => page.evaluate(() => {
  const bs = [...document.querySelectorAll("#toolStrip .strip-icon-toggle")], c = globalThis.__catsup.editor.config;
  return { n: bs.length, on: bs.map((x) => (x.classList.contains("on") ? 1 : 0)).join(""), titles: bs.map((x) => x.title).join(","),
    icons: bs.map((x) => { const h = x.querySelector("use")?.getAttribute("href") ?? ""; return h && document.querySelector(h) ? h : "MISSING"; }).join(","),
    cfg: ["verts", "edges", "faces"].map((k) => (c.get("pick", k) ? 1 : 0)).join(""), words: /拾取/.test(document.getElementById("toolStrip")?.textContent ?? "") && !/[开关]/.test([...document.querySelectorAll("#toolStrip .strip-icon-toggle")].map((x) => x.textContent).join("")) };
});
const r = {};
r.one = await look();
await page.click("#toolStrip .strip-icon-toggle[data-pick=verts]"); await page.waitForTimeout(60); r.two = await look();
await page.click("#toolStrip .strip-icon-toggle[data-pick=edges]"); await page.waitForTimeout(60); r.three = await look();
await page.click("#toolStrip .strip-icon-toggle[data-pick=faces]"); await page.waitForTimeout(60); r.four = await look();
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.exitTo(0); e.setMode("geometry"); globalThis.__catsup.hud.pick("select"); }); await page.waitForTimeout(80);
r.five = await look();
await b.close();
r.errs = errs;
console.log(JSON.stringify(r, null, 1));
const ok = r.one.n === 3 && r.one.on === "111" && r.one.titles === "拾取点,拾取边,拾取面" && r.one.icons === "#select-vertex,#select-edge,#select-face" && r.one.words
  && r.two.on === "011" && r.two.cfg === "011" && r.three.on === "001" && r.three.cfg === "001" && r.four.on === "111" && r.four.cfg === "111" && r.five.n === 0 && errs.length === 0;
console.log(ok ? "probe-pick-icons OK" : "probe-pick-icons FAIL");
process.exit(ok ? 0 : 1);

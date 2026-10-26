// 轴移到选择中心 + 参数小窗马后炮（user 2026-10-25「轴的context菜单里面没有移动到选择。这个blender里面我天天用」「点了之后右下角的马后炮可以选择是哪种居中算法」「参数小窗就是上下文选项条，全搬进去」）。
// 轴工具 + 选区 → 右下面板出「移到选择中心」→ 点了 = 原点到包围盒中心、面板上段出「刚才：轴移到选择中心」→ 换「顶点平均」= 撤销重做。iPad 竖屏比例。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 820, height: 1180 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  // 不对称的 L 形一圈线：包围盒中心 ≠ 顶点平均
  const pts = [P(0, 0), P(4, 0), P(4, 1), P(1, 1), P(1, 3), P(0, 3)];
  e.commitOp({ op: "addEdges", segs: pts.map((p, i) => [p, pts[(i + 1) % pts.length]]) });
  e.selectAll(); e.zoomExtents();
  globalThis.__catsup.hud.pick("axes");
});
await page.waitForTimeout(200);
const btn = page.locator("#vcb #toolStrip button", { hasText: "移到选择中心" });
const inPanel = await btn.count();
if (inPanel) await btn.first().click();
await page.waitForTimeout(200);
const r1 = await page.evaluate(() => { const e = globalThis.__catsup.editor, f = e.contextFrame(), pp = e.paramPanel(); return { o: [f.origin.x, f.origin.y].map((v) => +v.toFixed(4)), title: pp?.title ?? null, phase: pp?.phase ?? null, shown: !document.getElementById("vcb").hidden, head: document.querySelector(".vcb-params-title")?.textContent ?? "" }; });
await page.evaluate(() => globalThis.__catsup.editor.setParam("algo", "mean"));
const r2 = await page.evaluate(() => { const f = globalThis.__catsup.editor.contextFrame(); return [f.origin.x, f.origin.y].map((v) => +v.toFixed(4)); });
// 别的操作之后马后炮作废
await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }); e.commitOp({ op: "addEdges", segs: [[P(6, 0), P(7, 0)]] }); });
const r3 = await page.evaluate(() => globalThis.__catsup.editor.paramPanel());
const res = { inPanel, r1, r2, staleAfterOtherOp: r3 === null };
console.log(JSON.stringify(res));
// 包围盒 [0,4]×[0,3] → (2,1.5)；顶点平均 = (0+4+4+1+1+0)/6, (0+0+1+1+3+3)/6 = (1.6667, 1.3333)
const ok = inPanel === 1 && JSON.stringify(r1.o) === "[2,1.5]" && r1.title === "坐标架移到选择中心" && r1.phase === "after" && r1.shown && r1.head.includes("刚才") && JSON.stringify(r2) === "[1.6667,1.3333]" && res.staleAfterOtherOp && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

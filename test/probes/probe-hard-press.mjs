// probe-hard-press.mjs —— 重按走真的输入层（笔的设计稿第七节第 2 步）：在画布上发笔的 PointerEvent（带压力），看递给编辑器的那一下带没带 press、点在哪。created 2026-11-13 by Claude Opus 5.5
// 查：① 轻按着滑、然后三个样本内猛地按重（猛升那一下笔滑了 6 px）= 恰好一次，点在猛升之前；② 慢慢加重 1 秒多 = 一次都没有；
//     ③ 落笔就很重 = 一次（落笔那一点）；④ 鼠标按下拖动 = 一次都没有（只有笔喂判法）；⑤ 现在没有工具用重按（stance.ts PEN_PRESS 空）= 笔尖一次都不闪；⑥ 没有页面错误。
// 事件是脚本造的：时间戳 = 造出来的那一刻，所以每个样本之间真的等一会儿（猛升只用三个样本，机器忙时等得再久也在判法的窗口里）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-hard-press.mjs [地址]（或 PROBE_URL）
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load" }); await page.waitForTimeout(600);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, c = document.getElementById("board"), r = c.getBoundingClientRect(), sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const got = [], pulses = [];
  for (const k of ["pointerDown", "pointerMove"]) { const orig = e[k].bind(e); e[k] = (p) => { if (p.press) got.push({ ...p.press }); return orig(p); }; }
  new MutationObserver((ms) => { for (const m of ms) for (const n of m.addedNodes) if (n.classList?.contains("press-pulse")) pulses.push(1); }).observe(document.body, { childList: true });
  const fire = (type, x, y, p, pointerType = "pen") => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 21, pointerType, isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons: type === "pointerup" ? 0 : 1, pressure: type === "pointerup" ? 0 : p }));
  /** 一下：pts = [x, p] 一串（y 固定），每个之间等 dt 毫秒。 */
  const stroke = async (pts, dt = 8, pointerType = "pen") => {
    const n0 = got.length; fire("pointerdown", pts[0][0], 500, pts[0][1], pointerType);
    for (const [x, p] of pts.slice(1)) { await sleep(dt); fire("pointermove", x, 500, p, pointerType); }
    await sleep(dt); const [xl] = pts[pts.length - 1]; fire("pointerup", xl, 500, 0, pointerType); await sleep(30);
    return got.slice(n0);
  };
  const out = {};
  // ① 轻轻落笔（0.02 → 0.15）、轻按着滑 30 个样本（x 200 → 260）、三个样本猛升到 0.6（同时滑 6 px）、再按住一会儿
  const a = [[200, 0.02], [200, 0.08], [200, 0.15]];
  for (let i = 1; i <= 30; i++) a.push([200 + 2 * i, 0.15 + (i % 2 ? 0.01 : -0.01)]);
  a.push([262, 0.3], [264, 0.45], [266, 0.6]); for (let i = 0; i < 10; i++) a.push([266, 0.6]);
  out.rise = await stroke(a);
  // ② 慢慢加重：0.1 → 0.7 用 80 个样本，每个等 16 ms（≈ 1.3 秒）
  const b = [[300, 0.05], [300, 0.1]]; for (let i = 1; i <= 80; i++) b.push([300 + i, 0.1 + (0.6 * i) / 80]);
  out.slow = await stroke(b, 16);
  // ③ 落笔就很重
  out.down = await stroke([[400, 0.75], [402, 0.75], [404, 0.72], [406, 0.7]]);
  // ④ 鼠标（压力 0.5、再 1.0）：不喂判法
  out.mouse = await stroke([[300, 0.5], [310, 0.5], [320, 1], [330, 1]], 8, "mouse");
  out.pulses = pulses.length;
  return out;
});
await browser.close();
res.errs = errs;
const checks = {
  "① 轻按着滑、然后猛地按重 = 恰好一次": res.rise.length === 1 && res.rise[0].how === "rise",
  "① 点在猛升之前（x ≈ 260，不是滑了 6 px 之后的 266）": res.rise.length === 1 && Math.abs(res.rise[0].x - 260) <= 2,
  "② 慢慢加重 = 一次都没有": res.slow.length === 0,
  "③ 落笔就很重 = 一次、点在落笔那一点": res.down.length === 1 && res.down[0].how === "down" && Math.abs(res.down[0].x - 400) <= 0.5,
  "④ 鼠标不喂判法": res.mouse.length === 0,
  "⑤ 没有工具用重按 = 笔尖一次都不闪": res.pulses === 0,
  "⑥ 没有页面错误": errs.length === 0,
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ checks, res }, null, 1));
console.log(ok ? "probe-hard-press OK" : "probe-hard-press FAIL");
process.exit(ok ? 0 : 1);

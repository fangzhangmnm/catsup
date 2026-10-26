// 小事批 v0.13.13：Ctrl+A 全选（6 面 12 边）→ 血槽位读数「面积 … 长 …」；Shift 画线 = 15° 对齐（tip 显示度数，方向落在 15° 倍数上）。\n// 2026-10-25 DT51：Shift = 把格点吸附反过来（15° 归格点吸附、有捕捉阈），这一段按新语义改写（Claude Opus 5.5）。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const at = async (p) => { const s = await page.evaluate((q) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(q, e.vp()); }, p); return { x: box.x + s.x, y: box.y + s.y }; };
const out = {};
await page.evaluate(() => { const e = globalThis.__catsup.editor; const P = (x, y, z = 0) => ({ x, y, z }); const S = 2, H = 1.5; const loops = [[P(0, 0), P(S, 0), P(S, S), P(0, S)], [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)], [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)], [P(S, S), P(0, S), P(0, S, H), P(S, S, H)], [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]]; for (const l of loops) e.commitOp({ op: "addEdges", segs: l.map((p, i) => [p, l[(i + 1) % l.length]]) }); });
await page.keyboard.press("Control+a"); await page.waitForTimeout(100);
out.sel = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { faces: e.selection.faces.size, edges: e.selection.edges.size, readout: document.getElementById("readout").textContent, hidden: document.getElementById("readout").hidden }; });
await page.evaluate(() => globalThis.__catsup.editor.cancel());
// Shift 画线（2026-10-25 DT51 改语义：Shift = 把格点吸附反过来；15° 归格点吸附、离得近才咬）：本探针开头关了格点吸附 →
// 首点 (4,0)，移到 31° 方向：不按 Shift = 不咬（31°）；按住 Shift（指针不动）= 格点吸附临时开 → 咬到 30°
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.setGrid({ on: false, step: 10, subdiv: 5 }); e.setTool("line"); });   // 格距 10 m / 细分 5 = 2 m 一格：31° 方向附近没有格点，测的是整角
const a = await at({ x: 4, y: 0, z: 0 }); await page.mouse.move(a.x, a.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
const q = await at({ x: 4 + Math.cos(31 * Math.PI / 180) * 2, y: Math.sin(31 * Math.PI / 180) * 2, z: 0 }); await page.mouse.move(q.x, q.y, { steps: 6 }); await page.waitForTimeout(120);
const degNow = () => page.evaluate(() => { const p = globalThis.__catsup.editor.cursor3; return p ? Math.round(Math.atan2(p.y, p.x - 4) * 180 / Math.PI * 100) / 100 : NaN; });
out.free = await degNow();
await page.keyboard.down("Shift"); await page.waitForTimeout(120);
out.shift = await page.evaluate(() => { const t = document.getElementById("tip"); return { tip: t.hidden ? null : (t.querySelector(".tip-snap") ?? t.querySelector(".tip-main"))?.textContent ?? t.textContent,   // v0.13.58 起读数在第一行、吸附字小字跟在后面（.tip-snap）
      full: t.hidden ? null : t.textContent }; });
out.deg = await degNow();
await page.keyboard.up("Shift"); await page.waitForTimeout(80);
out.released = await degNow();
await page.evaluate(() => globalThis.__catsup.editor.cancel());
console.log(JSON.stringify(out));
// 右下读数 2026-10-25 起先不显示（user「面积和长可以先不显示……右边把小窗位置都让出来」）：文字照算、节点藏着
const ok = out.sel.faces === 6 && out.sel.edges === 12 && out.sel.hidden && /面积/.test(out.sel.readout) && /长/.test(out.sel.readout) && Math.abs(out.free - 31) < 0.5 && /^30°/.test(out.shift.tip ?? "") && Math.abs(out.deg - 30) < 0.01 && Math.abs(out.released - 31) < 0.5;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

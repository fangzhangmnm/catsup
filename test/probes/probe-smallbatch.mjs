// 小事批 v0.13.13：Ctrl+A 全选（6 面 12 边）→ 血槽位读数「面积 … 长 …」；Shift 画线 = 15° 对齐（tip 显示度数，方向落在 15° 倍数上）。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const at = async (p) => { const s = await page.evaluate((q) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(q, e.vp()); }, p); return { x: box.x + s.x, y: box.y + s.y }; };
const out = {};
await page.evaluate(() => { const e = globalThis.__catsup.editor; const P = (x, y, z = 0) => ({ x, y, z }); const S = 2, H = 1.5; const loops = [[P(0, 0), P(S, 0), P(S, S), P(0, S)], [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)], [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)], [P(S, S), P(0, S), P(0, S, H), P(S, S, H)], [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]]; for (const l of loops) e.commitOp({ op: "addEdges", segs: l.map((p, i) => [p, l[(i + 1) % l.length]]) }); });
await page.keyboard.press("Control+a"); await page.waitForTimeout(100);
out.sel = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { faces: e.selection.faces.size, edges: e.selection.edges.size, readout: document.getElementById("readout").textContent, hidden: document.getElementById("readout").hidden }; });
await page.evaluate(() => globalThis.__catsup.editor.cancel());
// Shift 画线：首点在地面 (4,0)，Shift 按着移到 37° 方向 → 15° 对齐到 30°
await page.evaluate(() => globalThis.__catsup.editor.setTool("line"));
const a = await at({ x: 4, y: 0, z: 0 }); await page.mouse.move(a.x, a.y); await page.waitForTimeout(40); await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(80);
await page.keyboard.down("Shift");
const q = await at({ x: 4 + Math.cos(37 * Math.PI / 180) * 2, y: Math.sin(37 * Math.PI / 180) * 2, z: 0 }); await page.mouse.move(q.x, q.y, { steps: 6 }); await page.waitForTimeout(120);
out.shift = await page.evaluate(() => { const t = document.getElementById("tip"); const e = globalThis.__catsup.editor; const c = e.cursor ? null : null; return { tip: t.hidden ? null : t.textContent, cursor: globalThis.__catsup.editor.toolCtx ? null : null }; });
out.cursor = await page.evaluate(() => { const e = globalThis.__catsup.editor; const p = e.cursor3 ?? null; return p ? { x: p.x, y: p.y, z: p.z } : null; });
await page.keyboard.up("Shift"); await page.evaluate(() => globalThis.__catsup.editor.cancel());
const ang = out.cursor ? Math.atan2(out.cursor.y, out.cursor.x - 4) * 180 / Math.PI : NaN;
out.deg = Math.round(ang * 100) / 100;
console.log(JSON.stringify(out));
const ok = out.sel.faces === 6 && out.sel.edges === 12 && !out.sel.hidden && /面积/.test(out.sel.readout) && /长/.test(out.sel.readout) && out.shift.tip === "30°" && Math.abs(out.deg - 30) < 0.5;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

// 表面模式（刀 ③，v0.13.12）：按 B → 自动切到表面模式（下拉框 = 表面、左柱只剩 选择 + 油漆桶、上下文条 = 材质 chip → 吸色 → 范围 → 阈值）；
// 单击 = 平滑组（盒子 = 1 面）、双击 = 到锐角（90° 挡 → 仍 1）、三击 = 连通体（6）；吸色读回材质；按住拖刮涂；切回几何 → 工具 = 画线。created 2026-10-24 by Claude Fable 5.1
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // v0.13.64 新文档吸附默认开；本探针测的不是栅格
const box = await page.locator("#board").boundingBox();
const at = async (p) => { const s = await page.evaluate((q) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(q, e.vp()); }, p); return { x: box.x + s.x, y: box.y + s.y }; };
const clicks = async (p, n) => { const q = await at(p); await page.mouse.move(q.x, q.y); await page.waitForTimeout(40); for (let i = 0; i < n; i++) { await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(60); } await page.waitForTimeout(400); };
const painted = () => page.evaluate(() => { const k = globalThis.__catsup.editor.kernel; return k.faces().filter((f) => k.faceMaterialOf(f.id, 0) !== undefined || k.faceMaterialOf(f.id, 1) !== undefined).length; });   // DT8 两个表面：哪一侧涂了都算
const out = {};
await page.evaluate(() => { const e = globalThis.__catsup.editor; const P = (x, y, z = 0) => ({ x, y, z }); const S = 2, H = 1.5; const loops = [[P(0, 0), P(S, 0), P(S, S), P(0, S)], [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)], [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)], [P(S, S), P(0, S), P(0, S, H), P(S, S, H)], [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]]; for (const l of loops) e.commitOp({ op: "addEdges", segs: l.map((p, i) => [p, l[(i + 1) % l.length]]) }); });
out.railGeom = await page.evaluate(() => document.querySelectorAll("#toolbar button").length);
await page.keyboard.press("b"); await page.waitForTimeout(150);
out.afterB = await page.evaluate(() => ({ mode: globalThis.__catsup.editor.modeId, tool: globalThis.__catsup.editor.tool, select: document.getElementById("modeSelect").dataset.value, rail: document.querySelectorAll("#toolbar button").length, strip: [...document.querySelectorAll("#toolStrip .strip-action, #toolStrip .strip-label")].map((x) => x.textContent.trim()) }));
await page.evaluate(() => globalThis.__catsup.editor.setPaint({ kind: "color", name: "赭石", color: [0.6, 0.3, 0.1] }));
await clicks({ x: 1, y: 1, z: 1.5 }, 1); out.single = await painted();          // 顶面：平滑组 = 1
await clicks({ x: 1, y: 0, z: 0.75 }, 2); out.double = await painted();         // 前墙：到锐角（90° 挡）→ 又 1 张 = 2
await clicks({ x: 2, y: 1, z: 0.75 }, 3); out.triple = await painted();         // 右墙：连通体 → 全 6
await page.evaluate(() => globalThis.__catsup.editor.setPaint(null));
await page.evaluate(() => { globalThis.__catsup.editor.toolHandler("paint").eyedropper = true; });
await clicks({ x: 1, y: 1, z: 1.5 }, 1);
out.sampled = await page.evaluate(() => globalThis.__catsup.editor.paint?.name ?? null);
await page.evaluate(() => { globalThis.__catsup.editor.toolHandler("paint").eyedropper = false; globalThis.__catsup.editor.setPaint({ kind: "color", name: "青", color: [0.1, 0.5, 0.6] }); });
{ const a = await at({ x: 0.5, y: 0, z: 0.75 }), c = await at({ x: 2, y: 0.5, z: 0.75 }); await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(c.x, c.y, { steps: 10 }); await page.mouse.up(); await page.waitForTimeout(150); }
out.scrubbed = await page.evaluate(() => { const e = globalThis.__catsup.editor, k = e.kernel, mats = e.materials(); return k.faces().filter((f) => [0, 1].some((side) => { const s = k.faceMaterialOf(f.id, side); return s !== undefined && mats[e.sceneRef.brep(e.sceneRef.root).materialSlots[s]]?.name === "青"; })).length; });   // DT8：哪一侧都算
await page.evaluate(() => globalThis.__catsup.editor.setMode("geometry"));
out.back = await page.evaluate(() => ({ mode: globalThis.__catsup.editor.modeId, tool: globalThis.__catsup.editor.tool, rail: document.querySelectorAll("#toolbar button").length }));
console.log(JSON.stringify(out));
const ok = out.afterB.mode === "surface" && out.afterB.tool === "paint" && out.afterB.select === "surface" && out.afterB.rail < out.railGeom && out.afterB.strip.includes("吸色") && out.afterB.strip.includes("范围") && out.single === 1 && out.double === 2 && out.triple === 6 && out.sampled === "赭石" && out.scrubbed >= 2 && out.back.mode === "geometry" && out.back.tool === "select" && out.back.rail === out.railGeom;   // 回硬表面 = 鼠标（选择）工具（user 10-27 / 10-29「brep模式进去默认是鼠标而不是线」）
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

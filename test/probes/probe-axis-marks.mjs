// X 轴上「一格多长」的标记（世界文字深模块 world-labels.ts 的第一个用户）跟着网格当前那一层走（user 10-30「视角放远的时候1m应该变成对应栅格lod的标记，比如10 100之类的」）。
// created 2026-10-25 by Claude Opus 5.5 · 2026-10-30 Opus 5.5 改：单位制 + 进位表（公制 ×10、英制 1 in · 1 ft · 10 ft、D&D 1 ft · 5 ft · 50 ft），比吸附细的层不画（user「比选的snap还细的格子不应该显示，因为没snap」），栅格面关 = 不出
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500); await page.evaluate(() => globalThis.__catsup?.editor?.setGrid({ on: false }));   // 本探针测的不是吸附开关
// 字 = 折线（2026-10-29 切刀第 2 步）：读辅助几何的键，unit-x 那组线的键以字开头
const keys = () => page.evaluate(() => { const e = globalThis.__catsup.editor; e.draw(); return e.renderer3.auxKeys().filter((k) => k.id === "unit-x").map((k) => `${k.id}=${k.key.split("|")[0]}`).join(","); });
const set = (g, halfH = 4) => page.evaluate(([g, h]) => { const e = globalThis.__catsup.editor; e.setGrid(g); e.cam.halfH = h; }, [g, halfH]);
const IN = 0.0254, FT = 0.3048;
const res = {};
await set({ system: "metric", snap: 0.1 }); res.metric = await keys();
await set({ system: "metric", snap: 0.1 }, 0.4); res.zoomIn = await keys();      // 拉近：10 cm 那层
await set({ system: "metric", snap: 0.1 }, 400); res.zoomOut = await keys();     // 拉远：100 m 那层
await set({ system: "metric", snap: 1 }, 0.4); res.snapFloor = await keys();     // 吸附 1 m：拉近也不画比 1 m 细的
await set({ system: "imperial", snap: IN }, 4); res.ft = await keys();
await set({ system: "dnd", snap: FT }, 40); res.dndFar = await keys();           // D&D 拉远：50 ft（10 格）
await set({ system: "metric", snap: 0.1, shown: false }, 4); res.hidden = await keys();
await set({ system: "metric", snap: 0.1, shown: true }, 4); res.back = await keys();
// 有东西了标记就不要了（user「有东西了之后1m就可以不要了。它只是空场景帮你防呆的」）
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.commitOp({ op: "addEdges", segs: [[{ x: 3, y: 3, z: 0 }, { x: 4, y: 3, z: 0 }]] }); });
res.withGeom = await keys();
await page.evaluate(() => globalThis.__catsup.editor.undo());
res.emptyAgain = await keys();
console.log(JSON.stringify(res));
const ok = res.metric === "unit-x=1 m" && res.zoomIn === "unit-x=10 cm" && res.zoomOut === "unit-x=100 m" && res.snapFloor === "unit-x=1 m" && res.ft === "unit-x=1 ft" && res.dndFar === "unit-x=50 ft"
  && res.hidden === "" && res.back === "unit-x=1 m" && res.withGeom === "" && res.emptyAgain === "unit-x=1 m";
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

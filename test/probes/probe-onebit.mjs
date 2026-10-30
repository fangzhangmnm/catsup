// 1-bit 压测（2026-10-29 Claude Opus 5.5；user 10-29「到时候1bit也加进来压测」，账本 T124）：1-bit 画风下画布上只许有两种颜色（墨 / 纸）。
// 所有按主分辨率画的东西都在小图里、被描边那遍最后一步抖成两色；第三种颜色 = 有东西没进小图（以前叠加层那一遍就会这样露馅）。
// 场景同 probe-pixel-blocks：空场景（网格 / 三色轴 / 1 m）/ 盒子全选 / 变换 gizmo / 网格体全选 / X 光。读 WebGL 画布本身（DOM 不进来）。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, r3 = e.renderer3, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const c = document.querySelector("canvas"), gl = c.getContext("webgl2") ?? c.getContext("webgl");
  const colors = (label) => {
    e.draw();
    const w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const seen = new Map();
    for (let i = 0; i < px.length; i += 4) { const k = (px[i] << 16) | (px[i + 1] << 8) | px[i + 2]; seen.set(k, (seen.get(k) ?? 0) + 1); }
    const top = [...seen].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, n]) => `#${k.toString(16).padStart(6, "0")}×${n}`);
    return { label, n: seen.size, top };
  };
  r3.setPreset("onebit"); e.setGrid({ on: false }); e.cam.setView("iso"); e.cam.target = P(0.5, 0, 0);
  const out = [colors("空场景（网格 / 三色轴 / 1 m）")];
  const at = e.activePool();
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.zoomExtents(); e.selectAll(); await sleep(30); out.push(colors("盒子全选"));
  globalThis.__catsup.hud.pick("transform"); await sleep(30); out.push(colors("变换工具（gizmo）"));
  globalThis.__catsup.hud.pick("select"); e.deselectAll(); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.selectAll(); await sleep(30); out.push(colors("网格体全选（顶点小点 + 选中点）"));
  e.setXray(true); await sleep(30); out.push(colors("X 光（面点）"));
  return out;
});
for (const r of res) console.log(`  ${r.n === 2 ? "✓" : "✗"} ${r.label}：${r.n} 种颜色 [${r.top.join(" ")}]`);
const ok = res.every((r) => r.n === 2) && !errs.length;
if (errs.length) console.log("errors:", errs.slice(0, 3));
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

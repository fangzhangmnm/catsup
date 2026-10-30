// 整格尺子（2026-10-29 Claude Opus 5.5；窄接口设计稿 §7.1、账本 T124）：像素描边 ×3 下，画布上每一个 3×3 的块都必须是同一个颜色——
// 不成整格 = 有东西没按主分辨率画（以前的叠加层那一遍就是这么露馅的：user「被选中的点和线还在走overlay」）。
// 场景：空场景（网格 + 三色轴 + 「1 m」折线字）/ 盒子全选 / 拿着变换工具（gizmo）/ 网格体里全选（顶点小点 + 选中点）/ X 光（面点）。读的是 WebGL 画布本身（不是页面截图，DOM 不进来）。
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
  /** 数不成整格（3×3 里有不同色）的块：先找对齐（9 种偏移里整格最多的那种）。 */
  const blocks = (label) => {
    e.draw();
    const w = c.width, h = c.height, px = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
    const same = (i, j) => Math.abs(px[i] - px[j]) + Math.abs(px[i + 1] - px[j + 1]) + Math.abs(px[i + 2] - px[j + 2]) <= 6;
    let best = null;
    for (let oy = 0; oy < 3; oy++) for (let ox = 0; ox < 3; ox++) {
      let bad = 0;
      for (let y = oy; y + 3 <= h; y += 3) for (let x = ox; x + 3 <= w; x += 3) { const i0 = (y * w + x) * 4; let ok = true; for (let j = 0; j < 3 && ok; j++) for (let k = 0; k < 3; k++) if (!same(i0, ((y + j) * w + x + k) * 4)) { ok = false; break; } if (!ok) bad++; }
      if (best === null || bad < best) best = bad;
    }
    return { label, bad: best, native: r3.nativeIds(), late: r3.lateIds() };
  };
  r3.setPreset("pixelOutline"); r3.setScreen?.("pixel3"); e.setGrid({ on: false }); e.cam.setView("iso"); e.cam.target = P(0.5, 0, 0);
  const out = [blocks("空场景（网格 / 三色轴 / 1 m）")];
  const at = e.activePool();
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.zoomExtents(); e.selectAll(); await sleep(30); out.push(blocks("盒子全选"));
  globalThis.__catsup.hud.pick("transform"); await sleep(30); out.push(blocks("变换工具（gizmo）"));
  globalThis.__catsup.hud.pick("select"); e.deselectAll(); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  e.selectAll(); await sleep(30); out.push(blocks("网格体全选（顶点小点 + 选中点）"));
  e.setXray(true); await sleep(30); out.push(blocks("X 光（面点）"));
  return out;
});
for (const r of res) console.log(`  ${r.bad === 0 && !r.native.length && !r.late.length ? "✓" : "✗"} ${r.label}：不成整格的块 ${r.bad}；原分辨率 [${r.native.join(", ")}]；排在后处理之后 [${r.late.join(", ")}]`);
const ok = res.every((r) => r.bad === 0 && !r.native.length && !r.late.length) && !errs.length;
if (errs.length) console.log("errors:", errs.slice(0, 3));
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

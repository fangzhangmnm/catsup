// 拖动预演每一帧都要真的重画（2026-10-27 Claude Opus 5.5；user「硬表面建模在拖动矩形的时候显示也不对，有退化」「move的显示也有问题」）：
// v0.15.14 起预演影子同一个对象每帧倒回复用，编辑器按对象身份缓存合成视图 → 拖动中一直是第一帧 → 渲染器的重建键不变 → 屏幕停在旧帧。
// 这里拖一个矩形走四帧（大 → 小 → 大）：每帧渲染器的池重建键都变、预演世界里新矩形的面积 = 读数；再拖一次移动，键也每帧变。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-preview-refresh.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 800, height: 640 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 2.5; e.draw();
  const r3 = e.renderer3, area = () => { const w = e.liveWorldForTest ? e.liveWorldForTest() : null; return w; };
  e.setTool("rect");
  const a = px(P(0, 0)), frames = [P(1, 1), P(0.3, 0.4), P(1.2, 0.8), P(0.5, 0.5)], out = { keys: [], dims: [], ok: [] };
  fire("pointermove", a.x, a.y, 0); await sleep(20); fire("pointerdown", a.x, a.y, 1);
  for (const f of frames) {
    const s = px(f); for (let k = 0; k < 3; k++) { fire("pointermove", s.x, s.y, 1); await sleep(15); }
    out.keys.push(r3.poolKey);
    // 预演世界里离原点最近的那张新面：外环包围盒 = 读数
    const w = e.liveWorldForProbe();
    const faces = w.faces().map((F) => { const ps = F.outer.vids.map((v) => w.graph.pt(v)); return { w: Math.max(...ps.map((p) => p.x)) - Math.min(...ps.map((p) => p.x)), h: Math.max(...ps.map((p) => p.y)) - Math.min(...ps.map((p) => p.y)) }; });
    out.dims.push(faces.map((d) => `${d.w.toFixed(2)}x${d.h.toFixed(2)}`).join(","));
    out.ok.push(faces.length === 1 && Math.abs(faces[0].w - f.x) < 1e-6 && Math.abs(faces[0].h - f.y) < 1e-6);
  }
  const z = px(frames[frames.length - 1]); fire("pointerup", z.x, z.y, 0); await sleep(60);
  out.committed = e.kernel.faces().length;
  e.setTool("move"); const m0 = px(P(0.5, 0.5)); out.mkeys = [];
  fire("pointermove", m0.x, m0.y, 0); await sleep(20); fire("pointerdown", m0.x, m0.y, 1);
  for (const d of [P(0.8, 0.5), P(0.5, 1.2), P(1.4, 0.9)]) { const s = px(d); for (let k = 0; k < 3; k++) { fire("pointermove", s.x, s.y, 1); await sleep(15); } out.mkeys.push(r3.poolKey); }
  // 拖出去再拖回原处松手 = 拖（不进「再点一下落定」）
  const back = px(P(0.5, 0.5)); for (let k = 0; k < 3; k++) { fire("pointermove", back.x, back.y, 1); await sleep(15); } fire("pointerup", back.x, back.y, 0); await sleep(60);
  out.armedAfterBack = e.isGestureActive();
  return out;
});
await b.close();
res.errs = errs;
const distinct = (a) => new Set(a).size === a.length;
const ok = distinct(res.keys) && res.ok.every(Boolean) && res.committed === 1 && distinct(res.mkeys) && !res.armedAfterBack && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-preview-refresh OK" : "probe-preview-refresh FAIL");
process.exit(ok ? 0 : 1);

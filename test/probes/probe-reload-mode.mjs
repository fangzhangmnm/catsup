// 在网格体里重开模型，工作台跟着回到根上（2026-10-28 Claude Opus 5.5；纪元账本 FM164；user 黑匣子「definition 1 body is "brep", not mesh」）。
// 复现：自由建模里进网格体、拿着挤出 → 重开（loadScene 同一个场景 = 图库里重新打开同一个模型）→ 以前：工作台还是自由建模、人在根（硬表面体）、
// 一点画面就抛。现在：① 工作台 = 硬表面、工具在硬表面的工具里 ② 没有 DRIFT（画之前的兜底没被用上 = 写口里已经对上）③ 在画面上点 / 拖都不抛。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-reload-mode.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 7, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs); };
  const S = () => e.scene, drifts = [], thrown = [];
  const trace0 = e.host.trace; e.host.trace = (t) => { if (t.kind === "drift") drifts.push(t); trace0?.(t); };
  const onErr = (ev) => thrown.push(String(ev.message ?? ev.reason)); window.addEventListener("error", onErr); window.addEventListener("unhandledrejection", onErr);
  e.setGrid({ ...e.grid, on: false }); e.cam.setView("iso"); e.cam.halfH = 3; e.draw();
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const out = { before: { mode: e.mode.id, tool: e.tool } };
  e.setTool("pushpull"); out.before.tool = e.tool;
  e.loadScene(S()); await sleep(30);
  out.after = { mode: e.mode.id, tool: e.tool, depth: e.contextCrumbs().length - 1, fits: e.mode.kinds.includes(S().kindOf(S().defOfContext(e.context))), toolInMode: e.mode.tools.includes(e.tool) };
  // 在画面上点一下、拖一下（以前这里抛「definition 1 body is "brep", not mesh」）
  const s0 = e.cam.angularPx(P(0.5, 0.5, 1), e.vp());
  fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10); fire("pointerup", s0.x, s0.y, 0); await sleep(30);
  fire("pointerdown", s0.x - 40, s0.y - 40, 1); await sleep(10); fire("pointermove", s0.x + 60, s0.y + 50, 1); await sleep(10); fire("pointerup", s0.x + 60, s0.y + 50, 0); await sleep(30);
  out.drifts = drifts; out.thrown = thrown;
  window.removeEventListener("error", onErr); window.removeEventListener("unhandledrejection", onErr);
  return out;
});
await b.close();
res.errs = errs;
const ok = res.before.mode === "freeform" && res.after.mode === "geometry" && res.after.depth === 0 && res.after.fits && res.after.toolInMode
  && res.drifts.length === 0 && res.thrown.length === 0 && errs.length === 0;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "probe-reload-mode OK" : "probe-reload-mode FAIL");
process.exit(ok ? 0 : 1);

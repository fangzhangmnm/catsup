// X 光（纪元账本 DT17 的拾取 + 叠加层两半，2026-10-26 Claude Opus 5.5）：盒子背面那条被正面挡住的底边——
// 关着：选择工具点那里 = 前面的面；开着：= 那条边；画线工具开着 X 光也不穿透（推断不吸背后的东西）；开着时那里的像素变暗（边透过面画出来）；Alt+Z 切换。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, at = e.activePool(), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ on: false });
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] });
  e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.cam.setView("iso"); e.zoomExtents?.(); e.draw(); await sleep(50);
  // 被挡住的那条：底面上离相机最远的角连出去的两条底边之一（取中点被挡的那条）
  const k = e.kernel, eye = e.cam.eyeDir();
  const far = k.vertices().filter((v) => v.z === 0).sort((a, b) => (a.x * eye.x + a.y * eye.y) - (b.x * eye.x + b.y * eye.y))[0];
  const hiddenEdge = [...far.edges].map((id) => k.graph.edge(id)).find((ed) => { const o = k.graph.pt(ed.a === far.id ? ed.b : ed.a); return o.z === 0; });
  const a = k.graph.pt(hiddenEdge.a), bb = k.graph.pt(hiddenEdge.b), mid = P((a.x + bb.x) / 2, (a.y + bb.y) / 2, 0);
  const sp = e.cam.angularPx(mid, e.vp());
  e.setTool("select");
  const pickOff = e.pickAt(sp.x, sp.y);
  const lum = () => { e.draw(); const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl"), dpr = c.width / c.clientWidth; const W = 7, px = new Uint8Array(W * W * 4); gl.readPixels(Math.round(sp.x * dpr) - 3, Math.round(c.height - sp.y * dpr) - 3, W, W, gl.RGBA, gl.UNSIGNED_BYTE, px); let m = 255; for (let i = 0; i < px.length; i += 4) m = Math.min(m, (px[i] + px[i + 1] + px[i + 2]) / 3); return m; };   // 中点周围 7×7 里最暗的（细线不一定压在中点那一个像素上）
  const lumOff = lum();
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "z", code: "KeyZ", altKey: true, bubbles: true })); await sleep(30);
  const on = e.xray, pickOn = e.pickAt(sp.x, sp.y), lumOn = lum();
  e.setTool("line"); const pickLine = e.pickAt(sp.x, sp.y); e.setTool("select");
  e.setXray(false); const pickBack = e.pickAt(sp.x, sp.y);
  const style0 = e.lineStyle; e.setLineStyle(style0 === "thick" ? "pixel" : "thick");   // 另一种线稿风格也透得出来
  const lumOff2 = lum(); e.setXray(true); const lumOn2 = lum(); e.setXray(false); e.setLineStyle(style0);
  return { hiddenEdge: hiddenEdge.id, pickOff, pickOn, pickLine, pickBack, on, lumOff, lumOn, style0, lumOff2, lumOn2 };
});
console.log(JSON.stringify(res));
const ok = res.pickOff.face !== undefined && res.pickOff.edge === undefined && res.on && res.pickOn.edge === res.hiddenEdge
  && res.pickLine.edge === undefined && res.pickBack.edge === undefined && res.lumOn < res.lumOff - 15 && res.lumOn2 < res.lumOff2 - 15 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

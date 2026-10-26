// 坐标轴和面 / 边的交点能吸（2026-10-26，user「轴和面的交点能加入吸附判定吗」「轴和线也一样」）。
// ① 竖墙 x=2（y、z ∈ [−1,1]）被 X 轴从中间穿过 → 光标停在 (2,0,0) 旁 4 px = 吸到 (2,0,0)、「X 轴 × 面」
// ② 地上一条边 (4,−1,0)–(4,2,0) 横跨 X 轴（中点不在轴上）→ 吸到 (4,0,0)、「X 轴 × 边」
// ③ 斜边 (−1,3,1)–(2,3,−2) 穿过 Y 轴 → 吸到 (0,3,0)、「Y 轴 × 边」。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect(), px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons: 0 }));
  e.setGrid({ ...e.grid, on: false });
  const W = [P(2, -1, -1), P(2, 1, -1), P(2, 1, 1), P(2, -1, 1)];
  e.commitOp({ op: "addEdges", segs: W.map((p, i) => [p, W[(i + 1) % 4]]) });
  e.commitOp({ op: "addEdges", segs: [[P(4, -1, 0), P(4, 2, 0)]] });
  e.commitOp({ op: "addEdges", segs: [[P(-1, 3, 1), P(2, 3, -2)]] });   // 过 (0,3,0)，中点 (0.5,3,−0.5) 不在轴上
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.2; e.draw();
  e.setTool("line"); e.cancel(); await sleep(20);
  const probe = async (p) => { const s = px(p); fire("pointermove", s.x + 3, s.y - 3); await sleep(0); const sn = e.snapInfo; return { kind: sn?.kind ?? null, label: sn?.label ?? null, p: sn ? [sn.p.x, sn.p.y, sn.p.z].map((v) => +v.toFixed(4)) : null }; };
  return { face: await probe(P(2, 0, 0)), edge: await probe(P(4, 0, 0)), slant: await probe(P(0, 3, 0)), faces: e.kernel.faces().length };
});
console.log(JSON.stringify(res));
const eq = (a, b2) => JSON.stringify(a) === JSON.stringify(b2);
const ok = res.faces >= 1 && eq(res.face.p, [2, 0, 0]) && res.face.label === "X 轴 × 面" && eq(res.edge.p, [4, 0, 0]) && res.edge.label === "X 轴 × 边"
  && eq(res.slant.p, [0, 3, 0]) && res.slant.label === "Y 轴 × 边" && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

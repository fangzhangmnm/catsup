#!/usr/bin/env node
// probe-gesture-px.mjs —— 手势「动没动」按屏幕像素判，几何只看几何容差：放大时毫米级的东西做得成，缩小时拖几个像素 = 没动。created 2026-11-12 by Claude Opus 5.5
// 起因（user 11-12，做 3D 打印小零件）：工具里写死了「拖过 1 厘米才算动了」（MIN_GESTURE_LEN 等四十来处），1 厘米以下的线、圆、移动、偏移做不出来；
//   反过来缩得很小时一个像素就是一厘米，手抖两个像素就画出一根线。统筹 11-12 定：动没动 = 屏幕像素（gesture-consts.ts gestureMinLen），
//   吸到的 / 取整出来的 / 键入的数 = 只看几何容差（GEOM_MIN_LEN = 内核身份分辨率 3 µm）。守卫 test/gesture-thresholds.test.ts 管「不许再写死」，这里管真手势。
// 做法：吸附关着；一张 4 毫米的方面放在原点，俯视。
//   放大（满屏高约 6 毫米）：画线 1 毫米、画圆半径 1 毫米、整张面移动 1 毫米、偏移往里 0.5 毫米——都要做成。
//   缩小（一个像素约 1 厘米）：同样的四种手势只拖 2 个像素松手——都不许改模型（边数、点的位置不变）。
//   v0.19.71 上放大那一半 4 红（1 厘米以下做不出来）；缩小那一半旧版也是绿的（指针路由本来就把 2 像素当点一下，没走到工具的门槛），留着当回归守卫。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-gesture-px.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);

/** 一次手势：清空 → 4 毫米方面 → 俯视、halfH 定死 → 按 tool 准备 → 从 a 拖到 b（世界坐标；px 给了就改成从 a 往右拖 px 个像素）→ 松手 → 量。 */
const run = (o) => page.evaluate(async (o) => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), R = c.getBoundingClientRect();
  const fire = (t, q, b) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: R.left + q.x, clientY: R.top + q.y, pointerId: 13, pointerType: "mouse", isPrimary: true, button: 0, buttons: b }));
  e.setTool("select"); e.selectAll(); e.deleteSelection(); await sleep(20);
  e.setGrid({ ...e.grid, on: false });
  const w = 0.004; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(w, 0)], [P(w, 0), P(w, w)], [P(w, w), P(0, w)], [P(0, w), P(0, 0)]] });
  e.deselectAll(); e.cam.setView("top"); e.zoomExtents(); e.cam.halfH = o.halfH; e.draw(); await sleep(30);
  const snap = () => { const b = e.sceneRef.brep(e.sceneRef.root).kernel.toBrep(); return { edges: b.edges.length, faces: b.faces.length, verts: b.vertices.map((p) => [p.x, p.y, p.z]) }; };
  if (o.tool === "move") e.selectAll();
  if (o.tool === "offset") { e.selectAll(); }
  const s0 = snap();
  e.setTool(o.tool); await sleep(10);
  const qa = e.cam.project(P(...o.a), e.vp());
  const qb = o.px ? { x: qa.x + o.px, y: qa.y } : e.cam.project(P(...o.b), e.vp());
  const pxPerMm = Math.abs(e.cam.project(P(0.001, 0), e.vp()).x - e.cam.project(P(0, 0), e.vp()).x);
  fire("pointermove", qa, 0); fire("pointerdown", qa, 1); await sleep(10);
  for (let k = 1; k <= 8; k++) { fire("pointermove", { x: qa.x + (qb.x - qa.x) * k / 8, y: qa.y + (qb.y - qa.y) * k / 8 }, 1); await sleep(8); }
  fire("pointerup", qb, 0); await sleep(60);
  e.cancel?.(); await sleep(20);   // 松手后还在等下一点（点两下的工具）= 取消，看有没有落东西
  const s1 = snap();
  return { s0, s1, pxPerMm: Math.round(pxPerMm * 10) / 10, hint: (C.hud?.status?.() ?? "").slice(0, 80) };
}, o);

const xs = (s) => s.verts.map((v) => v[0]);
const maxDist = (s, c) => Math.max(...s.verts.map((v) => Math.hypot(v[0] - c[0], v[1] - c[1])));
const IN = 0.003, OUT = 4;   // 放大：halfH 3 毫米（满屏高 6 毫米）；缩小：halfH 4 米（一个像素约 1 厘米）

console.log("放大（满屏高约 6 毫米）：毫米级的东西做得成");
{
  const r = await run({ tool: "line", halfH: IN, a: [-0.002, -0.001, 0], b: [-0.001, -0.001, 0] });
  check(r.s1.edges === r.s0.edges + 1, `画线 1 毫米（一毫米 ${r.pxPerMm} 像素）→ 多一条边`, `${r.s0.edges} → ${r.s1.edges}  ${r.hint}`);
}
{
  const r = await run({ tool: "circle", halfH: IN, a: [-0.002, 0.002, 0], b: [-0.001, 0.002, 0] });
  const nv = { verts: r.s1.verts.slice(r.s0.verts.length) };
  check(r.s1.edges > r.s0.edges + 3 && nv.verts.length > 3 && Math.abs(maxDist(nv, [-0.002, 0.002]) - 0.001) < 1e-4, "画圆半径 1 毫米 → 多出一圈边、半径 1 毫米", `${r.s0.edges} → ${r.s1.edges}，新点 ${nv.verts.length}  ${r.hint}`);
}
{
  const r = await run({ tool: "move", halfH: IN, a: [0.002, 0.002, 0], b: [0.003, 0.002, 0] });
  check(Math.abs(Math.min(...xs(r.s1)) - 0.001) < 1e-6, "整张面移动 1 毫米 → 左边从 0 挪到 1 毫米", `最小 x ${Math.min(...xs(r.s1))}  ${r.hint}`);
}
{
  const r = await run({ tool: "offset", halfH: IN, a: [0.004, 0.002, 0], b: [0.0035, 0.002, 0] });
  check(r.s1.edges >= r.s0.edges + 4, "偏移往里 0.5 毫米 → 多出一圈边", `${r.s0.edges} → ${r.s1.edges}  ${r.hint}`);
}

console.log("\n缩小（一个像素约 1 厘米）：拖 2 个像素 = 没动");
for (const [tool, a, label] of [["line", [-0.5, -0.5, 0], "画线"], ["circle", [-0.5, 0.5, 0], "画圆"], ["move", [0.002, 0.002, 0], "移动"], ["offset", [0.004, 0.002, 0], "偏移"]]) {
  const r = await run({ tool, halfH: OUT, a, px: 2 });
  const same = r.s1.edges === r.s0.edges && JSON.stringify(r.s1.verts) === JSON.stringify(r.s0.verts);
  check(same, `${label}：拖 2 像素（一毫米 ${r.pxPerMm} 像素）→ 模型不变`, `边 ${r.s0.edges} → ${r.s1.edges}  ${r.hint}`);
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-gesture-px ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

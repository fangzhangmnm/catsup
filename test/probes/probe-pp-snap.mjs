#!/usr/bin/env node
// probe-pp-snap.mjs —— 推拉开着吸附 = 一律取吸附长度的整数倍，和缩放无关；做小零件拉得出来。created 2026-11-12 by Claude Opus 5.5
// 起因（user 11-12，做 3D 打印小零件）：「调成一厘米的吸附的时候…push pull 的时候没法吸附」；真实路径 = 画一个小面 → 适应窗口 → 推拉。
//   查出来两种坏法（v0.19.70）：拖不到 1 厘米 = 一直是 0（手势最短长度写死 1 厘米 + 求解器在面自己平面上的格点把高度按回 0）；
//   拖过 1 厘米 = 拉得出来但只有整格附近几个像素才咬（整格当成孤立的点按像素判，数学就是错的）。统筹 11-12 定的原则：
//   吸到具体东西按屏幕像素判；整格吸附 = 取整 h := s · round(h / s)，对任何 h 都做，结果不随缩放变；两种都在时光标正指着的东西优先。
// 做法：清空 → 画一个小面（4 厘米配 1 厘米吸附、4 毫米配 1 毫米吸附）→ 适应窗口（真的 zoomExtents）→ 推拉。光标放在「锚点沿法线抬高 H」投到屏幕的那一点
//   （这样自由高度正好是 H），读推拉算出来的高度；同一个 H 在适应窗口和缩小 8 倍两种视图下结果要一样（和缩放无关）。
//   H = 0.4 / 1.6 / 2.4 / 2.6 格 → 0 / 2 / 2 / 3 格；0 的时候提示「不到半格」、不长东西；非 0 的时候预演那一行带「整数长度」；
//   适应窗口那一种真松手，量面抬了多高（= 吸附长度的整数倍，拖出 2 毫米这种小高度拉得出来）；按住 Shift = 不取整。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-pp-snap.mjs [url]
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

/** 一次推拉：清空、画面、适应窗口（zoom = 再缩小几倍）、按下、拖到「抬高 H」那一点；release = 真松手。返回推拉算的高度、提示、松手后面的高度。 */
const run = (o) => page.evaluate(async (o) => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), R = c.getBoundingClientRect();
  const fire = (t, q, b) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: R.left + q.x, clientY: R.top + q.y, pointerId: 11, pointerType: "mouse", isPrimary: true, button: 0, buttons: b, shiftKey: o.shift }));
  e.setTool("select"); e.selectAll(); e.deleteSelection(); await sleep(20);
  e.setGrid({ on: true, snap: o.snap });
  const w = o.w; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(w, 0)], [P(w, 0), P(w, w)], [P(w, w), P(0, w)], [P(0, w), P(0, 0)]] });
  e.deselectAll(); e.cam.setView("iso"); e.zoomExtents(); if (o.zoomOut) e.cam.halfH *= o.zoomOut; e.draw(); await sleep(30);
  const a = P(w / 2, w / 2, 0), q0 = e.cam.project(a, e.vp()), qH = e.cam.project(P(w / 2, w / 2, o.H), e.vp()), qFar = { x: q0.x, y: q0.y - 40 };
  const pxPerCell = Math.hypot(e.cam.project(P(w / 2, w / 2, o.snap), e.vp()).y - q0.y, 0);
  e.setTool("pp"); await sleep(10);
  fire("pointermove", q0, 0); fire("pointerdown", q0, 1); await sleep(10);
  for (let k = 1; k <= 5; k++) { fire("pointermove", { x: q0.x, y: q0.y + (qFar.y - q0.y) * k / 5 }, 1); await sleep(8); }   // 先拖出去（手势起来了）
  for (let k = 1; k <= 5; k++) { fire("pointermove", { x: qFar.x + (qH.x - qFar.x) * k / 5, y: qFar.y + (qH.y - qFar.y) * k / 5 }, 1); await sleep(8); }   // 再拖到「抬高 H」那一点
  const h = e.mode.handlers.pp.h, hint = C.hud?.status?.() ?? "";
  let top = null;
  if (o.release) { fire("pointerup", qH, 0); await sleep(60); const zs = e.sceneRef.brep(e.sceneRef.root).kernel.toBrep().vertices.map((p) => p.z); top = Math.max(...zs); }
  else { e.cancelGesture?.(); fire("pointerup", qH, 0); await sleep(20); e.undo?.(); }
  return { h, hint, top, pxPerCell: Math.round(pxPerCell * 10) / 10 };
}, o);

const cells = (x, s) => Math.round((x / s) * 1000) / 1000;
for (const [snap, w, name] of [[0.01, 0.04, "吸附 1 厘米、4 厘米的面"], [0.001, 0.004, "吸附 1 毫米、4 毫米的面"]]) {
  console.log(`\n${name}：画好 → 适应窗口 → 推拉`);
  for (const [H, want] of [[0.4, 0], [1.6, 2], [2.4, 2], [2.6, 3]]) {
    const fit = await run({ snap, w, H: H * snap, release: true, shift: false });
    const far = await run({ snap, w, H: H * snap, release: false, shift: false, zoomOut: 8 });   // 缩小 8 倍（一格十来个像素）：再小，起始高度 0 那个停靠点就落进光标的吸附半径（几个像素）——那是「光标正指着具体东西 = 它优先」，原则如此，不是取整的事
    check(cells(fit.h, snap) === want, `适应窗口（一格 ${fit.pxPerCell} 像素）拖到 ${H} 格 → 取整 ${want} 格`, `实得 ${cells(fit.h, snap)}`);
    check(cells(far.h, snap) === cells(fit.h, snap), `缩小 8 倍（一格 ${far.pxPerCell} 像素）同一个 ${H} 格 → 同样 ${want} 格（和缩放无关）`, `实得 ${cells(far.h, snap)}`);
    if (want === 0) check(/不到半格/.test(fit.hint) && Math.abs(fit.top) < 1e-12, `${H} 格：提示「不到半格」、松手不长东西`, JSON.stringify({ hint: fit.hint, top: fit.top }));
    else check(/整数长度/.test(fit.hint) && Math.abs(cells(fit.top, snap) - want) < 1e-6, `${H} 格：预演那一行带「整数长度」、松手后面抬了 ${want} 格`, JSON.stringify({ hint: fit.hint.slice(0, 80), top: cells(fit.top, snap) }));
  }
  const sh = await run({ snap, w, H: 1.6 * snap, release: true, shift: true });
  check(Math.abs(cells(sh.h, snap) - 1.6) < 0.01 && !/整数长度/.test(sh.hint), "按住 Shift = 不取整（1.6 格就是 1.6 格）", JSON.stringify({ h: cells(sh.h, snap), hint: sh.hint.slice(0, 60) }));
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-pp-snap ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

#!/usr/bin/env node
// probe-grid-snap.mjs —— 整格吸附一律取整（gridSnap 唯一入口）：同一个手势在「适应窗口」和「缩小 3 倍」两种视图下结果一样；按住 Shift = 不取整。created 2026-11-12 by Claude Opus 5.5
// 统筹 11-12 / user 11-13「我当时说的十五应该是十五度就是旋转的话十五度……然后一律取整同意」：10-25 那版「离得近才咬」（屏幕像素吸附圈 / 1.5° 角度窗）作废。
//   推拉那条在 probe-pp-snap；这里钉偏移（长度）、卷尺线模式（长度）、旋转（角度）三种手势。别的工具（旋转矩形 / 移动·缩放·旋转手柄 / 量角器 / 弧）走同一个 gridSnap，
//   数学和「工具不许自己取整」的守卫在 test/grid-snap.test.ts。
// 做法：吸附 1 厘米；画一个 8 厘米的方面；俯视适应窗口（zoom = 1）或再缩小 3 倍；手势的落点按世界坐标算好投到屏幕上（不吸到任何点 / 边）。
//   偏移：从左边往里拖 1.6 格 → 内环在 2 格（0.02 / 0.06）；Shift → 1.6 格（0.016 / 0.064）。0.4 格 → 不偏移（取整得 0，提示「不到半格」）。
//   卷尺：点左边、往里拖 1.6 格 → 平行参考线在 x = 0.02；Shift → x = 0.016。
//   旋转：全选 → 圆心 (0.04, 0.04) → 参考方向 +x → 转到 37° → 转 30°（以前 1.5° 窗外不咬，这里 37° 一律取到 30°）；Shift → 37°。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-grid-snap.mjs [url]（≈ 30 s）
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

/** 一次手势：清空 → 8 厘米方面 → 俯视适应窗口（再缩小 zoomOut 倍（3 倍：再小方面只剩几十个像素，按下的点会被角点 / 中点咬走，那是「具体的东西优先」，不是取整的事））→ 选工具 → 按 steps 依次按下 / 拖 / 抬起（世界坐标）。返回量出来的东西。 */
const run = (o) => page.evaluate(async (o) => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), R = c.getBoundingClientRect();
  const scr = (p) => e.cam.project(P(...p), e.vp());
  const fire = (t, q, b) => c.dispatchEvent(new PointerEvent(t, { bubbles: true, clientX: R.left + q.x, clientY: R.top + q.y, pointerId: 17, pointerType: "mouse", isPrimary: true, button: 0, buttons: b, shiftKey: !!o.shift }));
  e.setTool("select"); e.clearAll(); await sleep(20);   // 连参考线一起清
  e.setGrid({ ...e.grid, on: true, snap: 0.01 });
  const w = 0.08; e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(0, 0), P(w, 0)], [P(w, 0), P(w, w)], [P(w, w), P(0, w)], [P(0, w), P(0, 0)]] });
  e.deselectAll(); e.cam.setView("top"); e.zoomExtents(); if (o.zoomOut) e.cam.halfH *= o.zoomOut; e.draw(); await sleep(30);
  if (o.selectAll) e.selectAll();
  e.setTool(o.tool); await sleep(10);
  let hint = "", liveKind = null, dbg = null;
  for (const st of o.steps) {
    if (st.click) { const q = scr(st.click); fire("pointermove", q, 0); await sleep(8); fire("pointerdown", q, 1); await sleep(8); fire("pointerup", q, 0); await sleep(25); continue; }
    const a = scr(st.from), b = scr(st.to);
    fire("pointermove", a, 0); fire("pointerdown", a, 1); await sleep(10);
    for (let k = 1; k <= 8; k++) { fire("pointermove", { x: a.x + (b.x - a.x) * k / 8, y: a.y + (b.y - a.y) * k / 8 }, 1); await sleep(8); }
    hint = C.hud?.status?.() ?? ""; liveKind = e.currentSnap?.()?.kind ?? null;
    fire("pointerup", b, 0); await sleep(40);
  }
  if (o.moveTo) { const q = scr(o.moveTo); fire("pointermove", q, 0); await sleep(25); hint = C.hud?.status?.() ?? ""; liveKind = e.currentSnap?.()?.kind ?? null; dbg = { shift: e.mods?.shift, gridOn: e.grid.on, eff: e.gridEff, stage: e.handlers?.rotate?.stage }; const q2 = scr(o.moveTo); fire("pointerdown", q2, 1); await sleep(8); fire("pointerup", q2, 0); await sleep(40); }
  const vs = e.sceneRef.brep(e.sceneRef.root).kernel.toBrep().vertices;
  const xs = [...new Set(vs.map((v) => +v.x.toFixed(5)))].sort((p, q) => p - q);
  const guides = e.worldGeom().guides().lines.map((l) => ({ x: +l.p.x.toFixed(5), dirx: +Math.abs(l.dir.x).toFixed(3) }));
  const ang = vs.map((v) => { const a = (Math.atan2(v.y - 0.04, v.x - 0.04) * 180) / Math.PI; return +(((a % 90) + 90) % 90).toFixed(3); });
  const snapKind = liveKind;
  e.cancel?.();
  return { xs, guides, ang: [...new Set(ang)], hint: hint.slice(0, 90), snapKind, dbg };
}, o);

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const L = 0.01;

console.log("偏移：从左边往里拖");
for (const [cells, wantIn, shiftIn] of [[1.6, [0, 0.02, 0.06, 0.08], [0, 0.016, 0.064, 0.08]]]) {
  const steps = [{ from: [0.002, 0.04], to: [cells * L, 0.04] }];
  const fit = await run({ tool: "offset", steps }), far = await run({ tool: "offset", steps, zoomOut: 3 }), sh = await run({ tool: "offset", steps, shift: true });
  check(same(fit.xs, wantIn), `拖 ${cells} 格 → 内环在 2 格（${wantIn.join(" / ")}）`, JSON.stringify(fit.xs));
  check(same(far.xs, fit.xs), "缩小 3 倍：同一个世界距离结果一样（和缩放无关）", JSON.stringify(far.xs));
  check(same(sh.xs, shiftIn), "按住 Shift = 不取整（1.6 格）", JSON.stringify(sh.xs));
}
{
  const z = await run({ tool: "offset", steps: [{ from: [0.002, 0.04], to: [0.004, 0.04] }] });
  check(same(z.xs, [0, 0.08]), "拖 0.4 格 → 取整得 0 = 不偏移", JSON.stringify(z.xs));
}

console.log("\n卷尺线模式：点左边、往里拖");
{
  const steps = [{ from: [0, 0.03], to: [0.016, 0.03] }];
  const fit = await run({ tool: "tape", steps }), far = await run({ tool: "tape", steps, zoomOut: 3 }), sh = await run({ tool: "tape", steps, shift: true });
  const gx = (r) => r.guides.filter((g) => g.dirx === 0).map((g) => g.x);
  check(same(gx(fit), [0.02]), "平行参考线在 x = 0.02（1.6 格 → 2 格）", JSON.stringify(fit.guides));
  check(same(gx(far), gx(fit)), "缩小 3 倍结果一样", JSON.stringify(far.guides));
  check(same(gx(sh), [0.016]), "按住 Shift = 不取整（x = 0.016）", JSON.stringify(sh.guides));
}

console.log("\n旋转：全选，圆心 (0.04, 0.04)，参考 +x，转到 37°");
{
  const r = 0.06, a37 = (37 * Math.PI) / 180;
  const o = { tool: "rotate", selectAll: true, steps: [{ click: [0.04, 0.04] }, { click: [0.04 + r, 0.04] }], moveTo: [0.04 + r * Math.cos(a37), 0.04 + r * Math.sin(a37)] };
  const fit = await run(o), far = await run({ ...o, zoomOut: 3 }), sh = await run({ ...o, shift: true });
  // 方面四个角相对圆心都是 45°（mod 90）；转 θ 之后 = (45 + θ) mod 90
  check(same(fit.ang, [75]), "转了 30°（37° 一律取到 15° 的整数倍；以前 1.5° 窗外原样）", JSON.stringify(fit));
  check(same(far.ang, fit.ang), "缩小 3 倍结果一样", JSON.stringify(far.ang));
  check(same(sh.ang, [82]), "按住 Shift = 不取整（37°）", JSON.stringify(sh.ang));
}

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-grid-snap ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

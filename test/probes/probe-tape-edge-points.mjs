// D25 卷尺从直边起手（栅格开着、正好吸到边的中点 / 端点也算）垂直拉开要出平行线（user 2026-10-25「卷尺当从线和snap开始拉，还是没有出线，出了点。这样不对」「我应该是在直边上拉的尺」）。
// 底边 / 右边 / 斜边上十个起手位置 × 鼠标 / 笔，都往离开边的方向拉：每次都该是一条参考线、零个参考点。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const rows = [];
const starts = [[1.1, 0], [1.03, 0], [1.27, 0], [1.5, 0], [2.0, 0], [0.6, 0], [2.93, 0], [3, 0.7], [3, 1.05], [1.6, 0.8 * 1.6 / 1.6]];   // 最后一个在斜边 (0,0)-(3,2)? 下面单独加
for (const [sx0, sy0] of starts) for (const pen of [false, true]) {
  const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
  await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(1000);
  const box = await page.locator("#board").boundingBox();
  const px = (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
  await page.evaluate(() => { const e = globalThis.__catsup.editor, P = (x, y) => ({ x, y, z: 0 });
    e.commitOp({ op: "addEdges", segs: [[P(0, 0), P(3, 0)], [P(3, 0), P(3, 2)], [P(3, 2), P(0, 2)], [P(0, 2), P(0, 0)], [P(0, 0), P(3, 2)]] });
    e.setGrid({ ...e.grid, on: true, snap: 0.2, plane: "xy" }); globalThis.__catsup.hud.pick("tape"); });
  const onDiag = sx0 === 1.6;
  const A = onDiag ? { x: 1.6, y: 1.6 * 2 / 3, z: 0 } : { x: sx0, y: sy0, z: 0 };
  const T = sy0 === 0 && !onDiag ? { x: A.x, y: 0.83, z: 0 } : sx0 === 3 ? { x: 2.17, y: A.y, z: 0 } : { x: A.x + 0.3, y: A.y - 0.5, z: 0 };
  const a = await px(A), c = await px(T);
  const kindAtStart = async () => page.evaluate(() => { const e = globalThis.__catsup.editor; return e.snapInfo ? `${e.snapInfo.kind}:${e.snapInfo.label ?? ""}` : "none"; });
  if (!pen) {
    await page.mouse.move(box.x + a.x, box.y + a.y, { steps: 3 }); await page.waitForTimeout(100);
    var k0 = await kindAtStart();
    await page.mouse.down(); for (let i = 1; i <= 10; i++) { await page.mouse.move(box.x + a.x + (c.x - a.x) * i / 10, box.y + a.y + (c.y - a.y) * i / 10); await page.waitForTimeout(20); }
    await page.waitForTimeout(250); await page.mouse.up(); await page.waitForTimeout(200);
  } else {
    const ev = (type, x, y, buttons) => page.evaluate(({ type, x, y, buttons }) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 7, pointerType: "pen", clientX: x, clientY: y, isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons, pressure: buttons ? 0.4 : 0 })); }, { type, x, y, buttons });
    var k0 = "pen";
    await ev("pointerdown", box.x + a.x, box.y + a.y, 1); for (let i = 1; i <= 10; i++) { await ev("pointermove", box.x + a.x + (c.x - a.x) * i / 10, box.y + a.y + (c.y - a.y) * i / 10, 1); await page.waitForTimeout(20); }
    await page.waitForTimeout(250); await ev("pointerup", box.x + c.x, box.y + c.y, 0); await page.waitForTimeout(200);
  }
  const g = await page.evaluate(() => { const g = globalThis.__catsup.editor.worldGeom().guides(); return { lines: g.lines.length, points: g.points.length }; });
  rows.push(`${pen ? "pen  " : "mouse"} start(${A.x.toFixed(2)},${A.y.toFixed(2)}) hoverSnap=${k0.padEnd(22)} → lines=${g.lines} points=${g.points} ${g.lines === 1 ? "ok" : "BAD"}`);
  await page.close();
}
console.log(rows.join("\n"));
const ok = rows.every((r) => r.endsWith(" ok"));
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

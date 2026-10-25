// 笔双击 / 三击：跟进的那几下滑一点也照样算连击（user 2026-10-25「笔的时候双击三击的防抖太严厉了，稍微滑一点也不行」「建议是做一个笔手势的深模块。
// 第一下快速点的时候后面双击阈值内会对滑动还是点击的判断有偏向」）。点按族 = src/editor/tap-train.ts。
// 场景：2 m 盒子，选择工具，笔点前面那张面：单击 = 1 面；双击（第二下滑 8）= 1 面 + 4 边；三击（每下都滑）= 6 面 12 边；第一下就滑 30 = 框选（不是点）；
// 鼠标第二下滑 8 仍是拖（鼠标规矩不变）。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const cases = [
  { name: "pen 单击", kind: "pen", taps: [[0, 0]], want: { faces: 1, edges: 0 } },
  { name: "pen 双击·第二下滑 8", kind: "pen", taps: [[0, 0], [8, 0]], want: { faces: 1, edges: 4 } },
  { name: "pen 双击·两下都滑（3 / 10）", kind: "pen", taps: [[3, 0], [0, 10]], want: { faces: 1, edges: 4 } },
  { name: "pen 三击·每下都滑", kind: "pen", taps: [[2, 1], [7, -5], [-6, 7]], want: { faces: 6, edges: 12 } },
  { name: "mouse 双击·第二下滑 8 = 拖", kind: "mouse", taps: [[0, 0], [8, 0]], want: { faces: 0, edges: 0 } },
  { name: "mouse 双击·不滑", kind: "mouse", taps: [[0, 0], [0, 0]], want: { faces: 1, edges: 4 } },
];
const rows = [];
for (const c of cases) {
  const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
  const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
  await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1000);
  await page.evaluate(() => {
    const e = globalThis.__catsup.editor; e.setGrid({ on: false });
    const P = (x, y, z = 0) => ({ x, y, z }); const S = 2, H = 1.5;
    const loops = [[P(0, 0), P(S, 0), P(S, S), P(0, S)], [P(0, 0), P(S, 0), P(S, 0, H), P(0, 0, H)], [P(S, 0), P(S, S), P(S, S, H), P(S, 0, H)], [P(S, S), P(0, S), P(0, S, H), P(S, S, H)], [P(0, S), P(0, 0), P(0, 0, H), P(0, S, H)]];
    for (const l of loops) e.commitOp({ op: "addEdges", segs: l.map((p, i) => [p, l[(i + 1) % l.length]]) });
    globalThis.__catsup.hud.pick("select"); e.draw();
  });
  const box = await page.locator("#board").boundingBox();
  const q = await page.evaluate(() => { const e = globalThis.__catsup.editor; return e.cam.angularPx({ x: 1, y: 0, z: 0.75 }, e.vp()); });
  const A = [box.x + q.x, box.y + q.y];
  const ev = (type, [x, y], buttons) => page.evaluate(({ type, x, y, buttons, kind }) => { const el = document.elementFromPoint(x, y); el.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: kind === "mouse" ? 1 : 7, pointerType: kind, clientX: x, clientY: y, isPrimary: true, button: type === "pointermove" ? -1 : 0, buttons, pressure: buttons ? 0.4 : 0 })); }, { type, x, y, buttons, kind: c.kind });
  const w = (ms) => page.waitForTimeout(ms);
  for (const [dx, dy] of c.taps) {
    const end = [A[0] + dx, A[1] + dy];
    await ev("pointermove", A, 0); await ev("pointerdown", A, 1); await w(30);
    if (dx || dy) { await ev("pointermove", [A[0] + dx / 2, A[1] + dy / 2], 1); await ev("pointermove", end, 1); }
    await w(30); await ev("pointerup", end, 0); await w(90);
  }
  const got = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { faces: e.selection.faces.size, edges: e.selection.edges.size }; });
  rows.push({ name: c.name, got, want: c.want, errs, ok: got.faces === c.want.faces && got.edges === c.want.edges && !errs.length });
  await page.close();
}
for (const r of rows) console.log(`${r.ok ? "ok  " : "FAIL"} ${r.name.padEnd(28)} faces=${r.got.faces} edges=${r.got.edges}（要 ${r.want.faces} / ${r.want.edges}）${r.errs.length ? " ERR " + r.errs[0] : ""}`);
const ok = rows.every((r) => r.ok);
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

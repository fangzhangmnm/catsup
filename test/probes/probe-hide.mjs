// 隐藏 / 全部显示（DT49，user 2026-10-25「然后 hide unhide all也马上需要了」「嗯线和面也可以hidden，这样可以挖洞看里面」）：
// 大盒里放一个组件 → 选大盒前墙 H = 挖洞看见里面的组件 → 那面点不中 → 选组件 H → 空白处右键「全部显示（N）」→ Alt+H 全放回 → Ctrl+Z 一步回到藏着。SHOT=前缀 截图。
// created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const st = () => page.evaluate(() => { const e = globalThis.__catsup.editor, v = e.worldGeom(), c = e.hiddenCount(); return { faces: v.faces().length, slots: v.slots.length, hidden: c }; });
await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", segs }); };
  box(-0.4, -0.4, 0.2, 0.4, 0.4, 1); e.selectAll(); e.makeComponent("里面");
  e.cancel(); box(-2, -2, 0, 2, 2, 2);
  e.cam.setView("front"); e.zoomExtents();
  e.setTool("select");
});
const s0 = await st();
// 选前墙（y = -2 那面）→ H
const wallHit = await page.evaluate(() => { const e = globalThis.__catsup.editor, p = e.cam.angularPx({ x: 1.5, y: -2, z: 1.5 }, e.vp()), h = e.pickAt(p.x, p.y); e.cancel(); e.selectExpand(h, 0); return { faces: [...e.selection.faces].length, p, face: [...e.selection.faces][0] }; });
await page.keyboard.press("h"); await page.waitForTimeout(100);
const s1 = await st();
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-hole.png` });
// 同一处再点：点到的是洞后面的面（侧墙 / 后墙的里面），不是藏起来的前墙
const throughHole = await page.evaluate(({ p, face }) => { const e = globalThis.__catsup.editor, h = e.pickAt(p.x, p.y); e.cancel(); e.selectExpand(h, 0); const f = [...e.selection.faces][0]; const y = f !== undefined ? e.kernel.faceRings3(f)?.outer.map((q) => q.y) : null; e.cancel(); return { same: f === face, ys: y ? [...new Set(y.map((v) => +v.toFixed(3)))] : null }; }, wallHit);
// 选里面的组件 → H
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cancel(); const def = e.sceneRef.def(e.sceneRef.root); const i = [...def.instances.values()][0]; e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); });
await page.keyboard.press("h"); await page.waitForTimeout(100);
const s2 = await st();
// 2026-10-30：「全部显示」从视图窗口搬到空白处的右键菜单（user「全部显示在右键菜单就行了，没必要进视图菜单」）——找一处什么都点不中的地方右键
const emptyAt = await page.evaluate(() => { const e = globalThis.__catsup.editor; e.cancel(); const vp = e.vp(); for (const [fx, fy] of [[0.5, 0.12], [0.85, 0.2], [0.15, 0.85], [0.5, 0.9], [0.9, 0.85]]) { const x = vp.w * fx, y = vp.h * fy, h = e.pickAt(x, y); if (h.face === undefined && h.edge === undefined && h.vertex === undefined) return { x, y }; } return null; });
const bb = await page.locator("#board").boundingBox();
if (emptyAt) await page.mouse.click(bb.x + emptyAt.x, bb.y + emptyAt.y, { button: "right" });
await page.waitForTimeout(150);
const menuLabel = await page.evaluate(() => [...document.querySelectorAll(".popup-menu .menu-label")].map((x) => x.textContent?.trim()).find((t) => t?.startsWith("全部显示")) ?? null);
await page.keyboard.press("Escape");
await page.keyboard.press("Alt+KeyH"); await page.waitForTimeout(100);
const s3 = await st();
await page.keyboard.press("Control+z"); await page.waitForTimeout(100);
const s4 = await st();
const res = { s0, wallFaces: wallHit.faces, s1, throughHole, s2, menuLabel, s3, s4 };
console.log(JSON.stringify(res));
const ok = wallHit.faces === 1 && s1.hidden.faces === 1 && s1.faces === s0.faces - 1 && !throughHole.same && throughHole.ys !== null && !(throughHole.ys.length === 1 && throughHole.ys[0] === -2) && menuLabel === "全部显示（2）" && s2.hidden.instances === 1 && s2.slots === s0.slots - 1
  && s3.hidden.faces === 0 && s3.hidden.instances === 0 && s3.faces === s0.faces && s4.hidden.faces === 1 && s4.hidden.instances === 1 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

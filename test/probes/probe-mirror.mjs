// 镜像界面（DT23 / DT26）：选区 → 「镜像…」→ 马前炮会话 + 镜像面 gizmo + 预演 → 拖法线箭头 → 应用 → 马后炮改选项（撤销重做）。
// user 2026-10-25「你选中，右键mirror之后，会弹出一个对话框。然后同时有一个gizmos确定mirror的轴。拖动gizmos可以snap……」「参数小窗……同意」。SHOT=前缀 截图。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const xs = () => page.evaluate(() => { const v = globalThis.__catsup.editor.kernel.vertices().map((p) => +p.x.toFixed(4)); return [Math.min(...v), Math.max(...v), globalThis.__catsup.editor.kernel.faces().length]; });

const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[-0.5, 0], [2, 0], [2, 1], [-0.5, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  e.selectAll(); e.zoomExtents(); e.cam.halfH *= 1.6;
  globalThis.__catsup.hud.pick("mirror");
  const pp = e.paramPanel();
  return { active: e.mirrorActive(), phase: pp?.phase ?? null, title: pp?.title ?? null, fields: pp?.fields.map((f) => f.key) ?? [], previewFaces: e.liveWorld().vertices().length > 0 };
});
// 拖法线箭头（推）：箭头尖 = 原点 + 法线 × 1.3 × 方块半边长（64 px 换成世界长度）
const push = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, g = e.gizmo.g, vp = e.vp(), cam = e.cam;
  const n = g.normal, ref = Math.abs(n.z) < 0.9 ? { x: 0, y: 0, z: 1 } : { x: 1, y: 0, z: 0 };
  const cx = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  let u = cx(ref, n); const ul = Math.hypot(u.x, u.y, u.z); u = { x: u.x / ul, y: u.y / ul, z: u.z / ul };
  const a = cam.angularPx(g.origin, vp), b2 = cam.angularPx({ x: g.origin.x + u.x, y: g.origin.y + u.y, z: g.origin.z + u.z }, vp);
  const size = 64 / Math.hypot(a.x - b2.x, a.y - b2.y);
  const tip = { x: g.origin.x + n.x * size * 1.3, y: g.origin.y + n.y * size * 1.3, z: g.origin.z + n.z * size * 1.3 };
  return { tip: cam.angularPx(tip, vp), far: cam.angularPx({ x: tip.x + 0.6, y: tip.y, z: tip.z }, vp) };
});
await page.mouse.move(box.x + push.tip.x, box.y + push.tip.y); await page.waitForTimeout(80);
const hot = await page.evaluate(() => globalThis.__catsup.editor.gizmo.hot);
await page.mouse.down();
for (let i = 1; i <= 8; i++) { await page.mouse.move(box.x + push.tip.x + (push.far.x - push.tip.x) * i / 8, box.y + push.tip.y + (push.far.y - push.tip.y) * i / 8); await page.waitForTimeout(16); }
const dragged = await page.evaluate(() => +globalThis.__catsup.editor.gizmo.g.origin.x.toFixed(3));
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-drag.png` });
await page.mouse.up();
// 挪回原点再应用（按钮 = 参数小窗里的「应用」）
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.gizmo.g = { origin: { x: 0, y: 0, z: 0 }, normal: { x: 1, y: 0, z: 0 } }; e.refreshCmdPreview(); });
if (process.env.SHOT) await page.screenshot({ path: `${process.env.SHOT}-before.png` });
await page.locator("#vcb button", { hasText: "应用" }).first().click(); await page.waitForTimeout(200);
const applied = await xs();
const after = await page.evaluate(() => { const pp = globalThis.__catsup.editor.paramPanel(); return { active: globalThis.__catsup.editor.mirrorActive(), phase: pp?.phase ?? null }; });
await page.evaluate(() => globalThis.__catsup.editor.setParam("deleteOpposite", false));
const redone = await xs();
const res = { setup, hot, dragged, applied, after, redone };
console.log(JSON.stringify(res));
const ok = setup.active && setup.phase === "before" && setup.title === "镜像" && setup.fields.includes("mergeSeam") && hot === "push" && dragged > 0.05
  && applied[0] === -2 && applied[1] === 2 && applied[2] === 6 && !after.active && after.phase === "after" && redone[0] === -2 && redone[2] > 6 && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

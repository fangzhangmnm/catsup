// 轴工具「只设原点」（默认）+ 组件换轴（user 2026-10-25「刚才失败的那个是有instanced的object我动轴」「轴工具能不能不设置方向，就设置点」「默认是只设置点」）。
// 两份盒子组件 → 进第一份 → 轴工具点顶面一角：原点落在那个角、朝向不变、世界几何不动、不报错。created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const box = await page.locator("#board").boundingBox();
const px = async (p) => page.evaluate((p) => { const e = globalThis.__catsup.editor; return e.cam.angularPx(p, e.vp()); }, p);
const worldKey = () => page.evaluate(() => globalThis.__catsup.editor.liveWorld().vertices().map((v) => `${v.x.toFixed(5)},${v.y.toFixed(5)},${v.z.toFixed(5)}`).sort().join("|"));

const setup = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  e.selectAll(); e.makeComponent("盒"); e.cancel();
  const s = e.sceneRef, def = [...s.defs.keys()].find((id) => id !== s.root);
  e.commitOp({ op: "placeInstance", at: { def: s.root, group: null }, definition: def, xform: [1, 0, 0, 2.5, 0, 1, 0, 0, 0, 0, 1, 0] });
  const ids = [...s.def(s.root).instances.values()].map((i) => i.id);
  e.enterPool({ kind: "instance", instance: ids[0] });
  e.zoomExtents(); e.cam.halfH *= 1.6;
  globalThis.__catsup.hud.pick("axes");
  return { mode: e.config.get("axes", "mode"), depth: e.contextDepth() };
});
const before = await worldKey();
const corner = await px({ x: 1, y: 1, z: 1 });
await page.mouse.move(box.x + corner.x + 3, box.y + corner.y + 2); await page.mouse.move(box.x + corner.x, box.y + corner.y); await page.waitForTimeout(120);
await page.mouse.down(); await page.mouse.up(); await page.waitForTimeout(250);
const after = await page.evaluate(() => { const e = globalThis.__catsup.editor, f = e.contextFrame(); return { o: [f.origin.x, f.origin.y, f.origin.z].map((v) => +v.toFixed(5)), x: [f.x.x, f.x.y, f.x.z].map((v) => +v.toFixed(5)), hint: document.querySelector("#hint")?.textContent ?? "", capsule: !!document.querySelector(".error-capsule:not([hidden])") }; });
const same = (await worldKey()) === before;
const res = { setup, after, same };
console.log(JSON.stringify(res));
const ok = setup.mode === "point" && setup.depth === 1 && JSON.stringify(after.o) === "[1,1,1]" && JSON.stringify(after.x) === "[1,0,0]" && same && !after.capsule && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

// 建组件马后炮选原点（user 2026-10-25「建立组件的时候能不能马后炮选择一下轴的居中模式」）+ 一步撤完（「*6 /6的时候undo不对」同一处根因）。
// 方块 (1..3, 1..2, 0..1) → 建组件 → 小窗「建组件」→ 原点 = 包围盒中心 → 定义里的几何以原点为中心、世界不动 → 撤销一次 = 回到散几何、小窗关。
// created 2026-10-25 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(() => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const B = [[1, 1], [3, 1], [3, 2], [1, 2]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], c = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(c[0], c[1], 0)]); segs.push([P(a[0], a[1], 1), P(c[0], c[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.commitOp({ op: "addEdges", segs });
  const worldBox = () => { const v = e.worldGeom().slots.flatMap((sl, i) => [...e.worldGeom().parts[i].verts.values()]); const r = (k) => [Math.min(...v.map((p) => p[k])), Math.max(...v.map((p) => p[k]))].map((x) => +x.toFixed(6)); return [r("x"), r("y"), r("z")].join(" "); };
  const before = worldBox(), loose0 = e.kernel.faces().length;
  e.selectAll();
  e.makeComponent("块");
  const pp = e.paramPanel();
  const out = { before, title: pp?.title, phase: pp?.phase, origin0: pp?.values.origin };
  e.setParam("origin", "center");
  const s = e.scene, defId = [...s.defs.keys()].find((id) => id !== s.root);
  const vs = defId ? s.kernelOf({ def: defId, group: null }).vertices() : [];
  const mid = (k) => +((Math.min(...vs.map((p) => p[k])) + Math.max(...vs.map((p) => p[k]))) / 2).toFixed(6);
  out.defCentered = vs.length > 0 && mid("x") === 0 && mid("y") === 0 && mid("z") === 0;
  out.worldSame = worldBox() === before;
  out.looseAfter = e.kernel.faces().length;
  e.setParam("origin", "bottom");
  const vs2 = s.kernelOf({ def: defId, group: null }).vertices ? e.scene.kernelOf({ def: [...e.scene.defs.keys()].find((id) => id !== e.scene.root), group: null }).vertices() : [];
  out.bottomZ0 = vs2.length > 0 && +Math.min(...vs2.map((p) => p.z)).toFixed(6) === 0;
  out.worldSame2 = worldBox() === before;
  e.undo();
  out.undoOnceLoose = e.kernel.faces().length === loose0 && [...e.scene.defs.keys()].length === 1;
  out.panelClosed = e.paramPanel() === null;
  return out;
});
console.log(JSON.stringify(res));
const ok = res.title === "建组件" && res.phase === "after" && res.origin0 === "bottom" && res.defCentered && res.worldSame && res.looseAfter === 0 && res.bottomZ0 && res.worldSame2 && res.undoOnceLoose && res.panelClosed && !errs.length;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

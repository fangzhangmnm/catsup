// 恢复层级（纪元账本 DT99，v0.14.64）：根上散着 3 个一样的盒子（一个转过 30°）+ 1 个不一样的 + 一个组件「两盒」（里面 2 个一样的盒子）
// → 菜单计数 > 0 → 跑（含子物件）→ 根上 3 盒 = 一个组件 3 份、不一样的那个 = 组；「两盒」里面 = 2 份实例；世界里的点不变；撤销一步回原样。
// 再量大场景（400 个盒子）上菜单的便宜数法和真跑各要多久。created 2026-10-26 by Claude Opus 5.5
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
const res = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, P = (x, y, z = 0) => ({ x, y, z });
  e.setGrid({ ...e.grid, on: false });
  const root = () => e.activePool();
  /** 一个盒子：底面矩形（绕 (cx, cy) 转 a）+ 推拉 h。 */
  const box = (cx, cy, w, d, h, a = 0) => {
    const c = Math.cos(a), s = Math.sin(a), q = (x, y) => P(cx + x * c - y * s, cy + x * s + y * c);
    const pts = [q(0, 0), q(w, 0), q(w, d), q(0, d)];
    e.commitOp({ op: "addEdges", segs: pts.map((p, i) => [p, pts[(i + 1) % 4]]) });
    const k = e.kernel, f = k.faces().find((F) => { const o = k.faceRings3(F.id).outer; return o.length === 4 && o.every((p) => Math.abs(p.z) < 1e-9) && pts.every((p) => o.some((r) => Math.hypot(r.x - p.x, r.y - p.y) < 1e-6)); });
    e.commitOp({ op: "pushpull", at: root(), face: k.faceRings3(f.id).outer, dist: h });
  };
  // 组件「两盒」：先画两个一样的盒子，全选建组件
  box(20, 0, 1, 2, 0.5); box(23, 0, 1, 2, 0.5);
  e.selectAll(); e.makeComponent("两盒"); e.cancel();
  box(0, 0, 1, 2, 0.5); box(3, 0, 1, 2, 0.5); box(6, 1, 1, 2, 0.5, Math.PI / 6); box(0, 6, 2, 2, 1);
  const pts0 = C.editor.sceneRef.pointsOfDef(C.editor.sceneRef.root).length;
  await new Promise((r) => setTimeout(r, 200));
  const cand = e.repairMenuCount("brep.hierarchy");
  const n = e.repair("brep.hierarchy");
  const s = e.sceneRef, rootDef = s.def(s.root);
  const twoBox = [...s.defs.values()].find((d) => d.name === "两盒");
  const comps = [...s.defs.values()].filter((d) => /^零件 \d+$/.test(d.name));
  const out = {
    cand, n, hint: document.querySelector("#hint")?.textContent ?? "",
    rootInst: [...rootDef.instances.values()].map((i) => s.def(i.def).name).sort(),
    rootGroups: s.brep(s.root).groups.size, rootFaces: s.brep(s.root).kernel.faces().length,
    twoBoxInst: [...twoBox.instances.values()].map((i) => s.def(i.def).name), twoBoxFaces: s.brep(twoBox.id).kernel.faces().length,
    comps: comps.map((d) => d.name), pts: s.pointsOfDef(s.root).length, pts0,
  };
  e.undo();
  const s2 = e.sceneRef;
  out.undo = { defs: s2.defs.size, rootFaces: s2.brep(s2.root).kernel.faces().length, groups: s2.brep(s2.root).groups.size };
  // 大场景：400 个盒子（一半转过），量便宜数法 + 真跑
  e.commitOp({ op: "clearGuides", at: root() });
  for (let i = 0; i < 20; i++) for (let j = 0; j < 20; j++) box(40 + i * 3, j * 3, 1, 2, 0.5, (i + j) % 2 ? Math.PI / 6 : 0);
  let t = performance.now(); e.repairMenuCount("brep.hierarchy"); out.bigCandMs = Math.round(performance.now() - t);
  t = performance.now(); const nb = e.repair("brep.hierarchy"); out.bigRepairMs = Math.round(performance.now() - t); out.bigN = nb;
  out.bigRootInst = e.sceneRef.def(e.sceneRef.root).instances.size;
  return out;
});
console.log(JSON.stringify(res));
const rc = res.rootInst.filter((n) => n !== "两盒");
const ok = res.cand > 0 && res.n === 6
  && res.rootInst.includes("两盒") && rc.length === 3 && new Set(rc).size === 1 && /^零件 \d+$/.test(rc[0]) && res.rootGroups === 1 && res.rootFaces === 0
  && res.twoBoxInst.length === 2 && new Set(res.twoBoxInst).size === 1 && res.twoBoxInst[0] !== rc[0] && res.twoBoxFaces === 0 && res.pts === res.pts0
  && /整理了 6 块/.test(res.hint) && res.undo.rootFaces === 6 * 4 && res.undo.groups === 0
  && res.bigRootInst >= 400 && res.bigCandMs < 300;
console.log(errs.length ? "PAGEERRORS:\n" + errs.join("\n") : "(no page errors)"); console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

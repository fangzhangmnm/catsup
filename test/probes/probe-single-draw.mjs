// 一条线只画一遍（2026-10-29 Claude Opus 5.5；Fable 元规则「一遍」，账本 T124 收紧）：
// ① 粗线（实例化）模式下选中的边：底线那份的旗里被标记的全是 -1（着色器收成零宽），只由标记那份画；取消选择后底线换回共享块。
// ② 自由建模里被悬停的软边：软边淡线那组里没有它、线块外那组也没有（只由线块里的标记画）。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);
const r = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, r3 = e.renderer3, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((res) => setTimeout(res, ms)), at = e.activePool();
  r3.setLineWeight(2);   // 粗线（实例化）那条路
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  e.cam.setView("iso"); e.zoomExtents();
  const own = () => { for (const n of r3.slotNodes.values()) if (n.thickOwn) { const f = n.thickOwn.flag.array, c = n.thickOwn.geo.instanceCount; let hid = 0; for (let i = 0; i < c; i++) if (f[i] < -0.5) hid++; return { hid, count: c, usesOwn: n.thick.geometry === n.thickOwn.geo }; } return null; };
  e.selectAll(); e.draw(); const selAll = own();
  e.deselectAll(); e.draw(); const none = own();
  // ② 网格体里的软边：标平滑、悬停它
  e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0];
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const d = [...s.defs.values()].find((x) => x.body.kind === "mesh"), m = d.body.kernel, e0 = m.edges().find((x) => m.eFaces(x).length === 2);
  e.commitOp({ op: "meshEdgeMarks", def: d.id, edges: [e0], mark: "smooth" }); e.draw();
  const softBefore = r3.auxKeys().find((k) => k.id === "soft")?.key ?? null;
  // v0.18.7 起软边也进线块（外轮廓要沿软边走）→ 悬停的软边由「标记」画，不再走线块外那组 edgeSel；这里验的是「一遍」：淡线组里没有它、线块外那组也没有，而画面确实变了（2026-11-04 Opus 5.5）
  const px = () => { e.draw(); const c = document.getElementById("board"), gl = c.getContext("webgl2") ?? c.getContext("webgl"), w = c.width, h = c.height, a = new Uint8Array(w * h * 4); gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, a); return a; };
  const before = px(); e.hoverEdge = e0; const after = px();
  let changed = 0; for (let i = 0; i < before.length; i += 4) if (before[i] !== after[i] || before[i + 1] !== after[i + 1] || before[i + 2] !== after[i + 2]) changed++;
  const softHot = r3.overlayVisible("soft"), edgeSel = r3.overlayVisible("edgeSel");
  return { selAll, none, softBefore: !!softBefore, softHot, edgeSel, changed };
});
console.log(JSON.stringify(r));
const ok = r.selAll && r.selAll.usesOwn && r.selAll.hid === r.selAll.count && r.none === null && r.softBefore && !r.softHot && !r.edgeSel && r.changed > 0 && !errs.length;
if (errs.length) console.log("errors:", errs.slice(0, 3));
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

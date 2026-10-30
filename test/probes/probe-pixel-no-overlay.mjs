// 瑞士奶酪运行时那层（2026-10-29 Claude Opus 5.5）：像素描边风格里选面 / 边 / 进网格体看顶点 → 这一帧走叠加层那遍的辅助几何里不许有点线面的高亮；
// 面 / 边的高亮是标记（marks 数 > 0）。user「像素模式下组件被选中时面和边不应该走叠加层」「像素模式下编辑模式时边不走叠加层」「点也应该同样的标准」。
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const url = process.argv[2] ?? "http://127.0.0.1:8765/";
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(url, { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const BANNED = ["vertDots", "selVerts", "faceDots", "seam", "soft", "edgeSel"];
const res = await page.evaluate(async (BANNED) => {
  const e = globalThis.__catsup.editor, r3 = e.renderer3, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const at = e.activePool();
  e.commitOp({ op: "addEdges", at, segs: [[P(0, 0), P(1, 0)], [P(1, 0), P(1, 1)], [P(1, 1), P(0, 1)], [P(0, 1), P(0, 0)]] }); e.commitOp({ op: "pushpull", at, face: [P(0, 0), P(1, 0), P(1, 1), P(0, 1)], dist: 1 });
  r3.setPreset("pixelOutline"); e.cam.setView("iso"); e.zoomExtents();
  const snap = (label) => { e.draw(); const ids = r3.overlayPassIds(); return { label, banned: ids.filter((i) => BANNED.includes(i)), overlay: ids }; };
  const out = [];
  e.selectAll(); await sleep(30); out.push(snap("硬表面全选（面 + 边）"));
  e.deselectAll(); e.selectAll(); e.makeComponent("块"); await sleep(20); e.deselectAll();
  const s = e.scene, inst = [...s.def(s.root).instances.values()][0]; e.selectedPools.clear(); e.selectedPools.set("i" + inst.id, { kind: "instance", instance: inst.id }); out.push(snap("选中组件"));
  e.runAction("object.toMesh"); await sleep(30); e.enterSelected(); await sleep(30); e.setTool("select"); e.selectAll(); await sleep(30); out.push(snap("网格体里全选（顶点小点 + 选中点）"));
  e.setXray(true); await sleep(20); out.push(snap("网格体 + X 光（面点）"));
  return out;
}, BANNED);
for (const r of res) console.log(`  ${r.banned.length ? "✗" : "✓"} ${r.label}：叠加层那遍 = [${r.overlay.join(", ")}]`);
const ok = res.every((r) => r.banned.length === 0) && errs.length === 0;
if (errs.length) console.log("errors:", errs.slice(0, 3));
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await b.close(); process.exit(ok ? 0 : 1);

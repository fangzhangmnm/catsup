// 修复「合并重合反向面」：真界面走一遍（created 2026-11-06 by Claude Opus 5.5）。
// ① 两面都出的方块转网格体 = 12 张面，物件菜单里露「修复面板…」，板上有「合并重合反向面（6 对，每对只留一面）」
// ② 右键菜单里没有它（只住修复窗）③ 点了 = 6 张面、每条边两张、朝外；提示行写明另一面看穿 ④ 一步撤销回 12 张，重做回 6 张
// ⑤ 合完环切切得动（合之前中间的边挂 4 张面切不动）⑥ 单层的网格体：物件菜单里不露修复面板（真有这种面才露）⑦ 硬表面体修复照旧露
// ⑧ 全程没有脚本错误（存盘往返归单元测试 test/merge-reversed.test.ts）。跑法：python3 -m http.server 8765 后 node test/probes/probe-merge-reversed.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(5000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);

const checks = [];
const ok = (name, pass, detail = "") => { checks.push(pass); console.log(`  ${pass ? "✓" : "✗"} ${name}${detail !== "" ? ` — ${detail}` : ""}`); };

// 造一个两面都出的方块（不点自动朝外，两侧都是默认正面）→ 做成组件 → 转网格体 → 进去
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), B = [[0, 0], [1, 0], [1, 1], [0, 1]], segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], 0), P(d[0], d[1], 0)]); segs.push([P(a[0], a[1], 1), P(d[0], d[1], 1)]); segs.push([P(a[0], a[1], 0), P(a[0], a[1], 1)]); }
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs }); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh");
  const root = e.scene.def(e.scene.root), inst = [...root.instances.values()][0];
  globalThis.__probe = { def: inst.def, inst: inst.id };
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected();
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
});
const stat = () => page.evaluate(() => { const e = globalThis.__catsup.editor, m = e.scene.mesh(globalThis.__probe.def).kernel; return { faces: m.faces().length, maxOnEdge: Math.max(...m.edges().map((x) => m.eFaces(x).length)), hint: document.getElementById("hint")?.textContent ?? "" }; });
// 关菜单不许按 Esc：Esc 在这个 app 里还会退出一层（2026-11-06 这个探针自己就这么读到了硬表面那层的菜单）
const closeMenus = async () => { await page.evaluate(() => document.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))); await page.waitForTimeout(60); };
const objMenuRows = async () => { await page.click(".gizmo-object"); await page.waitForTimeout(100); const rows = await page.$$eval(".popup-menu .menu-item", (els) => els.map((x) => x.textContent ?? "")); return rows; };

const s0 = await stat();
ok("转换不合并：12 张面、边挂 4 张", s0.faces === 12 && s0.maxOnEdge === 4, JSON.stringify({ f: s0.faces, e: s0.maxOnEdge }));
const cut0 = await page.evaluate(() => { const e = globalThis.__catsup.editor, m = e.scene.mesh(globalThis.__probe.def).kernel, x = m.edges()[0]; e.selection.edges.add(x); const n = e.commandMenu("contextBar").filter((a) => a.id === "mesh.loopCut").length; const merged = e.commandMenu("contextBar").some((a) => a.id === "mesh.mergeReversed"); e.deselectAll(); return { n, merged }; });
ok("合之前：中间的边环切不露（切不动）", cut0.n === 0, cut0.n);
ok("右键菜单里没有它（只住修复窗）", !cut0.merged);

const rows = await objMenuRows();
ok("物件菜单露「修复面板…」", rows.some((r) => /修复面板/.test(r)), rows.filter((r) => /修复/.test(r)).join("|"));
await page.click(".popup-menu .menu-item:has-text('修复面板')"); await page.waitForTimeout(150);
const cmd = await page.$$eval(".board-cmd", (els) => els.map((x) => ({ id: x.dataset.cmd, t: x.textContent ?? "" })));
const merge = cmd.find((c) => c.id === "action:mesh.mergeReversed");
ok("板上有合并，字上写明只留一面", !!merge && /6 对/.test(merge.t) && /只留一面/.test(merge.t), merge?.t ?? JSON.stringify(cmd));
ok("网格体的板不开硬表面的修复面板", await page.evaluate(() => !globalThis.__catsup.editor.repairPanelOpen()));

await page.click(".board-cmd[data-cmd='action:mesh.mergeReversed']"); await page.waitForTimeout(120);
const s1 = await stat();
ok("点了：6 张面、每条边两张", s1.faces === 6 && s1.maxOnEdge === 2, JSON.stringify({ f: s1.faces, e: s1.maxOnEdge }));
ok("提示行写明另一面看穿", /合并了 6 对/.test(s1.hint) && /看穿/.test(s1.hint), s1.hint);
const vol = await page.evaluate(() => { const m = globalThis.__catsup.editor.scene.mesh(globalThis.__probe.def).kernel; let v = 0; for (const f of m.faces()) { const p = m.facePts(f); for (let i = 1; i + 1 < p.length; i++) { const a = p[0], b = p[i], c = p[i + 1]; v += a.x * (b.y * c.z - b.z * c.y) + a.y * (b.z * c.x - b.x * c.z) + a.z * (b.x * c.y - b.y * c.x); } } return v / 6; });
ok("封闭的块朝外（有向体积 = +1）", Math.abs(vol - 1) < 1e-9, vol);
const boardAfter = await page.$$eval(".board-cmd, .board-note", (els) => els.map((x) => x.textContent ?? ""));
ok("板跟着刷新：不再有要合并的", !boardAfter.some((t) => /合并重合/.test(t)), boardAfter.join("|"));

await page.evaluate(() => globalThis.__catsup.editor.undo()); await page.waitForTimeout(60);
const s2 = await stat();
ok("一步撤销回 12 张", s2.faces === 12 && s2.maxOnEdge === 4, s2.faces);
await page.evaluate(() => globalThis.__catsup.editor.redo()); await page.waitForTimeout(60);
const s3 = await stat();
ok("重做回 6 张", s3.faces === 6, s3.faces);

const cut1 = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, m = () => e.scene.mesh(globalThis.__probe.def).kernel, f0 = m().faces().length;
  e.deselectAll(); e.selection.edges.add(m().edges()[0]);
  const n = e.runAction("mesh.loopCut");
  return { n, f0, f1: m().faces().length };
});
ok("合完环切切得动", cut1.n > 0 && cut1.f1 > cut1.f0, JSON.stringify(cut1));
await page.evaluate(() => { const e = globalThis.__catsup.editor; e.undo(); e.deselectAll(); });

await closeMenus();
await page.evaluate(() => document.querySelectorAll(".board-close, .command-board .close").forEach((x) => x.click()));
ok("读菜单之前还在网格体里", await page.evaluate(() => globalThis.__catsup.editor.activeKind() === "mesh"));
const rows2 = await objMenuRows();
ok("单层的网格体：物件菜单不露修复面板（别的行照旧）", rows2.length > 0 && !rows2.some((r) => /修复面板/.test(r)), rows2.join("|"));
await closeMenus();

await page.keyboard.press("Escape"); await page.waitForTimeout(80);   // 这回是真要退出一层
ok("退回最外层 = 硬表面体", await page.evaluate(() => globalThis.__catsup.editor.activeKind() === "brep"));
const rows3 = await objMenuRows();
ok("硬表面体：修复面板照旧露", rows3.some((r) => /修复面板/.test(r)), rows3.filter((r) => /修复/.test(r)).join("|"));
await closeMenus();

ok("全程没有脚本错误", errs.length === 0, errs.join(" | "));
await b.close();
const bad = checks.filter((x) => !x).length;
console.log(`\n[probe-merge-reversed] ${checks.length - bad} 过 · ${bad} 红`);
process.exit(bad ? 1 : 0);

#!/usr/bin/env node
// probe-mirror-ask.mjs —— 镜像编辑开着、要改拓扑的入口都先问「关掉镜像，照做 / 取消」。created 2026-11-12 by Claude Opus 5.5
// 统筹 11-12（做人物那一趟的清点）：「选面建组件」以前不问就做，和「选面复制粘贴」不一致 → 补成同一道门（editor.ts mirrorGateEntry）。
// 这里逐个入口查：选面建组件、选面复制粘贴、删除、右键网格体指令（环切 / 复制面）——都要问；点取消 = 文档改动号不动、面数不动；
// 建组件点「关掉镜像，照做」= 关镜像 + 建组件在同一步，撤销一步两样都回去。
// 还没问的入口（炸开进网格体、合并进、右键「新建 ›」）记在 ai-docs/20261112-character-flow-refusals.md 第五节的名单里，第 3 刀把镜像问话收成一处时改成这里的检查。
// 用法：python3 -m http.server 8765 后 node test/probes/probe-mirror-ask.mjs [url]
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
const here = path.dirname(fileURLToPath(import.meta.url));
const { chromium } = createRequire(path.join(here, "../../../20260524 WeebPaint/package.json"))("playwright");
const url = process.argv.slice(2).find((a) => a.startsWith("http")) ?? process.env.PROBE_URL ?? "http://127.0.0.1:8765/";
let pass = 0, failN = 0;
const check = (ok, what, extra = "") => { if (ok) { pass++; console.log("  ✓", what); } else { failN++; process.exitCode = 1; console.error("  ✗", what, extra ? `  ← ${extra}` : ""); } };
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.message).slice(0, 200)));
await page.goto(url, { waitUntil: "load" }); await page.waitForFunction(() => globalThis.__catsup?.editor); await page.waitForTimeout(800);

await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), P = (x, y, z = 0) => ({ x, y, z });
  const H = (globalThis.__H = { asked: [], answer: "cancel" });
  // 问话面：记下标题 + 选项；按 H.answer 点「取消」或「关掉镜像，照做」
  setInterval(() => { const sh = document.getElementById("sheet"); if (!sh || sh.hidden || sh.closest("[hidden]")) return; const bs = [...sh.querySelectorAll("button")].filter((b) => b.offsetParent); if (!bs.length) return; H.asked.push((sh.textContent ?? "").replace(/\s+/g, " ").slice(0, 120)); const want = H.answer === "ok" ? bs.find((b) => /关掉镜像/.test(b.textContent)) : bs.find((b) => ["不做", "取消"].includes(b.textContent.trim())); (want ?? bs[bs.length - 1]).click(); }, 40);
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  e.setGrid({ ...e.grid, on: false }); box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("人"); e.runAction("object.toMesh"); await sleep(30);
  const inst = [...e.sceneRef.def(e.sceneRef.root).instances.values()][0]; H.def = inst.def;
  e.selectedPools.clear(); e.selectedPools.set("i" + inst.id, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30);
  const k = () => e.sceneRef.mesh(H.def).kernel; H.k = k;
  const cut = k().edges().find((x) => Math.abs(k().pt(k().edgeA[x]).x - k().pt(k().edgeB[x]).x) > 1); e.commitOp({ op: "meshLoopCut", def: H.def, edge: cut, t: 0.5 });
  C.pickWorkbench("freeform"); e.setMirror("edit", 0); e.deselectAll();
  H.topRight = () => k().faces().find((f) => { const vs = k().faceVerts(f); let x = 0, z = 0; for (const v of vs) { x += k().pt(v).x / vs.length; z += k().pt(v).z / vs.length; } return z > 0.999 && x > 0.01; });
  H.sel = () => { e.deselectAll(); e.selection.faces.add(H.topRight()); e.draw(); };
  H.state = () => ({ faces: k().faceCount(), doc: e.docRevision, mirror: e.mirrorOf()?.mode ?? null, defs: e.sceneRef.defs.size, pos: e.history.steps() });   // pos = 步数（一步里可以有好几条指令）
});

const tryEntry = (name, src) => page.evaluate(async ([src]) => {
  const C = globalThis.__catsup, e = C.editor, H = globalThis.__H, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  H.asked.length = 0; H.answer = "cancel"; H.sel(); const s0 = H.state();
  await (new Function("C", "e", "H", `return (async () => { ${src} })()`))(C, e, H); await sleep(200);
  const s1 = H.state(); return { asked: [...H.asked], s0, s1 };
}, [src]);

console.log("镜像编辑开着、要改拓扑的入口都先问；点取消什么都不动");
for (const [name, src] of [
  ["选面建组件", `e.makeComponent("零件");`],
  ["选面复制粘贴", `if (e.copySelection()) e.pasteClipboard();`],
  ["删除", `e.deleteSelection();`],
  ["右键：复制面（mesh.duplicate）", `e.runAction("mesh.duplicate");`],
]) {
  const r = await tryEntry(name, src);
  check(r.asked.some((t) => /镜像编辑开着/.test(t) && /关掉镜像/.test(t)), `${name}：先问「镜像编辑开着…关掉镜像，照做」`, JSON.stringify(r.asked));
  check(r.s1.faces === r.s0.faces && r.s1.doc === r.s0.doc && r.s1.mirror === "edit" && r.s1.defs === r.s0.defs, `${name}：点取消 = 面数、文档改动号、镜像、定义数都不动`, JSON.stringify({ s0: r.s0, s1: r.s1 }));
}

console.log("\n选面建组件点「关掉镜像，照做」= 关镜像 + 建组件在同一步；撤销一步两样都回去");
const ok = await page.evaluate(async () => {
  const C = globalThis.__catsup, e = C.editor, H = globalThis.__H, sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  H.asked.length = 0; H.answer = "ok"; H.sel(); const s0 = H.state();
  e.makeComponent("零件"); await sleep(250);
  const s1 = H.state(); H.answer = "cancel";
  e.undo(); await sleep(60); const s2 = H.state();
  return { asked: [...H.asked], s0, s1, s2, hint: C.hud?.status?.() ?? "" };
});
check(ok.s1.mirror === null && ok.s1.defs === ok.s0.defs + 1 && ok.s1.faces === ok.s0.faces - 1, "照做了：镜像关了、多了一个组件定义、网格体少了那张面", JSON.stringify(ok));
check(ok.s1.pos === ok.s0.pos + 1, "关镜像 + 建组件 = 一步", `${ok.s0.pos} → ${ok.s1.pos}`);
check(ok.s2.mirror === "edit" && ok.s2.defs === ok.s0.defs && ok.s2.faces === ok.s0.faces, "撤销一步：镜像回到开着、组件没了、面回来了", JSON.stringify(ok.s2));

await browser.close();
if (errs.length) { console.log("页面错误：", errs.slice(0, 6)); process.exitCode = 1; }
console.log(`\nprobe-mirror-ask ${failN || errs.length ? "FAIL" : "OK"}（${pass} ✓ / ${failN} ✗）`);

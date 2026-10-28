// 编辑器级撤销 fuzz（设计稿 ai-docs/20261028-undo-step-regime.md §3 层 4；2026-10-28 Claude Fable 5.1）。
// 随机的用户动作序列（画盒 / 全选 / 取消 / 建组 / 建组件 / 进 / 退 / 移动 / 转网格体 / 删除 / 撤 / 重做），每个动作之后断言：
//   ① stepViolations 永远 0（没有步外提交）② 一个动作最多长一步（没有幻影步）③ 从装载态重放整条指令流的指纹 == 活场景（差分 oracle）
//   ④ 选区里的东西都还在活动视图里。每个种子最后：撤到种子开头、再重做到底，指纹和选区逐字回来。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-undo-fuzz.mjs [seeds=4] [actions=28]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const SEEDS = Number(process.argv[2] ?? 4), ACTIONS = Number(process.argv[3] ?? 28);
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 900, height: 700 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async ({ SEEDS, ACTIONS }) => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const S = () => e.scene;
  const fp = (sc) => [...sc.defs.entries()].sort((a, b) => a[0] - b[0]).map(([id, d]) => {
    const body = d.body.kind === "brep" ? `b${d.body.kernel.faces().length}f${d.body.kernel.edges().length}e${d.body.kernel.vertices().map((v) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`).sort().join(";")}g${d.body.groups.size}` : `m${d.body.kernel.faceCount()}f${d.body.kernel.verts().map((v) => { const p = d.body.kernel.pt(v); return `${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`; }).sort().join(";")}`;
    return `D${id}:${body}|I${[...d.instances.values()].map((i) => `${i.id}:${i.def}:${i.xform.map((x) => x.toFixed(4)).join(",")}`).sort().join(";")}`;
  }).join("\n");
  const selKey = () => `${e.contextCrumbs().length - 1}|f${[...e.selection.faces].sort().join(",")}|e${[...e.selection.edges].sort().join(",")}|v${[...e.selection.verts].sort().join(",")}|p${[...e.selectedPools.values()].map((p) => JSON.stringify(p)).sort().join(",")}`;
  const selValid = () => { const v = e.activeView; return [...e.selection.faces].every((f) => v.face(f)) && [...e.selection.edges].every((x) => v.graph.hasEdge(x)) && [...e.selection.verts].every((x) => v.graph.hasVertex(x)); };
  const mulberry = (a) => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  e.setGrid({ ...e.grid, on: false });
  const out = { seeds: [], failures: [] };
  for (let seed = 1; seed <= SEEDS; seed++) {
    const rnd = mulberry(seed * 7919), posStart = e.history.position(), stepsStart = e.history.steps(), trail = [];
    let selAtLastStep = selKey();   // 进 / 出组件是导航不是步（FM106），撤到头再重做回来的是最后一步封的会话，不是之后的导航
    const fail = (why) => { out.failures.push(`seed ${seed} @${trail.length} [${trail.slice(-6).join(" ")}]: ${why}`); };
    for (let k = 0; k < ACTIONS && out.failures.length < 6; k++) {
      const r = rnd(), hasSel = e.hasSelection(), hasPool = e.selectedPools.size > 0, depth = e.contextCrumbs().length - 1;
      const stepsBefore = e.history.steps(), fpBefore = fp(S());
      let name;
      try {
        if (r < 0.18) { const i = Math.floor(rnd() * 6), j = Math.floor(rnd() * 6); box(i * 2, j * 2, 0, i * 2 + 1, j * 2 + 1, 1); name = "box"; }
        else if (r < 0.28) { e.selectAll(); name = "selectAll"; }
        else if (r < 0.34) { e.deselectAll(); name = "deselect"; }
        else if (r < 0.42 && hasSel) { e.makeGroup(); name = "group"; }
        else if (r < 0.50 && hasSel) { e.makeComponent(`c${k}`); name = "component"; }
        else if (r < 0.56 && hasPool) { e.enterSelected(); name = "enter"; }
        else if (r < 0.62 && depth > 0) { e.exitContext(); name = "exit"; }
        else if (r < 0.70 && hasSel) { e.runAction("move", { dx: Math.round(rnd() * 3) - 1, dy: Math.round(rnd() * 3) - 1, dz: Math.round(rnd() * 2) }); name = "move"; }
        else if (r < 0.74 && hasPool && [...e.selectedPools.values()].every((p) => p.kind === "instance")) { e.runAction("object.toMesh"); name = "toMesh"; }
        else if (r < 0.80 && hasSel) { e.deleteSelection(); name = "delete"; }
        else if (r < 0.90 && e.history.position() > posStart) { e.undo(); name = "undo"; }   // 不撤到种子开头之前（撤过头再提交会截掉前面种子的重做尾巴，「撤回种子开头」就对不上了）
        else { e.redo(); name = "redo"; }
      } catch (err) { name = name ?? "?"; trail.push(name); fail(`threw: ${String(err).slice(0, 120)}`); continue; }
      trail.push(name);
      if (e.isGestureActive()) e.cancel();
      if (e.stepViolations !== 0) fail(`stepViolations=${e.stepViolations}`);
      if (name !== "undo" && name !== "redo" && e.history.steps() - stepsBefore > 1) fail(`one action grew ${e.history.steps() - stepsBefore} steps`);
      if (name !== "undo" && name !== "redo" && e.history.steps() === stepsBefore && fp(S()) !== fpBefore) fail("scene changed without a step");
      let rep; try { rep = fp(e.history.replay()); } catch (err) { fail(`replay threw: ${String(err).slice(0, 120)}`); continue; }
      if (rep !== fp(S())) fail("replay(ops) != live scene");
      if (!selValid()) fail("selection references dead geometry");
      if (name === "undo" || name === "redo" || e.history.steps() !== stepsBefore) selAtLastStep = selKey();
      await sleep(0);
    }
    // 撤到种子开头、再重做到底：指纹和选区逐字回来
    const fpEnd = fp(S()), selEnd = selKey(), stepsEnd = e.history.steps(), posEnd = e.history.position();   // 种子可能以撤销收尾：重做只到种子结束时的位置，不吞重做尾巴
    let n = 0; while (e.history.position() > posStart && n < 200) { e.undo(); n++; }
    if (e.history.position() !== posStart) fail(`could not undo back to seed start (pos ${e.history.position()} vs ${posStart})`);
    let m = 0; while (e.history.position() < posEnd && e.canRedo() && m < 200) { e.redo(); m++; }
    if (e.history.position() !== posEnd) fail(`could not redo back to seed end (pos ${e.history.position()} vs ${posEnd})`);
    if (fp(S()) !== fpEnd) fail("undo-all then redo-all: scene differs");
    if (selKey() !== selAtLastStep) fail(`undo-all then redo-all: selection differs (${selKey()} vs ${selAtLastStep}; at seed end ${selEnd})`);
    out.seeds.push({ seed, actions: trail.length, steps: stepsEnd - stepsStart, undone: n, redone: m, trail: trail.join(" ") });
  }
  return out;
}, { SEEDS, ACTIONS });
await b.close();
const ok = res.failures.length === 0 && errs.length === 0;
console.log(JSON.stringify({ seeds: res.seeds, failures: res.failures, errs }, null, 1).slice(0, 4000));
console.log(ok ? "probe-undo-fuzz OK" : "probe-undo-fuzz FAIL");
process.exit(ok ? 0 : 1);

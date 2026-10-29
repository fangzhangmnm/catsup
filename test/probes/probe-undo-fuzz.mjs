// 编辑器级撤销 fuzz（设计稿 ai-docs/20261028-undo-step-regime.md §3 层 4；2026-10-28 Claude Fable 5.1）。
// 随机的用户动作序列（画盒 / 全选 / 取消 / 建组 / 建组件 / 进 / 退 / 移动 / 转网格体 / 转回硬表面 / 删除 / 锁 / 藏 / 炸开 / 修复 / 镜像开关 / 挪点〔镜像下钉 / 不穿 / 并〕/ 挤出 / 细分 / 默认平滑 / 撤 / 重做），每个动作之后断言：
//   ① stepViolations 永远 0（没有步外提交）② 一个动作最多长一步（没有幻影步）③ 从装载态重放整条指令流的指纹 == 活场景（差分 oracle）
//   ④ 选区里的东西都还在活动视图里 ⑤ 工作台管得了活动池的身体（不变量 I5，2026-10-28 Opus）、全程没有 DRIFT 记录。
//   每个种子最后：撤到种子开头、再重做到底，指纹和选区逐字回来；再（能进就先进一个网格体）重开模型，工作台得跟上（user 10-28 黑匣子那一案）。
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
  const out = { seeds: [], failures: [], reloads: [], hist: {} }, drifts = [];
  const trace0 = e.host.trace; e.host.trace = (t) => { if (t.kind === "drift") drifts.push(t); trace0?.(t); };   // 层 3 的纠正不许被用上（用上 = 层 1 漏了）
  const modeFits = () => e.mode.kinds.includes(S().kindOf(S().defOfContext(e.context)));
  for (let seed = 1; seed <= SEEDS; seed++) {
    const rnd = mulberry(seed * 7919), posStart = e.history.position(), stepsStart = e.history.steps(), trail = [];
    let selAtLastStep = selKey();   // 进 / 出组件是导航不是步（FM106），撤到头再重做回来的是最后一步封的会话，不是之后的导航
    const fail = (why) => { out.failures.push(`seed ${seed} @${trail.length} [${trail.slice(-6).join(" ")}]: ${why}`); };
    // 双数种子从网格体里开始（不然进网格体要连着 盒 → 组件 → 转网格体 → 进入 四步，镜像那条路几乎跑不到）
    if (seed % 2 === 0) { box(0, 0, 0, 2, 1, 1); e.selectAll(); e.makeComponent(`m${seed}`); e.runAction("object.toMesh"); const mi0 = [...S().def(S().root).instances.values()].at(-1); e.selectedPools.clear(); e.selectedPools.set(`i${mi0.id}`, { kind: "instance", instance: mi0.id }); e.enterSelected(); trail.push("[mesh]"); }
    for (let k = 0; k < ACTIONS && out.failures.length < 6; k++) {
      const r = rnd(), hasSel = e.hasSelection(), hasPool = e.selectedPools.size > 0, depth = e.contextCrumbs().length - 1;
      const stepsBefore = e.history.steps(), posBefore = e.history.position(), fpBefore = fp(S());
      let name;
      try {
        // 动作 = 加权清单（2026-10-28 晚 Claude Fable 5.1，F-113 审计：加进镜像那条路 + 网格体整体算子 + 物件动词）；不可用的不进清单
        const inMesh = e.activeKind() === "mesh", meshDef = inMesh ? e.activePool().def : null, mk = inMesh ? S().mesh(meshDef).kernel : null;
        const ctxDef = S().defOfContext(e.ctx), pools = [...e.selectedPools.values()], allInst = hasPool && pools.every((p) => p.kind === "instance");
        const allMeshInst = allInst && pools.every((p) => { const ii = S().def(ctxDef).instances.get(p.instance); return !!ii && S().kindOf(ii.def) === "mesh"; });
        const picks = [], add = (w, n, f) => picks.push([w, n, f]);
        add(14, "box", () => { const i = Math.floor(rnd() * 6), j = Math.floor(rnd() * 6); box(i * 2, j * 2, 0, i * 2 + 1, j * 2 + 1, 1); });
        add(8, "selectAll", () => e.selectAll());
        add(5, "deselect", () => e.deselectAll());
        if (hasSel) add(6, "group", () => e.makeGroup());
        if (hasSel) add(6, "component", () => e.makeComponent(`c${k}`));
        if (hasPool) add(5, "enter", () => e.enterSelected());
        if (depth > 0) add(5, "exit", () => e.exitContext());
        if (hasSel) add(7, "move", () => e.runAction("move", { dx: Math.round(rnd() * 3) - 1, dy: Math.round(rnd() * 3) - 1, dz: Math.round(rnd() * 2) }));
        if (allInst) add(3, "toMesh", () => e.runAction("object.toMesh"));
        if (allMeshInst) add(2, "toBrep", () => e.runAction("object.toBrep"));
        if (hasSel) add(5, "delete", () => e.deleteSelection());
        if (hasPool) { add(2, "lock", () => e.lockSelection(true)); add(1, "unlock", () => e.lockSelection(false)); add(2, "explode", () => e.explodeSelection()); }
        if (hasSel && e.hasHideableSelection()) add(2, "hide", () => e.hideSelection());
        add(1, "unhideAll", () => e.unhideAll());
        if (inMesh) {   // 镜像那条路（v0.16.5 挪点纪律：钉 / 不穿 / 并 + 强行对称的对称化）+ 网格体的整体算子
          add(3, "mirrorEdit", () => e.setMirror("edit", 0)); add(3, "mirrorForce", () => e.setMirror("force", 0)); add(2, "mirrorOff", () => e.setMirror(null));
          add(2, "subdivide", () => e.runAction("mesh.subdivide")); add(2, "smooth", () => e.runAction(rnd() < 0.5 ? "mesh.smooth.smooth" : "mesh.smooth.hard"));
          if (mk.vertexCount()) add(6, "moveVert", () => { const vs = mk.verts(), v = vs[Math.floor(rnd() * vs.length)], p = mk.pt(v); e.commitOp({ op: "meshMove", def: meshDef, moves: [{ v, to: { x: p.x + (rnd() * 2 - 1) * 1.5, y: p.y + rnd() - 0.5, z: p.z + rnd() - 0.5 } }] }); });
          if (e.selection.kind === "mesh" && e.selection.faces.size) add(4, "extrude", () => e.commitOp({ op: "meshExtrude", def: meshDef, faces: [...e.selection.faces], offset: P(0.3, 0, 0) }));
        } else if (!hasSel && depth === 0) add(2, "repair", () => e.runAction(["brep.straighten", "brep.weld", "brep.planar", "brep.harden"][Math.floor(rnd() * 4)]));
        if (e.history.position() > posStart) add(10, "undo", () => e.undo());   // 不撤到种子开头之前（撤过头再提交会截掉前面种子的重做尾巴，「撤回种子开头」就对不上了）
        add(5, "redo", () => e.redo());
        const total = picks.reduce((acc, [w]) => acc + w, 0); let x = rnd() * total, chosen = picks[picks.length - 1];
        for (const pk of picks) { x -= pk[0]; if (x < 0) { chosen = pk; break; } }
        name = chosen[1]; chosen[2]();
      } catch (err) { name = name ?? "?"; trail.push(name); fail(`threw: ${String(err).slice(0, 120)}`); continue; }
      trail.push(name); out.hist[name] = (out.hist[name] ?? 0) + 1;
      if (e.isGestureActive()) e.cancel();
      if (e.stepViolations !== 0) fail(`stepViolations=${e.stepViolations}`);
      if (name !== "undo" && name !== "redo" && e.history.steps() - stepsBefore > 1) fail(`one action grew ${e.history.steps() - stepsBefore} steps`);
      if (name !== "undo" && name !== "redo" && e.history.steps() === stepsBefore && fp(S()) !== fpBefore) fail("scene changed without a step");
      let rep; try { rep = fp(e.history.replay()); } catch (err) { fail(`replay threw: ${String(err).slice(0, 120)}`); continue; }
      if (rep !== fp(S())) fail("replay(ops) != live scene");
      if (!selValid()) fail("selection references dead geometry");
      if (!modeFits()) fail(`workbench ${e.mode.id} does not fit the active body`);
      if (drifts.length) fail(`DRIFT ${JSON.stringify(drifts.splice(0))}`);
      // 撤销 / 重做只有游标真动了才算回到某一步（没东西可重做的一下 = 什么都没发生；以前照记，把之后的导航〔退出一层〕错当成「最后一步的会话」= 2026-10-28 种子 3 的假红，Opus 查）
      if ((name === "undo" || name === "redo") ? e.history.position() !== posBefore : e.history.steps() !== stepsBefore) selAtLastStep = selKey();
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
    // 重开模型（I5 那一案）：能进网格体就先进去
    const mi = [...S().def(S().root).instances.values()].find((i) => S().kindOf(i.def) === "mesh");
    if (mi && e.contextCrumbs().length === 1) { e.selectedPools.clear(); e.selectedPools.set(`i${mi.id}`, { kind: "instance", instance: mi.id }); e.enterSelected(); }
    const before = e.mode.id; e.loadScene(S());
    out.reloads.push(`${before}→${e.mode.id}`);
    if (!modeFits()) fail(`after reload: workbench ${e.mode.id} does not fit`);
    if (drifts.length) fail(`after reload: DRIFT ${JSON.stringify(drifts.splice(0))}`);
  }
  return out;
}, { SEEDS, ACTIONS });
await b.close();
const ok = res.failures.length === 0 && errs.length === 0;
console.log(JSON.stringify({ hist: res.hist, failures: res.failures, errs, reloads: res.reloads, seeds: res.seeds }, null, 1).slice(0, 6000));
console.log(ok ? "probe-undo-fuzz OK" : "probe-undo-fuzz FAIL");
process.exit(ok ? 0 : 1);

// 顺着填（F 只选一条边 / 一个点；照抄 Blender「Face from Single Vertex or Edge」；统筹 11-13，user「选中一条边F可以顺着边流往下填」）。created 2026-11-13 by Claude Opus 5.5
// 自由建模里的网格体（长 5 的盒子切成 5 段、挖掉前面那一溜 5 张面 = 带子形的洞），键盘 F：
// ① 选洞左边那条竖边，连按五下 F = 五张四边形、每次选区只剩新的对边（一格一格往右）、每下一步 ② 第六下 = 到头、说原因、一步不多
// ③ 撤销逐步退回（每撤一下少一张面）④ 一头分叉 = 不顺着填、说原因、一步不多 ⑤ 一个点夹在两条开口边之间 = 拐角三角、选区落在对着它的边上
// ⑥ 画过的模型上：顺着填的新面不带画、别的面角上的值一格不变
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-fill-strip.mjs [url]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv.slice(2).find((a) => a.startsWith("http")) ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const key = (k, code) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code, bubbles: true, cancelable: true }));
  const F = async () => { key("f", "KeyF"); await sleep(40); };
  const hint = () => document.getElementById("hint")?.textContent ?? "";
  const S = () => e.scene, out = {};
  e.setGrid({ ...e.grid, on: false });
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.addSegments(segs, "box"); };
  box(0, 0, 0, 5, 1, 1); e.selectAll(); e.runAction("brep.orientOutward", { curvature: 3 }); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20); hud.pick("select"); await sleep(10);
  const L = () => m().verts().map((v) => m().pt(v)), x0 = Math.min(...L().map((p) => p.x)), y0 = Math.min(...L().map((p) => p.y)), z0 = Math.min(...L().map((p) => p.z)), z1 = Math.max(...L().map((p) => p.z));
  const along = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).x - m().pt(m().edgeB[x]).x) > 4);
  e.commitOp({ op: "meshLoopCut", def, edge: along, cuts: 4 }); await sleep(10);
  const front = () => m().faces().filter((f) => m().faceVerts(f).every((v) => Math.abs(m().pt(v).y - y0) < 1e-6));
  e.commitOp({ op: "meshDelete", def, faces: front() }); await sleep(10);
  const near = (v, x, y, z) => { const p = m().pt(v); return Math.abs(p.x - x) < 1e-6 && Math.abs(p.y - y) < 1e-6 && Math.abs(p.z - z) < 1e-6; };
  const vAt = (x, y, z) => m().verts().find((v) => near(v, x, y, z));
  const sel = (o) => { e.deselectAll(); const z = e.selection; for (const v of o.verts ?? []) z.verts.add(v); for (const x of o.edges ?? []) z.edges.add(x); e.draw(); };
  const selNow = () => ({ edges: [...e.selection.edges], verts: [...(e.selection.verts ?? [])], faces: [...e.selection.faces] });
  const open = () => m().edges().filter((x) => m().eFaces(x).length === 1).length;
  out.open0 = open(); out.front0 = front().length;
  // ①
  const left = m().edgeOf(vAt(x0, y0, z0), vAt(x0, y0, z1));
  sel({ edges: [left] });
  const steps0 = e.history.steps(), f0 = m().faceCount(); out.presses = [];
  for (let i = 0; i < 5; i++) { const s0 = e.history.steps(); await F(); const s = selNow(); const ed = s.edges[0];
    out.presses.push({ dSteps: e.history.steps() - s0, faces: m().faceCount() - f0, selEdges: s.edges.length, selVerts: s.verts.length, selFaces: s.faces.length, x: ed !== undefined ? Math.round((m().pt(m().edgeA[ed]).x - x0) * 1000) / 1000 : null, hint: hint() }); }
  out.closed = { open: open(), check: m().check().join(";") };
  // ②
  { const s0 = e.history.steps(), fc = m().faceCount(); await F(); out.sixth = { dSteps: e.history.steps() - s0, dFaces: m().faceCount() - fc, hint: hint() }; }
  // ③ 撤销逐步退回
  out.undo = []; for (let i = 0; i < 5; i++) { e.undo(); await sleep(15); out.undo.push(m().faceCount() - f0); }
  out.undoBack = { open: open(), steps: e.history.steps() - steps0 };
  // ④ 一头分叉：在洞的左上角那个点上多接一条裸线（复制一个点挪开再连上）
  { const tl = vAt(x0, y0, z1), vs0 = new Set(m().verts()); e.commitOp({ op: "meshDuplicate", def, verts: [tl] }); const nv = m().verts().find((v) => !vs0.has(v)); e.commitOp({ op: "meshMove", def, moves: [{ v: nv, to: P(x0 - 0.5, y0 - 0.5, z1 + 0.5) }] }); e.commitOp({ op: "meshMakeFace", def, ring: [tl, nv] }); await sleep(10);
    sel({ edges: [left] }); const s0 = e.history.steps(), fc = m().faceCount(); await F(); out.branch = { dSteps: e.history.steps() - s0, dFaces: m().faceCount() - fc, hint: hint() };
    for (let i = 0; i < 3; i++) { e.undo(); await sleep(10); } }
  // ⑤ 一个点（洞右下角）夹在两条开口边之间 = 拐角三角
  { const x1 = Math.max(...L().map((p) => p.x)), br = vAt(x1, y0, z0); sel({ verts: [br] }); const s0 = e.history.steps(), fc = m().faceCount(); await F(); const s = selNow(), ed = s.edges[0];
    out.corner = { dSteps: e.history.steps() - s0, dFaces: m().faceCount() - fc, selEdges: s.edges.length, selVerts: s.verts.length, oppositeOk: ed !== undefined && m().edgeA[ed] !== br && m().edgeB[ed] !== br, hint: hint(), check: m().check().join(";") };
    e.undo(); await sleep(10); }
  // ⑥ 画过：先补回前面（撤到挖洞之前）、全部开始画、再挖一个洞（删一张前面）→ 选它左边那条边 F
  { while (m().faceCount() !== f0 + 5 && e.history.steps() > 0) { e.undo(); await sleep(5); if (front().length === 5) break; }
    out.paintSetup = front().length;
    const g = () => crypto.randomUUID(); e.commitOp({ op: "startPaint", def, faces: m().faces(), uvSet: g(), textureGuid: g(), materialGuid: g(), names: { uvSet: "UV", paint: "画", material: "画" }, color: [0.3, 0.5, 0.7], density: 100 }); await sleep(20);
    const mat = (f) => m().column("material_index")?.data[f];
    const corners = (f) => m().cornerCols.map((c) => Array.from(m().cornerValues(f, c.id) ?? []).map((x) => (Number.isNaN(x) ? "nan" : x.toFixed(6))).join(",")).join("|");
    const fr = front().sort((a, bb) => Math.min(...m().faceVerts(a).map((v) => m().pt(v).x)) - Math.min(...m().faceVerts(bb).map((v) => m().pt(v).x)));
    const victim = fr[2], paintedMat = mat(victim), xs = m().faceVerts(victim).map((v) => m().pt(v).x), xl = Math.min(...xs);
    e.commitOp({ op: "meshDelete", def, faces: [victim] }); await sleep(10);
    const others = new Map(m().faces().map((f) => [f, corners(f)]));
    sel({ edges: [m().edgeOf(vAt(xl, y0, z0), vAt(xl, y0, z1))] }); const s0 = e.history.steps(); await F();
    const nf = m().faces().find((f) => !others.has(f));
    out.paint = { dSteps: e.history.steps() - s0, newFace: nf !== undefined, newMat: nf !== undefined ? mat(nf) : null, paintedMat, othersSame: [...others].every(([f, c]) => corners(f) === c), check: m().check().join(";"), hint: hint() }; }
  return out;
});
await b.close();
const ok = [], bad = [], chk = (n, c, d) => (c ? ok : bad).push(`${n}${c ? "" : "  ← " + JSON.stringify(d)}`);
const R = res;
chk("场景：带子洞 = 前面 5 张面挖掉（一张不剩）、一圈 12 条开口边", R.front0 === 0 && R.open0 === 12, { front0: R.front0, open0: R.open0 });
chk("① 连按五下 F = 五张四边形、每下一步", R.presses.every((p, i) => p.dSteps === 1 && p.faces === i + 1), R.presses);
chk("① 每次选区只剩新的对边（一条边、没有点和面），一格一格往右", R.presses.every((p) => p.selEdges === 1 && p.selVerts === 0 && p.selFaces === 0) && R.presses.map((p) => p.x).join(",") === "1,2,3,4,5", R.presses.map((p) => ({ x: p.x, e: p.selEdges, v: p.selVerts, f: p.selFaces })));
chk("① 洞补完、自检干净", R.closed.open === 0 && R.closed.check === "", R.closed);
chk("② 第六下 = 到头：说原因、一步不多、没造面", R.sixth.dSteps === 0 && R.sixth.dFaces === 0 && /顺着填/.test(R.sixth.hint), R.sixth);
chk("③ 撤销逐步退回（每撤一下少一张面）", R.undo.join(",") === "4,3,2,1,0" && R.undoBack.open === 12, { undo: R.undo, back: R.undoBack });
chk("④ 一头分叉 = 不顺着填、说「分叉」、一步不多", R.branch.dSteps === 0 && R.branch.dFaces === 0 && /分叉/.test(R.branch.hint), R.branch);
chk("⑤ 一个点夹在两条开口边之间 = 拐角三角、一步、选区落在对着它的边上", R.corner.dSteps === 1 && R.corner.dFaces === 1 && R.corner.selEdges === 1 && R.corner.selVerts === 0 && R.corner.oppositeOk && R.corner.check === "", R.corner);
chk("⑥ 画过的模型上顺着填：一步、新面不带画、别的面角上的值一格不变", R.paintSetup === 5 && R.paint.dSteps === 1 && R.paint.newFace && R.paint.newMat !== R.paint.paintedMat && R.paint.othersSame && R.paint.check === "", R.paint);
chk("没有脚本错误", errs.length === 0, errs);
for (const s of ok) console.log("✓", s);
for (const s of bad) console.log("✗", s);
process.exit(bad.length ? 1 : 0);

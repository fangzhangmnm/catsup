// 层级的显示（第 1 版第 1 件，统筹 11-13 施工单 ai-docs/20261113-objects-wave1-workorder.md 第一节；2026-11-13 Claude Opus 5.5）。规矩（user 11-13 更正）：
// 「默认的『线稿』画风 默认物体有线，在编辑的物体有额外的点，不要改变默认的画风，没有active的时候是默认的画风」——画风自己的线谁都照画；能直接改的那一层靠顶点小圆点区分（硬表面也接上）；
// 根层（没进任何物件）= 原来的默认画风，不加点；光标移到子物体上整个亮一下。
// 样本：根上一块地 + 兄弟 S；组件 A = 自己一个盒子 + 子组件 B（B 里还有 C）；A 的分身摆在 y = −4。
// ① 根层、线稿：都有线，没有顶点小圆点 ② 进 A、线稿：都有线 + 顶点小圆点（硬表面）③ 选择工具光标移到 B 上 = B 整个亮；画线工具 = 不亮
// ④ 像素描边：都有线 + 点 ⑤ 写实（画风不带线）：只有 A 有线 ⑥ 演示锁：都有线、没有点 ⑦ 写实里进 B：线换到 B；退回 A：换回 A
// ⑧ 吸附照旧：画线工具光标压在外面的地的角上 = 端点 ⑨ 自由建模（A 转成网格体）、线稿：都有线 + 点
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-hier-display.mjs [地址]
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(6000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1500);
await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const box = (x0, y0, z0, x1, y1, z1) => { const s = []; const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]]; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; s.push([P(a[0], a[1], z0), P(d[0], d[1], z0)], [P(a[0], a[1], z1), P(d[0], d[1], z1)], [P(a[0], a[1], z0), P(a[0], a[1], z1)]); } return s; };
  const inBox = (p, lo, hi) => p.x >= lo.x - 1e-6 && p.y >= lo.y - 1e-6 && p.z >= lo.z - 1e-6 && p.x <= hi.x + 1e-6 && p.y <= hi.y + 1e-6 && p.z <= hi.z + 1e-6;
  const selectIn = (lo, hi) => { const k = e.kernel; e.deselectAll(); for (const f of k.faces()) { const r = k.faceRings3(f.id); if (r && r.outer.every((p) => inBox(p, lo, hi))) e.selection.faces.add(f.id); } for (const ed of k.edges()) if (inBox(k.graph.pt(ed.a), lo, hi) && inBox(k.graph.pt(ed.b), lo, hi)) e.selection.edges.add(ed.id); };
  const instNamed = (name) => { const S = e.scene, d = S.def(S.defOfContext(e.ctx)); for (const i of d.instances.values()) if (S.def(i.def).name === name) return i; return null; };
  const enter = async (name) => { const i = instNamed(name); e.selectedPools.clear(); e.selectedPools.set(`i${i.id}`, { kind: "instance", instance: i.id }); e.enterSelected(); e.selectedPools.clear(); await sleep(30); };
  e.setGrid({ ...e.grid, on: false });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: [[P(-3, -6, 0), P(7, -6, 0)], [P(7, -6, 0), P(7, 4, 0)], [P(7, 4, 0), P(-3, 4, 0)], [P(-3, 4, 0), P(-3, -6, 0)]] });
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(4, 0, 0, 5, 1, 1.5) }); selectIn(P(4, 0, 0), P(5, 1, 1.5)); e.makeComponent("S"); await sleep(20);
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0, 0, 0, 2, 2, 1) }); selectIn(P(0, 0, 0), P(2, 2, 1)); e.makeComponent("A"); await sleep(20);
  await enter("A");
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0.5, 0.5, 1, 1.5, 1.5, 1.8) }); selectIn(P(0.5, 0.5, 1), P(1.5, 1.5, 1.8)); e.makeComponent("B"); await sleep(20);
  await enter("B");
  e.commitOp({ op: "addEdges", at: e.activePool(), segs: box(0.3, 0.3, 0.8, 0.7, 0.7, 1.2) }); selectIn(P(0.3, 0.3, 0.8), P(0.7, 0.7, 1.2)); e.makeComponent("C"); await sleep(20);
  e.exitContext(); e.exitContext(); e.deselectAll(); e.selectedPools.clear();
  const A = instNamed("A");
  e.commitOp({ op: "placeInstance", at: e.activePool(), definition: A.def, xform: [1, 0, 0, 0, 0, 1, 0, -4, 0, 0, 1, 0] });
  e.setTool("select"); e.cam.setView("iso"); e.zoomExtents(); e.draw(); await sleep(200);
  // 每个槽：名字（定义名 + 是不是分身）→ 线画没画
  window.__h = {
    e, enter, instNamed, sleep, P,
    lines() {
      const v = e.liveWorld(), r3 = e.renderer3, S = e.scene, out = {}, Adef = S.def(A.def);
      for (const s of v.slots) {
        const key = [...v.byKey.entries()].find(([, i]) => i === s.index)?.[0], n = key ? r3.slotNodes.get(key) : null;
        const name = s.chain.length === 0 ? "根" : S.def(s.pool.def).name + (s.chain[0] !== A.id && s.chain.length ? "'" : "");   // ' = 在分身 / 兄弟那条链上
        out[name] = n ? !!n.linesVisible : null;
      }
      void Adef; return out;
    },
    dots: () => e.renderer3.overlayVisible("vertDots"),
  };
});
const ev = (fn, arg) => page.evaluate(fn, arg);
const draw = async () => { await ev(() => window.__h.e.draw()); await page.waitForTimeout(80); };
const r = {};
await draw(); r.rootWhite = await ev(() => window.__h.lines()); r.rootDots = await ev(() => window.__h.dots());
await ev(async () => { await window.__h.enter("A"); }); await draw();
r.inAWhite = await ev(() => window.__h.lines()); r.inAWhiteDots = await ev(() => window.__h.dots());
// ③ 悬停：选择工具移到 B 上 = B 整个亮；画线工具 = 不亮
const bx = await page.locator("#board").boundingBox();
const bPx = await ev(() => {   // B 身上一个确实点得到 B 的地方（面心里挑：角点离光标近会先拾到 A 的点）
  const { e, instNamed } = window.__h, v = e.liveWorld(), B = instNamed("B");
  for (const sl of v.slots) { if (sl.rel !== "child" || sl.chain[sl.chain.length - 1] !== B.id) continue;
    for (const f of sl.kernel.faces()) { const r = v.faceRings3(f.id + sl.index * (1 << 22)); if (!r) continue; const c = r.outer.reduce((a, p) => ({ x: a.x + p.x / r.outer.length, y: a.y + p.y / r.outer.length, z: a.z + p.z / r.outer.length }), { x: 0, y: 0, z: 0 });
      const q = e.cam.angularPx(c, e.vp()), k = e.classify(v, e.pickAt(q.x, q.y)); if (k.kind === "pool" && k.pick.kind === "instance" && k.pick.instance === B.id) return q; } }
  return null;
});
if (bPx) { await page.mouse.move(bx.x + bPx.x, bx.y + bPx.y, { steps: 3 }); await page.waitForTimeout(80); }
r.hoverSelect = await ev(() => { const { e, instNamed } = window.__h, h = e.hoverChild, B = instNamed("B"); return h ? { kind: h.kind, isB: h.kind === "instance" && h.instance === B.id } : null; });
await ev(() => globalThis.__catsup.hud.pick("line")); if (bPx) { await page.mouse.move(bx.x + bPx.x + 2, bx.y + bPx.y + 1, { steps: 2 }); await page.waitForTimeout(80); }
r.hoverLine = await ev(() => window.__h.e.hoverChild);
// ⑧ 吸附照旧：画线工具、光标压在地的角上（外面的几何）= 端点
const cPx = await ev(() => { const { e, P } = window.__h; return e.cam.angularPx(P(7, 4, 0), e.vp()); });
await page.mouse.move(bx.x + cPx.x, bx.y + cPx.y, { steps: 3 }); await page.waitForTimeout(100);
r.snapOuter = await ev(() => { const s = window.__h.e.snapInfo; return s ? { kind: s.kind, p: [s.p?.x, s.p?.y, s.p?.z].map((x) => x === undefined ? null : +x.toFixed(3)) } : null; });
await ev(() => globalThis.__catsup.hud.pick("select")); await page.mouse.move(bx.x + 20, bx.y + 700); await page.waitForTimeout(60);
// ④ 像素描边 ⑤ 写实
await ev(() => { window.__h.e.renderer3.setPreset("pixelOutline"); }); await draw();
r.inAPixel = await ev(() => window.__h.lines()); r.inAPixelDots = await ev(() => window.__h.dots());
await ev(() => { window.__h.e.renderer3.setPreset("realistic"); }); await draw();
r.inARealistic = await ev(() => window.__h.lines());
// ⑦ 写实里进 B / 退回 A：线跟着换
await ev(async () => { await window.__h.enter("B"); }); await draw(); r.inBReal = await ev(() => window.__h.lines());
await ev(() => window.__h.e.exitContext()); await draw(); r.backAReal = await ev(() => window.__h.lines());
await ev(() => { window.__h.e.renderer3.setPreset("white"); }); await draw();
// ⑥ 演示锁：线稿全画
await ev(async () => { await globalThis.__catsup.session.setLocked(true); }); await page.waitForTimeout(150); await draw();
r.lockedWhite = await ev(() => window.__h.lines()); r.lockedDots = await ev(() => window.__h.dots());
await ev(async () => { await globalThis.__catsup.session.setLocked(false); }); await page.waitForTimeout(150);
// ⑨ 自由建模
await ev(async () => { const { e, sleep } = window.__h; e.deselectAll(); e.selectedPools.clear(); e.runAction("object.toMesh"); await sleep(80); }); await draw();
r.ffMode = await ev(() => window.__h.e.modeId); r.ffWhite = await ev(() => window.__h.lines()); r.ffDots = await ev(() => window.__h.dots());
await b.close();
const only = (m, yes) => !!m && Object.entries(m).every(([k, v]) => v === yes.includes(k));
const all = (m) => !!m && Object.values(m).every((v) => v === true);
const checks = [
  ["① 根层、线稿：都有线（默认画风不变）", all(r.rootWhite)],
  ["① 根层：没有顶点小圆点（没在编辑哪个物件）", r.rootDots === false],
  ["② 进 A、线稿：都有线（子物体 / 外面的 / 分身照画风画）", all(r.inAWhite)],
  ["② 进 A、硬表面：A 自己的几何有顶点小圆点", r.inAWhiteDots === true],
  ["③ 选择工具光标移到 B 上 = B 整个亮", !!r.hoverSelect?.isB],
  ["③ 画线工具移上去 = 不亮", r.hoverLine === null],
  ["④ 像素描边：都有线 + 点", all(r.inAPixel) && r.inAPixelDots === true],
  ["⑤ 写实（画风不带线）：只有 A 有线", only(r.inARealistic, ["A"])],
  ["⑥ 演示锁：都有线、没有点（不编辑）", all(r.lockedWhite) && r.lockedDots === false],
  ["⑦ 写实里进 B：线换到 B", only(r.inBReal, ["B"])],
  ["⑦ 退回 A：换回 A", only(r.backAReal, ["A"])],
  ["⑧ 吸附照旧：外面的地的角 = 端点", r.snapOuter?.kind === "endpoint" && r.snapOuter.p[0] === 7 && r.snapOuter.p[1] === 4],
  ["⑨ 自由建模：都有线 + 顶点小圆点", r.ffMode === "freeform" && all(r.ffWhite) && r.ffDots === true],
  ["没有脚本错误", errs.length === 0],
];
for (const [name, ok] of checks) console.log(`${ok ? "✓" : "✗"} ${name}`);
if (checks.some(([, ok]) => !ok)) { console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log(errs.join("\n")); }
console.log(`${checks.filter(([, ok]) => ok).length}/${checks.length}`);
process.exit(checks.every(([, ok]) => ok) ? 0 : 1);

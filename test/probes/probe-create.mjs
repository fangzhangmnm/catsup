// 自由建模的「新建」工具（纪元账本 FM182；tools/mesh-create.ts；created 2026-10-28 by Claude Opus 5.5）：网格体盒子里——
// ① Shift+A = 拿起新建工具；左柱有「新建」；工具条露「新建 / 点一下的尺寸」② 地面上点一下 = 马前炮尺寸的立方体（边长 0.5）、一步撤销、新的留在选区、马后炮面板「新建立方体」
// ③ 地面上拖 = 拖的时候有预演、松手 = 还没建（v0.16.40 起松手进第二步「转朝向」的环）、原地再点一下 = 拖多大就多大（边长 = 2 × 拖的长度）④ 换圆柱、点在盒子顶面上 = 立在顶面上（直径 = 高 = 0.5）⑤ 撤销一步 = 圆柱没了
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-create.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } }); page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const tap = async (s) => { fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(40); };
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, root = () => S().def(S().root), q = (x) => +x.toFixed(3);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...root().instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 2.5; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const stat = () => ({ f: m().faceCount(), v: m().vertexCount() });
  const newVerts = (before) => m().verts().filter((v) => !before.has(v));
  const ext = (vs) => { const ps = vs.map((v) => m().pt(v)), k = (a) => q(Math.max(...ps.map((p) => p[a])) - Math.min(...ps.map((p) => p[a]))); return { x: k("x"), y: k("y"), z: k("z"), zMin: q(Math.min(...ps.map((p) => p.z))) }; };
  // ① Shift+A（Blender「添加」= 新建工具；user 10-28 晚「Shift+A 同意」）
  e.setTool("select"); window.dispatchEvent(new KeyboardEvent("keydown", { key: "A", code: "KeyA", shiftKey: true, bubbles: true, cancelable: true })); await sleep(40);
  out.shiftA = e.tool;
  e.setTool("create"); await sleep(60);
  out.rail = e.modeTools().join(",");
  out.strip = { kind: !!document.querySelector("#toolStrip")?.textContent?.includes("新建"), size: !!document.querySelector("#toolStrip")?.textContent?.includes("点一下的尺寸") };
  e.config.set("create", "kind", "box"); e.config.set("create", "size", 0.5);
  // ② 点一下
  { const before = new Set(m().verts()), st0 = stat(), pos0 = e.history.position();
    await tap(px(P(3, 0, 0)));
    const nv = newVerts(before), panel = document.querySelector(".vcb-params:not([hidden])");
    out.tap = { st0, st1: stat(), steps: e.history.position() - pos0, ext: nv.length ? ext(nv) : null, sel: e.selection.faces.size, panel: panel?.querySelector(".vcb-params-title")?.textContent ?? "", check: m().check().join(";"), hint: hud.status() }; }
  // ③ 拖
  { const before = new Set(m().verts()), st0 = stat(), a = px(P(3, 3, 0)), z = { x: a.x + 60, y: a.y };
    fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1);
    for (let i = 1; i <= 8; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 8, a.y, 1); await sleep(16); }
    await sleep(40);
    const liveF = e.liveWorldForProbe().faces?.().length ?? null;
    out.dragLive = { dims: e.readoutText?.() ?? "", liveMore: liveF === null ? null : liveF > 0 };
    const want = 2 * e.primitiveDragSize(a.x, a.y, z.x, z.y);
    fire("pointerup", z.x, z.y, 0); await sleep(40);
    const stUp = stat();
    await tap(z);   // 第二步不转、原地点一下 = 落定
    const nv = newVerts(before);
    out.drag = { st0, stUp, st1: stat(), want: q(want), ext: nv.length ? ext(nv) : null }; }
  // ④ 圆柱立在顶面上
  e.config.set("create", "kind", "cylinder");
  { const before = new Set(m().verts()), st0 = stat(), pos0 = e.history.position();
    await tap(px(P(0.5, 0.5, 1)));
    const nv = newVerts(before);
    out.cyl = { st0, st1: stat(), steps: e.history.position() - pos0, ext: nv.length ? ext(nv) : null, check: m().check().join(";") };
    // ⑤ 撤销
    key("z"); await sleep(40);
    out.undo = { f: m().faceCount(), back: m().faceCount() === st0.f }; }
  return out;
});
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const t = res.tap, d = res.drag, cy = res.cyl;
const ok = res.shiftA === "create" && /create/.test(res.rail) && res.strip.kind && res.strip.size
  && t.st1.f === t.st0.f + 6 && t.st1.v === t.st0.v + 8 && t.steps === 1 && t.ext && t.ext.z === 0.5 && Math.max(t.ext.x, t.ext.y) === 0.5 && t.ext.zMin === 0 && t.sel === 6 && /新建立方体/.test(t.panel) && !t.check
  && d.stUp.f === d.st0.f && d.st1.f === d.st0.f + 6 && d.ext && Math.abs(d.ext.z - d.want) < 0.01 && d.want > 0.05 && Math.abs(d.want - 0.5) > 0.01
  && cy.st1.f > cy.st0.f && cy.steps === 1 && cy.ext && cy.ext.zMin === 1 && cy.ext.z === 0.5 && cy.ext.x === 0.5 && !cy.check
  && res.undo.back && errs.length === 0;
console.log(ok ? "probe-create OK" : "probe-create FAIL");
process.exit(ok ? 0 : 1);

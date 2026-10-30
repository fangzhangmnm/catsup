// 挤出手感 + 拾取范围（created 2026-10-28 by Claude Fable 5.1；user 10-28 晚「E应该是按面法向，然后E之后右键是创作了面但是在原来的位置上可以切g」
// 「如果没有面的话，是边或者点，那么E是screen space，这个是blender的手感」「移动之类的的chip还是加一个拾取范围吧。点线面，要不三个toggle，放在马前炮」）。网格体盒子——
// ① 选顶面、E、拖、右键 = 面数 +4、顶面还在原处（z 不变）、选区 = 顶面、一步；接着 G 拖 = 顶面挪了（又一步）② 选一条竖边、E、屏幕里斜着拖 = 新边不只沿垂直方向（屏幕空间）
// ③ 同样但拖的是手柄中心 = 新点只沿各自垂直方向（v0.17.59 起：以前是按住 Shift，Shift 现在只管吸附；gizmo 设计稿 §3） ④ Esc = 什么都不留 ⑤ 拾取：移动工具的工具条有「拾取 点 边 面」；关掉「点」→ 按在角点上抓到的是边 / 面；关掉边和面 → 只剩点；全关 = 当全开
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-extrude-feel.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons, shift = false, button = 0) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button, buttons, shiftKey: shift }));
  const dragTo = async (a, z, shift = false) => { fire("pointermove", a.x, a.y, 0, shift); await sleep(10); fire("pointerdown", a.x, a.y, 1, shift); for (let i = 1; i <= 8; i++) { fire("pointermove", a.x + (z.x - a.x) * i / 8, a.y + (z.y - a.y) * i / 8, 1, shift); await sleep(12); } };
  const rclick = async (s) => { c.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: r.left + s.x, clientY: r.top + s.y, button: 2 })); await sleep(60); };
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, q = (x) => +x.toFixed(4), out = {};
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  const topFace = () => m().faces().find((f) => m().faceVerts(f).every((v) => Math.abs(m().pt(v).z - 1) < 1e-9));
  const topZ = (f) => Math.min(...m().faceVerts(f).map((v) => m().pt(v).z));
  const key = (k, code) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code, bubbles: true, cancelable: true }));
  const clickAt = async (s, shift = false) => { fire("pointermove", s.x, s.y, 0, shift); await sleep(10); fire("pointerdown", s.x, s.y, 1, shift); await sleep(10); fire("pointerup", s.x, s.y, 0, shift); await sleep(40); };
  // ① 面：选顶面 → E（键盘起手）→ 鼠标动 → 右键 = 原地留下（Blender 的流程）；接着 G → 点一下落定
  { const f = topFace(), f0 = m().faceCount(), v0 = m().vertexCount();
    hud.pick("select"); await sleep(20); await clickAt(px(P(0.5, 0.5, 1)));
    const st = e.history.steps(), a = px(P(0.5, 0.5, 1));
    fire("pointermove", a.x, a.y, 0); await sleep(10); key("e", "KeyE"); await sleep(30);
    out.e = { started: e.isGestureActive(), tool: e.tool, sel: e.selection.faces.size };
    for (let i = 1; i <= 6; i++) { fire("pointermove", a.x + 2 * i, a.y - 8 * i, 0); await sleep(12); }
    await rclick({ x: a.x + 12, y: a.y - 48 });
    const f1 = topFace();
    out.inPlace = { df: m().faceCount() - f0, dv: m().vertexCount() - v0, steps: e.history.steps() - st, topZ: q(topZ(f1)), selTop: e.selection.faces.size === 1 && e.selection.faces.has(f1), gesture: e.isGestureActive(), check: m().check().join(";"), hint: hud.status() };
    const st2 = e.history.steps(); fire("pointermove", a.x, a.y, 0); await sleep(10);
    key("g", "KeyG"); await sleep(30);
    out.g = { started: e.isGestureActive(), tool: e.tool };
    for (let i = 1; i <= 6; i++) { fire("pointermove", a.x, a.y - 12 * i, 0); await sleep(12); }
    await clickAt({ x: a.x, y: a.y - 72 });
    out.g.topZ = q(topZ(f1)); out.g.steps = e.history.steps() - st2; out.g.check = m().check().join(";");
    for (let i = 0; i < 4 && e.history.steps() > st; i++) { e.undo(); await sleep(10); } }
  // ② 边：E 默认屏幕空间；③ 拖手柄中心（= 边的中点，正好是按下处）= 垂直；④ Esc 什么都不留
  { const edge = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).x - 1) < 1e-9 && Math.abs(m().pt(m().edgeB[x]).x - 1) < 1e-9 && Math.abs(m().pt(m().edgeA[x]).y) < 1e-9 && Math.abs(m().pt(m().edgeB[x]).y) < 1e-9);   // x=1,y=0 的竖边
    const mid = P(1, 0, 0.5), s0 = px(mid);
    const run = async (handles) => {
      const shift = false; e.config.set("handles", "show", handles);
      const v0 = new Set(m().verts()), f0 = m().faceCount();
      e.deselectAll(); e.selectExpand(e.pickAt(s0.x, s0.y), 0); e.setTool("pp"); await sleep(20);
      const se0 = [...e.selection.edges][0], pe = se0 !== undefined ? [m().edgeA[se0], m().edgeB[se0]].map((v) => { const t = m().pt(v); return [q(t.x), q(t.y), q(t.z)]; }) : null;
      if (e.selection.edges.size !== 1) return { df: -99, n: -99, dy: [], dxs: [], dzs: [], sel: { v: e.selection.verts.size, e: e.selection.edges.size, f: e.selection.faces.size } };
      await dragTo(s0, { x: s0.x + 60, y: s0.y - 25 }, shift);
      fire("pointerup", s0.x + 60, s0.y - 25, 0, shift); await sleep(60);
      const nv = m().verts().filter((v) => !v0.has(v)).map((v) => m().pt(v));
      // 新点相对源点（按 z 配对：源边竖直，两端 z 不同；本地坐标原点在盒子中心，别假设 x = 1）
      const d = nv.map((p) => { const o = (pe ?? []).reduce((b, c) => (Math.abs(c[2] - p.z) < Math.abs(b[2] - p.z) ? c : b)); return { dx: q(p.x - o[0]), dy: q(p.y - o[1]), dz: q(p.z - o[2]) }; });
      const se = [...e.selection.edges][0], src = se !== undefined && m().hasE(se) ? [m().edgeA[se], m().edgeB[se]].map((v) => m().pt(v)) : [];
      const out2 = { df: m().faceCount() - f0, n: nv.length, off: d, pickedEdge: pe, newPts: nv.map((p) => [q(p.x), q(p.y), q(p.z)]), selAfter: src.map((p) => [q(p.x), q(p.y), q(p.z)]) };
      e.undo(); await sleep(10); e.config.set("handles", "show", false); return out2;
    };
    out.edgeFree = await run(false);
    out.edgePerp = await run(true);   // 手柄开着：按在边的中点 = 按在手柄中心
    const f0 = m().faceCount(); e.deselectAll(); e.selectExpand(e.pickAt(s0.x, s0.y), 0); e.setTool("pp"); await sleep(20);
    await dragTo(s0, { x: s0.x + 40, y: s0.y - 20 });
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", code: "Escape", bubbles: true, cancelable: true })); await sleep(40);
    fire("pointerup", s0.x + 40, s0.y - 20, 0); await sleep(40);
    out.esc = { df: m().faceCount() - f0, gesture: e.isGestureActive(), selEdges: e.selection.edges.size }; }
  // ⑤ 拾取范围
  { e.deselectAll(); hud.pick("move"); await sleep(30);
    const strip = document.getElementById("toolStrip")?.textContent ?? "";
    out.pick = { strip: /拾取/.test(strip) && document.querySelectorAll("#toolStrip .strip-icon-toggle").length === 3 };   // v0.16.39 起点 / 边 / 面 = 三颗图标开关
    // 角点往顶面中心挪一点点（几个像素）：正好在角点上射线会擦过去打不到面；挪一点 = 点的半径内、两条边的半径内、也在面上
    const c0 = px(P(1, 1, 1)), cc = px(P(0.5, 0.5, 1)), corner = { x: c0.x + (cc.x - c0.x) * 0.06, y: c0.y + (cc.y - c0.y) * 0.06 };
    const grabAt = async () => { e.deselectAll(); fire("pointermove", 40, 40, 0); await sleep(700); fire("pointermove", corner.x, corner.y, 0); await sleep(10); /* 先挪开、等过点按族的窗口：同一处连点 = 双击 / 三击（选面 / 选连通体） */ fire("pointerdown", corner.x, corner.y, 1); await sleep(10); fire("pointerup", corner.x, corner.y, 0); await sleep(40); return { v: e.selection.verts.size, e: e.selection.edges.size, f: e.selection.faces.size }; };
    out.pick.all = await grabAt();
    e.config.set("pick", "verts", false); out.pick.noVerts = await grabAt();
    e.config.set("pick", "edges", false); out.pick.noVertsEdges = await grabAt();
    e.config.set("pick", "faces", false); out.pick.none = await grabAt();   // 全关 = 当全开
    e.config.set("pick", "verts", true); e.config.set("pick", "edges", true); e.config.set("pick", "faces", true); }
  return out;
});
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const ip = res.inPlace, g = res.g, ef = res.edgeFree, ep = res.edgePerp;
const ok = res.e.started && res.e.tool === "pp" && ip.df === 4 && ip.dv === 4 && ip.steps === 1 && ip.topZ === 1 && ip.selTop && !ip.gesture && g.started && g.topZ > 1.05 && g.steps === 1 && !g.check
  && ef.df === 1 && ef.n === 2 && ef.off.every((o) => Math.abs(o.dz) > 0.01 || Math.abs(Math.abs(o.dx) - Math.abs(o.dy)) > 0.01)   // 屏幕空间：斜着拖出去的偏移不是纯 (1,−1,0) 方向
  && ep.df === 1 && ep.n === 2 && ep.off.every((o) => Math.abs(o.dz) < 1e-6 && Math.abs(Math.abs(o.dx) - Math.abs(o.dy)) < 1e-6 && Math.abs(o.dx) > 0.01)   // 手柄中心：只沿垂直方向（这条竖边两侧 +x / −y → (1,−1,0)/√2）
  && res.esc.df === 0 && !res.esc.gesture && res.esc.selEdges === 1
  && res.pick.strip && res.pick.all.v === 1 && res.pick.noVerts.v === 0 && res.pick.noVerts.e === 1 && res.pick.noVertsEdges.f === 1 && res.pick.noVertsEdges.v === 0 && res.pick.none.v === 1
  && errs.length === 0;
console.log(ok ? "probe-extrude-feel OK" : "probe-extrude-feel FAIL");
process.exit(ok ? 0 : 1);

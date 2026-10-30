// 自由建模的操纵手柄（2026-10-30 Claude Opus 5.5；tools/mesh-handles.ts）：网格体盒子里——
// ① 移动工具点顶面 = 只是选上它（没手柄）；快速点两下 = 双击（不出手柄）；隔过连击窗口再点一下 = 手柄开（箭头 + 平面块 + 中心）、右下露「朝向」、
//    没有「手柄」开关（v0.17.61 点第二下）、没有「复制」（自由建模的移动不认）；
// ② 拖 X 箭头 = 只动 x、一步撤销；③ 拖 XY 平面块 = z 不动；④ 先锁 Z 再拖 X 箭头 = 键盘锁压过手柄（只动 z）；⑤ 点在把手上没拖 = 选区不变、换朝向（物件 → 世界），再点选区 = 法向；⑥ 点空处 = 选区清、手柄关；
// ⑦ 旋转工具：点两下顶面（第二下出手柄）= 环 + 中心；从 45° 起拖 Z 环四分之一圈 = z 不变、到轴心的距离不变；⑧ 缩放工具：拖 X 方块往外 = 只有 x 变宽；
// ⑨ 朝向「法向」：选侧面（y = 0）= 手柄的 Z 朝 −y；⑩ 沿法线没有手柄组；⑪ 回到硬表面：移动工具没有手柄（SketchUp 手感不动）。
// v0.17.59：⑫ 挤出：点顶面 = 箭头 + 中心；拖 Z 箭头 = 顶面沿 z 挤出（xy 不变）；拖中心 = 换一种拖法（面 = 随手拖，xy 也动）；
// ⑬ 挤出按住 Shift = 吸附：挤到正好落在盒底那个点的高度（z = 0）；⑭ 变换工具：三家把手 + 等比块一直挂着（不用点）、右下只露朝向；拖 Z 环 = 转、拖等比块 = 等比放大、拖中心 = 挪；
// ⑮ 右上吸附钮：自由建模 = 磁铁（snap-element、不显示细分），硬表面 = 格点（snap-grid）+ 右上角细分数「1/N」；长按 / 右键菜单最上面直接列细分，点一下就换（v0.17.61）。
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mesh-handles.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, hud = globalThis.__catsup.hud, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const px = (p) => e.cam.angularPx(p, e.vp());
  const fire = (type, x, y, buttons, shift = false) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons, shiftKey: shift }));
  const drag = async (a, z, steps = 10, shift = false) => { fire("pointermove", a.x, a.y, 0, shift); await sleep(10); fire("pointerdown", a.x, a.y, 1, shift); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1, shift); await sleep(8); } fire("pointerup", z.x, z.y, 0, shift); await sleep(40); };
  const tapAt = async (s) => { fire("pointermove", s.x, s.y, 0); await sleep(10); fire("pointerdown", s.x, s.y, 1); await sleep(10); fire("pointerup", s.x, s.y, 0); await sleep(400); };   // 等过双击窗口，免得下一下算第二下
  const key = (k, ctrl = true) => window.dispatchEvent(new KeyboardEvent("keydown", { key: k, code: "Key" + k.toUpperCase(), ctrlKey: ctrl, bubbles: true, cancelable: true }));
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const S = () => e.scene, root = () => S().def(S().root), q = (x) => +x.toFixed(4);
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  box(0, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("块"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...root().instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  e.cam.setView("iso"); e.zoomExtents(); e.cam.halfH *= 1.6; e.draw();
  e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(20);
  e.deselectAll();
  const snap = () => m().verts().map((v) => { const p = m().pt(v); return [v, q(p.x), q(p.y), q(p.z)]; });
  const top0 = m().verts().filter((v) => Math.abs(m().pt(v).z - 1) < 1e-6);
  const gz = (tool) => e.handlers[tool].viewExtras(e.toolCtx).xformGizmo ?? null;
  const at = (g, d, t) => P(g.origin.x + d.x * t, g.origin.y + d.y * t, g.origin.z + d.z * t);
  const strip = () => document.getElementById("toolStrip")?.textContent ?? "";
  const s0 = snap();
  // ① 点顶面（离中心远一点，免得点在中心把手上）：第一下只选；快速点两下 = 双击不出手柄；第二下（隔过窗口）出手柄
  e.setTool("move"); await sleep(20);
  await tapAt(px(P(0.25, 0.75, 1)));
  out.first = { faces: e.selection.faces.size, show: e.config.get("handles", "show"), gizmo: gz("move") !== null, hint: hud.status() };
  { const s2 = px(P(0.25, 0.75, 1)); fire("pointerdown", s2.x, s2.y, 1); await sleep(10); fire("pointerup", s2.x, s2.y, 0); await sleep(60); fire("pointerdown", s2.x, s2.y, 1); await sleep(10); fire("pointerup", s2.x, s2.y, 0); await sleep(400);
    out.dbl = { gizmo: gz("move") !== null }; }
  e.deselectAll(); await tapAt(px(P(0.25, 0.75, 1)));   // 双击扩过选区：重来一遍
  await tapAt(px(P(0.25, 0.75, 1)));
  { const g = gz("move"); out.tap = { faces: e.selection.faces.size, show: e.config.get("handles", "show"), parts: g?.parts?.join(","), origin: g ? [q(g.origin.x), q(g.origin.y), q(g.origin.z)].join(",") : null, visible: e.r3.overlayVisible("xformGizmo"), strip: strip(), hint: hud.status() }; }
  // ② 拖 X 箭头（箭杆中段）斜着拖
  { const g = gz("move"), a = px(at(g, g.axes.x, (g.start + g.arrow) / 2)); const pos0 = e.history.position(); await drag(a, { x: a.x + 70, y: a.y - 50 });
    const s = snap(), mv = s.filter((v, i) => v.join() !== s0[i].join());
    out.arrowX = { n: mv.length, onlyX: mv.every((v) => { const o = s0.find((w) => w[0] === v[0]); return v[2] === o[2] && v[3] === o[3] && v[1] !== o[1]; }), steps: e.history.position() - pos0, still: !!gz("move") }; }
  key("z"); await sleep(30);
  // ③ 拖 XY 平面块往屏幕上方
  { const g = gz("move"), a = px(at(g, { x: g.axes.x.x + g.axes.y.x, y: g.axes.x.y + g.axes.y.y, z: g.axes.x.z + g.axes.y.z }, g.plane)); await drag(a, { x: a.x + 20, y: a.y - 70 });
    const s = snap(), mv = s.filter((v, i) => v.join() !== s0[i].join());
    out.planeXY = { n: mv.length, zKept: mv.every((v) => v[3] === 1) }; }
  key("z"); await sleep(30);
  // ④ 先锁 Z，再拖 X 箭头 = 只动 z
  e.lockKey("z", false);
  { const g = gz("move"), a = px(at(g, g.axes.x, (g.start + g.arrow) / 2)); await drag(a, { x: a.x + 30, y: a.y - 70 });
    const s = snap(), mv = s.filter((v, i) => v.join() !== s0[i].join());
    out.keyWins = { n: mv.length, onlyZ: mv.every((v) => { const o = s0.find((w) => w[0] === v[0]); return v[1] === o[1] && v[2] === o[2] && v[3] !== o[3]; }) }; }
  key("z"); await sleep(30);
  // ⑤ 点在箭头上（不拖）= 选区不变、手柄还在、朝向换一个（物件 → 世界）；再点选区一下 = 法向；换回物件接着测
  { const g = gz("move"), a = px(at(g, g.axes.y, (g.start + g.arrow) / 2)), f0 = [...e.selection.faces].join(); await tapAt(a);
    const o1 = e.config.get("handles", "orient"); await tapAt(px(P(0.25, 0.75, 1))); const o2 = e.config.get("handles", "orient");
    out.tapHandle = { same: [...e.selection.faces].join() === f0, still: !!gz("move"), o1, o2, hint: hud.status() }; e.config.set("handles", "orient", "object"); }
  // ⑥ 点空处 = 清选区、手柄关
  await tapAt({ x: 40, y: 700 });
  out.tapEmpty = { faces: e.selection.faces.size, show: e.config.get("handles", "show"), gizmo: gz("move") === null };
  // ⑦ 旋转：点顶面 → 环 + 中心；拖 Z 环四分之一圈
  e.setTool("rotate"); await sleep(20); await tapAt(px(P(0.25, 0.75, 1))); await tapAt(px(P(0.25, 0.75, 1)));
  { const g = gz("rotate"); out.rotParts = g?.parts?.join(",");
    const o = g.origin, u = g.axes.x, v = g.axes.y, R = g.ring, pt = (t) => px(P(o.x + (u.x * Math.cos(t) + v.x * Math.sin(t)) * R, o.y + (u.y * Math.cos(t) + v.y * Math.sin(t)) * R, o.z));
    const t0 = Math.PI / 4;   // 45°：0° 那一点同时在 Y 环上（XZ 面），会抓错环
    const a = pt(t0); fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1);
    for (let i = 1; i <= 12; i++) { const s = pt(t0 + (i / 12) * Math.PI / 2); fire("pointermove", s.x, s.y, 1); await sleep(8); }
    const z = pt(t0 + Math.PI / 2); fire("pointerup", z.x, z.y, 0); await sleep(40);
    const s = snap(), tp = s.filter((w) => top0.includes(w[0]));   // 网格体本地坐标 xy 以 0 为中心（顶面中心 = 本地 (0, 0, 1)）
    out.rotZ = { zKept: tp.every((w) => w[3] === 1), distKept: tp.every((w) => { const o0 = s0.find((x) => x[0] === w[0]); return Math.abs(Math.hypot(w[1], w[2]) - Math.hypot(o0[1], o0[2])) < 1e-3; }), changed: tp.some((w) => { const o0 = s0.find((x) => x[0] === w[0]); return w.join() !== o0.join(); }) }; }
  key("z"); await sleep(30);
  // ⑧ 缩放：拖 X 方块往外（屏幕上沿 X 轴的方向）
  e.setTool("scale"); await sleep(20);
  { const g = gz("scale"); out.scaleParts = g?.parts?.join(",");
    const a = px(at(g, g.axes.x, g.cube)), o = px(g.origin), dx = a.x - o.x, dy = a.y - o.y, L = Math.hypot(dx, dy); await drag(a, { x: a.x + dx / L * 60, y: a.y + dy / L * 60 });
    const s = snap(), tp = s.filter((w) => top0.includes(w[0]));
    out.scaleX = { yKept: tp.every((w) => { const o0 = s0.find((x) => x[0] === w[0]); return w[2] === o0[2] && w[3] === o0[3]; }), wider: Math.max(...tp.map((w) => w[1])) - Math.min(...tp.map((w) => w[1])) > 1.05 }; }
  key("z"); await sleep(30);
  // ⑨ 朝向 = 法向：选侧面 y = 0
  e.config.set("handles", "orient", "normal"); e.setTool("move"); await sleep(20);
  await tapAt({ x: 40, y: 700 }); await tapAt(px(P(0.75, 0, 0.25))); await tapAt(px(P(0.75, 0, 0.25)));
  { const g = gz("move"); out.normal = { faces: e.selection.faces.size, z: g ? [q(g.axes.z.x), q(g.axes.z.y), q(g.axes.z.z)].join(",") : null, strip: strip() }; }
  e.config.set("handles", "orient", "object");
  // ⑫ 挤出：点顶面 → 箭头 + 中心；拖 Z 箭头往上
  await tapAt({ x: 40, y: 700 }); e.setTool("pp"); await sleep(20); await tapAt(px(P(0.25, 0.75, 1))); await tapAt(px(P(0.25, 0.75, 1)));
  { const g = gz("pp"); out.pullParts = g?.parts?.join(",");
    const v0 = new Set(m().verts()), a = px(at(g, g.axes.z, (g.start + g.arrow) / 2)); await drag(a, { x: a.x + 15, y: a.y - 60 });
    const nv = m().verts().filter((v) => !v0.has(v)).map((v) => m().pt(v));
    out.pullZ = { n: nv.length, up: nv.every((p) => p.z > 1.05), xyOnCorners: nv.every((p) => Math.abs(Math.abs(p.x) - 0.5) < 1e-6 && Math.abs(Math.abs(p.y) - 0.5) < 1e-6) }; }
  key("z"); await sleep(30);
  { const g = gz("pp"), v0 = new Set(m().verts()), a = px(g.origin); await drag(a, { x: a.x + 60, y: a.y - 10 });   // 中心 = 面：屏幕平面随手拖
    const nv = m().verts().filter((v) => !v0.has(v)).map((v) => m().pt(v));
    out.pullCenter = { n: nv.length, xyMoved: nv.some((p) => Math.abs(Math.abs(p.x) - 0.5) > 0.02 || Math.abs(Math.abs(p.y) - 0.5) > 0.02) }; }
  key("z"); await sleep(30);
  // ⑬ 挤出 + Shift 吸附：从顶面右前角附近按下（抓住的点 = 那个角），拖到盒底右前角上 = 正好挤到 z = 0
  e.config.set("handles", "show", false);
  { const v0 = new Set(m().verts()), a = px(P(0.9, 0.1, 1)), z = px(P(1, 0, 0)); await drag(a, { x: z.x + 2, y: z.y + 1 }, 12, true);
    const nv = m().verts().filter((v) => !v0.has(v)).map((v) => m().pt(v));
    out.pullSnap = { n: nv.length, z: [...new Set(nv.map((p) => q(p.z)))].join(","), hint: hud.status() }; }
  key("z"); await sleep(30);
  // ⑭ 变换工具：选着顶面 → 三家把手 + 等比块一直挂着
  e.setTool("transform"); await sleep(20);
  { const g = gz("transform"); out.xf = { parts: g?.parts?.join(","), uniform: !!g?.uniform, strip: strip() };
    const s1 = snap(), o = g.origin, u = g.axes.x, v = g.axes.y, R = g.ring, pt = (t) => px(P(o.x + (u.x * Math.cos(t) + v.x * Math.sin(t)) * R, o.y + (u.y * Math.cos(t) + v.y * Math.sin(t)) * R, o.z));
    const t0 = Math.PI / 4, a = pt(t0); fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1);
    for (let i = 1; i <= 12; i++) { const s2 = pt(t0 + (i / 12) * Math.PI / 2); fire("pointermove", s2.x, s2.y, 1); await sleep(8); }
    const z2 = pt(t0 + Math.PI / 2); fire("pointerup", z2.x, z2.y, 0); await sleep(40);
    const tp = snap().filter((w) => top0.includes(w[0]));
    out.xfRing = { zKept: tp.every((w) => w[3] === 1), distKept: tp.every((w) => { const o0 = s1.find((x) => x[0] === w[0]); return Math.abs(Math.hypot(w[1], w[2]) - Math.hypot(o0[1], o0[2])) < 1e-3; }), changed: tp.some((w) => { const o0 = s1.find((x) => x[0] === w[0]); return w.join() !== o0.join(); }) };
    key("z"); await sleep(30); }
  { const g = gz("transform"), u = px(g.uniform), o = px(g.origin); await drag(u, { x: u.x + (u.x - o.x), y: u.y + (u.y - o.y) });   // 等比块往外拖到两倍远
    const tp = snap().filter((w) => top0.includes(w[0]));
    out.xfUniform = { bigger: tp.every((w) => Math.hypot(w[1], w[2]) > Math.hypot(0.5, 0.5) * 1.5), zKept: tp.every((w) => w[3] === 1) };
    key("z"); await sleep(30); }
  { const g = gz("transform"), a = px(g.origin); await drag(a, { x: a.x + 50, y: a.y - 40 });
    const s2 = snap(); out.xfCenter = { moved: s2.filter((w) => top0.includes(w[0])).every((w) => { const o0 = s0.find((x) => x[0] === w[0]); return w.join() !== o0.join(); }) };
    key("z"); await sleep(30); }
  // ⑮ 吸附钮的图标（自由建模）
  out.snapIconFree = document.querySelector(".gizmo-snap")?.dataset.icon;
  out.subdivFree = document.querySelector(".gizmo-subdiv")?.hidden;
  // ⑩ 沿法线没有手柄组
  out.shrinkGroups = e.handlers.shrink.stripGroups(e.config).map((x) => x.group).join(",");
  // ⑪ 回到硬表面：移动工具没有手柄
  e.exitContext(); await sleep(20);
  out.brep = { mode: e.modeId, groups: typeof e.handlers.move.stripGroups, strip: (e.setTool("move"), strip()), snapIcon: (globalThis.__catsup.syncUi?.(), document.querySelector(".gizmo-snap")?.dataset.icon) };
  { const btn = document.querySelector(".gizmo-snap"), sd = btn.querySelector(".gizmo-subdiv"), before = sd.textContent;
    btn.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true })); await sleep(120);
    const labs = [...document.querySelectorAll(".popup-menu .menu-label")], items = labs.map((x) => x.textContent.trim());   // 只看名字那一格（后面的提示是长度）
    const pick = labs.find((x) => x.textContent.trim() === "1 cm")?.closest("button, [role=menuitem], .menu-item");   // 3.4 起右上角 = 吸附长度（不再是 1/N）
    pick?.click(); await sleep(120);
    out.subdivBrep = { hidden: sd.hidden, before, after: sd.textContent, snap: e.grid.snap, menuHasSubdivs: ["1 mm", "1 cm", "10 cm", "20 cm", "1 m"].every((t) => items.includes(t)), menuHasLocks: items.some((x) => x.includes("方向锁")) };
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true })); }
  return out;
});
await b.close();
res.errs = errs;
const ok = res.first.faces === 1 && res.first.show === false && !res.first.gizmo && !res.dbl.gizmo
  && res.tap.faces === 1 && res.tap.show === true && res.tap.parts === "arrows,planes,center" && res.tap.origin === "0.5,0.5,1" && res.tap.visible && !res.tap.strip.includes("手柄") && res.tap.strip.includes("朝向") && !res.tap.strip.includes("复制")
  && res.arrowX.n === 4 && res.arrowX.onlyX && res.arrowX.steps === 1 && res.arrowX.still
  && res.planeXY.n === 4 && res.planeXY.zKept
  && res.keyWins.n === 4 && res.keyWins.onlyZ
  && res.tapHandle.same && res.tapHandle.still && res.tapHandle.o1 === "world" && res.tapHandle.o2 === "normal"
  && res.tapEmpty.faces === 0 && res.tapEmpty.show === false && res.tapEmpty.gizmo
  && res.rotParts === "rings,center" && res.rotZ.zKept && res.rotZ.distKept && res.rotZ.changed
  && res.scaleParts === "cubes,planes,center" && res.scaleX.yKept && res.scaleX.wider
  && res.normal.faces === 1 && res.normal.z === "0,-1,0"
  && res.shrinkGroups === "soft"
  && res.brep.mode === "geometry" && res.brep.groups === "undefined" && !res.brep.strip.includes("手柄")
  && res.pullParts === "arrows,center" && res.pullZ.n === 4 && res.pullZ.up && res.pullZ.xyOnCorners && res.pullCenter.n === 4 && res.pullCenter.xyMoved
  && res.pullSnap.n === 4 && res.pullSnap.z === "0"
  && res.xf.parts === "arrows,rings,cubes,planes,center" && res.xf.uniform && res.xf.strip.includes("朝向") && !res.xf.strip.includes("手柄") && !res.xf.strip.includes("变换中心") && !res.xf.strip.includes("复制")
  && res.xfRing.zKept && res.xfRing.distKept && res.xfRing.changed && res.xfUniform.bigger && res.xfUniform.zKept && res.xfCenter.moved
  && res.snapIconFree === "snap-element" && res.brep.snapIcon === "snap-grid"
  && res.subdivFree === true && res.subdivBrep.hidden === false && res.subdivBrep.before === "20 cm" && res.subdivBrep.after === "1 cm" && Math.abs(res.subdivBrep.snap - 0.01) < 1e-12 && res.subdivBrep.menuHasSubdivs && res.subdivBrep.menuHasLocks
  && !errs.length;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "✓ probe-mesh-handles" : "✗ probe-mesh-handles");
process.exit(ok ? 0 : 1);

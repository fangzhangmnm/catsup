// 自由建模的操纵手柄（2026-10-30 Claude Opus 5.5；tools/mesh-handles.ts）：网格体盒子里——
// ① 移动工具点顶面 = 选上它 + 手柄开（箭头 + 平面块 + 中心）、右下有「手柄」开关、没有「复制」（自由建模的移动不认）；
// ② 拖 X 箭头 = 只动 x、一步撤销；③ 拖 XY 平面块 = z 不动；④ 先锁 Z 再拖 X 箭头 = 键盘锁压过手柄（只动 z）；⑤ 点在把手上没拖 = 什么都不变；⑥ 点空处 = 选区清、手柄关；
// ⑦ 旋转工具：点顶面 = 环 + 中心；从 45° 起拖 Z 环四分之一圈 = z 不变、到轴心的距离不变；⑧ 缩放工具：拖 X 方块往外 = 只有 x 变宽；
// ⑨ 朝向「法向」：选侧面（y = 0）= 手柄的 Z 朝 −y；⑩ 沿法线没有手柄组；⑪ 回到硬表面：移动工具没有手柄（SketchUp 手感不动）。
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
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 5, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const drag = async (a, z, steps = 10) => { fire("pointermove", a.x, a.y, 0); await sleep(10); fire("pointerdown", a.x, a.y, 1); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (z.x - a.x) * i / steps, a.y + (z.y - a.y) * i / steps, 1); await sleep(8); } fire("pointerup", z.x, z.y, 0); await sleep(40); };
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
  // ① 点顶面（离中心远一点，免得点在中心把手上）
  e.setTool("move"); await sleep(20);
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
  // ⑤ 点在箭头上（不拖）= 选区不变、手柄还在
  { const g = gz("move"), a = px(at(g, g.axes.y, (g.start + g.arrow) / 2)), f0 = [...e.selection.faces].join(); await tapAt(a); out.tapHandle = { same: [...e.selection.faces].join() === f0, still: !!gz("move"), hint: hud.status() }; }
  // ⑥ 点空处 = 清选区、手柄关
  await tapAt({ x: 40, y: 700 });
  out.tapEmpty = { faces: e.selection.faces.size, show: e.config.get("handles", "show"), gizmo: gz("move") === null };
  // ⑦ 旋转：点顶面 → 环 + 中心；拖 Z 环四分之一圈
  e.setTool("rotate"); await sleep(20); await tapAt(px(P(0.25, 0.75, 1)));
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
  await tapAt({ x: 40, y: 700 }); await tapAt(px(P(0.75, 0, 0.25)));
  { const g = gz("move"); out.normal = { faces: e.selection.faces.size, z: g ? [q(g.axes.z.x), q(g.axes.z.y), q(g.axes.z.z)].join(",") : null, strip: strip() }; }
  e.config.set("handles", "orient", "object");
  // ⑩ 沿法线没有手柄组
  out.shrinkGroups = e.handlers.shrink.stripGroups().map((x) => x.group).join(",");
  // ⑪ 回到硬表面：移动工具没有手柄
  e.exitContext(); await sleep(20);
  out.brep = { mode: e.modeId, groups: typeof e.handlers.move.stripGroups, strip: (e.setTool("move"), strip()) };
  return out;
});
await b.close();
res.errs = errs;
const ok = res.tap.faces === 1 && res.tap.show === true && res.tap.parts === "arrows,planes,center" && res.tap.origin === "0.5,0.5,1" && res.tap.visible && res.tap.strip.includes("手柄") && res.tap.strip.includes("朝向") && !res.tap.strip.includes("复制")
  && res.arrowX.n === 4 && res.arrowX.onlyX && res.arrowX.steps === 1 && res.arrowX.still
  && res.planeXY.n === 4 && res.planeXY.zKept
  && res.keyWins.n === 4 && res.keyWins.onlyZ
  && res.tapHandle.same && res.tapHandle.still
  && res.tapEmpty.faces === 0 && res.tapEmpty.show === false && res.tapEmpty.gizmo
  && res.rotParts === "rings,center" && res.rotZ.zKept && res.rotZ.distKept && res.rotZ.changed
  && res.scaleParts === "cubes,planes,center" && res.scaleX.yKept && res.scaleX.wider
  && res.normal.faces === 1 && res.normal.z === "0,-1,0"
  && res.shrinkGroups === "soft"
  && res.brep.mode === "geometry" && res.brep.groups === "undefined" && !res.brep.strip.includes("手柄")
  && !errs.length;
console.log(JSON.stringify(res, null, 1));
console.log(ok ? "✓ probe-mesh-handles" : "✗ probe-mesh-handles");
process.exit(ok ? 0 : 1);

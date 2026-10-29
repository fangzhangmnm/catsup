// 镜像的对抗性探针：物件不在原点、转过两根轴（created 2026-10-28 by Claude Opus 5.5）。
// user 10-28 晚「你有做镜像的物件不在原点，有旋转的对抗性测试吗」——没有：单测（mesh-mirror.test）只在网格体自己的坐标里算；probe-mesh-mirror 的盒子没转过（⑧ ⑨ 挪开过、没转）。
// 风险全在「屏幕 → 世界 → 物件自己的坐标」那一层：拖动在屏幕上、镜像面在物件自己的坐标里。这里把网格体组件挪到 (5, 3, 2)、绕 Z 37° 再绕 X 20°，然后全用真工具拖：
// Ⓐ 镜像编辑拖 +x 一个角：预演里对面就跟着镜、松手后对面 = 本地镜像、一步
// Ⓑ 拖中缝上的点：本地 x 永远 = 0（钉在镜像面里滑）
// Ⓒ 锁 Z（= 物件自己的 Z）再斜着拖一个角：本地只有 z 变、对面同样
// Ⓓ 把 +x 的角拖到对面去：停在中缝、和孪生点并成一个（少一个点）、自检干净、仍对称；预演里就已经停住
// Ⓔ 撤销到切完中缝那一刻：每个点逐位回到原处
// Ⓕ 强行对称：挤出工具真拖 +x 端面 → -x 也长出来、同一步、对称、自检干净
// Ⓖ 视图 gizmo 的镜像方片：没对不上的（0）
// 跑法：python3 -m http.server 8765 后 node test/probes/probe-mirror-xform.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire("/home/fangzhangmnm/jupyter/20260601 PWAProjects/20260524 WeebPaint/package.json")("playwright");
const b = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await b.newPage({ viewport: { width: 1000, height: 800 } });
page.setDefaultTimeout(4000);
const errs = []; page.on("pageerror", (e) => errs.push(String(e.stack ?? e).slice(0, 300)));
await page.goto(process.argv[2] ?? "http://127.0.0.1:8765/", { waitUntil: "load", timeout: 30000 }); await page.waitForTimeout(1200);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor, P = (x, y, z = 0) => ({ x, y, z }), sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const c = document.getElementById("board"), r = c.getBoundingClientRect();
  const fire = (type, x, y, buttons) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 13, pointerType: "mouse", isPrimary: true, button: 0, buttons }));
  const S = () => e.scene, px = (p) => e.cam.angularPx(p, e.vp());
  const box = (x0, y0, z0, x1, y1, z1) => { const B = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], segs = []; for (let i = 0; i < 4; i++) { const a = B[i], d = B[(i + 1) % 4]; segs.push([P(a[0], a[1], z0), P(d[0], d[1], z0)]); segs.push([P(a[0], a[1], z1), P(d[0], d[1], z1)]); segs.push([P(a[0], a[1], z0), P(a[0], a[1], z1)]); } e.commitOp({ op: "addEdges", at: e.activePool(), segs }); };
  const out = {};
  e.setGrid({ ...e.grid, on: false });
  box(-1, 0, 0, 1, 1, 1); e.selectAll(); e.makeComponent("斜"); e.runAction("object.toMesh"); await sleep(20);
  const inst = [...S().def(S().root).instances.values()][0], def = inst.def, m = () => S().mesh(def).kernel;
  const enter = async () => { e.selectedPools.clear(); e.selectedPools.set(`i${inst.id}`, { kind: "instance", instance: inst.id }); e.enterSelected(); await sleep(30); };
  await enter();
  e.selectAll(); e.runAction("mesh.originToSelection"); e.deselectAll(); await sleep(20);   // 本地中心 = 原点：中缝在本地 x = 0
  e.exitTo(0); await sleep(20);
  // 挪到 (5, 3, 2)、绕 Z 37° 再绕 X 20°（world = T · Rz · Rx · 原来的）
  const a = 37 * Math.PI / 180, bb = 20 * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a), cb = Math.cos(bb), sb = Math.sin(bb);
  const R = [[ca, -sa * cb, sa * sb], [sa, ca * cb, -ca * sb], [0, sb, cb]];
  e.commitOp({ op: "transformInstance", def: S().root, instance: inst.id, xform: [R[0][0], R[0][1], R[0][2], 5, R[1][0], R[1][1], R[1][2], 3, R[2][0], R[2][1], R[2][2], 2] });
  await enter();
  const X = () => S().xformOfContext(e.ctx);
  const L2W = (lp) => { const x = X(); return { x: x[0] * lp.x + x[1] * lp.y + x[2] * lp.z + x[3], y: x[4] * lp.x + x[5] * lp.y + x[6] * lp.z + x[7], z: x[8] * lp.x + x[9] * lp.y + x[10] * lp.z + x[11] }; };
  out.rotated = Math.abs(X()[0] - 1) > 0.05 && Math.abs(X()[3]) > 1;
  { const ctr = L2W(P(0, 0, 0)); e.cam.setView("iso"); e.cam.target = ctr; e.cam.halfH = 2.2; e.draw(); await sleep(20); }
  // 切中缝（本地 x = 0）
  const cut = m().edges().find((x) => Math.abs(m().pt(m().edgeA[x]).x - m().pt(m().edgeB[x]).x) > 1.5);
  e.commitOp({ op: "meshLoopCut", def, edge: cut, t: 0.5 });
  e.setMirror("edit", 0); await sleep(30);
  const snap = () => new Map(m().verts().map((v) => [v, { ...m().pt(v) }]));
  const snap0 = snap(), pos0 = e.history.position();
  const eye = e.cam.eye(), dEye = (lp) => { const w = L2W(lp); return Math.hypot(w.x - eye.x, w.y - eye.y, w.z - eye.z); };
  const sym = (k) => k.verts().every((v) => { const q = k.pt(v); return k.verts().some((w) => { const p = k.pt(w); return Math.abs(p.x + q.x) < 1e-6 && Math.abs(p.y - q.y) < 1e-6 && Math.abs(p.z - q.z) < 1e-6; }); });
  const twinOf = (k, v) => { const q = k.pt(v); return k.verts().find((w) => w !== v && Math.abs(k.pt(w).x + q.x) < 1e-6 && Math.abs(k.pt(w).y - q.y) < 1e-6 && Math.abs(k.pt(w).z - q.z) < 1e-6); };
  /** +x 的角里离眼睛最近的那个（看得见、点得中）。 */
  const frontCorner = (x) => m().verts().filter((v) => Math.abs(m().pt(v).x - x) < 1e-9).sort((p, q) => dEye(m().pt(p)) - dEye(m().pt(q)))[0];
  const dragTool = async (tool, s0, s1, mid) => {
    e.setTool(tool); await sleep(10);
    fire("pointermove", s0.x, s0.y, 0); await sleep(10); fire("pointerdown", s0.x, s0.y, 1); await sleep(10);
    for (let i = 1; i <= 8; i++) { fire("pointermove", s0.x + (s1.x - s0.x) * i / 8, s0.y + (s1.y - s0.y) * i / 8, 1); await sleep(12); }
    const live = mid ? mid(e.liveMesh) : null;
    fire("pointerup", s1.x, s1.y, 0); await sleep(50);
    return live;
  };
  out.gizmo = await (async () => { for (let i = 0; i < 12; i++) { const g = document.querySelector(".gizmo-mirror"); if (g) return { mode: g.dataset.mode, unpaired: Number(g.dataset.unpaired) }; await sleep(100); } return null; })();
  // Ⓐ
  { const v = frontCorner(1), w = twinOf(m(), v), p0 = { ...m().pt(v) }, st = e.history.steps(), s0 = px(L2W(p0));
    const live = await dragTool("move", s0, { x: s0.x + 40, y: s0.y - 25 }, (lm) => lm ? { mirrored: Math.abs(lm.pt(w).x + lm.pt(v).x) < 1e-6 && Math.abs(lm.pt(w).y - lm.pt(v).y) < 1e-6 && Math.abs(lm.pt(w).z - lm.pt(v).z) < 1e-6, moved: Math.hypot(lm.pt(v).x - p0.x, lm.pt(v).y - p0.y, lm.pt(v).z - p0.z) > 0.02 } : null);
    const q = m().pt(v), t = m().pt(w);
    out.A = { live, moved: Math.hypot(q.x - p0.x, q.y - p0.y, q.z - p0.z) > 0.02, mirrored: Math.abs(t.x + q.x) < 1e-6 && Math.abs(t.y - q.y) < 1e-6 && Math.abs(t.z - q.z) < 1e-6, steps: e.history.steps() - st, check: m().check().join(";") }; }
  // Ⓑ
  { const seam = m().verts().filter((v) => Math.abs(m().pt(v).x) < 1e-9).sort((p, q) => dEye(m().pt(p)) - dEye(m().pt(q)))[0], p0 = { ...m().pt(seam) }, s0 = px(L2W(p0));
    await dragTool("move", s0, { x: s0.x + 35, y: s0.y + 20 });
    const q = m().pt(seam);
    out.B = { x: q.x, moved: Math.hypot(q.y - p0.y, q.z - p0.z) > 0.02, count: m().vertexCount() === snap0.size, sym: sym(m()) }; }
  // Ⓒ 锁 Z（物件自己的 Z）
  { const v = frontCorner(1), w = twinOf(m(), v), p0 = { ...m().pt(v) }, s0 = px(L2W(p0));
    e.setTool("move"); e.setAxisLock("z");
    await dragTool("move", s0, { x: s0.x + 30, y: s0.y - 40 });
    e.setAxisLock(null);
    const q = m().pt(v), t = w !== undefined ? m().pt(w) : null;
    out.C = { dx: q.x - p0.x, dy: q.y - p0.y, dz: q.z - p0.z, twin: t ? Math.abs(t.x + q.x) < 1e-6 && Math.abs(t.y - q.y) < 1e-6 && Math.abs(t.z - q.z) < 1e-6 : null }; }
  // Ⓓ 拖过镜像面
  { const v = frontCorner(1), w = twinOf(m(), v), p0 = { ...m().pt(v) }, n0 = m().vertexCount(), s0 = px(L2W(p0)), s1 = px(L2W({ x: -p0.x - 0.4, y: p0.y, z: p0.z }));
    const live = await dragTool("move", s0, s1, (lm) => lm ? { x: lm.hasV?.(v) ? lm.pt(v).x : null } : null);
    out.D = { live, n0, n1: m().vertexCount(), gone: !(m().hasV(v) && m().hasV(w)) || Math.abs(m().pt(v).x) < 1e-9, check: m().check().join(";"), sym: sym(m()), anyNegX: m().verts().some((q) => m().pt(q).x < -1.5) }; }
  // Ⓔ 撤销到切完中缝那一刻
  { for (let i = 0; i < 12 && e.history.position() > pos0; i++) { e.undo(); await sleep(10); }
    const now = snap();
    let worst = 0, missing = 0; for (const [v, p] of snap0) { const q = now.get(v); if (!q) { missing++; continue; } worst = Math.max(worst, Math.abs(q.x - p.x), Math.abs(q.y - p.y), Math.abs(q.z - p.z)); }
    out.E = { worst, missing, extra: now.size - snap0.size, pos: e.history.position() === pos0 }; }
  // Ⓕ 强行对称 + 挤出工具真拖 +x 端面
  { e.setMirror("force", 0); await sleep(20);
    // 相机转到斜对着 +x 端面（世界法向偏一点上、偏一点侧，正对着按不准拖的方向）：背着的面按下去会落到别的面上（第一版探针就这么假红过）
    { const c0 = L2W(P(1, 0, 0)), o = L2W(P(0, 0, 0)), n = { x: c0.x - o.x, y: c0.y - o.y, z: c0.z - o.z }, side = L2W(P(0, 1, 0)), sd = { x: side.x - o.x, y: side.y - o.y, z: side.z - o.z };
      const d = { x: n.x + 0.45 * sd.x, y: n.y + 0.45 * sd.y, z: n.z + 0.45 * sd.z + 0.35 }, L = Math.hypot(d.x, d.y, d.z);
      e.cam.yaw = Math.atan2(d.y, d.x); e.cam.pitch = Math.asin(d.z / L); e.cam.target = o; e.draw(); await sleep(20); }
    const eye = e.cam.eye();
    // 两个端面（本地 x = ±1）里朝着眼睛的那个
    const endFace = (sx) => m().faces().find((x) => m().faceVerts(x).every((v) => Math.abs(m().pt(v).x - sx) < 1e-9));
    const centerOf = (f) => { const vs = m().faceVerts(f); return vs.reduce((acc, v) => ({ x: acc.x + m().pt(v).x / vs.length, y: acc.y + m().pt(v).y / vs.length, z: acc.z + m().pt(v).z / vs.length }), P(0, 0, 0)); };
    const faces = [1, -1].map((sx) => { const f = endFace(sx), c0 = centerOf(f), w0 = L2W(c0), wn = L2W({ ...c0, x: c0.x + sx }); return { sx, f, c0, facing: (wn.x - w0.x) * (eye.x - w0.x) + (wn.y - w0.y) * (eye.y - w0.y) + (wn.z - w0.z) * (eye.z - w0.z) }; }).sort((p, q) => q.facing - p.facing);
    const pick = faces[0], ctr = pick.c0;
    const f0 = m().faceCount(), st = e.history.steps(), s0 = px(L2W(ctr)), s1 = px(L2W({ ...ctr, x: ctr.x + 0.6 * pick.sx }));
    out.F0 = { side: pick.sx, facing: +pick.facing.toFixed(3), screenLen: Math.round(Math.hypot(s1.x - s0.x, s1.y - s0.y)) };
    await dragTool("pp", s0, s1);
    const xs = m().verts().map((v) => m().pt(v).x);
    const ys = m().verts().map((v) => m().pt(v).y), zs = m().verts().map((v) => m().pt(v).z);
    out.F = { f0, f1: m().faceCount(), steps: e.history.steps() - st, maxX: Math.max(...xs), minX: Math.min(...xs), y: [Math.min(...ys), Math.max(...ys)], z: [Math.min(...zs), Math.max(...zs)], sym: sym(m()), check: m().check().join(";") }; }
  e.setMirror(null);
  return out;
});
await b.close();
res.errs = errs;
console.log(JSON.stringify(res, null, 1));
const fails = [];
const need = (ok, what) => { if (!ok) fails.push(what); };
need(res.rotated, "组件没转起来（探针自己的设置坏了）");
need(res.gizmo && res.gizmo.unpaired === 0, "Ⓖ gizmo 说有对不上的");
need(res.A.live?.mirrored && res.A.live?.moved, "Ⓐ 预演里对面没跟着镜");
need(res.A.moved && res.A.mirrored && res.A.steps === 1 && !res.A.check, "Ⓐ 松手后对面不是本地镜像 / 不是一步 / 自检不干净");
need(Math.abs(res.B.x) < 1e-9 && res.B.moved && res.B.count && res.B.sym, "Ⓑ 中缝点离开了镜像面 / 裂了");
need(Math.abs(res.C.dx) < 1e-9 && Math.abs(res.C.dy) < 1e-9 && Math.abs(res.C.dz) > 0.02 && res.C.twin, "Ⓒ 锁 Z 不是物件自己的 Z / 对面没跟");
need(res.D.n1 === res.D.n0 - 1 && !res.D.check && res.D.sym && !res.D.anyNegX, "Ⓓ 拖过镜像面没停在中缝并成一个");
need(res.D.live && (res.D.live.x === null || Math.abs(res.D.live.x) < 1e-9), "Ⓓ 预演里没停在中缝");
need(res.E.worst < 1e-12 && res.E.missing === 0 && res.E.extra === 0 && res.E.pos, "Ⓔ 撤销回不到原样");
need(res.F.f1 > res.F.f0 && res.F.steps === 1 && res.F.sym && !res.F.check && res.F.maxX > 1.2 && res.F.minX < -1.2, "Ⓕ 强行对称的挤出没两边一起长 / 不对称");
need(res.errs.length === 0, "页面错误");
console.log(fails.length ? `probe-mirror-xform FAIL\n- ${fails.join("\n- ")}` : "probe-mirror-xform OK");
process.exit(fails.length ? 1 : 0);

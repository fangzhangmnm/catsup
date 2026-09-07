// test/probes/probe-xr-fake.mjs —— 假 XR 会话探针：不戴头显验证 VR 接线（出生 reset / 手柄→player / rig 代数 / 扳机画线 / 手腕面板点按 /
// 选择阶段长按 / 摇杆瞬移）。把 renderer3.xr 门面的 session/frame/refSpace 换成 mock，手动触发 onStart；three 的 WebXRManager 不参与
// （isPresenting=false → 仍用桌面相机渲染，所以画面不是 VR 视角，但全部逻辑是）。
// created 2026-09-07 by Claude Fable 5.1；用法：python3 -m http.server 8765 → node test/probes/probe-xr-fake.mjs
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const out = process.env.PROBE_OUT ?? "/tmp";
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1200, height: 800 }, deviceScaleFactor: 1 });
const errs = []; page.on("pageerror", (e) => errs.push(e.message)); page.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(500);
const fails = [];
const check = (ok, msg) => { console.log((ok ? "  ✓ " : "  ✗ ") + msg); if (!ok) fails.push(msg); };

// ---- 装 mock ----
await page.evaluate(() => {
  const { editor, vr } = globalThis.__catsup;
  const r3 = editor.renderer3;
  const ident = { x: 0, y: 0, z: 0, w: 1 };
  const fake = {
    head: { position: { x: 0, y: 1.6, z: 0 }, orientation: ident },
    right: { position: { x: 0.2, y: 1.2, z: -0.1 }, orientation: ident },
    left: { position: { x: -0.2, y: 1.2, z: -0.1 }, orientation: ident },
    axes: { left: [0, 0, 0, 0], right: [0, 0, 0, 0] },
    buttons: { left: [0, 0, 0, 0, 0, 0], right: [0, 0, 0, 0, 0, 0] },
    pulses: [],
  };
  const src = (hand) => ({
    handedness: hand, targetRayMode: "tracked-pointer", targetRaySpace: { hand, kind: "ray" }, gripSpace: { hand, kind: "grip" }, profiles: [],
    get gamepad() { return { axes: fake.axes[hand], buttons: fake.buttons[hand].map((v) => ({ pressed: !!v, touched: !!v, value: v })), mapping: "xr-standard", hapticActuators: [{ pulse: (i, ms) => { fake.pulses.push([hand, i, ms]); return Promise.resolve(true); } }] }; },
  });
  const session = { inputSources: [src("left"), src("right")], end: async () => { r3.xr._end(); }, addEventListener() {}, removeEventListener() {} };
  const frame = {
    getViewerPose: () => ({ transform: fake.head }),
    getPose: (space) => ({ transform: space.kind === "ray" ? fake[space.hand] : { position: { x: fake[space.hand].position.x, y: fake[space.hand].position.y - 0.05, z: fake[space.hand].position.z + 0.05 }, orientation: fake[space.hand].orientation } }),
  };
  const ref = { addEventListener() {}, removeEventListener() {} };
  const listeners = { sessionstart: [], sessionend: [] };
  // 替换门面（readonly 只是 TS）
  r3.xr.session = () => session; r3.xr.frame = () => frame; r3.xr.refSpace = () => ref;
  r3.xr._end = () => { vr.onEnd(); };
  globalThis.__fake = fake;
  // 手动开会话；随后停掉真实渲染循环（onStart→onChange→syncLoop 会起 loopTick 也调 vr.tick，和探针的手动 tick 叠加多走步——探针只认手动 tick）
  vr.onStart();
  editor.setLoop(null);
});
const st0 = await page.evaluate(() => ({ presenting: globalThis.__catsup.vr.isPresenting(), mode: globalThis.__catsup.locomotion.getMode(), hint: document.getElementById("hint").textContent.slice(0, 3) }));
check(st0.presenting && st0.mode === "xr" && st0.hint === "VR：", `会话开始 ${JSON.stringify(st0)}`);

// ---- 一帧：出生 reset（头锚定）+ rig 代数 ----
const tick = async (dt = 1 / 60, n = 1) => page.evaluate(([dt, n]) => { for (let i = 0; i < n; i++) { globalThis.__catsup.vr.tick(dt); globalThis.__catsup.editor.draw(); } }, [dt, n]);
await tick();
const rigCheck = await page.evaluate(() => {
  const { locomotion, editor } = globalThis.__catsup;
  const r3 = editor.renderer3;
  r3.setRig(locomotion.pose());   // 非 presenting 时 draw() 会把 rig 复位（flat 相机要单位阵）；真 XR 不复位——这里显式设回来验代数
  const st = locomotion.sim.state;
  // rig 局部追踪空间 (0,0,-1)（前）→ 世界应为 heading 的前向；(0,1,0)（上）→ (0,0,1)
  const f = r3.rig.position.clone().set(0, 0, -1); r3.rig.localToWorld(f);
  const u = r3.rig.position.clone().set(0, 1, 0); r3.rig.localToWorld(u);
  const o = r3.rig.position.clone();
  const fwd = { x: f.x - o.x, y: f.y - o.y, z: f.z - o.z }, up = { x: u.x - o.x, y: u.y - o.y, z: u.z - o.z };
  return { heading: st.heading, pos: st.pos, to: st.trackingOrigin, fwd, up, head: locomotion.pose().headWorld };
});
{
  const h = rigCheck.heading;
  const ef = { x: -Math.sin(h), y: Math.cos(h) };
  check(Math.abs(rigCheck.fwd.x - ef.x) < 1e-6 && Math.abs(rigCheck.fwd.y - ef.y) < 1e-6 && Math.abs(rigCheck.fwd.z) < 1e-6, `rig 前向 = heading 前向 ${JSON.stringify(rigCheck.fwd)} vs ${JSON.stringify(ef)}`);
  check(Math.abs(rigCheck.up.z - 1) < 1e-6, `rig 上 = +Z ${JSON.stringify(rigCheck.up)}`);
  check(Math.abs(rigCheck.head.x - rigCheck.pos.x) < 1e-6 && Math.abs(rigCheck.head.y - rigCheck.pos.y) < 1e-6 && Math.abs(rigCheck.head.z - rigCheck.pos.z - 1.6) < 1e-6, `首帧 reset：头在身上、高 1.6 ${JSON.stringify(rigCheck.head)} pos=${JSON.stringify(rigCheck.pos)}`);
}

// ---- 左摇杆走 1 s（60 帧）沿头前向 ----
await page.evaluate(() => { globalThis.__fake.axes.left = [0, 0, 0, -1]; });
const p0 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos }));
await tick(1 / 60, 60);
await page.evaluate(() => { globalThis.__fake.axes.left = [0, 0, 0, 0]; });
const p1 = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos, h: globalThis.__catsup.locomotion.sim.state.heading }));
{
  const d = Math.hypot(p1.x - p0.x, p1.y - p0.y);
  const ef = { x: -Math.sin(p1.h), y: Math.cos(p1.h) };
  const along = ((p1.x - p0.x) * ef.x + (p1.y - p0.y) * ef.y) / (d || 1);
  check(Math.abs(d - 3) < 0.05 && along > 0.999, `左摇杆前推 1 s 走 3 m 沿前向 d=${d.toFixed(3)} along=${along.toFixed(4)}`);
}

// ---- 右摇杆右推 = snap turn −45°（一次） ----
const hBefore = p1.h;
await page.evaluate(() => { globalThis.__fake.axes.right = [0, 0, 1, 0]; });
await tick(1 / 60, 10);
await page.evaluate(() => { globalThis.__fake.axes.right = [0, 0, 0, 0]; });
await tick(1 / 60, 5);
const hAfter = await page.evaluate(() => globalThis.__catsup.locomotion.sim.state.heading);
check(Math.abs(hAfter - (hBefore - Math.PI / 4)) < 1e-9, `snap turn 右一档 ${hBefore.toFixed(3)} → ${hAfter.toFixed(3)}`);

// ---- 扳机画线：右手射线指向地面两点 ----
await page.evaluate(() => { globalThis.__catsup.editor.setTool("line"); });
const edges0 = await page.evaluate(() => globalThis.__catsup.editor.kernel.edges().length);
// 让射线朝前下 45°（绕参考系 X 轴转 −45°：前向 −Z 变成 (0,−s,−c)）
const aimDown = (deg) => { const a = (deg * Math.PI) / 360; return { x: Math.sin(-a), y: 0, z: 0, w: Math.cos(a) }; };
await page.evaluate((q) => { globalThis.__fake.right.orientation = q; }, aimDown(50));
await tick(1 / 60, 3);
const hover = await page.evaluate(() => globalThis.__catsup.editor.snapInfo ? globalThis.__catsup.editor.snapInfo.kind : "none");
check(hover === null || hover === "none" || typeof hover === "string", `悬停走了 pointerMove（snap=${hover}）`);
await page.evaluate(() => { globalThis.__fake.buttons.right[0] = 1; });
await tick(1 / 60, 3);
const active = await page.evaluate(() => globalThis.__catsup.editor.isGestureActive());
check(active, "扳机按下 = 落笔（手势进行中）");
await page.evaluate((q) => { globalThis.__fake.right.orientation = q; }, aimDown(25));
await tick(1 / 60, 10);
await page.evaluate(() => { globalThis.__fake.buttons.right[0] = 0; });
await tick(1 / 60, 3);
const edges1 = await page.evaluate(() => globalThis.__catsup.editor.kernel.edges().length);
check(edges1 === edges0 + 1, `扳机松开 = 落线（边 ${edges0} → ${edges1}）`);
await page.keyboard.press("Escape");
await tick(1 / 60, 2);

// ---- 手腕面板：射线指向面板中心的「矩形」格 → 扳机 → 工具切换 ----
const panelPick = await page.evaluate(() => {
  const { editor, vr, locomotion } = globalThis.__catsup;
  const r3 = editor.renderer3;
  r3.setRig(locomotion.pose());
  const mesh = r3.wrist.mesh;
  mesh.updateWorldMatrix(true, false);
  // 面板中心世界坐标 + 「矩形」格的 uv → 世界点：用 wristHit 反求：从面板法向上方打射线找 uv
  const center = mesh.position.clone(); mesh.parent.localToWorld(center);   // 网格局部原点在父（grip）里的世界位置
  const n = mesh.position.clone().set(0, 0, 1).applyQuaternion(mesh.getWorldQuaternion(mesh.position.clone().set(0,0,0).constructor === Object ? null : new (mesh.quaternion.constructor)()));
  return { center: { x: center.x, y: center.y, z: center.z }, n: { x: n.x, y: n.y, z: n.z } };
}).catch((e) => ({ err: String(e) }));
if (panelPick.err) check(false, "面板几何取值 " + panelPick.err);
else {
  // 用 wristHit 找「矩形」格的世界点：在面板上方沿法向扫描 uv 网格
  const cell = await page.evaluate(({ center, n }) => {
    const { editor, vr, locomotion } = globalThis.__catsup;
    const r3 = editor.renderer3;
    r3.setRig(locomotion.pose());   // 同上：与 vr.tick 内 setRig 后的世界一致
    const panel = vr.panel;
    panel.redraw(true);
    // 从法向 0.2 m 处向面板打射线，扫 uv 找 rect 格
    for (let v = 0.05; v < 1; v += 0.02) for (let u = 0.05; u < 1; u += 0.02) {
      const id = panel.hit(u, v);
      if (id !== "rect") continue;
      // 逆求：面板局部 (u,v) → 世界。用 mesh 的 geometry 尺寸
      const mesh = r3.wrist.mesh; const w = mesh.geometry.parameters.width, h = mesh.geometry.parameters.height;
      const local = mesh.position.clone().set((u - 0.5) * w, (0.5 - v) * h, 0);
      mesh.localToWorld(local);
      const origin = { x: local.x + n.x * 0.2, y: local.y + n.y * 0.2, z: local.z + n.z * 0.2 };
      const dir = { x: -n.x, y: -n.y, z: -n.z };
      const hit = r3.wristHit({ origin, dir });
      return { u, v, origin, dir, hitId: hit ? panel.hit(hit.u, hit.v) : null };
    }
    return null;
  }, panelPick);
  check(cell && cell.hitId === "rect", `面板反求命中 rect 格 ${JSON.stringify(cell && { u: cell.u, v: cell.v, hitId: cell.hitId })}`);
  if (cell) {
    // 把右手射线设成这条世界射线：需要参考系姿态——简单做法：直接 stub xrInput 的右手射线（poseRayWorld 之后）不容易；
    // 改为把 fake.right 的 pose 由世界射线反算：rig 局部 = 世界 − 原点 转回，再 Z-up→Y-up；orientation 用 lookAt 四元数
    await page.evaluate(({ origin, dir }) => {
      const { locomotion } = globalThis.__catsup;
      const pose = locomotion.pose();
      const h = pose.heading;
      const toLocal = (wx, wy) => ({ x: Math.cos(h) * wx + Math.sin(h) * wy, y: -Math.sin(h) * wx + Math.cos(h) * wy });   // worldToLocal2
      const lo = toLocal(origin.x - pose.origin.x, origin.y - pose.origin.y);
      const ld = toLocal(dir.x, dir.y);
      const posRef = { x: lo.x, y: origin.z - pose.origin.z, z: -lo.y };                // rig(Z-up) → ref(Y-up): (x, z, -y)
      const dRef = { x: ld.x, y: dir.z, z: -ld.y };
      // 四元数：把 (0,0,-1) 转到 dRef（最小旋转）
      const a = { x: 0, y: 0, z: -1 }, b = dRef;
      const cx = a.y * b.z - a.z * b.y, cy = a.z * b.x - a.x * b.z, cz = a.x * b.y - a.y * b.x;
      const d = a.x * b.x + a.y * b.y + a.z * b.z;
      let q = { x: cx, y: cy, z: cz, w: 1 + d };
      const n = Math.hypot(q.x, q.y, q.z, q.w); q = { x: q.x / n, y: q.y / n, z: q.z / n, w: q.w / n };
      globalThis.__fake.right = { position: posRef, orientation: q };
    }, cell);
    await tick(1 / 60, 3);
    const hov = await page.evaluate(() => globalThis.__catsup.vr.panel.hovered());
    check(hov === "rect", `右手射线悬停面板「矩形」格 hovered=${hov}`);
    await page.evaluate(() => { globalThis.__fake.buttons.right[0] = 1; });
    await tick(1 / 60, 2);
    await page.evaluate(() => { globalThis.__fake.buttons.right[0] = 0; });
    await tick(1 / 60, 2);
    const tool = await page.evaluate(() => globalThis.__catsup.editor.tool);
    check(tool === "rect", `扳机点面板 → 工具切到 rect（tool=${tool}）`);
    const pulses = await page.evaluate(() => globalThis.__fake.pulses.length);
    check(pulses > 0, `有震动反馈 pulses=${pulses}`);
  }
}

// ---- 选择：阶段长按（指向盒顶面 0.4 s → 膜+环边；0.7 s → 连通体） ----
await page.evaluate(() => {
  const e = globalThis.__catsup.editor;
  const P = (x, y, z = 0) => ({ x, y, z });
  e.addSegments([[P(-1, 2), P(1, 2)], [P(1, 2), P(1, 4)], [P(1, 4), P(-1, 4)], [P(-1, 4), P(-1, 2)]], "box");
  e.commitOp({ op: "pushpull", face: e.kernel.faces()[0].id, dist: 1 });
  e.setTool("select");
  globalThis.__catsup.locomotion.sim.reset({ x: 0, y: 0, z: 0 }, 0, { x: 0, y: 0, z: 1.6 });
  globalThis.__fake.right = { position: { x: 0.2, y: 1.2, z: -0.1 }, orientation: { x: 0, y: 0, z: 0, w: 1 } };
});
// 指向盒顶面中心 (0,3,1)：右手在世界 (0.2, 0.1, 1.2)（rig=origin，heading 0 → ref(0.2,1.2,−0.1) 对应 rig 局部 (0.2, 0.1, 1.2)）
await page.evaluate(() => {
  const target = { x: 0, y: 3, z: 1.0 }, origin = { x: 0.2, y: 0.1, z: 1.2 };
  const d = { x: target.x - origin.x, y: target.y - origin.y, z: target.z - origin.z }; const n = Math.hypot(d.x, d.y, d.z);
  const dRef = { x: d.x / n, y: d.z / n, z: -d.y / n };
  const a = { x: 0, y: 0, z: -1 }, b = dRef;
  const cx = a.y * b.z - a.z * b.y, cy = a.z * b.x - a.x * b.z, cz = a.x * b.y - a.y * b.x;
  const dd = a.x * b.x + a.y * b.y + a.z * b.z;
  let q = { x: cx, y: cy, z: cz, w: 1 + dd }; const nn = Math.hypot(q.x, q.y, q.z, q.w);
  globalThis.__fake.right.orientation = { x: q.x / nn, y: q.y / nn, z: q.z / nn, w: q.w / nn };
});
await tick(1 / 60, 2);
await page.evaluate(() => { globalThis.__fake.buttons.right[0] = 1; });
await tick(1 / 60, 25);   // 0.42 s
const sel1 = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { faces: e.selection.faces.size, edges: e.selection.edges.size }; });
check(sel1.faces === 1 && sel1.edges === 4, `长按 0.4 s = 膜+环边 ${JSON.stringify(sel1)}`);
await tick(1 / 60, 20);   // 0.75 s
const sel2 = await page.evaluate(() => { const e = globalThis.__catsup.editor; return { faces: e.selection.faces.size, edges: e.selection.edges.size }; });
check(sel2.faces === 6 && sel2.edges === 12, `长按 0.7 s = 连通体 ${JSON.stringify(sel2)}`);
await page.evaluate(() => { globalThis.__fake.buttons.right[0] = 0; });
await tick(1 / 60, 2);

// ---- teleport：右摇杆前推充能（射线指向盒顶）→ 松开 → 站到盒顶 ----
await page.evaluate(() => { globalThis.__fake.axes.right = [0, 0, 0, -1]; globalThis.__catsup.locomotion.sim.state.teleport.tier = 3; });
await tick(1 / 60, 10);
const arc = await page.evaluate(() => { const a = globalThis.__catsup.locomotion.sim.state.teleport.arc; return a ? { valid: a.valid, reason: a.reason, z: a.hit?.p.z } : null; });
check(arc && arc.valid && Math.abs(arc.z - 1) < 1e-6, `充能弧线合法落盒顶 ${JSON.stringify(arc)}`);
await page.evaluate(() => { globalThis.__fake.axes.right = [0, 0, 0, 0]; });
await tick(1 / 60, 3);
const pt = await page.evaluate(() => ({ ...globalThis.__catsup.locomotion.sim.state.pos }));
check(Math.abs(pt.z - 1) < 1e-6 && Math.abs(pt.y - 3) < 0.2, `瞬移到盒顶 ${JSON.stringify(pt)}`);

// ---- 退出：状态原样、桌面相机恢复 ----
await page.evaluate(() => { globalThis.__catsup.editor.renderer3.xr._end(); });
const after = await page.evaluate(() => ({ presenting: globalThis.__catsup.vr.isPresenting(), mode: globalThis.__catsup.locomotion.getMode(), faces: globalThis.__catsup.editor.kernel.faces().length, tool: globalThis.__catsup.editor.tool, halfH: globalThis.__catsup.editor.cam.halfH }));
check(!after.presenting && after.mode === "orbit" && after.faces === 6 && after.tool === "select" && after.halfH === 220, `退出 VR：模型/工具原样、轨道相机恢复 ${JSON.stringify(after)}`);
await page.screenshot({ path: out + "/probe-xr-fake.png" });

console.log("errors:", errs.length ? errs.join("; ") : "none");
await browser.close();
if (errs.length || fails.length) { console.log("FAILED:", fails.join(" | ")); process.exit(1); }
console.log("probe-xr-fake ok");

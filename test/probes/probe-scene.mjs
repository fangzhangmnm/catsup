// test/probes/probe-scene.mjs —— group / component / 圆 / 旋转 / 缩放 的 headless 探针（2026-10-21，Claude Fable 5.1）。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-scene.mjs（借 WeebPaint 的 playwright）。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏（user 2026-10-21「默认测试按 ipad mini」「我比较习惯竖屏」）*/ });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = () => e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0 }));
  const drag = async (a, b, steps = 6) => { fire("pointerdown", a.x, a.y, { button: 0, buttons: 1 }); for (let i = 1; i <= steps; i++) { fire("pointermove", a.x + (b.x - a.x) * i / steps, a.y + (b.y - a.y) * i / steps, { buttons: 1 }); } await sleep(120); fire("pointerup", b.x, b.y, { button: 0 }); await sleep(30); };
  const world = () => e.worldGeom();
  const out = {};
  // ① 地上画矩形 + 推拉成盒（走 op 接口，省事）
  e.addSegments([[{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }], [{ x: 2, y: 0, z: 0 }, { x: 2, y: 2, z: 0 }], [{ x: 2, y: 2, z: 0 }, { x: 0, y: 2, z: 0 }], [{ x: 0, y: 2, z: 0 }, { x: 0, y: 0, z: 0 }]], "probe");
  e.setTool("pp");
  e.cam.setView("iso"); e.zoomExtents();
  const top0 = px({ x: 1, y: 1, z: 0 });
  await drag(top0, { x: top0.x, y: top0.y - 120 });
  out.boxFaces = e.kernel.faces().length;
  // ② 三击选连通体 → 建组件 → 复制一份
  e.setTool("select");
  const hit = e.pickAt(top0.x, top0.y - 60);
  e.selectExpand(hit, 2);
  out.selectedAll = e.hasGeometrySelection();
  e.makeComponent("盒子");
  out.afterComponent = { rootFaces: e.kernel.faces().length, defs: e.sceneRef.defs.size, poolSel: e.hasPoolSelection() };
  e.copyInstance({ x: 4, y: 0, z: 0 });
  out.worldFacesTwoBoxes = world().faces().length;
  // ③ 进入第一份实例，推顶面 → 两份都长高
  const picks = e.selectedPoolPicks();
  e.cancel();
  const inst1 = [...e.sceneRef.def(e.sceneRef.root).instances.values()][0];
  e.enterPool({ kind: "instance", instance: inst1.id });
  out.contextLabel = e.contextLabel();
  const topZ = Math.max(...e.kernel.vertices().map((v) => v.z));
  const topF = e.kernel.faces().find((f) => e.kernel.faceRings3(f.id).outer.every((p) => Math.abs(p.z - topZ) < 1e-9));
  const tf = e.kernel.faceRings3(topF.id).outer; const cx = tf.reduce((a, p) => a + p.x, 0) / 4, cy = tf.reduce((a, p) => a + p.y, 0) / 4;
  e.setTool("pp");
  const tp = px({ x: cx, y: cy, z: topZ });
  await drag(tp, { x: tp.x, y: tp.y - 60 });
  const zs = world().vertices().map((v) => v.z);
  out.bothGrew = zs.filter((z) => z > topZ + 1e-6).length === 8;
  e.exitContext();
  out.backAtRoot = e.contextDepth() === 0;
  // ④ 旋转第二份实例 90°（量角器两笔：圆心 → 参考点拖）
  e.cancel();
  const inst2 = [...e.sceneRef.def(e.sceneRef.root).instances.values()][1];
  e.setTool("select");
  const v2 = world().vertices().filter((v) => v.x > 3.5);
  const anyV = v2[0];
  const hit2 = e.pickAt(px(anyV).x, px(anyV).y);
  e.selectExpand(hit2, 0);
  out.instSelected = e.hasPoolSelection();
  e.setTool("rotate");
  const center = px({ x: 4, y: 0, z: 0 });
  fire("pointerdown", center.x, center.y, { button: 0, buttons: 1 }); fire("pointerup", center.x, center.y, { button: 0 }); await sleep(30);
  const ref = px({ x: 6, y: 0, z: 0 }), to = px({ x: 4, y: 2, z: 0 });
  await drag(ref, to, 10);
  const after = world().vertices().filter((v) => v.x < 3.5 && v.x > 1.5 && v.y > 0.5).length;
  out.rotated = after > 0 && world().vertices().some((v) => Math.abs(v.x - 2) < 1e-6 && Math.abs(v.y - 2) < 1e-6);
  // ⑤ 圆：地上画圆（24 段软边）→ 推拉 → 边线只剩两圈（软边不画）
  e.cancel(); e.setTool("circle");
  const cc = px({ x: -3, y: -3, z: 0 }), cr = px({ x: -2, y: -3, z: 0 });
  await drag(cc, cr, 4);
  out.circleSoft = e.kernel.soft.size;      // 圆本身：0 软边（画黑边）
  out.circleCurve = e.kernel.curve.size;    // 24 条曲线成员边
  e.setTool("pp");
  const ccTop = px({ x: -3, y: -3, z: 0 });
  await drag(ccTop, { x: ccTop.x, y: ccTop.y - 80 });
  out.cylinderSoft = e.kernel.soft.size;    // 侧棱 24 条软
  out.cylinderCurve = e.kernel.curve.size;  // 底圈 + 顶圈 48 条曲线边（都画黑边）
  out.cylinderFaces = e.kernel.faces().length;
  // ⑥ 缩放：选圆柱顶面 → 拖角柄
  e.setTool("select");
  const topCyl = e.kernel.faces().find((f) => f.outer.edges.length === 24 && e.kernel.faceRings3(f.id).outer.every((p) => p.z > 0.1));
  out.hasCylTop = !!topCyl;
  await browserSelectFace(e, topCyl);
  e.setTool("scale");
  out.scaleHandles = (e.scaleHandles ?? []).length;
  // ⑥b 油漆桶：蘸「赭石」涂圆柱顶面 → 材质表 1 条、面有槽；再蘸贴图（2×2 PNG）涂另一面 → 两条材质、渲染不报错
  e.setPaint({ kind: "color", name: "赭石", color: [0.525, 0.149, 0.09] });
  e.setTool("paint");
  if (topCyl) { const rr = e.kernel.faceRings3(topCyl.id).outer; const cx3 = rr.reduce((a, p) => a + p.x, 0) / rr.length, cy3 = rr.reduce((a, p) => a + p.y, 0) / rr.length; const sp = px({ x: cx3, y: cy3, z: rr[0].z }); fire("pointerdown", sp.x, sp.y, { button: 0, buttons: 1 }); fire("pointerup", sp.x, sp.y, { button: 0 }); await sleep(30); }
  out.paintedMaterials = e.materials().length;
  out.topPainted = topCyl ? e.kernel.faceMaterialOf(topCyl.id) !== undefined : false;
  const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 2, 0, 0, 0, 2, 8, 2, 0, 0, 0, 253, 212, 154, 115, 0, 0, 0, 25, 73, 68, 65, 84, 120, 1, 1, 14, 0, 241, 255, 0, 255, 0, 0, 0, 255, 0, 0, 0, 0, 255, 255, 255, 255, 36, 151, 5, 253, 45, 31, 36, 196, 0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130]);
  e.setPaint({ kind: "texture", name: "格子", mimeType: "image/png", bytes: png, sizeM: [0.5, 0.5] });
  const sideCyl = e.kernel.faces().find((f) => f.outer.edges.length === 4 && e.kernel.faceRings3(f.id).outer.some((p) => p.z > 0.1) && e.kernel.faceRings3(f.id).outer.some((p) => p.z < 0.01));
  if (sideCyl) { const rr = e.kernel.faceRings3(sideCyl.id).outer; const c3 = rr.reduce((a, p) => ({ x: a.x + p.x / 4, y: a.y + p.y / 4, z: a.z + p.z / 4 }), { x: 0, y: 0, z: 0 }); const sp = px(c3); fire("pointerdown", sp.x, sp.y, { button: 0, buttons: 1 }); fire("pointerup", sp.x, sp.y, { button: 0 }); await sleep(60); }
  out.texturedMaterials = e.materials().filter((m) => m.texture).length;
  // ⑥c 偏移：在圆柱顶面按住、往里拖 → 顶面分成环带 + 内岛（面数 +1）
  e.cancel(); e.setTool("offset");
  if (topCyl) {
    const rr = e.kernel.faceRings3(topCyl.id).outer;
    const cx4 = rr.reduce((a, p) => a + p.x, 0) / rr.length, cy4 = rr.reduce((a, p) => a + p.y, 0) / rr.length;
    const edgeMid = { x: (rr[0].x + rr[1].x) / 2, y: (rr[0].y + rr[1].y) / 2, z: rr[0].z };
    const inward = { x: cx4 - edgeMid.x, y: cy4 - edgeMid.y };
    const from = px({ x: edgeMid.x + inward.x * 0.05, y: edgeMid.y + inward.y * 0.05, z: rr[0].z });
    const to = px({ x: edgeMid.x + inward.x * 0.4, y: edgeMid.y + inward.y * 0.4, z: rr[0].z });
    const before = e.kernel.faces().length;
    await drag(from, to, 8);
    out.offsetFacesDelta = e.kernel.faces().length - before;
  }
  // ⑥d 软化：选圆柱全部 → 菜单软化 ≤ 20°（12 段圆：侧棱夹角 30° > 20° 不动；再按 35° 全软）
  e.cancel();
  out.softenAt20 = e.softenByAngle(20);
  out.softenAt35 = e.softenByAngle(35);
  // ⑦ 撤销链：全部撤到空
  let n = 0; while (e.canUndo() && n < 50) { e.undo(); n++; }
  out.undoSteps = n;
  out.emptyAtEnd = world().faces().length === 0 && e.sceneRef.defs.size === 1;
  return out;
  async function browserSelectFace(ed, f) { if (!f) return; const rr = ed.kernel.faceRings3(f.id).outer; const cx2 = rr.reduce((a, p) => a + p.x, 0) / rr.length, cy2 = rr.reduce((a, p) => a + p.y, 0) / rr.length; const s = px({ x: cx2, y: cy2, z: rr[0].z }); const h = ed.pickAt(s.x, s.y); ed.selectExpand(h, 0); }
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.boxFaces === 6 && res.selectedAll && res.afterComponent.rootFaces === 0 && res.afterComponent.defs === 2 && res.worldFacesTwoBoxes === 12 && res.bothGrew && res.backAtRoot && res.instSelected && res.rotated && res.circleSoft === 0 && res.circleCurve === 24 && res.cylinderSoft === 24 && res.cylinderCurve === 48 && res.paintedMaterials === 1 && res.topPainted && res.texturedMaterials === 1 && res.offsetFacesDelta === 1 && res.emptyAtEnd && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);

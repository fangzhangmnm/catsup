// test/probes/probe-followme.mjs —— 跟随（Follow Me）headless 探针（0.8，2026-10-21，Claude Fable 5.1）：
// 盒子端面画弦 → 双击顶面（面 + 外环 = 闭路径）→ 跟随工具点三角轮廓 → 四条顶棱一起倒角：10 面闭合实体、顶面缩小；撤销回 7 面。
// 用法：先 python3 -m http.server 8765；node test/probes/probe-followme.mjs（借 WeebPaint 的 playwright）。
import { createRequire } from "node:module";
const { chromium } = createRequire(new URL("../../../20260524 WeebPaint/package.json", import.meta.url))("playwright");
const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const page = await browser.newPage({ viewport: { width: 744, height: 1133 }, deviceScaleFactor: 2 /* iPad mini 6 竖屏 */ });
const errs = []; page.on("pageerror", (e) => errs.push(e.message));
page.on("console", (m) => { if (m.type() === "error") errs.push("console: " + m.text()); });
await page.goto("http://127.0.0.1:8765/", { waitUntil: "load" }); await page.waitForTimeout(400);
const res = await page.evaluate(async () => {
  const e = globalThis.__catsup.editor; const vp = () => e.vp(); const c = document.getElementById("board"); const r = c.getBoundingClientRect();
  const sleep = (ms) => new Promise((res) => setTimeout(res, ms));
  const px = (p) => e.cam.angularPx(p, vp());
  const fire = (type, x, y, extra = {}) => c.dispatchEvent(new PointerEvent(type, { bubbles: true, clientX: r.left + x, clientY: r.top + y, pointerId: 9, pointerType: "mouse", isPrimary: true, button: extra.button ?? 0, buttons: extra.buttons ?? 0 }));
  const tap = async (p) => { fire("pointerdown", p.x, p.y, { button: 0, buttons: 1 }); await sleep(30); fire("pointerup", p.x, p.y, { button: 0 }); await sleep(30); };
  const out = {};
  const Pt = (x, y, z) => ({ x, y, z });
  // ① 2×2×2 盒子（12 条棱直接进内核 → 6 面）+ 端面 x=2 上的弦 → 角上一个三角
  const B = [[0, 0], [2, 0], [2, 2], [0, 2]];
  const segs = [];
  for (let i = 0; i < 4; i++) { const a = B[i], b = B[(i + 1) % 4]; segs.push([Pt(a[0], a[1], 0), Pt(b[0], b[1], 0)]); segs.push([Pt(a[0], a[1], 2), Pt(b[0], b[1], 2)]); segs.push([Pt(a[0], a[1], 0), Pt(a[0], a[1], 2)]); }
  e.addSegments(segs, "probe");
  e.addSegments([[Pt(2, 0, 1.5), Pt(2, 0.5, 2)]], "probe");
  out.facesBefore = e.kernel.faces().length;   // 7
  e.cam.setView("iso"); e.zoomExtents();
  // ② 选择工具：双击顶面 = 面 + 外环（闭路径）
  e.setTool("select");
  const top = px(Pt(1, 1, 2));
  const hit = e.pickAt(top.x, top.y);
  e.selectExpand(hit, 1);
  out.pathSelected = e.hasGeometrySelection();
  // ③ 跟随工具点三角轮廓（端面 x=2，朝向相机）
  e.setTool("followme");
  await tap(px(Pt(2, 0.1667, 1.8333)));
  out.hint = document.getElementById("hint")?.textContent ?? "";
  out.facesAfter = e.kernel.faces().length;   // 6 + 4 倒角
  out.manifold = e.kernel.edges().every((ed) => ed.faceLinks.length === 2);
  const topF = e.kernel.faces().filter((f) => e.kernel.faceRings3(f.id).outer.every((p) => Math.abs(p.z - 2) < 1e-9));
  out.topFaces = topF.length;
  out.topBounds = topF.length === 1 ? (() => { const ps = e.kernel.faceRings3(topF[0].id).outer; return [Math.min(...ps.map((p) => p.x)), Math.max(...ps.map((p) => p.x))]; })() : null;
  // ④ 撤销一步 → 回 7 面
  e.undo();
  out.facesAfterUndo = e.kernel.faces().length;
  // ⑤ 油漆桶模式（0.9 工具配置）：选项条随工具出现；模式「连通体」点一张面 → 整个盒子 7 张面都有材质；再「一张面」只涂 1 张
  e.setPaint({ kind: "color", name: "探针红", color: [0.8, 0.2, 0.2] });
  e.setTool("paint");
  const strip = document.getElementById("toolStrip");
  out.stripShown = !strip.hidden && !!strip.querySelector(".select-field");   // 下拉标准件（B40）
  e.config.set("surface", "tier", "connected");   // 表面模式之后油漆桶的选项组叫 surface、键叫 tier（原 paint.mode，过期探针 2026-10-24 改）
  out.stripSelectValue = strip.querySelector(".select-field")?.dataset.value;
  await tap(px(Pt(1, 1, 2)));
  out.paintedConnected = e.kernel.faces().filter((f) => e.kernel.faceMaterialOf(f.id) !== undefined).length;
  e.undo();
  e.config.set("surface", "tier", "smooth");   // 盒子的边都硬：平滑组 = 一张面
  await tap(px(Pt(1, 1, 2)));
  out.paintedSingle = e.kernel.faces().filter((f) => e.kernel.faceMaterialOf(f.id) !== undefined).length;
  e.setTool("line");
  out.stripHiddenForLine = strip.hidden;
  // ⑥ 线稿风格：切 thick 再切回 pixel，渲染不报错（默认档 v0.12.3 起按 DPR / 偏好定）
  out.lineStyleDefault = e.lineStyle;
  e.setLineStyle("thick"); e.draw(); e.setLineStyle("pixel"); e.draw();
  out.lineStyleBack = e.lineStyle;
  return out;
});
console.log(JSON.stringify(res));
console.log("errors:", errs.length ? errs.join("; ") : "none");
const ok = res.facesBefore === 7 && res.pathSelected && res.facesAfter === 10 && res.manifold && res.topFaces === 1 && res.topBounds && Math.abs(res.topBounds[0] - 0.5) < 1e-6 && Math.abs(res.topBounds[1] - 1.5) < 1e-6 && res.facesAfterUndo === 7 && res.stripShown && res.stripSelectValue === "connected" && res.paintedConnected === 7 && res.paintedSingle === 1 && res.stripHiddenForLine && typeof res.lineStyleDefault === "string" && res.lineStyleBack === "pixel"   /* 默认线稿档 v0.12.3 起按 DPR / 偏好定，不再固定 pixel（过期期望，2026-10-24 改） */ && errs.length === 0;
console.log(ok ? "PROBE OK" : "PROBE FAIL");
await browser.close();
process.exit(ok ? 0 : 1);
